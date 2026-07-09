-- ============================================================================
-- BCL Portal 재구축 DDL — 09_rpc.sql
-- ----------------------------------------------------------------------------
-- 목적   : 표준 RPC 전수 — 계약 §4 + 보정(fn_kiosk_checkin, Class 공개 3종)
--          + 4차 보정(G-1~G-9: fn_sign_agreement, 일일 WOD 기록 3종, 예약 정책 검증)
--          = 공칭 38종. (그룹 내 세부 함수 단위 전수는 아래 목차 참조)
-- 의존   : 00~08 전부 (반드시 마지막에 적용)
-- 공통 규약 (계약 §3):
--   - SECURITY DEFINER + SET search_path = public
--   - 내부 auth.uid() 검증 — 클라이언트가 사용자 식별자를 전달하지 않는다
--   - 응답 envelope 1종: {success boolean, data jsonb|null, error text|null}
--   - REVOKE ALL FROM PUBLIC + GRANT EXECUTE (기본 authenticated,
--     anon 화이트리스트: fn_kiosk_checkin, fn_get_class_display_wod,
--     fn_get_class_live_board, fn_get_class_screen_prs, fn_get_class_leaderboard)
--   - 동시성: advisory lock 대상 = 예약(세션 단위) / PR 판정(회원×종목) /
--     Race 세션 준비(세션 단위)
-- 폐지   : fn_get_coach_dashboard, fn_get_session_attendees, fn_coach_mark_attendance,
--          fn_mark_session_attendance·fn_bulk_mark_session_attendance(→fn_mark_attendance),
--          fn_get_coach_monthly_settlement_basis·kpis·retention_panel(→fn_get_coach_monthly_report),
--          fn_list_member_alert_flags(→fn_get_member_context_panel),
--          get_member_with_membership(→PostgREST 중첩 select로 대체)
-- 목차   :
--   [A] 게이트 헬퍼 2종      : _assert_coach_or_admin / _assert_coach_can_edit_session
--   [B] 계정/권한 4종        : fn_my_permissions / promote_to_coach / demote_from_coach
--                              / fn_sign_agreement(⏳G-6)
--   [C] 예약·키오스크 3종    : fn_book_with_credit / fn_cancel_booking_with_credit / fn_kiosk_checkin
--                              (🔄 G-4/G-5 booking_policy 검증, G-7 drop_in/trial 유효)
--   [D] 코치 운영 5종        : fn_get_my_coach_context / fn_get_my_coach_dashboard /
--                              fn_get_coach_schedule / fn_get_coach_session_board / fn_mark_attendance
--   [E] WOD 10종             : fn_search_wod_movements / fn_list_movement_library /
--                              fn_list_wod_templates / fn_get_wod_template / fn_upsert_wod_template /
--                              fn_publish_wod_template / fn_get_session_wod / fn_upsert_session_wod /
--                              fn_publish_session_wod / fn_get_class_display_wod
--   [F] 런시트 4종           : fn_list_runbook_templates / fn_upsert_runbook_template /
--                              fn_get_session_runbook / fn_upsert_session_runbook
--   [G] 회원 컨텍스트 2종    : fn_get_member_context_panel / fn_upsert_member_alert_flag
--   [H] KPI/정산·환불 3종    : fn_get_coach_monthly_report / fn_calculate_monthly_settlement / fn_calculate_refund
--   [I] 퍼포먼스 6종         : fn_list_benchmark_definitions / fn_record_member_benchmark_result(🔄+rx)
--                              / fn_get_member_performance_profile(🔄+WOD 타임라인) / fn_create_followup
--                              / fn_complete_followup / fn_get_my_followups
--   [I2] 일일 WOD 기록 3종⏳ : fn_record_session_wod_result / fn_get_session_wod_whiteboard
--                              / fn_get_my_wod_prep (G-1~G-3)
--   [J] 배지 2종             : fn_get_my_badges / fn_evaluate_badges
--   [K] Race 1종             : fn_prepare_race_session
--   [L] Class 공개 3종       : fn_get_class_live_board / fn_get_class_screen_prs / fn_get_class_leaderboard
--   [M] Admin 대시보드 3종   : fn_get_dashboard_kpis / fn_get_revenue_stats / fn_get_coach_performance_stats
--   [N] 부속 내부 2종(표준 외): save_pg_settings / get_decrypted_pg_settings
--   [O] Admin 멤버십·예약 5종 : fn_admin_create_membership / fn_admin_adjust_membership /
--                              fn_admin_transfer_membership / fn_admin_book_session / fn_admin_add_walkin
--                              (대리 취소는 fn_cancel_booking_with_credit admin 분기 재사용 — Phase 2, 02-admin §3.2·§3.6)
--   [P] Admin 파괴적 audit·원자 7종 : fn_admin_set_blacklist / fn_admin_review_signup /
--                              fn_upsert_membership_plan / fn_archive_membership_plan /
--                              fn_upsert_session / fn_cancel_session / fn_promote_from_waitlist
--                              (Phase 2 하드닝 — 02-admin §3.2·§3.3·§3.5·§3.6.
--                               보강 3종 audit는 D.5/C.2/G.2 원 정의에 직접 반영)
--   [Q] Phase 2B audit 하드닝     : _audit_row_change/_audit_system_config_change 트리거(config 19종)
--                              + _is_super_admin + fn_set_payment_mode / fn_set_role_permissions /
--                              fn_assign_admin_role / fn_revoke_admin_role / fn_update_coach_profile /
--                              fn_reply_support_ticket (mig 20260708060000)
--   [R] Phase 3.5 백엔드 갭 보강  : (mig 20260708080000) — 결제 DEFERRED
--     R1 Kiosk : fn_kiosk_checkin(🔄+device_id/scanned_at, 크레딧 원자차감) /
--                fn_kiosk_lookup_member / fn_kiosk_heartbeat / fn_get_kiosk_notices (anon)
--     R2 Member: fn_record_my_benchmark_result / fn_get_member_schedule /
--                fn_get_benchmark_leaderboard / fn_create_support_ticket
--     R3 Coach : fn_record_session_wod_result(🔄+p_member_id 대리) / fn_get_coach_members /
--                fn_upsert_member_note / fn_update_my_coach_profile(급여 제외) /
--                fn_get_coach_member_alerts / fn_upsert_session_rotation_state /
--                fn_get_session_rotation_state / fn_list_coach_race_events /
--                fn_create_coach_race_event / fn_finish_race_event / fn_get_race_event_result
--     R4 Class : fn_get_race_lanes(+device_type) / fn_get_class_race_result /
--                fn_get_class_wod_board (anon, Display-Safe)
--     테이블   : session_rotation_states(+updated_by, 기존 테이블 재사용)
-- ============================================================================


-- ============================================================================
-- [A] 게이트 헬퍼 (권한 검증 공통화 — 계약 §3 "_assert_* 2종")
-- ============================================================================

CREATE OR REPLACE FUNCTION public._assert_coach_or_admin()
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'unauthenticated';
    END IF;
    SELECT role INTO v_role FROM public.profiles
    WHERE id = v_user_id AND approval_status = 'approved';
    IF v_role IS NULL OR v_role NOT IN ('admin','coach') THEN
        RAISE EXCEPTION 'forbidden';
    END IF;
    RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._assert_coach_can_edit_session(p_session_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := public._assert_coach_or_admin();
    IF public.is_admin() THEN
        RETURN v_user_id;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.session_coaches sc
        JOIN public.coaches c ON c.id = sc.coach_id
        WHERE sc.session_id = p_session_id AND c.user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'not_assigned_to_session';
    END IF;
    RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION public._assert_coach_or_admin() IS '게이트: 승인된 admin/coach만 통과, user_id 반환';
COMMENT ON FUNCTION public._assert_coach_can_edit_session(UUID) IS '게이트: admin 또는 해당 세션 배정 코치만 통과';


-- ============================================================================
-- [B] 계정/권한
-- ============================================================================

-- B.1 fn_my_permissions() — 역할+승인+세부 권한 병합 단일 조회 (UI 게이트의 유일한 소스)
CREATE OR REPLACE FUNCTION public.fn_my_permissions()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_perms JSONB := '{}'::jsonb;
    v_row RECORD;
    v_key TEXT;
    v_merged JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'no_session');
    END IF;

    SELECT role, approval_status, name, email INTO v_profile
    FROM public.profiles WHERE id = v_user_id;

    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'profile_not_found');
    END IF;

    -- admin_user_roles → admin_roles.permissions 병합 (그룹별 액션 배열 union)
    FOR v_row IN
        SELECT ar.permissions
        FROM public.admin_user_roles aur
        JOIN public.admin_roles ar ON ar.id = aur.role_id
        WHERE aur.user_id = v_user_id
    LOOP
        FOR v_key IN SELECT jsonb_object_keys(v_row.permissions)
        LOOP
            SELECT COALESCE(jsonb_agg(DISTINCT a), '[]'::jsonb) INTO v_merged
            FROM (
                SELECT jsonb_array_elements_text(COALESCE(v_perms->v_key, '[]'::jsonb)) AS a
                UNION
                SELECT jsonb_array_elements_text(v_row.permissions->v_key)
            ) t;
            v_perms := v_perms || jsonb_build_object(v_key, v_merged);
        END LOOP;
    END LOOP;

    -- 부트스트랩 안전장치: role=admin인데 역할 매핑이 없으면 super_admin으로 간주 (잠금 방지)
    IF v_profile.role = 'admin' AND v_perms = '{}'::jsonb THEN
        v_perms := '{"*": ["all"]}'::jsonb;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'user_id', v_user_id,
            'role', v_profile.role,
            'approval_status', v_profile.approval_status,
            'is_super_admin', (v_perms ? '*'),
            'permissions', v_perms
        ),
        'error', NULL
    );
END;
$$;

-- B.2 promote_to_coach(p_target_user_id) — 🔄 admin_user_id 파라미터 제거(auth.uid() 내부 검증)
CREATE OR REPLACE FUNCTION public.promote_to_coach(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_profile RECORD;
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

    UPDATE public.profiles SET role = 'coach', updated_at = now() WHERE id = p_target_user_id;

    -- coaches 행 연결(없으면 생성) — 승격과 코치 레코드의 원자적 정합
    INSERT INTO public.coaches (user_id, name, email, status, linked_at, linked_by)
    VALUES (p_target_user_id, COALESCE(v_profile.name, 'Coach'), v_profile.email, 'active', now(), auth.uid())
    ON CONFLICT (user_id) DO UPDATE
        SET status = 'active', linked_at = now(), linked_by = auth.uid(), updated_at = now();

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), 'PROMOTE_TO_COACH', 'profiles', p_target_user_id,
            jsonb_build_object('new_role', 'coach'));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('user_id', p_target_user_id, 'role', 'coach'), 'error', NULL);
END;
$$;

-- B.3 demote_from_coach(p_target_user_id)
CREATE OR REPLACE FUNCTION public.demote_from_coach(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    UPDATE public.profiles SET role = 'member', updated_at = now() WHERE id = p_target_user_id;
    UPDATE public.coaches SET status = 'inactive', updated_at = now() WHERE user_id = p_target_user_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), 'DEMOTE_FROM_COACH', 'profiles', p_target_user_id,
            jsonb_build_object('new_role', 'member'));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('user_id', p_target_user_id, 'role', 'member'), 'error', NULL);
END;
$$;


-- B.4 fn_sign_agreement(p_doc_type, p_doc_version, p_signature) — ⏳ G-6 전자 동의 서명
--     본인(member) 전용. 증빙 불변 — 동일 (doc_type, doc_version) 재서명은 already_signed 반환
CREATE OR REPLACE FUNCTION public.fn_sign_agreement(
    p_doc_type TEXT, p_doc_version TEXT, p_signature TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_id UUID;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF p_doc_type NOT IN ('terms','privacy','refund_policy','health_waiver') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_doc_type');
    END IF;
    IF p_doc_version IS NULL OR p_doc_version = '' OR p_signature IS NULL OR p_signature = '' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'missing_required_fields');
    END IF;

    INSERT INTO public.member_agreements (member_id, doc_type, doc_version, signature)
    VALUES (v_member_id, p_doc_type, p_doc_version, p_signature)
    ON CONFLICT (member_id, doc_type, doc_version) DO NOTHING
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        SELECT id INTO v_id FROM public.member_agreements
        WHERE member_id = v_member_id AND doc_type = p_doc_type AND doc_version = p_doc_version;
        RETURN jsonb_build_object('success', true,
            'data', jsonb_build_object('id', v_id, 'already_signed', true), 'error', NULL);
    END IF;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('id', v_id, 'already_signed', false,
                                   'doc_type', p_doc_type, 'doc_version', p_doc_version),
        'error', NULL);
END;
$$;

COMMENT ON FUNCTION public.fn_sign_agreement(TEXT, TEXT, TEXT) IS 'G-6: 전자 동의·웨이버 서명 기록(본인). 가입 승인 전 서명 단계 — 미서명 필터는 member_agreements 조회로';


-- ============================================================================
-- [C] 예약 · 키오스크
-- ============================================================================

-- C.1 fn_book_with_credit(p_session_id) — 🔄 p_user_id 제거(auth.uid() 파생),
--     advisory lock으로 정원 경합 직렬화, credit_used/membership_id 기록(환원 정합)
--     🔄 G-4/G-5: facilities.booking_policy 검증 단계(예약 윈도우/주간 상한/노쇼 제한) — 계약 §6b
CREATE OR REPLACE FUNCTION public.fn_book_with_credit(p_session_id UUID)
RETURNS JSONB
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
    IF v_session.status <> 'scheduled'
       OR (v_session.session_date + v_session.start_time) < now() THEN
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

-- C.2 fn_cancel_booking_with_credit(p_booking_id, p_reason)
--     🔄 환원은 credit_used=true + 차감된 membership_id에만 (as-is 무차별 +1 버그 해소)
--     🔄 G-4/G-5: cancel_deadline_hours 경과 후 취소 = late_cancel 판정 +
--        정책(noshow_penalty.credit_forfeit=true)에 따라 크레딧 몰수
CREATE OR REPLACE FUNCTION public.fn_cancel_booking_with_credit(
    p_booking_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_booking RECORD;
    v_session RECORD;
    v_deadline_hours INT;
    v_is_late BOOLEAN := false;
    v_forfeit BOOLEAN := false;
    v_refund BOOLEAN;
    v_by_admin BOOLEAN := false;
BEGIN
    v_member_id := public.current_member_id();

    SELECT b.* INTO v_booking
    FROM public.bookings b
    WHERE b.id = p_booking_id
      AND (b.member_id = v_member_id OR public.is_admin())
    FOR UPDATE;

    IF v_booking.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'booking_not_found');
    END IF;
    IF v_booking.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'already_cancelled');
    END IF;

    -- ── G-4 취소 마감 판정 (booking_policy.cancel_deadline_hours) ──
    SELECT s.session_date, s.start_time,
           COALESCE(f.booking_policy, '{}'::jsonb) AS booking_policy
    INTO v_session
    FROM public.sessions s
    LEFT JOIN public.facilities f ON f.id = s.facility_id
    WHERE s.id = v_booking.session_id;

    v_deadline_hours := (v_session.booking_policy->>'cancel_deadline_hours')::INT;
    IF v_deadline_hours IS NOT NULL AND v_booking.status = 'confirmed'
       AND now() > (v_session.session_date + v_session.start_time)
                   - (v_deadline_hours || ' hours')::INTERVAL THEN
        v_is_late := true;
        v_forfeit := COALESCE(
            (v_session.booking_policy->'noshow_penalty'->>'credit_forfeit')::BOOLEAN, false);
    END IF;
    -- admin 취소는 정책 예외(운영 판단) — 페널티 미적용
    v_by_admin := public.is_admin() AND (v_booking.member_id <> v_member_id OR v_member_id IS NULL);
    IF v_by_admin THEN
        v_is_late := false; v_forfeit := false;
    END IF;

    UPDATE public.bookings
    SET status = 'cancelled',
        cancel_reason = p_reason,
        attendance_outcome = CASE WHEN v_is_late THEN 'late_cancel' ELSE attendance_outcome END,
        attendance_marked_at = CASE WHEN v_is_late THEN now() ELSE attendance_marked_at END,
        updated_at = now()
    WHERE id = p_booking_id;
    -- (confirmed→cancelled 전환 시 trg_notify_waitlist_on_vacancy가 대기자 알림 발송)

    -- 크레딧 환원: 몰수 대상(late + credit_forfeit)이 아니면 차감 원천에만 +1
    v_refund := v_booking.credit_used AND v_booking.membership_id IS NOT NULL
                AND NOT (v_is_late AND v_forfeit);
    IF v_refund THEN
        UPDATE public.memberships
        SET remaining_credits = COALESCE(remaining_credits, 0) + 1, updated_at = now()
        WHERE id = v_booking.membership_id;

        UPDATE public.bookings SET credit_used = false WHERE id = p_booking_id;
    END IF;

    -- 🔄 Phase2 audit: 취소(특히 admin 대리 취소) 기록
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), 'CANCEL_BOOKING', 'bookings', p_booking_id,
            jsonb_build_object('status', v_booking.status, 'member_id', v_booking.member_id,
                               'credit_used', v_booking.credit_used),
            jsonb_build_object('status', 'cancelled', 'reason', p_reason,
                               'late_cancel', v_is_late,
                               'credit_refunded', v_refund, 'by_admin', v_by_admin));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('booking_id', p_booking_id,
                                   'late_cancel', v_is_late,
                                   'credit_forfeited', (v_is_late AND v_forfeit AND v_booking.credit_used),
                                   'credit_refunded', v_refund),
        'error', NULL);
END;
$$;

-- C.3 fn_kiosk_checkin(p_payload) — 신규(계약 보정): 키오스크 QR 체크인 원자 처리
--     payload = {"mid": <member_id>, "fid": <facility_id>, "ts": <epoch초>, "v": 1}
--     anon 실행 허용(키오스크 단말) — 검증은 전부 서버 내부
--     🔄 G-7: 멤버십 유효성 검증 시 plan_kind 무관(standard/drop_in/trial 모두 유효)
--        — as-is의 NO_MEMBERSHIP 거부로 드롭인 체크인 불가하던 분기 해소
CREATE OR REPLACE FUNCTION public.fn_kiosk_checkin(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_facility_id UUID;
    v_ts BIGINT;
    v_member RECORD;
    v_mem RECORD;
    v_booking RECORD;
    v_session RECORD;
    v_checkin_id UUID;
    v_now TIMESTAMPTZ := now();
BEGIN
    -- 1) 페이로드 구조 검증
    BEGIN
        v_member_id   := (p_payload->>'mid')::UUID;
        v_facility_id := (p_payload->>'fid')::UUID;
        v_ts          := (p_payload->>'ts')::BIGINT;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_payload');
    END;
    IF v_member_id IS NULL OR v_facility_id IS NULL OR v_ts IS NULL
       OR COALESCE((p_payload->>'v')::INT, 0) <> 1 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_payload');
    END IF;

    -- 2) QR 만료 검증 (발급 후 5분)
    IF ABS(EXTRACT(EPOCH FROM v_now) - v_ts) > 300 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'qr_expired');
    END IF;

    -- 3) 회원 상태 검증
    SELECT id, name, status, is_blacklisted INTO v_member
    FROM public.members WHERE id = v_member_id;
    IF v_member.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF v_member.status <> 'active' OR v_member.is_blacklisted THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_active');
    END IF;

    -- 3b) G-7 멤버십 유효성: plan_kind 무관 — 기간 유효(기간제) 또는 잔여 크레딧(횟수제)이면 통과.
    --     drop_in(일일권)/trial(체험권)도 memberships 1행으로 발급되므로 같은 규칙으로 유효 처리
    SELECT ms.id, mp.plan_kind, mp.name AS plan_name INTO v_mem
    FROM public.memberships ms
    LEFT JOIN public.membership_plans mp ON mp.id = ms.plan_id
    WHERE ms.member_id = v_member_id
      AND ms.status = 'active'
      AND ms.start_date <= CURRENT_DATE
      AND (ms.end_date IS NULL OR ms.end_date >= CURRENT_DATE)
      AND (ms.remaining_credits IS NULL OR ms.remaining_credits > 0)
    ORDER BY ms.end_date ASC NULLS LAST
    LIMIT 1;

    IF v_mem.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'no_active_membership');
    END IF;

    -- 4) 5분 내 중복 체크인 방지
    IF EXISTS (SELECT 1 FROM public.checkins
               WHERE member_id = v_member_id
                 AND checkin_time > v_now - INTERVAL '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'duplicate_checkin');
    END IF;

    -- 5) ±30분 시작 세션의 confirmed/waitlisted 예약 자동 감지
    SELECT b.id AS booking_id, b.attendance_outcome, s.id AS session_id, s.title
    INTO v_booking
    FROM public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
    WHERE b.member_id = v_member_id
      AND b.status = 'confirmed'
      AND s.facility_id = v_facility_id
      AND s.session_date = CURRENT_DATE
      AND (s.session_date + s.start_time) BETWEEN v_now - INTERVAL '30 minutes'
                                              AND v_now + INTERVAL '30 minutes'
    ORDER BY (s.session_date + s.start_time)
    LIMIT 1;

    -- 6) 체크인 기록 (세션 미감지 시 자유 출입 체크인)
    INSERT INTO public.checkins (booking_id, member_id, session_id, facility_id, checkin_method, checkin_time)
    VALUES (v_booking.booking_id, v_member_id, v_booking.session_id, v_facility_id, 'kiosk', v_now)
    ON CONFLICT (session_id, member_id) WHERE session_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_checkin_id;

    -- 7) 출결 판정 연동: pending → checked_in (코치가 이미 판정한 건 미변경)
    IF v_booking.booking_id IS NOT NULL AND v_booking.attendance_outcome = 'pending' THEN
        UPDATE public.bookings
        SET attendance_outcome = 'checked_in',
            attendance_marked_at = v_now,
            updated_at = v_now
        WHERE id = v_booking.booking_id;
    END IF;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'checkin_id', v_checkin_id,
            'member_name', v_member.name,
            'membership_plan_kind', COALESCE(v_mem.plan_kind, 'standard'),
            'membership_plan_name', v_mem.plan_name,
            'session_id', v_booking.session_id,
            'session_title', v_booking.title,
            'linked_booking', v_booking.booking_id IS NOT NULL,
            'checkin_time', v_now),
        'error', NULL);
END;
$$;

COMMENT ON FUNCTION public.fn_kiosk_checkin(JSONB) IS '키오스크 QR 체크인 원자 처리. 페이로드 {mid,fid,ts,v} 5분 만료, 멤버십 유효 검증(G-7: drop_in/trial 포함), ±30분 예약 자동 감지, anon 실행 허용';


-- ============================================================================
-- [D] 코치 운영 (P0 승계 — wod_description 참조 제거, has_wod 플래그로 대체)
-- ============================================================================

-- D.1 fn_get_my_coach_context() — 코치 연결 상태 단일 진입점
CREATE OR REPLACE FUNCTION public.fn_get_my_coach_context()
RETURNS JSONB
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

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('context_status', v_status, 'linked', true,
                                   'coach_id', v_coach.id, 'coach_name', v_coach.name,
                                   'has_assignments', v_assignment_count > 0,
                                   'assignment_count', v_assignment_count),
        'error', NULL);
END;
$$;

-- D.2 fn_get_my_coach_dashboard() — 당일 세션 + 운영 위험 요약
CREATE OR REPLACE FUNCTION public.fn_get_my_coach_dashboard()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'no_session');
    END IF;
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = v_user_id LIMIT 1;
    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_linked');
    END IF;

    SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'start_time')), '[]'::jsonb) INTO v_today_sessions
    FROM (
        SELECT jsonb_build_object(
            'id', s.id, 'title', s.title, 'session_date', s.session_date,
            'start_time', s.start_time, 'end_time', s.end_time,
            'capacity', s.capacity, 'status', s.status,
            'has_wod', EXISTS (SELECT 1 FROM public.session_wods sw
                               WHERE sw.session_id = s.id AND sw.publish_state = 'published'),
            'booked_count', (SELECT COUNT(*) FROM public.bookings b
                             WHERE b.session_id = s.id AND b.status = 'confirmed'),
            'checkin_count', (SELECT COUNT(*) FROM public.checkins c WHERE c.session_id = s.id),
            'waitlist_count', (SELECT COUNT(*) FROM public.bookings b
                               WHERE b.session_id = s.id AND b.status = 'waitlisted'),
            'unchecked_count', (SELECT COUNT(*) FROM public.bookings b
                                WHERE b.session_id = s.id AND b.status = 'confirmed'
                                  AND b.attendance_outcome = 'pending')
        ) AS t
        FROM public.sessions s
        JOIN public.session_coaches sc ON sc.session_id = s.id
        WHERE sc.coach_id = v_coach_id AND s.session_date = v_today
    ) sub;

    SELECT jsonb_build_object(
        'today_sessions', v_today_sessions,
        'today_total_bookings', (
            SELECT COUNT(*) FROM public.bookings b
            JOIN public.sessions s ON s.id = b.session_id
            JOIN public.session_coaches sc ON sc.session_id = s.id
            WHERE sc.coach_id = v_coach_id AND s.session_date = v_today AND b.status = 'confirmed'),
        'today_total_checkins', (
            SELECT COUNT(*) FROM public.checkins c
            JOIN public.sessions s ON s.id = c.session_id
            JOIN public.session_coaches sc ON sc.session_id = s.id
            WHERE sc.coach_id = v_coach_id AND s.session_date = v_today),
        'week_sessions', (
            SELECT COUNT(DISTINCT s.id) FROM public.sessions s
            JOIN public.session_coaches sc ON sc.session_id = s.id
            WHERE sc.coach_id = v_coach_id
              AND s.session_date >= date_trunc('week', v_today)::date
              AND s.session_date <= (date_trunc('week', v_today) + INTERVAL '6 days')::date),
        'open_followups', (
            SELECT COUNT(*) FROM public.coach_followups cf
            WHERE cf.coach_id = v_coach_id AND cf.status = 'open'),
        'risk_summary', jsonb_build_object(
            'waitlist', (
                SELECT COUNT(*) FROM public.bookings b
                JOIN public.sessions s ON s.id = b.session_id
                JOIN public.session_coaches sc ON sc.session_id = s.id
                WHERE sc.coach_id = v_coach_id AND s.session_date = v_today
                  AND b.status = 'waitlisted'),
            'unchecked_confirmed', (
                SELECT COUNT(*) FROM public.bookings b
                JOIN public.sessions s ON s.id = b.session_id
                JOIN public.session_coaches sc ON sc.session_id = s.id
                WHERE sc.coach_id = v_coach_id AND s.session_date = v_today
                  AND b.status = 'confirmed' AND b.attendance_outcome = 'pending'
                  AND (s.session_date + s.start_time) <= v_now),
            'starting_soon', (
                SELECT COUNT(DISTINCT s.id) FROM public.sessions s
                JOIN public.session_coaches sc ON sc.session_id = s.id
                WHERE sc.coach_id = v_coach_id AND s.session_date = v_today
                  AND (s.session_date + s.start_time) BETWEEN v_now AND v_now + INTERVAL '60 minutes'))
    ) INTO v_summary;

    RETURN jsonb_build_object('success', true, 'data', v_summary, 'error', NULL);
END;
$$;

