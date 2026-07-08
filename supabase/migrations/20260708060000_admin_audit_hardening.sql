-- ============================================================================
-- BCL Portal — 20260708060000_admin_audit_hardening.sql
-- ----------------------------------------------------------------------------
-- 목적 : Phase 2B 감사 하드닝. Admin config 쓰기가 audit_logs 불변식을 우회하던
--        [권고] 갭을 광역 AFTER 트리거로 메우고, 서버 강제가 부족했던 고위험 쓰기
--        (payment_mode 전환 · RBAC 권한/배정 · 코치 급여·프로필)에 전용 RPC를 도입.
--        + support_tickets 답변 컬럼 / badge_awards 회수 사유 컬럼 스키마 갭 보강.
-- 설계 : (A) 광역 audit 트리거  (B) 서버 강제 전용 RPC  (C) 스키마 컬럼 추가
-- 규약 : 신규 RPC = SECURITY DEFINER + SET search_path=public + 내부 auth.uid()/게이트
--        + envelope {success,data,error} 1종. 클라이언트가 행위자 식별자 미전달.
-- audit_logs 실제 컬럼: user_id, action, table_name, record_id, old_values,
--        new_values, ip_address, user_agent, created_at.
-- ============================================================================


-- ============================================================================
-- [C] 스키마 컬럼 추가 (먼저 적용 — Part B RPC가 참조)
-- ============================================================================

-- C.1 support_tickets: 답변 본문 저장 (기존엔 status만 관리 가능 — CRM 스키마 갭)
--     replied_by는 assigned_to 관례를 따라 FK 없는 plain uuid (assigned_to에도 FK 없음)
ALTER TABLE public.support_tickets
    ADD COLUMN IF NOT EXISTS reply text,
    ADD COLUMN IF NOT EXISTS replied_at timestamptz,
    ADD COLUMN IF NOT EXISTS replied_by uuid;

-- C.2 badge_awards: 회수(revoke) 사유 (계약 §3.11 필수 사유 — 현재는 행 삭제 방식)
--     soft-revoke 대비 nullable 컬럼만 추가 (기존 삭제 플로우는 유지)
ALTER TABLE public.badge_awards
    ADD COLUMN IF NOT EXISTS revoke_reason text,
    ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
    ADD COLUMN IF NOT EXISTS revoked_by uuid;


-- ============================================================================
-- [A] 광역 audit — AFTER 트리거 (config 테이블 전반 [권고] 갭 일괄 해소)
-- ============================================================================

-- A.1 일반 config 테이블용 트리거 함수 (id PK 보유 테이블 전제)
--     action = <op>_<table> (예: update_lockers), record_id = COALESCE(NEW.id, OLD.id)
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

COMMENT ON FUNCTION public._audit_row_change() IS
    'Phase2B: config 테이블 광역 audit AFTER 트리거. auth.uid()(cron/system 시 NULL 허용), old/new = to_jsonb(row)';

-- A.2 system_config 전용 트리거 함수 — is_secret 행의 config_value를 "***"로 마스킹
--     (to_jsonb(row)가 시크릿 원문을 audit_logs로 유출하지 않도록)
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

COMMENT ON FUNCTION public._audit_system_config_change() IS
    'Phase2B: system_config audit — is_secret 행 config_value 마스킹(***) 후 기록';

-- A.3 트리거 부착 — config 테이블 18종(system_config 제외) + system_config 전용
--     제외: 고빈도/트랜잭션 테이블(checkins/bookings/payments/members/profiles/sessions 등)
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


-- ============================================================================
-- [B] 서버 강제 전용 RPC (고위험 쓰기)
--     ※ 대상 테이블에 Part A 트리거가 있으면 RPC 내부 mutation이 트리거를 발화시켜
--        자동 audit된다 → 중복 방지를 위해 RPC 내부에서 audit_logs를 수동 INSERT 하지 않는다.
--        예외: pg_settings는 트리거 미부착 → fn_set_payment_mode에서만 수동 audit.
-- ============================================================================

