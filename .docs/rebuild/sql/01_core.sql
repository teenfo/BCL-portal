-- ============================================================================
-- BCL Portal 재구축 DDL — 01_core.sql
-- ----------------------------------------------------------------------------
-- 목적   : core 도메인 — facilities / profiles / members / coaches / member_notes
-- 의존   : 00_extensions_helpers.sql
-- 변경   : (to-be) coaching_notes + member_notes → member_notes 1테이블 통합,
--          members.locker_number·counseling_notes 제거(lockers/notes로 이관),
--          profiles.approval_status 가입 승인 워크플로우 정식화,
--          auth.users → profiles/members 자동 생성 트리거 포함
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. facilities — 지점
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facilities (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(100) NOT NULL,
    address           TEXT,
    phone             VARCHAR(20),
    operating_hours   JSONB DEFAULT '{}'::jsonb,          -- {"mon":{"open":"06:00","close":"22:00"},...}
    latitude          NUMERIC(10,7),
    longitude         NUMERIC(10,7),
    photos            TEXT[] DEFAULT ARRAY[]::TEXT[],     -- Storage(facility-photos) URL 배열
    terms_of_service  TEXT,
    privacy_policy    TEXT,
    refund_policy     TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.facilities IS 'core: 지점 정보 (약관/환불정책 원문 포함)';
COMMENT ON COLUMN public.facilities.operating_hours IS '요일별 운영 시간 JSON';

-- ----------------------------------------------------------------------------
-- 2. profiles — 인증 게이트 (id = auth.uid, 권한 판정의 단일 소스)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email            VARCHAR(255),
    name             VARCHAR(100),
    role             VARCHAR(10) NOT NULL DEFAULT 'member'
                     CHECK (role IN ('admin','coach','member')),
    approval_status  VARCHAR(10) NOT NULL DEFAULT 'pending'
                     CHECK (approval_status IN ('pending','approved','rejected')),
    approved_at      TIMESTAMPTZ,
    approved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rejected_reason  TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role_approval ON public.profiles(role, approval_status);

COMMENT ON TABLE  public.profiles IS 'core: 인증 게이트. role(RLS 판정 단일 소스) + approval_status(가입 승인 워크플로우)';
COMMENT ON COLUMN public.profiles.role IS 'admin/coach/member — is_admin()/is_admin_or_coach()가 참조하는 유일한 역할 컬럼';
COMMENT ON COLUMN public.profiles.approval_status IS 'pending(승인대기)/approved/rejected — 미승인 사용자는 로그인 후 /auth/pending-approval로 격리';

-- ----------------------------------------------------------------------------
-- 3. members — 회원 (비즈니스 주체. 비즈니스 테이블은 member_id만 참조하는 규칙)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,  -- 미가입 회원(오프라인 등록)은 NULL
    facility_id        UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
    name               VARCHAR(100) NOT NULL,
    email              VARCHAR(255),
    phone              VARCHAR(20),
    birthday           DATE,
    gender             VARCHAR(10) CHECK (gender IN ('male','female','other') OR gender IS NULL),
    emergency_contact  VARCHAR(50),
    medical_notes      TEXT,
    avatar_url         TEXT,
    preferences        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- 앱 설정(dark_mode/weekly_goal 등)
    status             VARCHAR(20) NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','inactive','suspended')),
    is_blacklisted     BOOLEAN NOT NULL DEFAULT false,
    blacklist_reason   TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_user_id  ON public.members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_facility_status ON public.members(facility_id, status);
CREATE INDEX IF NOT EXISTS idx_members_name ON public.members(name);          -- Admin 회원 검색

COMMENT ON TABLE  public.members IS 'core: 회원. locker_number(폐지→lockers.assigned_member_id), counseling_notes(폐지→member_notes note_type=counseling)';
COMMENT ON COLUMN public.members.user_id IS 'auth 연동. NULL이면 계정 미연결(오프라인 등록) 회원';

-- ----------------------------------------------------------------------------
-- 4. coaches — 코치
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coaches (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    facility_id        UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
    name               VARCHAR(100) NOT NULL,
    email              VARCHAR(255),
    phone              VARCHAR(20),
    specialties        TEXT[] DEFAULT ARRAY[]::TEXT[],
    bio                TEXT,
    profile_image_url  TEXT,
    base_salary        INTEGER NOT NULL DEFAULT 0,          -- 월 기본급(원)
    session_allowance  INTEGER NOT NULL DEFAULT 0,          -- 세션당 수당(원)
    status             VARCHAR(20) NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','inactive','on_leave')),
    linked_at          TIMESTAMPTZ,                          -- 계정 연결 시각
    linked_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaches_user_id ON public.coaches(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coaches_facility_status ON public.coaches(facility_id, status);

COMMENT ON TABLE public.coaches IS 'core: 코치. status 값은 소문자만 허용(as-is의 Inactive 혼용 정리). 정산 파라미터(base_salary/session_allowance) 보유';

-- ----------------------------------------------------------------------------
-- 5. member_notes — 회원 메모 통합 테이블 (🔄 coaching_notes + member_notes 통합)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_notes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id    UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    author_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_role  VARCHAR(10) NOT NULL DEFAULT 'coach'
                 CHECK (author_role IN ('admin','coach')),
    note_type    VARCHAR(20) NOT NULL DEFAULT 'general'
                 CHECK (note_type IN ('general','injury','progress','caution','counseling')),
    content      TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_notes_member_created ON public.member_notes(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_notes_type ON public.member_notes(note_type, created_at DESC);

COMMENT ON TABLE  public.member_notes IS 'core: 회원 메모 단일 테이블 (as-is coaching_notes+member_notes 통합). counseling=구 members.counseling_notes 이관분';
COMMENT ON COLUMN public.member_notes.author_role IS '작성 주체 구분(admin/coach) — 구 2테이블 구분을 컬럼으로 흡수';

-- ----------------------------------------------------------------------------
-- 6. auth 연동 트리거 — 가입 시 profiles(pending) + members 자동 생성
--    【이메일 검증 제외 확정】 Supabase Auth 'Confirm email' OFF 전제.
--    email_confirmed_at 의존 금지 — auth.users INSERT 즉시 생성(가입 즉시 세션 발급
--    → /auth/pending-approval 격리. /auth/email-verify 라우트 폐지)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, approval_status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''), '@', 1)),
        'member',
        'pending'                                  -- 가입 즉시 승인 대기 (Admin 승인 필수)
    )
    ON CONFLICT (id) DO NOTHING;

    -- 동일 이메일의 미연결 회원(오프라인 선등록)이 있으면 연결, 없으면 신규 생성
    UPDATE public.members
       SET user_id = NEW.id, updated_at = now()
     WHERE user_id IS NULL AND email = NEW.email;

    IF NOT FOUND THEN
        INSERT INTO public.members (user_id, email, name)
        VALUES (NEW.id, NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''), '@', 1)))
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

