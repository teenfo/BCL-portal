-- =================================================================
-- Migration: fix_anon_rls_members_coaches_wods
-- Purpose: 감사 지적 4.1/4.2/4.3 — anon key로 회원/코치/WOD 개인정보 노출 차단
-- Date: 2026-04-26
-- Related: .docs/archive/audit/audit-database-remote-comparison-20260426.md §4
-- =================================================================

-- 1. members: "Enable read access for all" (roles={public}) → authenticated only
DROP POLICY IF EXISTS "Enable read access for all" ON public.members;
CREATE POLICY "authenticated_read_members" ON public.members
    FOR SELECT TO authenticated USING (TRUE);

-- 2. coaches: "anon_read_coaches" (roles={anon}) → 삭제 (authenticated_read_coaches 유지)
DROP POLICY IF EXISTS "anon_read_coaches" ON public.coaches;

-- 3. wods: "public_read_wods" (roles={public}) → authenticated only
DROP POLICY IF EXISTS "public_read_wods" ON public.wods;
CREATE POLICY "authenticated_read_wods" ON public.wods
    FOR SELECT TO authenticated USING (TRUE);
