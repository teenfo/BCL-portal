// cancel-payment — 환불 실행 Edge Function (docs/08 §1.3 ②)
// admin 인증 + resolvePaymentMode → (시뮬: Toss 취소 합성 / 라이브: 실 취소 — 미구성 시 차단)
// → 원자적 환불 확정 fn_process_refund(service_role). 승인(approved) 건만. 자동 환불·백그라운드 과금 없음.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ success: false, data: null, error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const serverEnv = (Deno.env.get('PAYMENT_ENV') ?? 'dev').toLowerCase();

  const authHeader = req.headers.get('Authorization') ?? '';
  const body = (await req.json().catch(() => null)) as { refundId?: string; confirm?: boolean } | null;
  const refundId = body?.refundId ?? '';
  if (!refundId || body?.confirm !== true) {
    return json({ success: false, data: null, error: 'bad_request' }, 400);
  }

  // (1) JWT + admin 검증 (🔒-1)
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ success: false, data: null, error: 'unauthorized' }, 401);

  const admin = createClient(url, serviceKey);
  const { data: prof } = await admin
    .from('profiles')
    .select('role, approval_status')
    .eq('id', user.id)
    .maybeSingle();
  if (!prof || prof.role !== 'admin' || prof.approval_status !== 'approved') {
    return json({ success: false, data: null, error: 'forbidden' }, 403);
  }

  // (2) 승인된 환불 로드 + pg_settings
  const { data: refund } = await admin
    .from('refunds')
    .select('id, status, amount, transaction_id')
    .eq('id', refundId)
    .maybeSingle();
  if (!refund) return json({ success: false, data: null, error: 'refund_not_found' }, 404);
  if (refund.status !== 'approved') {
    return json({ success: false, data: null, error: 'refund_not_approved' }, 400);
  }

  const { data: pg } = await admin
    .from('pg_settings')
    .select('payment_mode, is_active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!pg || !pg.is_active) return json({ success: false, data: null, error: 'pg_inactive' }, 400);

  // (3) resolvePaymentMode — min(Admin, env)
  const adminMode = pg.payment_mode === 'live' ? 'live' : 'simulation';
  const mode = serverEnv === 'prod' && adminMode === 'live' ? 'live' : 'simulation';

  let tossCancelKey: string | null = null;
  if (mode === 'live') {
    // 라이브 실 취소 — Toss /v1/payments/{paymentKey}/cancel. 라이브 시크릿키는 Vault 로드(비노출).
    // 원거래 paymentKey + 환불금액(refunds.amount, 서버계산 확정값)으로 부분취소.
    const { data: tx } = await admin
      .from('transactions')
      .select('payment_key')
      .eq('id', refund.transaction_id)
      .maybeSingle();
    const paymentKey = tx?.payment_key ?? null;
    if (!paymentKey) return json({ success: false, data: null, error: 'payment_key_not_found' }, 400);

    const { data: cfg } = await admin.rpc('fn_service_get_config', {
      p_config_names: [],
      p_secret_names: ['toss_live_secret_key'],
    });
    const liveSecret = (cfg as { data?: { secrets?: Record<string, string> } })?.data?.secrets?.['toss_live_secret_key'];
    if (!liveSecret) return json({ success: false, data: null, error: 'live_not_configured' }, 400);

    const basic = btoa(`${liveSecret}:`);
    let cancelRes: Response;
    try {
      cancelRes = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelReason: '관리자 환불', cancelAmount: Number(refund.amount) }),
      });
    } catch {
      return json({ success: false, data: null, error: 'toss_network_error' }, 502);
    }
    const cancelBody = (await cancelRes.json().catch(() => ({}))) as { status?: string; code?: string };
    if (!cancelRes.ok) {
      // 취소 실패 = 환불 확정 안 함(중복/오환불 방지)
      return json({ success: false, data: null, error: cancelBody.code ?? `toss_cancel_failed:${cancelRes.status}` }, 402);
    }
    tossCancelKey = paymentKey;
  } else {
    // 시뮬레이션: 외부 취소 호출 없이 합성
    tossCancelKey = `sim_cancel_${refundId}`;
  }

  // (4) 원자적 환불 확정 — fn_process_refund(승인만·멱등·audit)
  const { data, error } = await admin.rpc('fn_process_refund', {
    p_refund_id: refundId,
    p_toss_cancel_key: tossCancelKey,
    p_mode: mode,
  });
  if (error) return json({ success: false, data: null, error: error.message }, 400);
  return json(data, 200);
});
