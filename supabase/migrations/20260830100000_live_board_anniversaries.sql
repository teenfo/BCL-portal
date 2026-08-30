-- ============================================================================
-- fn_get_class_live_board — 가입 n주년 축하 (기획서 1-4 잔여 항목)
-- ----------------------------------------------------------------------------
-- today_anniversaries: [{name, years}] — 오늘이 가입 기념일인 활성·옵트인 회원.
-- Display-Safe: 이름과 연차만 반환(가입일 원값·개월 미노출), 월일 비교만 수행.
-- 생일과 동일 규율(활성 회원 + celebrate_opt_in) · 1년차 미만(years=0)은 제외.
-- 시그니처 동일 CREATE OR REPLACE — 20260830090000의 p_today(시설 로컬 날짜) 유지.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_class_live_board(p_facility_id UUID, p_today DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_today DATE := COALESCE(p_today, CURRENT_DATE);
    v_current JSONB;
    v_next JSONB;
    v_birthdays JSONB;
    v_anniversaries JSONB;
BEGIN
    IF p_facility_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'facility_required');
    END IF;

    -- 현재 진행 중(또는 시작 15분 전) 세션
    SELECT jsonb_build_object(
        'id', s.id, 'title', s.title,
        'start_time', s.start_time, 'end_time', s.end_time, 'capacity', s.capacity,
        'coach_names', (SELECT COALESCE(jsonb_agg(c.name ORDER BY sc.display_order), '[]'::jsonb)
                        FROM public.session_coaches sc
                        JOIN public.coaches c ON c.id = sc.coach_id
                        WHERE sc.session_id = s.id),
        'checkin_count', (SELECT COUNT(*) FROM public.checkins ck WHERE ck.session_id = s.id),
        'booked_count', (SELECT COUNT(*) FROM public.bookings b
                         WHERE b.session_id = s.id AND b.status = 'confirmed'),
        'checked_in_names', (SELECT COALESCE(jsonb_agg(m.name ORDER BY ck.checkin_time), '[]'::jsonb)
                             FROM public.checkins ck
                             JOIN public.members m ON m.id = ck.member_id
                             WHERE ck.session_id = s.id))
    INTO v_current
    FROM public.sessions s
    WHERE s.facility_id = p_facility_id
      AND s.session_date = CURRENT_DATE
      AND s.status IN ('scheduled','in_progress')
      AND (s.session_date + s.start_time) <= v_now + INTERVAL '15 minutes'
      AND (s.session_date + s.end_time)   >= v_now
    ORDER BY s.start_time
    LIMIT 1;

    -- 다음 세션 예고 (제목·시간·정원만)
    SELECT jsonb_build_object(
        'id', s.id, 'title', s.title,
        'start_time', s.start_time, 'end_time', s.end_time, 'capacity', s.capacity,
        'booked_count', (SELECT COUNT(*) FROM public.bookings b
                         WHERE b.session_id = s.id AND b.status = 'confirmed'))
    INTO v_next
    FROM public.sessions s
    WHERE s.facility_id = p_facility_id
      AND s.session_date = CURRENT_DATE
      AND s.status = 'scheduled'
      AND (s.session_date + s.start_time) > v_now + INTERVAL '15 minutes'
    ORDER BY s.start_time
    LIMIT 1;

    -- 오늘 생일 회원 이름(활성·옵트인만, 월일 비교 — 생년 미노출) — 시설 로컬 날짜 기준
    SELECT COALESCE(jsonb_agg(m.name ORDER BY m.name), '[]'::jsonb)
    INTO v_birthdays
    FROM public.members m
    LEFT JOIN public.notification_preferences np ON np.user_id = m.user_id
    WHERE m.facility_id = p_facility_id
      AND m.status = 'active'
      AND m.birthday IS NOT NULL
      AND to_char(m.birthday, 'MM-DD') = to_char(v_today, 'MM-DD')
      AND COALESCE(np.celebrate_opt_in, true);

    -- 오늘 가입 n주년(이름 + 연차만 — 가입일 원값 미노출). 만 1년 이상만 축하.
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', t.name, 'years', t.years) ORDER BY t.name), '[]'::jsonb)
    INTO v_anniversaries
    FROM (
        SELECT m.name,
               (EXTRACT(YEAR FROM AGE(v_today, m.created_at::date)))::INT AS years
        FROM public.members m
        LEFT JOIN public.notification_preferences np ON np.user_id = m.user_id
        WHERE m.facility_id = p_facility_id
          AND m.status = 'active'
          AND to_char(m.created_at, 'MM-DD') = to_char(v_today, 'MM-DD')
          AND COALESCE(np.celebrate_opt_in, true)
    ) t
    WHERE t.years >= 1;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('server_time', v_now, 'current', v_current, 'next', v_next,
                                   'today_birthdays', v_birthdays,
                                   'today_anniversaries', v_anniversaries),
        'error', NULL);
END;
$$;
