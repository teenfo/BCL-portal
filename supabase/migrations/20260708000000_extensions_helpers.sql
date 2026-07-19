-- ============================================================================
-- BCL Portal 재구축 DDL — 00_extensions_helpers.sql
-- ----------------------------------------------------------------------------
-- 목적   : 확장 모듈 + 공통 헬퍼 함수 + Storage 버킷 (모든 파일의 선행 조건)
-- 의존   : 없음 (최우선 실행)
-- 후속   : 01_core → 02_membership_finance → 03_sessions_bookings → 04_wod_runbook
--          → 05_race → 06_notification → 07_performance_badges
--          → 08_rbac_supplementary → 09_rpc  (반드시 이 순서로 적용)
-- 원칙   : 멱등(IF NOT EXISTS / OR REPLACE), 표준 계약(contract.md) 명칭만 사용
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 확장 (Extensions)
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- gen_random_uuid(), pgp_sym_encrypt/decrypt (결제 키 암호화)
CREATE EXTENSION IF NOT EXISTS "pg_net";         -- 알림 트리거 → Edge Function 비동기 HTTP 호출
CREATE EXTENSION IF NOT EXISTS "pg_cron";        -- 수업 리마인더(10분) / 만기 알림(일일) 스케줄
-- 참고: uuid-ossp는 사용하지 않는다. 모든 PK 기본값은 gen_random_uuid()로 통일.

-- ----------------------------------------------------------------------------
-- 2. 공통 트리거 함수 — updated_at 자동 갱신
--    (updated_at 컬럼을 가진 모든 테이블은 각 파일에서 이 함수를 트리거로 연결)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS '공통: updated_at 자동 갱신 (BEFORE UPDATE 트리거용)';

-- ----------------------------------------------------------------------------
-- 3. RLS 헬퍼 — 계약 §3: 역할 판정 함수는 이 2종 + fn_my_permissions(09) 뿐이다.
--    profiles 테이블(01_core)보다 먼저 생성되므로 plpgsql 사용
--    (plpgsql 본문은 생성 시점에 테이블 존재를 검증하지 않음 → 파일 순서 안전)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND approval_status = 'approved'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_coach()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin','coach') AND approval_status = 'approved'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_coach() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_coach() TO authenticated;

COMMENT ON FUNCTION public.is_admin() IS 'RLS 헬퍼: profiles.role=admin AND approved (권한 단일 소스)';
COMMENT ON FUNCTION public.is_admin_or_coach() IS 'RLS 헬퍼: profiles.role IN (admin,coach) AND approved';

-- ----------------------------------------------------------------------------
-- 4. 현재 사용자 → member_id 해석 헬퍼 (RPC 공용, 클라이언트 식별자 전달 금지 원칙)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_member_id()
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
BEGIN
    SELECT id INTO v_member_id
    FROM public.members
    WHERE user_id = auth.uid()
    LIMIT 1;
    RETURN v_member_id;   -- 미연결 시 NULL
END;
$$;

REVOKE ALL ON FUNCTION public.current_member_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_member_id() TO authenticated;

COMMENT ON FUNCTION public.current_member_id() IS 'RPC 공용: auth.uid() → members.id 해석 (비즈니스 테이블은 member_id만 참조하는 규칙 지원)';

-- ----------------------------------------------------------------------------
-- 5. Storage 버킷 4종 (계약: avatars / facility-photos / movement-media / uploads)
--    Supabase storage 스키마가 있는 환경에서만 실행 (셀프호스트 예외 방지)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES
            ('avatars',         'avatars',         true),   -- 회원/코치 프로필 사진 (공개 읽기)
            ('facility-photos', 'facility-photos', true),   -- 시설 사진 (공개 읽기)
            ('movement-media',  'movement-media',  true),   -- 운동 라이브러리 썸네일/영상 (공개 읽기)
            ('uploads',         'uploads',         false)   -- 일반 업로드 (지원티켓 첨부 등, 비공개)
        ON CONFLICT (id) DO NOTHING;

        -- 업로드/수정: 본인 경로({uid}/...)만, 삭제: admin. (세부 정책은 07-data-model §8 참조)
        -- storage.objects 정책은 프로젝트 초기화 시 아래 표준 정책 4종을 적용한다.
        DROP POLICY IF EXISTS "avatars own write" ON storage.objects;
        CREATE POLICY "avatars own write" ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

        DROP POLICY IF EXISTS "public buckets read" ON storage.objects;
        CREATE POLICY "public buckets read" ON storage.objects
            FOR SELECT TO public
            USING (bucket_id IN ('avatars','facility-photos','movement-media'));

        DROP POLICY IF EXISTS "staff media write" ON storage.objects;
        CREATE POLICY "staff media write" ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id IN ('facility-photos','movement-media') AND public.is_admin_or_coach());

        DROP POLICY IF EXISTS "uploads own rw" ON storage.objects;
        CREATE POLICY "uploads own rw" ON storage.objects
            FOR ALL TO authenticated
            USING (bucket_id = 'uploads'
                   AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()))
            WITH CHECK (bucket_id = 'uploads'
                   AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
    END IF;
END $$;

-- ============================================================================
-- 00_extensions_helpers.sql 끝 — 다음: 01_core.sql
-- ============================================================================