-- D.3 fn_get_coach_schedule(p_from, p_to) — 기간별 스케줄 + 출결 요약
CREATE OR REPLACE FUNCTION public.fn_get_coach_schedule(p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_coach_id UUID;
    v_sessions JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'no_session');
    END IF;
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = v_user_id LIMIT 1;
    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_linked');
    END IF;
    IF p_from IS NULL OR p_to IS NULL OR p_from > p_to OR p_to - p_from > 92 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_date_range');
    END IF;

    SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'session_date'), (t->>'start_time')), '[]'::jsonb)
    INTO v_sessions
    FROM (
        SELECT jsonb_build_object(
            'id', s.id, 'title', s.title, 'session_date', s.session_date,
            'start_time', s.start_time, 'end_time', s.end_time,
            'capacity', s.capacity, 'status', s.status,
            'has_wod', EXISTS (SELECT 1 FROM public.session_wods sw
                               WHERE sw.session_id = s.id AND sw.publish_state = 'published'),
            'booked_count', (SELECT COUNT(*) FROM public.bookings b
                             WHERE b.session_id = s.id AND b.status = 'confirmed'),
            'waitlist_count', (SELECT COUNT(*) FROM public.bookings b
                               WHERE b.session_id = s.id AND b.status = 'waitlisted'),
            'checkin_count', (SELECT COUNT(*) FROM public.checkins c WHERE c.session_id = s.id),
            'no_show_count', (SELECT COUNT(*) FROM public.bookings b
                              WHERE b.session_id = s.id AND b.attendance_outcome = 'no_show'),
            'late_cancel_count', (SELECT COUNT(*) FROM public.bookings b
                                  WHERE b.session_id = s.id AND b.attendance_outcome = 'late_cancel'),
            'race_linked', EXISTS (SELECT 1 FROM public.race_events re WHERE re.session_id = s.id)
        ) AS t
        FROM public.sessions s
        JOIN public.session_coaches sc ON sc.session_id = s.id
        WHERE sc.coach_id = v_coach_id
          AND s.session_date BETWEEN p_from AND p_to
    ) sub;

    RETURN jsonb_build_object('success', true, 'data', v_sessions, 'error', NULL);
END;
$$;

-- D.4 fn_get_coach_session_board(p_session_id) — 세션 운영 보드 단일 데이터 소스
CREATE OR REPLACE FUNCTION public.fn_get_coach_session_board(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_header JSONB;
    v_coaches JSONB;
    v_attendees JSONB;
    v_summary JSONB;
BEGIN
    v_user_id := public._assert_coach_can_edit_session(p_session_id);

    SELECT s.* INTO v_session FROM public.sessions s WHERE s.id = p_session_id;
    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_found');
    END IF;

    v_header := jsonb_build_object(
        'id', v_session.id, 'title', v_session.title, 'session_date', v_session.session_date,
        'start_time', v_session.start_time, 'end_time', v_session.end_time,
        'capacity', v_session.capacity, 'status', v_session.status,
        'facility_id', v_session.facility_id, 'class_type', v_session.class_type,
        'has_wod', EXISTS (SELECT 1 FROM public.session_wods sw
                           WHERE sw.session_id = v_session.id AND sw.publish_state = 'published'),
        'race_linked', EXISTS (SELECT 1 FROM public.race_events re WHERE re.session_id = v_session.id));

    SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'display_order')::int, t->>'coach_name'), '[]'::jsonb)
    INTO v_coaches
    FROM (
        SELECT jsonb_build_object(
            'coach_id', c.id, 'coach_name', c.name, 'profile_image_url', c.profile_image_url,
            'assignment_role', sc.assignment_role, 'display_order', sc.display_order) AS t
        FROM public.session_coaches sc
        JOIN public.coaches c ON c.id = sc.coach_id
        WHERE sc.session_id = p_session_id
    ) sub;

    SELECT COALESCE(jsonb_agg(t ORDER BY t->>'booking_status', t->>'member_name'), '[]'::jsonb)
    INTO v_attendees
    FROM (
        SELECT jsonb_build_object(
            'booking_id', b.id, 'member_id', b.member_id, 'member_name', m.name,
            'avatar_url', m.avatar_url,
            'booking_status', b.status, 'booking_type', b.booking_type,
            'attendance_outcome', b.attendance_outcome,
            'attendance_marked_at', b.attendance_marked_at,
            'checked_in', (c.id IS NOT NULL), 'checkin_time', c.checkin_time,
            'active_flags', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'flag_type', f.flag_type, 'severity', f.severity)), '[]'::jsonb)
                FROM public.member_alert_flags f
                WHERE f.member_id = b.member_id AND f.resolved_at IS NULL
                  AND (f.ends_at IS NULL OR f.ends_at > now()))
        ) AS t
        FROM public.bookings b
        JOIN public.members m ON m.id = b.member_id
        LEFT JOIN public.checkins c ON c.session_id = b.session_id AND c.member_id = b.member_id
        WHERE b.session_id = p_session_id AND b.status IN ('confirmed','waitlisted')
    ) sub;

    SELECT jsonb_build_object(
        'confirmed',     COUNT(*) FILTER (WHERE b.status = 'confirmed'),
        'waitlisted',    COUNT(*) FILTER (WHERE b.status = 'waitlisted'),
        'checked_in',    COUNT(*) FILTER (WHERE b.attendance_outcome = 'checked_in'),
        'no_show',       COUNT(*) FILTER (WHERE b.attendance_outcome = 'no_show'),
        'late_cancel',   COUNT(*) FILTER (WHERE b.attendance_outcome = 'late_cancel'),
        'coach_excused', COUNT(*) FILTER (WHERE b.attendance_outcome = 'coach_excused'),
        'walk_in',       COUNT(*) FILTER (WHERE b.attendance_outcome = 'walk_in'),
        'pending',       COUNT(*) FILTER (WHERE b.attendance_outcome = 'pending' AND b.status = 'confirmed'))
    INTO v_summary
    FROM public.bookings b WHERE b.session_id = p_session_id;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('session', v_header, 'coaches', v_coaches,
                                   'attendees', v_attendees, 'summary', v_summary),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.5 fn_mark_attendance(p_session_id, p_items) — 🔄 단건+일괄 통합 (mark+bulk_mark 대체)
--     p_items = [{"member_id": "...", "action": "checked_in|no_show|late_cancel|coach_excused|walk_in"}]
--     단건 = 원소 1개 배열. 부분 성공 반환.
CREATE OR REPLACE FUNCTION public.fn_mark_attendance(p_session_id UUID, p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_item JSONB;
    v_member_id UUID;
    v_action TEXT;
    v_booking_id UUID;
    v_old_outcome TEXT;
    v_now TIMESTAMPTZ := now();
    v_results JSONB := '[]'::jsonb;
    v_ok INT := 0;
    v_fail INT := 0;
BEGIN
    v_user_id := public._assert_coach_can_edit_session(p_session_id);

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'items_must_be_array');
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        BEGIN
            v_member_id := NULLIF(v_item->>'member_id','')::UUID;
            v_action    := v_item->>'action';
            v_old_outcome := NULL;

            IF v_member_id IS NULL
               OR v_action NOT IN ('checked_in','no_show','late_cancel','coach_excused','walk_in') THEN
                RAISE EXCEPTION 'invalid_item';
            END IF;

            SELECT id, attendance_outcome INTO v_booking_id, v_old_outcome FROM public.bookings
            WHERE session_id = p_session_id AND member_id = v_member_id;

            -- walk_in: 예약 없는 현장 참가 — booking 생성
            IF v_booking_id IS NULL THEN
                IF v_action = 'walk_in' THEN
                    INSERT INTO public.bookings (session_id, member_id, status,
                                                 attendance_outcome, attendance_marked_at, attendance_marked_by)
                    VALUES (p_session_id, v_member_id, 'confirmed', 'walk_in', v_now, v_user_id)
                    RETURNING id INTO v_booking_id;
                ELSE
                    RAISE EXCEPTION 'booking_not_found';
                END IF;
            ELSE
                UPDATE public.bookings
                SET attendance_outcome = v_action,
                    attendance_marked_at = v_now,
                    attendance_marked_by = v_user_id,
                    updated_at = v_now
                WHERE id = v_booking_id;
            END IF;

            -- checked_in/walk_in 판정 시 체크인 사실 기록 (멱등 — 부분 유니크로 중복 무시)
            IF v_action IN ('checked_in','walk_in') THEN
                INSERT INTO public.checkins (booking_id, member_id, session_id, checkin_method, checkin_time)
                VALUES (v_booking_id, v_member_id, p_session_id, 'manual_coach', v_now)
                ON CONFLICT (session_id, member_id) WHERE session_id IS NOT NULL DO NOTHING;
            END IF;

            -- 🔄 Phase2 audit: 출결 판정 변경(정산 basis 영향) — 각 item 단위 old/new 기록
            INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
            VALUES (v_user_id, 'MARK_ATTENDANCE', 'bookings', v_booking_id,
                    jsonb_build_object('attendance_outcome', v_old_outcome),
                    jsonb_build_object('session_id', p_session_id, 'member_id', v_member_id,
                                       'attendance_outcome', v_action));

            v_ok := v_ok + 1;
            v_results := v_results || jsonb_build_array(jsonb_build_object(
                'member_id', v_member_id, 'action', v_action, 'success', true, 'error', NULL));
        EXCEPTION WHEN OTHERS THEN
            v_fail := v_fail + 1;
            v_results := v_results || jsonb_build_array(jsonb_build_object(
                'member_id', v_item->>'member_id', 'action', v_item->>'action',
                'success', false, 'error', SQLERRM));
        END;
    END LOOP;

    RETURN jsonb_build_object('success', v_fail = 0,
        'data', jsonb_build_object('success_count', v_ok, 'failure_count', v_fail,
                                   'results', v_results),
        'error', CASE WHEN v_fail = 0 THEN NULL ELSE 'partial_failure' END);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;


-- ============================================================================
-- [E] WOD (P1-A 승계 + fn_get_wod_template/fn_publish_wod_template 신설)
-- ============================================================================

-- E.1 fn_search_wod_movements — 코치 편집기용 경량 검색
CREATE OR REPLACE FUNCTION public.fn_search_wod_movements(
    p_query TEXT DEFAULT NULL, p_category TEXT DEFAULT NULL,
    p_equipment TEXT DEFAULT NULL, p_limit INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_results JSONB;
BEGIN
    PERFORM public._assert_coach_or_admin();
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.name_ko), '[]'::jsonb) INTO v_results
    FROM (
        SELECT m.id, m.slug, m.name_ko, m.name_en, m.category, m.equipment,
               m.difficulty_level, m.primary_muscles, m.coaching_points, m.thumbnail_url
        FROM public.movement_library m
        WHERE m.is_active
          AND (p_query IS NULL OR p_query = '' OR
               m.name_ko ILIKE '%'||p_query||'%' OR m.name_en ILIKE '%'||p_query||'%'
               OR m.slug ILIKE '%'||p_query||'%')
          AND (p_category IS NULL OR p_category = '' OR m.category = p_category)
          AND (p_equipment IS NULL OR p_equipment = '' OR m.equipment @> ARRAY[p_equipment])
        ORDER BY m.name_ko
        LIMIT GREATEST(p_limit, 1)
    ) t;
    RETURN jsonb_build_object('success', true, 'data', v_results, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- E.2 fn_list_movement_library — Admin 관리용(카테고리 조인 + 사용 수 + 페이지네이션)
CREATE OR REPLACE FUNCTION public.fn_list_movement_library(
    p_query TEXT DEFAULT NULL, p_category TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL, p_limit INT DEFAULT 100, p_offset INT DEFAULT 0)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public._assert_coach_or_admin();
    SELECT jsonb_build_object(
        'success', true,
        'data', COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb),
        'total', COALESCE(MAX(t.full_count), 0),
        'error', NULL)
    INTO v_result
    FROM (
        SELECT ml.id, ml.slug, ml.name_ko, ml.name_en, ml.category, ml.equipment,
               ml.difficulty_level, ml.primary_muscles, ml.coaching_points, ml.source_tag,
               ml.is_active, ml.thumbnail_url, ml.video_url, ml.created_at, ml.updated_at,
               COALESCE((SELECT COUNT(*) FROM public.wod_template_movements wtm
                         WHERE wtm.movement_id = ml.id), 0)::INT AS wod_usage_count,
               mc.name_ko AS category_name_ko, mc.name_en AS category_name_en,
               mc.color AS category_color,
               COUNT(*) OVER() AS full_count
        FROM public.movement_library ml
        LEFT JOIN public.movement_categories mc ON mc.slug = ml.category
        WHERE (p_is_active IS NULL OR ml.is_active = p_is_active)
          AND (p_category IS NULL OR ml.category = p_category)
          AND (p_query IS NULL OR ml.slug ILIKE '%'||p_query||'%'
               OR ml.name_ko ILIKE '%'||p_query||'%' OR ml.name_en ILIKE '%'||p_query||'%')
        ORDER BY mc.sort_order NULLS LAST, ml.name_ko
        LIMIT p_limit OFFSET p_offset
    ) t;
    RETURN COALESCE(v_result, jsonb_build_object('success', true, 'data', '[]'::jsonb, 'total', 0, 'error', NULL));
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- E.3 fn_list_wod_templates — 템플릿 목록(+movement lines)
CREATE OR REPLACE FUNCTION public.fn_list_wod_templates(
    p_scope TEXT DEFAULT 'shared', p_facility_id UUID DEFAULT NULL, p_template_kind TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_results JSONB;
BEGIN
    PERFORM public._assert_coach_or_admin();
    SELECT COALESCE(jsonb_agg(t.tpl ORDER BY t.title), '[]'::jsonb) INTO v_results
    FROM (
        SELECT wt.title,
               to_jsonb(wt) || jsonb_build_object('movements', (
                   SELECT COALESCE(jsonb_agg(jsonb_build_object(
                       'id', m.id, 'sort_order', m.sort_order, 'movement_id', m.movement_id,
                       'movement_name_ko', ml.name_ko, 'movement_name_en', ml.name_en,
                       'custom_label', m.custom_label, 'target_value', m.target_value,
                       'target_unit', m.target_unit, 'distance_meters', m.distance_meters,
                       'duration_seconds', m.duration_seconds,
                       'load_male_rx', m.load_male_rx, 'load_female_rx', m.load_female_rx,
                       'rx_notes', m.rx_notes, 'scaling_notes', m.scaling_notes
                   ) ORDER BY m.sort_order), '[]'::jsonb)
                   FROM public.wod_template_movements m
                   LEFT JOIN public.movement_library ml ON ml.id = m.movement_id
                   WHERE m.wod_template_id = wt.id)) AS tpl
        FROM public.wod_templates wt
        WHERE CASE
                WHEN p_scope = 'shared'    THEN wt.is_shared OR wt.facility_id IS NULL
                WHEN p_scope = 'facility'  THEN wt.facility_id = p_facility_id
                WHEN p_scope = 'benchmark' THEN wt.is_benchmark
                ELSE true
              END
          AND (p_template_kind IS NULL OR wt.template_kind = p_template_kind)
        ORDER BY wt.title
        LIMIT 200
    ) t;
    RETURN jsonb_build_object('success', true, 'data', v_results, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- E.4 fn_get_wod_template(p_template_id) — 단건 상세 (신설 — 계약 §4)
CREATE OR REPLACE FUNCTION public.fn_get_wod_template(p_template_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    PERFORM public._assert_coach_or_admin();
    SELECT to_jsonb(wt) || jsonb_build_object('movements', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', m.id, 'sort_order', m.sort_order, 'movement_id', m.movement_id,
            'movement_name_ko', ml.name_ko, 'custom_label', m.custom_label,
            'target_value', m.target_value, 'target_unit', m.target_unit,
            'distance_meters', m.distance_meters, 'duration_seconds', m.duration_seconds,
            'load_male_rx', m.load_male_rx, 'load_female_rx', m.load_female_rx,
            'rx_notes', m.rx_notes, 'scaling_notes', m.scaling_notes
        ) ORDER BY m.sort_order), '[]'::jsonb)
        FROM public.wod_template_movements m
        LEFT JOIN public.movement_library ml ON ml.id = m.movement_id
        WHERE m.wod_template_id = wt.id))
    INTO v_data
    FROM public.wod_templates wt WHERE wt.id = p_template_id;

    IF v_data IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'template_not_found');
    END IF;
    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- E.5 fn_upsert_wod_template(p_payload) — 생성/수정 + movement line 전체 교체(멱등)
CREATE OR REPLACE FUNCTION public.fn_upsert_wod_template(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
    v_movement JSONB;
    v_idx INT := 0;
BEGIN
    v_user_id := public._assert_coach_or_admin();
    v_id := NULLIF(p_payload->>'id','')::UUID;

    IF v_id IS NULL THEN
        INSERT INTO public.wod_templates (
            facility_id, template_kind, title, format_type, time_cap_minutes, rounds,
            description, public_notes, coach_notes, is_shared, is_benchmark, created_by, updated_by)
        VALUES (
            NULLIF(p_payload->>'facility_id','')::UUID,
            COALESCE(p_payload->>'template_kind','daily'),
            p_payload->>'title',
            NULLIF(p_payload->>'format_type',''),
            (p_payload->>'time_cap_minutes')::INT,
            (p_payload->>'rounds')::INT,
            p_payload->>'description', p_payload->>'public_notes', p_payload->>'coach_notes',
            COALESCE((p_payload->>'is_shared')::BOOLEAN, false),
            COALESCE((p_payload->>'is_benchmark')::BOOLEAN, false),
            v_user_id, v_user_id)
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.wod_templates SET
            facility_id      = NULLIF(p_payload->>'facility_id','')::UUID,
            template_kind    = COALESCE(p_payload->>'template_kind', template_kind),
            title            = COALESCE(p_payload->>'title', title),
            format_type      = NULLIF(p_payload->>'format_type',''),
            time_cap_minutes = (p_payload->>'time_cap_minutes')::INT,
            rounds           = (p_payload->>'rounds')::INT,
            description      = p_payload->>'description',
            public_notes     = p_payload->>'public_notes',
            coach_notes      = p_payload->>'coach_notes',
            is_shared        = COALESCE((p_payload->>'is_shared')::BOOLEAN, is_shared),
            is_benchmark     = COALESCE((p_payload->>'is_benchmark')::BOOLEAN, is_benchmark),
            updated_by       = v_user_id,
            updated_at       = now()
        WHERE id = v_id;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'template_not_found');
        END IF;
    END IF;

    DELETE FROM public.wod_template_movements WHERE wod_template_id = v_id;
    FOR v_movement IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'movements','[]'::jsonb))
    LOOP
        INSERT INTO public.wod_template_movements (
            wod_template_id, sort_order, movement_id, custom_label,
            target_value, target_unit, distance_meters, duration_seconds,
            load_male_rx, load_female_rx, rx_notes, scaling_notes)
        VALUES (
            v_id, v_idx,
            NULLIF(v_movement->>'movement_id','')::UUID,
            v_movement->>'custom_label',
            (v_movement->>'target_value')::NUMERIC,
            v_movement->>'target_unit',
            (v_movement->>'distance_meters')::INT,
            (v_movement->>'duration_seconds')::INT,
            v_movement->>'load_male_rx', v_movement->>'load_female_rx',
            v_movement->>'rx_notes', v_movement->>'scaling_notes');
        v_idx := v_idx + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- E.6 fn_publish_wod_template(p_template_id) — 템플릿 발행 (신설 — 계약 §4)
