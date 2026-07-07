-- ============================================================================
-- BCL Portal 재구축 DDL — 07_performance_badges.sql
-- ----------------------------------------------------------------------------
-- 목적   : performance 도메인 — benchmark_definitions / member_benchmark_results /
--          coach_followups + ⏳ 배지 정식 스키마(badge_definitions / badge_awards)
--          + 배지 판정 트리거 4종 (as-is: 배지 테이블은 문서에만 존재 → 최초 정식 설계)
-- 의존   : 00, 01 (members/coaches), 02 (memberships), 03 (sessions/checkins), 05 (race)
-- 시드   : 벤치마크 6종, 배지 핵심 12종
-- 참고   : 판정 본체 fn_evaluate_badges는 09_rpc.sql에서 정의(표준 RPC).
--          본 파일의 트리거 wrapper는 런타임에 이를 호출(plpgsql — 파일 순서 안전)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. benchmark_definitions — 벤치마크 종목 정의
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.benchmark_definitions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id  UUID REFERENCES public.facilities(id) ON DELETE SET NULL,   -- NULL=전 지점 공용
    name         VARCHAR(120) NOT NULL UNIQUE,
    metric_type  VARCHAR(15) NOT NULL
                 CHECK (metric_type IN ('time','reps','weight','distance','calories')),
    unit         VARCHAR(20) NOT NULL DEFAULT '',
    description  TEXT,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.benchmark_definitions IS 'performance: 벤치마크 종목. metric_type=time은 낮을수록, 나머지는 높을수록 우수 (PR 판정 방향의 단일 규칙)';

