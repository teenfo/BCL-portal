-- ============================================================================
-- BCL Portal 재구축 DDL — 02_membership_finance.sql
-- ----------------------------------------------------------------------------
-- 목적   : membership + finance 도메인
--          membership_plans / memberships / membership_history
--          transactions(🔄 id UUID) / refunds / pg_settings / coach_settlements
-- 의존   : 00, 01 (facilities/members/coaches)
-- 변경   : (to-be) transactions.id text → UUID, payment_status·status 혼용 → status 1컬럼,
--          refunds.transaction_id UUID FK 정합, 결제 안전 불변식(금액은 서버 검증) 주석 명문화
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. membership_plans — 요금제
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id       UUID REFERENCES public.facilities(id) ON DELETE SET NULL,  -- NULL=전 지점 공용
    name              VARCHAR(100) NOT NULL,
    type              VARCHAR(10) NOT NULL CHECK (type IN ('period','count')),
    plan_kind         VARCHAR(10) NOT NULL DEFAULT 'standard'
                      CHECK (plan_kind IN ('standard','drop_in','trial')),   -- 🔄 G-7 드롭인·체험권
    duration_days     INT,                      -- period형 필수
    credit_count      INT,                      -- count형 필수
    price             NUMERIC(12,0) NOT NULL CHECK (price >= 0),
    discount_price    NUMERIC(12,0) CHECK (discount_price IS NULL OR discount_price >= 0),
    description       TEXT,
    refund_policy     JSONB NOT NULL DEFAULT '{"formula": "statutory_kr", "penalty_rate_cap": 0.10}'::jsonb,
                      -- 🔄 G-8 기본 산식(계약 §6b):
                      --   환불금 = 결제금액 − 이용일수 해당액 − min(위약금, 결제금액×10%)
                      --   오버라이드 허용하되 penalty_rate_cap > 0.10 설정 금지(공정위 상한)
    max_pauses        INT NOT NULL DEFAULT 0,
    facility_sharing  BOOLEAN NOT NULL DEFAULT false,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_plan_type CHECK (
        (type = 'period' AND duration_days > 0) OR
        (type = 'count'  AND credit_count  > 0)
    ),
    CONSTRAINT chk_refund_penalty_cap CHECK (
        COALESCE((refund_policy->>'penalty_rate_cap')::NUMERIC, 0.10) <= 0.10
    )
);

-- 기존 배포분 증분 (멱등)
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS plan_kind VARCHAR(10) NOT NULL DEFAULT 'standard'
    CHECK (plan_kind IN ('standard','drop_in','trial'));

CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON public.membership_plans(is_active, facility_id);

COMMENT ON TABLE public.membership_plans IS 'membership: 요금제. period(기간제)/count(횟수제) × plan_kind(standard/drop_in/trial — G-7). 가격은 원화 정수';
COMMENT ON COLUMN public.membership_plans.plan_kind IS 'G-7: drop_in(일일권)·trial(체험권)도 정식 상품 — 키오스크 체크인 유효(NO_MEMBERSHIP 거부 분기 해소)';
COMMENT ON COLUMN public.membership_plans.refund_policy IS 'G-8 환불 산식(계약 §6b): 결제금액−이용일수 해당액−min(위약금, 결제금액×10%). penalty_rate_cap ≤ 0.10 CHECK 강제';

-- ----------------------------------------------------------------------------
-- 2. memberships — 회원권 보유 내역
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id          UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    plan_id            UUID REFERENCES public.membership_plans(id) ON DELETE SET NULL,
    start_date         DATE NOT NULL,
    end_date           DATE,
    remaining_credits  INT CHECK (remaining_credits IS NULL OR remaining_credits >= 0),
    status             VARCHAR(10) NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','paused','expired','cancelled')),
    pause_count        INT NOT NULL DEFAULT 0,
    paused_at          TIMESTAMPTZ,
    pause_reason       TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 쿼리 패턴: (a) 회원 상세의 활성 멤버십, (b) 만기 D-n 크론 스캔
CREATE INDEX IF NOT EXISTS idx_memberships_member_status ON public.memberships(member_id, status, end_date DESC);
CREATE INDEX IF NOT EXISTS idx_memberships_expiry_scan   ON public.memberships(end_date) WHERE status = 'active';

COMMENT ON TABLE  public.memberships IS 'membership: 보유 회원권. status에 paused 추가(as-is: paused_at만 있고 상태 없음 → 정규화)';
COMMENT ON COLUMN public.memberships.remaining_credits IS '횟수제 잔여 크레딧. 차감/환원은 fn_book_with_credit/fn_cancel_booking_with_credit RPC로만';

