// send-external-notification — 외부 채널(SMS/카카오 알림톡) 발송 Edge Function (docs/08 §2.4)
// 호출: notifications 트리거 fn_handle_notification_side_effects → 중요 알림 + 사용자 opt-in 시.
//   body = { channel:'sms'|'kakao', phone, message, category }
// 제공자 = Solapi(솔라피, CoolSMS 통합) — SMS/LMS + 카카오 알림톡(ATA) 단일 API.
//   자격증명은 서버 전용: Vault(msg_api_key/msg_api_secret) + config(msg_provider/sms_sender/kakao_pf_id/
//   kakao_template_default)를 service_role RPC(fn_service_get_config)로 로드. 클라이언트 비노출.
//   키 미구성/제공자 불일치 = not_configured (발송 시도 안 함). 알림톡 템플릿 미설정 시 SMS 폴백.
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

const SOLAPI_SEND = 'https://api.solapi.com/messages/v4/send';
const enc = new TextEncoder();

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(len = 32): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, len);
}

interface Body {
  channel?: 'sms' | 'kakao';
  phone?: string;
  message?: string;
  category?: string;
}

// 내부 디스패치 토큰 검증 — verify_jwt=false(서버간 호출 전용). Vault(edge_dispatch_token) 대조.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ success: false, data: null, error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey);

  if (!(await authorized(admin, req))) {
    return json({ success: false, data: null, error: 'unauthorized' }, 401);
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const channel = body?.channel === 'kakao' ? 'kakao' : 'sms';
  const phone = (body?.phone ?? '').replace(/[^0-9]/g, '');
  const message = (body?.message ?? '').trim();
  if (!phone || !message) return json({ success: false, data: null, error: 'bad_request' }, 400);

  // 자격증명 로드
  const { data, error } = await admin.rpc('fn_service_get_config', {
    p_config_names: ['msg_provider', 'sms_sender', 'kakao_pf_id', 'kakao_template_default'],
    p_secret_names: ['msg_api_key', 'msg_api_secret'],
  });
  if (error) return json({ success: false, data: null, error: 'config_read_failed' }, 500);
  const env = data as { success: boolean; data: { config: Record<string, string>; secrets: Record<string, string> } };
  const cfg = env?.data?.config ?? {};
  const secrets = env?.data?.secrets ?? {};
  const provider = (cfg['msg_provider'] || 'solapi').toLowerCase();
  const apiKey = secrets['msg_api_key'];
  const apiSecret = secrets['msg_api_secret'];
  const sender = (cfg['sms_sender'] ?? '').replace(/[^0-9]/g, '');

  if (provider !== 'solapi' || !apiKey || !apiSecret || !sender) {
    return json({ success: true, data: { status: 'not_configured', detail: 'missing_msg_credentials' }, error: null });
  }

  // 메시지 구성 — 카카오 알림톡(ATA, 템플릿 필요) 우선, 미구성 시 SMS/LMS 폴백
  const pfId = cfg['kakao_pf_id'];
  const templateId = cfg['kakao_template_default'];
  const useKakao = channel === 'kakao' && pfId && templateId;

  const msg: Record<string, unknown> = { to: phone, from: sender, text: message };
  if (useKakao) {
    msg.type = 'ATA';
    msg.kakaoOptions = { pfId, templateId, disableSms: false };
  } else {
    // 한글 기준 대략 45자 초과 → LMS
    msg.type = message.length > 45 ? 'LMS' : 'SMS';
  }

  const date = new Date().toISOString();
  const salt = randomSalt();
  const signature = await hmacHex(apiSecret, date + salt);
  const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

  try {
    const res = await fetch(SOLAPI_SEND, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authorization },
      body: JSON.stringify({ message: msg }),
    });
    const resBody = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.log('[send-external-notification] solapi error', res.status, JSON.stringify(resBody));
      return json({ success: false, data: { status: 'failed' }, error: `solapi_${res.status}` }, 502);
    }
    // Solapi 단건 응답: { statusCode:'2000', messageId, ... }
    const statusCode = (resBody as { statusCode?: string }).statusCode ?? '';
    const sent = statusCode === '2000' || statusCode === '3000';
    return json({
      success: true,
      data: { status: sent ? 'sent' : 'accepted', provider: 'solapi', channel: useKakao ? 'kakao' : 'sms', statusCode },
      error: null,
    });
  } catch (err) {
    console.log('[send-external-notification] fetch failed', String(err));
    return json({ success: false, data: { status: 'failed' }, error: 'network_error' }, 502);
  }
});
