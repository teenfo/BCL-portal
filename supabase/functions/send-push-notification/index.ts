// send-push-notification — 웹푸시(VAPID) 발송 Edge Function (docs/08 §2.4)
// 호출: notifications INSERT 트리거 fn_handle_notification_side_effects → 활성 구독별 1회.
//   body = { subscription: { endpoint, keys:{ p256dh, auth } }, notification: { title, body, data } }
// VAPID 자격증명은 서버 전용 — Vault(vapid_private_key JWK) + integration_settings(vapid_public_key/subject)에서
//   service_role RPC(fn_service_get_config)로 로드. 클라이언트에는 절대 노출 안 함.
// 발송 실패 410/404(만료 구독) = 해당 push_subscriptions 비활성화(정리). 그 외 실패는 로그만.
import webpush from 'npm:web-push@3.6.7';
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

interface PushBody {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  notification?: { title?: string; body?: string; data?: Record<string, unknown> };
}

// 내부 디스패치 토큰 검증 — verify_jwt=false(서버간 호출 전용). 트리거가 보낸 Bearer 를
//   Vault(edge_dispatch_token) 값과 대조. 실 서비스키를 DB에 두지 않기 위한 공유 토큰 방식.
let expectedToken: string | null = null;
async function authorized(admin: ReturnType<typeof createClient>, req: Request): Promise<boolean> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  if (expectedToken === null) {
    const { data } = await admin.rpc('fn_service_get_config', {
      p_config_names: [],
      p_secret_names: ['edge_dispatch_token'],
    });
    expectedToken = (data as { data?: { secrets?: Record<string, string> } })?.data?.secrets?.['edge_dispatch_token'] ?? '';
  }
  return expectedToken.length > 0 && token === expectedToken;
}

// VAPID 캐시(콜드스타트 1회 로드) — 한 인스턴스 수명 동안 재사용.
let vapidReady = false;
async function ensureVapid(admin: ReturnType<typeof createClient>): Promise<boolean> {
  if (vapidReady) return true;
  const { data, error } = await admin.rpc('fn_service_get_config', {
    p_config_names: ['vapid_public_key', 'vapid_subject'],
    p_secret_names: ['vapid_private_key'],
  });
  if (error) return false;
  const env = data as { success: boolean; data: { config: Record<string, string>; secrets: Record<string, string> } };
  if (!env?.success) return false;
  const pub = env.data.config['vapid_public_key'];
  const subject = env.data.config['vapid_subject'] || 'mailto:admin@bcl.com';
  const jwkRaw = env.data.secrets['vapid_private_key'];
  if (!pub || !jwkRaw) return false;
  let priv = '';
  try {
    // Vault 저장 형식 = { publicKey: JWK, privateKey: JWK{d} }. web-push privateKey = base64url d(32B).
    priv = JSON.parse(jwkRaw)?.privateKey?.d ?? '';
  } catch {
    priv = '';
  }
  if (!priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  vapidReady = true;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ success: false, data: null, error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey);

  if (!(await authorized(admin, req))) {
    return json({ success: false, data: null, error: 'unauthorized' }, 401);
  }

  const body = (await req.json().catch(() => null)) as PushBody | null;
  const sub = body?.subscription;
  const notif = body?.notification;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth || !notif?.title) {
    return json({ success: false, data: null, error: 'bad_request' }, 400);
  }

  const ok = await ensureVapid(admin);
  if (!ok) return json({ success: false, data: null, error: 'vapid_not_configured' }, 400);

  const payload = JSON.stringify({
    title: notif.title,
    body: notif.body ?? '',
    data: notif.data ?? {},
  });

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      payload,
    );
    return json({ success: true, data: { status: 'sent' }, error: null });
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 0;
    // 만료/폐기 구독 정리 — 재발송 방지
    if (statusCode === 404 || statusCode === 410) {
      await admin.from('push_subscriptions').update({ is_active: false }).eq('endpoint', sub.endpoint);
      return json({ success: true, data: { status: 'gone', deactivated: true }, error: null });
    }
    console.log('[send-push-notification] send failed', statusCode, String(err));
    return json({ success: false, data: { status: 'failed' }, error: `push_failed:${statusCode}` }, 502);
  }
});