COMMENT ON FUNCTION public.handle_new_auth_user() IS 'auth 가입 → profiles(pending) + members 자동 생성/연결. 승인 워크플로우 시작점';

-- ----------------------------------------------------------------------------
-- 7. updated_at 트리거
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_facilities_updated_at ON public.facilities;
CREATE TRIGGER trg_facilities_updated_at BEFORE UPDATE ON public.facilities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_members_updated_at ON public.members;
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_coaches_updated_at ON public.coaches;
CREATE TRIGGER trg_coaches_updated_at BEFORE UPDATE ON public.coaches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_member_notes_updated_at ON public.member_notes;
CREATE TRIGGER trg_member_notes_updated_at BEFORE UPDATE ON public.member_notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 8. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.facilities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

-- facilities: 인증 읽기 / admin 쓰기
DROP POLICY IF EXISTS "facilities read" ON public.facilities;
CREATE POLICY "facilities read" ON public.facilities
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "facilities admin manage" ON public.facilities;
CREATE POLICY "facilities admin manage" ON public.facilities
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- profiles: 본인 읽기 + admin 전체. 본인은 name만 수정 가능(role/approval은 admin/RPC 전용)
DROP POLICY IF EXISTS "profiles own read" ON public.profiles;
CREATE POLICY "profiles own read" ON public.profiles
    FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "profiles admin read" ON public.profiles;
CREATE POLICY "profiles admin read" ON public.profiles
    FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "profiles admin manage" ON public.profiles;
CREATE POLICY "profiles admin manage" ON public.profiles
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
-- 주의: 본인 UPDATE 정책은 두지 않는다. role/approval_status 자가 변경 차단 —
--       프로필 표시명 변경 등은 RPC/서버 경유. (as-is 권한상승 벡터 제거)

-- members: 본인 읽기/수정(개인정보 필드) + coach 읽기 + admin 전체
DROP POLICY IF EXISTS "members own read" ON public.members;
CREATE POLICY "members own read" ON public.members
    FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "members own update" ON public.members;
CREATE POLICY "members own update" ON public.members
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "members staff read" ON public.members;
CREATE POLICY "members staff read" ON public.members
    FOR SELECT TO authenticated USING (public.is_admin_or_coach());
DROP POLICY IF EXISTS "members admin manage" ON public.members;
CREATE POLICY "members admin manage" ON public.members
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- coaches: 인증 읽기(코치 소개 화면) / 본인 프로필 수정 / admin 전체
DROP POLICY IF EXISTS "coaches read" ON public.coaches;
CREATE POLICY "coaches read" ON public.coaches
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "coaches own update" ON public.coaches;
CREATE POLICY "coaches own update" ON public.coaches
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "coaches admin manage" ON public.coaches;
CREATE POLICY "coaches admin manage" ON public.coaches
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- member_notes: admin+coach만 (회원 비노출 — 민감 운영 메모)
DROP POLICY IF EXISTS "member_notes staff select" ON public.member_notes;
CREATE POLICY "member_notes staff select" ON public.member_notes
    FOR SELECT TO authenticated USING (public.is_admin_or_coach());
DROP POLICY IF EXISTS "member_notes staff insert" ON public.member_notes;
CREATE POLICY "member_notes staff insert" ON public.member_notes
    FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_coach());
DROP POLICY IF EXISTS "member_notes staff update" ON public.member_notes;
CREATE POLICY "member_notes staff update" ON public.member_notes
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_coach()) WITH CHECK (public.is_admin_or_coach());
DROP POLICY IF EXISTS "member_notes admin delete" ON public.member_notes;
CREATE POLICY "member_notes admin delete" ON public.member_notes
    FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================================
-- 01_core.sql 끝 — 다음: 02_membership_finance.sql
-- ============================================================================