-- 시드: 벤치마크 6종
INSERT INTO public.benchmark_definitions (name, metric_type, unit, description) VALUES
    ('500m Row',       'time',   'sec',  'Concept2 로잉 500m 최고 기록'),
    ('1000m Row',      'time',   'sec',  'Concept2 로잉 1000m 최고 기록'),
    ('2000m Row',      'time',   'sec',  'Concept2 로잉 2000m 최고 기록'),
    ('Max Back Squat', 'weight', 'kg',   '백 스쿼트 1RM'),
    ('Max Deadlift',   'weight', 'kg',   '데드리프트 1RM'),
    ('Max Pull-ups',   'reps',   'reps', '풀업 최대 연속 반복 수')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. member_benchmark_results — 벤치마크 결과 + PR 판정
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_benchmark_results (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id      UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    benchmark_id   UUID NOT NULL REFERENCES public.benchmark_definitions(id) ON DELETE CASCADE,
    session_id     UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    race_event_id  UUID REFERENCES public.race_events(id) ON DELETE SET NULL,
    result_value   NUMERIC(12,2) NOT NULL CHECK (result_value > 0),
    result_meta    JSONB NOT NULL DEFAULT '{}'::jsonb,          -- {watts, spm 등 보조 지표}
    rx_status      VARCHAR(10) NOT NULL DEFAULT 'rx'
                   CHECK (rx_status IN ('rx_plus','rx','scaled')),   -- 🔄 G-2 계층 어휘 통일
    is_pr          BOOLEAN NOT NULL DEFAULT false,
    recorded_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기존 배포분 증분 (멱등)
ALTER TABLE public.member_benchmark_results ADD COLUMN IF NOT EXISTS rx_status VARCHAR(10) NOT NULL DEFAULT 'rx'
    CHECK (rx_status IN ('rx_plus','rx','scaled'));

-- 쿼리 패턴: (a) 회원×종목 베스트/이력, (b) PR 티커(시설 최근 PR)
CREATE INDEX IF NOT EXISTS idx_benchmark_results_member
    ON public.member_benchmark_results(member_id, benchmark_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_recent_pr
    ON public.member_benchmark_results(recorded_at DESC) WHERE is_pr = true;

COMMENT ON TABLE public.member_benchmark_results IS 'performance: 벤치마크 결과(+rx_status G-2). INSERT는 fn_record_member_benchmark_result 경유(advisory lock으로 PR 동시성 보장). PR 판정은 동일 rx_status 계층 내 비교';

-- ----------------------------------------------------------------------------
-- 3. coach_followups — 코치 후속 조치 태스크
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_followups (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id      UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    session_id     UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    coach_id       UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    followup_type  VARCHAR(20) NOT NULL
                   CHECK (followup_type IN ('injury','trial_conversion','renewal','absence','motivation')),
    priority       VARCHAR(10) NOT NULL DEFAULT 'normal'
                   CHECK (priority IN ('low','normal','high')),
    status         VARCHAR(10) NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','completed','dismissed')),
    due_date       DATE,
    note           TEXT,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 쿼리 패턴: 코치의 open 태스크(priority>due_date 정렬), 회원별 이력
CREATE INDEX IF NOT EXISTS idx_coach_followups_coach_open
    ON public.coach_followups(coach_id, due_date) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_coach_followups_member
    ON public.coach_followups(member_id, created_at DESC);

COMMENT ON TABLE public.coach_followups IS 'performance: 후속 조치. 회원에게 절대 비노출(RLS coach 본인+admin만)';

-- ----------------------------------------------------------------------------
-- 4. badge_definitions — 배지 정의 (⏳ 신규 정식 설계 — as-is 마이그레이션 부재 해소)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.badge_definitions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             VARCHAR(60) NOT NULL UNIQUE,
    name             VARCHAR(100) NOT NULL,
    description      TEXT,
    icon             VARCHAR(60),                              -- 디자인 시스템 아이콘 키 (12-design-system)
    category         VARCHAR(20) NOT NULL
                     CHECK (category IN ('attendance','performance','race','membership','special')),
    metric_type      VARCHAR(30) NOT NULL
                     CHECK (metric_type IN ('checkin_count','checkin_streak_weeks','pr_count',
                                            'race_count','race_podium_count','membership_days','manual')),
    threshold_value  NUMERIC NOT NULL DEFAULT 1 CHECK (threshold_value > 0),
    sort_order       INT NOT NULL DEFAULT 0,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.badge_definitions IS 'performance: 배지 정의. metric_type+threshold로 fn_evaluate_badges가 자동 판정 (manual=Admin 수동 수여 전용)';
COMMENT ON COLUMN public.badge_definitions.metric_type IS 'checkin_count/checkin_streak_weeks/pr_count/race_count/race_podium_count/membership_days/manual';

-- 시드: 배지 핵심 12종
INSERT INTO public.badge_definitions (slug, name, description, icon, category, metric_type, threshold_value, sort_order) VALUES
    ('first-checkin', '첫 출석',        '첫 번째 체크인 달성',                'footprints', 'attendance',  'checkin_count',        1,   10),
    ('checkin-10',    '출석 10회',      '누적 체크인 10회',                   'flame',      'attendance',  'checkin_count',        10,  20),
    ('checkin-50',    '출석 50회',      '누적 체크인 50회',                   'flame',      'attendance',  'checkin_count',        50,  30),
    ('checkin-100',   '출석 100회',     '누적 체크인 100회',                  'crown',      'attendance',  'checkin_count',        100, 40),
    ('streak-4w',     '4주 연속 출석',  '4주 연속 주 1회 이상 출석',          'calendar',   'attendance',  'checkin_streak_weeks', 4,   50),
    ('first-pr',      '첫 PR',          '첫 번째 개인 최고 기록',             'trophy',     'performance', 'pr_count',             1,   60),
    ('pr-10',         'PR 콜렉터',      '개인 최고 기록 10회 갱신',           'trophy',     'performance', 'pr_count',             10,  70),
    ('first-race',    '첫 레이스',      '첫 Race 이벤트 완주',                'rowing',     'race',        'race_count',           1,   80),
    ('race-5',        '레이서',         'Race 이벤트 5회 완주',               'rowing',     'race',        'race_count',           5,   90),
    ('race-podium',   '포디움',         'Race 3위 이내 입상',                 'medal',      'race',        'race_podium_count',    1,   100),
    ('member-90d',    '3개월 멤버',     '등록 후 90일 경과',                  'shield',     'membership',  'membership_days',      90,  110),
    ('member-365d',   '1년 멤버',       '등록 후 365일 경과',                 'shield-star','membership',  'membership_days',      365, 120)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. badge_awards — 회원별 배지 획득 (멱등: UNIQUE(member,badge))
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.badge_awards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id       UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    badge_id        UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
    source          VARCHAR(10) NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','manual')),
    progress_value  NUMERIC,                                   -- 수여 시점 지표 값(예: 체크인 52회)
    awarded_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- manual 수여자
    awarded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (member_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_badge_awards_member ON public.badge_awards(member_id, awarded_at DESC);

COMMENT ON TABLE public.badge_awards IS 'performance: 배지 획득 이력. UNIQUE(member,badge)로 중복 수여 원천 차단 — fn_evaluate_badges 멱등 기반';

-- ----------------------------------------------------------------------------
-- 6. 배지 판정 트리거 4종 — 판정 본체(fn_evaluate_badges, 09_rpc)를 이벤트별 호출
--    ① checkins INSERT      → 출석 계열
--    ② member_benchmark_results INSERT(is_pr) → PR 계열
--    ③ race_records INSERT  → 레이스 계열
--    ④ memberships INSERT   → 멤버십 기간 계열 (기간 경과분은 일일 크론에서 보강 판정 가능)
--    wrapper는 예외를 삼켜 원본 트랜잭션을 절대 실패시키지 않음
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._badges_on_checkin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    BEGIN
        PERFORM public.fn_evaluate_badges(NEW.member_id, 'checkin');
    EXCEPTION WHEN OTHERS THEN NULL; END;
    RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public._badges_on_benchmark()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.is_pr THEN
        BEGIN
            PERFORM public.fn_evaluate_badges(NEW.member_id, 'benchmark_pr');
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public._badges_on_race_record()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.member_id IS NOT NULL THEN
        BEGIN
            PERFORM public.fn_evaluate_badges(NEW.member_id, 'race');
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public._badges_on_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    BEGIN
        PERFORM public.fn_evaluate_badges(NEW.member_id, 'membership');
    EXCEPTION WHEN OTHERS THEN NULL; END;
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_badges_on_checkin ON public.checkins;
CREATE TRIGGER trg_badges_on_checkin
    AFTER INSERT ON public.checkins
    FOR EACH ROW EXECUTE FUNCTION public._badges_on_checkin();

DROP TRIGGER IF EXISTS trg_badges_on_benchmark ON public.member_benchmark_results;
CREATE TRIGGER trg_badges_on_benchmark
    AFTER INSERT ON public.member_benchmark_results
    FOR EACH ROW EXECUTE FUNCTION public._badges_on_benchmark();

DROP TRIGGER IF EXISTS trg_badges_on_race_record ON public.race_records;
CREATE TRIGGER trg_badges_on_race_record
    AFTER INSERT ON public.race_records
    FOR EACH ROW EXECUTE FUNCTION public._badges_on_race_record();

DROP TRIGGER IF EXISTS trg_badges_on_membership ON public.memberships;
CREATE TRIGGER trg_badges_on_membership
    AFTER INSERT ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public._badges_on_membership();

-- ----------------------------------------------------------------------------
-- 7. updated_at 트리거
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_benchmark_definitions_updated_at ON public.benchmark_definitions;
CREATE TRIGGER trg_benchmark_definitions_updated_at BEFORE UPDATE ON public.benchmark_definitions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_coach_followups_updated_at ON public.coach_followups;
CREATE TRIGGER trg_coach_followups_updated_at BEFORE UPDATE ON public.coach_followups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_badge_definitions_updated_at ON public.badge_definitions;
CREATE TRIGGER trg_badge_definitions_updated_at BEFORE UPDATE ON public.badge_definitions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 8. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.benchmark_definitions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_benchmark_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_followups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_definitions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_awards             ENABLE ROW LEVEL SECURITY;

-- benchmark_definitions: 인증 읽기 / staff INSERT·UPDATE / admin DELETE
DROP POLICY IF EXISTS "benchmark_definitions read" ON public.benchmark_definitions;
CREATE POLICY "benchmark_definitions read" ON public.benchmark_definitions
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "benchmark_definitions staff insert" ON public.benchmark_definitions;
CREATE POLICY "benchmark_definitions staff insert" ON public.benchmark_definitions
    FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_coach());
DROP POLICY IF EXISTS "benchmark_definitions staff update" ON public.benchmark_definitions;
CREATE POLICY "benchmark_definitions staff update" ON public.benchmark_definitions
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_coach()) WITH CHECK (public.is_admin_or_coach());
DROP POLICY IF EXISTS "benchmark_definitions admin delete" ON public.benchmark_definitions;
CREATE POLICY "benchmark_definitions admin delete" ON public.benchmark_definitions
    FOR DELETE TO authenticated USING (public.is_admin());

-- member_benchmark_results: 본인 읽기 + staff 읽기·INSERT·UPDATE / admin DELETE
DROP POLICY IF EXISTS "benchmark_results own read" ON public.member_benchmark_results;
CREATE POLICY "benchmark_results own read" ON public.member_benchmark_results
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.members m
                   WHERE m.id = member_benchmark_results.member_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "benchmark_results staff read" ON public.member_benchmark_results;
CREATE POLICY "benchmark_results staff read" ON public.member_benchmark_results
    FOR SELECT TO authenticated USING (public.is_admin_or_coach());
DROP POLICY IF EXISTS "benchmark_results staff insert" ON public.member_benchmark_results;
CREATE POLICY "benchmark_results staff insert" ON public.member_benchmark_results
    FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_coach());
DROP POLICY IF EXISTS "benchmark_results staff update" ON public.member_benchmark_results;
CREATE POLICY "benchmark_results staff update" ON public.member_benchmark_results
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_coach()) WITH CHECK (public.is_admin_or_coach());
DROP POLICY IF EXISTS "benchmark_results admin delete" ON public.member_benchmark_results;
CREATE POLICY "benchmark_results admin delete" ON public.member_benchmark_results
    FOR DELETE TO authenticated USING (public.is_admin());