CREATE OR REPLACE FUNCTION public.fn_publish_wod_template(p_template_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := public._assert_coach_or_admin();
    UPDATE public.wod_templates
    SET published_at = now(), updated_by = v_user_id, updated_at = now()
    WHERE id = p_template_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'template_not_found');
    END IF;
    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('id', p_template_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- E.7 fn_get_session_wod(p_session_id) — 세션 WOD 조회(편집/미리보기 공통)
CREATE OR REPLACE FUNCTION public.fn_get_session_wod(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    PERFORM public._assert_coach_or_admin();
    SELECT to_jsonb(sw) || jsonb_build_object(
        'template', CASE WHEN sw.template_id IS NULL THEN NULL ELSE
            (SELECT to_jsonb(wt) FROM public.wod_templates wt WHERE wt.id = sw.template_id) END)
    INTO v_data
    FROM public.session_wods sw WHERE sw.session_id = p_session_id;

    RETURN jsonb_build_object('success', true,
        'data', COALESCE(v_data, jsonb_build_object('session_id', p_session_id, 'publish_state', 'none')),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- E.8 fn_upsert_session_wod(p_session_id, p_payload) — draft 작성/오버라이드
CREATE OR REPLACE FUNCTION public.fn_upsert_session_wod(p_session_id UUID, p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := public._assert_coach_can_edit_session(p_session_id);

    INSERT INTO public.session_wods (
        session_id, template_id, publish_state, title_override, format_override,
        time_cap_override, description_override, movements_snapshot,
        coach_notes, class_display_notes, edited_by)
    VALUES (
        p_session_id,
        NULLIF(p_payload->>'template_id','')::UUID,
        'draft',
        p_payload->>'title_override',
        NULLIF(p_payload->>'format_override',''),
        (p_payload->>'time_cap_override')::INT,
        p_payload->>'description_override',
        COALESCE(p_payload->'movements_snapshot','[]'::jsonb),
        p_payload->>'coach_notes',
        p_payload->>'class_display_notes',
        v_user_id)
    ON CONFLICT (session_id) DO UPDATE SET
        template_id          = EXCLUDED.template_id,
        title_override       = EXCLUDED.title_override,
        format_override      = EXCLUDED.format_override,
        time_cap_override    = EXCLUDED.time_cap_override,
        description_override = EXCLUDED.description_override,
        movements_snapshot   = EXCLUDED.movements_snapshot,
        coach_notes          = EXCLUDED.coach_notes,
        class_display_notes  = EXCLUDED.class_display_notes,
        edited_by            = v_user_id,
        updated_at           = now()
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- E.9 fn_publish_session_wod(p_session_id) — draft → published
CREATE OR REPLACE FUNCTION public.fn_publish_session_wod(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := public._assert_coach_can_edit_session(p_session_id);
    UPDATE public.session_wods
    SET publish_state = 'published',
        source_version = source_version + 1,
        published_by = v_user_id, published_at = now(), updated_at = now()
    WHERE session_id = p_session_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_wod_not_found');
    END IF;
    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- E.10 fn_get_class_display_wod(p_facility_id, p_date) — Class TV용 (🔄 anon 허용)
--      Display-Safe: published 스냅샷 + 공개 필드만 SELECT (개인정보 원천 미포함)
CREATE OR REPLACE FUNCTION public.fn_get_class_display_wod(
    p_facility_id UUID DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE,
    p_session_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'session_id', sw.session_id, 'session_title', s.title,
        'session_date', s.session_date, 'session_start', s.start_time, 'session_end', s.end_time,
        'wod_id', sw.id,
        'title', COALESCE(sw.title_override, wt.title),
        'format', COALESCE(sw.format_override, wt.format_type),
        'time_cap_minutes', COALESCE(sw.time_cap_override, wt.time_cap_minutes),
        'rounds', wt.rounds,
        'description', COALESCE(sw.description_override, wt.description),
        'movements_snapshot', sw.movements_snapshot,
        'class_display_notes', sw.class_display_notes,
        'published_at', sw.published_at)
    INTO v_data
    FROM public.session_wods sw
    JOIN public.sessions s ON s.id = sw.session_id
    LEFT JOIN public.wod_templates wt ON wt.id = sw.template_id
    WHERE sw.publish_state = 'published'
      AND (p_session_id IS NULL OR sw.session_id = p_session_id)
      AND (p_session_id IS NOT NULL OR s.session_date = p_date)
      AND (p_facility_id IS NULL OR s.facility_id = p_facility_id)
    ORDER BY s.session_date DESC, s.start_time DESC, sw.published_at DESC
    LIMIT 1;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;


-- ============================================================================
-- [F] 런시트 (P1-A 승계)
-- ============================================================================

-- F.1 fn_list_runbook_templates
CREATE OR REPLACE FUNCTION public.fn_list_runbook_templates(
    p_facility_id UUID DEFAULT NULL, p_class_type TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    PERFORM public._assert_coach_or_admin();
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.is_default DESC, t.name), '[]'::jsonb)
    INTO v_data
    FROM public.class_runbook_templates t
    WHERE (p_facility_id IS NULL OR t.facility_id = p_facility_id)
      AND (p_class_type IS NULL OR t.class_type = p_class_type);
    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- F.2 fn_upsert_runbook_template(p_payload)
CREATE OR REPLACE FUNCTION public.fn_upsert_runbook_template(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := public._assert_coach_or_admin();
    v_id := NULLIF(p_payload->>'id','')::UUID;

    IF v_id IS NULL THEN
        INSERT INTO public.class_runbook_templates (
            facility_id, class_type, name, warmup, movement_prep, scaling_options,
            coach_cues, safety_notes, finish_notes, default_wod_template_id, is_default,
            created_by, updated_by)
        VALUES (
            (p_payload->>'facility_id')::UUID,
            NULLIF(p_payload->>'class_type',''),
            p_payload->>'name', p_payload->>'warmup', p_payload->>'movement_prep',
            p_payload->>'scaling_options', p_payload->>'coach_cues',
            p_payload->>'safety_notes', p_payload->>'finish_notes',
            NULLIF(p_payload->>'default_wod_template_id','')::UUID,
            COALESCE((p_payload->>'is_default')::BOOLEAN, false),
            v_user_id, v_user_id)
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.class_runbook_templates SET
            class_type              = NULLIF(p_payload->>'class_type',''),
            name                    = COALESCE(p_payload->>'name', name),
            warmup                  = p_payload->>'warmup',
            movement_prep           = p_payload->>'movement_prep',
            scaling_options         = p_payload->>'scaling_options',
            coach_cues              = p_payload->>'coach_cues',
            safety_notes            = p_payload->>'safety_notes',
            finish_notes            = p_payload->>'finish_notes',
            default_wod_template_id = NULLIF(p_payload->>'default_wod_template_id','')::UUID,
            is_default              = COALESCE((p_payload->>'is_default')::BOOLEAN, is_default),
            updated_by              = v_user_id,
            updated_at              = now()
        WHERE id = v_id;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'runbook_template_not_found');
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- F.3 fn_get_session_runbook(p_session_id) — 오버라이드 + 상속 템플릿 동시 반환
CREATE OR REPLACE FUNCTION public.fn_get_session_runbook(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    PERFORM public._assert_coach_or_admin();
    SELECT jsonb_build_object(
        'runbook', to_jsonb(sr),
        'template', CASE WHEN sr.template_id IS NULL THEN NULL ELSE
            (SELECT to_jsonb(t) FROM public.class_runbook_templates t WHERE t.id = sr.template_id) END)
    INTO v_data
    FROM public.session_runbooks sr WHERE sr.session_id = p_session_id;

    RETURN jsonb_build_object('success', true,
        'data', COALESCE(v_data, jsonb_build_object('runbook', NULL, 'template', NULL)),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- F.4 fn_upsert_session_runbook(p_session_id, p_payload)
CREATE OR REPLACE FUNCTION public.fn_upsert_session_runbook(p_session_id UUID, p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := public._assert_coach_can_edit_session(p_session_id);

    INSERT INTO public.session_runbooks (
        session_id, template_id, session_wod_id,
        warmup_override, movement_prep_override, scaling_override,
        cue_override, safety_override, finish_note_override, published_at, updated_by)
    VALUES (
        p_session_id,
        NULLIF(p_payload->>'template_id','')::UUID,
        NULLIF(p_payload->>'session_wod_id','')::UUID,
        p_payload->>'warmup_override', p_payload->>'movement_prep_override',
        p_payload->>'scaling_override', p_payload->>'cue_override',
        p_payload->>'safety_override', p_payload->>'finish_note_override',
        CASE WHEN COALESCE((p_payload->>'publish')::BOOLEAN, false) THEN now() END,
        v_user_id)
    ON CONFLICT (session_id) DO UPDATE SET
        template_id            = EXCLUDED.template_id,
        session_wod_id         = EXCLUDED.session_wod_id,
        warmup_override        = EXCLUDED.warmup_override,
        movement_prep_override = EXCLUDED.movement_prep_override,
        scaling_override       = EXCLUDED.scaling_override,
        cue_override           = EXCLUDED.cue_override,
        safety_override        = EXCLUDED.safety_override,
        finish_note_override   = EXCLUDED.finish_note_override,
        published_at           = COALESCE(EXCLUDED.published_at, public.session_runbooks.published_at),
        updated_by             = v_user_id,
        updated_at             = now()
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;


-- ============================================================================
-- [G] 회원 컨텍스트
-- ============================================================================

-- G.1 fn_get_member_context_panel(p_member_id) — 회원 종합 컨텍스트
--     (🔄 fn_list_member_alert_flags 흡수 — active_flags 포함, member_notes 통합 반영)
CREATE OR REPLACE FUNCTION public.fn_get_member_context_panel(p_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member JSONB;
    v_flags JSONB;
    v_notes JSONB;
    v_attendance JSONB;
    v_membership JSONB;
    v_followups JSONB;
BEGIN
    PERFORM public._assert_coach_or_admin();

    SELECT jsonb_build_object(
        'id', m.id, 'name', m.name, 'phone', m.phone, 'birthday', m.birthday,
        'avatar_url', m.avatar_url, 'status', m.status, 'facility_id', m.facility_id,
        'created_at', m.created_at)
    INTO v_member
    FROM public.members m WHERE m.id = p_member_id;

    IF v_member IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.severity DESC, f.created_at DESC), '[]'::jsonb)
    INTO v_flags
    FROM public.member_alert_flags f
    WHERE f.member_id = p_member_id AND f.resolved_at IS NULL
      AND (f.ends_at IS NULL OR f.ends_at > now());

    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_notes
    FROM (
        SELECT n.id, n.note_type, n.author_role, n.content, n.created_at,
               COALESCE(c.name, p.name) AS author_name
        FROM public.member_notes n
        LEFT JOIN public.coaches c ON c.user_id = n.author_id
        LEFT JOIN public.profiles p ON p.id = n.author_id
        WHERE n.member_id = p_member_id
        ORDER BY n.created_at DESC
        LIMIT 5
    ) t;

    SELECT jsonb_build_object(
        'total_checkins', COUNT(*),
        'last_checkin', MAX(c.checkin_time),
        'thirty_day_count', COUNT(*) FILTER (WHERE c.checkin_time > now() - INTERVAL '30 days'))
    INTO v_attendance
    FROM public.checkins c WHERE c.member_id = p_member_id;

    SELECT jsonb_build_object(
        'plan_name', mp.name, 'end_date', ms.end_date, 'status', ms.status,
        'remaining_credits', ms.remaining_credits,
        'days_until_expiry', GREATEST(0, (ms.end_date - CURRENT_DATE)))
    INTO v_membership
    FROM public.memberships ms
    LEFT JOIN public.membership_plans mp ON mp.id = ms.plan_id
    WHERE ms.member_id = p_member_id AND ms.status = 'active'
    ORDER BY ms.end_date DESC NULLS LAST
    LIMIT 1;

    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_followups
    FROM (
        SELECT cf.id, cf.followup_type, cf.priority, cf.due_date, cf.note
        FROM public.coach_followups cf
        WHERE cf.member_id = p_member_id AND cf.status = 'open'
        ORDER BY cf.due_date ASC NULLS LAST
        LIMIT 5
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'member', v_member, 'active_flags', v_flags, 'recent_notes', v_notes,
            'attendance', COALESCE(v_attendance,
                jsonb_build_object('total_checkins',0,'last_checkin',NULL,'thirty_day_count',0)),
            'active_membership', v_membership,
            'open_followups', v_followups),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- G.2 fn_upsert_member_alert_flag(p_member_id, p_payload)
CREATE OR REPLACE FUNCTION public.fn_upsert_member_alert_flag(p_member_id UUID, p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
    v_created BOOLEAN := false;
BEGIN
    v_user_id := public._assert_coach_or_admin();
    v_id := NULLIF(p_payload->>'id','')::UUID;

    IF v_id IS NULL THEN
        v_created := true;
        INSERT INTO public.member_alert_flags (member_id, flag_type, severity, starts_at, ends_at, note, created_by)
        VALUES (
            p_member_id,
            p_payload->>'flag_type',
            COALESCE(p_payload->>'severity','info'),
            COALESCE((p_payload->>'starts_at')::TIMESTAMPTZ, now()),
            (p_payload->>'ends_at')::TIMESTAMPTZ,
            p_payload->>'note',
            v_user_id)
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.member_alert_flags SET
            flag_type   = COALESCE(p_payload->>'flag_type', flag_type),
            severity    = COALESCE(p_payload->>'severity', severity),
            starts_at   = COALESCE((p_payload->>'starts_at')::TIMESTAMPTZ, starts_at),
            ends_at     = (p_payload->>'ends_at')::TIMESTAMPTZ,
            note        = p_payload->>'note',
            resolved_at = CASE WHEN COALESCE((p_payload->>'resolved')::BOOLEAN, false) THEN now() END,
            resolved_by = CASE WHEN COALESCE((p_payload->>'resolved')::BOOLEAN, false) THEN v_user_id END,
            updated_at  = now()
        WHERE id = v_id AND member_id = p_member_id;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'flag_not_found');
        END IF;
    END IF;

    -- 🔄 Phase2 audit: 경고 플래그 생성/변경 기록
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (v_user_id,
            CASE WHEN v_created THEN 'CREATE_MEMBER_ALERT_FLAG' ELSE 'UPDATE_MEMBER_ALERT_FLAG' END,
            'member_alert_flags', v_id,
            jsonb_build_object('member_id', p_member_id, 'payload', p_payload));

    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;


-- ============================================================================
-- [H] KPI / 정산
-- ============================================================================

-- H.1 fn_get_coach_monthly_report(p_year_month, p_sections, p_coach_id)
--     🔄 P1-B 3종(settlement_basis + kpis + retention_panel) 통합 — 섹션 파라미터 선택
--     🔄 P2B: p_coach_id 추가 — NULL=본인(coach 앱), 값 지정=is_admin() 검증 후 해당 코치(Admin 월별 상세)
--     (마이그레이션: 20260708070000_coach_monthly_report_admin_scope — 2-인자 DROP 후 재생성)
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
    -- 대상 코치 스코프: NULL=본인(auth.uid()), 값=Admin 지정(is_admin() 필수)
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

-- H.2 fn_calculate_monthly_settlement(p_year_month) — Admin 월 정산 스냅샷 생성/갱신
--     🔄 p_admin_user_id 파라미터 제거, cancelled 세션 제외(as-is 무필터 집계 버그 수정)
CREATE OR REPLACE FUNCTION public.fn_calculate_monthly_settlement(p_year_month TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_start DATE;
    v_end DATE;
    v_coach RECORD;
    v_count INT;
    v_total INT;
    v_processed INT := 0;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF p_year_month IS NULL OR p_year_month !~ '^\d{4}-\d{2}$' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_year_month');
    END IF;

    v_start := (p_year_month || '-01')::DATE;
    v_end   := (v_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    FOR v_coach IN
        SELECT id, COALESCE(base_salary,0) AS base_salary,
               COALESCE(session_allowance,0) AS session_allowance
        FROM public.coaches WHERE status = 'active'
    LOOP
        SELECT COUNT(DISTINCT sc.session_id) INTO v_count
        FROM public.session_coaches sc
        JOIN public.sessions s ON s.id = sc.session_id
        WHERE sc.coach_id = v_coach.id
          AND s.session_date BETWEEN v_start AND v_end
          AND s.status <> 'cancelled';

        v_total := v_coach.base_salary + v_count * v_coach.session_allowance;

        INSERT INTO public.coach_settlements
            (coach_id, year_month, base_salary, session_count, session_allowance, total_amount, status)
        VALUES (v_coach.id, p_year_month, v_coach.base_salary, v_count, v_coach.session_allowance, v_total, 'pending')
        ON CONFLICT (coach_id, year_month) DO UPDATE SET
            base_salary       = EXCLUDED.base_salary,
            session_count     = EXCLUDED.session_count,
            session_allowance = EXCLUDED.session_allowance,
            total_amount      = EXCLUDED.total_amount
            -- status는 갱신하지 않음: confirmed/paid 스냅샷 보호
        WHERE public.coach_settlements.status = 'pending';

        v_processed := v_processed + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('year_month', p_year_month, 'coaches_processed', v_processed),
        'error', NULL);
END;
$$;


-- H.3 fn_calculate_refund(p_transaction_id, p_membership_id) — 환불 예상액 서버 계산 (Admin)
--     【결제 안전 불변식 🔒-3】 환불 금액은 이 함수만이 산정한다 — 클라이언트 입력값 불신.
--     G-8(계약 §6b): 환불금 = 결제금액 − 이용분 해당액 − min(위약금, 결제금액×10%).
--     refund_policy.penalty_rate_cap 오버라이드가 있어도 0.10 초과분은 함수가 강제 캡.
--     기간제 = 이용일수 비례 / 횟수제(end_date 없음) = 사용 크레딧 비례.
CREATE OR REPLACE FUNCTION public.fn_calculate_refund(p_transaction_id UUID, p_membership_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_tx          RECORD;
    v_ms          RECORD;
    v_rate        NUMERIC;
    v_total_days  INT;
    v_used_days   INT;
    v_used_amount NUMERIC;
    v_penalty     NUMERIC;
    v_refund      NUMERIC;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    SELECT t.id, t.amount, t.status, t.membership_id
      INTO v_tx
      FROM public.transactions t
     WHERE t.id = p_transaction_id;
    IF v_tx.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'transaction_not_found');
    END IF;
    IF v_tx.status <> 'completed' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'transaction_not_refundable');
    END IF;
    IF v_tx.membership_id IS NOT NULL AND v_tx.membership_id <> p_membership_id THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'membership_mismatch');
    END IF;

    SELECT m.id, m.start_date, m.end_date, m.remaining_credits,
           COALESCE(mp.refund_policy, '{}'::jsonb) AS refund_policy,
           mp.credit_count
      INTO v_ms
      FROM public.memberships m
      LEFT JOIN public.membership_plans mp ON mp.id = m.plan_id
     WHERE m.id = p_membership_id;
    IF v_ms.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'membership_not_found');
    END IF;

    -- 위약금율: 정책 오버라이드 허용하되 10% 강제 캡 (chk_refund_penalty_cap과 이중 방어)
    v_rate := LEAST(COALESCE((v_ms.refund_policy->>'penalty_rate_cap')::NUMERIC, 0.10), 0.10);

    IF v_ms.end_date IS NOT NULL THEN
        -- 기간제: 이용일수 비례 (시작 전 해지 = 이용분 0)
        v_total_days  := GREATEST(v_ms.end_date - v_ms.start_date + 1, 1);
        v_used_days   := LEAST(GREATEST(CURRENT_DATE - v_ms.start_date + 1, 0), v_total_days);
        v_used_amount := round(v_tx.amount * v_used_days / v_total_days);
    ELSE
        -- 횟수제: 사용 크레딧 비례
        v_total_days  := COALESCE(v_ms.credit_count, 0);
        v_used_days   := GREATEST(COALESCE(v_ms.credit_count, 0) - COALESCE(v_ms.remaining_credits, 0), 0);
        v_used_amount := CASE WHEN COALESCE(v_ms.credit_count, 0) > 0
                              THEN round(v_tx.amount * v_used_days / v_ms.credit_count)
                              ELSE 0 END;
    END IF;

    v_penalty := LEAST(round(v_tx.amount * v_rate), v_tx.amount);
    v_refund  := GREATEST(v_tx.amount - v_used_amount - v_penalty, 0);

    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object(
        'refund_amount',      v_refund,
        'penalty_amount',     v_penalty,
        'penalty_rate',       v_rate,
        'used_amount',        v_used_amount,
        'used_days',          v_used_days,          -- 횟수제는 사용 크레딧 수
        'total_days',         v_total_days,         -- 횟수제는 총 크레딧 수
        'basis',              CASE WHEN v_ms.end_date IS NOT NULL THEN 'period' ELSE 'credit' END,
        'transaction_amount', v_tx.amount
    ), 'error', NULL);
END;
$$;


-- ============================================================================
-- [I] 퍼포먼스 (P2/P25 하드닝판 승계)
-- ============================================================================

-- I.1 fn_list_benchmark_definitions
CREATE OR REPLACE FUNCTION public.fn_list_benchmark_definitions(p_include_inactive BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'no_session');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_data
    FROM (
        SELECT bd.id, bd.facility_id, bd.name, bd.metric_type, bd.unit,
               bd.description, bd.is_active, bd.created_at
        FROM public.benchmark_definitions bd
        WHERE (p_include_inactive OR bd.is_active)
        ORDER BY bd.name
    ) t;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;

-- I.2 fn_record_member_benchmark_result — PR 판정 + advisory lock + 세션 배정 검증
--     🔄 G-2: p_rx_status 추가 — PR 판정은 동일 rx 계층 내에서만 비교
CREATE OR REPLACE FUNCTION public.fn_record_member_benchmark_result(
    p_member_id UUID, p_benchmark_id UUID, p_result_value NUMERIC,
    p_session_id UUID DEFAULT NULL, p_race_event_id UUID DEFAULT NULL,
    p_result_meta JSONB DEFAULT '{}'::jsonb,
    p_rx_status TEXT DEFAULT 'rx')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_metric_type TEXT;
    v_best NUMERIC;
    v_is_pr BOOLEAN := false;
    v_row public.member_benchmark_results;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    SELECT metric_type INTO v_metric_type
    FROM public.benchmark_definitions WHERE id = p_benchmark_id AND is_active;
    IF v_metric_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'benchmark_not_found');
    END IF;
    IF p_result_value IS NULL OR p_result_value <= 0 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_result_value');
    END IF;
    IF p_rx_status NOT IN ('rx_plus','rx','scaled') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_rx_status');
    END IF;

    -- 세션 연결 시: admin이 아니면 배정 코치만
    IF p_session_id IS NOT NULL AND NOT public.is_admin() THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.session_coaches sc
            JOIN public.coaches c ON c.id = sc.coach_id
            WHERE sc.session_id = p_session_id AND c.user_id = auth.uid()) THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_assigned_to_session');
        END IF;
    END IF;

    IF p_race_event_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.race_events WHERE id = p_race_event_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'race_event_not_found');
    END IF;

    -- PR 판정 동시성: (member, benchmark) 단위 트랜잭션 락
    PERFORM pg_advisory_xact_lock(hashtext(p_member_id::text || ':' || p_benchmark_id::text));

    IF v_metric_type = 'time' THEN
        SELECT MIN(result_value) INTO v_best FROM public.member_benchmark_results
        WHERE member_id = p_member_id AND benchmark_id = p_benchmark_id
          AND rx_status = p_rx_status;
        v_is_pr := (v_best IS NULL OR p_result_value < v_best);
    ELSE
        SELECT MAX(result_value) INTO v_best FROM public.member_benchmark_results
        WHERE member_id = p_member_id AND benchmark_id = p_benchmark_id
          AND rx_status = p_rx_status;
        v_is_pr := (v_best IS NULL OR p_result_value > v_best);
    END IF;

    INSERT INTO public.member_benchmark_results
        (member_id, benchmark_id, session_id, race_event_id, result_value, result_meta,
         rx_status, is_pr, recorded_by)
    VALUES
        (p_member_id, p_benchmark_id, p_session_id, p_race_event_id, p_result_value,
         COALESCE(p_result_meta,'{}'::jsonb), p_rx_status, v_is_pr, auth.uid())
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'id', v_row.id, 'member_id', v_row.member_id, 'benchmark_id', v_row.benchmark_id,
            'result_value', v_row.result_value, 'rx_status', v_row.rx_status, 'is_pr', v_row.is_pr,
            'previous_best', v_best, 'recorded_at', v_row.recorded_at),
        'error', NULL);
END;
$$;

-- I.3 fn_get_member_performance_profile(p_member_id) — 벤치마크 베스트 + Race 이력 통합
CREATE OR REPLACE FUNCTION public.fn_get_member_performance_profile(p_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_is_self BOOLEAN;
    v_bests JSONB;
    v_recent JSONB;
    v_race JSONB;
    v_wod_timeline JSONB;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.members m
                   WHERE m.id = p_member_id AND m.user_id = auth.uid()) INTO v_is_self;
    IF NOT (v_is_self OR public.is_admin_or_coach()) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_bests
    FROM (
        SELECT bd.id AS benchmark_id, bd.name, bd.metric_type, bd.unit,
               CASE WHEN bd.metric_type = 'time' THEN MIN(r.result_value)
                    ELSE MAX(r.result_value) END AS best_value,
               COUNT(r.id) AS attempt_count,
               MAX(r.recorded_at) AS last_recorded_at
        FROM public.member_benchmark_results r
        JOIN public.benchmark_definitions bd ON bd.id = r.benchmark_id
        WHERE r.member_id = p_member_id
        GROUP BY bd.id, bd.name, bd.metric_type, bd.unit
        ORDER BY MAX(r.recorded_at) DESC
    ) t;

    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_recent
    FROM (
        SELECT r.id, r.benchmark_id, bd.name, bd.metric_type, bd.unit,
               r.result_value, r.is_pr, r.session_id, r.race_event_id, r.recorded_at
        FROM public.member_benchmark_results r
        JOIN public.benchmark_definitions bd ON bd.id = r.benchmark_id
        WHERE r.member_id = p_member_id
        ORDER BY r.recorded_at DESC
        LIMIT 10
    ) t;

    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_race
    FROM (
        SELECT rr.id, rr.event_id, re.name AS event_name, re.event_date, re.race_format,
               EXTRACT(EPOCH FROM rr.result_time)::NUMERIC AS result_time_sec,
               rr.result_distance, rr.avg_watts, rr.max_watts, rr.avg_spm,
               rr.finish_rank, rr.is_pr
        FROM public.race_records rr
        JOIN public.race_events re ON re.id = rr.event_id
        WHERE rr.member_id = p_member_id
        ORDER BY re.event_date DESC, rr.created_at DESC
        LIMIT 10
    ) t;

    -- 🔄 G-1: 일일 WOD 기록 타임라인 (최근 10건)
    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_wod_timeline
    FROM (
        SELECT swr.id, swr.session_wod_id, s.id AS session_id, s.session_date, s.title AS session_title,
               COALESCE(sw.title_override, wt.title) AS wod_title,
               swr.score, swr.score_type, swr.rx_status, swr.note, swr.created_at
        FROM public.session_wod_results swr
        JOIN public.session_wods sw ON sw.id = swr.session_wod_id
        JOIN public.sessions s ON s.id = sw.session_id
        LEFT JOIN public.wod_templates wt ON wt.id = sw.template_id
        WHERE swr.member_id = p_member_id
        ORDER BY s.session_date DESC, swr.created_at DESC
        LIMIT 10
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'member_id', p_member_id,
            'benchmark_bests', v_bests,
            'recent_results', v_recent,
            'race_records', v_race,
            'wod_timeline', v_wod_timeline,
            'benchmark_pr_count', (SELECT COUNT(*) FROM public.member_benchmark_results
                                   WHERE member_id = p_member_id AND is_pr),
            'race_pr_count', (SELECT COUNT(*) FROM public.race_records
                              WHERE member_id = p_member_id AND is_pr)),
        'error', NULL);
END;
$$;

-- I.4 fn_create_followup(p_payload) — 입력 사전 검증판(P25)
CREATE OR REPLACE FUNCTION public.fn_create_followup(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_member_id UUID;
    v_type TEXT;
    v_priority TEXT;
    v_due_date DATE;
    v_row public.coach_followups;
BEGIN
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_found');
    END IF;

    BEGIN
        v_member_id := (p_payload->>'member_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_member_id');
    END;
    v_type := p_payload->>'followup_type';

    IF v_member_id IS NULL OR v_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'missing_required_fields');
    END IF;
    IF v_type NOT IN ('injury','trial_conversion','renewal','absence','motivation') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_followup_type');
    END IF;

    v_priority := COALESCE(NULLIF(p_payload->>'priority',''), 'normal');
    IF v_priority NOT IN ('low','normal','high') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_priority');
    END IF;

    BEGIN
        v_due_date := NULLIF(p_payload->>'due_date','')::DATE;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_due_date');
    END;

    INSERT INTO public.coach_followups (member_id, session_id, coach_id, followup_type, priority, due_date, note)
    VALUES (v_member_id, NULLIF(p_payload->>'session_id','')::UUID, v_coach_id,
            v_type, v_priority, v_due_date, NULLIF(p_payload->>'note',''))
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row), 'error', NULL);
END;
$$;

-- I.5 fn_complete_followup(p_followup_id, p_status)
CREATE OR REPLACE FUNCTION public.fn_complete_followup(p_followup_id UUID, p_status TEXT DEFAULT 'completed')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_row public.coach_followups;
BEGIN
    IF p_status NOT IN ('completed','dismissed','open') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_status');
    END IF;

    UPDATE public.coach_followups cf
    SET status = p_status,
        completed_at = CASE WHEN p_status = 'open' THEN NULL ELSE now() END,
        updated_at = now()
    WHERE cf.id = p_followup_id
      AND (public.is_admin() OR EXISTS (
          SELECT 1 FROM public.coaches c WHERE c.id = cf.coach_id AND c.user_id = auth.uid()))
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_found_or_forbidden');
    END IF;
    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row), 'error', NULL);
END;
$$;

-- I.6 fn_get_my_followups(p_status, p_member_id, p_limit)
CREATE OR REPLACE FUNCTION public.fn_get_my_followups(
    p_status TEXT DEFAULT 'open', p_member_id UUID DEFAULT NULL, p_limit INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_data JSONB;
BEGIN
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_found');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_data
    FROM (
        SELECT cf.id, cf.member_id, m.name AS member_name, cf.session_id,
               cf.followup_type, cf.priority, cf.status, cf.due_date, cf.note,
               cf.created_at, cf.completed_at,
               (cf.due_date IS NOT NULL AND cf.due_date < CURRENT_DATE AND cf.status = 'open') AS is_overdue
        FROM public.coach_followups cf
        JOIN public.members m ON m.id = cf.member_id
        WHERE cf.coach_id = v_coach_id
          AND (p_status IS NULL OR p_status = 'all' OR cf.status = p_status)
          AND (p_member_id IS NULL OR cf.member_id = p_member_id)
        ORDER BY CASE cf.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
                 cf.due_date ASC NULLS LAST, cf.created_at DESC
        LIMIT p_limit
    ) t;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;


-- ============================================================================
-- [I2] 일일 WOD 기록 (⏳ G-1~G-3 — 디지털 화이트보드/계층 리더보드/WOD Prep)
-- ============================================================================

-- I2.1 fn_record_session_wod_result — 본인 WOD 점수 기록 (upsert, rx_status 포함)
CREATE OR REPLACE FUNCTION public.fn_record_session_wod_result(
    p_session_id UUID,
    p_score NUMERIC,
    p_score_type TEXT,
    p_rx_status TEXT DEFAULT 'rx',
    p_note TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_session_wod_id UUID;
    v_row public.session_wod_results;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF p_score IS NULL OR p_score <= 0 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_score');
    END IF;
    IF p_score_type NOT IN ('time','reps','rounds_reps','weight','distance','calories') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_score_type');
    END IF;
    IF p_rx_status NOT IN ('rx_plus','rx','scaled') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_rx_status');
    END IF;

    SELECT id INTO v_session_wod_id
    FROM public.session_wods
    WHERE session_id = p_session_id AND publish_state = 'published';
    IF v_session_wod_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_wod_not_published');
    END IF;

    -- 해당 세션 참가자만 기록 가능 (confirmed 예약 또는 walk_in — 취소자 제외)
    IF NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.session_id = p_session_id AND b.member_id = v_member_id
          AND (b.status = 'confirmed' OR b.attendance_outcome = 'walk_in')
    ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_session_participant');
    END IF;

    INSERT INTO public.session_wod_results
        (session_wod_id, member_id, score, score_type, rx_status, note, recorded_by)
    VALUES (v_session_wod_id, v_member_id, p_score, p_score_type, p_rx_status,
            NULLIF(p_note,''), auth.uid())
    ON CONFLICT (session_wod_id, member_id) DO UPDATE SET
        score = EXCLUDED.score,
        score_type = EXCLUDED.score_type,
        rx_status = EXCLUDED.rx_status,
        note = EXCLUDED.note,
        recorded_by = EXCLUDED.recorded_by,
        updated_at = now()
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row), 'error', NULL);
END;
$$;

COMMENT ON FUNCTION public.fn_record_session_wod_result(UUID, NUMERIC, TEXT, TEXT, TEXT) IS 'G-1: 본인 일일 WOD 점수 기록(upsert). published WOD + 세션 참가자만';

-- I2.2 fn_get_session_wod_whiteboard(p_session_id) — 세션 전원 결과, Rx+→Rx→Scaled 계층 정렬
--      정렬 규칙: ① rx 계층(rx_plus=0, rx=1, scaled=2) ② score_type 방향(time=오름차순, 그 외=내림차순)
CREATE OR REPLACE FUNCTION public.fn_get_session_wod_whiteboard(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_wod RECORD;
    v_results JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'no_session');
    END IF;

    SELECT sw.id, sw.session_id, COALESCE(sw.title_override, wt.title) AS wod_title,
           COALESCE(sw.format_override, wt.format_type) AS format,
           s.session_date, s.title AS session_title
    INTO v_wod
    FROM public.session_wods sw
    JOIN public.sessions s ON s.id = sw.session_id
    LEFT JOIN public.wod_templates wt ON wt.id = sw.template_id
    WHERE sw.session_id = p_session_id AND sw.publish_state = 'published';

    IF v_wod.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_wod_not_published');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.rank), '[]'::jsonb) INTO v_results
    FROM (
        SELECT ROW_NUMBER() OVER (
                   ORDER BY CASE r.rx_status WHEN 'rx_plus' THEN 0 WHEN 'rx' THEN 1 ELSE 2 END,
                            CASE WHEN r.score_type = 'time' THEN r.score END ASC NULLS LAST,
                            CASE WHEN r.score_type <> 'time' THEN r.score END DESC NULLS LAST,
                            r.created_at ASC
               ) AS rank,
               m.name AS member_name, m.avatar_url,
               r.member_id, r.score, r.score_type, r.rx_status, r.note, r.created_at
        FROM public.session_wod_results r
        JOIN public.members m ON m.id = r.member_id
        WHERE r.session_wod_id = v_wod.id
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'session_id', v_wod.session_id, 'session_title', v_wod.session_title,
            'session_date', v_wod.session_date,
            'wod_title', v_wod.wod_title, 'format', v_wod.format,
            'results', v_results),
        'error', NULL);
END;
$$;

COMMENT ON FUNCTION public.fn_get_session_wod_whiteboard(UUID) IS 'G-1/G-2: 세션 화이트보드 — 전원 결과를 Rx+→Rx→Scaled 계층 + score_type 방향으로 정렬. authenticated 전용(anon 미공개 — 05 화이트리스트 정합)';

