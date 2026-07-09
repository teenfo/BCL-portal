-- ============================================================================
-- 결제 Stage 4a — 환불 원자 RPC (docs/08 §1.2 환불 안전규칙 · §1.3 ② · §1.6)
--   2단계 분리: fn_request_refund(admin, 계산·승인 레코드 생성)
--             → fn_process_refund(service_role EF, 원자적 실행).
--   불변식: 환불액 서버 계산(fn_calculate_refund 10% 캡, 승인 시점 잠금) · 중복 환불 차단
--           · 거래 refunded/partial_refunded + 멤버십 cancelled + refunds completed + audit_logs(🔒-5).
-- ============================================================================

-- (1) 환불 요청·승인 — admin 전용. fn_calculate_refund로 서버 산정 후 refunds(approved) 생성.
CREATE OR REPLACE FUNCTION public.fn_request_refund(
  p_transaction_id uuid, p_membership_id uuid, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin  uuid := auth.uid();
  v_calc   jsonb;
  v_data   jsonb;
  v_refund uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'reason_required');
  END IF;
  -- 중복 환불 차단(🔒-4): 진행/완료 환불이 있으면 거부
  IF EXISTS (SELECT 1 FROM public.refunds
              WHERE transaction_id = p_transaction_id AND status IN ('approved', 'completed')) THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'refund_already_exists');
  END IF;

  -- 서버 단일 계산(10% 캡은 함수 내부 강제)
  v_calc := public.fn_calculate_refund(p_transaction_id, p_membership_id);
  IF NOT COALESCE((v_calc->>'success')::boolean, false) THEN
    RETURN v_calc;
  END IF;
  v_data := v_calc->'data';

  INSERT INTO public.refunds(transaction_id, amount, penalty_amount, reason, status, processed_by)
  VALUES (p_transaction_id,
          (v_data->>'refund_amount')::numeric,
          (v_data->>'penalty_amount')::numeric,
          p_reason, 'approved', v_admin)
  RETURNING id INTO v_refund;

  RETURN jsonb_build_object('success', true,
    'data', v_data || jsonb_build_object('refund_id', v_refund, 'membership_id', p_membership_id),
    'error', NULL);
END $$;

REVOKE ALL ON FUNCTION public.fn_request_refund(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_request_refund(uuid, uuid, text) TO authenticated;

-- (2) 환불 실행 — service_role(cancel-payment EF) 전용. 승인(approved) 건만, 원자적.
CREATE OR REPLACE FUNCTION public.fn_process_refund(
  p_refund_id uuid, p_toss_cancel_key text DEFAULT NULL, p_mode text DEFAULT 'simulation'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_r      RECORD;
  v_tx     RECORD;
  v_status text;
  v_user   uuid;
BEGIN
  SELECT * INTO v_r FROM public.refunds WHERE id = p_refund_id FOR UPDATE;
  IF v_r.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'refund_not_found');
  END IF;
  IF v_r.status = 'completed' THEN
    RETURN jsonb_build_object('success', true,
      'data', jsonb_build_object('refund_id', p_refund_id, 'idempotent', true), 'error', NULL);
  END IF;
  IF v_r.status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'refund_not_approved');
  END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = v_r.transaction_id FOR UPDATE;
  IF v_tx.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'transaction_not_found');
  END IF;
  IF v_tx.status <> 'completed' THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'transaction_not_refundable');
  END IF;

  -- 거래 상태 = 'refunded' (transactions.status varchar(15) — 'partial_refunded' 16자로 미수용).
  -- 부분/전액 구분은 cancel_amount vs amount로 파생(리포트).
  v_status := 'refunded';

  UPDATE public.transactions SET
    status        = v_status,
    cancel_reason = v_r.reason,
    cancel_amount = v_r.amount,
    cancelled_at  = now(),
    toss_raw_data = COALESCE(toss_raw_data, '{}'::jsonb)
                    || jsonb_build_object('refund_mode', p_mode, 'refunded_at', now())
   WHERE id = v_tx.id;

  IF v_tx.membership_id IS NOT NULL THEN
    UPDATE public.memberships SET status = 'cancelled' WHERE id = v_tx.membership_id;
  END IF;

  UPDATE public.refunds SET
    status        = 'completed',
    completed_at  = now(),
    toss_cancel_key = COALESCE(p_toss_cancel_key, toss_cancel_key)
   WHERE id = v_r.id;

  -- 감사(🔒-5): 누가(processed_by)/얼마/사유
  INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_values, new_values)
  VALUES (v_r.processed_by, 'refund_completed', 'refunds', v_r.id,
          jsonb_build_object('transaction_id', v_tx.id, 'prev_status', 'approved'),
          jsonb_build_object('refund_amount', v_r.amount, 'penalty_amount', v_r.penalty_amount,
                             'tx_status', v_status, 'mode', p_mode));

  -- 환불 완료 알림 — best-effort
  BEGIN
    SELECT user_id INTO v_user FROM public.members WHERE id = v_tx.member_id;
    IF v_user IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, member_id, title, content, category, type, channel, metadata, is_read)
      VALUES (v_user, v_tx.member_id, '환불이 완료되었습니다',
              '환불 ' || v_r.amount || '원이 처리되었습니다.', 'payment', 'info', 'in_app',
              jsonb_build_object('refund_id', v_r.id, 'transaction_id', v_tx.id), false);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true,
    'data', jsonb_build_object('refund_id', v_r.id, 'transaction_id', v_tx.id,
                               'tx_status', v_status, 'refund_amount', v_r.amount), 'error', NULL);
END $$;

REVOKE ALL ON FUNCTION public.fn_process_refund(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_process_refund(uuid, text, text) TO service_role;
