-- ============================================================================
-- 20260719050000_race_course_layout.sql
-- 목적 : 레이스 코스 레이아웃(세로/가로) — 이벤트 생성 시 결정(docs/15 §5b).
--        Class TV(RaceView)가 표시 모드 결정 소스로 사용: URL ?course= 오버라이드(데모/QA)
--        > race_events.course_layout > 'vertical' 폴백.
--        두 레이아웃은 기능 동등(표시 지오메트리만 상이) — 집계/순위/상태머신 미영향.
-- 규약 : IF NOT EXISTS 멱등. 신규 RPC 없음(anon SELECT 기존 정책으로 노출).
-- ============================================================================

ALTER TABLE public.race_events
    ADD COLUMN IF NOT EXISTS course_layout VARCHAR(10) NOT NULL DEFAULT 'vertical';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'race_events_course_layout_check'
    ) THEN
        ALTER TABLE public.race_events
            ADD CONSTRAINT race_events_course_layout_check
            CHECK (course_layout IN ('vertical', 'horizontal'));
    END IF;
END $$;

COMMENT ON COLUMN public.race_events.course_layout IS
    '코스 레이아웃(15 §5b) — vertical(측면 세로 코스)/horizontal(사선 탑뷰 가로 코스). 표시 전용: 위치 계산·집계·상태머신은 두 모드 동일. 생성 후 변경 허용(표시만 전환).';

-- 2) fn_prepare_race_session — p_options.course_layout 수용 (시그니처 불변, 전체 재정의)
--    베이스: 20260708009000_rpc.sql K.1. 변경점 3곳 주석 [course_layout] 표기.
--    히트 전환 시 이전 히트의 course_layout 승계, 미지정 시 'vertical'.
CREATE OR REPLACE FUNCTION public.fn_prepare_race_session(
    p_session_id UUID,
    p_race_format TEXT DEFAULT 'individual',
    p_options JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_session RECORD;
    v_event RECORD;
    v_prev RECORD;
    v_created BOOLEAN := false;
    v_heat_no INT := 1;
    v_parent_id UUID;
    v_carryover NUMERIC := 0;
    v_next_heat_of UUID;
    v_course TEXT; -- [course_layout]
BEGIN
    IF p_race_format NOT IN ('individual','team','group','relay') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_race_format');
    END IF;

    -- [course_layout] 옵션 검증 (미지정=NULL → 아래 COALESCE 폴백)
    v_course := NULLIF(p_options->>'course_layout', '');
    IF v_course IS NOT NULL AND v_course NOT IN ('vertical','horizontal') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_course_layout');
    END IF;

    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    IF v_coach_id IS NULL AND NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_found');
    END IF;

    SELECT s.id, s.session_date, s.title, s.facility_id INTO v_session
    FROM public.sessions s WHERE s.id = p_session_id;
    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_found');
    END IF;

    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.session_coaches sc
        WHERE sc.session_id = p_session_id AND sc.coach_id = v_coach_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_assigned');
    END IF;

    -- 동시 호출 직렬화 (세션 단위)
    PERFORM pg_advisory_xact_lock(hashtext('race_session:' || p_session_id::text));

    v_next_heat_of := NULLIF(p_options->>'next_heat_of','')::UUID;

    -- 히트 전환(B안): 이전 이벤트가 종료(finished/completed)됐는지 검증 후 신규 생성
    IF v_next_heat_of IS NOT NULL THEN
        SELECT * INTO v_prev FROM public.race_events WHERE id = v_next_heat_of;
        IF v_prev.id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'previous_heat_not_found');
        END IF;
        IF v_prev.status NOT IN ('completed') AND v_prev.lobby_status <> 'finished' THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'previous_heat_not_finished');
        END IF;
        v_heat_no   := v_prev.heat_no + 1;
        v_parent_id := COALESCE(v_prev.parent_event_id, v_prev.id);
        -- 공동목표(A+B 결합) 이월 누계 = 이전 이월 + 이전 히트 기록 합계
        IF COALESCE((p_options->>'group_target_m')::INT, v_prev.group_target_m) IS NOT NULL THEN
            SELECT COALESCE(v_prev.carryover_m, 0) + COALESCE(SUM(rr.result_distance), 0)
            INTO v_carryover
            FROM public.race_records rr WHERE rr.event_id = v_prev.id;
        END IF;
    ELSE
        -- 기존 미종료 이벤트 재개 (created=false)
        SELECT re.* INTO v_event
        FROM public.race_events re
        WHERE re.session_id = p_session_id
          AND re.status NOT IN ('completed','cancelled')
        ORDER BY re.created_at DESC
        LIMIT 1;
    END IF;

    -- 신규 생성 (재개 대상 없거나 히트 전환)
    IF v_event.id IS NULL THEN
        BEGIN
            INSERT INTO public.race_events
                (facility_id, name, event_date, event_type, status, race_format,
                 session_id, coach_id, lobby_status,
                 target_distance_m, duration_minutes, group_target_m,
                 heat_no, parent_event_id, carryover_m, course_layout)
            VALUES (
                v_session.facility_id,
                COALESCE(v_session.title, 'Class Race') || ' — ' || TO_CHAR(v_session.session_date, 'MM/DD')
                    || CASE WHEN v_heat_no > 1 THEN ' (Heat ' || v_heat_no || ')' ELSE '' END,
                v_session.session_date,
                'rowing', 'scheduled', p_race_format,
                p_session_id, v_coach_id, 'setup',
                (p_options->>'target_distance_m')::INT,
                (p_options->>'duration_minutes')::INT,
                COALESCE((p_options->>'group_target_m')::INT,
                         CASE WHEN v_next_heat_of IS NOT NULL THEN v_prev.group_target_m END),
                v_heat_no, v_parent_id, v_carryover,
                -- [course_layout] 명시 옵션 > 이전 히트 승계 > 기본 vertical
                COALESCE(v_course,
                         CASE WHEN v_next_heat_of IS NOT NULL THEN v_prev.course_layout END,
                         'vertical'))
            RETURNING * INTO v_event;
            v_created := true;
        EXCEPTION WHEN unique_violation THEN
            -- 부분 유니크 방어선: 경합 시 활성 이벤트 재조회
            SELECT re.* INTO v_event
            FROM public.race_events re
            WHERE re.session_id = p_session_id
              AND re.status NOT IN ('completed','cancelled')
            ORDER BY re.created_at DESC
            LIMIT 1;
        END;
    END IF;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'created', v_created,
            'event_id', v_event.id, 'event_name', v_event.name,
            'session_id', p_session_id,
            'status', v_event.status, 'lobby_status', v_event.lobby_status,
            'race_format', v_event.race_format,
            'target_distance_m', v_event.target_distance_m,
            'duration_minutes', v_event.duration_minutes,
            'group_target_m', v_event.group_target_m,
            'heat_no', v_event.heat_no,
            'parent_event_id', v_event.parent_event_id,
            'carryover_m', v_event.carryover_m,
            'course_layout', v_event.course_layout), -- [course_layout]
        'error', NULL);
END;
$$;
