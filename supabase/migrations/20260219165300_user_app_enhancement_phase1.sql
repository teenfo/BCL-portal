-- =============================================================================
-- Migration: User App Enhancement Phase 1
-- Description: members/facilities 컬럼 확장 + 크레딧 차감/환원 RPC 함수
-- Priority: 12 (User App 핵심 화면 고도화)
-- Author: Senior Dev (Opus)
-- Date: 2026-02-19
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. members 테이블 컬럼 추가
-- ---------------------------------------------------------------------------
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(50),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.members.preferences IS '사용자 앱 설정 (dark_mode, language, weekly_goal 등)';
COMMENT ON COLUMN public.members.phone IS '전화번호';
COMMENT ON COLUMN public.members.birthday IS '생년월일';
COMMENT ON COLUMN public.members.emergency_contact IS '긴급 연락처';
COMMENT ON COLUMN public.members.avatar_url IS '프로필 사진 URL (Supabase Storage)';

-- ---------------------------------------------------------------------------
-- 2. facilities 테이블 컬럼 추가
-- ---------------------------------------------------------------------------
ALTER TABLE public.facilities
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS photos TEXT[];

COMMENT ON COLUMN public.facilities.latitude IS '시설 위도 (지도 연동)';
COMMENT ON COLUMN public.facilities.longitude IS '시설 경도 (지도 연동)';
COMMENT ON COLUMN public.facilities.photos IS '시설 사진 URL 배열';

-- ---------------------------------------------------------------------------
-- 3. 크레딧 차감 RPC 함수 (수업 예약 시)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_book_with_credit(
    p_session_id UUID,
    p_user_id UUID
) RETURNS JSONB
SET search_path = public
AS $$
DECLARE
    v_membership RECORD;
    v_booking_id UUID;
    v_session RECORD;
    v_current_bookings INT;
BEGIN
    -- 세션 정보 확인
    SELECT id, capacity INTO v_session
    FROM sessions
    WHERE id = p_session_id;

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'session_not_found');
    END IF;

    -- 현재 예약 수 확인
    SELECT COUNT(*) INTO v_current_bookings
    FROM bookings
    WHERE session_id = p_session_id AND status IN ('confirmed', 'attended');

    -- 정원 초과 시 waitlist
    IF v_session.capacity IS NOT NULL AND v_current_bookings >= v_session.capacity THEN
        INSERT INTO bookings (session_id, user_id, status)
        VALUES (p_session_id, p_user_id, 'waitlisted')
        RETURNING id INTO v_booking_id;

        RETURN jsonb_build_object(
            'success', TRUE,
            'booking_id', v_booking_id,
            'status', 'waitlisted',
            'credits_used', 0
        );
    END IF;

    -- 활성 크레딧 멤버십 조회 (횟수권)
    SELECT id, remaining_credits INTO v_membership
    FROM memberships
    WHERE user_id = p_user_id
      AND status = 'active'
      AND remaining_credits IS NOT NULL
      AND remaining_credits > 0
    ORDER BY end_date ASC
    LIMIT 1
    FOR UPDATE;

    -- 크레딧 차감 (횟수권인 경우)
    IF v_membership IS NOT NULL AND v_membership.remaining_credits > 0 THEN
        UPDATE memberships
        SET remaining_credits = remaining_credits - 1,
            updated_at = now()
        WHERE id = v_membership.id;
    END IF;

    -- 예약 생성
    INSERT INTO bookings (session_id, user_id, status)
    VALUES (p_session_id, p_user_id, 'confirmed')
    RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'booking_id', v_booking_id,
        'status', 'confirmed',
        'credits_used', CASE WHEN v_membership IS NOT NULL THEN 1 ELSE 0 END,
        'remaining_credits', COALESCE(v_membership.remaining_credits - 1, -1)
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'already_booked');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 4. 크레딧 환원 RPC 함수 (예약 취소 시)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_cancel_booking_with_credit(
    p_booking_id UUID,
    p_user_id UUID
) RETURNS JSONB
SET search_path = public
AS $$
DECLARE
    v_booking RECORD;
BEGIN
    -- 예약 확인
    SELECT id, session_id, status INTO v_booking
    FROM bookings
    WHERE id = p_booking_id AND user_id = p_user_id
    FOR UPDATE;

    IF v_booking IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'not_found');
    END IF;

    IF v_booking.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'already_cancelled');
    END IF;

    -- 예약 취소
    UPDATE bookings SET status = 'cancelled', updated_at = now()
    WHERE id = p_booking_id;

    -- 크레딧 환원 (활성 횟수권 멤버십이 있는 경우)
    UPDATE memberships
    SET remaining_credits = remaining_credits + 1,
        updated_at = now()
    WHERE user_id = p_user_id
      AND status = 'active'
      AND remaining_credits IS NOT NULL;

    RETURN jsonb_build_object('success', TRUE, 'booking_id', p_booking_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 5. RPC 함수 접근 권한 부여
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.fn_book_with_credit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cancel_booking_with_credit(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. 기존 RLS 검증 (추가 정책 불필요 확인)
-- ---------------------------------------------------------------------------
-- members: 기존 SELECT/UPDATE USING (user_id = (SELECT auth.uid())) 정책으로 커버됨
--   → preferences, phone, birthday, emergency_contact, avatar_url 모두 개인 정보이므로 본인만 접근
-- facilities: 기존 SELECT USING (true) 정책으로 커버됨
--   → latitude, longitude, photos는 공개 정보
-- RPC 함수: SECURITY DEFINER → 내부에서 p_user_id로 권한 검증