-- I2.3 fn_get_my_wod_prep(p_session_id) — 예정 WOD + 본인 과거 베스트 조인 (G-3 WOD Prep)
CREATE OR REPLACE FUNCTION public.fn_get_my_wod_prep(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_wod RECORD;
    v_history JSONB;
    v_benchmark_best JSONB;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;

    SELECT sw.id, sw.template_id, sw.movements_snapshot,
           COALESCE(sw.title_override, wt.title) AS wod_title,
           COALESCE(sw.format_override, wt.format_type) AS format,
           COALESCE(sw.time_cap_override, wt.time_cap_minutes) AS time_cap_minutes,
           COALESCE(sw.description_override, wt.description) AS description,
           wt.is_benchmark
    INTO v_wod
    FROM public.session_wods sw
    LEFT JOIN public.wod_templates wt ON wt.id = sw.template_id
    WHERE sw.session_id = p_session_id AND sw.publish_state = 'published';

    IF v_wod.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_wod_not_published');
    END IF;

    -- (a) 동일 템플릿 WOD의 본인 과거 기록 (최근 3건 + rx 계층 포함)
    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_history
    FROM (
        SELECT r.score, r.score_type, r.rx_status, r.note,
               s.session_date, r.created_at
        FROM public.session_wod_results r
        JOIN public.session_wods sw2 ON sw2.id = r.session_wod_id
        JOIN public.sessions s ON s.id = sw2.session_id
        WHERE r.member_id = v_member_id
          AND v_wod.template_id IS NOT NULL
          AND sw2.template_id = v_wod.template_id
          AND sw2.session_id <> p_session_id
        ORDER BY s.session_date DESC
        LIMIT 3
    ) t;

    -- (b) 동명 벤치마크 종목의 본인 베스트 (벤치마크 WOD명 = benchmark_definitions.name 매칭)
    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_benchmark_best
    FROM (
        SELECT bd.name, bd.metric_type, bd.unit, r.rx_status,
               CASE WHEN bd.metric_type = 'time' THEN MIN(r.result_value)
                    ELSE MAX(r.result_value) END AS best_value,
               MAX(r.recorded_at) AS last_recorded_at
        FROM public.member_benchmark_results r
        JOIN public.benchmark_definitions bd ON bd.id = r.benchmark_id
        WHERE r.member_id = v_member_id
          AND bd.name = v_wod.wod_title
        GROUP BY bd.name, bd.metric_type, bd.unit, r.rx_status
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'session_id', p_session_id,
            'wod', jsonb_build_object(
                'session_wod_id', v_wod.id, 'title', v_wod.wod_title,
                'format', v_wod.format, 'time_cap_minutes', v_wod.time_cap_minutes,
                'description', v_wod.description, 'is_benchmark', COALESCE(v_wod.is_benchmark, false),
                'movements_snapshot', v_wod.movements_snapshot),
            'my_history_same_wod', v_history,
            'my_benchmark_best', v_benchmark_best),
        'error', NULL);
END;
$$;

COMMENT ON FUNCTION public.fn_get_my_wod_prep(UUID) IS 'G-3 WOD Prep: 예정(published) WOD + 동일 템플릿 본인 과거 기록 + 동명 벤치마크 본인 베스트 조인';


-- ============================================================================
-- [J] 배지 (⏳ 신규 — as-is RPC 실체 부재 해소)
-- ============================================================================

-- J.1 fn_evaluate_badges(p_member_id, p_trigger) — 판정 본체 (트리거 4종 + 수동 호출)
--     멱등: badge_awards UNIQUE(member,badge) + ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.fn_evaluate_badges(p_member_id UUID, p_trigger TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_checkin_count INT;
    v_pr_count INT;
    v_race_count INT;
    v_podium_count INT;
    v_membership_days INT;
    v_streak_weeks INT := 0;
    v_def RECORD;
    v_current NUMERIC;
    v_awarded JSONB := '[]'::jsonb;
    v_user_id UUID;
    v_rowcount INT;
BEGIN
    -- 직접 호출 시 권한: staff 또는 본인(자기 재평가). 트리거 경유는 DEFINER로 통과
    IF auth.uid() IS NOT NULL AND NOT public.is_admin_or_coach() THEN
        IF NOT EXISTS (SELECT 1 FROM public.members m
                       WHERE m.id = p_member_id AND m.user_id = auth.uid()) THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
        END IF;
    END IF;

    -- 지표 계산
    SELECT COUNT(*) INTO v_checkin_count FROM public.checkins WHERE member_id = p_member_id;
    SELECT COUNT(*) INTO v_pr_count FROM public.member_benchmark_results
        WHERE member_id = p_member_id AND is_pr;
    SELECT COUNT(*) INTO v_race_count FROM public.race_records WHERE member_id = p_member_id;
    SELECT COUNT(*) INTO v_podium_count FROM public.race_records
        WHERE member_id = p_member_id AND finish_rank BETWEEN 1 AND 3;
    SELECT COALESCE(EXTRACT(DAY FROM now() - MIN(start_date)::TIMESTAMPTZ)::INT, 0)
        INTO v_membership_days
        FROM public.memberships WHERE member_id = p_member_id;

    -- 연속 주 출석: 이번 주부터 역방향으로 체크인 있는 주 카운트 (최대 52주)
    FOR i IN 0..51 LOOP
        IF EXISTS (
            SELECT 1 FROM public.checkins
            WHERE member_id = p_member_id
              AND checkin_time >= date_trunc('week', now()) - (i || ' weeks')::INTERVAL
              AND checkin_time <  date_trunc('week', now()) - ((i-1) || ' weeks')::INTERVAL
        ) THEN
            v_streak_weeks := v_streak_weeks + 1;
        ELSE
            EXIT WHEN i > 0;   -- 이번 주(0)는 아직 미출석이어도 스트릭 미단절
        END IF;
    END LOOP;

    -- 활성 배지 정의 순회 판정
    FOR v_def IN
        SELECT * FROM public.badge_definitions
        WHERE is_active AND metric_type <> 'manual'
    LOOP
        v_current := CASE v_def.metric_type
            WHEN 'checkin_count'        THEN v_checkin_count
            WHEN 'checkin_streak_weeks' THEN v_streak_weeks
            WHEN 'pr_count'             THEN v_pr_count
            WHEN 'race_count'           THEN v_race_count
            WHEN 'race_podium_count'    THEN v_podium_count
            WHEN 'membership_days'      THEN v_membership_days
        END;

        IF v_current IS NOT NULL AND v_current >= v_def.threshold_value THEN
            INSERT INTO public.badge_awards (member_id, badge_id, source, progress_value)
            VALUES (p_member_id, v_def.id, 'auto', v_current)
            ON CONFLICT (member_id, badge_id) DO NOTHING;
            GET DIAGNOSTICS v_rowcount = ROW_COUNT;

            IF v_rowcount > 0 THEN
                v_awarded := v_awarded || jsonb_build_array(jsonb_build_object(
                    'badge_id', v_def.id, 'slug', v_def.slug, 'name', v_def.name));

                -- 획득 축하 알림 (계정 연결 회원만)
                SELECT user_id INTO v_user_id FROM public.members WHERE id = p_member_id;
                IF v_user_id IS NOT NULL THEN
                    INSERT INTO public.notifications (user_id, member_id, title, content, category, type, action_url, metadata)
                    VALUES (v_user_id, p_member_id,
                            '새 배지 획득!',
                            '[' || v_def.name || '] 배지를 획득했습니다. 축하합니다!',
                            'badge', 'success', '/apps/performance',
                            jsonb_build_object('badge_slug', v_def.slug));
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'member_id', p_member_id, 'trigger', p_trigger,
            'newly_awarded', v_awarded,
            'metrics', jsonb_build_object(
                'checkin_count', v_checkin_count, 'streak_weeks', v_streak_weeks,
                'pr_count', v_pr_count, 'race_count', v_race_count,
                'race_podium_count', v_podium_count, 'membership_days', v_membership_days)),
        'error', NULL);
END;
$$;

-- J.2 fn_get_my_badges() — 보유 배지 + 미보유 배지 진행률
CREATE OR REPLACE FUNCTION public.fn_get_my_badges()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_eval JSONB;
    v_metrics JSONB;
    v_badges JSONB;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;

    -- 조회 시점 재평가(멱등) — 지표 재사용
    v_eval := public.fn_evaluate_badges(v_member_id, 'on_view');
    v_metrics := v_eval->'data'->'metrics';

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.sort_order), '[]'::jsonb) INTO v_badges
    FROM (
        SELECT bd.id, bd.slug, bd.name, bd.description, bd.icon, bd.category,
               bd.metric_type, bd.threshold_value, bd.sort_order,
               (ba.id IS NOT NULL) AS earned,
               ba.awarded_at,
               CASE bd.metric_type
                   WHEN 'checkin_count'        THEN (v_metrics->>'checkin_count')::NUMERIC
                   WHEN 'checkin_streak_weeks' THEN (v_metrics->>'streak_weeks')::NUMERIC
                   WHEN 'pr_count'             THEN (v_metrics->>'pr_count')::NUMERIC
                   WHEN 'race_count'           THEN (v_metrics->>'race_count')::NUMERIC
                   WHEN 'race_podium_count'    THEN (v_metrics->>'race_podium_count')::NUMERIC
                   WHEN 'membership_days'      THEN (v_metrics->>'membership_days')::NUMERIC
               END AS current_value
        FROM public.badge_definitions bd
        LEFT JOIN public.badge_awards ba ON ba.badge_id = bd.id AND ba.member_id = v_member_id
        WHERE bd.is_active
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'member_id', v_member_id,
            'earned_count', (SELECT COUNT(*) FROM public.badge_awards WHERE member_id = v_member_id),
            'badges', v_badges),
        'error', NULL);
END;
$$;


-- ============================================================================
-- [K] Race
-- ============================================================================

-- K.1 fn_prepare_race_session(p_session_id, p_race_format, p_options)
--     🔄 모드 파라미터화(15-race-system §4b): individual/team/group/relay,
--     group A안(group_target_m)/B안(heat_mode·next_heat_of) + carryover 자동 계산.
--     advisory lock + 부분 유니크(uq_race_events_active_session) 이중 방어
CREATE OR REPLACE FUNCTION public.fn_prepare_race_session(
    p_session_id UUID,
    p_race_format TEXT DEFAULT 'individual',
    p_options JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_session RECORD;
    v_event RECORD;
    v_prev RECORD;
    v_created BOOLEAN := false;
    v_heat_no INT := 1;
    v_parent_id UUID;
    v_carryover NUMERIC := 0;
    v_next_heat_of UUID;
BEGIN
    IF p_race_format NOT IN ('individual','team','group','relay') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_race_format');
    END IF;

    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    IF v_coach_id IS NULL AND NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_found');
    END IF;

    SELECT s.id, s.session_date, s.title, s.facility_id INTO v_session
    FROM public.sessions s WHERE s.id = p_session_id;
    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_found');
    END IF;

    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.session_coaches sc
        WHERE sc.session_id = p_session_id AND sc.coach_id = v_coach_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_assigned');
    END IF;

    -- 동시 호출 직렬화 (세션 단위)
    PERFORM pg_advisory_xact_lock(hashtext('race_session:' || p_session_id::text));

    v_next_heat_of := NULLIF(p_options->>'next_heat_of','')::UUID;

    -- 히트 전환(B안): 이전 이벤트가 종료(finished/completed)됐는지 검증 후 신규 생성
    IF v_next_heat_of IS NOT NULL THEN
        SELECT * INTO v_prev FROM public.race_events WHERE id = v_next_heat_of;
        IF v_prev.id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'previous_heat_not_found');
        END IF;
        IF v_prev.status NOT IN ('completed') AND v_prev.lobby_status <> 'finished' THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'previous_heat_not_finished');
        END IF;
        v_heat_no   := v_prev.heat_no + 1;
        v_parent_id := COALESCE(v_prev.parent_event_id, v_prev.id);
        -- 공동목표(A+B 결합) 이월 누계 = 이전 이월 + 이전 히트 기록 합계
        IF COALESCE((p_options->>'group_target_m')::INT, v_prev.group_target_m) IS NOT NULL THEN
            SELECT COALESCE(v_prev.carryover_m, 0) + COALESCE(SUM(rr.result_distance), 0)
            INTO v_carryover
            FROM public.race_records rr WHERE rr.event_id = v_prev.id;
        END IF;
    ELSE
        -- 기존 미종료 이벤트 재개 (created=false)
        SELECT re.* INTO v_event
        FROM public.race_events re
        WHERE re.session_id = p_session_id
          AND re.status NOT IN ('completed','cancelled')
        ORDER BY re.created_at DESC
        LIMIT 1;
    END IF;

    -- 신규 생성 (재개 대상 없거나 히트 전환)
    IF v_event.id IS NULL THEN
        BEGIN
            INSERT INTO public.race_events
                (facility_id, name, event_date, event_type, status, race_format,
                 session_id, coach_id, lobby_status,
                 target_distance_m, duration_minutes, group_target_m,
                 heat_no, parent_event_id, carryover_m)
            VALUES (
                v_session.facility_id,
                COALESCE(v_session.title, 'Class Race') || ' — ' || TO_CHAR(v_session.session_date, 'MM/DD')
                    || CASE WHEN v_heat_no > 1 THEN ' (Heat ' || v_heat_no || ')' ELSE '' END,
                v_session.session_date,
                'rowing', 'scheduled', p_race_format,
                p_session_id, v_coach_id, 'setup',
                (p_options->>'target_distance_m')::INT,
                (p_options->>'duration_minutes')::INT,
                COALESCE((p_options->>'group_target_m')::INT,
                         CASE WHEN v_next_heat_of IS NOT NULL THEN v_prev.group_target_m END),
                v_heat_no, v_parent_id, v_carryover)
            RETURNING * INTO v_event;
            v_created := true;
        EXCEPTION WHEN unique_violation THEN
            -- 부분 유니크 방어선: 경합 시 활성 이벤트 재조회
            SELECT re.* INTO v_event
            FROM public.race_events re
            WHERE re.session_id = p_session_id
              AND re.status NOT IN ('completed','cancelled')
            ORDER BY re.created_at DESC
            LIMIT 1;
        END;
    END IF;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'created', v_created,
            'event_id', v_event.id, 'event_name', v_event.name,
            'session_id', p_session_id,
            'status', v_event.status, 'lobby_status', v_event.lobby_status,
            'race_format', v_event.race_format,
            'target_distance_m', v_event.target_distance_m,
            'duration_minutes', v_event.duration_minutes,
            'group_target_m', v_event.group_target_m,
            'heat_no', v_event.heat_no,
            'parent_event_id', v_event.parent_event_id,
            'carryover_m', v_event.carryover_m),
        'error', NULL);
END;
$$;


-- ============================================================================
-- [L] Class 공개 RPC 3종 (계약 보정 — anon 실행, Display-Safe 데이터 계층 강제)
--     TV의 sessions/checkins 직접 SELECT 회수 → 공개 표면을 RPC로 좁힘.
--     내부에서 민감 컬럼(연락처/메모/판정)을 SELECT 자체를 하지 않는다.
-- ============================================================================

-- L.1 fn_get_class_live_board(p_facility_id) — 현재/다음 수업 + 체크인 "이름만"
CREATE OR REPLACE FUNCTION public.fn_get_class_live_board(p_facility_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_current JSONB;
    v_next JSONB;
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

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('server_time', v_now, 'current', v_current, 'next', v_next),
        'error', NULL);
END;
$$;

-- L.2 fn_get_class_screen_prs(p_facility_id, p_days) — PR 축하 티커 (이름+항목만, 옵트인 존중)
CREATE OR REPLACE FUNCTION public.fn_get_class_screen_prs(p_facility_id UUID, p_days INT DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.achieved_at DESC), '[]'::jsonb) INTO v_data
    FROM (
        -- 벤치마크 PR
        SELECT m.name AS member_name, bd.name AS item_label,
               r.result_value::TEXT || ' ' || bd.unit AS result_label,
               r.recorded_at AS achieved_at, 'benchmark' AS source
        FROM public.member_benchmark_results r
        JOIN public.benchmark_definitions bd ON bd.id = r.benchmark_id
        JOIN public.members m ON m.id = r.member_id
        LEFT JOIN public.notification_preferences np ON np.user_id = m.user_id
        WHERE r.is_pr
          AND r.recorded_at > now() - (GREATEST(p_days,1) || ' days')::INTERVAL
          AND COALESCE(np.celebrate_opt_in, true)
          AND (m.facility_id = p_facility_id OR m.facility_id IS NULL)
        UNION ALL
        -- Race PR
        SELECT m.name, re.name,
               COALESCE(rr.result_distance::TEXT || 'm', TO_CHAR(rr.result_time, 'MI:SS')),
               rr.created_at, 'race'
        FROM public.race_records rr
        JOIN public.race_events re ON re.id = rr.event_id
        JOIN public.members m ON m.id = rr.member_id
        LEFT JOIN public.notification_preferences np ON np.user_id = m.user_id
        WHERE rr.is_pr
          AND rr.created_at > now() - (GREATEST(p_days,1) || ' days')::INTERVAL
          AND COALESCE(np.celebrate_opt_in, true)
          AND (re.facility_id = p_facility_id OR re.facility_id IS NULL)
        ORDER BY achieved_at DESC
        LIMIT 20
    ) t;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;

-- L.3 fn_get_class_leaderboard(p_facility_id, p_scope) — 이름+기록 랭킹 (생체 지표 제외)
CREATE OR REPLACE FUNCTION public.fn_get_class_leaderboard(
    p_facility_id UUID, p_scope TEXT DEFAULT 'month')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_since DATE;
    v_data JSONB;
BEGIN
    v_since := CASE p_scope
        WHEN 'week'  THEN CURRENT_DATE - 7
        WHEN 'month' THEN CURRENT_DATE - 30
        WHEN 'all'   THEN DATE '2000-01-01'
        ELSE CURRENT_DATE - 30
    END;

    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_data
    FROM (
        SELECT ROW_NUMBER() OVER (ORDER BY SUM(rr.result_distance) DESC NULLS LAST) AS rank,
               m.name AS member_name,
               SUM(rr.result_distance) AS total_distance_m,
               COUNT(*) AS race_count,
               COUNT(*) FILTER (WHERE rr.finish_rank = 1) AS wins,
               COUNT(*) FILTER (WHERE rr.is_pr) AS pr_count
        FROM public.race_records rr
        JOIN public.race_events re ON re.id = rr.event_id
        JOIN public.members m ON m.id = rr.member_id
        WHERE re.status = 'completed'
          AND re.event_date >= v_since
          AND (re.facility_id = p_facility_id OR re.facility_id IS NULL)
        GROUP BY m.id, m.name
        ORDER BY total_distance_m DESC NULLS LAST
        LIMIT 10
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('scope', p_scope, 'since', v_since, 'entries', v_data),
        'error', NULL);
END;
$$;


-- ============================================================================
-- [M] Admin 대시보드 (🔄 fn_ 접두 표준화 + admin 게이트 + envelope)
-- ============================================================================

-- M.1 fn_get_dashboard_kpis()
CREATE OR REPLACE FUNCTION public.fn_get_dashboard_kpis()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
    v_today DATE := CURRENT_DATE;
    v_month_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    SELECT jsonb_build_object(
        'total_members',    (SELECT COUNT(*) FROM public.members),
        'active_members',   (SELECT COUNT(*) FROM public.members WHERE status = 'active'),
        'pending_approvals',(SELECT COUNT(*) FROM public.profiles WHERE approval_status = 'pending'),
        'today_checkins',   (SELECT COUNT(*) FROM public.checkins
                             WHERE checkin_time >= v_today AND checkin_time < v_today + 1),
        'today_bookings',   (SELECT COUNT(*) FROM public.bookings b
                             JOIN public.sessions s ON s.id = b.session_id
                             WHERE s.session_date = v_today AND b.status = 'confirmed'),
        'today_sessions',   (SELECT COUNT(*) FROM public.sessions WHERE session_date = v_today),
        'monthly_revenue',  (SELECT COALESCE(SUM(amount),0) FROM public.transactions
                             WHERE created_at >= v_month_start AND status = 'completed'),
        'active_memberships',(SELECT COUNT(*) FROM public.memberships WHERE status = 'active'),
        'expiring_in_7d',   (SELECT COUNT(*) FROM public.memberships
                             WHERE status = 'active'
                               AND end_date BETWEEN v_today AND v_today + 7),
        'active_coaches',   (SELECT COUNT(*) FROM public.coaches WHERE status = 'active'),
        'new_members_this_month', (SELECT COUNT(*) FROM public.members
                                   WHERE created_at >= v_month_start),
        'open_tickets',     (SELECT COUNT(*) FROM public.support_tickets
                             WHERE status IN ('open','in_progress')))
    INTO v_data;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;

-- M.2 fn_get_revenue_stats(p_start_date, p_end_date)
CREATE OR REPLACE FUNCTION public.fn_get_revenue_stats(
    p_start_date DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    SELECT jsonb_build_object(
        'total_revenue',     COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0),
        'transaction_count', COUNT(*),
        'avg_transaction',   COALESCE(ROUND(AVG(amount) FILTER (WHERE status = 'completed'), 0), 0),
        'completed',         COUNT(*) FILTER (WHERE status = 'completed'),
        'refunded',          COUNT(*) FILTER (WHERE status IN ('refunded','partial_refunded')),
        'pending',           COUNT(*) FILTER (WHERE status = 'pending'),
        'by_category', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'category', category, 'total', total, 'count', cnt)), '[]'::jsonb)
            FROM (
                SELECT category, COALESCE(SUM(amount) FILTER (WHERE status = 'completed'),0) AS total,
                       COUNT(*) AS cnt
                FROM public.transactions
                WHERE created_at >= p_start_date AND created_at < p_end_date + 1
                GROUP BY category) c),
        'by_source', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'source', source, 'total', total, 'count', cnt)), '[]'::jsonb)
            FROM (
                SELECT source, COALESCE(SUM(amount) FILTER (WHERE status = 'completed'),0) AS total,
                       COUNT(*) AS cnt
                FROM public.transactions
                WHERE created_at >= p_start_date AND created_at < p_end_date + 1
                GROUP BY source) sc))
    INTO v_data
    FROM public.transactions
    WHERE created_at >= p_start_date AND created_at < p_end_date + 1;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;

-- M.3 fn_get_coach_performance_stats() — Admin 코치 성과 집계
CREATE OR REPLACE FUNCTION public.fn_get_coach_performance_stats()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.avg_rating DESC, t.total_sessions DESC), '[]'::jsonb)
    INTO v_data
    FROM (
        SELECT c.id, c.name, c.email, c.specialties, c.status,
               (SELECT COUNT(*) FROM public.session_coaches sc WHERE sc.coach_id = c.id) AS total_sessions,
               COALESCE((SELECT ROUND(AVG(sf.rating)::NUMERIC, 1)
                         FROM public.session_feedback sf WHERE sf.coach_id = c.id), 0) AS avg_rating,
               (SELECT COUNT(DISTINCT b.member_id)
                FROM public.bookings b
                JOIN public.session_coaches sc ON sc.session_id = b.session_id
                WHERE sc.coach_id = c.id AND b.status = 'confirmed') AS total_members
        FROM public.coaches c
        WHERE c.status = 'active'
    ) t;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;


-- ============================================================================
-- [N] 부속 내부 함수 (표준 34종 외 — 결제 키 암복호화, admin 게이트 필수)
-- ============================================================================

-- N.1 save_pg_settings — 🔄 admin 게이트 추가 + facility_id 기준 UPSERT(as-is id 충돌 버그 수정)
CREATE OR REPLACE FUNCTION public.save_pg_settings(
    p_facility_id UUID, p_test_secret_key TEXT, p_live_secret_key TEXT,
    p_webhook_secret TEXT, p_encryption_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    INSERT INTO public.pg_settings (facility_id, test_secret_key_encrypted,
                                    live_secret_key_encrypted, webhook_secret_encrypted)
    VALUES (
        p_facility_id,
        CASE WHEN p_test_secret_key IS NOT NULL THEN pgp_sym_encrypt(p_test_secret_key, p_encryption_key)::TEXT END,
        CASE WHEN p_live_secret_key IS NOT NULL THEN pgp_sym_encrypt(p_live_secret_key, p_encryption_key)::TEXT END,
        CASE WHEN p_webhook_secret  IS NOT NULL THEN pgp_sym_encrypt(p_webhook_secret,  p_encryption_key)::TEXT END)
    ON CONFLICT (facility_id) DO UPDATE SET
        test_secret_key_encrypted = COALESCE(EXCLUDED.test_secret_key_encrypted,
                                             public.pg_settings.test_secret_key_encrypted),
        live_secret_key_encrypted = COALESCE(EXCLUDED.live_secret_key_encrypted,
                                             public.pg_settings.live_secret_key_encrypted),
        webhook_secret_encrypted  = COALESCE(EXCLUDED.webhook_secret_encrypted,
                                             public.pg_settings.webhook_secret_encrypted),
        updated_at = now();

    RETURN jsonb_build_object('success', true, 'data', NULL, 'error', NULL);
END;
$$;

-- N.2 get_decrypted_pg_settings — 서버 라우트(Service Role) 전용. authenticated 미부여
CREATE OR REPLACE FUNCTION public.get_decrypted_pg_settings(
    p_facility_id UUID, p_encryption_key TEXT)
RETURNS TABLE (test_secret_key TEXT, live_secret_key TEXT, webhook_secret TEXT, payment_mode TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pgp_sym_decrypt(ps.test_secret_key_encrypted::BYTEA, p_encryption_key),
        pgp_sym_decrypt(ps.live_secret_key_encrypted::BYTEA, p_encryption_key),
        pgp_sym_decrypt(ps.webhook_secret_encrypted::BYTEA, p_encryption_key),
        ps.payment_mode
    FROM public.pg_settings ps
    WHERE ps.facility_id = p_facility_id AND ps.is_active
    LIMIT 1;
END;
$$;


-- ============================================================================
-- [O] Admin 멤버십 수명주기 + 대리 예약 (Phase 2 — 02-admin §3.2·§3.6)
--     마이그레이션 20260708040000_admin_membership_booking_rpc.sql와 동일 소스.
--     취소 대리 예약은 fn_cancel_booking_with_credit(uuid,text)이 admin 분기
--     (OR is_admin(), 페널티 예외)를 이미 포함 → 재사용, 별도 신설 안 함.
-- ============================================================================

-- O.1 fn_admin_create_membership(p_member_id, p_plan_id, p_start_date, p_transaction_id)
--     plan 기준 end_date(기간제=start+duration_days)/remaining_credits(횟수제=credit_count)
--     자동 계산 + membership_history('created') + audit. transaction 연결 시 transactions.membership_id 갱신.
CREATE OR REPLACE FUNCTION public.fn_admin_create_membership(
    p_member_id      UUID,
    p_plan_id        UUID,
    p_start_date     DATE,
    p_transaction_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_admin UUID := auth.uid();
    v_plan RECORD;
    v_end_date DATE;
    v_credits INT;
    v_membership_id UUID;
    v_tx_linked BOOLEAN := false;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF p_member_id IS NULL OR p_plan_id IS NULL OR p_start_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'missing_required_fields');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.members WHERE id = p_member_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;

    SELECT id, type, duration_days, credit_count
      INTO v_plan
      FROM public.membership_plans WHERE id = p_plan_id;
    IF v_plan.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'plan_not_found');
    END IF;

    IF v_plan.type = 'period' THEN
        v_end_date := p_start_date + v_plan.duration_days;
        v_credits  := NULL;
    ELSE
        v_end_date := NULL;
        v_credits  := v_plan.credit_count;
    END IF;

    INSERT INTO public.memberships
        (member_id, plan_id, start_date, end_date, remaining_credits, status)
    VALUES (p_member_id, p_plan_id, p_start_date, v_end_date, v_credits, 'active')
    RETURNING id INTO v_membership_id;

    INSERT INTO public.membership_history
        (membership_id, action_type, old_values, new_values, notes, changed_by)
    VALUES (v_membership_id, 'created', NULL,
            jsonb_build_object('plan_id', p_plan_id, 'start_date', p_start_date,
                               'end_date', v_end_date, 'remaining_credits', v_credits,
                               'status', 'active'),
            NULL, v_admin);

    IF p_transaction_id IS NOT NULL THEN
        UPDATE public.transactions
           SET membership_id = v_membership_id, updated_at = now()
         WHERE id = p_transaction_id;
        v_tx_linked := FOUND;
    END IF;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (v_admin, 'ADMIN_CREATE_MEMBERSHIP', 'memberships', v_membership_id,
            jsonb_build_object('member_id', p_member_id, 'plan_id', p_plan_id,
                               'start_date', p_start_date, 'end_date', v_end_date,
                               'remaining_credits', v_credits, 'transaction_id', p_transaction_id));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('membership_id', v_membership_id,
                                   'end_date', v_end_date,
                                   'remaining_credits', v_credits,
                                   'transaction_linked', v_tx_linked),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- O.2 fn_admin_adjust_membership(p_membership_id, p_action, p_payload)
--     p_action IN ('extend','hold','resume','credit_adjust','cancel'). p_payload.reason 필수.
--     extend {days?,credits?} / hold(max_pauses 검증) / resume(홀딩일수 이월) /
--     credit_adjust {delta}(음수 방지) / cancel(상태만). membership_history + audit.
CREATE OR REPLACE FUNCTION public.fn_admin_adjust_membership(
    p_membership_id UUID,
    p_action        TEXT,
    p_payload       JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_admin UUID := auth.uid();
    v_ms RECORD;
    v_reason TEXT;
    v_days INT;
    v_credits INT;
    v_delta INT;
    v_hold_days INT;
    v_new_end DATE;
    v_new_credits INT;
    v_new_status TEXT;
    v_old JSONB;
    v_new JSONB;
    v_action_type TEXT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF p_action IS NULL OR p_action NOT IN ('extend','hold','resume','credit_adjust','cancel') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_action');
    END IF;

    v_reason := NULLIF(trim(COALESCE(p_payload->>'reason','')), '');
    IF v_reason IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'reason_required');
    END IF;

    -- FOR UPDATE OF m — LEFT JOIN nullable side(mp)에는 잠금 미적용(PG 제약)
    SELECT m.id, m.plan_id, m.start_date, m.end_date, m.remaining_credits,
           m.status, m.pause_count, m.paused_at,
           COALESCE(mp.max_pauses, 0) AS max_pauses
      INTO v_ms
      FROM public.memberships m
      LEFT JOIN public.membership_plans mp ON mp.id = m.plan_id
     WHERE m.id = p_membership_id
     FOR UPDATE OF m;
    IF v_ms.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'membership_not_found');
    END IF;

    v_old := jsonb_build_object('end_date', v_ms.end_date, 'remaining_credits', v_ms.remaining_credits,
                                'status', v_ms.status, 'pause_count', v_ms.pause_count,
                                'paused_at', v_ms.paused_at);
    v_new_end     := v_ms.end_date;
    v_new_credits := v_ms.remaining_credits;
    v_new_status  := v_ms.status;

    IF p_action = 'extend' THEN
        v_days    := NULLIF(p_payload->>'days','')::INT;
        v_credits := NULLIF(p_payload->>'credits','')::INT;
        IF v_days IS NULL AND v_credits IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'nothing_to_extend');
        END IF;
        IF v_days IS NOT NULL THEN
            v_new_end := COALESCE(v_ms.end_date, CURRENT_DATE) + v_days;
        END IF;
        IF v_credits IS NOT NULL THEN
            v_new_credits := COALESCE(v_ms.remaining_credits, 0) + v_credits;
        END IF;
        v_action_type := 'extended';

    ELSIF p_action = 'hold' THEN
        IF v_ms.status = 'paused' THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'already_paused');
        END IF;
        IF v_ms.pause_count >= v_ms.max_pauses THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'max_pauses_exceeded');
        END IF;
        v_new_status := 'paused';
        v_action_type := 'paused';

    ELSIF p_action = 'resume' THEN
        IF v_ms.status <> 'paused' OR v_ms.paused_at IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_paused');
        END IF;
        v_hold_days := GREATEST((CURRENT_DATE - v_ms.paused_at::date), 0);
        IF v_ms.end_date IS NOT NULL THEN
            v_new_end := v_ms.end_date + v_hold_days;
        END IF;
        v_new_status := 'active';
        v_action_type := 'resumed';

    ELSIF p_action = 'credit_adjust' THEN
        v_delta := NULLIF(p_payload->>'delta','')::INT;
        IF v_delta IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'delta_required');
        END IF;
        v_new_credits := COALESCE(v_ms.remaining_credits, 0) + v_delta;
        IF v_new_credits < 0 THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'negative_credits');
        END IF;
        v_action_type := 'credit_adjusted';

    ELSIF p_action = 'cancel' THEN
        IF v_ms.status = 'cancelled' THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'already_cancelled');
        END IF;
        v_new_status := 'cancelled';
        v_action_type := 'cancelled';
    END IF;

    UPDATE public.memberships
       SET end_date          = v_new_end,
           remaining_credits = v_new_credits,
           status            = v_new_status,
           pause_count       = CASE WHEN p_action = 'hold' THEN pause_count + 1 ELSE pause_count END,
           paused_at         = CASE WHEN p_action = 'hold'   THEN now()
                                    WHEN p_action = 'resume' THEN NULL
                                    ELSE paused_at END,
           pause_reason      = CASE WHEN p_action = 'hold' THEN v_reason ELSE pause_reason END,
           updated_at        = now()
     WHERE id = p_membership_id;

    v_new := jsonb_build_object('end_date', v_new_end, 'remaining_credits', v_new_credits,
                                'status', v_new_status);

    INSERT INTO public.membership_history
        (membership_id, action_type, old_values, new_values, notes, changed_by)
    VALUES (p_membership_id, v_action_type, v_old, v_new, v_reason, v_admin);

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_admin, 'ADMIN_ADJUST_MEMBERSHIP_' || upper(p_action), 'memberships',
            p_membership_id, v_old, v_new || jsonb_build_object('reason', v_reason));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('membership_id', p_membership_id, 'action', p_action,
                                   'end_date', v_new_end, 'remaining_credits', v_new_credits,
                                   'status', v_new_status),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- O.3 fn_admin_transfer_membership(p_membership_id, p_target_member_id, p_reason)
