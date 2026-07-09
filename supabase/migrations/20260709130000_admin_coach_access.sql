-- ============================================================================
-- BCL Portal — 20260709130000_admin_coach_access.sql
-- admin(오너-운영자)의 코치앱 정식 사용 — 코치 신원 부여(admin 역할 유지).
--   증상: admin 이 코치앱에 접근 못 함 + "코치로 등록"도 admin 을 강등하거나 후보에 안 뜸.
--   원인: (1) CoachStateGate 는 coaches 활성 레코드(linked_active)만 통과 → admin 은 코치 레코드 없음.
--         (2) promote_to_coach 가 profiles.role='coach' 로 덮어써 admin 을 강등.
--   조치: (A) 기존 admin 계정에 coaches 레코드 시드(역할 불변)  (B) promote_to_coach 는 admin 강등 안 함
--         (C) fn_get_my_coach_context: admin 은 세션 배정 없어도 linked_active(오너 운영 허용).
--   보안: 코치앱 게이트는 UI 편의 — 실제 경계는 각 RPC 서버검증(불변). admin 은 이미 전 영역 권한.
-- ============================================================================

-- [A] 기존 admin 계정에 코치 레코드 시드(역할 불변). coaches.user_id UNIQUE → 재실행 안전.
INSERT INTO public.coaches (user_id, name, email, status, linked_at)
SELECT p.id, COALESCE(p.name, 'Admin'), p.email, 'active', now()
FROM public.profiles p
WHERE p.role = 'admin' AND p.approval_status = 'approved'
ON CONFLICT (user_id) DO UPDATE SET status = 'active', updated_at = now();

-- [B] promote_to_coach — admin 대상이면 강등하지 않고 코치 레코드만 연결.
CREATE OR REPLACE FUNCTION public.promote_to_coach(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_profile RECORD;
    v_keep_admin boolean;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    SELECT role, name, email INTO v_profile FROM public.profiles WHERE id = p_target_user_id;
    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'user_not_found');
    END IF;
    IF v_profile.role = 'coach' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'already_coach');
    END IF;

    -- admin 은 강등하지 않는다(오너-운영자: admin 유지한 채 코치 레코드만 연결).
    v_keep_admin := (v_profile.role = 'admin');
    IF NOT v_keep_admin THEN
        UPDATE public.profiles SET role = 'coach', updated_at = now() WHERE id = p_target_user_id;
    END IF;

    -- coaches 행 연결(없으면 생성) — 승격과 코치 레코드의 원자적 정합
    INSERT INTO public.coaches (user_id, name, email, status, linked_at, linked_by)
    VALUES (p_target_user_id, COALESCE(v_profile.name, 'Coach'), v_profile.email, 'active', now(), auth.uid())
    ON CONFLICT (user_id) DO UPDATE
        SET status = 'active', linked_at = now(), linked_by = auth.uid(), updated_at = now();

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), 'PROMOTE_TO_COACH', 'profiles', p_target_user_id,
            jsonb_build_object('new_role', CASE WHEN v_keep_admin THEN 'admin' ELSE 'coach' END,
                               'kept_admin', v_keep_admin));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('user_id', p_target_user_id,
                                   'role', CASE WHEN v_keep_admin THEN 'admin' ELSE 'coach' END,
                                   'coach_linked', true),
        'error', NULL);
END;
$$;

-- [C] fn_get_my_coach_context — admin 은 세션 배정 없어도 linked_active(오너 운영 허용).
CREATE OR REPLACE FUNCTION public.fn_get_my_coach_context()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_coach RECORD;
    v_assignment_count INT;
    v_status TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data',
            jsonb_build_object('linked', false), 'error', 'no_session');
    END IF;

    SELECT id, name, status INTO v_coach
    FROM public.coaches WHERE user_id = v_user_id LIMIT 1;

    IF v_coach.id IS NULL THEN
        RETURN jsonb_build_object('success', true,
            'data', jsonb_build_object('context_status', 'unlinked', 'linked', false,
                                       'has_assignments', false),
            'error', NULL);
    END IF;

    IF v_coach.status <> 'active' THEN
        RETURN jsonb_build_object('success', true,
            'data', jsonb_build_object('context_status', 'on_leave', 'linked', true,
                                       'coach_id', v_coach.id, 'coach_name', v_coach.name,
                                       'has_assignments', false),
            'error', NULL);
    END IF;

    SELECT COUNT(*) INTO v_assignment_count
    FROM public.session_coaches sc
    JOIN public.sessions s ON s.id = sc.session_id
    WHERE sc.coach_id = v_coach.id
      AND s.session_date BETWEEN CURRENT_DATE - 30 AND CURRENT_DATE + 60;

    v_status := CASE WHEN v_assignment_count > 0 THEN 'linked_active' ELSE 'linked_unassigned' END;

    -- admin(오너)은 세션 배정이 없어도 코치앱 운영 허용 — 코치 레코드 활성이면 linked_active.
    IF public.is_admin() THEN
        v_status := 'linked_active';
    END IF;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('context_status', v_status, 'linked', true,
                                   'coach_id', v_coach.id, 'coach_name', v_coach.name,
                                   'has_assignments', v_assignment_count > 0,
                                   'assignment_count', v_assignment_count),
        'error', NULL);
END;
$$;

-- ============================================================================
-- 20260709130000_admin_coach_access.sql 끝
-- ============================================================================
