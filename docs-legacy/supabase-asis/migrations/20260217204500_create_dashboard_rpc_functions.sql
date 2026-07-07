-- =============================================
-- Migration: Dashboard RPC 함수
-- 복잡한 KPI 계산을 DB 레벨에서 처리
-- =============================================

-- Dashboard KPI 통합 조회 함수
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    today DATE := CURRENT_DATE;
    start_of_month DATE := date_trunc('month', CURRENT_DATE)::DATE;
BEGIN
    SELECT json_build_object(
        'total_members', (SELECT count(*) FROM members),
        'active_members', (SELECT count(*) FROM members WHERE status = 'Active'),
        'expired_members', (SELECT count(*) FROM members WHERE status = 'Expired'),
        'today_checkins', (SELECT count(*) FROM checkins WHERE created_at >= today::TEXT || 'T00:00:00' AND created_at < (today + 1)::TEXT || 'T00:00:00'),
        'today_bookings', (SELECT count(*) FROM bookings WHERE created_at::DATE = today),
        'monthly_revenue', (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE created_at >= start_of_month::TEXT || 'T00:00:00' AND status = 'completed'),
        'active_memberships', (SELECT count(*) FROM memberships WHERE status = 'active'),
        'active_coaches', (SELECT count(*) FROM coaches WHERE status = 'active'),
        'total_sessions_today', (SELECT count(*) FROM sessions WHERE start_time::DATE = today),
        'new_members_this_month', (SELECT count(*) FROM members WHERE joined_date >= start_of_month)
    ) INTO result;
    
    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_kpis IS 'Dashboard KPI 통합 조회: 회원수, 체크인, 매출 등';

-- 특정 기간 매출 통계 함수
CREATE OR REPLACE FUNCTION public.get_revenue_stats(
    p_start_date DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_revenue', COALESCE(SUM(amount), 0),
        'transaction_count', count(*),
        'avg_transaction', COALESCE(AVG(amount), 0),
        'completed', count(*) FILTER (WHERE status = 'completed'),
        'refunded', count(*) FILTER (WHERE status = 'refunded'),
        'pending', count(*) FILTER (WHERE status = 'pending'),
        'by_category', (
            SELECT json_agg(json_build_object(
                'category', category,
                'total', COALESCE(SUM(amount), 0),
                'count', count(*)
            ))
            FROM transactions
            WHERE created_at >= p_start_date::TEXT || 'T00:00:00'
              AND created_at <= p_end_date::TEXT || 'T23:59:59'
            GROUP BY category
        )
    ) INTO result
    FROM transactions
    WHERE created_at >= p_start_date::TEXT || 'T00:00:00'
      AND created_at <= p_end_date::TEXT || 'T23:59:59';
    
    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_revenue_stats IS '특정 기간 매출 통계 조회';

-- 회원 통합 조회 (멤버십 JOIN) 함수
CREATE OR REPLACE FUNCTION public.get_member_with_membership(p_member_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'member', row_to_json(m),
        'active_membership', (
            SELECT json_build_object(
                'id', ms.id,
                'status', ms.status,
                'start_date', ms.start_date,
                'end_date', ms.end_date,
                'remaining_credits', ms.remaining_credits,
                'pause_count', ms.pause_count,
                'plan_name', mp.name,
                'plan_price', mp.price,
                'max_pauses', mp.max_pauses
            )
            FROM memberships ms
            LEFT JOIN membership_plans mp ON ms.plan_id = mp.id
            WHERE ms.user_id = p_member_id AND ms.status = 'active'
            LIMIT 1
        ),
        'total_checkins', (SELECT count(*) FROM checkins WHERE member_id = p_member_id),
        'total_transactions', (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE member_id = p_member_id AND status = 'completed'),
        'recent_checkins', (
            SELECT json_agg(row_to_json(c))
            FROM (SELECT * FROM checkins WHERE member_id = p_member_id ORDER BY time DESC LIMIT 5) c
        )
    ) INTO result
    FROM members m
    WHERE m.id = p_member_id;
    
    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_member_with_membership IS '회원+멤버십 통합 조회';