-- ----------------------------------------------------------------------------
-- 3. membership_history — 변경 이력 (감사 추적)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_history (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id  UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
    action_type    VARCHAR(20) NOT NULL
                   CHECK (action_type IN ('created','extended','paused','resumed',
                                          'credit_adjusted','transferred','cancelled')),
    old_values     JSONB,
    new_values     JSONB,
    notes          TEXT,
    changed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_history_membership ON public.membership_history(membership_id, created_at DESC);

COMMENT ON TABLE public.membership_history IS 'membership: 변경 이력. 모든 상태 변경은 이 테이블에 기록 후 memberships 갱신';

-- ----------------------------------------------------------------------------
-- 4. transactions — 거래 (🔄 id text → UUID 표준화)
--    【결제 안전 불변식】 ① 클라이언트가 보낸 금액을 신뢰하지 않는다(서버에서 plan 가격 재계산)
--    ② Toss 승인 결과(toss_raw_data)는 불변 원본으로 보존 ③ payment_mode=simulation이
--    기본이며 live 전환은 pg_settings에서만 제어
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),           -- 🔄 as-is text → UUID
    member_id         UUID REFERENCES public.members(id) ON DELETE SET NULL,
    facility_id       UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
    membership_id     UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
    plan_id           UUID REFERENCES public.membership_plans(id) ON DELETE SET NULL,
    order_id          TEXT UNIQUE,                                          -- Toss orderId (외부 식별자는 별도 컬럼)
    payment_key       TEXT,                                                 -- Toss paymentKey
    amount            NUMERIC(12,0) NOT NULL CHECK (amount >= 0),
    status            VARCHAR(15) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','completed','failed','cancelled','refunded','partial_refunded')),
    transaction_type  VARCHAR(15) NOT NULL DEFAULT 'purchase'
                      CHECK (transaction_type IN ('purchase','refund','adjustment')),
    category          VARCHAR(20) NOT NULL DEFAULT 'membership'
                      CHECK (category IN ('membership','pt','goods','locker','etc')),
    payment_method    VARCHAR(50),                                          -- card/transfer/cash/...
    source            VARCHAR(10) NOT NULL DEFAULT 'manual'
                      CHECK (source IN ('online','pos','manual')),
    toss_status       TEXT,                                                 -- Toss 원문 상태(DONE/CANCELED/...)
    cancel_reason     TEXT,
    cancel_amount     NUMERIC(12,0),
    cancelled_at      TIMESTAMPTZ,
    receipt_url       TEXT,
    cash_receipt_status      VARCHAR(15) NOT NULL DEFAULT 'not_required'
                             CHECK (cash_receipt_status IN ('not_required','pending','issued','failed')),
                             -- 🔄 G-9 현금영수증 의무발행(미발급 가산세 20%) — 현금/이체 매출은 pending으로 시작
    cash_receipt_approval_no VARCHAR(30),                                   -- 국세청 승인번호
    toss_raw_data     JSONB NOT NULL DEFAULT '{}'::jsonb,                   -- 승인 응답 불변 원본
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기존 배포분 증분 (멱등)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cash_receipt_status VARCHAR(15) NOT NULL DEFAULT 'not_required'
    CHECK (cash_receipt_status IN ('not_required','pending','issued','failed'));
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cash_receipt_approval_no VARCHAR(30);

-- G-9 미발급 경고 리포트 스캔
CREATE INDEX IF NOT EXISTS idx_transactions_cash_receipt_pending
    ON public.transactions(created_at DESC) WHERE cash_receipt_status IN ('pending','failed');

