-- ============================================================
-- Priority 24 P1-B: KPI / 정산 Basis Layer RPC
-- 작성일: 2026-05-30
-- ------------------------------------------------------------
-- [백필 노트] 본 파일은 2026-05-30 Supabase MCP(apply_migration,
-- remote version 20260530090902)로 운영 DB에 이미 적용된 SQL의
-- 버전 관리용 백필 기록입니다. 원격 재적용 불필요.
-- 적용 가이드: .docs/database/migrations/20260530_priority24_p1b_kpi_settlement.md
-- ============================================================

-- ============================================================
-- 1. fn_get_coach_monthly_settlement_basis
--    목적: 코치 월간 정산 기초 계층 집계 (예상 정산 원천)
--    호출자: Coach (본인), Admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_coach_monthly_settlement_basis(
  p_year_month TEXT DEFAULT NULL  -- 'YYYY-MM' 형식, NULL이면 이번 달
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id        UUID;
  v_year_month      TEXT;
  v_month_start     DATE;
  v_month_end       DATE;
  v_base_salary     INTEGER;
  v_session_allow   INTEGER;
  v_payable_count   INTEGER;
  v_cancelled_count INTEGER;
  v_completed_count INTEGER;
  v_expected_total  INTEGER;
  v_snapshot_exists BOOLEAN;
  v_snapshot_status TEXT;
BEGIN
  -- 코치 컨텍스트 조회 (auth.uid() 기반)
  SELECT id, COALESCE(base_salary, 0), COALESCE(session_allowance, 0)
    INTO v_coach_id, v_base_salary, v_session_allow
    FROM public.coaches
   WHERE user_id = auth.uid()
   LIMIT 1;

  IF v_coach_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'coach_not_found');
  END IF;

  -- 대상 월 설정
  v_year_month := COALESCE(p_year_month, TO_CHAR(CURRENT_DATE, 'YYYY-MM'));
  v_month_start := (v_year_month || '-01')::DATE;
  v_month_end   := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- payable 세션 수 (배정된 세션 중 cancelled 제외, 해당 월)
  SELECT COUNT(DISTINCT sc.session_id)
    INTO v_payable_count
    FROM public.session_coaches sc
    JOIN public.sessions s ON s.id = sc.session_id
   WHERE sc.coach_id = v_coach_id
     AND s.session_date BETWEEN v_month_start AND v_month_end
     AND COALESCE(s.status, 'active') <> 'cancelled';

  -- cancelled 세션 수
  SELECT COUNT(DISTINCT sc.session_id)
    INTO v_cancelled_count
    FROM public.session_coaches sc
    JOIN public.sessions s ON s.id = sc.session_id
   WHERE sc.coach_id = v_coach_id
     AND s.session_date BETWEEN v_month_start AND v_month_end
     AND s.status = 'cancelled';

  -- completed 세션 수 (세션 날짜 <= 오늘 AND not cancelled)
  SELECT COUNT(DISTINCT sc.session_id)
    INTO v_completed_count
    FROM public.session_coaches sc
    JOIN public.sessions s ON s.id = sc.session_id
   WHERE sc.coach_id = v_coach_id
     AND s.session_date BETWEEN v_month_start AND v_month_end
     AND s.session_date <= CURRENT_DATE
     AND COALESCE(s.status, 'active') <> 'cancelled';

  -- 예상 총액
  v_expected_total := v_base_salary + (v_payable_count * v_session_allow);

  -- 확정 정산 스냅샷 존재 여부
  SELECT EXISTS(
    SELECT 1 FROM public.coach_settlements
     WHERE coach_id = v_coach_id AND year_month = v_year_month
  ) INTO v_snapshot_exists;

  IF v_snapshot_exists THEN
    SELECT status INTO v_snapshot_status
      FROM public.coach_settlements
     WHERE coach_id = v_coach_id AND year_month = v_year_month
     LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'coach_id',                 v_coach_id,
      'year_month',               v_year_month,
      'base_salary',              v_base_salary,
      'session_allowance',        v_session_allow,
      'payable_session_count',    v_payable_count,
      'cancelled_session_count',  v_cancelled_count,
      'completed_session_count',  v_completed_count,
      'expected_total_amount',    v_expected_total,
      'settlement_snapshot_exists', v_snapshot_exists,
      'settlement_snapshot_status', v_snapshot_status
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_coach_monthly_settlement_basis(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_coach_monthly_settlement_basis(TEXT) TO authenticated;


-- ============================================================
-- 2. fn_get_coach_monthly_kpis
--    목적: 코치 자신의 월간 KPI 통합 조회 (Dashboard/Profile용)
--    Coach read-only
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_coach_monthly_kpis(
  p_year_month TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id        UUID;
  v_year_month      TEXT;
  v_month_start     DATE;
  v_month_end       DATE;
  v_total_sessions  INTEGER;
  v_payable_count   INTEGER;
  v_total_bookings  INTEGER;
  v_checkin_count   INTEGER;
  v_noshow_count    INTEGER;
  v_waitlist_conv   INTEGER;
  v_renewal_risk    INTEGER;
  v_long_absence    INTEGER;
  v_basis           JSONB;
BEGIN
  SELECT id INTO v_coach_id
    FROM public.coaches
   WHERE user_id = auth.uid()
   LIMIT 1;

  IF v_coach_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'coach_not_found');
  END IF;

  v_year_month  := COALESCE(p_year_month, TO_CHAR(CURRENT_DATE, 'YYYY-MM'));
  v_month_start := (v_year_month || '-01')::DATE;
  v_month_end   := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- 총 배정 세션
  SELECT COUNT(DISTINCT sc.session_id) INTO v_total_sessions
    FROM public.session_coaches sc
    JOIN public.sessions s ON s.id = sc.session_id
   WHERE sc.coach_id = v_coach_id
     AND s.session_date BETWEEN v_month_start AND v_month_end;

  -- payable 세션
  SELECT COUNT(DISTINCT sc.session_id) INTO v_payable_count
    FROM public.session_coaches sc
    JOIN public.sessions s ON s.id = sc.session_id
   WHERE sc.coach_id = v_coach_id
     AND s.session_date BETWEEN v_month_start AND v_month_end
     AND COALESCE(s.status, 'active') <> 'cancelled';

  -- 해당 월 담당 세션의 총 예약 수
  SELECT COUNT(*) INTO v_total_bookings
    FROM public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
    JOIN public.session_coaches sc ON sc.session_id = s.id
   WHERE sc.coach_id = v_coach_id
     AND s.session_date BETWEEN v_month_start AND v_month_end
     AND b.status NOT IN ('cancelled');

  -- 체크인 수 (checkins 테이블 기준)
  SELECT COUNT(*) INTO v_checkin_count
    FROM public.checkins c
    JOIN public.sessions s ON s.id = c.session_id
    JOIN public.session_coaches sc ON sc.session_id = s.id
   WHERE sc.coach_id = v_coach_id
     AND s.session_date BETWEEN v_month_start AND v_month_end;

  -- no-show 수 (attendance_outcome = 'no_show')
  SELECT COUNT(*) INTO v_noshow_count
    FROM public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
    JOIN public.session_coaches sc ON sc.session_id = s.id
   WHERE sc.coach_id = v_coach_id
     AND s.session_date BETWEEN v_month_start AND v_month_end
     AND b.attendance_outcome = 'no_show';

  -- waitlist → confirmed 전환 수 (waitlist_promoted_at 기준)
  SELECT COUNT(*) INTO v_waitlist_conv
    FROM public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
    JOIN public.session_coaches sc ON sc.session_id = s.id
   WHERE sc.coach_id = v_coach_id
     AND s.session_date BETWEEN v_month_start AND v_month_end
     AND b.waitlist_promoted_at IS NOT NULL;

  -- 만기 예정 담당 회원 (멤버십 30일 이내 만료, 담당 코치 수업 예약 회원 기준)
  SELECT COUNT(DISTINCT b.member_id) INTO v_renewal_risk
    FROM public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
    JOIN public.session_coaches sc ON sc.session_id = s.id
    JOIN public.memberships m ON m.member_id = b.member_id
   WHERE sc.coach_id = v_coach_id
     AND m.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
     AND m.end_date = (
       SELECT MAX(m2.end_date) FROM public.memberships m2
        WHERE m2.member_id = b.member_id
     );

  -- 장기 미출석 담당 회원 (최근 30일 체크인 없는 회원, 담당 코치 수업 예약 회원 기준)
  SELECT COUNT(DISTINCT b.member_id) INTO v_long_absence
    FROM public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
    JOIN public.session_coaches sc ON sc.session_id = s.id
   WHERE sc.coach_id = v_coach_id
     AND s.session_date >= v_month_start - INTERVAL '60 days'
     AND NOT EXISTS (
       SELECT 1 FROM public.checkins c2
        WHERE c2.member_id = b.member_id
          AND c2.checkin_time >= CURRENT_DATE - INTERVAL '30 days'
     );

  -- Basis Layer 호출 (예상 정산)
  v_basis := public.fn_get_coach_monthly_settlement_basis(p_year_month);

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'year_month',              v_year_month,
      'total_sessions',          v_total_sessions,
      'payable_session_count',   v_payable_count,
      'total_bookings',          v_total_bookings,
      'checkin_count',           v_checkin_count,
      'no_show_count',           v_noshow_count,
      'no_show_rate',            CASE WHEN v_total_bookings > 0
                                   THEN ROUND((v_noshow_count::NUMERIC / v_total_bookings) * 100, 1)
                                   ELSE 0 END,
      'attendance_rate',         CASE WHEN v_total_bookings > 0
                                   THEN ROUND((v_checkin_count::NUMERIC / v_total_bookings) * 100, 1)
                                   ELSE 0 END,
      'waitlist_converted',      v_waitlist_conv,
      'renewal_risk_count',      v_renewal_risk,
      'long_absence_count',      v_long_absence,
      'settlement_basis',        (v_basis -> 'data')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_coach_monthly_kpis(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_coach_monthly_kpis(TEXT) TO authenticated;


-- ============================================================
-- 3. fn_get_coach_retention_panel
--    목적: 코치 담당 회원 리텐션/재등록 위험 패널
--    Coach read-only
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_coach_retention_panel(
  p_year_month TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id    UUID;
  v_year_month  TEXT;
  v_month_start DATE;
  v_result      JSONB;
BEGIN
  SELECT id INTO v_coach_id
    FROM public.coaches
   WHERE user_id = auth.uid()
   LIMIT 1;

  IF v_coach_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'coach_not_found');
  END IF;

  v_year_month  := COALESCE(p_year_month, TO_CHAR(CURRENT_DATE, 'YYYY-MM'));
  v_month_start := (v_year_month || '-01')::DATE;

  -- 리텐션 위험 회원 목록
  WITH coach_members AS (
    -- 최근 60일 이내 담당 코치 수업에 예약이 있었던 회원
    SELECT DISTINCT b.member_id
      FROM public.bookings b
      JOIN public.sessions s ON s.id = b.session_id
      JOIN public.session_coaches sc ON sc.session_id = s.id
     WHERE sc.coach_id = v_coach_id
       AND s.session_date >= CURRENT_DATE - INTERVAL '60 days'
       AND b.status NOT IN ('cancelled')
  ),
  renewal_risk AS (
    SELECT m_info.id AS member_id,
           m_info.name,
           mem.end_date,
           EXTRACT(DAY FROM mem.end_date - CURRENT_DATE)::INTEGER AS days_until_expiry
      FROM public.members m_info
      JOIN public.memberships mem ON mem.member_id = m_info.id
     WHERE m_info.id IN (SELECT member_id FROM coach_members)
       AND mem.end_date >= CURRENT_DATE
       AND mem.end_date <= CURRENT_DATE + INTERVAL '30 days'
       AND mem.end_date = (
         SELECT MAX(m2.end_date) FROM public.memberships m2
          WHERE m2.member_id = m_info.id
       )
     ORDER BY mem.end_date ASC
     LIMIT 10
  ),
  long_absence AS (
    SELECT m_info.id AS member_id,
           m_info.name,
           MAX(c.checkin_time) AS last_checkin
      FROM public.members m_info
      LEFT JOIN public.checkins c ON c.member_id = m_info.id
     WHERE m_info.id IN (SELECT member_id FROM coach_members)
     GROUP BY m_info.id, m_info.name
    HAVING MAX(c.checkin_time) < CURRENT_DATE - INTERVAL '21 days'
        OR MAX(c.checkin_time) IS NULL
     ORDER BY last_checkin ASC NULLS FIRST
     LIMIT 10
  )
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'year_month',       v_year_month,
      'renewal_risk',     COALESCE((SELECT jsonb_agg(jsonb_build_object(
                            'member_id', member_id,
                            'name',      name,
                            'end_date',  end_date,
                            'days_until_expiry', days_until_expiry
                          )) FROM renewal_risk), '[]'::jsonb),
      'long_absence',     COALESCE((SELECT jsonb_agg(jsonb_build_object(
                            'member_id',   member_id,
                            'name',        name,
                            'last_checkin', last_checkin
                          )) FROM long_absence), '[]'::jsonb)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_coach_retention_panel(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_coach_retention_panel(TEXT) TO authenticated;


-- ============================================================
-- 4. 인덱스 (KPI 집계 성능 최적화)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_session_coaches_coach_id
  ON public.session_coaches(coach_id);

CREATE INDEX IF NOT EXISTS idx_sessions_session_date_status
  ON public.sessions(session_date, status);

CREATE INDEX IF NOT EXISTS idx_bookings_attendance_outcome
  ON public.bookings(attendance_outcome) WHERE attendance_outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_waitlist_promoted
  ON public.bookings(waitlist_promoted_at) WHERE waitlist_promoted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_end_date
  ON public.memberships(member_id, end_date);
