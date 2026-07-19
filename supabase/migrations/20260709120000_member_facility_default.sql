-- ============================================================================
-- BCL Portal — 20260709120000_member_facility_default.sql
-- 회원 지점(facility) 기본값 — 체크인 QR 발급 전제 조건 봉합.
--   증상: members.facility_id 가 NULL 이면 앱 체크인 QR 페이로드({mid,fid,ts,v})의
--         fid 를 채울 수 없어 QR 이 발급되지 않음(무한 스켈레톤).
--   원인: handle_new_auth_user 가 members 를 facility 없이 생성 → 단일 지점 조직에서도 미배정.
--   조치: (1) 기존 NULL 회원을 단일 활성 지점으로 백필  (2) 신규 회원 INSERT 시 지점 기본값.
--   안전장치: "활성 지점이 정확히 1개"일 때만 자동 배정(다지점 조직의 수동 배정을 침해하지 않음).
-- ============================================================================

-- [1] 신규 회원 지점 기본값 트리거 — auth 트리거(handle_new_auth_user) 비접촉(격리).
--   members BEFORE INSERT: facility_id 미지정 && 활성 지점 1개 → 그 지점으로 채움.
CREATE OR REPLACE FUNCTION public.set_default_member_facility()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_fac UUID;
    v_cnt INT;
BEGIN
    IF NEW.facility_id IS NOT NULL THEN
        RETURN NEW;
    END IF;
    SELECT count(*) INTO v_cnt FROM public.facilities WHERE is_active;
    IF v_cnt = 1 THEN
        SELECT id INTO v_fac FROM public.facilities WHERE is_active LIMIT 1;
        NEW.facility_id := v_fac;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_default_facility ON public.members;
CREATE TRIGGER trg_members_default_facility
    BEFORE INSERT ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.set_default_member_facility();

COMMENT ON FUNCTION public.set_default_member_facility() IS
'신규 회원 지점 기본값 — 활성 지점이 정확히 1개일 때만 자동 배정(단일 지점 조직). 체크인 QR fid 전제.';

-- [2] 기존 NULL 회원 백필 — 활성 지점이 정확히 1개일 때만.
DO $$
DECLARE
    v_fac UUID;
    v_cnt INT;
BEGIN
    SELECT count(*) INTO v_cnt FROM public.facilities WHERE is_active;
    IF v_cnt = 1 THEN
        SELECT id INTO v_fac FROM public.facilities WHERE is_active LIMIT 1;
        UPDATE public.members SET facility_id = v_fac, updated_at = now()
         WHERE facility_id IS NULL;
    END IF;
END $$;

-- ============================================================================
-- 20260709120000_member_facility_default.sql 끝
-- ============================================================================
