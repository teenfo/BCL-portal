-- ============================================================
-- Migration: p25_hardening
-- Purpose: P25 코드 리뷰 결과 반영 — Race 코치 쓰기 경로 개방 + RPC 방어 강화
--   (H1) race_events/race_records 쓰기가 admin 전용이라 코치 허브의
--        이벤트 생성/수동 기록/종료 처리가 RLS로 차단되던 문제 해결
--   (M3) fn_record_member_benchmark_result 세션 배정 검증 추가
--   (M4) PR 판정 동시성 — advisory lock
--   (M5) fn_prepare_race_session 세션당 활성 이벤트 중복 생성 방지
--        (advisory lock + 부분 유니크 인덱스)
--   (L2) fn_create_followup 입력 사전 검증 (raw 예외 → 규격 에러)
--   (L7) member_benchmark_results DELETE admin 전용 분리 (P0 하드닝 패턴 정렬)
-- Date: 2026-07-05
-- ============================================================

-- ============================================================
-- 1. (H1) race_events / race_records — coach 쓰기 정책
--    INSERT/UPDATE는 admin+coach, DELETE는 admin 전용 (P0 하드닝 패턴)
-- ============================================================
DROP POLICY IF EXISTS "race_events coach insert" ON public.race_events;
CREATE POLICY "race_events coach insert" ON public.race_events
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_coach());

DROP POLICY IF EXISTS "race_events coach update" ON public.race_events;
CREATE POLICY "race_events coach update" ON public.race_events
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_coach())
    WITH CHECK (public.is_admin_or_coach());

DROP POLICY IF EXISTS "race_records coach insert" ON public.race_records;
CREATE POLICY "race_records coach insert" ON public.race_records
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_coach());

DROP POLICY IF EXISTS "race_records coach update" ON public.race_records;
CREATE POLICY "race_records coach update" ON public.race_records
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_coach())
    WITH CHECK (public.is_admin_or_coach());

-- ============================================================
-- 2. (L7) member_benchmark_results — FOR ALL manage 제거,
--    INSERT/UPDATE coach + DELETE admin 전용으로 분리
-- ============================================================
DROP POLICY IF EXISTS "member_benchmark_results coach admin manage" ON public.member_benchmark_results;

DROP POLICY IF EXISTS "member_benchmark_results coach admin insert" ON public.member_benchmark_results;
CREATE POLICY "member_benchmark_results coach admin insert" ON public.member_benchmark_results
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_coach());

DROP POLICY IF EXISTS "member_benchmark_results coach admin update" ON public.member_benchmark_results;
CREATE POLICY "member_benchmark_results coach admin update" ON public.member_benchmark_results
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_coach())
    WITH CHECK (public.is_admin_or_coach());

DROP POLICY IF EXISTS "member_benchmark_results admin delete" ON public.member_benchmark_results;
CREATE POLICY "member_benchmark_results admin delete" ON public.member_benchmark_results
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- ============================================================
-- 3. (M5) 세션당 활성 race_event 1개 보장 — 부분 유니크 인덱스
--    (원격 데이터 중복 없음 사전 확인 완료)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_race_events_active_session
    ON public.race_events(session_id)
    WHERE session_id IS NOT NULL AND status NOT IN ('completed', 'cancelled');

-- ============================================================
-- 4. (M3+M4) fn_record_member_benchmark_result 재정의
--    - advisory lock으로 PR 판정 동시성 보장
--    - p_session_id 지정 시 배정 코치 검증 (admin 제외)
--    - p_race_event_id 존재 검증
-- ============================================================
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

    -- 세션 연결 시: admin이 아니면 해당 세션 배정 코치만 기록 가능
    IF p_session_id IS NOT NULL AND NOT public.is_admin() THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.session_coaches sc
            JOIN public.coaches c ON c.id = sc.coach_id
            WHERE sc.session_id = p_session_id AND c.user_id = auth.uid()
        ) THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_assigned_to_session');
        END IF;
    END IF;

    -- Race 이벤트 연결 시: 존재 검증
    IF p_race_event_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.race_events WHERE id = p_race_event_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'race_event_not_found');
    END IF;

    -- PR 판정 동시성 보장: (member, benchmark) 단위 트랜잭션 락
    PERFORM pg_advisory_xact_lock(hashtext(p_member_id::text || ':' || p_benchmark_id::text));

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

-- ============================================================
-- 5. (M5) fn_prepare_race_session 재정의 — advisory lock + 중복 생성 방어
-- ============================================================
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

    -- 동시 호출 직렬화 (세션 단위)
    PERFORM pg_advisory_xact_lock(hashtext('race_session:' || p_session_id::text));

    -- 기존 미종료 이벤트 재개
    SELECT re.* INTO v_event
    FROM public.race_events re
    WHERE re.session_id = p_session_id
      AND re.status NOT IN ('completed', 'cancelled')
    ORDER BY re.created_at DESC
    LIMIT 1;

    -- 없으면 신규 생성 (uq_race_events_active_session이 최종 방어선)
    IF v_event.id IS NULL THEN
        BEGIN
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
        EXCEPTION WHEN unique_violation THEN
            SELECT re.* INTO v_event
            FROM public.race_events re
            WHERE re.session_id = p_session_id
              AND re.status NOT IN ('completed', 'cancelled')
            ORDER BY re.created_at DESC
            LIMIT 1;
        END;
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

-- ============================================================
-- 6. (L2) fn_create_followup 재정의 — 입력 사전 검증
-- ============================================================
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
    v_priority TEXT;
    v_due_date DATE;
    v_row public.coach_followups;
BEGIN
    SELECT id INTO v_coach_id
    FROM public.coaches
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_found');
    END IF;

    BEGIN
        v_member_id := (p_payload->>'member_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_member_id');
    END;
    v_type := p_payload->>'followup_type';

    IF v_member_id IS NULL OR v_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'missing_required_fields');
    END IF;

    IF v_type NOT IN ('injury','trial_conversion','renewal','absence','motivation') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_followup_type');
    END IF;

    v_priority := COALESCE(NULLIF(p_payload->>'priority', ''), 'normal');
    IF v_priority NOT IN ('low','normal','high') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_priority');
    END IF;

    BEGIN
        v_due_date := NULLIF(p_payload->>'due_date', '')::DATE;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_due_date');
    END;

    INSERT INTO public.coach_followups
        (member_id, session_id, coach_id, followup_type, priority, due_date, note)
    VALUES (
        v_member_id,
        NULLIF(p_payload->>'session_id', '')::UUID,
        v_coach_id,
        v_type,
        v_priority,
        v_due_date,
        NULLIF(p_payload->>'note', '')
    )
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_row)::jsonb, 'error', NULL);
END;
$$;
