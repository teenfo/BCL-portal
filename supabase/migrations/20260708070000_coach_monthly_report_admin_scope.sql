-- fn_get_coach_monthly_report — Admin 대상코치 스코프 추가 (02-admin §3.7 월별 상세)
-- 기존: auth.uid() → 코치 본인 전용 스코프(Admin이 특정 코치 지정 불가).
-- 변경: p_coach_id uuid DEFAULT NULL 추가.
--   · NULL       → 본인 스코프(coach 앱 기존 동작 불변, user_id = auth.uid())
--   · 값 지정    → is_admin() 요구 + 해당 coach_id 스코프(Admin 정산 근거 조회)
-- 인자 개수가 바뀌므로 기존 2-인자 시그니처를 DROP 후 재생성(오버로드 모호성 방지).

DROP FUNCTION IF EXISTS public.fn_get_coach_monthly_report(text, text[]);

CREATE OR REPLACE FUNCTION public.fn_get_coach_monthly_report(
    p_year_month TEXT DEFAULT NULL,
    p_sections TEXT[] DEFAULT ARRAY['basis','kpis','retention'],
    p_coach_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach RECORD;
    v_ym TEXT;
    v_start DATE;
    v_end DATE;
    v_data JSONB := '{}'::jsonb;
    -- basis
    v_payable INT; v_cancelled INT; v_completed INT;
    -- kpis
    v_total_sessions INT; v_total_bookings INT; v_checkins INT; v_noshow INT; v_waitlist_conv INT;
BEGIN
    -- 대상 코치 스코프 결정: NULL=본인, 값=Admin 지정
    IF p_coach_id IS NULL THEN
        SELECT id, COALESCE(base_salary,0) AS base_salary,
               COALESCE(session_allowance,0) AS session_allowance
        INTO v_coach
        FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    ELSE
        IF NOT public.is_admin() THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
        END IF;
        SELECT id, COALESCE(base_salary,0) AS base_salary,
               COALESCE(session_allowance,0) AS session_allowance
        INTO v_coach
        FROM public.coaches WHERE id = p_coach_id LIMIT 1;
    END IF;

    IF v_coach.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_found');
    END IF;

    v_ym    := COALESCE(p_year_month, TO_CHAR(CURRENT_DATE, 'YYYY-MM'));
    IF v_ym !~ '^\d{4}-\d{2}$' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_year_month');
    END IF;
    v_start := (v_ym || '-01')::DATE;
    v_end   := (v_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- ── 섹션 1: basis (예상 정산 원천) ──────────────────────────────
    IF 'basis' = ANY(p_sections) OR 'kpis' = ANY(p_sections) THEN
        SELECT COUNT(DISTINCT sc.session_id) INTO v_payable
        FROM public.session_coaches sc JOIN public.sessions s ON s.id = sc.session_id
        WHERE sc.coach_id = v_coach.id AND s.session_date BETWEEN v_start AND v_end
          AND s.status <> 'cancelled';

        SELECT COUNT(DISTINCT sc.session_id) INTO v_cancelled
        FROM public.session_coaches sc JOIN public.sessions s ON s.id = sc.session_id
        WHERE sc.coach_id = v_coach.id AND s.session_date BETWEEN v_start AND v_end
          AND s.status = 'cancelled';

        SELECT COUNT(DISTINCT sc.session_id) INTO v_completed
        FROM public.session_coaches sc JOIN public.sessions s ON s.id = sc.session_id
        WHERE sc.coach_id = v_coach.id AND s.session_date BETWEEN v_start AND v_end
          AND s.session_date <= CURRENT_DATE AND s.status <> 'cancelled';
    END IF;

    IF 'basis' = ANY(p_sections) THEN
        v_data := v_data || jsonb_build_object('basis', jsonb_build_object(
            'coach_id', v_coach.id,
            'base_salary', v_coach.base_salary,
            'session_allowance', v_coach.session_allowance,
            'payable_session_count', v_payable,
            'cancelled_session_count', v_cancelled,
            'completed_session_count', v_completed,
            'expected_total_amount', v_coach.base_salary + v_payable * v_coach.session_allowance,
            'settlement_snapshot_status', (
                SELECT status FROM public.coach_settlements
                WHERE coach_id = v_coach.id AND year_month = v_ym LIMIT 1)));
    END IF;

    -- ── 섹션 2: kpis (출석률/노쇼/대기 전환) ─────────────────────────
    IF 'kpis' = ANY(p_sections) THEN
        SELECT COUNT(DISTINCT sc.session_id) INTO v_total_sessions
        FROM public.session_coaches sc JOIN public.sessions s ON s.id = sc.session_id
        WHERE sc.coach_id = v_coach.id AND s.session_date BETWEEN v_start AND v_end;

        SELECT COUNT(*) INTO v_total_bookings
        FROM public.bookings b
        JOIN public.sessions s ON s.id = b.session_id
        JOIN public.session_coaches sc ON sc.session_id = s.id
        WHERE sc.coach_id = v_coach.id AND s.session_date BETWEEN v_start AND v_end
          AND b.status <> 'cancelled';

        SELECT COUNT(*) INTO v_checkins
        FROM public.checkins c
        JOIN public.sessions s ON s.id = c.session_id
        JOIN public.session_coaches sc ON sc.session_id = s.id
        WHERE sc.coach_id = v_coach.id AND s.session_date BETWEEN v_start AND v_end;

        SELECT COUNT(*) INTO v_noshow
        FROM public.bookings b
        JOIN public.sessions s ON s.id = b.session_id
        JOIN public.session_coaches sc ON sc.session_id = s.id
        WHERE sc.coach_id = v_coach.id AND s.session_date BETWEEN v_start AND v_end
          AND b.attendance_outcome = 'no_show';

        SELECT COUNT(*) INTO v_waitlist_conv
        FROM public.bookings b
        JOIN public.sessions s ON s.id = b.session_id
        JOIN public.session_coaches sc ON sc.session_id = s.id
        WHERE sc.coach_id = v_coach.id AND s.session_date BETWEEN v_start AND v_end
          AND b.waitlist_promoted_at IS NOT NULL;

        v_data := v_data || jsonb_build_object('kpis', jsonb_build_object(
            'total_sessions', v_total_sessions,
            'payable_session_count', v_payable,
            'total_bookings', v_total_bookings,
            'checkin_count', v_checkins,
            'no_show_count', v_noshow,
            'attendance_rate', CASE WHEN v_total_bookings > 0
                THEN ROUND(v_checkins::NUMERIC / v_total_bookings * 100, 1) ELSE 0 END,
            'no_show_rate', CASE WHEN v_total_bookings > 0
                THEN ROUND(v_noshow::NUMERIC / v_total_bookings * 100, 1) ELSE 0 END,
            'waitlist_converted', v_waitlist_conv));
    END IF;

    -- ── 섹션 3: retention (만기 예정 + 장기 미출석 담당 회원) ─────────
    IF 'retention' = ANY(p_sections) THEN
        v_data := v_data || jsonb_build_object('retention', (
            WITH coach_members AS (
                SELECT DISTINCT b.member_id
                FROM public.bookings b
                JOIN public.sessions s ON s.id = b.session_id
                JOIN public.session_coaches sc ON sc.session_id = s.id
                WHERE sc.coach_id = v_coach.id
                  AND s.session_date >= CURRENT_DATE - 60
                  AND b.status <> 'cancelled'
            ),
            renewal_risk AS (
                SELECT m.id AS member_id, m.name, ms.end_date,
                       (ms.end_date - CURRENT_DATE) AS days_until_expiry
                FROM public.members m
                JOIN public.memberships ms ON ms.member_id = m.id
                WHERE m.id IN (SELECT member_id FROM coach_members)
                  AND ms.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
                  AND ms.end_date = (SELECT MAX(m2.end_date) FROM public.memberships m2
                                     WHERE m2.member_id = m.id)
                ORDER BY ms.end_date LIMIT 10
            ),
            long_absence AS (
                SELECT m.id AS member_id, m.name, MAX(c.checkin_time) AS last_checkin
                FROM public.members m
                LEFT JOIN public.checkins c ON c.member_id = m.id
                WHERE m.id IN (SELECT member_id FROM coach_members)
                GROUP BY m.id, m.name
                HAVING MAX(c.checkin_time) < CURRENT_DATE - 21 OR MAX(c.checkin_time) IS NULL
                ORDER BY last_checkin ASC NULLS FIRST LIMIT 10
            )
            SELECT jsonb_build_object(
                'renewal_risk', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM renewal_risk r), '[]'::jsonb),
                'long_absence', COALESCE((SELECT jsonb_agg(to_jsonb(l)) FROM long_absence l), '[]'::jsonb))
        ));
    END IF;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('year_month', v_ym) || v_data, 'error', NULL);
END;
$$;

-- client 실행 권한 재부여(DROP으로 소실됨) — authenticated만(REVOKE PUBLIC/anon)
REVOKE ALL ON FUNCTION public.fn_get_coach_monthly_report(text, text[], uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_get_coach_monthly_report(text, text[], uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_coach_monthly_report(text, text[], uuid) TO authenticated;
