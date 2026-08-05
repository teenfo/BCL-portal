-- ============================================================================
-- 20260805050000_gallery_face_match.sql
-- 갤러리 + 셀피 얼굴 매칭 (docs/03 회원 앱 · docs/07 §해당 절)
--   회원/코치가 사진 업로드 → hosub face-service(insightface)가 얼굴 임베딩 추출
--   → 셀피 등록 회원과 매칭(gallery_photo_members) → 회원 앱 "내 사진" 필터.
-- 설계 결정:
--   - 임베딩은 real[](512) 저장 — 매칭은 워커(numpy 코사인)가 수행하므로 pgvector 불요.
--     시설당 회원 수백 규모에서 충분, 확장 필요 시 pgvector 마이그레이션으로 전진.
--   - 매칭 결과는 gallery_photo_members 사전 계산 → RLS·조회가 단순(임베딩 비노출).
--   - 갤러리는 시설 회원 전체 공개 + "내 사진" 필터(사용자 결정). 원본 셀피는 비공개
--     버킷(selfies), 임베딩 추출 후 워커가 파일 삭제(프로필엔 임베딩만 잔존).
--   - 쓰기는 RPC 경유(SECURITY DEFINER) — 클라이언트 식별자 전달 금지 규칙 준수.
--   - DELETE 정책은 admin 전용(프로젝트 규칙). 회원의 프로필 철회는 RPC로 제공.
-- ============================================================================

