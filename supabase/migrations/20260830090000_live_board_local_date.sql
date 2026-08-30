-- ============================================================================
-- fn_get_class_live_board — 생일 판정에 시설 로컬 날짜 사용 (Codex P2 리뷰 반영)
-- ----------------------------------------------------------------------------
-- 서버 CURRENT_DATE는 UTC라 KST 00:00~09:00 사이엔 전날 생일이 표시되고 오늘
-- 생일이 누락된다. WOD 조회와 동일한 저장소 규칙 적용: 날짜는 클라이언트(TV —
-- 시설 현지)가 명시 전달(p_today), 미전달 시 CURRENT_DATE 폴백(구 클라이언트 호환).
-- 시그니처 변경(파라미터 추가)이라 DROP 후 재생성 — anon/authenticated GRANT 명시 재부여
-- (§6.1 화이트리스트 공개 표면 유지).
-- 현재/다음 세션 선택 로직은 종전 그대로(별도 검토 대상 — 이 마이그레이션은 생일만).
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_get_class_live_board(UUID);

CREATE FUNCTION public.fn_get_class_live_board(p_facility_id UUID, p_today DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_today DATE := COALESCE(p_today, CURRENT_DATE);
    v_current JSONB;
    v_next JSONB;
    v_birthdays JSONB;
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

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('server_time', v_now, 'current', v_current, 'next', v_next,
                                   'today_birthdays', v_birthdays),
        'error', NULL);
END;
$$;

-- 공개 표면 GRANT 재부여 (DROP으로 소실 — docs/05 §6.1 anon 화이트리스트 항목)
REVOKE ALL ON FUNCTION public.fn_get_class_live_board(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_class_live_board(UUID, DATE) TO anon, authenticated;
