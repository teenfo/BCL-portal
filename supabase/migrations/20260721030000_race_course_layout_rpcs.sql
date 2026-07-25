-- ============================================================================
-- 20260721030000_race_course_layout_rpcs.sql
-- 목적 : course_layout RPC 갭 해소 (감사 후속 — docs/15 §5b).
--   1) fn_prepare_race_session — 재개(resume) 경로에서 명시 전달된 p_options.course_layout
--      이 무통보 폐기되던 문제 수정: 기존 이벤트와 다르면 UPDATE 반영 [course_layout-resume].
--      (표시 전용 컬럼 — 위치 계산·집계·순위·상태머신 무영향.
--       컬럼 COMMENT '생성 후 변경 허용(표시만 전환)' 계약과 정합)
--   2) fn_create_coach_race_event — 세션 비연동 단독 생성 경로(3번째 생성 경로)에
--      p_payload.course_layout 수용: 'vertical'/'horizontal' 검증(위반 시
--      error 'invalid_course_layout'), 미지정 시 'vertical'. envelope data에 course_layout 포함.
-- 규약 : 두 함수 모두 시그니처 불변(하위호환) — CREATE OR REPLACE는 기존 GRANT/ACL 유지.
--        베이스 전문: fn_prepare_race_session = 20260719050000_race_course_layout.sql,
--                     fn_create_coach_race_event = 20260708080000_phase3_backend_rpcs.sql.
-- ============================================================================

-- 1) fn_prepare_race_session — 재개 경로 course_layout 반영 (전체 재정의)
--    변경점 1곳 주석 [course_layout-resume] 표기. 그 외 20260719050000 전문과 동일.
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

    -- [course_layout-resume] 재개 경로(ELSE 재개 + unique_violation 폴백 공통):
    -- 명시 전달된 코스가 기존 이벤트와 다르면 반영 — 코치의 재시작 모달 선택이
    -- 무통보 폐기되지 않게 한다. 표시 전용 컬럼이라 집계/순위/상태머신 무영향
    -- (컬럼 COMMENT '생성 후 변경 허용'과 정합). 반환 envelope에도 갱신값 노출.
    IF NOT v_created AND v_event.id IS NOT NULL
       AND v_course IS NOT NULL AND v_event.course_layout IS DISTINCT FROM v_course THEN
        UPDATE public.race_events
        SET course_layout = v_course, updated_at = now()
        WHERE id = v_event.id;
        v_event.course_layout := v_course;
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

-- 2) fn_create_coach_race_event — p_payload.course_layout 수용 (전체 재정의)
--    변경점 3곳 주석 [course_layout-create] 표기. 그 외 20260708080000 전문과 동일.
CREATE OR REPLACE FUNCTION public.fn_create_coach_race_event(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_facility_id UUID;
    v_name TEXT;
    v_format TEXT;
    v_course TEXT; -- [course_layout-create]
    v_row public.race_events;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    SELECT id, facility_id INTO v_coach_id, v_facility_id
    FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    v_facility_id := COALESCE(NULLIF(p_payload->>'facility_id','')::UUID, v_facility_id);
    IF v_facility_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'facility_required');
    END IF;

    v_name := NULLIF(trim(p_payload->>'name'), '');
    IF v_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'name_required');
    END IF;
    v_format := COALESCE(NULLIF(p_payload->>'race_format',''), 'individual');
    IF v_format NOT IN ('individual','team','group','relay') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_race_format');
    END IF;

    -- [course_layout-create] 검증 — fn_prepare_race_session과 동일 규칙 (미지정 시 'vertical')
    v_course := NULLIF(p_payload->>'course_layout', '');
    IF v_course IS NOT NULL AND v_course NOT IN ('vertical','horizontal') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_course_layout');
    END IF;

    INSERT INTO public.race_events (
        facility_id, session_id, coach_id, name, event_date, event_type, race_format,
        target_distance_m, duration_minutes, group_target_m, status, lobby_status,
        course_layout)
    VALUES (
        v_facility_id, NULL, v_coach_id, v_name,
        COALESCE(NULLIF(p_payload->>'event_date','')::DATE, CURRENT_DATE),
        COALESCE(NULLIF(p_payload->>'event_type',''), 'rowing'), v_format,
        NULLIF(p_payload->>'target_distance_m','')::INT,
        NULLIF(p_payload->>'duration_minutes','')::INT,
        NULLIF(p_payload->>'group_target_m','')::INT,
        'scheduled', 'setup',
        COALESCE(v_course, 'vertical')) -- [course_layout-create]
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', v_row.id, 'name', v_row.name,
                                   'status', v_row.status, 'lobby_status', v_row.lobby_status,
                                   'race_format', v_row.race_format,
                                   'course_layout', v_row.course_layout), -- [course_layout-create]
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_create_coach_race_event(jsonb) IS
'세션 비연동 단독 Race 이벤트 생성(코치/admin). p_payload.course_layout(vertical/horizontal, 미지정 시 vertical) 수용.';
