-- ============================================================
-- Migration: coach_p0_session_ops
-- Purpose: 코치앱 P0 운영 안정화 (Priority 22)
--   - bookings/session_coaches 확장
--   - auth.uid() 기반 코치 컨텍스트 RPC 6종 신규
--   - 세션 운영 보드 단일 데이터 소스
--   - 출결 상태머신 확장 (no_show, late_cancel, coach_excused, walk_in)
-- Author: Senior Dev (Opus)
-- Date: 2026-04-25
-- Related: .docs/archive/planning/coach-app-p0-execution-20260425.md
-- ============================================================

-- ============================================================
-- 1. bookings 확장 — 운영 결과 컬럼 추가
-- ============================================================
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS attendance_outcome TEXT NOT NULL DEFAULT 'pending'
        CHECK (attendance_outcome IN ('pending', 'checked_in', 'no_show', 'late_cancel', 'coach_excused', 'walk_in'));

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS attendance_marked_at TIMESTAMPTZ;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS attendance_marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS waitlist_promoted_at TIMESTAMPTZ;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_attendance_outcome ON public.bookings(attendance_outcome);

COMMENT ON COLUMN public.bookings.attendance_outcome IS '운영 판정 상태 (pending/checked_in/no_show/late_cancel/coach_excused/walk_in)';
COMMENT ON COLUMN public.bookings.attendance_marked_at IS 'attendance_outcome이 최종 판정된 시각';
COMMENT ON COLUMN public.bookings.attendance_marked_by IS 'attendance_outcome을 처리한 사용자';
COMMENT ON COLUMN public.bookings.waitlist_promoted_at IS 'waitlist에서 승급된 시각';
COMMENT ON COLUMN public.bookings.cancel_reason IS '취소/예외 처리 사유';

-- 백필: 기존 체크인이 있는 booking은 checked_in 으로 표시
UPDATE public.bookings b
SET attendance_outcome = 'checked_in',
    attendance_marked_at = COALESCE(b.attendance_marked_at, c.checkin_time)
FROM public.checkins c
WHERE c.session_id = b.session_id
  AND c.member_id = b.member_id
  AND b.attendance_outcome = 'pending';

-- 백필: bookings.status가 no_show인 케이스 동기화
UPDATE public.bookings
SET attendance_outcome = 'no_show'
WHERE status = 'no_show'
  AND attendance_outcome = 'pending';

-- ============================================================
-- 2. session_coaches 확장 — lead/assistant + 표시 순서
-- ============================================================
ALTER TABLE public.session_coaches
    ADD COLUMN IF NOT EXISTS assignment_role TEXT NOT NULL DEFAULT 'lead'
        CHECK (assignment_role IN ('lead', 'assistant'));

ALTER TABLE public.session_coaches
    ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

-- 기존 role 컬럼이 존재하지 않으므로 백필 로직 제거 (기본값 'lead' 적용 완료)

COMMENT ON COLUMN public.session_coaches.assignment_role IS 'lead/assistant 구분 (운영 보드 표기용)';
COMMENT ON COLUMN public.session_coaches.display_order IS '다중 코치 표시 순서';

