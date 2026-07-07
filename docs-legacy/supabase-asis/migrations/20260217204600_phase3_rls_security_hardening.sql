-- Phase 3: RLS 보안 강화 + Function search_path 고정 + FK 인덱스 + InitPlan 최적화
-- Generated: 2026-02-17T22:40:00+09:00

-- Helper functions with search_path fixed
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'); $$;

CREATE OR REPLACE FUNCTION public.is_admin_or_coach()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coach')); $$;

-- See migrations:
-- 20260217_phase3_rls_security_hardening (RLS hardening)
-- 20260217_phase3_fix_function_search_path (function fixes)
-- 20260217_phase3_add_fk_indexes (performance indexes)
-- 20260217_phase3_optimize_rls_initplan (RLS optimization)
