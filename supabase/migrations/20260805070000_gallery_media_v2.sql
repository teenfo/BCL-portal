-- ============================================================================
-- 20260805070000_gallery_media_v2.sql
-- 갤러리 미디어 v2 (docs/07 §8.3b) — 사용자 결정: 원본 미디어·원시 임베딩을 실서버로.
--   1) 동영상 지원: media_type('photo'|'video') + thumb_path(워커 생성 포스터) + duration_s
--   2) 원본 미디어는 Supabase Storage 대신 실서버 볼륨(gallery-media) — 업로드/서빙은
--      portal API 라우트(/api/gallery/*)가 쿠키 세션+RLS로 수행. storage_path 의미는
--      "볼륨 내 상대 경로"로 재정의(경로 규약 {facility_id}/{yyyymm}/{uuid}.ext 동일).
--      기존 gallery/selfies 버킷·Storage 정책은 미사용 전환(하위호환 위해 유지, 신규 쓰기 없음).
--   3) 원시 얼굴 임베딩은 face-service 로컬 SQLite로 이전 — gallery_photo_faces DROP.
--      ※ 파괴 DDL 예외 사유: 본 테이블은 20260805050000에서 생성 직후(워커 미기동·실서버
--        미배포)로 원격 행 0건 확인, 또한 임베딩은 원본 사진에서 재분석 가능한 파생 데이터.
--      member_face_profiles.embedding 은 DB 유지 — 셀피 원본 파기 후 유일본(복구 불가)이므로.
-- ============================================================================

-- ── 1) gallery_photos 확장 ─────────────────────────────────────────────────
ALTER TABLE public.gallery_photos
    ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) NOT NULL DEFAULT 'photo'
        CHECK (media_type IN ('photo','video')),
    ADD COLUMN IF NOT EXISTS thumb_path TEXT,   -- 동영상 포스터(워커 생성, 볼륨 상대 경로)
    ADD COLUMN IF NOT EXISTS duration_s REAL;   -- 동영상 길이(워커 기록)

COMMENT ON COLUMN public.gallery_photos.storage_path IS
    '실서버 gallery-media 볼륨 내 상대 경로 {facility_id}/{yyyymm}/{uuid}.ext (v2 — Supabase Storage 미사용)';

-- ── 2) 원시 임베딩 테이블 제거 (face-service SQLite 이전) ───────────────────
DROP TABLE IF EXISTS public.gallery_photo_faces;

-- ── 3) RPC 재정의 ───────────────────────────────────────────────────────────
-- 3a. 사진/동영상 등록 — media_type 수용 (그 외 20260805050000 전문과 동일)
CREATE OR REPLACE FUNCTION public.fn_register_gallery_photo(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member UUID;
    v_facility UUID;
    v_path TEXT;
    v_media TEXT;
    v_row public.gallery_photos;
BEGIN
    v_path := NULLIF(trim(p_payload->>'storage_path'), '');
    IF v_path IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'storage_path_required');
    END IF;
    v_media := COALESCE(NULLIF(p_payload->>'media_type',''), 'photo');
    IF v_media NOT IN ('photo','video') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_media_type');
    END IF;

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

    IF split_part(v_path, '/', 1) <> v_facility::text THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_path');
    END IF;

    INSERT INTO public.gallery_photos
        (facility_id, uploader_member_id, session_id, storage_path, media_type, caption, taken_at)
    VALUES (v_facility, v_member,
            NULLIF(p_payload->>'session_id','')::UUID,
            v_path, v_media,
            NULLIF(trim(p_payload->>'caption'), ''),
            NULLIF(p_payload->>'taken_at','')::TIMESTAMPTZ)
    ON CONFLICT (storage_path) DO NOTHING
    RETURNING * INTO v_row;
    IF v_row.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'duplicate_path');
    END IF;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('photo_id', v_row.id, 'face_status', v_row.face_status,
                                   'media_type', v_row.media_type), 'error', NULL);
END;
$$;

-- 3b. 갤러리 조회 — media_type/thumb_path/duration_s 반환 (그 외 동일)
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
            'media_type', p.media_type,
            'thumb_path', p.thumb_path,
            'duration_s', p.duration_s,
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
