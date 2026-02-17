-- =============================================
-- Migration: Fix RLS security issues
-- lockers, locker_assignments, notification_rules의
-- 너무 관대한 RLS 정책을 Admin 전용으로 강화
-- member_notes의 user_metadata 참조 보안 수정
-- =============================================

-- ─── 1. lockers 테이블 ───────────────────────
DROP POLICY IF EXISTS "Allow admin to manage lockers" ON public.lockers;
CREATE POLICY "Allow admin manage lockers" ON public.lockers
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 2. locker_assignments 테이블 ─────────────
DROP POLICY IF EXISTS "Allow admin to manage locker_assignments" ON public.locker_assignments;
CREATE POLICY "Allow admin manage locker_assignments" ON public.locker_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 3. notification_rules 테이블 ─────────────
DROP POLICY IF EXISTS "Admins can manage notification rules" ON public.notification_rules;
CREATE POLICY "Allow admin manage notification_rules" ON public.notification_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 4. member_notes: user_metadata 참조 수정 ──
DROP POLICY IF EXISTS "Admins and coaches can manage member notes" ON public.member_notes;
CREATE POLICY "Allow admin manage member_notes" ON public.member_notes
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
  );
