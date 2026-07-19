-- ============================================================================
-- BCL Portal Phase 2 — 20260708040000_admin_membership_booking_rpc.sql
-- ----------------------------------------------------------------------------
-- 목적   : Admin 멤버십 수명주기 + 대리 예약 RPC 5종 신설
--          fn_admin_create_membership / fn_admin_adjust_membership /
--          fn_admin_transfer_membership / fn_admin_book_session /
--          fn_admin_add_walkin
-- 의존   : 00~09 전부 (특히 02 memberships/membership_history,
--          03 sessions/bookings/checkins, 09 fn_book_with_credit 패턴)
-- 규약(계약 §3 / 09_rpc.sql 준수):
--   - SECURITY DEFINER + SET search_path = public
--   - 내부 is_admin() 게이트 (클라이언트가 coach_id/식별자 전달 금지)
--   - 응답 envelope 1종: {success boolean, data jsonb|null, error text|null}
--   - 멤버십 상태 변경은 membership_history 적재 후 memberships 갱신
--   - 모든 파괴적/상태 변경은 audit_logs 기록
--   - 동시성: 예약=세션 단위 advisory lock, 양도=멤버십 단위 advisory lock + FOR UPDATE
-- 비고   : 취소 대리 예약은 기존 fn_cancel_booking_with_credit(uuid,text)이
--          이미 admin 분기(OR is_admin(), 페널티 예외)를 포함 → 재사용, 별도 신설 안 함.
--          walk_in은 bookings.booking_type CHECK(regular/trial/makeup)에 없으므로
--          booking_type='regular' 유지 + attendance_outcome='walk_in'으로 기록
--          (fn_mark_attendance walk_in 경로와 동일 규약 — 스키마가 단일 소스).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. fn_admin_create_membership — 회원권 발급 (기간/크레딧 자동 계산 + 거래 연결)
-- ----------------------------------------------------------------------------
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

    -- 기간제 = start + duration_days, 횟수제 = remaining_credits = credit_count
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

    -- 거래 연결 (현장/온라인 결제 링크 시)
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

COMMENT ON FUNCTION public.fn_admin_create_membership(UUID, UUID, DATE, UUID) IS
    'Admin: 회원권 발급. plan 기준 end_date(기간제)/remaining_credits(횟수제) 자동 계산 + membership_history(created) + audit. transaction 연결 시 transactions.membership_id 갱신';


-- ----------------------------------------------------------------------------
-- 2. fn_admin_adjust_membership — 연장/홀딩/재개/크레딧조정/취소 (사유 필수)
--    p_action IN ('extend','hold','resume','credit_adjust','cancel')
--    p_payload.reason 필수. extend {days?,credits?} / credit_adjust {delta}
-- ----------------------------------------------------------------------------
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
    v_max_pauses INT;
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
        -- 홀딩 일수만큼 종료일 이월
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

COMMENT ON FUNCTION public.fn_admin_adjust_membership(UUID, TEXT, JSONB) IS
    'Admin: 멤버십 조정 extend/hold/resume/credit_adjust/cancel. hold=max_pauses 검증, resume=홀딩일수 이월, credit_adjust=음수 방지. reason 필수 + membership_history + audit';


-- ----------------------------------------------------------------------------
-- 3. fn_admin_transfer_membership — 회원권 양도 (원본 잔여 → 대상 신규, 원본 취소)
-- ----------------------------------------------------------------------------
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

    -- 이중 양도 차단: 멤버십 단위 advisory lock + 행 잠금
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

    -- 대상에 잔여기간/크레딧 승계한 신규 멤버십 생성 (오늘 시작, 종료일/크레딧 이월)
    INSERT INTO public.memberships
        (member_id, plan_id, start_date, end_date, remaining_credits, status)
    VALUES (p_target_member_id, v_src.plan_id, CURRENT_DATE, v_src.end_date,
            v_src.remaining_credits, 'active')
    RETURNING id INTO v_new_membership_id;

    -- 원본 취소
    UPDATE public.memberships
       SET status = 'cancelled', updated_at = now()
     WHERE id = p_membership_id;

    -- 양측 이력 (transferred) — old/new_values에 상대 회원 명시
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

