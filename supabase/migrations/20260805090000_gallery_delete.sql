-- ============================================================================
-- 20260805090000_gallery_delete.sql
-- 갤러리 본인 업로드 삭제 (docs/07 §8.3b) — DELETE 정책 admin 전용 규칙 유지,
-- 회원 삭제는 RPC(본인 업로드 검증) 경유. 파일 정리는 portal 라우트가 반환 경로로 수행.
--   1) fn_delete_gallery_photo(p_photo_id) — 본인 업로드 또는 admin만. 행 삭제(매칭 CASCADE)
--      후 storage_path/thumb_path 반환(호출측 파일 unlink용).
--   2) fn_get_gallery — is_uploader(본인 업로드 여부) 필드 추가(삭제 버튼 노출 판단).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_delete_gallery_photo(p_photo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member UUID;
    v_row public.gallery_photos;
BEGIN
    IF p_photo_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'photo_id_required');
    END IF;
    v_member := public.current_member_id();
    SELECT * INTO v_row FROM public.gallery_photos WHERE id = p_photo_id;
    IF v_row.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_found');
    END IF;
    -- 본인 업로드 또는 admin — 코치는 삭제 불가(admin 전용 규칙 준수, 필요 시 admin 경유)
    IF NOT (public.is_admin() OR (v_member IS NOT NULL AND v_row.uploader_member_id = v_member)) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    DELETE FROM public.gallery_photos WHERE id = p_photo_id; -- 매칭(gallery_photo_members) CASCADE

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'deleted', true,
            'storage_path', v_row.storage_path,
            'thumb_path', v_row.thumb_path),
        'error', NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_delete_gallery_photo(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_delete_gallery_photo(UUID) TO authenticated;

-- fn_get_gallery 재정의 — is_uploader 추가 (그 외 20260805070000 전문과 동일)
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
            'is_uploader', (v_member IS NOT NULL AND p.uploader_member_id = v_member),
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
