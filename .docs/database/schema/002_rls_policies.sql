-- ============================================
-- BCL Portal - RLS Policies Migration
-- Migration: 002_rls_policies
-- Description: RLS 정책 및 헬퍼 함수 생성
-- Author: BCL Portal Team (Architect - Opus 4.6)
-- Date: 2026-02-17
-- Version: 1.0.0
-- ============================================

BEGIN;

-- ============================================
-- 1. Helper Functions for Role Checking
-- ============================================

-- 현재 사용자의 역할 확인
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT raw_user_meta_data->>'role'
        FROM auth.users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_role() IS '현재 사용자의 역할 반환';

-- Admin 여부 확인
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (SELECT raw_user_meta_data->>'role' = 'admin' FROM auth.users WHERE id = auth.uid()),
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_admin() IS '현재 사용자가 Admin인지 확인';

-- Coach 여부 확인
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (SELECT raw_user_meta_data->>'role' = 'coach' FROM auth.users WHERE id = auth.uid()),
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_coach() IS '현재 사용자가 Coach인지 확인';

-- ============================================
-- 2. Facilities (지점) RLS Policies
-- ============================================

-- SELECT: 모든 인증된 사용자
CREATE POLICY "Authenticated users can view facilities"
    ON public.facilities
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT/UPDATE/DELETE: Admin만
CREATE POLICY "Admins can manage facilities"
    ON public.facilities
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================
-- 3. Members (회원) RLS Policies
-- ============================================

-- SELECT: 본인, Admin, 담당 Coach
CREATE POLICY "Members can view own profile"
    ON public.members
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all members"
    ON public.members
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Coaches can view session members"
    ON public.members
    FOR SELECT
    TO authenticated
    USING (
        public.is_coach() AND
        id IN (
            SELECT DISTINCT b.member_id
            FROM bookings b
            JOIN sessions s ON b.session_id = s.id
            JOIN session_coaches sc ON s.id = sc.session_id
            JOIN coaches c ON sc.coach_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

-- INSERT: Admin만
CREATE POLICY "Admins can create members"
    ON public.members
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- UPDATE: 본인 (status 제외), Admin (전체)
CREATE POLICY "Members can update own profile"
    ON public.members
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid() AND
        status = (SELECT status FROM members WHERE id = members.id)
    );

CREATE POLICY "Admins can update all members"
    ON public.members
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());

-- DELETE: Admin만
CREATE POLICY "Admins can delete members"
    ON public.members
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================
-- 4. Membership Plans (요금제) RLS Policies
-- ============================================

-- SELECT: 모든 인증된 사용자
CREATE POLICY "Authenticated users can view plans"
    ON public.membership_plans
    FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

-- INSERT/UPDATE/DELETE: Admin만
CREATE POLICY "Admins can manage plans"
    ON public.membership_plans
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================
-- 5. Memberships (회원권) RLS Policies
-- ============================================

