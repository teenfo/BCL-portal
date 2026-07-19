-- ============================================================
-- Migration: p2_performance_followup
-- Purpose: 코치앱 P2 퍼포먼스 / 후속 액션 / Race 재통합 (Priority 25 Phase 1)
--   - benchmark_definitions / member_benchmark_results / coach_followups 신규
--   - RPC 7종: 벤치마크 정의/기록/퍼포먼스 프로필, follow-up 생성/완료/조회,
--     세션 기반 Race 이벤트 준비(fn_prepare_race_session)
-- Author: Senior Dev
-- Date: 2026-07-05
-- Related: .docs/archive/planning/coach-app-master-plan-20260425.md §11
-- ============================================================

-- ============================================================
-- SECTION A. 테이블
-- ============================================================

-- A.1 benchmark_definitions — 벤치마크 종목 정의
CREATE TABLE IF NOT EXISTS public.benchmark_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    metric_type VARCHAR(20) NOT NULL
        CHECK (metric_type IN ('time','reps','weight','distance','calories')),
    unit VARCHAR(20) NOT NULL DEFAULT '',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_benchmark_definitions_active
    ON public.benchmark_definitions(is_active) WHERE is_active = true;

COMMENT ON TABLE public.benchmark_definitions IS 'P2: 벤치마크 종목 정의. facility_id NULL이면 전 지점 공용. metric_type=time은 낮을수록, 나머지는 높을수록 좋은 기록.';

-- A.2 member_benchmark_results — 회원 벤치마크 결과 (일반 수업 + Race 연동)
CREATE TABLE IF NOT EXISTS public.member_benchmark_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    benchmark_id UUID NOT NULL REFERENCES public.benchmark_definitions(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    race_event_id UUID REFERENCES public.race_events(id) ON DELETE SET NULL,
    result_value NUMERIC(12,2) NOT NULL,
    result_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_pr BOOLEAN NOT NULL DEFAULT false,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_benchmark_results_member
    ON public.member_benchmark_results(member_id, benchmark_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_benchmark_results_session
    ON public.member_benchmark_results(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_member_benchmark_results_race_event
    ON public.member_benchmark_results(race_event_id) WHERE race_event_id IS NOT NULL;

COMMENT ON TABLE public.member_benchmark_results IS 'P2: 회원 벤치마크 결과. result_value는 metric_type=time이면 초 단위. is_pr은 기록 시점 판정.';

-- A.3 coach_followups — 수업 후 후속 조치
CREATE TABLE IF NOT EXISTS public.coach_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    followup_type VARCHAR(30) NOT NULL
        CHECK (followup_type IN ('injury','trial_conversion','renewal','absence','motivation')),
    priority VARCHAR(10) NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low','normal','high')),
    status VARCHAR(15) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','completed','dismissed')),
    due_date DATE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_coach_followups_coach_open
    ON public.coach_followups(coach_id, status, due_date) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_coach_followups_member
    ON public.coach_followups(member_id, created_at DESC);

COMMENT ON TABLE public.coach_followups IS 'P2: 코치 후속 조치 태스크 (injury/trial_conversion/renewal/absence/motivation).';

-- ============================================================
-- SECTION B. RLS 정책
-- ============================================================

-- B.1 benchmark_definitions — 인증 사용자 읽기 / admin·coach 작성·수정 / admin 삭제
ALTER TABLE public.benchmark_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "benchmark_definitions read all" ON public.benchmark_definitions;
CREATE POLICY "benchmark_definitions read all" ON public.benchmark_definitions
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "benchmark_definitions coach admin insert" ON public.benchmark_definitions;
CREATE POLICY "benchmark_definitions coach admin insert" ON public.benchmark_definitions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_coach());
DROP POLICY IF EXISTS "benchmark_definitions coach admin update" ON public.benchmark_definitions;
CREATE POLICY "benchmark_definitions coach admin update" ON public.benchmark_definitions
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_coach())
    WITH CHECK (public.is_admin_or_coach());
DROP POLICY IF EXISTS "benchmark_definitions admin delete" ON public.benchmark_definitions;
CREATE POLICY "benchmark_definitions admin delete" ON public.benchmark_definitions
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- B.2 member_benchmark_results — 본인 읽기 + admin·coach 읽기/관리
ALTER TABLE public.member_benchmark_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "member_benchmark_results own read" ON public.member_benchmark_results;
CREATE POLICY "member_benchmark_results own read" ON public.member_benchmark_results
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = member_benchmark_results.member_id AND m.user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "member_benchmark_results coach admin select" ON public.member_benchmark_results;
CREATE POLICY "member_benchmark_results coach admin select" ON public.member_benchmark_results
    FOR SELECT TO authenticated USING (public.is_admin_or_coach());
DROP POLICY IF EXISTS "member_benchmark_results coach admin manage" ON public.member_benchmark_results;
CREATE POLICY "member_benchmark_results coach admin manage" ON public.member_benchmark_results
    FOR ALL TO authenticated
    USING (public.is_admin_or_coach())
    WITH CHECK (public.is_admin_or_coach());

-- B.3 coach_followups — admin 전체 / coach 본인 것만 (회원에게 비노출)
ALTER TABLE public.coach_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_followups admin manage" ON public.coach_followups;
CREATE POLICY "coach_followups admin manage" ON public.coach_followups
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "coach_followups own coach manage" ON public.coach_followups;
CREATE POLICY "coach_followups own coach manage" ON public.coach_followups
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches c
            WHERE c.id = coach_followups.coach_id AND c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.coaches c
            WHERE c.id = coach_followups.coach_id AND c.user_id = auth.uid()
        )
    );