-- coach_followups: admin 전체 / coach 본인 것만 (회원 비노출)
DROP POLICY IF EXISTS "followups admin manage" ON public.coach_followups;
CREATE POLICY "followups admin manage" ON public.coach_followups
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "followups own coach manage" ON public.coach_followups;
CREATE POLICY "followups own coach manage" ON public.coach_followups
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.coaches c
                   WHERE c.id = coach_followups.coach_id AND c.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.coaches c
                        WHERE c.id = coach_followups.coach_id AND c.user_id = auth.uid()));

-- badge_definitions: 인증 읽기 / admin 관리
DROP POLICY IF EXISTS "badge_definitions read" ON public.badge_definitions;
CREATE POLICY "badge_definitions read" ON public.badge_definitions
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "badge_definitions admin manage" ON public.badge_definitions;
CREATE POLICY "badge_definitions admin manage" ON public.badge_definitions
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- badge_awards: 본인 읽기 + staff 읽기 / admin 관리(수동 수여·회수).
--               auto 수여는 SECURITY DEFINER(fn_evaluate_badges) 경유라 정책 불필요
DROP POLICY IF EXISTS "badge_awards own read" ON public.badge_awards;
CREATE POLICY "badge_awards own read" ON public.badge_awards
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.members m
                   WHERE m.id = badge_awards.member_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "badge_awards staff read" ON public.badge_awards;
CREATE POLICY "badge_awards staff read" ON public.badge_awards
    FOR SELECT TO authenticated USING (public.is_admin_or_coach());
DROP POLICY IF EXISTS "badge_awards admin manage" ON public.badge_awards;
CREATE POLICY "badge_awards admin manage" ON public.badge_awards
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- 07_performance_badges.sql 끝 — 다음: 08_rbac_supplementary.sql
-- ============================================================================