-- 쿼리 패턴: (a) 회원 결제 이력, (b) 기간 매출 리포트, (c) Toss orderId 콜백 조회
CREATE INDEX IF NOT EXISTS idx_transactions_member_created ON public.transactions(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status_created ON public.transactions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_facility_created ON public.transactions(facility_id, created_at DESC);

COMMENT ON TABLE  public.transactions IS 'finance: 거래. 🔄 PK UUID 통일(구 text id 폐지, Toss 식별자는 order_id/payment_key로 분리). status 1컬럼(구 payment_status/status 혼용 정리)';
COMMENT ON COLUMN public.transactions.toss_raw_data IS 'Toss 승인/취소 응답 원본(JSONB, 불변 보존 원칙)';

-- ----------------------------------------------------------------------------
-- 5. refunds — 환불
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refunds (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id   UUID NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
    amount           NUMERIC(12,0) NOT NULL CHECK (amount > 0),
    penalty_amount   NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
    reason           TEXT NOT NULL,
    refund_method    VARCHAR(30),
    status           VARCHAR(10) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','completed','rejected')),
    toss_cancel_key  TEXT,
    processed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refunds_transaction ON public.refunds(transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status, created_at DESC);

COMMENT ON TABLE public.refunds IS 'finance: 환불. transaction_id UUID FK 정합(구 text FK 해소). 환불액은 plan.refund_policy 기준 서버 계산';

-- ----------------------------------------------------------------------------
-- 6. pg_settings — PG(Toss) 설정 (시크릿은 pgp_sym 암호화 컬럼)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pg_settings (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id                 UUID UNIQUE REFERENCES public.facilities(id) ON DELETE CASCADE,
    provider                    VARCHAR(20) NOT NULL DEFAULT 'toss',
    test_client_key             TEXT,
    test_secret_key_encrypted   TEXT,          -- pgp_sym_encrypt 저장 (save_pg_settings RPC 전용)
    live_client_key             TEXT,
    live_secret_key_encrypted   TEXT,
    webhook_secret_encrypted    TEXT,
    pos_api_key_encrypted       TEXT,
    payment_mode                VARCHAR(10) NOT NULL DEFAULT 'simulation'
                                CHECK (payment_mode IN ('simulation','live')),
    is_active                   BOOLEAN NOT NULL DEFAULT true,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.pg_settings IS 'finance: PG 설정. facility당 1행(UNIQUE). payment_mode 기본 simulation — live 전환은 이 컬럼만이 유일한 스위치';
COMMENT ON COLUMN public.pg_settings.payment_mode IS 'simulation(기본)/live 이중장치 — 코드 어디에서도 이 값을 우회하지 않는다';

-- ----------------------------------------------------------------------------
-- 7. coach_settlements — 코치 월 정산 스냅샷
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_settlements (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id           UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    year_month         VARCHAR(7) NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),   -- 'YYYY-MM'
    base_salary        INTEGER NOT NULL DEFAULT 0,
    session_count      INTEGER NOT NULL DEFAULT 0,
    session_allowance  INTEGER NOT NULL DEFAULT 0,
    total_amount       INTEGER NOT NULL DEFAULT 0,
    status             VARCHAR(10) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','confirmed','paid')),
    confirmed_at       TIMESTAMPTZ,
    confirmed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (coach_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_coach_settlements_month ON public.coach_settlements(year_month DESC);

COMMENT ON TABLE public.coach_settlements IS 'finance: 월 정산 스냅샷. 예상치는 fn_get_coach_monthly_report(basis 섹션), 확정은 fn_calculate_monthly_settlement';

-- ----------------------------------------------------------------------------
-- 8. updated_at 트리거
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_membership_plans_updated_at ON public.membership_plans;
CREATE TRIGGER trg_membership_plans_updated_at BEFORE UPDATE ON public.membership_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_memberships_updated_at ON public.memberships;
CREATE TRIGGER trg_memberships_updated_at BEFORE UPDATE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_pg_settings_updated_at ON public.pg_settings;
CREATE TRIGGER trg_pg_settings_updated_at BEFORE UPDATE ON public.pg_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 9. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.membership_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_settlements  ENABLE ROW LEVEL SECURITY;

-- membership_plans: 인증 읽기(구매 화면) / admin 쓰기
DROP POLICY IF EXISTS "plans read" ON public.membership_plans;
CREATE POLICY "plans read" ON public.membership_plans
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "plans admin manage" ON public.membership_plans;
CREATE POLICY "plans admin manage" ON public.membership_plans
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- memberships: 본인 읽기 + staff 읽기 / admin 쓰기 (크레딧 증감은 RPC 경유)
DROP POLICY IF EXISTS "memberships own read" ON public.memberships;
CREATE POLICY "memberships own read" ON public.memberships
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.members m
                   WHERE m.id = memberships.member_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "memberships staff read" ON public.memberships;
CREATE POLICY "memberships staff read" ON public.memberships
    FOR SELECT TO authenticated USING (public.is_admin_or_coach());
DROP POLICY IF EXISTS "memberships admin manage" ON public.memberships;
CREATE POLICY "memberships admin manage" ON public.memberships
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- membership_history: 본인 읽기 + admin 관리
DROP POLICY IF EXISTS "membership_history own read" ON public.membership_history;
CREATE POLICY "membership_history own read" ON public.membership_history
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.memberships ms
                   JOIN public.members m ON m.id = ms.member_id
                   WHERE ms.id = membership_history.membership_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "membership_history admin manage" ON public.membership_history;
CREATE POLICY "membership_history admin manage" ON public.membership_history
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- transactions: 본인 읽기 / admin 전체 (INSERT/UPDATE는 서버 라우트(Service Role)·admin만)
DROP POLICY IF EXISTS "transactions own read" ON public.transactions;
CREATE POLICY "transactions own read" ON public.transactions
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.members m
                   WHERE m.id = transactions.member_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "transactions admin manage" ON public.transactions;
CREATE POLICY "transactions admin manage" ON public.transactions
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- refunds: 본인(자기 거래) 읽기 / admin 전체
DROP POLICY IF EXISTS "refunds own read" ON public.refunds;
CREATE POLICY "refunds own read" ON public.refunds
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.transactions t
                   JOIN public.members m ON m.id = t.member_id
                   WHERE t.id = refunds.transaction_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "refunds admin manage" ON public.refunds;
CREATE POLICY "refunds admin manage" ON public.refunds
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- pg_settings: admin 전용 (시크릿 컬럼 포함 — coach에게도 비노출)
DROP POLICY IF EXISTS "pg_settings admin only" ON public.pg_settings;
CREATE POLICY "pg_settings admin only" ON public.pg_settings
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- coach_settlements: 본인(코치) 읽기 / admin 전체
DROP POLICY IF EXISTS "settlements own coach read" ON public.coach_settlements;
CREATE POLICY "settlements own coach read" ON public.coach_settlements
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.coaches c
                   WHERE c.id = coach_settlements.coach_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS "settlements admin manage" ON public.coach_settlements;
CREATE POLICY "settlements admin manage" ON public.coach_settlements
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- 02_membership_finance.sql 끝 — 다음: 03_sessions_bookings.sql
-- ============================================================================