-- ============================================================
-- SECTION C. 시드 — 기본 벤치마크 정의
-- ============================================================
INSERT INTO public.benchmark_definitions (name, metric_type, unit, description) VALUES
    ('500m Row',        'time',   'sec', 'Concept2 로잉 500m 최고 기록'),
    ('1000m Row',       'time',   'sec', 'Concept2 로잉 1000m 최고 기록'),
    ('2000m Row',       'time',   'sec', 'Concept2 로잉 2000m 최고 기록'),
    ('Max Back Squat',  'weight', 'kg',  '백 스쿼트 1RM'),
    ('Max Deadlift',    'weight', 'kg',  '데드리프트 1RM'),
    ('Max Pull-ups',    'reps',   'reps','풀업 최대 연속 반복 수')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SECTION D. RPC
--   공통 응답 규격: {success, data, error} (P0/P1-A와 동일)
-- ============================================================

-- D.1 fn_list_benchmark_definitions — 벤치마크 정의 목록
CREATE OR REPLACE FUNCTION public.fn_list_benchmark_definitions(
    p_include_inactive BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'no_session');
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_data
    FROM (
        SELECT bd.id, bd.facility_id, bd.name, bd.metric_type, bd.unit,
               bd.description, bd.is_active, bd.created_at
        FROM public.benchmark_definitions bd
        WHERE (p_include_inactive OR bd.is_active)
        ORDER BY bd.name
    ) t;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_list_benchmark_definitions(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_list_benchmark_definitions(BOOLEAN) TO authenticated;
COMMENT ON FUNCTION public.fn_list_benchmark_definitions(BOOLEAN) IS 'P2: 벤치마크 정의 목록 조회';

-- D.2 fn_record_member_benchmark_result — 결과 기록 + PR 판정
CREATE OR REPLACE FUNCTION public.fn_record_member_benchmark_result(
    p_member_id UUID,
    p_benchmark_id UUID,
    p_result_value NUMERIC,
    p_session_id UUID DEFAULT NULL,
    p_race_event_id UUID DEFAULT NULL,
    p_result_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_metric_type TEXT;
    v_best NUMERIC;
    v_is_pr BOOLEAN := false;
    v_row public.member_benchmark_results;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    SELECT metric_type INTO v_metric_type
    FROM public.benchmark_definitions
    WHERE id = p_benchmark_id AND is_active;

    IF v_metric_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'benchmark_not_found');
    END IF;

    IF p_result_value IS NULL OR p_result_value <= 0 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_result_value');
    END IF;

    -- PR 판정: time은 낮을수록, 나머지는 높을수록 좋은 기록
    IF v_metric_type = 'time' THEN
        SELECT MIN(result_value) INTO v_best
        FROM public.member_benchmark_results
        WHERE member_id = p_member_id AND benchmark_id = p_benchmark_id;
        v_is_pr := (v_best IS NULL OR p_result_value < v_best);
    ELSE
        SELECT MAX(result_value) INTO v_best
        FROM public.member_benchmark_results
        WHERE member_id = p_member_id AND benchmark_id = p_benchmark_id;
        v_is_pr := (v_best IS NULL OR p_result_value > v_best);
    END IF;

    INSERT INTO public.member_benchmark_results
        (member_id, benchmark_id, session_id, race_event_id, result_value, result_meta, is_pr, recorded_by)
    VALUES
        (p_member_id, p_benchmark_id, p_session_id, p_race_event_id, p_result_value,
         COALESCE(p_result_meta, '{}'::jsonb), v_is_pr, auth.uid())
    RETURNING * INTO v_row;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_row.id,
            'member_id', v_row.member_id,
            'benchmark_id', v_row.benchmark_id,
            'result_value', v_row.result_value,
            'is_pr', v_row.is_pr,
            'previous_best', v_best,
            'recorded_at', v_row.recorded_at
        ),
        'error', NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_record_member_benchmark_result(UUID, UUID, NUMERIC, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_record_member_benchmark_result(UUID, UUID, NUMERIC, UUID, UUID, JSONB) TO authenticated;
COMMENT ON FUNCTION public.fn_record_member_benchmark_result(UUID, UUID, NUMERIC, UUID, UUID, JSONB) IS 'P2: 회원 벤치마크 결과 기록 + PR 판정 (coach/admin)';

-- D.3 fn_get_member_performance_profile — 회원 퍼포먼스 프로필 (벤치마크 + Race 통합)
CREATE OR REPLACE FUNCTION public.fn_get_member_performance_profile(
    p_member_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_self BOOLEAN;
    v_bests JSONB;
    v_recent JSONB;
    v_race JSONB;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.members m
        WHERE m.id = p_member_id AND m.user_id = auth.uid()
    ) INTO v_is_self;

    IF NOT (v_is_self OR public.is_admin_or_coach()) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    -- 벤치마크별 베스트 (time=MIN, 그 외=MAX)
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_bests
    FROM (
        SELECT bd.id AS benchmark_id, bd.name, bd.metric_type, bd.unit,
               CASE WHEN bd.metric_type = 'time'
                    THEN MIN(r.result_value) ELSE MAX(r.result_value) END AS best_value,
               COUNT(r.id) AS attempt_count,
               MAX(r.recorded_at) AS last_recorded_at
        FROM public.member_benchmark_results r
        JOIN public.benchmark_definitions bd ON bd.id = r.benchmark_id
        WHERE r.member_id = p_member_id
        GROUP BY bd.id, bd.name, bd.metric_type, bd.unit
        ORDER BY MAX(r.recorded_at) DESC
    ) t;

    -- 최근 벤치마크 기록 10건
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_recent
    FROM (
        SELECT r.id, r.benchmark_id, bd.name, bd.metric_type, bd.unit,
               r.result_value, r.is_pr, r.session_id, r.race_event_id, r.recorded_at
        FROM public.member_benchmark_results r
        JOIN public.benchmark_definitions bd ON bd.id = r.benchmark_id
        WHERE r.member_id = p_member_id
        ORDER BY r.recorded_at DESC
        LIMIT 10
    ) t;

    -- Race 기록 요약 (최근 10건 + PR 수)
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_race
    FROM (
        SELECT rr.id, rr.event_id, re.name AS event_name, re.event_date,
               EXTRACT(EPOCH FROM rr.result_time)::NUMERIC AS result_time_sec,
               rr.result_distance, rr.avg_watts, rr.max_watts,
               rr.finish_rank, rr.is_pr
        FROM public.race_records rr
        JOIN public.race_events re ON re.id = rr.event_id
        WHERE rr.member_id = p_member_id
        ORDER BY re.event_date DESC, rr.created_at DESC
        LIMIT 10
    ) t;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'member_id', p_member_id,
            'benchmark_bests', v_bests,
            'recent_results', v_recent,
            'race_records', v_race,
            'benchmark_pr_count', (
                SELECT COUNT(*) FROM public.member_benchmark_results
                WHERE member_id = p_member_id AND is_pr
            ),
            'race_pr_count', (
                SELECT COUNT(*) FROM public.race_records
                WHERE member_id = p_member_id AND is_pr
            )
        ),
        'error', NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_member_performance_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_member_performance_profile(UUID) TO authenticated;
