-- ============================================================================
-- fn_get_class_celebrations — 인클래스 셀레브레이션 피드 (기획서 2-2)
-- ----------------------------------------------------------------------------
-- TV가 "방금 무슨 일이 있었나"를 묻는 anon 조회. 최근 N분 내의 축하 이벤트만
-- 반환한다: 벤치마크 PR · Race PR · 배지 획득.
--   · 종전 fn_get_class_screen_prs(일 단위 티커)는 그대로 두고, 오버레이는 분 단위
--     신규 이벤트만 소비한다(수업 중 방금 달성 → 즉시 축하).
--   · Display-Safe: 이름·항목명·결과 라벨만. member_id·생년·메모·수치 원본은 미SELECT.
--   · 옵트아웃 존중: notification_preferences.celebrate_opt_in = false 인 회원 제외
--     (기록 자체는 남되 공개 화면에는 뜨지 않는다 — screen_prs와 동일 규칙).
-- 신규 함수 = DEFAULT PRIVILEGES로 붙는 권한을 회수하고 필요한 롤에만 명시 부여.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_class_celebrations(
    p_facility_id UUID,
    p_minutes INT DEFAULT 15)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_data JSONB;
    v_since TIMESTAMPTZ;
BEGIN
    IF p_facility_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'facility_required');
    END IF;
    -- 1분~6시간으로 클램프 — anon 표면이 과거 전체를 훑는 것 방지
    v_since := now() - (LEAST(GREATEST(COALESCE(p_minutes, 15), 1), 360) || ' minutes')::INTERVAL;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.achieved_at DESC), '[]'::jsonb) INTO v_data
    FROM (
        -- 벤치마크 PR
        SELECT m.name AS member_name,
               bd.name AS item_label,
               r.result_value::TEXT || ' ' || bd.unit AS result_label,
               r.recorded_at AS achieved_at,
               'pr'::TEXT AS kind,
               '🏆'::TEXT AS icon
        FROM public.member_benchmark_results r
        JOIN public.benchmark_definitions bd ON bd.id = r.benchmark_id
        JOIN public.members m ON m.id = r.member_id
        LEFT JOIN public.notification_preferences np ON np.user_id = m.user_id
        WHERE r.is_pr
          AND r.recorded_at > v_since
          AND COALESCE(np.celebrate_opt_in, true)
          AND (m.facility_id = p_facility_id OR m.facility_id IS NULL)
        UNION ALL
        -- Race PR
        SELECT m.name, re.name,
               COALESCE(rr.result_distance::TEXT || 'm', TO_CHAR(rr.result_time, 'MI:SS')),
               rr.created_at, 'race', '🚣'
        FROM public.race_records rr
        JOIN public.race_events re ON re.id = rr.event_id
        JOIN public.members m ON m.id = rr.member_id
        LEFT JOIN public.notification_preferences np ON np.user_id = m.user_id
        WHERE rr.is_pr
          AND rr.created_at > v_since
          AND COALESCE(np.celebrate_opt_in, true)
          AND (re.facility_id = p_facility_id OR re.facility_id IS NULL)
        UNION ALL
        -- 배지 획득(회수분 제외)
        SELECT m.name, b.name,
               COALESCE(NULLIF(b.description, ''), '배지 획득'),
               a.awarded_at, 'badge', COALESCE(NULLIF(b.icon, ''), '🏅')
        FROM public.badge_awards a
        JOIN public.badge_definitions b ON b.id = a.badge_id
        JOIN public.members m ON m.id = a.member_id
        LEFT JOIN public.notification_preferences np ON np.user_id = m.user_id
        WHERE a.revoked_at IS NULL
          AND a.awarded_at > v_since
          AND COALESCE(np.celebrate_opt_in, true)
          AND (m.facility_id = p_facility_id OR m.facility_id IS NULL)
        ORDER BY achieved_at DESC
        LIMIT 10
    ) t;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.fn_get_class_celebrations(uuid, int) IS
'TV 인클래스 축하 피드(최근 N분): 벤치마크 PR·Race PR·배지. Display-Safe(이름/항목/결과만) + celebrate_opt_in 존중';

REVOKE ALL ON FUNCTION public.fn_get_class_celebrations(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_class_celebrations(uuid, int) TO anon, authenticated;