-- ── 1) 테이블 ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gallery_photos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id         UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    uploader_member_id  UUID REFERENCES public.members(id) ON DELETE SET NULL, -- 코치/admin 업로드는 NULL
    session_id          UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    storage_path        TEXT NOT NULL UNIQUE,          -- gallery 버킷 내 경로 {facility_id}/{yyyymm}/{uuid}.jpg
    caption             TEXT,
    taken_at            TIMESTAMPTZ,
    face_status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (face_status IN ('pending','processing','done','no_faces','failed')),
    face_count          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_facility_created
    ON public.gallery_photos (facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_face_status
    ON public.gallery_photos (face_status) WHERE face_status IN ('pending','processing');
COMMENT ON TABLE public.gallery_photos IS '시설 갤러리 사진 — face_status는 face-service 워커가 갱신';

CREATE TABLE IF NOT EXISTS public.member_face_profiles (
    member_id    UUID PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
    selfie_path  TEXT,                                  -- selfies 버킷 경로. 임베딩 추출 후 워커가 삭제·NULL 처리
    embedding    REAL[],                                -- insightface 512-d (워커 기록, 클라이언트 비노출)
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','ready','failed')),
    error        TEXT,
    consent_at   TIMESTAMPTZ NOT NULL,                  -- 생체정보(얼굴) 처리 동의 시각 — 필수
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.member_face_profiles IS '셀피 얼굴 프로필 — 동의 필수, 임베딩만 보관(원본 셀피는 추출 후 삭제)';

CREATE TABLE IF NOT EXISTS public.gallery_photo_faces (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id   UUID NOT NULL REFERENCES public.gallery_photos(id) ON DELETE CASCADE,
    bbox       REAL[],                                  -- [x1,y1,x2,y2] 원본 픽셀
    embedding  REAL[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_faces_photo ON public.gallery_photo_faces (photo_id);
COMMENT ON TABLE public.gallery_photo_faces IS '사진 내 검출 얼굴(워커 전용) — 클라이언트 정책 없음(service role만)';

CREATE TABLE IF NOT EXISTS public.gallery_photo_members (
    photo_id   UUID NOT NULL REFERENCES public.gallery_photos(id) ON DELETE CASCADE,
    member_id  UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    similarity REAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (photo_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_members_member ON public.gallery_photo_members (member_id);
COMMENT ON TABLE public.gallery_photo_members IS '사진↔회원 얼굴 매칭(워커 사전 계산) — "내 사진" 필터 소스';

-- ── 2) RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.gallery_photos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_face_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photo_faces   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photo_members ENABLE ROW LEVEL SECURITY;

-- 갤러리: 같은 시설 회원 + 스태프 열람(전체 공개 정책 — 사용자 결정). 쓰기는 RPC(definer)만.
DROP POLICY IF EXISTS "gallery photos facility read" ON public.gallery_photos;
CREATE POLICY "gallery photos facility read" ON public.gallery_photos
    FOR SELECT TO authenticated
    USING (
        public.is_admin_or_coach()
        OR EXISTS (SELECT 1 FROM public.members m
                   WHERE m.user_id = auth.uid() AND m.facility_id = gallery_photos.facility_id)
    );
DROP POLICY IF EXISTS "gallery photos admin delete" ON public.gallery_photos;
CREATE POLICY "gallery photos admin delete" ON public.gallery_photos
    FOR DELETE TO authenticated USING (public.is_admin());

-- 얼굴 프로필: 본인 상태 조회만(임베딩 노출 무해하나 필요 최소 — status/consent 확인용)
DROP POLICY IF EXISTS "face profile own read" ON public.member_face_profiles;
CREATE POLICY "face profile own read" ON public.member_face_profiles
    FOR SELECT TO authenticated USING (member_id = public.current_member_id());
DROP POLICY IF EXISTS "face profile admin delete" ON public.member_face_profiles;
CREATE POLICY "face profile admin delete" ON public.member_face_profiles
    FOR DELETE TO authenticated USING (public.is_admin());

-- 얼굴 원시 데이터: 클라이언트 정책 없음(service role 전용)

-- 매칭: 본인 것 + 스태프 열람("내 사진" 필터·관리 화면)
DROP POLICY IF EXISTS "photo members own read" ON public.gallery_photo_members;
CREATE POLICY "photo members own read" ON public.gallery_photo_members
    FOR SELECT TO authenticated
    USING (member_id = public.current_member_id() OR public.is_admin_or_coach());
DROP POLICY IF EXISTS "photo members admin delete" ON public.gallery_photo_members;
CREATE POLICY "photo members admin delete" ON public.gallery_photo_members
    FOR DELETE TO authenticated USING (public.is_admin());

-- ── 3) Storage — gallery(시설 공개)·selfies(비공개) ─────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('gallery', 'gallery', false),   -- 비공개 — 인증 SELECT 정책 + signed URL
               ('selfies', 'selfies', false)    -- 비공개 — 본인 업로드/열람, 워커(service role)만 소비
        ON CONFLICT (id) DO NOTHING;

        -- gallery 읽기: 로그인 사용자(시설 스코프는 경로 1세그먼트 = 본인 시설로 제한)
        DROP POLICY IF EXISTS "gallery facility read" ON storage.objects;
        CREATE POLICY "gallery facility read" ON storage.objects
            FOR SELECT TO authenticated
            USING (bucket_id = 'gallery'
                   AND (public.is_admin_or_coach()
                        OR (storage.foldername(name))[1] IN (
                            SELECT m.facility_id::text FROM public.members m WHERE m.user_id = auth.uid())));
        -- gallery 쓰기: 본인 시설 경로에만(회원) 또는 스태프
        DROP POLICY IF EXISTS "gallery facility write" ON storage.objects;
        CREATE POLICY "gallery facility write" ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'gallery'
                   AND (public.is_admin_or_coach()
                        OR (storage.foldername(name))[1] IN (
                            SELECT m.facility_id::text FROM public.members m WHERE m.user_id = auth.uid())));
        -- selfies: 본인 폴더({uid}/...)만 읽기/쓰기
        DROP POLICY IF EXISTS "selfies own rw" ON storage.objects;
        CREATE POLICY "selfies own rw" ON storage.objects
            FOR ALL TO authenticated
            USING (bucket_id = 'selfies' AND (storage.foldername(name))[1] = auth.uid()::text)
            WITH CHECK (bucket_id = 'selfies' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
END $$;

-- ── 4) RPC ──────────────────────────────────────────────────────────────────
-- 4a. 사진 등록 — Storage 업로드 후 호출. 경로 prefix가 본인 시설인지 서버가 검증.
CREATE OR REPLACE FUNCTION public.fn_register_gallery_photo(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member UUID;
    v_facility UUID;
    v_path TEXT;
    v_row public.gallery_photos;
BEGIN
    v_path := NULLIF(trim(p_payload->>'storage_path'), '');
    IF v_path IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'storage_path_required');
    END IF;

    v_member := public.current_member_id();
    IF v_member IS NOT NULL THEN
        SELECT facility_id INTO v_facility FROM public.members WHERE id = v_member;
    ELSIF public.is_admin_or_coach() THEN
        SELECT c.facility_id INTO v_facility FROM public.coaches c WHERE c.user_id = auth.uid() LIMIT 1;
        IF v_facility IS NULL THEN
            v_facility := NULLIF(p_payload->>'facility_id','')::UUID; -- admin: 명시 시설
        END IF;
    ELSE
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF v_facility IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'facility_required');
    END IF;

    -- 경로 규약 강제: {facility_id}/... — 타 시설 경로 등록 차단
    IF split_part(v_path, '/', 1) <> v_facility::text THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_path');
    END IF;

    INSERT INTO public.gallery_photos (facility_id, uploader_member_id, session_id, storage_path, caption, taken_at)
    VALUES (v_facility, v_member,
            NULLIF(p_payload->>'session_id','')::UUID,
            v_path,
            NULLIF(trim(p_payload->>'caption'), ''),
            NULLIF(p_payload->>'taken_at','')::TIMESTAMPTZ)
    ON CONFLICT (storage_path) DO NOTHING
    RETURNING * INTO v_row;
    IF v_row.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'duplicate_path');
    END IF;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('photo_id', v_row.id, 'face_status', v_row.face_status), 'error', NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_register_gallery_photo(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_register_gallery_photo(JSONB) TO authenticated;

-- 4b. 셀피 등록(동의 필수) — 업로드 후 호출. 워커가 임베딩 추출 후 ready 전환.
CREATE OR REPLACE FUNCTION public.fn_enroll_face_selfie(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member UUID;
    v_path TEXT;
BEGIN
    v_member := public.current_member_id();
    IF v_member IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF COALESCE((p_payload->>'consent')::BOOLEAN, false) IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'consent_required');
    END IF;
    v_path := NULLIF(trim(p_payload->>'selfie_path'), '');
    IF v_path IS NULL OR split_part(v_path, '/', 1) <> auth.uid()::text THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_path');
    END IF;

    INSERT INTO public.member_face_profiles (member_id, selfie_path, status, consent_at, updated_at)
    VALUES (v_member, v_path, 'pending', now(), now())
    ON CONFLICT (member_id) DO UPDATE
        SET selfie_path = EXCLUDED.selfie_path, status = 'pending', error = NULL,
            embedding = NULL, consent_at = now(), updated_at = now();

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('status', 'pending'), 'error', NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_enroll_face_selfie(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_enroll_face_selfie(JSONB) TO authenticated;

-- 4c. 얼굴 프로필 철회 — 임베딩·매칭 이력 삭제(동의 철회). DELETE 정책 대신 RPC 제공.
CREATE OR REPLACE FUNCTION public.fn_delete_face_profile()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member UUID;
BEGIN
    v_member := public.current_member_id();
    IF v_member IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    DELETE FROM public.gallery_photo_members WHERE member_id = v_member;
    DELETE FROM public.member_face_profiles WHERE member_id = v_member;
    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('deleted', true), 'error', NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_delete_face_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_delete_face_profile() TO authenticated;

-- 4d. 갤러리 조회 — 전체/내 사진(mine) 페이지네이션. mine 판정은 사전 계산 매칭 조인.
CREATE OR REPLACE FUNCTION public.fn_get_gallery(p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member UUID;
    v_facility UUID;
    v_mine BOOLEAN := COALESCE((p_payload->>'mine')::BOOLEAN, false);
    v_before TIMESTAMPTZ := NULLIF(p_payload->>'before','')::TIMESTAMPTZ;
    v_limit INT := LEAST(GREATEST(COALESCE((p_payload->>'limit')::INT, 30), 1), 60);
    v_rows JSONB;
BEGIN
    v_member := public.current_member_id();
    IF v_member IS NOT NULL THEN
        SELECT facility_id INTO v_facility FROM public.members WHERE id = v_member;
    ELSIF public.is_admin_or_coach() THEN
        SELECT c.facility_id INTO v_facility FROM public.coaches c WHERE c.user_id = auth.uid() LIMIT 1;
        IF v_facility IS NULL THEN
            v_facility := NULLIF(p_payload->>'facility_id','')::UUID;
        END IF;
    ELSE
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF v_facility IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'facility_required');
    END IF;
    IF v_mine AND v_member IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_only_filter');
    END IF;

    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_rows
    FROM (
        SELECT jsonb_build_object(
            'id', p.id,
            'storage_path', p.storage_path,
            'caption', p.caption,
            'taken_at', p.taken_at,
            'created_at', p.created_at,
            'face_status', p.face_status,
            'face_count', p.face_count,
            'uploader_name', m.name,
            'mine', (v_member IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.gallery_photo_members pm
                WHERE pm.photo_id = p.id AND pm.member_id = v_member))
        ) AS row_data
        FROM public.gallery_photos p
        LEFT JOIN public.members m ON m.id = p.uploader_member_id
        WHERE p.facility_id = v_facility
          AND (v_before IS NULL OR p.created_at < v_before)
          AND (NOT v_mine OR EXISTS (
                SELECT 1 FROM public.gallery_photo_members pm
                WHERE pm.photo_id = p.id AND pm.member_id = v_member))
        ORDER BY p.created_at DESC
        LIMIT v_limit
    ) sub;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('photos', v_rows), 'error', NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_get_gallery(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_gallery(JSONB) TO authenticated;
