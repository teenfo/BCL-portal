-- ============================================================================
-- BCL Portal Phase 2 하드닝 — 20260708050000_admin_audit_rpc.sql
-- ----------------------------------------------------------------------------
-- 목적   : Admin 파괴적 쓰기의 audit·원자성 RPC 보강
--          신규 7종:
--            fn_admin_set_blacklist / fn_admin_review_signup /
--            fn_upsert_membership_plan / fn_archive_membership_plan /
--            fn_upsert_session / fn_cancel_session / fn_promote_from_waitlist
--          기존 3종 audit 보강(CREATE OR REPLACE):
--            fn_mark_attendance / fn_cancel_booking_with_credit /
--            fn_upsert_member_alert_flag
-- 의존   : 00~09 전부, 20260708040000_admin_membership_booking_rpc.sql
-- 규약(계약 §3 / 09_rpc.sql 준수):
--   - SECURITY DEFINER + SET search_path = public
--   - 내부 is_admin()/_assert_* 게이트 (클라이언트가 식별자 전달 금지)
--   - 응답 envelope 1종: {success boolean, data jsonb|null, error text|null}
--   - 파괴적/상태 변경은 audit_logs 기록
--     (컬럼: user_id=auth.uid(), action, table_name, record_id, old_values, new_values)
--   - 멤버십/세션 대량 변경은 단일 트랜잭션 + 세션 단위 advisory lock
-- 비고   : audit_logs 실제 스키마 컬럼명은 user_id/table_name/record_id
--          (actor/target_table/target_id 아님) — 기존 [O] 섹션 패턴과 동일.
--          profiles 거부 사유 컬럼명은 rejected_reason.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. fn_admin_set_blacklist(p_member_id, p_on, p_reason) — 블랙리스트 토글
--    p_on=true면 사유 필수(reason_required). 즉시 예약/체크인 차단(members.is_blacklisted).
--    (02-admin §3.2 파괴적: 블랙리스트 지정 사유 입력 필수 + confirm)
-- ----------------------------------------------------------------------------
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

COMMENT ON FUNCTION public.fn_admin_set_blacklist(UUID, BOOLEAN, TEXT) IS
    'Admin: 회원 블랙리스트 토글(사유 필수 시 reason_required) + audit. 예약/체크인 차단 소스 members.is_blacklisted';


-- ----------------------------------------------------------------------------
-- 2. fn_admin_review_signup(p_user_id, p_decision, p_reason) — 가입 승인/거부
--    p_decision IN('approved','rejected'). 대상이 pending 아니면 not_pending.
--    approved → approved_at/approved_by, rejected → rejected_reason. audit.
--    (02-admin §3.2 가입 승인 워크플로우)
-- ----------------------------------------------------------------------------
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

COMMENT ON FUNCTION public.fn_admin_review_signup(UUID, TEXT, TEXT) IS
    'Admin: 가입 승인/거부(pending 대상만, not_pending 가드) + audit. 거부 사유 profiles.rejected_reason';


-- ----------------------------------------------------------------------------
-- 3. fn_upsert_membership_plan(p_payload) — 요금제 생성/수정 (id 유무로 분기)
--    type/price/duration_days/credit_count/plan_kind/refund_policy/max_pauses/
--    facility_sharing/is_active(+name/facility_id/discount_price/description) 처리.
--    chk_plan_type·chk_refund_penalty_cap 위반은 예외로 표면화. audit(old/new).
--    (02-admin §3.5: 가격 변경은 신규 판매분부터 — 기존 멤버십 스냅샷 불변)
-- ----------------------------------------------------------------------------
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

COMMENT ON FUNCTION public.fn_upsert_membership_plan(JSONB) IS
    'Admin: 요금제 생성/수정(id 유무 분기) + audit(old/new). CHECK 위반은 error로 표면화';


-- ----------------------------------------------------------------------------
-- 4. fn_archive_membership_plan(p_plan_id) — 요금제 보관(숨김)
--    활성 구독(memberships status='active', plan_id=대상) 있으면 has_active_subscriptions.
--    물리 삭제 대신 is_active=false. audit. (02-admin §3.5 파괴적: 삭제 차단·숨김만)
-- ----------------------------------------------------------------------------
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

COMMENT ON FUNCTION public.fn_archive_membership_plan(UUID) IS
    'Admin: 요금제 보관(is_active=false). 활성 구독 존재 시 has_active_subscriptions로 차단 + audit';


