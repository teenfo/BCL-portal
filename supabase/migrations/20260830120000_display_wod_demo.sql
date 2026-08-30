-- ============================================================================
-- fn_get_class_display_wod — 동작 시범 자료 조인 (기획서 1-1 "동작 데모 바인딩")
-- ----------------------------------------------------------------------------
-- movements_snapshot의 각 동작에 movement_library의 시범 자료를 붙여 반환한다:
--   demo_video_url / demo_thumb_url / demo_points(코칭 포인트)
-- 매칭은 스냅샷의 name ↔ movement_library.name_ko (공백·대소문자 무시). 라이브러리에
-- 없거나 자료가 비면 필드는 없는 채로 둔다(TV가 알아서 생략).
-- Display-Safe: 라이브러리는 운동 사전이라 개인정보가 없다. 스냅샷 원본 키는 보존.
-- 시그니처 동일 CREATE OR REPLACE — anon GRANT 유지.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_class_display_wod(
    p_facility_id UUID DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE,
    p_session_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
    v_wod_id UUID;
    v_movements JSONB;
BEGIN
    SELECT jsonb_build_object(
        'session_id', sw.session_id, 'session_title', s.title,
        'session_date', s.session_date, 'session_start', s.start_time, 'session_end', s.end_time,
        'wod_id', sw.id,
        'title', COALESCE(sw.title_override, wt.title),
        'format', COALESCE(sw.format_override, wt.format_type),
        'time_cap_minutes', COALESCE(sw.time_cap_override, wt.time_cap_minutes),
        'rounds', wt.rounds,
        'description', COALESCE(sw.description_override, wt.description),
        'movements_snapshot', sw.movements_snapshot,
        'segments', sw.segments,
        'class_display_notes', sw.class_display_notes,
        'published_at', sw.published_at),
      sw.id
    INTO v_data, v_wod_id
    FROM public.session_wods sw
    JOIN public.sessions s ON s.id = sw.session_id
    LEFT JOIN public.wod_templates wt ON wt.id = sw.template_id
    WHERE sw.publish_state = 'published'
      AND (p_session_id IS NULL OR sw.session_id = p_session_id)
      AND (p_session_id IS NOT NULL OR s.session_date = p_date)
      AND (p_facility_id IS NULL OR s.facility_id = p_facility_id)
    ORDER BY s.session_date DESC, s.start_time DESC, sw.published_at DESC
    LIMIT 1;

    IF v_data IS NULL THEN
        RETURN jsonb_build_object('success', true, 'data', NULL, 'error', NULL);
    END IF;

    -- 동작별 시범 자료 부착(순서 보존 — ordinality로 원 순서 유지)
    SELECT COALESCE(jsonb_agg(
             CASE WHEN ml.id IS NULL THEN e.value
                  ELSE e.value
                       || CASE WHEN ml.video_url     IS NOT NULL THEN jsonb_build_object('demo_video_url', ml.video_url) ELSE '{}'::jsonb END
                       || CASE WHEN ml.thumbnail_url IS NOT NULL THEN jsonb_build_object('demo_thumb_url', ml.thumbnail_url) ELSE '{}'::jsonb END
                       || CASE WHEN NULLIF(ml.coaching_points,'') IS NOT NULL THEN jsonb_build_object('demo_points', ml.coaching_points) ELSE '{}'::jsonb END
             END
             ORDER BY e.ord), '[]'::jsonb)
    INTO v_movements
    FROM jsonb_array_elements(COALESCE(v_data->'movements_snapshot','[]'::jsonb)) WITH ORDINALITY AS e(value, ord)
    LEFT JOIN LATERAL (
        SELECT m.id, m.video_url, m.thumbnail_url, m.coaching_points
        FROM public.movement_library m
        WHERE m.is_active
          AND lower(regexp_replace(m.name_ko, '\s+', '', 'g'))
              = lower(regexp_replace(COALESCE(e.value->>'name',''), '\s+', '', 'g'))
        LIMIT 1
    ) ml ON TRUE;

    v_data := jsonb_set(v_data, '{movements_snapshot}', v_movements);

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;
