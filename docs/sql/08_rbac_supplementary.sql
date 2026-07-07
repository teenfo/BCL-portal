-- ============================================================================
-- BCL Portal 재구축 DDL — 08_rbac_supplementary.sql
-- ----------------------------------------------------------------------------
-- 목적   : rbac + supplementary 도메인
--          admin_roles(🔄 permissions JSONB 단일형) / admin_user_roles(권한 단일 소스 승격)
--          notices / banners / support_tickets / faqs / lockers(🔄 단일화) /
--          qr_codes / kiosk_devices / audit_logs / system_config / widget_settings(🔄 4→1)
-- 의존   : 00, 01 (facilities/members)
-- 시드   : admin_roles 4종 (permissions는 계약 §3의 단일 JSONB형 {group: string[]})
-- 변경   : (to-be) 권한 세부는 admin_user_roles→admin_roles.permissions로 단일화
--          (UI 게이트는 fn_my_permissions() 1함수 — 09_rpc), permissions 2형태 혼재 해소,
--          lockers+locker_assignments+members.locker_number 삼중 구조 → lockers 단일화,
--          위젯 4테이블(설계만 존재) → widget_settings 1테이블 축소
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. admin_roles — 역할 정의 (permissions JSONB 단일형)
--    형태 표준: {"<권한그룹>": ["view","edit","delete",...]} — 배열형 1종만.
--    와일드카드 {"*": ["all"]} = super_admin (UI에서 편집 잠금)
--    권한 그룹 키 = Admin 14화면과 1:1: dashboard/members/attendance/payments/plans/
--    schedule/coaches/wod_studio/race/lockers/badges/feedback/crm/settings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL UNIQUE,
    display_name    VARCHAR(100) NOT NULL,
    description     TEXT,
    permissions     JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_system_role  BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- permissions 값은 반드시 "키: 문자열배열" 형태(불리언맵 금지) — 형태 혼재 재발 차단
    CONSTRAINT chk_permissions_object CHECK (jsonb_typeof(permissions) = 'object')
);

COMMENT ON TABLE  public.admin_roles IS 'rbac: 역할 정의. permissions 단일형 {group: string[]} — as-is의 불리언맵/배열 2형태 혼재 해소';
COMMENT ON COLUMN public.admin_roles.permissions IS '예: {"members":["view","edit"],"payments":["view"]}. {"*":["all"]}=super_admin';

-- 시드: 역할 4종 (계약 §3 단일 JSONB형)
INSERT INTO public.admin_roles (name, display_name, description, is_system_role, permissions) VALUES
    ('super_admin', 'Super Admin', '최고 관리자 — 전 권한 (편집 잠금)', true,
     '{"*": ["all"]}'::jsonb),
    ('manager', 'Manager', '지점 관리자 — 운영 전반', true,
     '{"dashboard":["view"],"members":["view","edit"],"attendance":["view","edit"],
       "payments":["view","edit"],"plans":["view","edit"],"schedule":["view","edit"],
       "coaches":["view","edit"],"wod_studio":["view","edit"],"race":["view","edit"],
       "lockers":["view","edit"],"badges":["view","edit"],"feedback":["view","edit"],
       "crm":["view","edit"]}'::jsonb),
    ('staff', 'Staff', '데스크 스탭 — 출석/회원 조회 중심', true,
     '{"dashboard":["view"],"members":["view"],"attendance":["view","edit"],
       "schedule":["view"],"lockers":["view","edit"]}'::jsonb),
    ('viewer', 'Viewer', '읽기 전용 (리포트 열람)', true,
     '{"dashboard":["view"],"members":["view"],"attendance":["view"],
       "payments":["view"],"feedback":["view"]}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. admin_user_roles — 사용자-역할 매핑 (세부 권한의 단일 소스)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_user_roles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id      UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
    facility_id  UUID REFERENCES public.facilities(id) ON DELETE CASCADE,   -- NULL=전 지점
    assigned_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role_id, facility_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_user_roles_user ON public.admin_user_roles(user_id);

COMMENT ON TABLE public.admin_user_roles IS 'rbac: 사용자-역할 매핑. 게이트 순서: profiles.role=admin(1차) → fn_my_permissions()(2차 화면별). as-is "UI 전용 미연동" 해소';

