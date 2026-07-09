// send-notification — 통합 알림 디스패치 Edge Function (docs/08 §2.3 dispatch)
// 채널 우선순위 팬아웃 (§2.1):
//   1) in_app  ✅ 완전 구현 — fn_dispatch_notification RPC(호출자 JWT)로 notifications INSERT.
//              INSERT 시 DB 트리거 trg_notifications_side_effects 가 push/외부 채널을 pg_net 로 2차 팬아웃.
//   2) push / kakao / sms / email  🧪 STUB — 실 제공자 키 필요. 여기서는 자격증명 존재만 확인 후
//              log + { status:'not_configured' } 반환(발송 시도 안 함). 실연동 절차: docs/08 §2.4.
// 원칙(§2.1): in_app INSERT 실패만 에러. 부가 채널 실패/미구성은 로그만 남기고 성공 진행.
// 인증: JWT 필수. 타인 대상 지정은 RPC 내부 is_admin() 가드가 차단(본인 대상은 누구나).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

type Channel = 'in_app' | 'push' | 'kakao' | 'sms' | 'email';
type ChannelStatus = 'sent' | 'skipped' | 'not_configured' | 'failed';
interface ChannelResult {
  channel: Channel;
  status: ChannelStatus;
  detail?: string;
}

interface Body {
  userId?: string;
  title?: string;
  content?: string;
  category?: string;
  type?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  channels?: Channel[];
}

// 🧪 외부 채널 STUB — 실 제공자 fetch 는 미구현. env 키 유무만 판정.
// 실연동 시 이 블록의 not_configured 분기를 실제 provider 호출로 교체(§2.4).
function dispatchExternalStub(channel: Exclude<Channel, 'in_app'>): ChannelResult {
  const required: Record<string, string[]> = {
    push: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'],
    kakao: ['KAKAO_API_KEY'],
    sms: ['SMS_API_KEY', 'SMS_SENDER'],
    email: [], // v1 범위 외(예약 채널)
  };
  if (channel === 'email') {
    console.log('[send-notification] email 채널 v1 미지원(예약) — skip');
    return { channel, status: 'skipped', detail: 'email_not_in_v1_scope' };
  }
  const missing = (required[channel] ?? []).filter((k) => !Deno.env.get(k));
  if (missing.length > 0) {
    console.log(`[send-notification] ${channel} 미구성 — 누락 시크릿: ${missing.join(', ')}`);
    return { channel, status: 'not_configured', detail: `missing_secrets:${missing.join(',')}` };
  }
  // 키는 있으나 실 provider fetch 미구현 상태(승계 대상: send-push-notification / send-external-notification EF).
  console.log(`[send-notification] ${channel} 자격증명 확인됨 — 실 provider 연동 미구현(STUB)`);
  return { channel, status: 'not_configured', detail: 'provider_integration_pending' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return json({ success: false, data: null, error: 'method_not_allowed' }, 405);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  const body = (await req.json().catch(() => null)) as Body | null;
  const userId = body?.userId ?? '';
  const title = body?.title ?? '';
  const content = body?.content ?? '';
  if (!userId || !title.trim() || !content.trim()) {
    return json({ success: false, data: null, error: 'bad_request' }, 400);
  }

  // 호출자 JWT 컨텍스트 — RPC 내부 auth.uid()/is_admin() 가드가 대상 권한을 강제
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return json({ success: false, data: null, error: 'unauthorized' }, 401);

  // 요청 채널 정규화 — in_app 은 항상 포함(100% 보장 경로)
  const requested = Array.isArray(body?.channels) && body!.channels!.length > 0 ? body!.channels! : ['in_app'];
  const channelSet = new Set<Channel>(['in_app', ...requested]);

  // (1) in_app — 원천 레코드 생성(실패 시에만 전체 에러)
  const { data: rpcData, error: rpcError } = await client.rpc('fn_dispatch_notification', {
    p_user_id: userId,
    p_title: title,
    p_content: content,
    p_category: body?.category ?? 'system',
    p_type: body?.type ?? 'info',
    p_action_url: body?.actionUrl ?? null,
    p_metadata: body?.metadata ?? {},
  });

  if (rpcError) {
    return json({ success: false, data: null, error: rpcError.message }, 500);
  }
  const envelope = rpcData as { success: boolean; data: { notification_id?: string } | null; error: string | null };
  if (!envelope || !envelope.success) {
    // 권한/검증 실패(forbidden/invalid_*) → 4xx 로 표면화
    const err = envelope?.error ?? 'dispatch_failed';
    const status = err === 'forbidden' ? 403 : err === 'no_session' ? 401 : 400;
    return json({ success: false, data: null, error: err }, status);
  }

  const results: ChannelResult[] = [{ channel: 'in_app', status: 'sent' }];

  // (2) 부가 채널 — STUB(실패 관대: 로그만, 성공 응답 유지)
  for (const ch of channelSet) {
    if (ch === 'in_app') continue;
    results.push(dispatchExternalStub(ch));
  }

  return json({
    success: true,
    data: { notificationId: envelope.data?.notification_id ?? null, results },
    error: null,
  });
});
