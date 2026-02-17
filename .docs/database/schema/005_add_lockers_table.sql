-- ======================================
-- 005: Locker Management Tables
-- Date: 2026-02-17
-- ======================================

-- 1. lockers — 지점별 개별 락커 정보
CREATE TABLE IF NOT EXISTS public.lockers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE,
    locker_number text NOT NULL,
    size text NOT NULL DEFAULT 'M' CHECK (size IN ('S', 'M', 'L')),
    status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'broken', 'maintenance')),
    monthly_fee numeric DEFAULT 0,
    note text,
    -- Current assignment (denormalized for quick lookup)
    assigned_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
    assignment_start_date date,
    assignment_end_date date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(facility_id, locker_number)
);

-- 2. locker_assignments — 배정 이력
CREATE TABLE IF NOT EXISTS public.locker_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    locker_id uuid NOT NULL REFERENCES public.lockers(id) ON DELETE CASCADE,
    member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    start_date date NOT NULL DEFAULT CURRENT_DATE,
    end_date date,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'released')),
    note text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_lockers_facility ON public.lockers(facility_id);
CREATE INDEX idx_lockers_status ON public.lockers(status);
CREATE INDEX idx_lockers_assigned_member ON public.lockers(assigned_member_id);
CREATE INDEX idx_locker_assignments_locker ON public.locker_assignments(locker_id);
CREATE INDEX idx_locker_assignments_member ON public.locker_assignments(member_id);
CREATE INDEX idx_locker_assignments_status ON public.locker_assignments(status);

-- RLS
ALTER TABLE public.lockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locker_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.lockers
    FOR SELECT USING (true);

CREATE POLICY "Allow admin to manage lockers" ON public.lockers
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public read access" ON public.locker_assignments
    FOR SELECT USING (true);

CREATE POLICY "Allow admin to manage locker_assignments" ON public.locker_assignments
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lockers_updated_at
    BEFORE UPDATE ON public.lockers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locker_assignments_updated_at
    BEFORE UPDATE ON public.locker_assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