COMMENT ON FUNCTION public.fn_admin_transfer_membership(UUID, UUID, TEXT) IS
    'Admin: 회원권 양도. 원본 잔여기간/크레딧으로 대상 신규 멤버십 생성 + 원본 cancelled. advisory lock+FOR UPDATE로 이중 양도 차단. 양측 history(transferred) + audit';


-- ----------------------------------------------------------------------------
-- 4. fn_admin_book_session — 관리자 대리 예약 (대상=p_member_id, 크레딧 차감 승계)
--    fn_book_with_credit 로직 승계(정원→waitlist, 크레딧 FOR UPDATE, 중복 방지).
--    정책(예약 윈도우/주간 상한/노쇼)은 운영 판단상 admin 대리 예약에서 예외.
-- ----------------------------------------------------------------------------
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

    -- 정원 판정 직렬화 (세션 단위 advisory lock)
    PERFORM pg_advisory_xact_lock(hashtext('booking:' || p_session_id::text));

    IF EXISTS (SELECT 1 FROM public.bookings
               WHERE session_id = p_session_id AND member_id = p_member_id
                 AND status <> 'cancelled') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'already_booked');
    END IF;

    SELECT COUNT(*) INTO v_confirmed
    FROM public.bookings WHERE session_id = p_session_id AND status = 'confirmed';

    -- 정원 초과 → 대기 등록 (크레딧 미차감)
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

    -- 횟수제 활성 멤버십 크레딧 차감 (만료 임박 순, 행 잠금)
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

COMMENT ON FUNCTION public.fn_admin_book_session(UUID, UUID) IS
    'Admin 대리 예약: 대상 member_id로 fn_book_with_credit 로직 승계(정원→waitlist, 횟수제 크레딧 FOR UPDATE 차감, 중복 방지) + audit';


-- ----------------------------------------------------------------------------
-- 5. fn_admin_add_walkin — 현장 워크인 (booking + checkin 원자)
--    ※ bookings.booking_type CHECK(regular/trial/makeup) — walk_in 값 없음 →
--      booking_type='regular' 유지, attendance_outcome='walk_in'으로 표기
--      (fn_mark_attendance walk_in 경로와 동일 규약, 스키마 단일 소스)
-- ----------------------------------------------------------------------------
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

    -- booking: 현장 참가 확정 + 워크인 판정 (기존 예약 있으면 워크인으로 승격)
    INSERT INTO public.bookings
        (session_id, member_id, status, attendance_outcome, attendance_marked_at, attendance_marked_by)
    VALUES (p_session_id, p_member_id, 'confirmed', 'walk_in', v_now, v_admin)
    ON CONFLICT (session_id, member_id) DO UPDATE
        SET status = 'confirmed', attendance_outcome = 'walk_in',
            attendance_marked_at = v_now, attendance_marked_by = v_admin,
            cancel_reason = NULL, updated_at = v_now
    RETURNING id INTO v_booking_id;

    -- checkin: 사실 기록 (멱등 — 세션당 1회 부분 유니크)
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

COMMENT ON FUNCTION public.fn_admin_add_walkin(UUID, UUID) IS
    'Admin: 현장 워크인. bookings(walk_in 판정)+checkins(manual) 원자 기록. booking_type은 스키마 CHECK상 regular 유지, 판정은 attendance_outcome=walk_in + audit';


-- ----------------------------------------------------------------------------
-- 6. 권한 — REVOKE anon + GRANT authenticated (신규 5종)
--    (fn_admin_cancel_booking은 미신설 — 기존 fn_cancel_booking_with_credit이
--     admin 분기 포함하여 재사용)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_fn TEXT;
BEGIN
    FOR v_fn IN VALUES
        ('public.fn_admin_create_membership(uuid,uuid,date,uuid)'),
        ('public.fn_admin_adjust_membership(uuid,text,jsonb)'),
        ('public.fn_admin_transfer_membership(uuid,uuid,text)'),
        ('public.fn_admin_book_session(uuid,uuid)'),
        ('public.fn_admin_add_walkin(uuid,uuid)')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_fn);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_fn);
    END LOOP;
END $$;

-- ============================================================================
-- 20260708040000_admin_membership_booking_rpc.sql 끝
-- ============================================================================
