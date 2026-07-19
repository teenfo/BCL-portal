-- ============================================================================
-- 20260709080000_permission_enforcement.sql
-- 서버측 세분화 관리자 권한(RBAC) 집행 — 02-admin §3.14
-- ----------------------------------------------------------------------------
-- 목적: admin_user_roles → admin_roles.permissions 기반의 그룹×액션 권한을
--       민감 관리자 "쓰기" RPC에 서버측에서 강제한다. (클라이언트 라우트 가드는 이미 존재)
--
-- 안전장치(절대 잠금 금지 — admin@bcl.com 등 초기 관리자):
--   1) super_admin  = 배정 역할 중 permissions 에 '*' 키 보유 → 무조건 통과
--   2) bootstrap    = is_admin(role=admin·approved) 이고 admin_user_roles 매핑 0건 → 무조건 통과
--                     (fn_my_permissions 부트스트랩 규약과 동일)
--
-- 게이트 성격: ADDITIVE. 각 RPC의 기존 is_admin() 검사 블록 "직후"에 세분 권한 게이트를
--   한 개만 삽입한다. 나머지 로직은 원본 그대로 보존된다(regexp_replace 는 매칭된
--   is_admin 블록만 재출력하고 그 뒤에 게이트를 덧붙일 뿐, 함수 본문을 재작성하지 않는다).
--   비인가 시 예외를 던지지 않고 envelope {success:false, error:'forbidden'} 를 반환한다.
--   본 마이그레이션은 idempotent: 이미 동일 게이트가 있는 함수는 건너뛴다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- [1] 권한 검증 헬퍼 — fn_has_permission(group, action) RETURNS boolean
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_has_permission(p_group text, p_action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id   UUID := auth.uid();
    v_is_admin  BOOLEAN;
    v_has_star  BOOLEAN;
    v_map_count INT;
    v_actions   JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    -- super_admin: 배정된 역할 중 하나라도 permissions 에 '*' 키를 가지면 전권 통과
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_user_roles aur
        JOIN public.admin_roles ar ON ar.id = aur.role_id
        WHERE aur.user_id = v_user_id AND ar.permissions ? '*'
    ) INTO v_has_star;
    IF v_has_star THEN
        RETURN true;
    END IF;

    -- bootstrap admin: role=admin·approved 이면서 역할 매핑이 0건이면 통과 (초기 관리자 잠금 방지)
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = v_user_id AND role = 'admin' AND approval_status = 'approved'
    ) INTO v_is_admin;

    SELECT COUNT(*) INTO v_map_count
    FROM public.admin_user_roles WHERE user_id = v_user_id;

    IF v_is_admin AND v_map_count = 0 THEN
        RETURN true;
    END IF;

    -- 그룹별 액션 병합(모든 배정 역할 union) 후 해당 액션 또는 'all' 포함 여부.
    -- (레거시 불리언맵 형태 방어: 그룹 값이 배열이 아닐 때는 빈 배열로 취급)
    SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb) INTO v_actions
    FROM public.admin_user_roles aur
    JOIN public.admin_roles ar ON ar.id = aur.role_id
    CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(ar.permissions -> p_group) = 'array'
             THEN ar.permissions -> p_group
             ELSE '[]'::jsonb END
    ) AS elem
    WHERE aur.user_id = v_user_id;

    RETURN (v_actions ? p_action) OR (v_actions ? 'all');
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_has_permission(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_has_permission(text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- [2] 민감 관리자 쓰기 RPC 17종에 세분 권한 게이트 주입 (기존 로직 보존)
--
--   RPC (signature)                                  → group.action
--   ------------------------------------------------------------------------
--   fn_admin_create_membership(uuid,uuid,date,uuid)  → members.create
--   fn_admin_adjust_membership(uuid,text,jsonb)      → members.edit
--   fn_admin_transfer_membership(uuid,uuid,text)     → members.delete
--   fn_admin_book_session(uuid,uuid)                 → schedule.create
--   fn_admin_add_walkin(uuid,uuid)                   → schedule.edit
--   fn_admin_set_blacklist(uuid,boolean,text)        → members.delete
--   fn_admin_review_signup(uuid,text,text)           → members.edit
--   fn_upsert_membership_plan(jsonb)                 → plans.edit
--   fn_archive_membership_plan(uuid)                 → plans.delete
--   fn_upsert_session(jsonb)                         → schedule.edit
--   fn_cancel_session(uuid,text)                     → schedule.delete
--   fn_promote_from_waitlist(uuid)                   → schedule.edit
--   fn_set_payment_mode(text)                        → payments.manage
--   fn_update_coach_profile(uuid,jsonb)              → coaches.edit
--   fn_reply_support_ticket(uuid,text,text)          → crm.edit
--   fn_admin_upsert_pm5_device(jsonb)                → race.edit
--   fn_admin_delete_pm5_device(uuid)                 → race.delete
--
--   RBAC 편집 RPC(fn_set_role_permissions/fn_assign_admin_role/fn_revoke_admin_role)는
--   이미 super_admin 전용 게이트가 있어 제외한다.
-- ----------------------------------------------------------------------------
DO $mig$
DECLARE
    v_map     CONSTANT jsonb := '[
      {"sig":"fn_admin_create_membership(uuid,uuid,date,uuid)","g":"members","a":"create"},
      {"sig":"fn_admin_adjust_membership(uuid,text,jsonb)","g":"members","a":"edit"},
      {"sig":"fn_admin_transfer_membership(uuid,uuid,text)","g":"members","a":"delete"},
      {"sig":"fn_admin_book_session(uuid,uuid)","g":"schedule","a":"create"},
      {"sig":"fn_admin_add_walkin(uuid,uuid)","g":"schedule","a":"edit"},
      {"sig":"fn_admin_set_blacklist(uuid,boolean,text)","g":"members","a":"delete"},
      {"sig":"fn_admin_review_signup(uuid,text,text)","g":"members","a":"edit"},
      {"sig":"fn_upsert_membership_plan(jsonb)","g":"plans","a":"edit"},
      {"sig":"fn_archive_membership_plan(uuid)","g":"plans","a":"delete"},
      {"sig":"fn_upsert_session(jsonb)","g":"schedule","a":"edit"},
      {"sig":"fn_cancel_session(uuid,text)","g":"schedule","a":"delete"},
      {"sig":"fn_promote_from_waitlist(uuid)","g":"schedule","a":"edit"},
      {"sig":"fn_set_payment_mode(text)","g":"payments","a":"manage"},
      {"sig":"fn_update_coach_profile(uuid,jsonb)","g":"coaches","a":"edit"},
      {"sig":"fn_reply_support_ticket(uuid,text,text)","g":"crm","a":"edit"},
      {"sig":"fn_admin_upsert_pm5_device(jsonb)","g":"race","a":"edit"},
      {"sig":"fn_admin_delete_pm5_device(uuid)","g":"race","a":"delete"}
    ]'::jsonb;
    v_item    jsonb;
    v_sig     text;
    v_grp     text;
    v_act     text;
    v_src     text;
    v_new     text;
    v_gate_marker text;
    -- is_admin() 게이트 블록 앵커 (들여쓰기 무관). \1=선행개행, \2=IF 들여쓰기, \3=블록전체
    v_anchor  CONSTANT text :=
        '(\n)([ \t]*)(IF NOT public\.is_admin\(\) THEN\n[ \t]*RETURN jsonb_build_object\(''success'', false, ''data'', NULL, ''error'', ''forbidden''\);\n[ \t]*END IF;\n)';
    v_repl    text;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_map)
    LOOP
        v_sig := v_item->>'sig';
        v_grp := v_item->>'g';
        v_act := v_item->>'a';
        v_gate_marker := 'fn_has_permission(''' || v_grp || ''', ''' || v_act || ''')';

        v_src := pg_get_functiondef(('public.' || v_sig)::regprocedure);

        -- idempotent: 이미 동일 게이트가 있으면 건너뛴다
        IF position(v_gate_marker IN v_src) > 0 THEN
            RAISE NOTICE 'skip (already gated): %', v_sig;
            CONTINUE;
        END IF;

        -- 앵커(is_admin 블록) 뒤에 세분 권한 게이트 삽입. \2 로 원본 들여쓰기 재사용.
        v_repl := '\1\2\3\2IF NOT public.' || v_gate_marker || ' THEN' || E'\n'
               || '\2    RETURN jsonb_build_object(''success'', false, ''data'', NULL, ''error'', ''forbidden'');' || E'\n'
               || '\2END IF;' || E'\n';

        v_new := regexp_replace(v_src, v_anchor, v_repl);

        -- 안전 검증: 앵커를 못 찾아 원본이 그대로면 (게이트 미삽입) 즉시 실패시킨다
        IF v_new = v_src OR position(v_gate_marker IN v_new) = 0 THEN
            RAISE EXCEPTION 'permission gate injection FAILED for % (anchor not matched)', v_sig;
        END IF;

        EXECUTE v_new;
        RAISE NOTICE 'gated %  ->  %.%', v_sig, v_grp, v_act;
    END LOOP;

    -- 사후 검증: 17종 모두 게이트가 삽입되었는지 재확인
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_map)
    LOOP
        v_sig := v_item->>'sig';
        v_gate_marker := 'fn_has_permission(''' || (v_item->>'g') || ''', ''' || (v_item->>'a') || ''')';
        IF position(v_gate_marker IN pg_get_functiondef(('public.' || v_sig)::regprocedure)) = 0 THEN
            RAISE EXCEPTION 'post-check FAILED: % missing gate', v_sig;
        END IF;
    END LOOP;
    RAISE NOTICE 'permission_enforcement: all 17 RPCs gated + fn_has_permission ready';
END;
$mig$;
