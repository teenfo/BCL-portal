-- ============================================================================
-- 협동 모드(팀 합산 목표) — 기획서 2-3
-- ----------------------------------------------------------------------------
-- 수업 전체가 하나의 목표를 함께 채우는 화면(예: "클래스 합계 5,000m").
--   · 목표는 세션 WOD 속성이다 → session_wods에 coop_target/coop_unit/coop_label 추가.
--   · 합산은 기록의 score_type이 목표 단위와 같은 계열일 때만 더한다
--     (reps↔reps · m↔distance · cal↔calories · kg↔weight). time·rounds_reps는
--     단순 합산이 의미를 갖지 않으므로 제외하고, 제외 건수를 함께 돌려준다
--     (TV가 "합산 제외 n건"을 밝힐 수 있게 — 조용히 빠지면 총합이 틀린 것처럼 보인다).
--   · Display-Safe: 이름·기여값·합계만. member_id·note는 미SELECT.
-- ============================================================================

ALTER TABLE public.session_wods
    ADD COLUMN IF NOT EXISTS coop_target NUMERIC,
    ADD COLUMN IF NOT EXISTS coop_unit   VARCHAR(8),
    ADD COLUMN IF NOT EXISTS coop_label  VARCHAR(60);

COMMENT ON COLUMN public.session_wods.coop_target IS '협동 모드 목표 수량(NULL=협동 모드 미사용)';
COMMENT ON COLUMN public.session_wods.coop_unit  IS '협동 목표 단위: reps·m·cal·kg (기록 score_type과 매칭)';
COMMENT ON COLUMN public.session_wods.coop_label IS '협동 목표 표시명(예: 클래스 합계 로잉)';

-- ── 저장부 — 신규 3컬럼 반영 (시그니처 동일 CREATE OR REPLACE: GRANT 유지) ──
CREATE OR REPLACE FUNCTION public.fn_upsert_session_wod(p_session_id UUID, p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
    v_segments JSONB;
    v_coop_unit TEXT;
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

    -- 협동 목표 단위 화이트리스트 — 합산 가능한 계열만(그 외는 목표를 만들 수 없다)
    v_coop_unit := NULLIF(p_payload->>'coop_unit', '');
    IF v_coop_unit IS NOT NULL AND v_coop_unit NOT IN ('reps', 'm', 'cal', 'kg') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL,
            'error', 'coop_unit은 reps·m·cal·kg 중 하나여야 합니다');
    END IF;

    INSERT INTO public.session_wods (
        session_id, template_id, publish_state, title_override, format_override,
        time_cap_override, description_override, movements_snapshot, segments,
        coop_target, coop_unit, coop_label,
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
        (NULLIF(p_payload->>'coop_target',''))::NUMERIC,
        v_coop_unit,
        NULLIF(p_payload->>'coop_label',''),
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
        coop_target          = EXCLUDED.coop_target,
        coop_unit            = EXCLUDED.coop_unit,
        coop_label           = EXCLUDED.coop_label,
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

-- ── TV 조회부(anon, Display-Safe) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_get_class_coop_board(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_wod RECORD;
    v_score_type TEXT;
    v_total NUMERIC;
    v_contributors INT;
    v_excluded INT;
    v_leaders JSONB;
BEGIN
    IF p_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_required');
    END IF;

    SELECT sw.id, sw.coop_target, sw.coop_unit, sw.coop_label,
           COALESCE(sw.title_override, wt.title) AS wod_title
    INTO v_wod
    FROM public.session_wods sw
    JOIN public.sessions s ON s.id = sw.session_id
    LEFT JOIN public.wod_templates wt ON wt.id = sw.template_id
    WHERE sw.session_id = p_session_id AND sw.publish_state = 'published';

    IF v_wod.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_wod_not_published');
    END IF;
    IF v_wod.coop_target IS NULL OR v_wod.coop_unit IS NULL THEN
        -- 목표 미설정 = 협동 모드 아님(오류가 아니라 '없음')
        RETURN jsonb_build_object('success', true, 'data', NULL, 'error', NULL);
    END IF;

    v_score_type := CASE v_wod.coop_unit
                        WHEN 'reps' THEN 'reps'
                        WHEN 'm'    THEN 'distance'
                        WHEN 'cal'  THEN 'calories'
                        WHEN 'kg'   THEN 'weight'
                    END;

    SELECT COALESCE(SUM(r.score) FILTER (WHERE r.score_type = v_score_type), 0),
           COUNT(DISTINCT r.member_id) FILTER (WHERE r.score_type = v_score_type),
           COUNT(*) FILTER (WHERE r.score_type <> v_score_type)
    INTO v_total, v_contributors, v_excluded
    FROM public.session_wod_results r
    WHERE r.session_wod_id = v_wod.id;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.value DESC), '[]'::jsonb) INTO v_leaders
    FROM (
        SELECT m.name AS member_name, SUM(r.score) AS value
        FROM public.session_wod_results r
        JOIN public.members m ON m.id = r.member_id
        WHERE r.session_wod_id = v_wod.id AND r.score_type = v_score_type
        GROUP BY m.name
        ORDER BY value DESC
        LIMIT 3
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'session_id', p_session_id,
            'label', COALESCE(v_wod.coop_label, v_wod.wod_title, '클래스 합계'),
            'unit', v_wod.coop_unit,
            'target', v_wod.coop_target,
            'total', v_total,
            'contributors', COALESCE(v_contributors, 0),
            'excluded', COALESCE(v_excluded, 0),
            'leaders', v_leaders),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.fn_get_class_coop_board(uuid) IS
'TV 협동 모드 집계(목표·합계·기여자·상위 3인). 목표 단위와 같은 계열의 기록만 합산 — Display-Safe';

REVOKE ALL ON FUNCTION public.fn_get_class_coop_board(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_class_coop_board(uuid) TO anon, authenticated;
