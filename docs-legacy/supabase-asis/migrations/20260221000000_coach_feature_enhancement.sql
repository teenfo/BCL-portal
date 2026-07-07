-- ============================================================
-- 1. coaching_notes 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coaching_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    note_type TEXT NOT NULL DEFAULT 'general'
        CHECK (note_type IN ('general', 'injury', 'progress', 'caution')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coaching_notes_coach ON public.coaching_notes(coach_id);
CREATE INDEX idx_coaching_notes_member ON public.coaching_notes(member_id);
CREATE INDEX idx_coaching_notes_created ON public.coaching_notes(created_at DESC);

COMMENT ON TABLE public.coaching_notes IS '코치별 회원 코칭 노트 이력';

-- ============================================================
-- 2. coach_settlements 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coach_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL,  -- '2026-02' 형식
    base_salary INTEGER NOT NULL DEFAULT 0,
    session_count INTEGER NOT NULL DEFAULT 0,
    session_allowance INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'paid')),
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (coach_id, year_month)
);

CREATE INDEX idx_coach_settlements_month ON public.coach_settlements(year_month DESC);
CREATE INDEX idx_coach_settlements_coach ON public.coach_settlements(coach_id);

COMMENT ON TABLE public.coach_settlements IS '코치 월별 정산 이력';

-- ============================================================
-- 3. RPC: 코치 대시보드 집계
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_coach_dashboard(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_coach_id UUID;
    v_today DATE := CURRENT_DATE;
    v_result JSON;
BEGIN
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = p_user_id AND status = 'active';
    IF v_coach_id IS NULL THEN
        RETURN json_build_object('error', 'coach_not_found');
    END IF;

    SELECT json_build_object(
        'coach_id', v_coach_id,
        'today_sessions', (
            SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
                SELECT s.id, s.title, s.start_time, s.end_time, s.capacity, s.session_date,
                    s.wod_description,
                    (SELECT COUNT(*) FROM public.bookings b WHERE b.session_id = s.id AND b.status = 'confirmed') AS booked_count,
                    (SELECT COUNT(*) FROM public.checkins c WHERE c.session_id = s.id AND c.checkin_time::date = v_today) AS checkin_count
                FROM public.sessions s
                JOIN public.session_coaches sc ON sc.session_id = s.id
                WHERE sc.coach_id = v_coach_id AND s.session_date = v_today
                ORDER BY s.start_time
            ) t
        ),
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
            WHERE sc.coach_id = v_coach_id AND c.checkin_time::date = v_today
        ),
        'week_sessions', (
            SELECT COUNT(DISTINCT s.id) FROM public.sessions s
            JOIN public.session_coaches sc ON sc.session_id = s.id
            WHERE sc.coach_id = v_coach_id
              AND s.session_date >= date_trunc('week', v_today)::date
              AND s.session_date <= (date_trunc('week', v_today) + interval '6 days')::date
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. RPC: 수업 참석자 + 출석 상태 조회
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_session_attendees(p_session_id UUID)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
            SELECT
                b.id AS booking_id,
                b.member_id,
                m.name AS member_name,
                m.avatar_url,
                b.status AS booking_status,
                CASE WHEN c.id IS NOT NULL THEN true ELSE false END AS checked_in,
                c.checkin_time
            FROM public.bookings b
            JOIN public.members m ON m.id = b.member_id
            LEFT JOIN public.checkins c ON c.session_id = b.session_id AND c.member_id = b.member_id
            WHERE b.session_id = p_session_id
              AND b.status IN ('confirmed', 'waitlisted')
            ORDER BY b.status, m.name
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. RPC: 코치 출석 체크 (수동)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_coach_mark_attendance(
    p_session_id UUID,
    p_member_id UUID,
    p_coach_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_coach_id UUID;
    v_existing UUID;
BEGIN
    -- 코치 확인
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = p_coach_user_id;
    IF v_coach_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_a_coach');
    END IF;

    -- 중복 체크인 확인
    SELECT id INTO v_existing FROM public.checkins
    WHERE session_id = p_session_id AND member_id = p_member_id;
    IF v_existing IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'already_checked_in');
    END IF;

    -- 체크인 INSERT
    INSERT INTO public.checkins (member_id, session_id, checkin_method, checkin_time)
    VALUES (p_member_id, p_session_id, 'manual_coach', now());

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. RPC: 코치 성과 통계 (Admin용)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_coach_performance_stats()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
            SELECT
                c.id,
                c.name,
                c.email,
                c.specialties,
                c.status,
                (SELECT COUNT(*) FROM public.session_coaches sc WHERE sc.coach_id = c.id) AS total_sessions,
                COALESCE((SELECT ROUND(AVG(sf.rating)::numeric, 1) FROM public.session_feedback sf WHERE sf.coach_id = c.id), 0) AS avg_rating,
                (SELECT COUNT(DISTINCT b.member_id) FROM public.bookings b
                 JOIN public.session_coaches sc ON sc.session_id = b.session_id
                 WHERE sc.coach_id = c.id AND b.status = 'confirmed') AS total_members
            FROM public.coaches c
            WHERE c.status = 'active'
            ORDER BY avg_rating DESC, total_sessions DESC
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. RPC: 월별 정산 계산
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_calculate_monthly_settlement(
    p_year_month TEXT,  -- '2026-02'
    p_admin_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_coach RECORD;
    v_session_count INTEGER;
    v_total INTEGER;
BEGIN
    v_start_date := (p_year_month || '-01')::DATE;
    v_end_date := (v_start_date + interval '1 month' - interval '1 day')::DATE;

    FOR v_coach IN SELECT id, base_salary, session_allowance FROM public.coaches WHERE status = 'active'
    LOOP
        SELECT COUNT(DISTINCT sc.session_id) INTO v_session_count
        FROM public.session_coaches sc
        JOIN public.sessions s ON s.id = sc.session_id
        WHERE sc.coach_id = v_coach.id
          AND s.session_date >= v_start_date
          AND s.session_date <= v_end_date;

        v_total := COALESCE(v_coach.base_salary, 0) + (v_session_count * COALESCE(v_coach.session_allowance, 0));

        INSERT INTO public.coach_settlements (coach_id, year_month, base_salary, session_count, session_allowance, total_amount, status)
        VALUES (v_coach.id, p_year_month, COALESCE(v_coach.base_salary, 0), v_session_count, COALESCE(v_coach.session_allowance, 0), v_total, 'pending')
        ON CONFLICT (coach_id, year_month) DO UPDATE SET
            base_salary = EXCLUDED.base_salary,
            session_count = EXCLUDED.session_count,
            session_allowance = EXCLUDED.session_allowance,
            total_amount = EXCLUDED.total_amount;
    END LOOP;

    RETURN json_build_object('success', true, 'year_month', p_year_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- coaching_notes RLS
ALTER TABLE public.coaching_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can manage own notes" ON public.coaching_notes
    FOR ALL TO authenticated
    USING (coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid()))
    WITH CHECK (coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid()));

CREATE POLICY "Admin full access to coaching_notes" ON public.coaching_notes
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- coach_settlements RLS
ALTER TABLE public.coach_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can view own settlements" ON public.coach_settlements
    FOR SELECT TO authenticated
    USING (coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid()));

CREATE POLICY "Admin full access to settlements" ON public.coach_settlements
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
