-- ============================================================================
-- BCL Portal — 20260709150000_booking_cutoff_10min.sql
-- 예약 마감 규칙 — 예정(scheduled) 상태 수업은 시작 10분 전까지만 예약 가능.
--   변경: 시간 게이트 (start < now) → (start - 10분 < now). 나머지 로직 불변.
--   진행 중/종료/취소 세션은 status<>'scheduled' 로 계속 차단.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_book_with_credit(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_session RECORD;
    v_membership RECORD;
    v_booking_id UUID;
    v_confirmed INT;
    v_policy JSONB;
    v_open_days INT;
    v_weekly_cap INT;
    v_noshow_threshold INT;
    v_restrict_days INT;
    v_noshow_count INT;
    v_week_count INT;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;

    SELECT s.id, s.capacity, s.session_date, s.start_time, s.status,
           COALESCE(f.booking_policy, '{}'::jsonb) AS booking_policy
    INTO v_session
    FROM public.sessions s
    LEFT JOIN public.facilities f ON f.id = s.facility_id
    WHERE s.id = p_session_id;
    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_found');
    END IF;
    -- 예정 상태 + 시작 10분 전까지만 예약 가능(진행 중/종료/취소는 status로 차단).
    IF v_session.status <> 'scheduled'
       OR (v_session.session_date + v_session.start_time - INTERVAL '10 minutes') < now() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_bookable');
    END IF;

    -- ── G-4 예약 정책 검증 (booking_policy가 유일한 정책 소스 — 클라이언트 하드코딩 금지) ──
    v_policy := v_session.booking_policy;

    -- (1) 예약 윈도우: 오픈일(D-n) 이전 예약 차단
    v_open_days := (v_policy->>'booking_open_days')::INT;
    IF v_open_days IS NOT NULL AND v_session.session_date > CURRENT_DATE + v_open_days THEN
        RETURN jsonb_build_object('success', false, 'data',
            jsonb_build_object('opens_at', (v_session.session_date - v_open_days)),
            'error', 'booking_not_open');
    END IF;

    -- (2) 주간 상한: 해당 주(월~일)의 confirmed 예약 수
    v_weekly_cap := (v_policy->>'weekly_booking_cap')::INT;
    IF v_weekly_cap IS NOT NULL THEN
        SELECT COUNT(*) INTO v_week_count
        FROM public.bookings b
        JOIN public.sessions s2 ON s2.id = b.session_id
        WHERE b.member_id = v_member_id AND b.status = 'confirmed'
          AND s2.session_date >= date_trunc('week', v_session.session_date::timestamp)::date
          AND s2.session_date <  (date_trunc('week', v_session.session_date::timestamp) + INTERVAL '7 days')::date;
        IF v_week_count >= v_weekly_cap THEN
            RETURN jsonb_build_object('success', false, 'data',
                jsonb_build_object('weekly_booking_cap', v_weekly_cap),
                'error', 'weekly_cap_reached');
        END IF;
    END IF;

    -- (3) G-5 노쇼 페널티: 최근 30일 no_show ≥ threshold이고 최근 no_show 후 restrict_days 이내면 예약 제한
    v_noshow_threshold := (v_policy->'noshow_penalty'->>'monthly_threshold')::INT;
    v_restrict_days    := (v_policy->'noshow_penalty'->>'restrict_days')::INT;
    IF v_noshow_threshold IS NOT NULL AND v_restrict_days IS NOT NULL THEN
        SELECT COUNT(*) INTO v_noshow_count
        FROM public.bookings b
        WHERE b.member_id = v_member_id
          AND b.attendance_outcome = 'no_show'
          AND b.attendance_marked_at > now() - INTERVAL '30 days';
        IF v_noshow_count >= v_noshow_threshold
           AND EXISTS (SELECT 1 FROM public.bookings b2
                       WHERE b2.member_id = v_member_id AND b2.attendance_outcome = 'no_show'
                         AND b2.attendance_marked_at > now() - (v_restrict_days || ' days')::INTERVAL) THEN
            RETURN jsonb_build_object('success', false, 'data',
                jsonb_build_object('noshow_count_30d', v_noshow_count,
                                   'restrict_days', v_restrict_days),
                'error', 'booking_restricted_noshow');
        END IF;
    END IF;

    -- 정원 판정 직렬화 (세션 단위 advisory lock)
    PERFORM pg_advisory_xact_lock(hashtext('booking:' || p_session_id::text));

    IF EXISTS (SELECT 1 FROM public.bookings
               WHERE session_id = p_session_id AND member_id = v_member_id
                 AND status <> 'cancelled') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'already_booked');
    END IF;

    SELECT COUNT(*) INTO v_confirmed
    FROM public.bookings WHERE session_id = p_session_id AND status = 'confirmed';

    -- 정원 초과 → 대기 등록 (크레딧 미차감)
    IF v_confirmed >= v_session.capacity THEN
        INSERT INTO public.bookings (session_id, member_id, status)
        VALUES (p_session_id, v_member_id, 'waitlisted')
        ON CONFLICT (session_id, member_id) DO UPDATE
            SET status = 'waitlisted', cancel_reason = NULL, updated_at = now()
        RETURNING id INTO v_booking_id;

        RETURN jsonb_build_object('success', true,
            'data', jsonb_build_object('booking_id', v_booking_id, 'status', 'waitlisted',
                                       'credits_used', 0),
            'error', NULL);
    END IF;

    -- 횟수제 활성 멤버십 크레딧 차감 (만료 임박 순, 행 잠금)
    SELECT id, remaining_credits INTO v_membership
    FROM public.memberships
    WHERE member_id = v_member_id AND status = 'active'
      AND remaining_credits IS NOT NULL AND remaining_credits > 0
    ORDER BY end_date ASC NULLS LAST
    LIMIT 1
    FOR UPDATE;

    IF v_membership.id IS NOT NULL THEN
        UPDATE public.memberships
        SET remaining_credits = remaining_credits - 1, updated_at = now()
        WHERE id = v_membership.id;
    END IF;
    -- 기간제만 보유(횟수권 없음) 시 크레딧 차감 없이 예약 허용 — 기간제 정책

    INSERT INTO public.bookings (session_id, member_id, membership_id, status, credit_used)
    VALUES (p_session_id, v_member_id, v_membership.id, 'confirmed', v_membership.id IS NOT NULL)
    ON CONFLICT (session_id, member_id) DO UPDATE
        SET status = 'confirmed', membership_id = EXCLUDED.membership_id,
            credit_used = EXCLUDED.credit_used, cancel_reason = NULL, updated_at = now()
    RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'booking_id', v_booking_id, 'status', 'confirmed',
            'credits_used', CASE WHEN v_membership.id IS NOT NULL THEN 1 ELSE 0 END,
            'remaining_credits', CASE WHEN v_membership.id IS NOT NULL
                                      THEN v_membership.remaining_credits - 1 END),
        'error', NULL);
END;
$$;
