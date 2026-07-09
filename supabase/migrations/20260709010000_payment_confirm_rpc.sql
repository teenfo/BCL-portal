-- ============================================================================
-- 결제 Stage 2a — 원자적 승인 RPC (docs/08 §1.3 ① confirm-payment 의 DB 코어)
--   Edge Function(confirm-payment)이 JWT·resolvePaymentMode·Toss 호출을 마친 뒤,
--   service_role로 이 함수를 호출해 원자적 DB 확정을 수행한다.
--   불변식: SELECT ... FOR UPDATE(직렬화) · 멱등(중복 승인 차단) · 서버 금액 재검증(❌-5)
--           · Fail-to-NOT-charge(불일치 시 failed 기록 후 거부, 멤버십 미생성).
--   client/authenticated 직접 호출 금지 — service_role(EF) 전용.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_confirm_payment_order(
  p_order_id    text,
  p_payment_key text,
  p_amount      numeric,
  p_toss_status text DEFAULT NULL,
  p_receipt_url text DEFAULT NULL,
  p_mode        text DEFAULT 'simulation'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tx        RECORD;
  v_plan      RECORD;
  v_expected  numeric;
  v_membership uuid;
  v_end       date;
  v_credits   int;
  v_user      uuid;
BEGIN
  -- 주문 잠금 — 동시 승인 요청 직렬화 (§1.2 Race Condition)
  SELECT * INTO v_tx FROM public.transactions WHERE order_id = p_order_id FOR UPDATE;
  IF v_tx.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'order_not_found');
  END IF;

  -- 멱등: 이미 완료 → 기존 멤버십 반환(이중 결제 < 결제 실패)
  IF v_tx.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'data',
      jsonb_build_object('order_id', p_order_id, 'membership_id', v_tx.membership_id, 'idempotent', true),
      'error', NULL);
  END IF;

  IF v_tx.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'order_not_pending');
  END IF;

  -- ❌-5 서버 금액 재검증: 요청 금액 ≠ 주문의 서버 확정 금액 → 즉시 거부
  IF p_amount IS NULL OR p_amount <> v_tx.amount THEN
    UPDATE public.transactions SET status='failed',
      toss_raw_data = COALESCE(toss_raw_data,'{}'::jsonb)
        || jsonb_build_object('fail_reason','amount_mismatch','requested',p_amount,'expected',v_tx.amount)
     WHERE id = v_tx.id;
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'amount_mismatch');
  END IF;

  -- 플랜 현재가 대조(주문 후 가격 변동 방어)
  SELECT * INTO v_plan FROM public.membership_plans WHERE id = v_tx.plan_id;
  IF v_plan.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'plan_missing');
  END IF;
  v_expected := COALESCE(v_plan.discount_price, v_plan.price);
  IF v_tx.amount <> v_expected THEN
    UPDATE public.transactions SET status='failed',
      toss_raw_data = COALESCE(toss_raw_data,'{}'::jsonb)
        || jsonb_build_object('fail_reason','plan_price_drift','order_amount',v_tx.amount,'plan_price',v_expected)
     WHERE id = v_tx.id;
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'plan_price_drift');
  END IF;

  -- 멤버십 활성화 (기간제=end_date / 횟수제=remaining_credits)
  IF v_plan.type = 'period' THEN
    v_end := current_date + (COALESCE(v_plan.duration_days, 0) || ' days')::interval;
    v_credits := NULL;
  ELSE
    v_end := NULL;
    v_credits := v_plan.credit_count;
  END IF;

  INSERT INTO public.memberships(member_id, plan_id, start_date, end_date, remaining_credits, status)
  VALUES (v_tx.member_id, v_tx.plan_id, current_date, v_end, v_credits, 'active')
  RETURNING id INTO v_membership;

  UPDATE public.transactions SET
    status        = 'completed',
    payment_key   = p_payment_key,
    toss_status   = COALESCE(p_toss_status, toss_status),
    receipt_url   = COALESCE(p_receipt_url, receipt_url),
    membership_id = v_membership,
    toss_raw_data = COALESCE(toss_raw_data,'{}'::jsonb)
                    || jsonb_build_object('mode', p_mode, 'confirmed_at', now())
   WHERE id = v_tx.id;

  -- 결제 완료 알림 — best-effort(실패해도 성공한 결제를 롤백하지 않는다)
  BEGIN
    SELECT user_id INTO v_user FROM public.members WHERE id = v_tx.member_id;
    IF v_user IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, member_id, title, content, category, type, channel, metadata, is_read)
      VALUES (v_user, v_tx.member_id, '결제가 완료되었습니다',
              v_plan.name || ' 결제가 완료되어 멤버십이 활성화되었습니다.',
              'payment', 'success', 'in_app',
              jsonb_build_object('order_id', p_order_id, 'membership_id', v_membership), false);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'data',
    jsonb_build_object('order_id', p_order_id, 'membership_id', v_membership,
                       'amount', v_tx.amount, 'idempotent', false), 'error', NULL);
END $$;

-- service_role(EF) 전용 — 클라이언트 직접 승인 경로 차단
REVOKE ALL ON FUNCTION public.fn_confirm_payment_order(text, text, numeric, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_confirm_payment_order(text, text, numeric, text, text, text)
  TO service_role;
