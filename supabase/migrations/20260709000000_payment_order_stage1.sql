-- ============================================================================
-- 결제 Stage 1 — 서버 주문 생성 기반 (docs/08 §1.2~§1.3)
--   · transactions.order_id UNIQUE (Race Condition 방지, §1.2)
--   · fn_create_payment_order(p_plan_id) — 서버가 membership_plans 가격 재조회(❌-5),
--     pending transaction 생성 후 Toss 위젯 초기화 정보 반환. 과금 없음.
--   · pg_settings 시뮬레이션 시드(공개 Toss 테스트 client key, payment_mode='simulation')
-- 불변식: 클라이언트 금액 불신 / orderId UNIQUE / 자동결제·재시도·빌링키 없음.
-- ============================================================================

-- (1) orderId 유일성 — 동시 요청 직렬화의 1차 방어 (§1.2 Race Condition)
CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_order_id
  ON public.transactions (order_id) WHERE order_id IS NOT NULL;

-- (2) 주문 생성 RPC — 회원 본인 스코프, 서버 가격 확정, pending 주문 1건 생성
CREATE OR REPLACE FUNCTION public.fn_create_payment_order(p_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_member uuid;
  v_plan   RECORD;
  v_amount numeric;
  v_order  text;
  v_tx     uuid;
BEGIN
  -- 회원 식별은 서버에서만 (클라이언트 member_id 전달 금지 — F-8)
  v_member := current_member_id();
  IF v_member IS NULL THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_a_member');
  END IF;

  SELECT id, name, price, discount_price, is_active, facility_id, plan_kind,
         duration_days, credit_count
    INTO v_plan
    FROM public.membership_plans
   WHERE id = p_plan_id;

  IF v_plan.id IS NULL OR NOT v_plan.is_active THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'plan_unavailable');
  END IF;

  -- ❌-5 클라이언트 금액 불신: 결제 금액은 오직 서버 DB에서 파생 (할인가 우선)
  v_amount := COALESCE(v_plan.discount_price, v_plan.price);
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_price');
  END IF;

  -- orderId — Toss 규격(6~64자), UNIQUE 인덱스가 최종 방어
  v_order := 'BCL' || to_char(now(), 'YYYYMMDDHH24MISS')
             || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  INSERT INTO public.transactions(
    member_id, facility_id, plan_id, order_id, amount, status,
    transaction_type, category, source, toss_raw_data, cash_receipt_status
  ) VALUES (
    v_member, v_plan.facility_id, p_plan_id, v_order, v_amount, 'pending',
    'purchase', 'membership', 'online', '{}'::jsonb, 'not_required'
  ) RETURNING id INTO v_tx;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'order_id', v_order,
      'amount', v_amount,
      'order_name', v_plan.name,
      'plan_kind', v_plan.plan_kind,
      'transaction_id', v_tx,
      -- Toss customerKey (개인정보 아님, 회원 고정 키)
      'customer_key', 'mbr_' || replace(v_member::text, '-', '')
    ),
    'error', NULL
  );
END $$;

REVOKE ALL ON FUNCTION public.fn_create_payment_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_create_payment_order(uuid) TO authenticated;

-- (3) pg_settings 시뮬레이션 시드 — 시설 1개 전제, 없을 때만.
--     test_client_key = Toss 공개 문서 샌드박스 위젯 키(공개 안전). secret은 Stage 2에서 EF가 주입.
--     payment_mode='simulation' — 라이브는 §1.5 체크리스트 통과 후에만.
INSERT INTO public.pg_settings (facility_id, provider, test_client_key, payment_mode, is_active)
SELECT f.id, 'toss', 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm', 'simulation', true
  FROM public.facilities f
 WHERE NOT EXISTS (SELECT 1 FROM public.pg_settings)
 ORDER BY f.created_at
 LIMIT 1;