-- ----------------------------------------------------------------------------
-- 3. notices — 공지사항
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notices (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id   UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    content       TEXT NOT NULL,
    category      VARCHAR(20) NOT NULL DEFAULT 'general'
                  CHECK (category IN ('general','schedule','event','maintenance','emergency')),
    priority      VARCHAR(10) NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('urgent','high','normal','low')),
    is_pinned     BOOLEAN NOT NULL DEFAULT false,
    is_published  BOOLEAN NOT NULL DEFAULT false,
    published_at  TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ,
    created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notices_published
    ON public.notices(facility_id, is_pinned DESC, published_at DESC) WHERE is_published = true;

COMMENT ON TABLE public.notices IS 'supplementary: 공지. is_published=true만 회원 노출';

-- ----------------------------------------------------------------------------
-- 4. banners — 앱 배너
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banners (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    image_url       TEXT,
    link_url        TEXT,
    position        VARCHAR(15) NOT NULL DEFAULT 'home_top'
                    CHECK (position IN ('home_top','home_mid','home_bottom','popup','event')),
    priority_order  INT NOT NULL DEFAULT 0,
    start_date      TIMESTAMPTZ NOT NULL,
    end_date        TIMESTAMPTZ NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_banners_active_window
    ON public.banners(position, priority_order) WHERE is_active = true;

COMMENT ON TABLE public.banners IS 'supplementary: 배너. position 값 영문 슬러그 표준화(as-is 한글 CHECK 제거)';

-- ----------------------------------------------------------------------------
-- 5. support_tickets — 고객 문의
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id    UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    subject      VARCHAR(200) NOT NULL,
    content      TEXT NOT NULL,
    category     VARCHAR(15) NOT NULL DEFAULT 'inquiry'
                 CHECK (category IN ('inquiry','complaint','suggestion','refund')),
    status       VARCHAR(15) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','in_progress','resolved','closed')),
    priority     VARCHAR(10) NOT NULL DEFAULT 'normal'
                 CHECK (priority IN ('low','normal','high','urgent')),
    assigned_to  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_member ON public.support_tickets(member_id, created_at DESC);

COMMENT ON TABLE public.support_tickets IS 'supplementary: 문의 티켓. Admin crm 화면 지원 탭 소스';

-- ----------------------------------------------------------------------------
-- 6. faqs — 자주 묻는 질문
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faqs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category      VARCHAR(30) NOT NULL DEFAULT 'general',
    question      VARCHAR(300) NOT NULL,
    answer        TEXT NOT NULL,
    sort_order    INT NOT NULL DEFAULT 0,
    is_published  BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.faqs IS 'supplementary: FAQ (회원 앱 profile>고객센터)';

-- ----------------------------------------------------------------------------
-- 7. lockers — 락커 단일화 (🔄 lockers+locker_assignments+members.locker_number → 1테이블)
--    현재 배정 = 본 테이블 컬럼, 과거 이력 = audit_logs로 기록 (별도 이력 테이블 폐지)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lockers (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id          UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    locker_number        VARCHAR(20) NOT NULL,
    size                 VARCHAR(5) NOT NULL DEFAULT 'M' CHECK (size IN ('S','M','L')),
    monthly_fee          NUMERIC(12,0) NOT NULL DEFAULT 0,
    status               VARCHAR(15) NOT NULL DEFAULT 'available'
                         CHECK (status IN ('available','occupied','maintenance','disabled')),
    assigned_member_id   UUID REFERENCES public.members(id) ON DELETE SET NULL,
    assigned_start_date  DATE,
    assigned_end_date    DATE,
    memo                 TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (facility_id, locker_number),
    CONSTRAINT chk_locker_assignment CHECK (
        (status = 'occupied' AND assigned_member_id IS NOT NULL)
        OR (status <> 'occupied' AND assigned_member_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_lockers_assigned_member
    ON public.lockers(assigned_member_id) WHERE assigned_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lockers_expiry
    ON public.lockers(assigned_end_date) WHERE status = 'occupied';

COMMENT ON TABLE public.lockers IS 'supplementary: 락커 단일 소스. 🔄 locker_assignments·members.locker_number 폐지 — 배정=본 테이블, 이력=audit_logs';

-- ----------------------------------------------------------------------------
-- 8. qr_codes — 고정 QR (시설/세션 QR. 회원 체크인 QR은 앱 동적 생성 {mid,fid,ts,v})
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id  UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    code         VARCHAR(200) NOT NULL UNIQUE,
    qr_type      VARCHAR(15) NOT NULL CHECK (qr_type IN ('facility','session','member')),
    expires_at   TIMESTAMPTZ,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.qr_codes IS 'supplementary: 고정 QR 관리. 회원 동적 QR 페이로드 {mid,fid,ts,v}(5분 만료)는 DB 미저장 — fn_kiosk_checkin이 검증';

-- ----------------------------------------------------------------------------
-- 9. kiosk_devices — 키오스크 단말
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kiosk_devices (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id      UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    device_name      VARCHAR(100) NOT NULL,
    device_ip        VARCHAR(50),
    status           VARCHAR(15) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','offline','maintenance')),
    display_message  TEXT,
    last_heartbeat   TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.kiosk_devices IS 'supplementary: 키오스크 단말. last_heartbeat 60s 미갱신=offline 표시';

-- ----------------------------------------------------------------------------
-- 10. audit_logs — 감사 로그 (append-only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,                 -- 'PROMOTE_TO_COACH', 'LOCKER_ASSIGN', ...
    table_name  VARCHAR(100),
    record_id   UUID,
    old_values  JSONB,
    new_values  JSONB,
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 쿼리 패턴: (a) 최근 로그 타임라인, (b) 특정 레코드 이력
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(table_name, record_id);

COMMENT ON TABLE public.audit_logs IS 'supplementary: 감사 로그. UPDATE/DELETE 불가(append-only), 열람 admin 전용';

-- ----------------------------------------------------------------------------
-- 11. system_config — 시스템 설정 (Edge URL, 사이트 설정 등)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_config (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key    VARCHAR(100) NOT NULL UNIQUE,
    config_value  JSONB NOT NULL DEFAULT 'null'::jsonb,
    category      VARCHAR(30) NOT NULL DEFAULT 'general',
    description   TEXT,
    is_secret     BOOLEAN NOT NULL DEFAULT false,
    updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.system_config IS 'supplementary: 시스템 설정 KV. 필수 키: edge_base_url, edge_service_key(알림 팬아웃 — 06_notification 참조)';

-- 알림 팬아웃 설정 키 자리표시 (값은 배포 시 주입)
INSERT INTO public.system_config (config_key, config_value, category, description, is_secret) VALUES
    ('edge_base_url',    'null'::jsonb, 'notification', 'Supabase 프로젝트 URL (https://xxx.supabase.co)', false),
    ('edge_service_key', 'null'::jsonb, 'notification', 'Edge Function 호출용 키 — Vault 사용 권장',        true)
ON CONFLICT (config_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 12. widget_settings — 대시보드 위젯 (🔄 위젯 4테이블 설계 → 1테이블 축소)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.widget_settings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id  UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    widget_key   VARCHAR(60) NOT NULL,                 -- 'kpi_members', 'revenue_chart', ...
    title        VARCHAR(100),
    config       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- 위젯별 자유 설정(기간/차트형/필터)
    is_enabled   BOOLEAN NOT NULL DEFAULT true,
    sort_order   INT NOT NULL DEFAULT 0,
    updated_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (facility_id, widget_key)
);

COMMENT ON TABLE public.widget_settings IS 'supplementary: Admin 대시보드 위젯 설정. 🔄 as-is 위젯 4테이블(정의/인스턴스/레이아웃/AI생성 — 설계만 존재) → 1테이블. AI 생성기는 후순위 부록';

-- ----------------------------------------------------------------------------
-- 13. updated_at 트리거
-- ----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['admin_roles','notices','banners','support_tickets','faqs',
                             'lockers','kiosk_devices','system_config','widget_settings'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I
                        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 14. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.admin_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lockers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiosk_devices    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_settings  ENABLE ROW LEVEL SECURITY;

-- admin_roles / admin_user_roles: 본인 매핑 읽기 + admin 관리 (전체 공개 읽기 제거)
DROP POLICY IF EXISTS "admin_roles admin manage" ON public.admin_roles;
CREATE POLICY "admin_roles admin manage" ON public.admin_roles
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_user_roles own read" ON public.admin_user_roles;
CREATE POLICY "admin_user_roles own read" ON public.admin_user_roles
    FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "admin_user_roles admin manage" ON public.admin_user_roles;
CREATE POLICY "admin_user_roles admin manage" ON public.admin_user_roles
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
-- 참고: UI 권한 조회는 fn_my_permissions() (SECURITY DEFINER) 경유 — 테이블 직접 조회 불필요

-- notices: 게시분 인증 읽기 / admin 관리
DROP POLICY IF EXISTS "notices published read" ON public.notices;
CREATE POLICY "notices published read" ON public.notices
    FOR SELECT TO authenticated
    USING (is_published = true OR public.is_admin());
DROP POLICY IF EXISTS "notices admin manage" ON public.notices;
CREATE POLICY "notices admin manage" ON public.notices
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- banners: 활성분 인증 읽기 / admin 관리
DROP POLICY IF EXISTS "banners active read" ON public.banners;
CREATE POLICY "banners active read" ON public.banners
    FOR SELECT TO authenticated
    USING ((is_active AND now() BETWEEN start_date AND end_date) OR public.is_admin());
DROP POLICY IF EXISTS "banners admin manage" ON public.banners;
CREATE POLICY "banners admin manage" ON public.banners
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- support_tickets: 본인 생성·읽기 / admin 관리
DROP POLICY IF EXISTS "tickets own read" ON public.support_tickets;
CREATE POLICY "tickets own read" ON public.support_tickets
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.members m
                   WHERE m.id = support_tickets.member_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "tickets own insert" ON public.support_tickets;
CREATE POLICY "tickets own insert" ON public.support_tickets
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.members m
                        WHERE m.id = support_tickets.member_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "tickets admin manage" ON public.support_tickets;
CREATE POLICY "tickets admin manage" ON public.support_tickets
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- faqs: 게시분 인증 읽기 / admin 관리
DROP POLICY IF EXISTS "faqs read" ON public.faqs;
CREATE POLICY "faqs read" ON public.faqs
    FOR SELECT TO authenticated USING (is_published = true OR public.is_admin());
DROP POLICY IF EXISTS "faqs admin manage" ON public.faqs;
CREATE POLICY "faqs admin manage" ON public.faqs
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- lockers: 본인 배정분 읽기 + admin 관리
DROP POLICY IF EXISTS "lockers own read" ON public.lockers;
CREATE POLICY "lockers own read" ON public.lockers
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.members m
                   WHERE m.id = lockers.assigned_member_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "lockers admin manage" ON public.lockers;
CREATE POLICY "lockers admin manage" ON public.lockers
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- qr_codes / kiosk_devices: admin 전용 (키오스크 단말은 Service Role 사용)
DROP POLICY IF EXISTS "qr_codes admin only" ON public.qr_codes;
CREATE POLICY "qr_codes admin only" ON public.qr_codes
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "kiosk_devices admin only" ON public.kiosk_devices;
CREATE POLICY "kiosk_devices admin only" ON public.kiosk_devices
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- audit_logs: admin 읽기 전용 (쓰기는 SECURITY DEFINER 함수·서버만, UPDATE/DELETE 정책 없음)
DROP POLICY IF EXISTS "audit_logs admin read" ON public.audit_logs;
CREATE POLICY "audit_logs admin read" ON public.audit_logs
    FOR SELECT TO authenticated USING (public.is_admin());

-- system_config: admin 전용 (is_secret 값은 UI에서 마스킹)
DROP POLICY IF EXISTS "system_config admin only" ON public.system_config;
CREATE POLICY "system_config admin only" ON public.system_config
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- widget_settings: admin 전용
DROP POLICY IF EXISTS "widget_settings admin only" ON public.widget_settings;
CREATE POLICY "widget_settings admin only" ON public.widget_settings
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- 08_rbac_supplementary.sql 끝 — 다음: 09_rpc.sql
-- ============================================================================