--     원본 잔여기간/크레딧 → 대상 신규 멤버십(오늘 시작), 원본 status='cancelled'.
--     advisory lock + FOR UPDATE로 이중 양도 차단. 양측 history('transferred') + audit.
CREATE OR REPLACE FUNCTION public.fn_admin_transfer_membership(
    p_membership_id     UUID,
    p_target_member_id  UUID,
    p_reason            TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_admin UUID := auth.uid();
    v_src RECORD;
    v_reason TEXT;
    v_new_membership_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    v_reason := NULLIF(trim(COALESCE(p_reason, '')), '');
    IF v_reason IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'reason_required');
    END IF;
    IF p_target_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'missing_required_fields');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.members WHERE id = p_target_member_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'target_member_not_found');
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('membership_transfer:' || p_membership_id::text));

    SELECT m.id, m.member_id, m.plan_id, m.start_date, m.end_date,
           m.remaining_credits, m.status
      INTO v_src
      FROM public.memberships m
     WHERE m.id = p_membership_id
     FOR UPDATE;
    IF v_src.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'membership_not_found');
    END IF;
    IF v_src.status NOT IN ('active','paused') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'source_not_transferable');
    END IF;
    IF v_src.member_id = p_target_member_id THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'same_member');
    END IF;

    INSERT INTO public.memberships
        (member_id, plan_id, start_date, end_date, remaining_credits, status)
    VALUES (p_target_member_id, v_src.plan_id, CURRENT_DATE, v_src.end_date,
            v_src.remaining_credits, 'active')
    RETURNING id INTO v_new_membership_id;

    UPDATE public.memberships
       SET status = 'cancelled', updated_at = now()
     WHERE id = p_membership_id;

    INSERT INTO public.membership_history
        (membership_id, action_type, old_values, new_values, notes, changed_by)
    VALUES
        (p_membership_id, 'transferred',
         jsonb_build_object('status', v_src.status, 'from_member_id', v_src.member_id),
         jsonb_build_object('status', 'cancelled', 'to_member_id', p_target_member_id,
                            'new_membership_id', v_new_membership_id),
         v_reason, v_admin),
        (v_new_membership_id, 'transferred',
         jsonb_build_object('from_member_id', v_src.member_id, 'source_membership_id', p_membership_id),
         jsonb_build_object('to_member_id', p_target_member_id, 'end_date', v_src.end_date,
                            'remaining_credits', v_src.remaining_credits, 'status', 'active'),
         v_reason, v_admin);

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_admin, 'ADMIN_TRANSFER_MEMBERSHIP', 'memberships', p_membership_id,
            jsonb_build_object('from_member_id', v_src.member_id),
            jsonb_build_object('to_member_id', p_target_member_id,
                               'new_membership_id', v_new_membership_id, 'reason', v_reason));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('source_membership_id', p_membership_id,
                                   'new_membership_id', v_new_membership_id,
                                   'from_member_id', v_src.member_id,
                                   'to_member_id', p_target_member_id),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- O.4 fn_admin_book_session(p_session_id, p_member_id) — 관리자 대리 예약.
--     fn_book_with_credit 로직 승계(정원→waitlist, 횟수제 크레딧 FOR UPDATE 차감, 중복 방지).
--     정책(예약 윈도우/주간 상한/노쇼)은 admin 대리 예약에서 운영 예외.
CREATE OR REPLACE FUNCTION public.fn_admin_book_session(
    p_session_id UUID,
    p_member_id  UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_admin UUID := auth.uid();
    v_session RECORD;
    v_membership RECORD;
    v_booking_id UUID;
    v_confirmed INT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.members WHERE id = p_member_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;

    SELECT s.id, s.capacity, s.session_date, s.start_time, s.status
      INTO v_session
      FROM public.sessions s WHERE s.id = p_session_id;
    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_found');
    END IF;
    IF v_session.status <> 'scheduled'
       OR (v_session.session_date + v_session.start_time) < now() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_bookable');
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('booking:' || p_session_id::text));

    IF EXISTS (SELECT 1 FROM public.bookings
               WHERE session_id = p_session_id AND member_id = p_member_id
                 AND status <> 'cancelled') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'already_booked');
    END IF;

    SELECT COUNT(*) INTO v_confirmed
    FROM public.bookings WHERE session_id = p_session_id AND status = 'confirmed';

    IF v_confirmed >= v_session.capacity THEN
        INSERT INTO public.bookings (session_id, member_id, status)
        VALUES (p_session_id, p_member_id, 'waitlisted')
        ON CONFLICT (session_id, member_id) DO UPDATE
            SET status = 'waitlisted', cancel_reason = NULL, updated_at = now()
        RETURNING id INTO v_booking_id;

        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
        VALUES (v_admin, 'ADMIN_BOOK_SESSION', 'bookings', v_booking_id,
                jsonb_build_object('session_id', p_session_id, 'member_id', p_member_id,
                                   'status', 'waitlisted'));

        RETURN jsonb_build_object('success', true,
            'data', jsonb_build_object('booking_id', v_booking_id, 'status', 'waitlisted',
                                       'credits_used', 0),
            'error', NULL);
    END IF;

    SELECT id, remaining_credits INTO v_membership
    FROM public.memberships
    WHERE member_id = p_member_id AND status = 'active'
      AND remaining_credits IS NOT NULL AND remaining_credits > 0
    ORDER BY end_date ASC NULLS LAST
    LIMIT 1
    FOR UPDATE;

    IF v_membership.id IS NOT NULL THEN
        UPDATE public.memberships
        SET remaining_credits = remaining_credits - 1, updated_at = now()
        WHERE id = v_membership.id;
    END IF;

    INSERT INTO public.bookings (session_id, member_id, membership_id, status, credit_used)
    VALUES (p_session_id, p_member_id, v_membership.id, 'confirmed', v_membership.id IS NOT NULL)
    ON CONFLICT (session_id, member_id) DO UPDATE
        SET status = 'confirmed', membership_id = EXCLUDED.membership_id,
            credit_used = EXCLUDED.credit_used, cancel_reason = NULL, updated_at = now()
    RETURNING id INTO v_booking_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (v_admin, 'ADMIN_BOOK_SESSION', 'bookings', v_booking_id,
            jsonb_build_object('session_id', p_session_id, 'member_id', p_member_id,
                               'status', 'confirmed',
                               'credit_used', v_membership.id IS NOT NULL));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'booking_id', v_booking_id, 'status', 'confirmed',
            'credits_used', CASE WHEN v_membership.id IS NOT NULL THEN 1 ELSE 0 END,
            'remaining_credits', CASE WHEN v_membership.id IS NOT NULL
                                      THEN v_membership.remaining_credits - 1 END),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- O.5 fn_admin_add_walkin(p_session_id, p_member_id) — 현장 워크인(booking+checkin 원자).
--     ※ bookings.booking_type CHECK(regular/trial/makeup)에 walk_in 없음 →
--       booking_type='regular' 유지, 판정은 attendance_outcome='walk_in'
--       (fn_mark_attendance walk_in 경로와 동일 규약, 스키마가 단일 소스). audit.
CREATE OR REPLACE FUNCTION public.fn_admin_add_walkin(
    p_session_id UUID,
    p_member_id  UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_admin UUID := auth.uid();
    v_session RECORD;
    v_booking_id UUID;
    v_checkin_id UUID;
    v_now TIMESTAMPTZ := now();
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.members WHERE id = p_member_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;

    SELECT s.id, s.facility_id INTO v_session
    FROM public.sessions s WHERE s.id = p_session_id;
    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_found');
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('booking:' || p_session_id::text));

    INSERT INTO public.bookings
        (session_id, member_id, status, attendance_outcome, attendance_marked_at, attendance_marked_by)
    VALUES (p_session_id, p_member_id, 'confirmed', 'walk_in', v_now, v_admin)
    ON CONFLICT (session_id, member_id) DO UPDATE
        SET status = 'confirmed', attendance_outcome = 'walk_in',
            attendance_marked_at = v_now, attendance_marked_by = v_admin,
            cancel_reason = NULL, updated_at = v_now
    RETURNING id INTO v_booking_id;

    INSERT INTO public.checkins
        (booking_id, member_id, session_id, facility_id, checkin_method, checkin_time)
    VALUES (v_booking_id, p_member_id, p_session_id, v_session.facility_id, 'manual', v_now)
    ON CONFLICT (session_id, member_id) WHERE session_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_checkin_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (v_admin, 'ADMIN_ADD_WALKIN', 'bookings', v_booking_id,
            jsonb_build_object('session_id', p_session_id, 'member_id', p_member_id,
                               'attendance_outcome', 'walk_in'));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('booking_id', v_booking_id, 'checkin_id', v_checkin_id,
                                   'attendance_outcome', 'walk_in'),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;


-- ============================================================================
-- [P] Admin 파괴적 audit·원자성 (Phase 2 하드닝 — 02-admin §3.2·§3.3·§3.5·§3.6)
--     마이그레이션 20260708050000_admin_audit_rpc.sql와 동일 소스.
--     보강 3종(fn_mark_attendance·fn_cancel_booking_with_credit·
--     fn_upsert_member_alert_flag)의 audit_logs INSERT는 각 원 정의(D.5/C.2/G.2)에
--     직접 반영됨 → 여기서는 신규 7종만 정의.
-- ============================================================================

-- P.1 fn_admin_set_blacklist(p_member_id, p_on, p_reason) — 블랙리스트 토글
--     p_on=true면 사유 필수(reason_required). members.is_blacklisted 갱신 + audit.
CREATE OR REPLACE FUNCTION public.fn_admin_set_blacklist(
    p_member_id UUID,
    p_on        BOOLEAN,
    p_reason    TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_admin  UUID := auth.uid();
    v_member RECORD;
    v_reason TEXT;
    v_old    JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF p_member_id IS NULL OR p_on IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'missing_required_fields');
    END IF;

    IF p_on THEN
        v_reason := NULLIF(trim(COALESCE(p_reason, '')), '');
        IF v_reason IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'reason_required');
        END IF;
    END IF;

    SELECT id, is_blacklisted, blacklist_reason
      INTO v_member
      FROM public.members WHERE id = p_member_id FOR UPDATE;
    IF v_member.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;

    v_old := jsonb_build_object('is_blacklisted', v_member.is_blacklisted,
                                'blacklist_reason', v_member.blacklist_reason);

    UPDATE public.members
       SET is_blacklisted   = p_on,
           blacklist_reason = CASE WHEN p_on THEN v_reason ELSE NULL END,
           updated_at       = now()
     WHERE id = p_member_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_admin, CASE WHEN p_on THEN 'ADMIN_SET_BLACKLIST' ELSE 'ADMIN_UNSET_BLACKLIST' END,
            'members', p_member_id, v_old,
            jsonb_build_object('is_blacklisted', p_on,
                               'blacklist_reason', CASE WHEN p_on THEN v_reason ELSE NULL END));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('member_id', p_member_id, 'is_blacklisted', p_on),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- P.2 fn_admin_review_signup(p_user_id, p_decision, p_reason) — 가입 승인/거부
--     p_decision IN('approved','rejected'). pending 아니면 not_pending.
--     approved→approved_at/approved_by, rejected→rejected_reason. audit.
CREATE OR REPLACE FUNCTION public.fn_admin_review_signup(
    p_user_id  UUID,
    p_decision TEXT,
    p_reason   TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_admin   UUID := auth.uid();
    v_profile RECORD;
    v_reason  TEXT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF p_user_id IS NULL OR p_decision IS NULL OR p_decision NOT IN ('approved','rejected') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_decision');
    END IF;

    SELECT id, approval_status, role INTO v_profile
      FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF v_profile.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'user_not_found');
    END IF;
    IF v_profile.approval_status <> 'pending' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_pending');
    END IF;

    v_reason := NULLIF(trim(COALESCE(p_reason, '')), '');

    UPDATE public.profiles
       SET approval_status = p_decision,
           approved_at     = CASE WHEN p_decision = 'approved' THEN now() ELSE approved_at END,
           approved_by     = CASE WHEN p_decision = 'approved' THEN v_admin ELSE approved_by END,
           rejected_reason = CASE WHEN p_decision = 'rejected' THEN v_reason ELSE rejected_reason END,
           updated_at      = now()
     WHERE id = p_user_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_admin, 'ADMIN_REVIEW_SIGNUP_' || upper(p_decision), 'profiles', p_user_id,
            jsonb_build_object('approval_status', 'pending'),
            jsonb_build_object('approval_status', p_decision, 'reason', v_reason));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('user_id', p_user_id, 'approval_status', p_decision),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- P.3 fn_upsert_membership_plan(p_payload) — 요금제 생성/수정 (id 유무 분기)
--     type/price/duration_days/credit_count/plan_kind/refund_policy/max_pauses/
--     facility_sharing/is_active(+name/facility_id/discount_price/description). audit(old/new).
CREATE OR REPLACE FUNCTION public.fn_upsert_membership_plan(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_admin   UUID := auth.uid();
    v_id      UUID;
    v_old     JSONB;
    v_new     JSONB;
    v_created BOOLEAN := false;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    v_id := NULLIF(p_payload->>'id', '')::UUID;

    IF v_id IS NULL THEN
        v_created := true;
        INSERT INTO public.membership_plans
            (facility_id, name, type, plan_kind, duration_days, credit_count,
             price, discount_price, description, refund_policy, max_pauses,
             facility_sharing, is_active)
        VALUES (
            NULLIF(p_payload->>'facility_id', '')::UUID,
            p_payload->>'name',
            p_payload->>'type',
            COALESCE(NULLIF(p_payload->>'plan_kind', ''), 'standard'),
            NULLIF(p_payload->>'duration_days', '')::INT,
            NULLIF(p_payload->>'credit_count', '')::INT,
            COALESCE(NULLIF(p_payload->>'price', '')::NUMERIC, 0),
            NULLIF(p_payload->>'discount_price', '')::NUMERIC,
            p_payload->>'description',
            COALESCE(p_payload->'refund_policy',
                     '{"formula": "statutory_kr", "penalty_rate_cap": 0.10}'::jsonb),
            COALESCE(NULLIF(p_payload->>'max_pauses', '')::INT, 0),
            COALESCE((p_payload->>'facility_sharing')::BOOLEAN, false),
            COALESCE((p_payload->>'is_active')::BOOLEAN, true))
        RETURNING id INTO v_id;
        v_old := NULL;
    ELSE
        SELECT to_jsonb(mp.*) INTO v_old FROM public.membership_plans mp WHERE mp.id = v_id;
        IF v_old IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'plan_not_found');
        END IF;

        UPDATE public.membership_plans SET
            facility_id      = CASE WHEN p_payload ? 'facility_id'
                                    THEN NULLIF(p_payload->>'facility_id', '')::UUID ELSE facility_id END,
            name             = COALESCE(p_payload->>'name', name),
            type             = COALESCE(NULLIF(p_payload->>'type', ''), type),
            plan_kind        = COALESCE(NULLIF(p_payload->>'plan_kind', ''), plan_kind),
            duration_days    = CASE WHEN p_payload ? 'duration_days'
                                    THEN NULLIF(p_payload->>'duration_days', '')::INT ELSE duration_days END,
            credit_count     = CASE WHEN p_payload ? 'credit_count'
                                    THEN NULLIF(p_payload->>'credit_count', '')::INT ELSE credit_count END,
            price            = COALESCE(NULLIF(p_payload->>'price', '')::NUMERIC, price),
            discount_price   = CASE WHEN p_payload ? 'discount_price'
                                    THEN NULLIF(p_payload->>'discount_price', '')::NUMERIC ELSE discount_price END,
            description      = CASE WHEN p_payload ? 'description'
                                    THEN p_payload->>'description' ELSE description END,
            refund_policy    = COALESCE(p_payload->'refund_policy', refund_policy),
            max_pauses       = COALESCE(NULLIF(p_payload->>'max_pauses', '')::INT, max_pauses),
            facility_sharing = COALESCE((p_payload->>'facility_sharing')::BOOLEAN, facility_sharing),
            is_active        = COALESCE((p_payload->>'is_active')::BOOLEAN, is_active),
            updated_at       = now()
        WHERE id = v_id;
    END IF;

    SELECT to_jsonb(mp.*) INTO v_new FROM public.membership_plans mp WHERE mp.id = v_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_admin, CASE WHEN v_created THEN 'CREATE_MEMBERSHIP_PLAN' ELSE 'UPDATE_MEMBERSHIP_PLAN' END,
            'membership_plans', v_id, v_old, v_new);

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('plan_id', v_id, 'created', v_created),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- P.4 fn_archive_membership_plan(p_plan_id) — 요금제 보관(숨김)
--     활성 구독 존재 시 has_active_subscriptions로 차단. 물리 삭제 대신 is_active=false. audit.
CREATE OR REPLACE FUNCTION public.fn_archive_membership_plan(p_plan_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_admin       UUID := auth.uid();
    v_plan        RECORD;
    v_active_subs INT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF p_plan_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'missing_required_fields');
    END IF;

    SELECT id, is_active INTO v_plan
      FROM public.membership_plans WHERE id = p_plan_id FOR UPDATE;
    IF v_plan.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'plan_not_found');
    END IF;

    SELECT COUNT(*) INTO v_active_subs
      FROM public.memberships
     WHERE plan_id = p_plan_id AND status = 'active';
    IF v_active_subs > 0 THEN
        RETURN jsonb_build_object('success', false,
            'data', jsonb_build_object('active_subscriptions', v_active_subs),
            'error', 'has_active_subscriptions');
    END IF;

    UPDATE public.membership_plans SET is_active = false, updated_at = now() WHERE id = p_plan_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_admin, 'ARCHIVE_MEMBERSHIP_PLAN', 'membership_plans', p_plan_id,
            jsonb_build_object('is_active', v_plan.is_active),
            jsonb_build_object('is_active', false));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('plan_id', p_plan_id, 'is_active', false),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- P.5 fn_upsert_session(p_payload) — 세션 생성/수정 + session_coaches 원자 교체
--     payload.coaches=[{coach_id,assignment_role,display_order}] 있으면 delete-all→insert.
--     편집 & date/start_time/end_time 변경 & 활성 예약(confirmed+waitlisted)>0이면
--     data.affected_count 포함(저장은 진행 — confirm은 UI). audit(old/new).
CREATE OR REPLACE FUNCTION public.fn_upsert_session(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_admin        UUID := auth.uid();
    v_id           UUID;
    v_sess         RECORD;
    v_old          JSONB;
    v_new          JSONB;
    v_created      BOOLEAN := false;
    v_time_changed BOOLEAN := false;
    v_affected     INT := 0;
    v_new_date     DATE;
    v_new_start    TIME;
    v_new_end      TIME;
    v_data         JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    v_id := NULLIF(p_payload->>'id', '')::UUID;

    IF v_id IS NULL THEN
        v_created := true;
        INSERT INTO public.sessions
            (facility_id, title, description, session_type, class_type,
             session_date, start_time, end_time, capacity, intensity_level, status)
        VALUES (
            NULLIF(p_payload->>'facility_id', '')::UUID,
            p_payload->>'title',
            p_payload->>'description',
            COALESCE(NULLIF(p_payload->>'session_type', ''), 'group'),
            NULLIF(p_payload->>'class_type', ''),
            (p_payload->>'session_date')::DATE,
            (p_payload->>'start_time')::TIME,
            (p_payload->>'end_time')::TIME,
            COALESCE(NULLIF(p_payload->>'capacity', '')::INT, 15),
            NULLIF(p_payload->>'intensity_level', ''),
            COALESCE(NULLIF(p_payload->>'status', ''), 'scheduled'))
        RETURNING id INTO v_id;
        v_old := NULL;
    ELSE
        SELECT * INTO v_sess FROM public.sessions WHERE id = v_id FOR UPDATE;
        IF v_sess.id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_found');
        END IF;
        v_old := to_jsonb(v_sess);

        v_new_date  := COALESCE((p_payload->>'session_date')::DATE, v_sess.session_date);
        v_new_start := COALESCE((p_payload->>'start_time')::TIME, v_sess.start_time);
        v_new_end   := COALESCE((p_payload->>'end_time')::TIME, v_sess.end_time);
        v_time_changed := (v_new_date <> v_sess.session_date
                           OR v_new_start <> v_sess.start_time
                           OR v_new_end <> v_sess.end_time);

        UPDATE public.sessions SET
            facility_id     = CASE WHEN p_payload ? 'facility_id'
                                   THEN NULLIF(p_payload->>'facility_id', '')::UUID ELSE facility_id END,
            title           = COALESCE(p_payload->>'title', title),
            description      = CASE WHEN p_payload ? 'description'
                                   THEN p_payload->>'description' ELSE description END,
            session_type    = COALESCE(NULLIF(p_payload->>'session_type', ''), session_type),
            class_type      = CASE WHEN p_payload ? 'class_type'
                                   THEN NULLIF(p_payload->>'class_type', '') ELSE class_type END,
            session_date    = v_new_date,
            start_time      = v_new_start,
            end_time        = v_new_end,
            capacity        = COALESCE(NULLIF(p_payload->>'capacity', '')::INT, capacity),
            intensity_level = CASE WHEN p_payload ? 'intensity_level'
                                   THEN NULLIF(p_payload->>'intensity_level', '') ELSE intensity_level END,
            status          = COALESCE(NULLIF(p_payload->>'status', ''), status),
            updated_at      = now()
        WHERE id = v_id;

        IF v_time_changed THEN
            SELECT COUNT(*) INTO v_affected
              FROM public.bookings
             WHERE session_id = v_id AND status IN ('confirmed','waitlisted');
        END IF;
    END IF;

    -- session_coaches 원자 교체 (payload.coaches 제공 시에만 — delete-all → insert)
    IF p_payload ? 'coaches' THEN
        DELETE FROM public.session_coaches WHERE session_id = v_id;
        INSERT INTO public.session_coaches (session_id, coach_id, assignment_role, display_order)
        SELECT v_id,
               (c->>'coach_id')::UUID,
               COALESCE(NULLIF(c->>'assignment_role', ''), 'lead'),
               COALESCE(NULLIF(c->>'display_order', '')::INT, 0)
          FROM jsonb_array_elements(p_payload->'coaches') c
         WHERE NULLIF(c->>'coach_id', '') IS NOT NULL;
    END IF;

    SELECT to_jsonb(s.*) INTO v_new FROM public.sessions s WHERE s.id = v_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_admin, CASE WHEN v_created THEN 'CREATE_SESSION' ELSE 'UPDATE_SESSION' END,
            'sessions', v_id, v_old, v_new);

    v_data := jsonb_build_object('session_id', v_id, 'created', v_created,
                                 'coaches_replaced', (p_payload ? 'coaches'));
    IF v_time_changed AND v_affected > 0 THEN
        v_data := v_data || jsonb_build_object('time_changed', true, 'affected_count', v_affected);
    END IF;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- P.6 fn_cancel_session(p_session_id, p_reason) — 세션 취소(원자)