COMMENT ON FUNCTION public.fn_get_member_performance_profile(UUID) IS 'P2: 회원 퍼포먼스 프로필 (벤치마크 베스트 + 최근 기록 + Race 이력)';

-- D.4 fn_create_followup — 후속 조치 생성 (코치 컨텍스트)
CREATE OR REPLACE FUNCTION public.fn_create_followup(
    p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_member_id UUID;
    v_type TEXT;
    v_row public.coach_followups;
BEGIN
    SELECT id INTO v_coach_id
    FROM public.coaches
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_found');
    END IF;

    v_member_id := (p_payload->>'member_id')::UUID;
    v_type := p_payload->>'followup_type';

    IF v_member_id IS NULL OR v_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'missing_required_fields');
    END IF;

    IF v_type NOT IN ('injury','trial_conversion','renewal','absence','motivation') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_followup_type');
    END IF;

    INSERT INTO public.coach_followups
        (member_id, session_id, coach_id, followup_type, priority, due_date, note)
    VALUES (
        v_member_id,
        NULLIF(p_payload->>'session_id', '')::UUID,
        v_coach_id,
        v_type,
        COALESCE(NULLIF(p_payload->>'priority', ''), 'normal'),
        NULLIF(p_payload->>'due_date', '')::DATE,
        NULLIF(p_payload->>'note', '')
    )
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_row)::jsonb, 'error', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_followup(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_followup(JSONB) TO authenticated;
COMMENT ON FUNCTION public.fn_create_followup(JSONB) IS 'P2: 후속 조치 생성 (payload: member_id, followup_type, session_id?, priority?, due_date?, note?)';

-- D.5 fn_complete_followup — 완료/해제 처리
CREATE OR REPLACE FUNCTION public.fn_complete_followup(
    p_followup_id UUID,
    p_status TEXT DEFAULT 'completed'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.coach_followups;
BEGIN
    IF p_status NOT IN ('completed','dismissed','open') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_status');
    END IF;

    UPDATE public.coach_followups cf
    SET status = p_status,
        completed_at = CASE WHEN p_status = 'open' THEN NULL ELSE now() END,
        updated_at = now()
    WHERE cf.id = p_followup_id
      AND (
          public.is_admin()
          OR EXISTS (
              SELECT 1 FROM public.coaches c
              WHERE c.id = cf.coach_id AND c.user_id = auth.uid()
          )
      )
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_found_or_forbidden');
    END IF;

    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_row)::jsonb, 'error', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_complete_followup(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_complete_followup(UUID, TEXT) TO authenticated;
COMMENT ON FUNCTION public.fn_complete_followup(UUID, TEXT) IS 'P2: 후속 조치 상태 전환 (completed/dismissed/open 재오픈)';

-- D.6 fn_get_my_followups — 내 후속 조치 목록
CREATE OR REPLACE FUNCTION public.fn_get_my_followups(
    p_status TEXT DEFAULT 'open',
    p_member_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_data JSONB;
BEGIN
    SELECT id INTO v_coach_id
    FROM public.coaches
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_found');
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_data
    FROM (
        SELECT cf.id, cf.member_id, m.name AS member_name,
               cf.session_id, cf.followup_type, cf.priority, cf.status,
               cf.due_date, cf.note, cf.created_at, cf.completed_at,
               (cf.due_date IS NOT NULL AND cf.due_date < CURRENT_DATE AND cf.status = 'open') AS is_overdue
        FROM public.coach_followups cf
        JOIN public.members m ON m.id = cf.member_id
        WHERE cf.coach_id = v_coach_id
          AND (p_status IS NULL OR p_status = 'all' OR cf.status = p_status)
          AND (p_member_id IS NULL OR cf.member_id = p_member_id)
        ORDER BY
            CASE cf.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
            cf.due_date ASC NULLS LAST,
            cf.created_at DESC
        LIMIT p_limit
    ) t;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_my_followups(TEXT, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_my_followups(TEXT, UUID, INTEGER) TO authenticated;
COMMENT ON FUNCTION public.fn_get_my_followups(TEXT, UUID, INTEGER) IS 'P2: 내(코치) 후속 조치 목록 — priority > due_date 순, is_overdue 포함';

-- D.7 fn_prepare_race_session — 세션 기반 Race 이벤트 준비 (생성 또는 재개)
CREATE OR REPLACE FUNCTION public.fn_prepare_race_session(
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_session RECORD;
    v_event RECORD;
    v_created BOOLEAN := false;
BEGIN
    SELECT id INTO v_coach_id
    FROM public.coaches
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF v_coach_id IS NULL AND NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_found');
    END IF;

    SELECT s.id, s.session_date, s.start_time, s.title, s.facility_id
        INTO v_session
    FROM public.sessions s
    WHERE s.id = p_session_id;

    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_found');
    END IF;

    -- 코치는 배정된 세션만 (admin은 전체 허용)
    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.session_coaches sc
        WHERE sc.session_id = p_session_id AND sc.coach_id = v_coach_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_assigned');
    END IF;

    -- 기존 미종료 이벤트 재개
    SELECT re.* INTO v_event
    FROM public.race_events re
    WHERE re.session_id = p_session_id
      AND re.status NOT IN ('completed', 'cancelled')
    ORDER BY re.created_at DESC
    LIMIT 1;

    -- 없으면 신규 생성
    IF v_event.id IS NULL THEN
        INSERT INTO public.race_events
            (facility_id, name, event_date, event_type, status,
             race_format, session_id, coach_id, lobby_status)
        VALUES (
            v_session.facility_id,
            COALESCE(v_session.title, 'Class Race') || ' — ' || TO_CHAR(v_session.session_date, 'MM/DD'),
            v_session.session_date,
            'rowing',
            'scheduled',
            'individual',
            p_session_id,
            v_coach_id,
            'setup'
        )
        RETURNING * INTO v_event;
        v_created := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'created', v_created,
            'event_id', v_event.id,
            'event_name', v_event.name,
            'session_id', p_session_id,
            'lobby_status', v_event.lobby_status,
            'status', v_event.status,
            'race_format', v_event.race_format
        ),
        'error', NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_prepare_race_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_prepare_race_session(UUID) TO authenticated;
COMMENT ON FUNCTION public.fn_prepare_race_session(UUID) IS 'P2: 세션 운영 보드 → Race 진입. 세션 연동 race_event 재개 또는 신규 생성.';
