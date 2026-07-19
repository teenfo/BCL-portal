-- ============================================
-- BCL Portal - Auth Integration & Seed Data
-- Migration: 003_auth_integration_seed
-- Description: Auth 유저 자동 프로필 생성 + 초기 시드 데이터
-- Author: BCL Portal Team (Architect - Opus 4.6)
-- Date: 2026-02-17
-- Version: 1.0.0
-- ============================================

BEGIN;

-- ============================================
-- 1. Auth User Profile Creation Trigger
-- ============================================

-- 신규 Auth 유저 생성 시 자동으로 프로필 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- 메타데이터에서 역할 추출 (기본값: member)
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');
    
    -- 역할에 따라 적절한 프로필 생성
    IF user_role = 'admin' OR user_role = 'member' THEN
        -- Members 테이블에 추가
        INSERT INTO public.members (user_id, name, email, status)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
            NEW.email,
            'active'
        );
    ELSIF user_role = 'coach' THEN
        --  Coaches 테이블에 추가
        INSERT INTO public.coaches (user_id, name, email, status)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
            NEW.email,
            'active'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Auth 유저 생성 시 자동으로 members 또는 coaches 테이블에 프로필 생성';

-- 트리거 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. Seed Data - Facilities (지점)
-- ============================================

INSERT INTO public.facilities (id, name, address, phone, operating_hours)
VALUES
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'BCL 강남점',
        '서울특별시 강남구 테헤란로 123',
        '02-1234-5678',
        '{
            "monday": {"open": "06:00", "close": "23:00"},
            "tuesday": {"open": "06:00", "close": "23:00"},
            "wednesday": {"open": "06:00", "close": "23:00"},
            "thursday": {"open": "06:00", "close": "23:00"},
            "friday": {"open": "06:00", "close": "23:00"},
            "saturday": {"open": "08:00", "close": "20:00"},
            "sunday": {"open": "08:00", "close": "20:00"}
        }'::jsonb
    ),
    (
        '00000000-0000-0000-0000-000000000002'::uuid,
        'BCL 홍대점',
        '서울특별시 마포구 홍익로 456',
        '02-2345-6789',
        '{
            "monday": {"open": "06:00", "close": "23:00"},
            "tuesday": {"open": "06:00", "close": "23:00"},
            "wednesday": {"open": "06:00", "close": "23:00"},
            "thursday": {"open": "06:00", "close": "23:00"},
            "friday": {"open": "06:00", "close": "23:00"},
            "saturday": {"open": "08:00", "close": "20:00"},
            "sunday": {"open": "08:00", "close": "20:00"}
        }'::jsonb
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. Seed Data - Membership Plans (요금제)
-- ============================================

INSERT INTO public.membership_plans (id, name, type, duration_days, credit_count, price, description, is_active)
VALUES
    (
        '00000000-0000-0000-0001-000000000001'::uuid,
        '1개월 무제한',
        'period',
        30,
        NULL,
        150000.00,
        '1개월 동안 무제한으로 수업에 참여할 수 있는 플랜입니다.',
        true
    ),
    (
        '00000000-0000-0000-0001-000000000002'::uuid,
        '3개월 무제한',
        'period',
        90,
        NULL,
        400000.00,
        '3개월 동안 무제한으로 수업에 참여할 수 있는 플랜입니다. (월 133,333원)',
        true
    ),
    (
        '00000000-0000-0000-0001-000000000003'::uuid,
        '10회 이용권',
        'count',
        NULL,
        10,
        120000.00,
        '10회 수업 참여 가능한 횟수제 이용권입니다. (회당 12,000원)',
        true
    ),
    (
        '00000000-0000-0000-0001-000000000004'::uuid,
        '20회 이용권',
        'count',
        NULL,
        20,
        220000.00,
        '20회 수업 참여 가능한 횟수제 이용권입니다. (회당 11,000원)',
        true
    ),
    (
        '00000000-0000-0000-0001-000000000005'::uuid,
        '1일 체험권',
        'count',
        NULL,
        1,
        20000.00,
        '1회 체험 수업 참여 가능한 플랜입니다.',
        true
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. Seed Data - Sample Notices (공지사항)
-- ============================================

INSERT INTO public.notices (facility_id, title, content, category, is_pinned, published_at)
VALUES
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        '[중요] BCL 강남점 오픈 안내',
        'BCL 강남점이 2026년 2월 17일 성공적으로 오픈했습니다! 많은 관심과 참여 부탁드립니다.',
        'event',
        true,
        NOW()
    ),
    (
        '00000000-0000-0000-0000-000000000002'::uuid,
        '[안내] 설 연휴 휴무 안내',
        '2월 15일(토) ~ 2월 18일(화)까지 설 연휴로 휴무합니다.',
        'general',
        false,
        NOW()
    )
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================
-- Test Data (주석 처리 - 필요시 실행)
-- ============================================
/*
-- 테스트 계정들은 Supabase Dashboard에서 수동 생성 필요:
-- 1. Admin: admin@bcl.com (metadata: {"role": "admin", "name": "관리자"})
-- 2. Coach: coach@bcl.com (metadata: {"role": "coach", "name": "김코치"})
-- 3. Member: member@bcl.com (metadata: {"role": "member", "name": "홍길동"})

-- 테스트 계정 생성 후 자동으로 members/coaches 테이블에 프로필이 생성됩니다.
*/

-- ============================================
-- Rollback Script  (주석 처리)
-- ============================================
/*
BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Delete seed data (주의: 데이터 손실)
DELETE FROM public.notices WHERE facility_id IN (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid
);

DELETE FROM public.membership_plans WHERE id IN (
    '00000000-0000-0000-0001-000000000001'::uuid,
    '00000000-0000-0000-0001-000000000002'::uuid,
    '00000000-0000-0000-0001-000000000003'::uuid,
    '00000000-0000-0000-0001-000000000004'::uuid,
    '00000000-0000-0000-0001-000000000005'::uuid
);

DELETE FROM public.facilities WHERE id IN (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid
);

COMMIT;
*/