--     활성 예약 크레딧 복구(credit_used=true 원천에만 +1) + bookings/sessions cancelled.
--     세션 단위 advisory lock. data: refunded_count/credit_restored_count/cancelled_booking_count.
--     알림 발송은 범위 외(대량 취소 알림은 별도 크론/Edge). 대기자 먼저 취소로 빈자리 알림 억제.
CREATE OR REPLACE FUNCTION public.fn_cancel_session(p_session_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_admin         UUID := auth.uid();
    v_session       RECORD;
    v_reason        TEXT;
    v_restored      INT := 0;
    v_cancelled     INT := 0;
    v_wl_cancelled  INT := 0;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    v_reason := COALESCE(NULLIF(trim(COALESCE(p_reason, '')), ''), 'session_cancelled');

    PERFORM pg_advisory_xact_lock(hashtext('booking:' || p_session_id::text));

    SELECT id, status INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_found');
    END IF;
    IF v_session.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'already_cancelled');
    END IF;

    -- 크레딧 복구: 활성 예약 중 credit_used=true 건의 차감 원천 멤버십에만 +1
    -- (UNIQUE(session_id,member_id)로 멤버십 중복 갱신 없음)
    WITH restored AS (
        UPDATE public.memberships ms
           SET remaining_credits = COALESCE(ms.remaining_credits, 0) + 1, updated_at = now()
          FROM public.bookings b
         WHERE b.session_id = p_session_id
           AND b.status IN ('confirmed','waitlisted')
           AND b.credit_used = true
           AND b.membership_id = ms.id
        RETURNING b.id)
    SELECT COUNT(*) INTO v_restored FROM restored;

    -- 대기자 먼저 취소(빈자리 알림 트리거 억제) → 확정자 취소
    UPDATE public.bookings
       SET status = 'cancelled', cancel_reason = v_reason, updated_at = now()
     WHERE session_id = p_session_id AND status = 'waitlisted';
    GET DIAGNOSTICS v_wl_cancelled = ROW_COUNT;

    UPDATE public.bookings
       SET status = 'cancelled', credit_used = false, cancel_reason = v_reason, updated_at = now()
     WHERE session_id = p_session_id AND status = 'confirmed';
    GET DIAGNOSTICS v_cancelled = ROW_COUNT;

    v_cancelled := v_cancelled + v_wl_cancelled;

    UPDATE public.sessions SET status = 'cancelled', updated_at = now() WHERE id = p_session_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_admin, 'ADMIN_CANCEL_SESSION', 'sessions', p_session_id,
            jsonb_build_object('status', v_session.status),
            jsonb_build_object('status', 'cancelled', 'reason', v_reason,
                               'cancelled_booking_count', v_cancelled,
                               'credit_restored_count', v_restored));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('session_id', p_session_id,
                                   'refunded_count', v_restored,
                                   'credit_restored_count', v_restored,
                                   'cancelled_booking_count', v_cancelled),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- P.7 fn_promote_from_waitlist(p_booking_id) — 대기자 수동 승격
--     waitlisted 아니면 not_waitlisted; confirmed 수 >= capacity면 session_full.
--     크레딧: 이미 차감(credit_used)이면 재차감 없음, 미차감(대기 등록분)+횟수제면 1회 차감.
--     FOR UPDATE + 세션 단위 advisory lock으로 정원 경쟁 차단. audit.
CREATE OR REPLACE FUNCTION public.fn_promote_from_waitlist(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_admin           UUID := auth.uid();
    v_booking         RECORD;
    v_session         RECORD;
    v_confirmed       INT;
    v_membership      RECORD;
    v_credit_deducted BOOLEAN := false;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    SELECT id, session_id, member_id, status, credit_used, membership_id
      INTO v_booking
      FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
    IF v_booking.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'booking_not_found');
    END IF;
    IF v_booking.status <> 'waitlisted' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_waitlisted');
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('booking:' || v_booking.session_id::text));

    SELECT id, capacity INTO v_session
      FROM public.sessions WHERE id = v_booking.session_id FOR UPDATE;
    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_found');
    END IF;

    SELECT COUNT(*) INTO v_confirmed
      FROM public.bookings WHERE session_id = v_booking.session_id AND status = 'confirmed';
    IF v_confirmed >= v_session.capacity THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_full');
    END IF;

    -- 크레딧: 이미 차감됐으면 재차감 없음. 대기 등록분(credit_used=false)+횟수제 멤버십이면 1회 차감
    IF NOT v_booking.credit_used THEN
        SELECT id, remaining_credits INTO v_membership
          FROM public.memberships
         WHERE member_id = v_booking.member_id AND status = 'active'
           AND remaining_credits IS NOT NULL AND remaining_credits > 0
         ORDER BY end_date ASC NULLS LAST
         LIMIT 1
         FOR UPDATE;
        IF v_membership.id IS NOT NULL THEN
            UPDATE public.memberships
               SET remaining_credits = remaining_credits - 1, updated_at = now()
             WHERE id = v_membership.id;
            v_credit_deducted := true;
        END IF;
    END IF;

    UPDATE public.bookings
       SET status               = 'confirmed',
           membership_id        = CASE WHEN v_credit_deducted THEN v_membership.id ELSE membership_id END,
           credit_used          = CASE WHEN v_credit_deducted THEN true ELSE credit_used END,
           waitlist_promoted_at = now(),
           updated_at           = now()
     WHERE id = p_booking_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_admin, 'PROMOTE_FROM_WAITLIST', 'bookings', p_booking_id,
            jsonb_build_object('status', 'waitlisted', 'credit_used', v_booking.credit_used),
            jsonb_build_object('status', 'confirmed', 'credit_deducted', v_credit_deducted));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('booking_id', p_booking_id, 'status', 'confirmed',
                                   'credit_deducted', v_credit_deducted,
                                   'credits_used', CASE WHEN v_credit_deducted THEN 1 ELSE 0 END),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;


-- ============================================================================
-- [Z] 권한 — REVOKE FROM PUBLIC + GRANT (전 함수 일괄)
-- ============================================================================
DO $$
DECLARE
    v_fn TEXT;
BEGIN
    -- 기본: authenticated 전용
    FOR v_fn IN VALUES
        ('public._assert_coach_or_admin()'),
        ('public._assert_coach_can_edit_session(uuid)'),
        ('public.fn_my_permissions()'),
        ('public.promote_to_coach(uuid)'),
        ('public.demote_from_coach(uuid)'),
        ('public.fn_sign_agreement(text,text,text)'),
        ('public.fn_book_with_credit(uuid)'),
        ('public.fn_cancel_booking_with_credit(uuid,text)'),
        ('public.fn_get_my_coach_context()'),
        ('public.fn_get_my_coach_dashboard()'),
        ('public.fn_get_coach_schedule(date,date)'),
        ('public.fn_get_coach_session_board(uuid)'),
        ('public.fn_mark_attendance(uuid,jsonb)'),
        ('public.fn_search_wod_movements(text,text,text,int)'),
        ('public.fn_list_movement_library(text,text,boolean,int,int)'),
        ('public.fn_list_wod_templates(text,uuid,text)'),
        ('public.fn_get_wod_template(uuid)'),
        ('public.fn_upsert_wod_template(jsonb)'),
        ('public.fn_publish_wod_template(uuid)'),
        ('public.fn_get_session_wod(uuid)'),
        ('public.fn_upsert_session_wod(uuid,jsonb)'),
        ('public.fn_publish_session_wod(uuid)'),
        ('public.fn_list_runbook_templates(uuid,text)'),
        ('public.fn_upsert_runbook_template(jsonb)'),
        ('public.fn_get_session_runbook(uuid)'),
        ('public.fn_upsert_session_runbook(uuid,jsonb)'),
        ('public.fn_get_member_context_panel(uuid)'),
        ('public.fn_upsert_member_alert_flag(uuid,jsonb)'),
        ('public.fn_get_coach_monthly_report(text,text[],uuid)'),
        ('public.fn_calculate_monthly_settlement(text)'),
        ('public.fn_calculate_refund(uuid,uuid)'),
        ('public.fn_list_benchmark_definitions(boolean)'),
        ('public.fn_record_member_benchmark_result(uuid,uuid,numeric,uuid,uuid,jsonb,text)'),
        ('public.fn_get_member_performance_profile(uuid)'),
        ('public.fn_create_followup(jsonb)'),
        ('public.fn_complete_followup(uuid,text)'),
        ('public.fn_get_my_followups(text,uuid,int)'),
        ('public.fn_record_session_wod_result(uuid,numeric,text,text,text)'),
        ('public.fn_get_session_wod_whiteboard(uuid)'),
        ('public.fn_get_my_wod_prep(uuid)'),
        ('public.fn_get_my_badges()'),
        ('public.fn_evaluate_badges(uuid,text)'),
        ('public.fn_prepare_race_session(uuid,text,jsonb)'),
        ('public.fn_get_dashboard_kpis()'),
        ('public.fn_get_revenue_stats(date,date)'),
        ('public.fn_get_coach_performance_stats()'),
        ('public.save_pg_settings(uuid,text,text,text,text)'),
        ('public.fn_admin_create_membership(uuid,uuid,date,uuid)'),
        ('public.fn_admin_adjust_membership(uuid,text,jsonb)'),
        ('public.fn_admin_transfer_membership(uuid,uuid,text)'),
        ('public.fn_admin_book_session(uuid,uuid)'),
        ('public.fn_admin_add_walkin(uuid,uuid)'),
        ('public.fn_admin_set_blacklist(uuid,boolean,text)'),
        ('public.fn_admin_review_signup(uuid,text,text)'),
        ('public.fn_upsert_membership_plan(jsonb)'),
        ('public.fn_archive_membership_plan(uuid)'),
        ('public.fn_upsert_session(jsonb)'),
        ('public.fn_cancel_session(uuid,text)'),
        ('public.fn_promote_from_waitlist(uuid)')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_fn);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_fn);
    END LOOP;

    -- anon 화이트리스트 (키오스크 + Class TV — 05-class-portal §6.1)
    FOR v_fn IN VALUES
        ('public.fn_kiosk_checkin(jsonb)'),
        ('public.fn_get_class_display_wod(uuid,date,uuid)'),
        ('public.fn_get_class_live_board(uuid)'),
        ('public.fn_get_class_screen_prs(uuid,int)'),
        ('public.fn_get_class_leaderboard(uuid,text)')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', v_fn);
    END LOOP;

    -- Service Role 전용 (클라이언트 미노출)
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_decrypted_pg_settings(uuid,text) FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_decrypted_pg_settings(uuid,text) FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_decrypted_pg_settings(uuid,text) FROM authenticated';

    -- 내부 함수(트리거·크론·설정) client 회수 — PG 기본 PUBLIC EXECUTE 제거로 anon 화이트리스트 계약 관철.
    -- 트리거는 트리거 메커니즘, 크론은 크론 소유자로 실행되므로 client EXECUTE 회수해도 정상 동작.
    -- ※ RLS 헬퍼(is_admin/is_admin_or_coach/current_member_id)는 RLS 평가에 필요 → 회수 대상 아님.
    -- ⚠️ _notify_edge_config는 service_key를 반환 → 전 client 역할 회수(트리거 definer 내부 호출만 허용).
    EXECUTE 'REVOKE ALL ON FUNCTION public._notify_edge_config() FROM PUBLIC, anon, authenticated';
    FOR v_fn IN VALUES
        ('public._badges_on_benchmark()'),
        ('public._badges_on_checkin()'),
        ('public._badges_on_membership()'),
        ('public._badges_on_race_record()'),
        ('public.fn_handle_notification_side_effects()'),
        ('public.fn_notify_waitlist_on_vacancy()'),
        ('public.handle_new_auth_user()'),
        ('public.update_updated_at_column()'),
        ('public.fn_send_class_reminders()'),
        ('public.fn_send_membership_expiry_reminders()')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_fn);
    END LOOP;
END $$;

-- ============================================================================
-- [Q] Phase 2B audit 하드닝 — 트리거 + config 쓰기 RPC
--     (마이그레이션 20260708060000_admin_audit_hardening.sql 미러)
--     목적: Admin config 쓰기가 audit_logs 불변식("edit 이상 모든 쓰기는 audit 기록")을
--           우회하던 [권고] 갭을 광역 AFTER 트리거로 일괄 해소 + 서버 강제 부족했던
--           고위험 쓰기(payment_mode·RBAC·코치 급여)에 전용 RPC 도입.
--     스키마 보강(Part C):
--       support_tickets += reply text, replied_at timestamptz, replied_by uuid
--                          (assigned_to 관례 따라 FK 없음)
--       badge_awards    += revoke_reason text, revoked_at timestamptz, revoked_by uuid (nullable)
--     ※ audit_logs 실제 컬럼 = user_id/action/table_name/record_id/old_values/new_values/…
--       (문서 초안의 actor/target_table 아님)
-- ============================================================================

-- Q.A1 _audit_row_change() — config 테이블 광역 audit AFTER 트리거 함수
--      action = <op>_<table> (예: update_lockers), record_id = COALESCE(NEW.id, OLD.id),
--      old/new = to_jsonb(row). auth.uid()는 cron/system 쓰기 시 NULL 허용.
CREATE OR REPLACE FUNCTION public._audit_row_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_old jsonb := NULL;
    v_new jsonb := NULL;
    v_record_id uuid;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_new := to_jsonb(NEW);
        v_record_id := NEW.id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
        v_record_id := COALESCE(NEW.id, OLD.id);
    ELSE -- DELETE
        v_old := to_jsonb(OLD);
        v_record_id := OLD.id;
    END IF;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), lower(TG_OP) || '_' || TG_TABLE_NAME, TG_TABLE_NAME,
            v_record_id, v_old, v_new);

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Q.A2 _audit_system_config_change() — system_config 전용(is_secret 행 config_value 마스킹 ***)
CREATE OR REPLACE FUNCTION public._audit_system_config_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_old jsonb := NULL;
    v_new jsonb := NULL;
    v_record_id uuid;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        v_old := to_jsonb(OLD);
        IF OLD.is_secret THEN
            v_old := jsonb_set(v_old, '{config_value}', '"***"'::jsonb);
        END IF;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        v_new := to_jsonb(NEW);
        IF NEW.is_secret THEN
            v_new := jsonb_set(v_new, '{config_value}', '"***"'::jsonb);
        END IF;
    END IF;
    v_record_id := COALESCE(NEW.id, OLD.id);

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), lower(TG_OP) || '_system_config', 'system_config',
            v_record_id, v_old, v_new);

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Q.A3 트리거 부착 — config 18종 + system_config 전용.
--      제외(고빈도/트랜잭션): checkins/bookings/payments/members/profiles/sessions/session_wod_results 등.
DO $$
DECLARE
    v_tbl text;
BEGIN
    FOREACH v_tbl IN ARRAY ARRAY[
        'coaches', 'lockers', 'notices', 'banners', 'faqs', 'notification_rules',
        'badge_definitions', 'badge_awards', 'race_events', 'pm5_devices',
        'movement_library', 'kiosk_devices', 'qr_codes', 'facilities',
        'session_feedback', 'support_tickets', 'admin_roles', 'admin_user_roles'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$I', v_tbl);
        EXECUTE format(
            'CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I '
            'FOR EACH ROW EXECUTE FUNCTION public._audit_row_change()', v_tbl);
    END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_audit_system_config ON public.system_config;
CREATE TRIGGER trg_audit_system_config
    AFTER INSERT OR UPDATE OR DELETE ON public.system_config
    FOR EACH ROW EXECUTE FUNCTION public._audit_system_config_change();

-- Q.B0 _is_super_admin() — '*' 권한 role 보유 OR (admin && role 매핑 없음) 부트스트랩
--      (fn_my_permissions.is_super_admin / bootstrap 로직과 동일)
CREATE OR REPLACE FUNCTION public._is_super_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.admin_user_roles aur
        JOIN public.admin_roles ar ON ar.id = aur.role_id
        WHERE aur.user_id = auth.uid() AND ar.permissions ? '*'
    ) THEN
        RETURN true;
    END IF;
    IF public.is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.admin_user_roles aur WHERE aur.user_id = auth.uid()
    ) THEN
        RETURN true;
    END IF;
    RETURN false;
END;
$$;

-- Q.B1 fn_set_payment_mode(p_mode) — pg_settings.payment_mode 전환. 게이트 is_admin().
--      ※ pg_settings에는 Part A 트리거 없음 → 이 RPC에서만 수동 audit(set_payment_mode).
--      ENFORCEMENT: min(admin,env) 이중장치의 env 축은 결제 승인 시점(서버/edge)에서 강제.
--      Postgres 세션에 배포 env가 없으므로 mode 값 자체는 여기서 막지 않고 관리자 인증+값검증+audit만 강제.
CREATE OR REPLACE FUNCTION public.fn_set_payment_mode(p_mode text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_row RECORD;
    v_count int := 0;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF p_mode IS NULL OR p_mode NOT IN ('simulation', 'live') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_mode');
    END IF;

    FOR v_row IN SELECT id, payment_mode FROM public.pg_settings FOR UPDATE
    LOOP
        IF v_row.payment_mode IS DISTINCT FROM p_mode THEN
            UPDATE public.pg_settings SET payment_mode = p_mode, updated_at = now()
            WHERE id = v_row.id;

            INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
            VALUES (auth.uid(), 'set_payment_mode', 'pg_settings', v_row.id,
                    jsonb_build_object('payment_mode', v_row.payment_mode),
                    jsonb_build_object('payment_mode', p_mode));
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('payment_mode', p_mode, 'updated_rows', v_count), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- Q.B2 fn_set_role_permissions(p_role_id, p_permissions) — admin_roles.permissions 편집.
--      게이트 super_admin 전용. 시스템 역할 편집 잠금. mutation → trg_audit_admin_roles 자동 audit.
CREATE OR REPLACE FUNCTION public.fn_set_role_permissions(p_role_id uuid, p_permissions jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_role RECORD;
BEGIN
    IF NOT public._is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF p_permissions IS NULL OR jsonb_typeof(p_permissions) <> 'object' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_permissions');
    END IF;

    SELECT id, name, is_system_role INTO v_role FROM public.admin_roles WHERE id = p_role_id;
    IF v_role.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'role_not_found');
    END IF;
    IF v_role.is_system_role THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'system_role_locked');
    END IF;

    UPDATE public.admin_roles SET permissions = p_permissions, updated_at = now()
    WHERE id = p_role_id;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('role_id', p_role_id), 'error', NULL);
END;
$$;

-- Q.B3 fn_assign_admin_role(p_user_id, p_role_id, p_facility_id) — admin_user_roles insert.
--      게이트 super_admin. assigned_by = auth.uid(). mutation → trg_audit_admin_user_roles 자동 audit.
CREATE OR REPLACE FUNCTION public.fn_assign_admin_role(
    p_user_id uuid, p_role_id uuid, p_facility_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    IF NOT public._is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF p_user_id IS NULL OR p_role_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'missing_required_fields');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'user_not_found');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.admin_roles WHERE id = p_role_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'role_not_found');
    END IF;

    INSERT INTO public.admin_user_roles (user_id, role_id, facility_id, assigned_by)
    VALUES (p_user_id, p_role_id, p_facility_id, auth.uid())
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('assignment_id', v_id), 'error', NULL);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'already_assigned');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- Q.B4 fn_revoke_admin_role(p_assignment_id) — admin_user_roles delete. 게이트 super_admin.
--      mutation(DELETE) → trg_audit_admin_user_roles 자동 audit.
CREATE OR REPLACE FUNCTION public.fn_revoke_admin_role(p_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_deleted uuid;
BEGIN
    IF NOT public._is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    DELETE FROM public.admin_user_roles WHERE id = p_assignment_id
    RETURNING id INTO v_deleted;

    IF v_deleted IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'assignment_not_found');
    END IF;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('assignment_id', v_deleted), 'error', NULL);
END;
$$;

-- Q.B5 fn_update_coach_profile(p_coach_id, p_patch) — 코치 프로필+급여 편집. 게이트 is_admin().
--      급여(base_salary/session_allowance)=정산 basis 영향(계약 §3.7). 화이트리스트 컬럼만 갱신.
--      mutation → trg_audit_coaches 자동 audit.
CREATE OR REPLACE FUNCTION public.fn_update_coach_profile(p_coach_id uuid, p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id uuid;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::jsonb THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'empty_patch');
    END IF;

    SELECT id INTO v_coach_id FROM public.coaches WHERE id = p_coach_id;
    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_found');
    END IF;

    IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(p_patch) AS k
        WHERE k NOT IN ('name','email','phone','specialties','bio',
                        'profile_image_url','base_salary','session_allowance','status')
    ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'unknown_field');
    END IF;

    IF p_patch ? 'name' AND COALESCE(NULLIF(trim(p_patch->>'name'), ''), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_name');
    END IF;
    IF p_patch ? 'base_salary' AND (p_patch->>'base_salary')::int < 0 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_salary');
    END IF;
    IF p_patch ? 'session_allowance' AND (p_patch->>'session_allowance')::int < 0 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_salary');
    END IF;

    UPDATE public.coaches SET
        name              = CASE WHEN p_patch ? 'name' THEN trim(p_patch->>'name') ELSE name END,
        email             = CASE WHEN p_patch ? 'email' THEN NULLIF(p_patch->>'email', '') ELSE email END,
        phone             = CASE WHEN p_patch ? 'phone' THEN NULLIF(p_patch->>'phone', '') ELSE phone END,
        specialties       = CASE WHEN p_patch ? 'specialties'
                                 THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'specialties'))
                                 ELSE specialties END,
        bio               = CASE WHEN p_patch ? 'bio' THEN NULLIF(p_patch->>'bio', '') ELSE bio END,
        profile_image_url = CASE WHEN p_patch ? 'profile_image_url'
                                 THEN NULLIF(p_patch->>'profile_image_url', '') ELSE profile_image_url END,
        base_salary       = CASE WHEN p_patch ? 'base_salary' THEN (p_patch->>'base_salary')::int ELSE base_salary END,
        session_allowance = CASE WHEN p_patch ? 'session_allowance' THEN (p_patch->>'session_allowance')::int ELSE session_allowance END,
        status            = CASE WHEN p_patch ? 'status' THEN p_patch->>'status' ELSE status END,
        updated_at        = now()
    WHERE id = p_coach_id;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('coach_id', p_coach_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

-- Q.B6 fn_reply_support_ticket(p_ticket_id, p_reply, p_status) — 문의 답변+상태 전환. 게이트 is_admin().
--      reply/replied_at=now()/replied_by=auth.uid() 기록. mutation → trg_audit_support_tickets 자동 audit.
CREATE OR REPLACE FUNCTION public.fn_reply_support_ticket(
    p_ticket_id uuid, p_reply text, p_status text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_ticket RECORD;
    v_status text;
    v_resolved_at timestamptz;
    v_has_reply boolean;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    SELECT id, status, resolved_at INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id;
    IF v_ticket.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'ticket_not_found');
    END IF;

    v_status := COALESCE(NULLIF(p_status, ''), v_ticket.status);
    IF v_status NOT IN ('open', 'in_progress', 'resolved', 'closed') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_status');
    END IF;

    v_has_reply := NULLIF(trim(p_reply), '') IS NOT NULL;
    v_resolved_at := v_ticket.resolved_at;
    IF v_status IN ('resolved', 'closed') AND v_ticket.resolved_at IS NULL THEN
        v_resolved_at := now();
    ELSIF v_status IN ('open', 'in_progress') THEN
        v_resolved_at := NULL;
    END IF;

    UPDATE public.support_tickets SET
        reply       = CASE WHEN v_has_reply THEN p_reply ELSE reply END,
        replied_at  = CASE WHEN v_has_reply THEN now() ELSE replied_at END,
        replied_by  = CASE WHEN v_has_reply THEN auth.uid() ELSE replied_by END,
        status      = v_status,
        resolved_at = v_resolved_at,
        updated_at  = now()
    WHERE id = p_ticket_id;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('ticket_id', p_ticket_id, 'status', v_status,
                                   'replied', v_has_reply), 'error', NULL);
END;
$$;

-- Q.GRANT — client 호출 RPC 6종 authenticated EXECUTE, 내부 함수(트리거·게이트) 전 client 회수
DO $$
DECLARE
    v_fn text;
BEGIN
    FOR v_fn IN VALUES
        ('public.fn_set_payment_mode(text)'),
        ('public.fn_set_role_permissions(uuid,jsonb)'),
        ('public.fn_assign_admin_role(uuid,uuid,uuid)'),
        ('public.fn_revoke_admin_role(uuid)'),
        ('public.fn_update_coach_profile(uuid,jsonb)'),
        ('public.fn_reply_support_ticket(uuid,text,text)')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_fn);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_fn);
    END LOOP;

    FOR v_fn IN VALUES
        ('public._audit_row_change()'),
        ('public._audit_system_config_change()'),
        ('public._is_super_admin()')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_fn);
    END LOOP;
END $$;


-- ============================================================================
-- [R] Phase 3.5 백엔드 갭 보강 (mig 20260708080000_phase3_backend_rpcs.sql 미러)
--   UI 에이전트 플래그 미구현 RPC ~22종. 결제 관련은 DEFERRED(미포함).
--   ※ session_rotation_states 테이블·RLS는 기존 존재 → 신규 생성 없이 updated_by 컬럼만 보강.
--   시그니처 변경 3종: fn_kiosk_checkin(+device_id,+scanned_at),
--     fn_record_session_wod_result(+p_member_id 대리), fn_get_class_wod_board(신규 anon daily_wod).
--   anon 화이트리스트 신규 6종: fn_kiosk_lookup_member/heartbeat/get_kiosk_notices/
--     get_race_lanes/get_class_race_result/get_class_wod_board (+ 변경된 fn_kiosk_checkin).
-- ============================================================================


-- ============================================================================
-- [R1] Kiosk (docs/06-kiosk §4)
-- ============================================================================

-- R1.0 스키마 보강: kiosk 오프라인 replay/heartbeat 부속 — 없으면 무해 스킵
-- (kiosk_devices.last_heartbeat/status 는 기존 존재)

