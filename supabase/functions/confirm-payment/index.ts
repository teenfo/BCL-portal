// confirm-payment — 결제 승인 Edge Function (docs/08 §1.3 ①)
// 얇은 경계 계층: JWT 인증 · 주문 소유권 · pg_settings 활성 · resolvePaymentMode(min(Admin,env)).
// 원자적 DB 확정(FOR UPDATE·멱등·금액 재검증·멤버십 활성화)은 fn_confirm_payment_order(service_role)에 위임.
// 시뮬레이션 = 외부 호출 없이 성공 합성(실결제 0원). 라이브 = env=prod + 키 설정 시에만(미구성 시 차단).
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ success: false, data: null, error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  // 서버 환경 — 미설정 시 'dev'(시뮬레이션 강제). 운영 프로젝트에서만 'prod'.
  const serverEnv = (Deno.env.get('PAYMENT_ENV') ?? 'dev').toLowerCase();

  const authHeader = req.headers.get('Authorization') ?? '';
  const body = await req.json().catch(() => null) as
    | { paymentKey?: string; orderId?: string; amount?: number }
    | null;
  const paymentKey = body?.paymentKey ?? null;
  const orderId = body?.orderId ?? '';
  const amount = body?.amount;
  if (!orderId || amount == null || Number.isNaN(Number(amount))) {
    return json({ success: false, data: null, error: 'bad_request' }, 400);
  }

  // (1) JWT 유효성 — 인증 사용자만
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ success: false, data: null, error: 'unauthorized' }, 401);

  const admin = createClient(url, serviceKey);

  // 주문 존재 + 소유권(주문의 member가 이 사용자인가) — 타인 주문 승인 차단
  const { data: tx } = await admin
    .from('transactions')
    .select('id, member_id')
    .eq('order_id', orderId)
    .maybeSingle();
  if (!tx) return json({ success: false, data: null, error: 'order_not_found' }, 404);
  const { data: mem } = await admin
    .from('members')
    .select('user_id')
    .eq('id', tx.member_id)
    .maybeSingle();
  if (!mem || mem.user_id !== user.id) {
    return json({ success: false, data: null, error: 'forbidden' }, 403);
  }

  // (5) pg_settings 활성 확인
  const { data: pg } = await admin
    .from('pg_settings')
    .select('payment_mode, is_active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!pg || !pg.is_active) return json({ success: false, data: null, error: 'pg_inactive' }, 400);

  // (3)(6) resolvePaymentMode — min(Admin 설정, 서버 env). 클라이언트 판정 금지.
  const adminMode = pg.payment_mode === 'live' ? 'live' : 'simulation';
  const mode = serverEnv === 'prod' && adminMode === 'live' ? 'live' : 'simulation';

  let tossStatus = 'DONE';
  let receiptUrl: string | null = null;

  if (mode === 'live') {
    // 라이브 실거래 — Toss /v1/payments/confirm. 라이브 시크릿키는 Vault 에서만 로드(번들/응답 비노출).
    // 키 미구성 시 실결제 절대 금지(Fail-to-NOT-charge, §1.7) → live_not_configured 차단.
    if (!paymentKey) return json({ success: false, data: null, error: 'missing_payment_key' }, 400);
    const { data: cfg } = await admin.rpc('fn_service_get_config', {
      p_config_names: [],
      p_secret_names: ['toss_live_secret_key'],
    });
    const liveSecret = (cfg as { data?: { secrets?: Record<string, string> } })?.data?.secrets?.['toss_live_secret_key'];
    if (!liveSecret) return json({ success: false, data: null, error: 'live_not_configured' }, 400);

    // Basic 인증 = base64(secretKey + ':'). 서버가 보관한 금액(=RPC 재검증 대상)과 동일 값 전달.
    const basic = btoa(`${liveSecret}:`);
    let tossRes: Response;
    try {
      tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
      });
    } catch {
      return json({ success: false, data: null, error: 'toss_network_error' }, 502);
    }
    const tossBody = (await tossRes.json().catch(() => ({}))) as {
      status?: string;
      receipt?: { url?: string };
      message?: string;
      code?: string;
    };
    if (!tossRes.ok || (tossBody.status !== 'DONE' && tossBody.status !== 'CANCELED')) {
      // 승인 실패 = DB 확정 안 함(미과금 표면화)
      return json({ success: false, data: null, error: tossBody.code ?? `toss_declined:${tossRes.status}` }, 402);
    }
    tossStatus = tossBody.status ?? 'DONE';
    receiptUrl = tossBody.receipt?.url ?? null;
  }
  // 시뮬레이션: 외부 호출 없이 성공 합성(과금 없음). 검증·DB 확정은 아래 RPC가 원자적으로 수행.

  // (7) 원자적 확정 — fn_confirm_payment_order(FOR UPDATE·멱등·금액 재검증·멤버십 활성화)
  const { data, error } = await admin.rpc('fn_confirm_payment_order', {
    p_order_id: orderId,
    p_payment_key: paymentKey ?? `sim_${orderId}`,
    p_amount: Number(amount),
    p_toss_status: tossStatus,
    p_receipt_url: receiptUrl,
    p_mode: mode,
  });
  if (error) return json({ success: false, data: null, error: error.message }, 400);
  return json(data, 200);
});