-- B.0 super_admin 판정 헬퍼 — '*' 권한 role 보유 OR (admin && role 매핑 없음) 부트스트랩
--     (fn_my_permissions.is_super_admin / bootstrap 로직과 동일)
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
    -- 부트스트랩: role=admin인데 역할 매핑이 전혀 없으면 super_admin으로 간주(잠금 방지)
    IF public.is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.admin_user_roles aur WHERE aur.user_id = auth.uid()
    ) THEN
        RETURN true;
    END IF;
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public._is_super_admin() IS 'super_admin 게이트: * 권한 role 또는 부트스트랩 admin';

-- B.1 fn_set_payment_mode(p_mode) — pg_settings.payment_mode 전환.
--     게이트: is_admin(). ENFORCEMENT: min(admin,env) 이중장치의 env 축은 결제 승인 시점
--     (서버/edge function)에서 강제된다 — Postgres 세션에는 배포 env가 노출되지 않으므로 여기서는
--     mode 값 자체를 막지 않는다. live로 전환해도 서버 env=simulation이면 실제 승인이 차단된다
--     (UI 이중장치 안내와 동일). 여기서 서버 강제하는 것: 관리자 인증 + 값 검증(simulation/live)
--     + audit. pg_settings에는 Part A 트리거가 없으므로 audit는 이 RPC에서 수동 INSERT.
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

-- B.2 fn_set_role_permissions(p_role_id, p_permissions) — admin_roles.permissions 편집.
--     게이트: super_admin 전용. 시스템 역할(super_admin/manager/staff/viewer) 편집 잠금.
--     mutation → Part A 트리거(trg_audit_admin_roles) 자동 audit.
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

-- B.3 fn_assign_admin_role(p_user_id, p_role_id, p_facility_id) — admin_user_roles insert.
--     게이트: super_admin. assigned_by = auth.uid(). mutation → Part A 트리거 자동 audit.
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

-- B.4 fn_revoke_admin_role(p_assignment_id) — admin_user_roles delete.
--     게이트: super_admin. mutation(DELETE) → Part A 트리거 자동 audit.
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

-- B.5 fn_update_coach_profile(p_coach_id, p_patch) — 코치 프로필+급여 편집.
--     게이트: is_admin(). 급여(base_salary/session_allowance)는 정산 basis 영향(계약 §3.7).
--     화이트리스트 컬럼만 갱신 — 그 외 키 포함 시 거부. mutation → Part A 트리거 자동 audit.
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

    -- 화이트리스트 강제: 미허용 키 존재 시 거부
    IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(p_patch) AS k
        WHERE k NOT IN ('name','email','phone','specialties','bio',
                        'profile_image_url','base_salary','session_allowance','status')
    ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'unknown_field');
    END IF;

    -- NOT NULL / 값 검증
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

-- B.6 fn_reply_support_ticket(p_ticket_id, p_reply, p_status) — 문의 답변 + 상태 전환.
--     게이트: is_admin(). reply/replied_at=now()/replied_by=auth.uid() 기록.
--     resolved/closed 전환 시 resolved_at 설정, open/in_progress 복귀 시 해제.
--     mutation → Part A 트리거(trg_audit_support_tickets) 자동 audit.
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


-- ============================================================================
-- GRANT/REVOKE — 계약 §3 (client는 authenticated만 EXECUTE, 내부 함수는 전 client 회수)
-- ============================================================================
DO $$
DECLARE
    v_fn text;
BEGIN
    -- 클라이언트 호출 RPC 6종
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

    -- 내부 함수(트리거·게이트) — 전 client 역할 회수(definer/트리거 메커니즘으로만 실행)
    FOR v_fn IN VALUES
        ('public._audit_row_change()'),
        ('public._audit_system_config_change()'),
        ('public._is_super_admin()')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_fn);
    END LOOP;
END $$;

-- ============================================================================
-- 20260708060000_admin_audit_hardening.sql 끝
-- ============================================================================
