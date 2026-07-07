-- ============================================
-- BCL Portal - Database Reset Script
-- Description: 모든 테이블, 함수, 트리거 삭제
-- Date: 2026-02-16
-- ⚠️ 주의: 이 스크립트는 모든 데이터를 삭제합니다!
-- ============================================

BEGIN;

-- ============================================
-- 1. 트리거 삭제
-- ============================================

DROP TRIGGER IF EXISTS update_facilities_updated_at ON public.facilities;
DROP TRIGGER IF EXISTS update_members_updated_at ON public.members;
DROP TRIGGER IF EXISTS update_membership_plans_updated_at ON public.membership_plans;
DROP TRIGGER IF EXISTS update_memberships_updated_at ON public.memberships;
DROP TRIGGER IF EXISTS update_coaches_updated_at ON public.coaches;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.sessions;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
DROP TRIGGER IF EXISTS update_notices_updated_at ON public.notices;
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;

-- ============================================
-- 2. 함수 삭제
-- ============================================

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_coach() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;

-- ============================================
-- 3. 테이블 삭제 (역순으로 외래 키 제약 조건 고려)
-- ============================================

DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.notices CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.checkins CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.session_coaches CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.coaches CASCADE;
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.membership_plans CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;
DROP TABLE IF EXISTS public.facilities CASCADE;

-- 추가 테이블 (있을 경우)
DROP TABLE IF EXISTS public.session_feedback CASCADE;

-- ============================================
-- 4. 확장 기능 유지 (UUID 생성용)
-- ============================================

-- uuid-ossp와 pgcrypto는 유지
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

COMMIT;

-- ============================================
-- 완료
-- ============================================

-- 다음 단계:
-- 1. 이 스크립트를 Supabase Dashboard → SQL Editor에서 실행
-- 2. .docs/database/schema/001_initial_schema.sql 실행하여 새 스키마 생성
