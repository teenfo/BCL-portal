-- ============================================================================
-- BCL Portal — 20260709090000_kiosk_provisioning.sql
-- 키오스크 갭 봉합 (docs/06-kiosk §1 기기 프로비저닝 · §4.6 게스트/드롭인 G-7)
-- ----------------------------------------------------------------------------
-- 공통 규약 (계약 §3 / CLAUDE.md 데이터 규칙):
--   - 신규 RPC = SECURITY DEFINER + SET search_path=public
--   - 내부 is_admin() 게이트(클라이언트가 actor/facility 식별자로 권한 우회 불가)
--   - envelope 1종: {success boolean, data jsonb|null, error text|null}
--   - anon 화이트리스트는 좁은 DEFINER RPC로만 — 테이블 anon GRANT 없음
--   - 신규 테이블 RLS 필수, DELETE = admin 전용
-- 범위: kiosk 전용. 기존 fn_kiosk_checkin(phase3) 은 수정하지 않는다(전진 규칙).
--
-- [1] 기기 프로비저닝
--   as-is: 단말이 device_id/facility_id UUID 를 수동 입력해 localStorage 보관
--          (누구나 임의 facility UUID 로 단말을 사칭 가능 — 프로비저닝 부재).
--   to-be: Admin 이 단말별 등록 토큰 발급 → 단말은 토큰만 보관 →
--          fn_kiosk_provision(token) 이 device_id/facility_id 를 서버에서 해석.
--   · kiosk_devices.device_token (단말당 1개, 재발급 시 회전)
--   · fn_admin_issue_kiosk_token(device_id)  — is_admin, 토큰 발급/회전(1회 표시)
--   · fn_kiosk_provision(token)              — anon, 토큰→단말 좁은 컬럼 해석
--
-- [2] 게스트/드롭인 체크인 (G-7, §4.6)
--   폰(앱 세션) 없는 드롭인·체험 게스트용 6자리 1회용 코드 경로.
--   · guest_checkin_codes                    — 발권 코드(당일 만료, 1회 소멸)
--   · fn_admin_issue_guest_code(payload)     — is_admin, 데스크 발권(코드 1회 표시)
--   · fn_kiosk_guest_checkin(code, dev, at)  — anon, 코드 상환 → 체크인 파이프라인
--                                              (fn_kiosk_checkin 과 동일 판정·크레딧 차감)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- [1a] kiosk_devices 프로비저닝 컬럼
--   device_token: 단말 등록 토큰(고엔트로피, gen_random_uuid 2개 결합 = 244bit).
--     ※ 좁은 anon RPC 로만 교환되며 노출 데이터는 device_id/facility_id 뿐(저권한 capability).
--        해시 저장(at-rest)은 후속 하드닝 여지 — pgcrypto 스키마 의존 회피 위해 평문 UNIQUE 보관. FLAG.
-- ----------------------------------------------------------------------------
ALTER TABLE public.kiosk_devices
    ADD COLUMN IF NOT EXISTS device_token    TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS token_issued_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS provisioned_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.kiosk_devices.device_token IS
'Admin 발급 단말 등록 토큰(회전 가능). fn_kiosk_provision 이 이 값으로 device_id/facility 해석. anon 테이블 GRANT 없음';


-- ----------------------------------------------------------------------------
-- [2a] guest_checkin_codes — 게스트 발권 코드 (docs/06 §4.6 G-7)
--   6자리 1회용 코드. 당일 만료, 사용 즉시 status=consumed(재사용 거부).
--   code 평문 보관: 6자리(≈20bit)라 해시 무의미 — 방어는 짧은 만료+단회성+facility 스코프.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guest_checkin_codes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                TEXT NOT NULL UNIQUE,
    member_id           UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    membership_id       UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
    facility_id         UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
    status              TEXT NOT NULL DEFAULT 'issued'
                        CHECK (status IN ('issued','consumed','expired')),
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ,
    consumed_checkin_id UUID REFERENCES public.checkins(id) ON DELETE SET NULL,
    created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_codes_member ON public.guest_checkin_codes(member_id);
CREATE INDEX IF NOT EXISTS idx_guest_codes_open   ON public.guest_checkin_codes(status, expires_at);

COMMENT ON TABLE public.guest_checkin_codes IS
'G-7: 게스트(드롭인·체험) 6자리 1회용 체크인 코드. 당일 만료·단회 소멸. anon 접근은 fn_kiosk_guest_checkin DEFINER 로만';