-- R1.1 fn_kiosk_checkin(p_payload, p_device_id, p_scanned_at) — 🔄 시그니처 변경
--   BUG FIX(§4.2⑤): 횟수제 크레딧 1→0 원자 차감(기존 RPC는 검사만 하고 미차감).
--   중복(같은 날) = 성공 payload(duplicated:true, 2차 미기록).
--   오프라인 replay: p_scanned_at 을 만료/중복 판정 기준시각으로 사용(기본 now()).
--   facility 강제: p_device_id 제공 시 단말 facility ≠ payload.fid 이면 실패
--     (멤버십 plan.facility_sharing=true 인 경우만 예외).
DROP FUNCTION IF EXISTS public.fn_kiosk_checkin(jsonb);
CREATE OR REPLACE FUNCTION public.fn_kiosk_checkin(
    p_payload JSONB,
    p_device_id UUID DEFAULT NULL,
    p_scanned_at TIMESTAMPTZ DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_facility_id UUID;
    v_ts BIGINT;
    v_member RECORD;
    v_mem RECORD;
    v_booking RECORD;
    v_checkin_id UUID;
    v_scan TIMESTAMPTZ := COALESCE(p_scanned_at, now());
    v_dev_facility UUID;
    v_sharing BOOLEAN := false;
    v_already_charged BOOLEAN := false;
    v_dup RECORD;
    v_remaining INT;
    v_dday INT;
BEGIN
    -- 1) 페이로드 구조 검증
    BEGIN
        v_member_id   := (p_payload->>'mid')::UUID;
        v_facility_id := (p_payload->>'fid')::UUID;
        v_ts          := (p_payload->>'ts')::BIGINT;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_payload');
    END;
    IF v_member_id IS NULL OR v_facility_id IS NULL OR v_ts IS NULL
       OR COALESCE((p_payload->>'v')::INT, 0) <> 1 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_payload');
    END IF;

    -- 2) QR 만료 검증 (발급 후 5분 — 스캔 시각 기준, 오프라인 replay 정합)
    IF ABS(EXTRACT(EPOCH FROM v_scan) - v_ts) > 300 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'qr_expired');
    END IF;

    -- 3) 회원 상태 검증
    SELECT id, name, status, is_blacklisted INTO v_member
    FROM public.members WHERE id = v_member_id;
    IF v_member.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF v_member.status <> 'active' OR v_member.is_blacklisted THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_active');
    END IF;

    -- 3b) facility 강제 (단말 배정 facility ≠ payload fid → 공유 멤버십만 예외)
    IF p_device_id IS NOT NULL THEN
        SELECT facility_id INTO v_dev_facility FROM public.kiosk_devices WHERE id = p_device_id;
        IF v_dev_facility IS NOT NULL AND v_dev_facility <> v_facility_id THEN
            SELECT COALESCE(bool_or(mp.facility_sharing), false) INTO v_sharing
            FROM public.memberships ms
            JOIN public.membership_plans mp ON mp.id = ms.plan_id
            WHERE ms.member_id = v_member_id AND ms.status = 'active';
            IF NOT v_sharing THEN
                RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'facility_mismatch');
            END IF;
            -- 공유 허용 시 체크인 facility 는 실제 단말 facility 로 기록
            v_facility_id := v_dev_facility;
        END IF;
    END IF;

    -- 4) ±30분 시작 세션의 confirmed 예약 자동 감지 (크레딧 선차감 여부 포함)
    SELECT b.id AS booking_id, b.attendance_outcome, b.credit_used,
           s.id AS session_id, s.title
    INTO v_booking
    FROM public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
    WHERE b.member_id = v_member_id
      AND b.status = 'confirmed'
      AND s.facility_id = v_facility_id
      AND s.session_date = v_scan::date
      AND (s.session_date + s.start_time) BETWEEN v_scan - INTERVAL '30 minutes'
                                              AND v_scan + INTERVAL '30 minutes'
    ORDER BY (s.session_date + s.start_time)
    LIMIT 1;
    v_already_charged := COALESCE(v_booking.credit_used, false);

    -- 5) 같은 날 중복 체크인 = 성공 payload(친화 화면), 2차 미기록
    SELECT id, checkin_time INTO v_dup
    FROM public.checkins
    WHERE member_id = v_member_id
      AND facility_id = v_facility_id
      AND checkin_time::date = v_scan::date
    ORDER BY checkin_time
    LIMIT 1;
    IF v_dup.id IS NOT NULL THEN
        SELECT ms.remaining_credits,
               CASE WHEN ms.end_date IS NOT NULL THEN (ms.end_date - v_scan::date) END
        INTO v_remaining, v_dday
        FROM public.memberships ms
        WHERE ms.member_id = v_member_id AND ms.status = 'active'
        ORDER BY ms.end_date ASC NULLS LAST LIMIT 1;
        RETURN jsonb_build_object('success', true,
            'data', jsonb_build_object(
                'duplicated', true,
                'member_name', v_member.name,
                'checkin_time', v_dup.checkin_time,
                'remaining_credits', v_remaining,
                'membership_dday', v_dday),
            'error', NULL);
    END IF;

    -- 6) 멤버십 유효성 + 크레딧 원자 차감
    --    예약 링크가 이미 크레딧을 소진했다면(예약 시 차감) 재차감하지 않음(이중과금 방지).
    --    자유 출입(예약 없음)이면 유효 멤버십 필수 + 횟수제는 1 차감.
    SELECT ms.id, ms.remaining_credits, ms.end_date, mp.plan_kind, mp.name AS plan_name
    INTO v_mem
    FROM public.memberships ms
    LEFT JOIN public.membership_plans mp ON mp.id = ms.plan_id
    WHERE ms.member_id = v_member_id
      AND ms.status = 'active'
      AND ms.start_date <= v_scan::date
      AND (ms.end_date IS NULL OR ms.end_date >= v_scan::date)
      AND (ms.remaining_credits IS NULL OR ms.remaining_credits > 0)
    ORDER BY ms.end_date ASC NULLS LAST
    LIMIT 1
    FOR UPDATE OF ms;

    IF v_booking.booking_id IS NULL THEN
        -- 자유 출입: 유효 멤버십 필수
        IF v_mem.id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'no_active_membership');
        END IF;
        IF v_mem.remaining_credits IS NOT NULL THEN
            -- 횟수제 원자 차감 (음수 방지 — WHERE 절이 >0 보장, 방어적으로 GREATEST)
            UPDATE public.memberships
            SET remaining_credits = GREATEST(remaining_credits - 1, 0), updated_at = now()
            WHERE id = v_mem.id;
            v_remaining := v_mem.remaining_credits - 1;
        ELSE
            v_remaining := NULL; -- 기간제
        END IF;
    ELSE
        -- 예약 링크 존재: 예약 시점에 이미 검증/차감됨. 재차감 안 함.
        v_remaining := v_mem.remaining_credits;  -- 표시용(차감 없음), 없으면 NULL
    END IF;

    v_dday := CASE WHEN v_mem.end_date IS NOT NULL THEN (v_mem.end_date - v_scan::date) END;

    -- 7) 체크인 기록 (세션 미감지 시 자유 출입)
    INSERT INTO public.checkins (booking_id, member_id, session_id, facility_id, checkin_method, checkin_time)
    VALUES (v_booking.booking_id, v_member_id, v_booking.session_id, v_facility_id, 'kiosk', v_scan)
    ON CONFLICT (session_id, member_id) WHERE session_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_checkin_id;

    -- 8) 출결 연동: pending → checked_in
    IF v_booking.booking_id IS NOT NULL AND v_booking.attendance_outcome = 'pending' THEN
        UPDATE public.bookings
        SET attendance_outcome = 'checked_in', attendance_marked_at = v_scan, updated_at = v_scan
        WHERE id = v_booking.booking_id;
    END IF;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'checkin_id', v_checkin_id,
            'duplicated', false,
            'member_name', v_member.name,
            'membership_plan_kind', COALESCE(v_mem.plan_kind, 'standard'),
            'membership_plan_name', v_mem.plan_name,
            'remaining_credits', v_remaining,
            'membership_dday', v_dday,
            'session_id', v_booking.session_id,
            'session_title', v_booking.title,
            'linked_booking', v_booking.booking_id IS NOT NULL,
            'checkin_time', v_scan),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_kiosk_checkin(jsonb,uuid,timestamptz) IS
'키오스크 QR 체크인. 횟수제 원자 차감(자유출입만), 예약 링크 시 이중과금 방지, 같은 날 중복=성공(duplicated), 오프라인 replay(p_scanned_at), facility 강제(p_device_id). anon 실행.';

-- R1.2 fn_kiosk_lookup_member — ANON 수기 대체 조회 (전화 뒷4자리 → 마스킹 후보)
CREATE OR REPLACE FUNCTION public.fn_kiosk_lookup_member(
    p_facility_id UUID, p_phone_last4 TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    IF p_facility_id IS NULL OR p_phone_last4 IS NULL OR length(p_phone_last4) < 4 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_input');
    END IF;

    SELECT COALESCE(jsonb_agg(t ORDER BY t->>'masked_name'), '[]'::jsonb) INTO v_data
    FROM (
        SELECT jsonb_build_object(
            'member_id', m.id,
            -- 마스킹: 첫 글자 + '*' (개인정보 최소 노출)
            'masked_name', left(m.name, 1) || repeat('*', GREATEST(char_length(m.name) - 1, 1)),
            'phone_tail', right(regexp_replace(m.phone, '\D', '', 'g'), 4)
        ) AS t
        FROM public.members m
        WHERE m.facility_id = p_facility_id
          AND m.status = 'active'
          AND right(regexp_replace(COALESCE(m.phone,''), '\D', '', 'g'), 4) = right(p_phone_last4, 4)
        LIMIT 10
    ) sub;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_kiosk_lookup_member(uuid,text) IS
'ANON 키오스크 수기 대체: 전화 뒷4자리로 마스킹된 회원 후보 목록(member_id+마스킹이름). 개인정보 최소 노출.';

-- R1.3 fn_kiosk_heartbeat — ANON 단말 상태 갱신 (테이블 anon 노출 없이 DEFINER)
CREATE OR REPLACE FUNCTION public.fn_kiosk_heartbeat(
    p_device_id UUID, p_status TEXT DEFAULT 'online')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_found UUID;
BEGIN
    IF p_device_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'device_required');
    END IF;
    IF p_status NOT IN ('online','offline','maintenance','error') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_status');
    END IF;

    UPDATE public.kiosk_devices
    SET status = p_status, last_heartbeat = now(), updated_at = now()
    WHERE id = p_device_id
    RETURNING id INTO v_found;

    IF v_found IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'device_not_found');
    END IF;
    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('device_id', v_found, 'status', p_status, 'at', now()),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_kiosk_heartbeat(uuid,text) IS
'ANON 키오스크 하트비트: kiosk_devices.last_heartbeat/status 갱신(테이블 anon GRANT 없이 DEFINER).';

-- R1.4 fn_get_kiosk_notices — ANON 유휴 화면 공지/배너 (게시된 것만, 안전 컬럼만)
CREATE OR REPLACE FUNCTION public.fn_get_kiosk_notices(p_facility_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    IF p_facility_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'facility_required');
    END IF;

    SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'is_pinned')::boolean DESC, (t->>'published_at') DESC), '[]'::jsonb)
    INTO v_data
    FROM (
        SELECT jsonb_build_object(
            'id', n.id, 'title', n.title, 'body', n.content,
            'category', n.category, 'priority', n.priority,
            'is_pinned', n.is_pinned, 'published_at', n.published_at
        ) AS t
        FROM public.notices n
        WHERE (n.facility_id = p_facility_id OR n.facility_id IS NULL)
          AND n.is_published = true
          AND (n.expires_at IS NULL OR n.expires_at > now())
        LIMIT 20
    ) sub;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_kiosk_notices(uuid) IS
'ANON 키오스크 유휴 공지: 게시·미만료 notices(title/body/category만). notices 테이블 이미지 컬럼 없음.';


-- ============================================================================
-- [R2] Member (docs/03-user-app §3)
-- ============================================================================

-- R2.1 fn_record_my_benchmark_result — 본인 벤치마크 자가 기록 (member 스코프)
--   admin/coach 게이트인 fn_record_member_benchmark_result 와 달리 current_member_id() 본인만.
CREATE OR REPLACE FUNCTION public.fn_record_my_benchmark_result(
    p_benchmark_id UUID,
    p_result_value NUMERIC,
    p_rx_status TEXT DEFAULT 'rx',
    p_session_id UUID DEFAULT NULL,
    p_result_meta JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_metric_type TEXT;
    v_best NUMERIC;
    v_is_pr BOOLEAN := false;
    v_row public.member_benchmark_results;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;

    SELECT metric_type INTO v_metric_type
    FROM public.benchmark_definitions WHERE id = p_benchmark_id AND is_active;
    IF v_metric_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'benchmark_not_found');
    END IF;
    IF p_result_value IS NULL OR p_result_value <= 0 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_result_value');
    END IF;
    IF p_rx_status NOT IN ('rx_plus','rx','scaled') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_rx_status');
    END IF;

    -- 세션 연결 시 본인이 참가자인지 검증
    IF p_session_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.session_id = p_session_id AND b.member_id = v_member_id
          AND (b.status = 'confirmed' OR b.attendance_outcome = 'walk_in')
    ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_session_participant');
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_member_id::text || ':' || p_benchmark_id::text));

    IF v_metric_type = 'time' THEN
        SELECT MIN(result_value) INTO v_best FROM public.member_benchmark_results
        WHERE member_id = v_member_id AND benchmark_id = p_benchmark_id AND rx_status = p_rx_status;
        v_is_pr := (v_best IS NULL OR p_result_value < v_best);
    ELSE
        SELECT MAX(result_value) INTO v_best FROM public.member_benchmark_results
        WHERE member_id = v_member_id AND benchmark_id = p_benchmark_id AND rx_status = p_rx_status;
        v_is_pr := (v_best IS NULL OR p_result_value > v_best);
    END IF;

    INSERT INTO public.member_benchmark_results
        (member_id, benchmark_id, session_id, result_value, result_meta, rx_status, is_pr, recorded_by)
    VALUES (v_member_id, p_benchmark_id, p_session_id, p_result_value,
            COALESCE(p_result_meta,'{}'::jsonb), p_rx_status, v_is_pr, auth.uid())
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'id', v_row.id, 'benchmark_id', v_row.benchmark_id,
            'result_value', v_row.result_value, 'rx_status', v_row.rx_status,
            'is_pr', v_row.is_pr, 'previous_best', v_best, 'recorded_at', v_row.recorded_at),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_record_my_benchmark_result(uuid,numeric,text,uuid,jsonb) IS
'회원 본인 벤치마크 자가 기록. current_member_id() 스코프 + 동일 rx 계층 PR 판정.';

-- R2.2 fn_get_member_schedule(p_from, p_to) — 기간 세션 + 정원/예약 카운트 + 본인 예약상태
CREATE OR REPLACE FUNCTION public.fn_get_member_schedule(p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_facility_id UUID;
    v_data JSONB;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF p_from IS NULL OR p_to IS NULL OR p_from > p_to OR p_to - p_from > 92 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_date_range');
    END IF;
    SELECT facility_id INTO v_facility_id FROM public.members WHERE id = v_member_id;

    SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'session_date'), (t->>'start_time')), '[]'::jsonb)
    INTO v_data
    FROM (
        SELECT jsonb_build_object(
            'id', s.id, 'title', s.title, 'session_date', s.session_date,
            'start_time', s.start_time, 'end_time', s.end_time,
            'class_type', s.class_type, 'capacity', s.capacity, 'status', s.status,
            'coach_names', (SELECT COALESCE(jsonb_agg(c.name ORDER BY sc.display_order), '[]'::jsonb)
                            FROM public.session_coaches sc
                            JOIN public.coaches c ON c.id = sc.coach_id
                            WHERE sc.session_id = s.id),
            'booked_count', (SELECT COUNT(*) FROM public.bookings b
                             WHERE b.session_id = s.id AND b.status = 'confirmed'),
            'waitlist_count', (SELECT COUNT(*) FROM public.bookings b
                               WHERE b.session_id = s.id AND b.status = 'waitlisted'),
            'remaining', GREATEST(s.capacity - (SELECT COUNT(*) FROM public.bookings b
                             WHERE b.session_id = s.id AND b.status = 'confirmed'), 0),
            'my_booking_status', (SELECT b.status FROM public.bookings b
                                  WHERE b.session_id = s.id AND b.member_id = v_member_id
                                    AND b.status <> 'cancelled' LIMIT 1),
            'has_wod', EXISTS (SELECT 1 FROM public.session_wods sw
                               WHERE sw.session_id = s.id AND sw.publish_state = 'published')
        ) AS t
        FROM public.sessions s
        WHERE (s.facility_id = v_facility_id OR v_facility_id IS NULL)
          AND s.session_date BETWEEN p_from AND p_to
          AND s.status <> 'cancelled'
    ) sub;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_member_schedule(date,date) IS
'회원 스케줄: 기간 세션 + 정원/예약/대기 카운트 + 본인 예약상태. Display-Safe(타인 명단 미노출).';

-- R2.3 fn_get_benchmark_leaderboard(p_benchmark, p_scope) — 종목별 시설 리더보드(이름+기록)
CREATE OR REPLACE FUNCTION public.fn_get_benchmark_leaderboard(
    p_benchmark TEXT, p_scope TEXT DEFAULT 'all')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_facility_id UUID;
    v_bd RECORD;
    v_since DATE;
    v_data JSONB;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL AND NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF v_member_id IS NOT NULL THEN
        SELECT facility_id INTO v_facility_id FROM public.members WHERE id = v_member_id;
    END IF;

    SELECT id, metric_type, unit INTO v_bd
    FROM public.benchmark_definitions
    WHERE name = p_benchmark AND is_active
      AND (facility_id = v_facility_id OR v_facility_id IS NULL OR facility_id IS NULL)
    ORDER BY (facility_id = v_facility_id) DESC NULLS LAST
    LIMIT 1;
    IF v_bd.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'benchmark_not_found');
    END IF;

    v_since := CASE p_scope
        WHEN 'week'  THEN CURRENT_DATE - 7
        WHEN 'month' THEN CURRENT_DATE - 30
        WHEN 'year'  THEN CURRENT_DATE - 365
        ELSE DATE '2000-01-01'
    END;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.rank), '[]'::jsonb) INTO v_data
    FROM (
        SELECT ROW_NUMBER() OVER (
                   ORDER BY CASE WHEN v_bd.metric_type = 'time' THEN best END ASC NULLS LAST,
                            CASE WHEN v_bd.metric_type <> 'time' THEN best END DESC NULLS LAST
               ) AS rank,
               m.name AS member_name,
               best AS best_value,
               v_bd.unit AS unit,
               rx_status
        FROM (
            SELECT r.member_id, r.rx_status,
                   CASE WHEN v_bd.metric_type = 'time' THEN MIN(r.result_value)
                        ELSE MAX(r.result_value) END AS best
            FROM public.member_benchmark_results r
            WHERE r.benchmark_id = v_bd.id
              AND r.recorded_at >= v_since
              AND r.rx_status IN ('rx_plus','rx')
            GROUP BY r.member_id, r.rx_status
        ) agg
        JOIN public.members m ON m.id = agg.member_id
        WHERE (m.facility_id = v_facility_id OR v_facility_id IS NULL)
        LIMIT 20
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('benchmark', p_benchmark, 'metric_type', v_bd.metric_type,
                                   'unit', v_bd.unit, 'scope', p_scope, 'entries', v_data),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_benchmark_leaderboard(text,text) IS
'종목별 시설 리더보드(이름+기록, rx/rx_plus만). Display-Safe. 생체지표 제외.';

-- R2.4 fn_create_support_ticket(p_subject, p_content, p_category) — 회원 문의 생성
CREATE OR REPLACE FUNCTION public.fn_create_support_ticket(
    p_subject TEXT, p_content TEXT, p_category TEXT DEFAULT 'inquiry')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_row public.support_tickets;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF COALESCE(NULLIF(trim(p_subject), ''), '') = ''
       OR COALESCE(NULLIF(trim(p_content), ''), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'missing_required_fields');
    END IF;
    -- 카테고리는 support_tickets_category_check 제약과 정합
    IF COALESCE(NULLIF(p_category,''),'inquiry') NOT IN ('inquiry','complaint','suggestion','refund') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_category');
    END IF;

    INSERT INTO public.support_tickets (member_id, subject, content, category, status, priority)
    VALUES (v_member_id, trim(p_subject), p_content, COALESCE(NULLIF(p_category,''),'inquiry'), 'open', 'normal')
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('ticket_id', v_row.id, 'status', v_row.status,
                                   'created_at', v_row.created_at),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_create_support_ticket(text,text,text) IS
'회원 본인 문의 티켓 생성(member 스코프). 답변은 fn_reply_support_ticket(admin).';


-- ============================================================================
-- [R3] Coach (docs/04-coach-app §3)
-- ============================================================================

-- R3.1 fn_record_session_wod_result — 🔄 시그니처 변경: p_member_id 추가(코치 대리 입력)
--   null = 본인(current_member_id, 기존과 동일) / 지정 = 해당 세션 코치만 대리(또는 admin). §3.2 b-2 / S-24
DROP FUNCTION IF EXISTS public.fn_record_session_wod_result(uuid,numeric,text,text,text);
CREATE OR REPLACE FUNCTION public.fn_record_session_wod_result(
    p_session_id UUID,
    p_score NUMERIC,
    p_score_type TEXT,
    p_rx_status TEXT DEFAULT 'rx',
    p_note TEXT DEFAULT NULL,
    p_member_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_is_proxy BOOLEAN := false;
    v_session_wod_id UUID;
    v_row public.session_wod_results;
BEGIN
    IF p_member_id IS NULL THEN
        v_member_id := public.current_member_id();
        IF v_member_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
        END IF;
    ELSE
        -- 코치 대리 입력: 해당 세션의 배정 코치이거나 admin 만
        v_is_proxy := true;
        IF NOT public.is_admin() AND NOT EXISTS (
            SELECT 1 FROM public.session_coaches sc
            JOIN public.coaches c ON c.id = sc.coach_id
            WHERE sc.session_id = p_session_id AND c.user_id = auth.uid()
        ) THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
        END IF;
        v_member_id := p_member_id;
    END IF;

    IF p_score IS NULL OR p_score <= 0 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_score');
    END IF;
    IF p_score_type NOT IN ('time','reps','rounds_reps','weight','distance','calories') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_score_type');
    END IF;
    IF p_rx_status NOT IN ('rx_plus','rx','scaled') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_rx_status');
    END IF;

    SELECT id INTO v_session_wod_id
    FROM public.session_wods
    WHERE session_id = p_session_id AND publish_state = 'published';
    IF v_session_wod_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_wod_not_published');
    END IF;

    -- 대상 회원이 해당 세션 참가자인지 검증 (본인/대리 공통)
    IF NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.session_id = p_session_id AND b.member_id = v_member_id
          AND (b.status = 'confirmed' OR b.attendance_outcome = 'walk_in')
    ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_session_participant');
    END IF;

    INSERT INTO public.session_wod_results
        (session_wod_id, member_id, score, score_type, rx_status, note, recorded_by)
    VALUES (v_session_wod_id, v_member_id, p_score, p_score_type, p_rx_status,
            NULLIF(p_note,''), auth.uid())
    ON CONFLICT (session_wod_id, member_id) DO UPDATE SET
        score = EXCLUDED.score, score_type = EXCLUDED.score_type,
        rx_status = EXCLUDED.rx_status, note = EXCLUDED.note,
        recorded_by = EXCLUDED.recorded_by, updated_at = now()
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true,
        'data', to_jsonb(v_row) || jsonb_build_object('is_proxy', v_is_proxy), 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_record_session_wod_result(uuid,numeric,text,text,text,uuid) IS
'G-1/S-24: WOD 점수 기록. p_member_id NULL=본인, 지정=배정코치/admin 대리 입력. published WOD + 참가자만.';

-- R3.2 fn_get_coach_members(p_search) — 코치 담당 회원 로스터 (Display-Safe, 정산 제외)
CREATE OR REPLACE FUNCTION public.fn_get_coach_members(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_facility_id UUID;
    v_is_admin BOOLEAN := public.is_admin();
    v_data JSONB;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    SELECT id, facility_id INTO v_coach_id, v_facility_id
    FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    IF v_coach_id IS NULL AND NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_linked');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.member_name), '[]'::jsonb) INTO v_data
    FROM (
        SELECT DISTINCT ON (m.id)
            m.id AS member_id, m.name AS member_name, m.phone, m.avatar_url, m.status,
            (SELECT ms.end_date FROM public.memberships ms
             WHERE ms.member_id = m.id AND ms.status = 'active'
             ORDER BY ms.end_date ASC NULLS LAST LIMIT 1) AS membership_end_date,
            (SELECT ms.remaining_credits FROM public.memberships ms
             WHERE ms.member_id = m.id AND ms.status = 'active'
             ORDER BY ms.end_date ASC NULLS LAST LIMIT 1) AS remaining_credits,
            (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'flag_type', f.flag_type, 'severity', f.severity, 'note', f.note)), '[]'::jsonb)
             FROM public.member_alert_flags f
             WHERE f.member_id = m.id AND f.resolved_at IS NULL
               AND (f.ends_at IS NULL OR f.ends_at > now())) AS active_flags,
            (SELECT MAX(c.checkin_time) FROM public.checkins c WHERE c.member_id = m.id) AS last_checkin
        FROM public.members m
        WHERE (v_is_admin OR EXISTS (
                SELECT 1 FROM public.bookings b
                JOIN public.session_coaches sc ON sc.session_id = b.session_id
                WHERE b.member_id = m.id AND sc.coach_id = v_coach_id
                  AND b.status IN ('confirmed','waitlisted')))
          AND (v_facility_id IS NULL OR m.facility_id = v_facility_id OR v_is_admin)
          AND (p_search IS NULL OR p_search = ''
               OR m.name ILIKE '%'||p_search||'%'
               OR regexp_replace(COALESCE(m.phone,''),'\D','','g') LIKE '%'||regexp_replace(p_search,'\D','','g')||'%')
    ) t;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_coach_members(text) IS
'코치 담당 회원 로스터(자기 세션 참가자/시설 스코프). 플래그·노트 열람 허용(§3.3), 정산 비노출.';

-- R3.3 fn_upsert_member_note(p_member_id, p_note_id, p_body, p_note_type) — 코치 회원 노트
CREATE OR REPLACE FUNCTION public.fn_upsert_member_note(
    p_member_id UUID, p_note_id UUID DEFAULT NULL,
    p_body TEXT DEFAULT NULL, p_note_type TEXT DEFAULT 'general')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_row public.member_notes;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF COALESCE(NULLIF(trim(p_body), ''), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'empty_body');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.members WHERE id = p_member_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    v_role := CASE WHEN public.is_admin() THEN 'admin' ELSE 'coach' END;

    IF p_note_id IS NOT NULL THEN
        UPDATE public.member_notes
        SET content = p_body,
            note_type = COALESCE(p_note_type, note_type),
            updated_at = now()
        WHERE id = p_note_id AND member_id = p_member_id
        RETURNING * INTO v_row;
        IF v_row.id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'note_not_found');
        END IF;
    ELSE
        INSERT INTO public.member_notes (member_id, author_id, author_role, note_type, content)
        VALUES (p_member_id, auth.uid(), v_role, COALESCE(p_note_type,'general'), p_body)
        RETURNING * INTO v_row;
    END IF;

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row), 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_upsert_member_note(uuid,uuid,text,text) IS
'코치/admin 회원 노트 작성·수정(member_notes). p_note_id NULL=신규.';

-- R3.4 fn_update_my_coach_profile(p_patch) — 코치 본인 비-급여 프로필 편집
--   급여(base_salary/session_allowance)·status 는 화이트리스트에서 명시 제외(§1.2 admin 전용).
CREATE OR REPLACE FUNCTION public.fn_update_my_coach_profile(p_patch JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
BEGIN
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_linked');
    END IF;
    IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::jsonb THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'empty_patch');
    END IF;
    -- 화이트리스트: 급여/상태 필드는 허용 목록에 없으므로 unknown_field 로 거부
    IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(p_patch) AS k
        WHERE k NOT IN ('name','phone','bio','specialties','profile_image_url')
    ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'unknown_field');
    END IF;
    IF p_patch ? 'name' AND COALESCE(NULLIF(trim(p_patch->>'name'), ''), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_name');
    END IF;

    UPDATE public.coaches SET
        name              = CASE WHEN p_patch ? 'name' THEN trim(p_patch->>'name') ELSE name END,
        phone             = CASE WHEN p_patch ? 'phone' THEN NULLIF(p_patch->>'phone','') ELSE phone END,
        bio               = CASE WHEN p_patch ? 'bio' THEN NULLIF(p_patch->>'bio','') ELSE bio END,
        specialties       = CASE WHEN p_patch ? 'specialties'
                                 THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'specialties'))
                                 ELSE specialties END,
        profile_image_url = CASE WHEN p_patch ? 'profile_image_url'
                                 THEN NULLIF(p_patch->>'profile_image_url','') ELSE profile_image_url END,
        updated_at        = now()
    WHERE id = v_coach_id;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('coach_id', v_coach_id), 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_update_my_coach_profile(jsonb) IS
'코치 본인 프로필 편집(name/phone/bio/specialties/profile_image_url). 급여·status 는 화이트리스트 제외(admin 전용).';

-- R3.5 fn_get_coach_member_alerts() — Home 경고 위젯: 담당 회원 중 주의 필요 집계
CREATE OR REPLACE FUNCTION public.fn_get_coach_member_alerts()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_flags JSONB;
    v_expiring JSONB;
    v_absent JSONB;