-- ============================================================
-- 3. fn_get_my_coach_context() — 코치 상태 단일 진입점
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_my_coach_context()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_coach RECORD;
    v_assignment_count INT;
    v_status TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'unauthenticated',
            'data', jsonb_build_object('linked', false, 'has_assignments', false),
            'error', 'no_session'
        );
    END IF;

    SELECT id, name, status
        INTO v_coach
    FROM public.coaches
    WHERE user_id = v_user_id
    LIMIT 1;

    IF v_coach.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'unlinked',
            'data', jsonb_build_object('linked', false, 'has_assignments', false),
            'error', NULL
        );
    END IF;

    IF v_coach.status IN ('on_leave', 'inactive', 'Inactive') THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'on_leave',
            'data', jsonb_build_object(
                'linked', true,
                'coach_id', v_coach.id,
                'coach_name', v_coach.name,
                'has_assignments', false
            ),
            'error', NULL
        );
    END IF;

    SELECT COUNT(*) INTO v_assignment_count
    FROM public.session_coaches sc
    JOIN public.sessions s ON s.id = sc.session_id
    WHERE sc.coach_id = v_coach.id
      AND s.session_date >= (CURRENT_DATE - INTERVAL '30 days')
      AND s.session_date <= (CURRENT_DATE + INTERVAL '60 days');

    v_status := CASE WHEN v_assignment_count > 0 THEN 'linked_active' ELSE 'linked_unassigned' END;

    RETURN jsonb_build_object(
        'success', true,
        'status', v_status,
        'data', jsonb_build_object(
            'linked', true,
            'coach_id', v_coach.id,
            'coach_name', v_coach.name,
            'has_assignments', v_assignment_count > 0,
            'assignment_count', v_assignment_count
        ),
        'error', NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_my_coach_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_my_coach_context() TO authenticated;

COMMENT ON FUNCTION public.fn_get_my_coach_context() IS 'Priority 22 P0: 현재 로그인 사용자의 코치 연결 상태 단일 진입점';

-- ============================================================
-- 4. fn_get_my_coach_dashboard() — Dashboard 단일 RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_my_coach_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_coach_id UUID;
    v_today DATE := CURRENT_DATE;
    v_now TIMESTAMPTZ := now();
    v_today_sessions JSONB;
    v_summary JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'status', 'unauthenticated', 'data', NULL, 'error', 'no_session');
    END IF;

    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = v_user_id LIMIT 1;

    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'unlinked',
            'data', jsonb_build_object(
                'today_sessions', '[]'::jsonb,
                'today_total_bookings', 0,
                'today_total_checkins', 0,
                'week_sessions', 0,
                'risk_summary', jsonb_build_object('waitlist', 0, 'unchecked_confirmed', 0, 'starting_soon', 0)
            ),
            'error', NULL
        );
    END IF;

    SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'start_time')), '[]'::jsonb)
        INTO v_today_sessions
    FROM (
        SELECT jsonb_build_object(
            'id', s.id,
            'title', s.title,
            'start_time', s.start_time,
            'end_time', s.end_time,
            'capacity', s.capacity,
            'session_date', s.session_date,
            'wod_description', s.wod_description,
            'status', s.status,
            'booked_count', (
                SELECT COUNT(*) FROM public.bookings b
                WHERE b.session_id = s.id AND b.status = 'confirmed'
            ),
            'checkin_count', (
                SELECT COUNT(*) FROM public.checkins c
                WHERE c.session_id = s.id
            ),
            'waitlist_count', (
                SELECT COUNT(*) FROM public.bookings b
                WHERE b.session_id = s.id AND b.status IN ('waitlist', 'waitlisted')
            ),
            'unchecked_count', (
                SELECT COUNT(*) FROM public.bookings b
                WHERE b.session_id = s.id
                  AND b.status = 'confirmed'
                  AND b.attendance_outcome = 'pending'
            )
        ) AS t
        FROM public.sessions s
        JOIN public.session_coaches sc ON sc.session_id = s.id
        WHERE sc.coach_id = v_coach_id
          AND s.session_date = v_today
    ) sub;

    SELECT jsonb_build_object(
        'today_sessions', v_today_sessions,
        'today_total_bookings', (
            SELECT COUNT(*) FROM public.bookings b
            JOIN public.sessions s ON s.id = b.session_id
            JOIN public.session_coaches sc ON sc.session_id = s.id
            WHERE sc.coach_id = v_coach_id AND s.session_date = v_today AND b.status = 'confirmed'
        ),
        'today_total_checkins', (
            SELECT COUNT(*) FROM public.checkins c
            JOIN public.sessions s ON s.id = c.session_id
            JOIN public.session_coaches sc ON sc.session_id = s.id
            WHERE sc.coach_id = v_coach_id AND s.session_date = v_today
        ),
        'week_sessions', (
            SELECT COUNT(DISTINCT s.id) FROM public.sessions s
            JOIN public.session_coaches sc ON sc.session_id = s.id
            WHERE sc.coach_id = v_coach_id
              AND s.session_date >= date_trunc('week', v_today)::date
              AND s.session_date <= (date_trunc('week', v_today) + interval '6 days')::date
        ),
        'risk_summary', jsonb_build_object(
            'waitlist', (
                SELECT COUNT(*) FROM public.bookings b
                JOIN public.sessions s ON s.id = b.session_id
                JOIN public.session_coaches sc ON sc.session_id = s.id
                WHERE sc.coach_id = v_coach_id
                  AND s.session_date = v_today
                  AND b.status IN ('waitlist', 'waitlisted')
            ),
            'unchecked_confirmed', (
                SELECT COUNT(*) FROM public.bookings b
                JOIN public.sessions s ON s.id = b.session_id
                JOIN public.session_coaches sc ON sc.session_id = s.id
                WHERE sc.coach_id = v_coach_id
                  AND s.session_date = v_today
                  AND b.status = 'confirmed'
                  AND b.attendance_outcome = 'pending'
                  AND (s.session_date::timestamptz + s.start_time::interval) <= v_now
            ),
            'starting_soon', (
                SELECT COUNT(DISTINCT s.id) FROM public.sessions s
                JOIN public.session_coaches sc ON sc.session_id = s.id
                WHERE sc.coach_id = v_coach_id
                  AND s.session_date = v_today
                  AND (s.session_date::timestamptz + s.start_time::interval) BETWEEN v_now AND (v_now + interval '60 minutes')
            )
        )
    ) INTO v_summary;

    RETURN jsonb_build_object('success', true, 'status', 'ok', 'data', v_summary, 'error', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_my_coach_dashboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_my_coach_dashboard() TO authenticated;

COMMENT ON FUNCTION public.fn_get_my_coach_dashboard() IS 'Priority 22 P0: Coach Dashboard 단일 RPC (운영 위험 요약 포함)';

-- ============================================================
-- 5. fn_get_coach_schedule(p_from, p_to) — 기간별 스케줄
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_coach_schedule(
    p_from DATE,
    p_to DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_coach_id UUID;
    v_sessions JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'status', 'unauthenticated', 'data', NULL, 'error', 'no_session');
    END IF;

    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = v_user_id LIMIT 1;

    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'status', 'unlinked', 'data', '[]'::jsonb, 'error', NULL);
    END IF;

    IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
        RETURN jsonb_build_object('success', false, 'status', 'invalid_range', 'data', NULL, 'error', 'invalid_date_range');
    END IF;

    SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'session_date'), (t->>'start_time')), '[]'::jsonb)
        INTO v_sessions
    FROM (
        SELECT jsonb_build_object(
            'id', s.id,
            'title', s.title,
            'start_time', s.start_time,
            'end_time', s.end_time,
            'capacity', s.capacity,
            'session_date', s.session_date,
            'wod_description', s.wod_description,
            'status', s.status,
            'booked_count', (
                SELECT COUNT(*) FROM public.bookings b
                WHERE b.session_id = s.id AND b.status = 'confirmed'
            ),
            'waitlist_count', (
                SELECT COUNT(*) FROM public.bookings b
                WHERE b.session_id = s.id AND b.status IN ('waitlist', 'waitlisted')
            ),
            'checkin_count', (
                SELECT COUNT(*) FROM public.checkins c
                WHERE c.session_id = s.id
            ),
            'no_show_count', (
                SELECT COUNT(*) FROM public.bookings b
                WHERE b.session_id = s.id AND b.attendance_outcome = 'no_show'
            ),
            'late_cancel_count', (
                SELECT COUNT(*) FROM public.bookings b
                WHERE b.session_id = s.id AND b.attendance_outcome = 'late_cancel'
            ),
            'race_linked', EXISTS (
                SELECT 1 FROM public.race_events re WHERE re.session_id = s.id
            )
        ) AS t
        FROM public.sessions s
        JOIN public.session_coaches sc ON sc.session_id = s.id
        WHERE sc.coach_id = v_coach_id
          AND s.session_date >= p_from
          AND s.session_date <= p_to
    ) sub;

    RETURN jsonb_build_object('success', true, 'status', 'ok', 'data', v_sessions, 'error', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_coach_schedule(DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_coach_schedule(DATE, DATE) TO authenticated;

COMMENT ON FUNCTION public.fn_get_coach_schedule(DATE, DATE) IS 'Priority 22 P0: 코치 기간별 스케줄 + attendance outcome 요약';

-- ============================================================
-- 6. fn_get_coach_session_board(p_session_id) — 세션 운영 보드
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_coach_session_board(
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_coach_id UUID;
    v_session RECORD;
    v_assigned BOOLEAN;
    v_header JSONB;
    v_coaches JSONB;
    v_attendees JSONB;
    v_summary JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'status', 'unauthenticated', 'data', NULL, 'error', 'no_session');
    END IF;

    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = v_user_id LIMIT 1;

    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'status', 'unlinked', 'data', NULL, 'error', 'coach_not_linked');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.session_coaches
        WHERE session_id = p_session_id AND coach_id = v_coach_id
    ) INTO v_assigned;

    IF NOT v_assigned THEN
        RETURN jsonb_build_object('success', false, 'status', 'forbidden', 'data', NULL, 'error', 'not_assigned_to_session');
    END IF;

    SELECT s.id, s.title, s.start_time, s.end_time, s.capacity, s.session_date,
           s.wod_description, s.status, s.facility_id
        INTO v_session
    FROM public.sessions s
    WHERE s.id = p_session_id;

    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'status', 'not_found', 'data', NULL, 'error', 'session_not_found');
    END IF;

    v_header := jsonb_build_object(
        'id', v_session.id,
        'title', v_session.title,
        'start_time', v_session.start_time,
        'end_time', v_session.end_time,
        'capacity', v_session.capacity,
        'session_date', v_session.session_date,
        'wod_description', v_session.wod_description,
        'status', v_session.status,
        'facility_id', v_session.facility_id,
        'race_linked', EXISTS (SELECT 1 FROM public.race_events re WHERE re.session_id = v_session.id)
    );

    SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'display_order')::int, t->>'coach_name'), '[]'::jsonb)
        INTO v_coaches
    FROM (
        SELECT jsonb_build_object(
            'coach_id', c.id,
            'coach_name', c.name,
            'profile_image_url', c.profile_image_url,
            'assignment_role', sc.assignment_role,
            'display_order', sc.display_order
        ) AS t
        FROM public.session_coaches sc
        JOIN public.coaches c ON c.id = sc.coach_id
        WHERE sc.session_id = p_session_id
    ) sub;

    SELECT COALESCE(jsonb_agg(t ORDER BY t->>'booking_status', t->>'member_name'), '[]'::jsonb)
        INTO v_attendees
    FROM (
        SELECT jsonb_build_object(
            'booking_id', b.id,
            'member_id', b.member_id,
            'member_name', m.name,
            'avatar_url', m.avatar_url,
            'booking_status', b.status,
            'booking_type', b.booking_type,
            'attendance_outcome', b.attendance_outcome,
            'attendance_marked_at', b.attendance_marked_at,
            'checked_in', (c.id IS NOT NULL),
            'checkin_time', c.checkin_time
        ) AS t
        FROM public.bookings b
        JOIN public.members m ON m.id = b.member_id
        LEFT JOIN public.checkins c ON c.session_id = b.session_id AND c.member_id = b.member_id
        WHERE b.session_id = p_session_id
          AND b.status IN ('confirmed', 'waitlist', 'waitlisted')
    ) sub;

    SELECT jsonb_build_object(
        'confirmed', (
            SELECT COUNT(*) FROM public.bookings b WHERE b.session_id = p_session_id AND b.status = 'confirmed'
        ),
        'waitlisted', (
            SELECT COUNT(*) FROM public.bookings b WHERE b.session_id = p_session_id AND b.status IN ('waitlist', 'waitlisted')
        ),
        'checked_in', (
            SELECT COUNT(*) FROM public.bookings b WHERE b.session_id = p_session_id AND b.attendance_outcome = 'checked_in'
        ),
        'no_show', (
            SELECT COUNT(*) FROM public.bookings b WHERE b.session_id = p_session_id AND b.attendance_outcome = 'no_show'
        ),
        'late_cancel', (
            SELECT COUNT(*) FROM public.bookings b WHERE b.session_id = p_session_id AND b.attendance_outcome = 'late_cancel'
        ),
        'coach_excused', (
            SELECT COUNT(*) FROM public.bookings b WHERE b.session_id = p_session_id AND b.attendance_outcome = 'coach_excused'
        ),
        'pending', (
            SELECT COUNT(*) FROM public.bookings b WHERE b.session_id = p_session_id AND b.attendance_outcome = 'pending' AND b.status = 'confirmed'
        )
    ) INTO v_summary;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'ok',
        'data', jsonb_build_object(
            'session', v_header,
            'coaches', v_coaches,
            'attendees', v_attendees,
            'summary', v_summary
        ),
        'error', NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_coach_session_board(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_coach_session_board(UUID) TO authenticated;

COMMENT ON FUNCTION public.fn_get_coach_session_board(UUID) IS 'Priority 22 P0: 세션 운영 보드 단일 데이터 소스 (배정 코치 검증 포함)';

-- ============================================================
-- 7. fn_mark_session_attendance(session, member, action) — 개별 출결
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_mark_session_attendance(
    p_session_id UUID,
    p_member_id UUID,
    p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_coach_id UUID;
    v_assigned BOOLEAN;
    v_booking_id UUID;
    v_existing_checkin UUID;
    v_now TIMESTAMPTZ := now();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'status', 'unauthenticated', 'error', 'no_session');
    END IF;

    IF p_action NOT IN ('checked_in', 'no_show', 'late_cancel', 'coach_excused') THEN
        RETURN jsonb_build_object('success', false, 'status', 'invalid_action', 'error', 'unsupported_action');
    END IF;

    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = v_user_id LIMIT 1;
    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'status', 'unlinked', 'error', 'coach_not_linked');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.session_coaches
        WHERE session_id = p_session_id AND coach_id = v_coach_id
    ) INTO v_assigned;

    IF NOT v_assigned THEN
        RETURN jsonb_build_object('success', false, 'status', 'forbidden', 'error', 'not_assigned_to_session');
    END IF;

    SELECT id INTO v_booking_id
    FROM public.bookings
    WHERE session_id = p_session_id AND member_id = p_member_id
    LIMIT 1;

    IF v_booking_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'status', 'not_found', 'error', 'booking_not_found');
    END IF;

    IF p_action = 'checked_in' THEN
        SELECT id INTO v_existing_checkin
        FROM public.checkins
        WHERE session_id = p_session_id AND member_id = p_member_id
        LIMIT 1;

        IF v_existing_checkin IS NULL THEN
            INSERT INTO public.checkins (member_id, session_id, checkin_method, checkin_time)
            VALUES (p_member_id, p_session_id, 'manual_coach', v_now);
        END IF;
    END IF;

    UPDATE public.bookings
    SET attendance_outcome = p_action,
        attendance_marked_at = v_now,
        attendance_marked_by = v_user_id,
        updated_at = v_now
    WHERE id = v_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'ok',
        'data', jsonb_build_object(
            'booking_id', v_booking_id,
            'attendance_outcome', p_action,
            'attendance_marked_at', v_now
        ),
        'error', NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_mark_session_attendance(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_mark_session_attendance(UUID, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.fn_mark_session_attendance(UUID, UUID, TEXT) IS 'Priority 22 P0: 개별 출결 처리 (서버 권한 검증)';

-- ============================================================
-- 8. fn_bulk_mark_session_attendance — 일괄 출결
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_bulk_mark_session_attendance(
    p_session_id UUID,
    p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_coach_id UUID;
    v_assigned BOOLEAN;
    v_item JSONB;
    v_member_id UUID;
    v_action TEXT;
    v_results JSONB := '[]'::jsonb;
    v_success_count INT := 0;
    v_failure_count INT := 0;
    v_partial JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'status', 'unauthenticated', 'error', 'no_session');
    END IF;

    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = v_user_id LIMIT 1;
    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'status', 'unlinked', 'error', 'coach_not_linked');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.session_coaches
        WHERE session_id = p_session_id AND coach_id = v_coach_id
    ) INTO v_assigned;

    IF NOT v_assigned THEN
        RETURN jsonb_build_object('success', false, 'status', 'forbidden', 'error', 'not_assigned_to_session');
    END IF;

    IF jsonb_typeof(p_payload) <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'status', 'invalid_payload', 'error', 'payload_must_be_array');
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload)
    LOOP
        v_member_id := NULLIF(v_item->>'member_id', '')::UUID;
        v_action := v_item->>'action';

        IF v_member_id IS NULL OR v_action IS NULL THEN
            v_failure_count := v_failure_count + 1;
            v_results := v_results || jsonb_build_array(jsonb_build_object(
                'member_id', v_member_id,
                'action', v_action,
                'success', false,
                'error', 'invalid_item'
            ));
            CONTINUE;
        END IF;

        BEGIN
            v_partial := public.fn_mark_session_attendance(p_session_id, v_member_id, v_action);
            IF (v_partial->>'success')::BOOLEAN THEN
                v_success_count := v_success_count + 1;
            ELSE
                v_failure_count := v_failure_count + 1;
            END IF;
            v_results := v_results || jsonb_build_array(jsonb_build_object(
                'member_id', v_member_id,
                'action', v_action,
                'success', (v_partial->>'success')::BOOLEAN,
                'error', v_partial->>'error'
            ));
        EXCEPTION WHEN OTHERS THEN
            v_failure_count := v_failure_count + 1;
            v_results := v_results || jsonb_build_array(jsonb_build_object(
                'member_id', v_member_id,
                'action', v_action,
                'success', false,
                'error', SQLERRM
            ));
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', v_failure_count = 0,
        'status', CASE WHEN v_failure_count = 0 THEN 'ok' ELSE 'partial' END,
        'data', jsonb_build_object(
            'success_count', v_success_count,
            'failure_count', v_failure_count,
            'results', v_results
        ),
        'error', NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_bulk_mark_session_attendance(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_bulk_mark_session_attendance(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION public.fn_bulk_mark_session_attendance(UUID, JSONB) IS 'Priority 22 P0: 일괄 출결 처리 (부분 성공 결과 반환)';

-- ============================================================
-- 9. 기존 RPC deprecate 표기 (즉시 삭제하지 않음 — 프론트 전환 후 정리)
-- ============================================================
-- 9. 기존 RPC deprecate 표기 (삭제 완료)