ALTER TABLE public.guest_checkin_codes ENABLE ROW LEVEL SECURITY;

-- admin 전용 관리(발권 이력 열람/정리). anon/회원은 RPC 경유만 — 테이블 직접 접근 불가.
DROP POLICY IF EXISTS "guest_checkin_codes admin only" ON public.guest_checkin_codes;
CREATE POLICY "guest_checkin_codes admin only" ON public.guest_checkin_codes
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- [1b] fn_admin_issue_kiosk_token — 단말 등록 토큰 발급/회전 (admin 전용)
--   반환 data.token 은 발급 시 1회만 노출(단말에 입력). 재호출 = 회전(기존 토큰 무효).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_admin_issue_kiosk_token(p_device_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_dev   public.kiosk_devices;
    v_token TEXT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    SELECT * INTO v_dev FROM public.kiosk_devices WHERE id = p_device_id;
    IF v_dev.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'device_not_found');
    END IF;

    -- 고엔트로피 토큰(gen_random_uuid 2개 결합, 하이픈 제거 = 64 hex)
    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

    UPDATE public.kiosk_devices
    SET device_token = v_token, token_issued_at = now(), updated_at = now()
    WHERE id = p_device_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), 'ISSUE_KIOSK_TOKEN', 'kiosk_devices', p_device_id,
            jsonb_build_object('token_issued_at', now()));  -- 토큰 평문은 감사로그에 남기지 않음

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'device_id',   v_dev.id,
            'device_name', v_dev.device_name,
            'facility_id', v_dev.facility_id,
            'token',       v_token),   -- 1회 노출
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_admin_issue_kiosk_token(uuid) IS
'단말 등록 토큰 발급/회전(admin 전용). data.token 1회 노출 — 단말이 fn_kiosk_provision 으로 교환. audit_logs.';


-- ----------------------------------------------------------------------------
-- [1c] fn_kiosk_provision — 토큰 → 단말 해석 (ANON)
--   좁은 컬럼(device_id/facility_id/device_name)만 반환. 실패 시 명시적 error(무한 스피너 금지).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_kiosk_provision(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_dev public.kiosk_devices;
BEGIN
    IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_token');
    END IF;

    SELECT * INTO v_dev FROM public.kiosk_devices WHERE device_token = trim(p_token);
    IF v_dev.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_token');
    END IF;
    IF v_dev.status = 'maintenance' THEN
        -- 점검 상태 단말도 프로비저닝은 허용하되 셸이 점검 오버레이를 띄우도록 신호
        NULL;
    END IF;

    UPDATE public.kiosk_devices
    SET provisioned_at = now(), last_heartbeat = now(), updated_at = now()
    WHERE id = v_dev.id;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'device_id',   v_dev.id,
            'facility_id', v_dev.facility_id,
            'device_name', v_dev.device_name,
            'status',      v_dev.status),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_kiosk_provision(text) IS
'ANON 키오스크 프로비저닝: 등록 토큰 → device_id/facility_id/device_name 좁은 해석. 테이블 anon GRANT 없이 DEFINER.';


-- ----------------------------------------------------------------------------
-- [2b] fn_admin_issue_guest_code — 게스트 드롭인 코드 발권 (admin 전용, §4.6 ①②)
--   payload: {member_id(필수), membership_id?, facility_id?, expires_at?}
--   membership_id 미지정 시 상환 시점에 member 의 활성 드롭인/체험 멤버십을 사용.
--   반환 data.code 는 발권 시 1회 노출(문자/출력).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_admin_issue_guest_code(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_membership_id UUID;
    v_facility_id UUID;
    v_expires TIMESTAMPTZ;
    v_member RECORD;
    v_code TEXT;
    v_id UUID;
    v_try INT := 0;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    v_member_id     := NULLIF(p_payload->>'member_id', '')::uuid;
    v_membership_id := NULLIF(p_payload->>'membership_id', '')::uuid;
    v_facility_id   := NULLIF(p_payload->>'facility_id', '')::uuid;
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_required');
    END IF;

    SELECT id, name, facility_id, status INTO v_member
    FROM public.members WHERE id = v_member_id;
    IF v_member.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;

    v_facility_id := COALESCE(v_facility_id, v_member.facility_id);
    -- 당일 만료 기본(발권일 자정) — payload 로 연장 가능(시설 정책)
    v_expires := COALESCE(
        NULLIF(p_payload->>'expires_at', '')::timestamptz,
        (date_trunc('day', now()) + INTERVAL '1 day' - INTERVAL '1 second'));

    -- 6자리 코드 생성 + 활성 유일성 확보(재시도)
    LOOP
        v_try := v_try + 1;
        v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
        BEGIN
            INSERT INTO public.guest_checkin_codes
                (code, member_id, membership_id, facility_id, status, expires_at, created_by)
            VALUES (v_code, v_member_id, v_membership_id, v_facility_id, 'issued', v_expires, auth.uid())
            RETURNING id INTO v_id;
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            IF v_try >= 8 THEN
                RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'code_generation_failed');
            END IF;
        END;
    END LOOP;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), 'ISSUE_GUEST_CODE', 'guest_checkin_codes', v_id,
            jsonb_build_object('member_id', v_member_id, 'facility_id', v_facility_id, 'expires_at', v_expires));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'id', v_id, 'code', v_code, 'member_name', v_member.name, 'expires_at', v_expires),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_admin_issue_guest_code(jsonb) IS