-- SELECT: 본인, Admin, 담당 Coach
CREATE POLICY "Members can view own memberships"
    ON public.memberships
    FOR SELECT
    TO authenticated
    USING (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all memberships"
    ON public.memberships
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Coaches can view session member memberships"
    ON public.memberships
    FOR SELECT
    TO authenticated
    USING (
        public.is_coach() AND
        member_id IN (
            SELECT DISTINCT b.member_id
            FROM bookings b
            JOIN sessions s ON b.session_id = s.id
            JOIN session_coaches sc ON s.id = sc.session_id
            JOIN coaches c ON sc.coach_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

-- INSERT/UPDATE: Admin만
CREATE POLICY "Admins can manage memberships"
    ON public.memberships
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================
-- 6. Coaches (코치) RLS Policies
-- ============================================

-- SELECT: 모든 인증된 사용자 (공개 정보)
CREATE POLICY "Authenticated users can view coaches"
    ON public.coaches
    FOR SELECT
    TO authenticated
    USING (status = 'active' OR public.is_admin());

-- INSERT/UPDATE/DELETE: Admin만
CREATE POLICY "Admins can manage coaches"
    ON public.coaches
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- UPDATE: 본인 Coach (bio, profile_image만)
CREATE POLICY "Coaches can update own profile"
    ON public.coaches
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid() AND
        name = (SELECT name FROM coaches WHERE id = coaches.id) AND
        email = (SELECT email FROM coaches WHERE id = coaches.id) AND
        status = (SELECT status FROM coaches WHERE id = coaches.id)
    );

-- ============================================
-- 7. Sessions (수업) RLS Policies
-- ============================================

-- SELECT: 모든 인증된 사용자
CREATE POLICY "Authenticated users can view sessions"
    ON public.sessions
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Admin만
CREATE POLICY "Admins can create sessions"
    ON public.sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- UPDATE: Admin 전체, 담당 Coach (제한적)
CREATE POLICY "Admins can update sessions"
    ON public.sessions
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Coaches can update own sessions"
    ON public.sessions
    FOR UPDATE
    TO authenticated
    USING (
        public.is_coach() AND
        id IN (
            SELECT sc.session_id
            FROM session_coaches sc
            JOIN coaches c ON sc.coach_id = c.id
            WHERE c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- WOD 설명, status만 수정 가능
        session_date = (SELECT session_date FROM sessions WHERE id = sessions.id) AND
        start_time = (SELECT start_time FROM sessions WHERE id = sessions.id) AND
        capacity = (SELECT capacity FROM sessions WHERE id = sessions.id)
    );

-- DELETE: Admin만
CREATE POLICY "Admins can delete sessions"
    ON public.sessions
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================
-- 8. Session Coaches (수업-코치 매핑) RLS Policies
-- ============================================

-- SELECT: 모든 인증된 사용자
CREATE POLICY "Authenticated users can view session coaches"
    ON public.session_coaches
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT/UPDATE/DELETE: Admin만
CREATE POLICY "Admins can manage session coaches"
    ON public.session_coaches
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================
-- 9. Bookings (예약) RLS Policies
-- ============================================

-- SELECT: 본인, Admin, 담당 Coach
CREATE POLICY "Members can view own bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Coaches can view session bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (
        public.is_coach() AND
        session_id IN (
            SELECT sc.session_id
            FROM session_coaches sc
            JOIN coaches c ON sc.coach_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

-- INSERT: 본인, Admin
CREATE POLICY "Members can create own bookings"
    ON public.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can create any booking"
    ON public.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- UPDATE: 본인 (cancel only), Admin
CREATE POLICY "Members can cancel own bookings"
    ON public.bookings
    FOR UPDATE
    TO authenticated
    USING (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (status IN ('cancelled', 'waitlist'));

CREATE POLICY "Admins can update all bookings"
    ON public.bookings
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());

-- DELETE: Admin만
CREATE POLICY "Admins can delete bookings"
    ON public.bookings
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================
-- 10. Check-ins (체크인) RLS Policies
-- ============================================

-- SELECT: 본인, Admin, 담당 Coach
CREATE POLICY "Members can view own checkins"
    ON public.checkins
    FOR SELECT
    TO authenticated
    USING (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all checkins"
    ON public.checkins
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Coaches can view session checkins"
    ON public.checkins
    FOR SELECT
    TO authenticated
    USING (
        public.is_coach() AND
        session_id IN (
            SELECT sc.session_id
            FROM session_coaches sc
            JOIN coaches c ON sc.coach_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

-- INSERT: 본인, Admin, 담당 Coach
CREATE POLICY "Members can create own checkins"
    ON public.checkins
    FOR INSERT
    TO authenticated
    WITH CHECK (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can create any checkin"
    ON public.checkins
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Coaches can create session checkins"
    ON public.checkins
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_coach() AND
        session_id IN (
            SELECT sc.session_id
            FROM session_coaches sc
            JOIN coaches c ON sc.coach_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

-- UPDATE/DELETE: Admin만
CREATE POLICY "Admins can manage checkins"
    ON public.checkins
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can delete checkins"
    ON public.checkins
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================
-- 11. Transactions (거래) RLS Policies
-- ============================================

-- SELECT: 본인, Admin
CREATE POLICY "Members can view own transactions"
    ON public.transactions
    FOR SELECT
    TO authenticated
    USING (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all transactions"
    ON public.transactions
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- INSERT/UPDATE/DELETE: Admin만
CREATE POLICY "Admins can manage transactions"
    ON public.transactions
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================
-- 12. Notices (공지사항) RLS Policies
-- ============================================

-- SELECT: 모든 인증된 사용자 (published만), Admin (전체)
CREATE POLICY "Authenticated users can view published notices"
    ON public.notices
    FOR SELECT
    TO authenticated
    USING (
        (published_at IS NOT NULL AND published_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW()))
        OR public.is_admin()
    );

-- INSERT/UPDATE/DELETE: Admin만
CREATE POLICY "Admins can manage notices"
    ON public.notices
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================
-- 13. Notifications (알림) RLS Policies
-- ============================================

-- SELECT: 본인, Admin
CREATE POLICY "Users can view own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- INSERT: Admin (시스템 알림)
CREATE POLICY "Admins can create notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- UPDATE: 본인 (is_read만), Admin
CREATE POLICY "Users can mark own notifications as read"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid() AND
        title = (SELECT title FROM notifications WHERE id = notifications.id) AND
        message = (SELECT message FROM notifications WHERE id = notifications.id)
    );

CREATE POLICY "Admins can update all notifications"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());

-- DELETE: Admin만
CREATE POLICY "Admins can delete notifications"
    ON public.notifications
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================
-- 14. Support Tickets (고객 문의) RLS Policies
-- ============================================

-- SELECT: 본인, Admin
CREATE POLICY "Members can view own tickets"
    ON public.support_tickets
    FOR SELECT
    TO authenticated
    USING (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all tickets"
    ON public.support_tickets
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- INSERT: 본인, Admin
CREATE POLICY "Members can create own tickets"
    ON public.support_tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        member_id IN (
            SELECT id FROM members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can create any ticket"
    ON public.support_tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- UPDATE: Admin만 (티켓 처리)
CREATE POLICY "Admins can update tickets"
    ON public.support_tickets
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());

-- DELETE: Admin만
CREATE POLICY "Admins can delete tickets"
    ON public.support_tickets
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

COMMIT;

-- ============================================
-- Rollback Script (주석 처리)
-- ============================================
/*
BEGIN;

-- Drop all policies
DROP POLICY IF EXISTS "Authenticated users can view facilities" ON public.facilities;
DROP POLICY IF EXISTS "Admins can manage facilities" ON public.facilities;

DROP POLICY IF EXISTS "Members can view own profile" ON public.members;
DROP POLICY IF EXISTS "Admins can view all members" ON public.members;
DROP POLICY IF EXISTS "Coaches can view session members" ON public.members;
DROP POLICY IF EXISTS "Admins can create members" ON public.members;
DROP POLICY IF EXISTS "Members can update own profile" ON public.members;
DROP POLICY IF EXISTS "Admins can update all members" ON public.members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.members;

-- [... 나머지 정책 DROP 명령어 생략]

-- Drop helper functions
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_coach();

COMMIT;
*/