BEGIN
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    IF v_coach_id IS NULL AND NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_linked');
    END IF;

    -- 담당 회원 = 이 코치 세션에 예약 이력이 있는 회원
    WITH my_members AS (
        SELECT DISTINCT b.member_id
        FROM public.bookings b
        JOIN public.session_coaches sc ON sc.session_id = b.session_id
        WHERE sc.coach_id = v_coach_id AND b.status IN ('confirmed','waitlisted')
    )
    SELECT
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'member_id', m.id, 'member_name', m.name,
            'flag_type', f.flag_type, 'severity', f.severity)), '[]'::jsonb)
         FROM public.member_alert_flags f
         JOIN public.members m ON m.id = f.member_id
         WHERE f.member_id IN (SELECT member_id FROM my_members)
           AND f.resolved_at IS NULL AND (f.ends_at IS NULL OR f.ends_at > now())),
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'member_id', m.id, 'member_name', m.name, 'end_date', ms.end_date,
            'remaining_credits', ms.remaining_credits)), '[]'::jsonb)
         FROM public.memberships ms
         JOIN public.members m ON m.id = ms.member_id
         WHERE ms.member_id IN (SELECT member_id FROM my_members)
           AND ms.status = 'active'
           AND ((ms.end_date IS NOT NULL AND ms.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7)
                OR (ms.remaining_credits IS NOT NULL AND ms.remaining_credits <= 2))),
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'member_id', m.id, 'member_name', m.name, 'last_checkin', lc.last_checkin)), '[]'::jsonb)
         FROM my_members mm
         JOIN public.members m ON m.id = mm.member_id
         LEFT JOIN LATERAL (SELECT MAX(c.checkin_time) AS last_checkin
                            FROM public.checkins c WHERE c.member_id = m.id) lc ON true
         WHERE lc.last_checkin IS NULL OR lc.last_checkin < now() - INTERVAL '14 days')
    INTO v_flags, v_expiring, v_absent;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'flags', COALESCE(v_flags, '[]'::jsonb),
            'expiring', COALESCE(v_expiring, '[]'::jsonb),
            'absent', COALESCE(v_absent, '[]'::jsonb),
            'total', jsonb_array_length(COALESCE(v_flags,'[]'::jsonb))
                   + jsonb_array_length(COALESCE(v_expiring,'[]'::jsonb))
                   + jsonb_array_length(COALESCE(v_absent,'[]'::jsonb))),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_coach_member_alerts() IS
'코치 Home 경고 위젯: 담당 회원 flags/만료임박/장기미출석 집계.';

-- R3.6 Circuit Console 지속화 — session_rotation_states (기존 테이블 재사용) RPC 2종
--   ※ 테이블·RLS(admin/배정코치 manage, public read)는 이미 존재 → 신규 생성 안 함.
--     provenance 위해 updated_by 컬럼만 보강.
ALTER TABLE public.session_rotation_states ADD COLUMN IF NOT EXISTS updated_by UUID;

CREATE OR REPLACE FUNCTION public.fn_upsert_session_rotation_state(
    p_session_id UUID, p_state JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_facility_id UUID;
    v_row public.session_rotation_states;
BEGIN
    v_user_id := public._assert_coach_can_edit_session(p_session_id);
    SELECT facility_id INTO v_facility_id FROM public.sessions WHERE id = p_session_id;
    IF v_facility_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_found');
    END IF;
    IF p_state IS NULL OR jsonb_typeof(p_state) <> 'object' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_state');
    END IF;

    -- UPDATE-first-then-INSERT: partial patch(부분 갱신)가 speculative INSERT NOT NULL 검사에 걸리지 않도록.
    UPDATE public.session_rotation_states SET
        current_round            = COALESCE((p_state->>'current_round')::INT, current_round),
        total_rounds             = COALESCE((p_state->>'total_rounds')::INT, total_rounds),
        seconds_per_round        = COALESCE((p_state->>'seconds_per_round')::INT, seconds_per_round),
        is_running               = COALESCE((p_state->>'is_running')::BOOLEAN, is_running),
        timer_started_at         = CASE WHEN p_state ? 'timer_started_at'
                                        THEN NULLIF(p_state->>'timer_started_at','')::TIMESTAMPTZ ELSE timer_started_at END,
        paused_remaining_seconds = CASE WHEN p_state ? 'paused_remaining_seconds'
                                        THEN (p_state->>'paused_remaining_seconds')::INT ELSE paused_remaining_seconds END,
        team_assignments         = COALESCE(p_state->'team_assignments', team_assignments),
        updated_by = v_user_id, updated_at = now()
    WHERE session_id = p_session_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        INSERT INTO public.session_rotation_states (
            session_id, facility_id, current_round, total_rounds, seconds_per_round, is_running,
            timer_started_at, paused_remaining_seconds, team_assignments, updated_by, updated_at)
        VALUES (p_session_id, v_facility_id,
            COALESCE((p_state->>'current_round')::INT, 1),
            COALESCE((p_state->>'total_rounds')::INT, 1),
            COALESCE((p_state->>'seconds_per_round')::INT, 0),
            COALESCE((p_state->>'is_running')::BOOLEAN, false),
            NULLIF(p_state->>'timer_started_at','')::TIMESTAMPTZ,
            (p_state->>'paused_remaining_seconds')::INT,
            COALESCE(p_state->'team_assignments', '{}'::jsonb), v_user_id, now())
        ON CONFLICT (session_id) DO UPDATE SET
            current_round = COALESCE(EXCLUDED.current_round, public.session_rotation_states.current_round),
            updated_by = v_user_id, updated_at = now()
        RETURNING * INTO v_row;
    END IF;

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;
COMMENT ON FUNCTION public.fn_upsert_session_rotation_state(uuid,jsonb) IS
'Circuit Console 지속화: session_rotation_states upsert(배정코치/admin). Realtime 동기화 소스.';

CREATE OR REPLACE FUNCTION public.fn_get_session_rotation_state(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_row public.session_rotation_states;
BEGIN
    PERFORM public._assert_coach_can_edit_session(p_session_id);
    SELECT * INTO v_row FROM public.session_rotation_states WHERE session_id = p_session_id;
    IF v_row.session_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'data', NULL, 'error', NULL);
    END IF;
    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;
COMMENT ON FUNCTION public.fn_get_session_rotation_state(uuid) IS
'Circuit Console 상태 조회(배정코치/admin).';

-- R3.7 Coach Race RPC 4종
-- fn_list_coach_race_events(p_scope) — live/history
CREATE OR REPLACE FUNCTION public.fn_list_coach_race_events(p_scope TEXT DEFAULT 'live')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_facility_id UUID;
    v_is_admin BOOLEAN := public.is_admin();
    v_data JSONB;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    SELECT id, facility_id INTO v_coach_id, v_facility_id
    FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.event_date DESC, t.created_at DESC), '[]'::jsonb)
    INTO v_data
    FROM (
        SELECT re.id, re.name, re.event_date, re.event_type, re.race_format, re.status,
               re.lobby_status, re.target_distance_m, re.duration_minutes, re.session_id,
               re.created_at,
               (SELECT COUNT(*) FROM public.race_records rr WHERE rr.event_id = re.id) AS record_count
        FROM public.race_events re
        WHERE (v_is_admin OR re.facility_id = v_facility_id OR re.coach_id = v_coach_id)
          AND CASE
                WHEN p_scope = 'history' THEN re.status IN ('completed','cancelled')
                ELSE re.status NOT IN ('completed','cancelled')
              END
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('scope', p_scope, 'events', v_data), 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_list_coach_race_events(text) IS
'코치 Race 이벤트 목록(live/history), 시설/담당 스코프.';

-- fn_create_coach_race_event(p_payload) — 세션 비연동 단독 Race 생성
CREATE OR REPLACE FUNCTION public.fn_create_coach_race_event(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_facility_id UUID;
    v_name TEXT;
    v_format TEXT;
    v_row public.race_events;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    SELECT id, facility_id INTO v_coach_id, v_facility_id
    FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    v_facility_id := COALESCE(NULLIF(p_payload->>'facility_id','')::UUID, v_facility_id);
    IF v_facility_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'facility_required');
    END IF;

    v_name := NULLIF(trim(p_payload->>'name'), '');
    IF v_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'name_required');
    END IF;
    v_format := COALESCE(NULLIF(p_payload->>'race_format',''), 'individual');
    IF v_format NOT IN ('individual','team','group','relay') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_race_format');
    END IF;

    INSERT INTO public.race_events (
        facility_id, session_id, coach_id, name, event_date, event_type, race_format,
        target_distance_m, duration_minutes, group_target_m, status, lobby_status)
    VALUES (
        v_facility_id, NULL, v_coach_id, v_name,
        COALESCE(NULLIF(p_payload->>'event_date','')::DATE, CURRENT_DATE),
        COALESCE(NULLIF(p_payload->>'event_type',''), 'rowing'), v_format,
        NULLIF(p_payload->>'target_distance_m','')::INT,
        NULLIF(p_payload->>'duration_minutes','')::INT,
        NULLIF(p_payload->>'group_target_m','')::INT,
        'scheduled', 'setup')
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', v_row.id, 'name', v_row.name,
                                   'status', v_row.status, 'lobby_status', v_row.lobby_status,
                                   'race_format', v_row.race_format),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_create_coach_race_event(jsonb) IS
'세션 비연동 단독 Race 이벤트 생성(코치/admin).';

-- fn_finish_race_event(p_event_id) — 종료 처리 + finish_rank 계산
CREATE OR REPLACE FUNCTION public.fn_finish_race_event(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_event RECORD;
    v_ranked INT;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;

    SELECT re.* INTO v_event FROM public.race_events re WHERE re.id = p_event_id;
    IF v_event.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_not_found');
    END IF;
    IF NOT public.is_admin() AND v_event.coach_id IS DISTINCT FROM v_coach_id
       AND NOT EXISTS (SELECT 1 FROM public.session_coaches sc
                       WHERE sc.session_id = v_event.session_id AND sc.coach_id = v_coach_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_assigned');
    END IF;
    IF v_event.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'already_completed');
    END IF;

    -- finish_rank 계산: 거리목표 레이스=시간 오름차순, 그 외=거리 내림차순
    WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   ORDER BY CASE WHEN v_event.target_distance_m IS NOT NULL THEN result_time END ASC NULLS LAST,
                            result_distance DESC NULLS LAST
               ) AS rnk
        FROM public.race_records WHERE event_id = p_event_id
    )
    UPDATE public.race_records rr
    SET finish_rank = ranked.rnk
    FROM ranked WHERE rr.id = ranked.id;
    GET DIAGNOSTICS v_ranked = ROW_COUNT;

    UPDATE public.race_events
    SET status = 'completed', lobby_status = 'finished', updated_at = now()
    WHERE id = p_event_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), 'FINISH_RACE_EVENT', 'race_events', p_event_id,
            jsonb_build_object('status', v_event.status, 'lobby_status', v_event.lobby_status),
            jsonb_build_object('status', 'completed', 'lobby_status', 'finished', 'ranked', v_ranked));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', p_event_id, 'ranked_records', v_ranked,
                                   'status', 'completed'),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_finish_race_event(uuid) IS
'Race 이벤트 종료(코치/admin): status=completed, lobby=finished, finish_rank 계산.';

-- fn_get_race_event_result(p_event_id) — 이벤트별 리더보드(코치/admin 뷰)
CREATE OR REPLACE FUNCTION public.fn_get_race_event_result(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_data JSONB;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    SELECT id, name, event_date, race_format, status, target_distance_m
    INTO v_event FROM public.race_events WHERE id = p_event_id;
    IF v_event.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_not_found');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.finish_rank NULLS LAST), '[]'::jsonb) INTO v_data
    FROM (
        SELECT rr.finish_rank, m.name AS member_name, rr.lane_number,
               rr.result_distance, EXTRACT(EPOCH FROM rr.result_time)::NUMERIC AS result_time_sec,
               rr.avg_watts, rr.avg_spm, rr.is_pr
        FROM public.race_records rr
        LEFT JOIN public.members m ON m.id = rr.member_id
        WHERE rr.event_id = p_event_id
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', v_event.id, 'name', v_event.name,
                                   'status', v_event.status, 'results', v_data),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_race_event_result(uuid) IS
'이벤트별 Race 리더보드(코치/admin 뷰).';


-- ============================================================================
-- [R4] Class anon (docs/05 §6, docs/15)
-- ============================================================================

-- R4.1 fn_get_race_lanes(p_event_id) — ANON 레인 배정 + device_type + 이름 (Display-Safe)
--   pm5_devices anon 갭 해소: 레인별 device_type만 반환(테이블 미노출). 생체지표(hr) 제외.
CREATE OR REPLACE FUNCTION public.fn_get_race_lanes(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    IF p_event_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_required');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.lane_number), '[]'::jsonb) INTO v_data
    FROM (
        SELECT ls.lane_number,
               m.name AS member_name,
               d.device_type,
               ls.connection_status,
               ls.distance_m, ls.power_w, ls.stroke_rate_spm
        FROM public.race_live_state ls
        LEFT JOIN public.members m ON m.id = ls.member_id
        LEFT JOIN public.pm5_devices d ON d.id = ls.device_id
        WHERE ls.event_id = p_event_id
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', p_event_id, 'lanes', v_data), 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_race_lanes(uuid) IS
'ANON 레인 배정: race_live_state 레인별 이름+device_type+성능(거리/파워/SPM). 생체지표(HR) 제외, 테이블 미노출.';

-- R4.2 fn_get_class_race_result(p_event_id) — ANON 최종 결과 (이름+거리/시간+순위)
CREATE OR REPLACE FUNCTION public.fn_get_class_race_result(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_data JSONB;
BEGIN
    IF p_event_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_required');
    END IF;
    SELECT id, name, event_date, race_format, status INTO v_event
    FROM public.race_events WHERE id = p_event_id;
    IF v_event.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_not_found');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.finish_rank NULLS LAST), '[]'::jsonb) INTO v_data
    FROM (
        SELECT rr.finish_rank, m.name AS member_name, rr.lane_number,
               rr.result_distance, EXTRACT(EPOCH FROM rr.result_time)::NUMERIC AS result_time_sec,
               rr.avg_spm, rr.is_pr
        FROM public.race_records rr
        LEFT JOIN public.members m ON m.id = rr.member_id
        WHERE rr.event_id = p_event_id
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', v_event.id, 'name', v_event.name,
                                   'race_format', v_event.race_format, 'status', v_event.status,
                                   'results', v_data),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_class_race_result(uuid) IS
'ANON Class TV 최종 Race 결과: 이름+거리/시간+순위(Display-Safe). 생체지표(HR)/개인정보 제외.';

-- R4.3 fn_get_class_wod_board(p_session_id) — ANON 일일 WOD 화이트보드 (rx 배지)
--   docs/05 §5.3 whiteboard mode. authenticated 전용 fn_get_session_wod_whiteboard 의 anon Display-Safe 판.
--   note(개인 메모) 미포함. p_session_id NULL 시 시설 파라미터가 아니므로 세션 필수.
CREATE OR REPLACE FUNCTION public.fn_get_class_wod_board(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_wod RECORD;
    v_data JSONB;
BEGIN
    IF p_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_required');
    END IF;

    SELECT sw.id, COALESCE(sw.title_override, wt.title) AS wod_title,
           COALESCE(sw.format_override, wt.format_type) AS format,
           s.session_date, s.title AS session_title
    INTO v_wod
    FROM public.session_wods sw
    JOIN public.sessions s ON s.id = sw.session_id
    LEFT JOIN public.wod_templates wt ON wt.id = sw.template_id
    WHERE sw.session_id = p_session_id AND sw.publish_state = 'published';
    IF v_wod.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_wod_not_published');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.rank), '[]'::jsonb) INTO v_data
    FROM (
        SELECT ROW_NUMBER() OVER (
                   ORDER BY CASE r.rx_status WHEN 'rx_plus' THEN 0 WHEN 'rx' THEN 1 ELSE 2 END,
                            CASE WHEN r.score_type = 'time' THEN r.score END ASC NULLS LAST,
                            CASE WHEN r.score_type <> 'time' THEN r.score END DESC NULLS LAST,
                            r.created_at ASC
               ) AS rank,
               m.name AS member_name,
               r.score, r.score_type, r.rx_status
        FROM public.session_wod_results r
        JOIN public.members m ON m.id = r.member_id
        WHERE r.session_wod_id = v_wod.id
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'session_id', p_session_id, 'session_title', v_wod.session_title,
            'session_date', v_wod.session_date, 'wod_title', v_wod.wod_title,
            'format', v_wod.format, 'results', v_data),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_class_wod_board(uuid) IS
'ANON Class TV 일일 WOD 화이트보드(이름+점수+rx 배지, Rx+→Rx→Scaled 정렬). 개인 메모 미포함.';


-- ============================================================================
-- [R.GRANT] 권한 부여 — authenticated 기본, anon 화이트리스트 6종
-- ============================================================================
DO $$
DECLARE
    v_fn text;
BEGIN
    -- authenticated 전용 (member/coach RPC)
    FOR v_fn IN VALUES
        ('public.fn_record_my_benchmark_result(uuid,numeric,text,uuid,jsonb)'),
        ('public.fn_get_member_schedule(date,date)'),
        ('public.fn_get_benchmark_leaderboard(text,text)'),
        ('public.fn_create_support_ticket(text,text,text)'),
        ('public.fn_record_session_wod_result(uuid,numeric,text,text,text,uuid)'),
        ('public.fn_get_coach_members(text)'),
        ('public.fn_upsert_member_note(uuid,uuid,text,text)'),
        ('public.fn_update_my_coach_profile(jsonb)'),
        ('public.fn_get_coach_member_alerts()'),
        ('public.fn_upsert_session_rotation_state(uuid,jsonb)'),
        ('public.fn_get_session_rotation_state(uuid)'),
        ('public.fn_list_coach_race_events(text)'),
        ('public.fn_create_coach_race_event(jsonb)'),
        ('public.fn_finish_race_event(uuid)'),
        ('public.fn_get_race_event_result(uuid)')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_fn);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_fn);
    END LOOP;

    -- anon 화이트리스트 (Kiosk 4종 + Class 2종 + 변경된 kiosk_checkin)
    FOR v_fn IN VALUES
        ('public.fn_kiosk_checkin(jsonb,uuid,timestamptz)'),
        ('public.fn_kiosk_lookup_member(uuid,text)'),
        ('public.fn_kiosk_heartbeat(uuid,text)'),
        ('public.fn_get_kiosk_notices(uuid)'),
        ('public.fn_get_race_lanes(uuid)'),
        ('public.fn_get_class_race_result(uuid)'),
        ('public.fn_get_class_wod_board(uuid)')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', v_fn);
    END LOOP;
END $$;

-- ============================================================================
-- [S] PM5 기기관리 (mig 20260709060000_device_admin_rpc.sql 미러)
--   fn_admin_upsert_pm5_device(p_payload jsonb) — is_admin, enum 서버검증 + serial UNIQUE + audit
--     payload: {id?, serial_number(필수), facility_id, device_type, status, current_mode,
--               ble_name, mac_address, qr_identifier, firmware_version}. id 유무로 insert/update.
--   fn_admin_delete_pm5_device(p_id uuid) — is_admin, racing 중 차단 + audit
--   fn_list_pm5_devices(p_facility_id uuid DEFAULT NULL) — is_admin_or_coach, {devices:[...]}
-- ============================================================================

-- ============================================================================
-- [T] 알림 실연동 (mig 20260709070000_notification_automation.sql 미러)
--   fn_dispatch_notification(p_user_id uuid, p_title text, p_content text,
--       p_category text DEFAULT 'system', p_type text DEFAULT 'info',
--       p_action_url text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb) → jsonb
--     SECURITY DEFINER. 내부 auth.uid() 가드: 본인 타깃은 누구나, 타 사용자 타깃은 is_admin() 필요
--     (클라이언트가 임의 user_id 주입 불가). category/type 는 notifications CHECK 집합 검증.
--     members.user_id 로 member 해석 → channel='in_app' insert → trg_notifications_side_effects
--     가 push/외부 채널 팬아웃. envelope {success, data:{notification_id}, error}. authenticated·service_role.
--   자동화(설계 06 SSOT, 재확인): cron bcl-class-reminders(*/10) · bcl-membership-expiry-reminders(0 0 * * *),
--     trigger trg_notifications_side_effects · trg_notify_waitlist_on_vacancy.
-- ============================================================================

-- ============================================================================
-- [U] 서버측 세부권한 게이트 (mig 20260709080000_permission_enforcement.sql 미러)
--   fn_has_permission(p_group text, p_action text) → boolean
--     SECURITY DEFINER STABLE. 판정 순서:
--       1) auth.uid() NULL → false
--       2) super_admin: admin_user_roles→admin_roles.permissions 에 '*' 존재 → true
--       3) bootstrap: is_admin(role=admin·approved) AND admin_user_roles 매핑 0건 → true
--          (admin@bcl.com 무매핑 부트스트랩 — 잠금 방지, fn_my_permissions 계약과 동일)
--       4) 그 외: 그룹별 병합 permissions 배열에 action 또는 'all' 포함 → true
--   가산 게이트(17종, 각 함수 기존 is_admin() 블록 직후 삽입, 나머지 바이트 불변):
--     fn_admin_create_membership(members.create) · fn_admin_adjust_membership(members.edit)
--     · fn_admin_transfer_membership(members.delete) · fn_admin_book_session(schedule.create)
--     · fn_admin_add_walkin(schedule.edit) · fn_admin_set_blacklist(members.delete)
--     · fn_admin_review_signup(members.edit) · fn_upsert_membership_plan(plans.edit)
--     · fn_archive_membership_plan(plans.delete) · fn_upsert_session(schedule.edit)
--     · fn_cancel_session(schedule.delete) · fn_promote_from_waitlist(schedule.edit)
--     · fn_set_payment_mode(payments.manage) · fn_update_coach_profile(coaches.edit)
--     · fn_reply_support_ticket(crm.edit) · fn_admin_upsert_pm5_device(race.edit)
--     · fn_admin_delete_pm5_device(race.delete). 권한 없으면 {success:false,error:'forbidden'} envelope.
-- ============================================================================

-- ============================================================================
-- [V] Kiosk 프로비저닝 + 게스트 체크인 (mig 20260709090000_kiosk_provisioning.sql 미러)
--   kiosk_devices += device_token(UNIQUE)·token_issued_at·provisioned_at
--   guest_checkin_codes (신규, RLS admin-only FOR ALL): 6자리 1회용 코드, 당일 만료·단회 소멸.
--   fn_admin_issue_kiosk_token(p_device_id uuid) — is_admin, 토큰 발급/회전, data.token 1회 노출, audit.
--   fn_kiosk_provision(p_token text) — ANON, 토큰→{device_id,facility_id,device_name,status} 좁은 해석.
--   fn_admin_issue_guest_code(p_payload jsonb) — is_admin, {member_id(필수),membership_id?,facility_id?,
--     expires_at?}, 6자리 코드 발권(당일 만료), data.code 1회 노출, audit.
--   fn_kiosk_guest_checkin(p_code text, p_device_id uuid DEFAULT NULL, p_scanned_at timestamptz DEFAULT NULL)
--     — ANON, 코드 잠금상환 → fn_kiosk_checkin 동일 판정(회원·±30분 예약·멤버십 크레딧 원자차감) →
--       체크인 기록 + 코드 consumed(단일 트랜잭션). envelope = fn_kiosk_checkin data + guest:true.
--   GRANT: fn_kiosk_provision·fn_kiosk_guest_checkin → anon+authenticated; issue 2종 → authenticated(anon revoke).
-- ============================================================================

-- ============================================================================
-- [W] Race 페이서 (mig 20260709100000_race_pacer.sql 미러)
--   race_events += pacer_config jsonb (nullable). 렌더 전용 — 랭킹/집계/race_records 제외(docs/15 §4b.5).
--   fn_set_race_pacer(p_event_id uuid, p_pacer jsonb) → jsonb
--     SECURITY DEFINER. 내부 is_admin_or_coach() + 소유(admin || event.coach_id=본인 || session_coaches).
--     p_pacer = {enabled bool, source 'coach_split'|'member_pr'|'club_record', split_500m? sec,
--       member_id? uuid, label? text}. enabled=false → pacer_config=NULL. coach_split 은 split_500m>0 필수,
--       split 0<x<=3600 clamp. jsonb_strip_nulls 저장.
--       envelope {success, data:{event_id, pacer_config, resolved bool}, error}.
--     GRANT authenticated(anon revoke).
--   서버측 스플릿 해석 (mig 20260709110000_pacer_split_resolution.sql 추가):
--     split_500m 미지정 시 member_pr/club_record 를 서버에서 해석(명시 split_500m > 해석값).
--     소스: member_benchmark_results ⨝ benchmark_definitions(metric_type='time', name ~* 'row')
--       → 500m 환산 result_value*500/거리(name 파싱) ; race_records.avg_pace(초/500m). 둘 중 MIN(최속).
--     member_pr = 해당 member_id(→ member_required 신규 에러) ; club_record = event.facility_id 범위.
--     기록 없으면 split 없이 저장(graceful, 무에러 — UI '기록 없음'). data.resolved = split 존재 여부.
-- ============================================================================

-- ============================================================================
-- [X] 레이스 회원(레인) 배정 (mig 20260709170000_race_lane_assignment.sql 미러)
--   fn_get_assignable_roster(p_event_id uuid) → jsonb  (is_admin_or_coach + 소유, authenticated)
--     data = {event_id, lobby_status, members:[{member_id,name,source:'roster'|'facility'}],
--             devices:[{device_id,serial_number,device_type,status}],
--             current:[{device_id,lane_number,member_id,team_id}]}
--     members = 세션 명단(confirmed 예약∪체크인) ∪ 지점 활성 회원(roster 우선). 에러 forbidden/not_assigned 등.
--   fn_set_race_lanes(p_event_id uuid, p_lanes jsonb) → jsonb  (is_admin_or_coach + 소유, authenticated)
--     p_lanes = [{device_id, lane_number, member_id?, team_id?}]. lobby_status IN (setup,lobby) 만 허용
--       (그 외 error 'race_in_progress'). race_live_state ON CONFLICT(event_id,device_id) 업서트 +
--       미포함 기기 삭제(풀-리플레이스), device.facility=event.facility 검증. data={event_id, lane_count}.
-- ============================================================================

-- ============================================================================
-- [Y] WOD 회원 공개 (mig 20260709160000_wod_member_visible.sql 미러)
--   wod_templates += is_member_visible boolean NOT NULL DEFAULT false (회원앱 공개 토글).
--   fn_upsert_wod_template: p_payload.is_member_visible 저장(COALESCE, 나머지 로직 불변).
--     읽기(fn_get_wod_template/fn_list_wod_templates)는 to_jsonb(wt)로 자동 노출 — 별도 변경 불필요.
--   fn_list_member_wods() → jsonb  (authenticated, anon revoke). 게시(published_at NOT NULL) +
--     is_member_visible=true 템플릿만. Display-Safe(public_notes만 notes, 코치노트/정산 제외).
--     data.wods = [{id,title,format,rounds,time_cap_minutes,notes,
--                   movements:[{name,target,reps,rx_male,rx_female,superset_group}]}].
-- ============================================================================

-- ============================================================================
-- [Z] WOD 컴파운드 세트 (mig 20260709180000_wod_compound_set.sql 미러)
--   wod_template_movements += superset_group text (nullable). 연속 동일 값 = 한 컴파운드 세트,
--     null = 단독 라인(기존 flat 하위호환). session_wods.movements_snapshot 은 jsonb passthrough로
--     superset_group 을 그대로 보관 → TV(fn_get_class_display_wod)·회원앱 그룹 렌더.
--   fn_upsert_wod_template: movements[].superset_group 저장(시그니처 불변).
--   fn_list_member_wods: movement 객체에 superset_group 포함(시그니처 불변).
-- ============================================================================

-- ============================================================================
-- 09_rpc.sql 끝 — 전체 스키마 적용 완료
-- ============================================================================