'G-7 게스트 드롭인 코드 발권(admin/데스크). 6자리 1회용·당일 만료. data.code 1회 노출. audit_logs.';


-- ----------------------------------------------------------------------------
-- [2c] fn_kiosk_guest_checkin — 게스트 코드 상환 체크인 (ANON, §4.6 ③)
--   fn_kiosk_checkin 과 동일 판정: 회원 유효 → ±30분 예약 감지 → 멤버십 유효+크레딧 차감 → 기록.
--   코드는 단일 트랜잭션에서 consumed 로 소멸(부분실패 금지). 응답 envelope = fn_kiosk_checkin data + guest:true.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_kiosk_guest_checkin(
    p_code TEXT,
    p_device_id UUID DEFAULT NULL,
    p_scanned_at TIMESTAMPTZ DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_code RECORD;
    v_scan TIMESTAMPTZ := COALESCE(p_scanned_at, now());
    v_member RECORD;
    v_facility_id UUID;
    v_dev_facility UUID;
    v_booking RECORD;
    v_mem RECORD;
    v_checkin_id UUID;
    v_remaining INT;
    v_dday INT;
BEGIN
    IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_code');
    END IF;

    -- 1) 코드 조회 + 잠금(동시 상환 경합 차단)
    SELECT * INTO v_code
    FROM public.guest_checkin_codes
    WHERE code = trim(p_code) AND status = 'issued'
    FOR UPDATE;
    IF v_code.id IS NULL THEN
        -- 존재하지 않거나 이미 소멸/만료 — 사유 비노출(재사용·오타 공통)
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_code');
    END IF;

    -- 2) 만료 검증(당일 유효)
    IF v_code.expires_at < v_scan THEN
        UPDATE public.guest_checkin_codes SET status = 'expired' WHERE id = v_code.id;
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'code_expired');
    END IF;

    -- 3) 회원 유효성
    SELECT id, name, status, is_blacklisted INTO v_member
    FROM public.members WHERE id = v_code.member_id;
    IF v_member.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF v_member.status <> 'active' OR v_member.is_blacklisted THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_active');
    END IF;

    -- 4) facility 결정: 단말 배정 facility 우선(코드 facility 와 불일치해도 단말 기준으로 기록)
    v_facility_id := v_code.facility_id;
    IF p_device_id IS NOT NULL THEN
        SELECT facility_id INTO v_dev_facility FROM public.kiosk_devices WHERE id = p_device_id;
        IF v_dev_facility IS NOT NULL THEN
            v_facility_id := v_dev_facility;
        END IF;
    END IF;

    -- 5) ±30분 예약 자동 감지
    SELECT b.id AS booking_id, b.attendance_outcome, b.credit_used,
           s.id AS session_id, s.title
    INTO v_booking
    FROM public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
    WHERE b.member_id = v_code.member_id
      AND b.status = 'confirmed'
      AND s.facility_id = v_facility_id
      AND s.session_date = v_scan::date
      AND (s.session_date + s.start_time) BETWEEN v_scan - INTERVAL '30 minutes'
                                              AND v_scan + INTERVAL '30 minutes'
    ORDER BY (s.session_date + s.start_time)
    LIMIT 1;

    -- 6) 멤버십 유효성 + 크레딧 차감 (코드에 membership 지정 시 우선)
    SELECT ms.id, ms.remaining_credits, ms.end_date, mp.plan_kind, mp.name AS plan_name
    INTO v_mem
    FROM public.memberships ms
    LEFT JOIN public.membership_plans mp ON mp.id = ms.plan_id
    WHERE ms.member_id = v_code.member_id
      AND ms.status = 'active'
      AND ms.start_date <= v_scan::date
      AND (ms.end_date IS NULL OR ms.end_date >= v_scan::date)
      AND (ms.remaining_credits IS NULL OR ms.remaining_credits > 0)
      AND (v_code.membership_id IS NULL OR ms.id = v_code.membership_id)
    ORDER BY (ms.id = v_code.membership_id) DESC NULLS LAST, ms.end_date ASC NULLS LAST
    LIMIT 1
    FOR UPDATE OF ms;

    IF v_mem.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'no_active_membership');
    END IF;

    IF v_booking.booking_id IS NULL AND v_mem.remaining_credits IS NOT NULL THEN
        -- 자유 출입 + 횟수제(드롭인/체험) = 원자 차감
        UPDATE public.memberships
        SET remaining_credits = GREATEST(remaining_credits - 1, 0), updated_at = now()
        WHERE id = v_mem.id;
        v_remaining := v_mem.remaining_credits - 1;
    ELSIF v_booking.booking_id IS NOT NULL THEN
        -- 예약 링크: 예약 시 이미 검증/차감 — 재차감 안 함
        v_remaining := v_mem.remaining_credits;
    ELSE
        v_remaining := NULL;  -- 기간제
    END IF;

    v_dday := CASE WHEN v_mem.end_date IS NOT NULL THEN (v_mem.end_date - v_scan::date) END;

    -- 7) 체크인 기록
    INSERT INTO public.checkins (booking_id, member_id, session_id, facility_id, checkin_method, checkin_time)
    VALUES (v_booking.booking_id, v_code.member_id, v_booking.session_id, v_facility_id, 'kiosk', v_scan)
    ON CONFLICT (session_id, member_id) WHERE session_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_checkin_id;

    -- 8) 출결 연동 pending → checked_in
    IF v_booking.booking_id IS NOT NULL AND v_booking.attendance_outcome = 'pending' THEN
        UPDATE public.bookings
        SET attendance_outcome = 'checked_in', attendance_marked_at = v_scan, updated_at = v_scan
        WHERE id = v_booking.booking_id;
    END IF;

    -- 9) 코드 소멸(단회) — 같은 트랜잭션
    UPDATE public.guest_checkin_codes
    SET status = 'consumed', consumed_at = v_scan, consumed_checkin_id = v_checkin_id
    WHERE id = v_code.id;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'checkin_id', v_checkin_id,
            'duplicated', false,
            'guest', true,
            'member_name', v_member.name,
            'membership_plan_kind', COALESCE(v_mem.plan_kind, 'drop_in'),
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
COMMENT ON FUNCTION public.fn_kiosk_guest_checkin(text,uuid,timestamptz) IS
'ANON 게스트(드롭인/체험) 코드 상환 체크인(G-7). 6자리 코드 1회 소멸 + 크레딧 원자 차감 + 예약감지. envelope=fn_kiosk_checkin data + guest:true.';


-- ----------------------------------------------------------------------------
-- [3] GRANT — anon 화이트리스트 2종 + admin 전용 2종
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    -- admin 전용(anon 회수)
    REVOKE ALL ON FUNCTION public.fn_admin_issue_kiosk_token(uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.fn_admin_issue_kiosk_token(uuid) TO authenticated;
    REVOKE ALL ON FUNCTION public.fn_admin_issue_guest_code(jsonb) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.fn_admin_issue_guest_code(jsonb) TO authenticated;

    -- anon 화이트리스트(키오스크 무인 표면)
    REVOKE ALL ON FUNCTION public.fn_kiosk_provision(text) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_kiosk_provision(text) TO anon, authenticated;
    REVOKE ALL ON FUNCTION public.fn_kiosk_guest_checkin(text,uuid,timestamptz) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_kiosk_guest_checkin(text,uuid,timestamptz) TO anon, authenticated;
END $$;

-- ============================================================================
-- 20260709090000_kiosk_provisioning.sql 끝
-- ============================================================================
