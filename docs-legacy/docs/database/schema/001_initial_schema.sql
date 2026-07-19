-- ============================================
-- BCL Portal - Initial Database Schema
-- Migration: 001_initial_schema
-- Description: 프로젝트 핵심 테이블 및 인덱스 생성
-- Author: BCL Portal Team
-- Date: 2026-02-16
-- Version: 1.0.0
-- ============================================

BEGIN;

-- ============================================
-- 1. Extensions
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2. Core Tables
-- ============================================

-- Facilities (지점)
CREATE TABLE IF NOT EXISTS public.facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    operating_hours JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.facilities IS '지점 정보 테이블';
COMMENT ON COLUMN public.facilities.operating_hours IS '운영 시간 (JSON 형식)';

-- Members (회원)
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(10),
    profile_image_url TEXT,
    emergency_contact VARCHAR(20),
    medical_notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.members IS '회원 프로필 테이블';
COMMENT ON COLUMN public.members.user_id IS 'Supabase Auth 유저 ID';
COMMENT ON COLUMN public.members.status IS '회원 상태: active, inactive, suspended';

-- Membership Plans (요금제)
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('period', 'count')),
    duration_days INT,
    credit_count INT,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT check_plan_type CHECK (
        (type = 'period' AND duration_days > 0) OR
        (type = 'count' AND credit_count > 0)
    )
);

COMMENT ON TABLE public.membership_plans IS '회원권 요금제 테이블';
COMMENT ON COLUMN public.membership_plans.type IS '요금제 타입: period (기간제), count (횟수제)';

-- Memberships (회원권)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.membership_plans(id),
    start_date DATE NOT NULL,
    end_date DATE,
    remaining_credits INT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.memberships IS '회원권 보유 내역 테이블';
COMMENT ON COLUMN public.memberships.remaining_credits IS '잔여 횟수 (횟수제 회원권)';

-- Coaches (코치)
CREATE TABLE IF NOT EXISTS public.coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    specialties TEXT[],
    bio TEXT,
    profile_image_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.coaches IS '코치 정보 테이블';
COMMENT ON COLUMN public.coaches.specialties IS '전문 분야 배열';

-- Sessions (수업)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES public.facilities(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT NOT NULL DEFAULT 15,
    intensity_level VARCHAR(20) CHECK (intensity_level IN ('beginner', 'intermediate', 'advanced')),
    wod_description TEXT,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.sessions IS '수업 일정 테이블';
COMMENT ON COLUMN public.sessions.wod_description IS 'Workout of the Day 설명';
COMMENT ON COLUMN public.sessions.intensity_level IS '강도: beginner, intermediate, advanced';

-- Session Coaches (수업-코치 매핑)
CREATE TABLE IF NOT EXISTS public.session_coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'primary' CHECK (role IN ('primary', 'assistant')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(session_id, coach_id)
);

COMMENT ON TABLE public.session_coaches IS '수업-코치 매핑 테이블';
COMMENT ON COLUMN public.session_coaches.role IS '역할: primary (주 코치), assistant (보조 코치)';

-- Bookings (예약)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.memberships(id),
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled', 'no_show')),
    booking_type VARCHAR(20) DEFAULT 'regular' CHECK (booking_type IN ('regular', 'trial', 'makeup')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(session_id, member_id)
);

COMMENT ON TABLE public.bookings IS '수업 예약 내역 테이블';
COMMENT ON COLUMN public.bookings.status IS '예약 상태: confirmed, waitlist, cancelled, no_show';
COMMENT ON COLUMN public.bookings.booking_type IS '예약 유형: regular, trial, makeup';

-- Check-ins (출석)
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id),
    facility_id UUID REFERENCES public.facilities(id),
    checkin_time TIMESTAMPTZ DEFAULT now(),
    checkin_method VARCHAR(20) DEFAULT 'qr' CHECK (checkin_method IN ('qr', 'manual', 'kiosk', 'face')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.checkins IS '체크인 로그 테이블';
COMMENT ON COLUMN public.checkins.checkin_method IS '체크인 방법: qr, manual, kiosk, face';

-- Transactions (거래)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.memberships(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_type VARCHAR(20) DEFAULT 'purchase' CHECK (transaction_type IN ('purchase', 'refund', 'adjustment')),
    category VARCHAR(50) DEFAULT 'membership' CHECK (category IN ('membership', 'pt', 'goods', 'locker', 'etc')),
    pg_transaction_id VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.transactions IS '거래 내역 테이블';
COMMENT ON COLUMN public.transactions.category IS '거래 카테고리: membership, pt, goods, locker, etc';
COMMENT ON COLUMN public.transactions.pg_transaction_id IS 'PG사 트랜잭션 ID';

-- Notices (공지사항)
CREATE TABLE IF NOT EXISTS public.notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES public.facilities(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'event', 'maintenance', 'emergency')),
    is_pinned BOOLEAN DEFAULT false,
    is_urgent BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.notices IS '공지사항 테이블';
COMMENT ON COLUMN public.notices.category IS '카테고리: general, event, maintenance, emergency';

-- Notifications (알림)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.notifications IS '알림 테이블';
COMMENT ON COLUMN public.notifications.type IS '알림 유형: info, warning, success, error';

-- Support Tickets (고객 문의)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) CHECK (category IN ('inquiry', 'complaint', 'suggestion', 'refund')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.support_tickets IS '고객 문의 티켓 테이블';

-- ============================================
-- 3. Indexes for Performance
-- ============================================

-- Members
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);

-- Memberships
CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON public.memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_dates ON public.memberships(start_date, end_date);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_facility ON public.sessions(facility_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_date_facility ON public.sessions(session_date, facility_id);

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_session ON public.bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_member ON public.bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Check-ins
CREATE INDEX IF NOT EXISTS idx_checkins_member ON public.checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_session ON public.checkins(session_id);
CREATE INDEX IF NOT EXISTS idx_checkins_time ON public.checkins(checkin_time);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_member ON public.transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at);

-- Notices
CREATE INDEX IF NOT EXISTS idx_notices_facility ON public.notices(facility_id);
CREATE INDEX IF NOT EXISTS idx_notices_published ON public.notices(published_at);

-- ============================================
-- 4. Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Note: RLS 정책은 별도 파일에서 관리됩니다.
-- 참고: .docs/database/rls-policies/

-- ============================================
-- 5. Functions and Triggers
-- ============================================

-- Updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_facilities_updated_at
    BEFORE UPDATE ON public.facilities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_membership_plans_updated_at
    BEFORE UPDATE ON public.membership_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at
    BEFORE UPDATE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaches_updated_at
    BEFORE UPDATE ON public.coaches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notices_updated_at
    BEFORE UPDATE ON public.notices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

-- ============================================
-- Rollback Script (주석 처리)
-- ============================================
/*
BEGIN;

-- Drop triggers
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

-- Drop functions
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Drop tables (reverse order for foreign key constraints)
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

COMMIT;
*/
