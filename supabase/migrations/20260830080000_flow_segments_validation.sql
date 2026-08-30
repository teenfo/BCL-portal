-- ============================================================================
-- fn_upsert_session_wod — segments 형태 검증 (docs/05 §3.2 flow 후속)
-- ----------------------------------------------------------------------------
-- 20260830050000이 segments를 무검증 passthrough 저장 — 비배열/비객체 JSONB가
-- anon 표면(fn_get_class_display_wod)으로 그대로 반사되어 코치 패널·TV 렌더가
-- 깨질 수 있다. 배열 + 요소 객체 형태만 저장 허용(그 외 error envelope).
-- 시그니처 동일 CREATE OR REPLACE — 기존 GRANT 유지, 신규 GRANT/REVOKE 불요.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_upsert_session_wod(p_session_id UUID, p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
    v_segments JSONB;
BEGIN
    v_user_id := public._assert_coach_can_edit_session(p_session_id);

    -- 세그먼트 플랜 형태 검증 — 계약 FlowSegment[](contract.ts) 최소 보장: 배열 + 요소 객체
    v_segments := COALESCE(p_payload->'segments', '[]'::jsonb);
    IF jsonb_typeof(v_segments) <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL,
            'error', 'segments는 배열이어야 합니다');
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_segments) e
        WHERE jsonb_typeof(e.value) <> 'object'
    ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL,
            'error', 'segments 항목은 객체여야 합니다');
    END IF;

    INSERT INTO public.session_wods (
        session_id, template_id, publish_state, title_override, format_override,
        time_cap_override, description_override, movements_snapshot, segments,
        coach_notes, class_display_notes, edited_by)
    VALUES (
        p_session_id,
        NULLIF(p_payload->>'template_id','')::UUID,
        'draft',
        p_payload->>'title_override',
        NULLIF(p_payload->>'format_override',''),
        (p_payload->>'time_cap_override')::INT,
        p_payload->>'description_override',
        COALESCE(p_payload->'movements_snapshot','[]'::jsonb),
        v_segments,
        p_payload->>'coach_notes',
        p_payload->>'class_display_notes',
        v_user_id)
    ON CONFLICT (session_id) DO UPDATE SET
        template_id          = EXCLUDED.template_id,
        title_override       = EXCLUDED.title_override,
        format_override      = EXCLUDED.format_override,
        time_cap_override    = EXCLUDED.time_cap_override,
        description_override = EXCLUDED.description_override,
        movements_snapshot   = EXCLUDED.movements_snapshot,
        segments             = EXCLUDED.segments,
        coach_notes          = EXCLUDED.coach_notes,
        class_display_notes  = EXCLUDED.class_display_notes,
        edited_by            = v_user_id,
        updated_at           = now()
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;