-- ----------------------------------------------------------------------------
-- 5. fn_upsert_session(p_payload) — 세션 생성/수정 + session_coaches 원자 교체
--    payload.coaches=[{coach_id,assignment_role,display_order}] 있으면 delete-all→insert.
--    편집이며 date/start_time/end_time 변경 & 활성 예약(confirmed+waitlisted)>0이면
--    응답 data에 affected_count 포함(저장은 진행 — confirm은 UI 담당). audit(old/new).
--    (02-admin §3.6 스케줄 세션 생성/이동/정원·시간 편집)
-- ----------------------------------------------------------------------------
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

COMMENT ON FUNCTION public.fn_upsert_session(JSONB) IS
    'Admin: 세션 생성/수정 + session_coaches 원자 교체. 시간 변경 & 활성 예약>0이면 data.affected_count 반환 + audit';


-- ----------------------------------------------------------------------------
-- 6. fn_cancel_session(p_session_id, p_reason) — 세션 취소(원자)
--    활성 예약 전원 크레딧 복구(credit_used=true 차감 원천에만 +1) + bookings cancelled
--    + sessions cancelled. 단일 트랜잭션 + 세션 단위 advisory lock.
--    반환 data: refunded_count / credit_restored_count / cancelled_booking_count.
--    ※ 대량 취소 알림(예약자/대기자) 발송은 범위 외 — 별도 크론/Edge 처리.
--      spurious waitlist-vacancy 알림 억제 위해 waitlisted 먼저 취소 후 confirmed 취소.
--    (02-admin §3.6 세션 취소)
-- ----------------------------------------------------------------------------
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

    -- 크레딧 복구: 활성 예약 중 credit_used=true인 건의 차감 원천 멤버십에만 +1
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

COMMENT ON FUNCTION public.fn_cancel_session(UUID, TEXT) IS
    'Admin: 세션 취소(원자) — 활성 예약 크레딧 복구 + bookings/sessions cancelled + audit. 알림은 범위 외';


-- ----------------------------------------------------------------------------
-- 7. fn_promote_from_waitlist(p_booking_id) — 대기자 수동 승격
--    waitlisted 아니면 not_waitlisted; confirmed 수 >= capacity면 session_full.
--    크레딧은 예약 시 이미 차감됐으면(credit_used) 재차감 안 함 — 미차감(대기 등록분)이고
--    횟수제 활성 멤버십 있으면 여기서 1회 차감(직접 confirmed 예약과 정합).
--    FOR UPDATE + 세션 단위 advisory lock으로 정원 경쟁 차단. audit.
--    (02-admin §3.6 waitlist 서브탭 수동 승격)
-- ----------------------------------------------------------------------------
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

    -- 크레딧: 이미 차감됐으면 재차감 없음. 대기 등록분(credit_used=false)이고 횟수제 멤버십 있으면 1회 차감
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

COMMENT ON FUNCTION public.fn_promote_from_waitlist(UUID) IS
    'Admin: 대기자 수동 승격(not_waitlisted/session_full 가드, 정원 경쟁 차단) + 미차감분 크레딧 정합 + audit';


-- ============================================================================
-- 보강 3종 (CREATE OR REPLACE — 원 정의 + audit_logs INSERT)
-- ============================================================================

-- 8. fn_mark_attendance — 출결 판정 변경 시 audit(정산 Basis 영향). 각 item 단위 기록.
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

            -- 🔄 audit: 출결 판정 변경(정산 basis 영향) — 각 item 단위 old/new 기록
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


-- 9. fn_cancel_booking_with_credit — 대리 취소 포함 취소 audit 보강.
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

    -- 🔄 audit: 취소(특히 admin 대리 취소) 기록
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


-- 10. fn_upsert_member_alert_flag — 경고 플래그 변경 audit 보강.
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

    -- 🔄 audit: 경고 플래그 생성/변경 기록
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
-- 권한 — 신규 7종 REVOKE anon + GRANT authenticated
-- (보강 3종은 시그니처 불변 → 기존 GRANT 유지)
-- ============================================================================
DO $$
DECLARE
    v_fn TEXT;
BEGIN
    FOR v_fn IN VALUES
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
END $$;

-- ============================================================================
-- 20260708050000_admin_audit_rpc.sql 끝
-- ============================================================================
