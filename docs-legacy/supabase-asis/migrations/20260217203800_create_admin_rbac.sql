-- =============================================
-- Migration: Admin RBAC (admin_roles, admin_user_roles)
-- =============================================

-- 관리자 역할 정의 테이블
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.admin_roles IS '관리자 역할 정의 테이블';
COMMENT ON COLUMN public.admin_roles.permissions IS 'JSONB 형식의 권한 매트릭스: {"dashboard": {"read": true, "write": false}}';

-- 사용자-역할 매핑 테이블
CREATE TABLE IF NOT EXISTS public.admin_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.admin_roles(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES public.facilities(id),
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role_id, facility_id)
);

COMMENT ON TABLE public.admin_user_roles IS '사용자-역할 매핑 테이블';

-- 기본 역할 삽입
INSERT INTO public.admin_roles (name, display_name, description, is_system_role, permissions) VALUES
('super_admin', 'Super Admin', '최고 관리자 - 모든 권한', true, '{"*": {"read": true, "write": true, "delete": true}}'),
('manager', 'Manager', '지점 관리자 - 지점 내 모든 권한', true, '{"members": {"read": true, "write": true}, "sessions": {"read": true, "write": true}, "transactions": {"read": true, "write": true}, "coaches": {"read": true, "write": true}, "content": {"read": true, "write": true}}'),
('staff', 'Staff', '데스크 스탭 - 제한적 권한', true, '{"checkins": {"read": true, "write": true}, "bookings": {"read": true}, "members": {"read": true}}'),
('coach', 'Coach', '코치 - 수업 관련 권한', true, '{"sessions": {"read": true, "write": true}, "members": {"read": true}, "feedback": {"read": true}}')
ON CONFLICT (name) DO NOTHING;

-- 인덱스
CREATE INDEX idx_admin_user_roles_user ON public.admin_user_roles(user_id);
CREATE INDEX idx_admin_user_roles_role ON public.admin_user_roles(role_id);
CREATE INDEX idx_admin_user_roles_facility ON public.admin_user_roles(facility_id);

-- RLS 활성화
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Allow authenticated read admin_roles" ON public.admin_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read admin_user_roles" ON public.admin_user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin manage admin_roles" ON public.admin_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Allow admin manage admin_user_roles" ON public.admin_user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
