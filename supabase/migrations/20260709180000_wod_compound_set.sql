-- WOD 컴파운드 세트(동작 그룹핑) — 한 세션에 여러 동작이 하나의 세트로 바인딩
-- 접근: 플랫 배열 유지 + 라인별 superset_group 태그(짧은 라벨 "A"/"B"). 연속 동일 그룹 = 컴파운드 세트.
-- 하위호환: null/미지정 그룹 ⇒ 기존 플랫 렌더 그대로. 기존 WOD 영향 없음.

-- 1) 템플릿 동작 라인에 그룹 태그 컬럼 (nullable, 하위호환)
ALTER TABLE public.wod_template_movements
    ADD COLUMN IF NOT EXISTS superset_group text;

-- 2) fn_upsert_wod_template — LIVE 정의 재구성. superset_group insert만 추가(그 외 로직 불변, is_member_visible 포함).
CREATE OR REPLACE FUNCTION public.fn_upsert_wod_template(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_id UUID;
    v_movement JSONB;
    v_idx INT := 0;
BEGIN
    v_user_id := public._assert_coach_or_admin();
    v_id := NULLIF(p_payload->>'id','')::UUID;

    IF v_id IS NULL THEN
        INSERT INTO public.wod_templates (
            facility_id, template_kind, title, format_type, time_cap_minutes, rounds,
            description, public_notes, coach_notes, is_shared, is_benchmark,
            is_member_visible, created_by, updated_by)
        VALUES (
            NULLIF(p_payload->>'facility_id','')::UUID,
            COALESCE(p_payload->>'template_kind','daily'),
            p_payload->>'title',
            NULLIF(p_payload->>'format_type',''),
            (p_payload->>'time_cap_minutes')::INT,
            (p_payload->>'rounds')::INT,
            p_payload->>'description', p_payload->>'public_notes', p_payload->>'coach_notes',
            COALESCE((p_payload->>'is_shared')::BOOLEAN, false),
            COALESCE((p_payload->>'is_benchmark')::BOOLEAN, false),
            COALESCE((p_payload->>'is_member_visible')::BOOLEAN, false),
            v_user_id, v_user_id)
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.wod_templates SET
            facility_id       = NULLIF(p_payload->>'facility_id','')::UUID,
            template_kind     = COALESCE(p_payload->>'template_kind', template_kind),
            title             = COALESCE(p_payload->>'title', title),
            format_type       = NULLIF(p_payload->>'format_type',''),
            time_cap_minutes  = (p_payload->>'time_cap_minutes')::INT,
            rounds            = (p_payload->>'rounds')::INT,
            description       = p_payload->>'description',
            public_notes      = p_payload->>'public_notes',
            coach_notes       = p_payload->>'coach_notes',
            is_shared         = COALESCE((p_payload->>'is_shared')::BOOLEAN, is_shared),
            is_benchmark      = COALESCE((p_payload->>'is_benchmark')::BOOLEAN, is_benchmark),
            is_member_visible = COALESCE((p_payload->>'is_member_visible')::BOOLEAN, is_member_visible),
            updated_by        = v_user_id,
            updated_at        = now()
        WHERE id = v_id;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'template_not_found');
        END IF;
    END IF;

    DELETE FROM public.wod_template_movements WHERE wod_template_id = v_id;
    FOR v_movement IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'movements','[]'::jsonb))
    LOOP
        INSERT INTO public.wod_template_movements (
            wod_template_id, sort_order, movement_id, custom_label,
            target_value, target_unit, distance_meters, duration_seconds,
            load_male_rx, load_female_rx, rx_notes, scaling_notes, superset_group)
        VALUES (
            v_id, v_idx,
            NULLIF(v_movement->>'movement_id','')::UUID,
            v_movement->>'custom_label',
            (v_movement->>'target_value')::NUMERIC,
            v_movement->>'target_unit',
            (v_movement->>'distance_meters')::INT,
            (v_movement->>'duration_seconds')::INT,
            v_movement->>'load_male_rx', v_movement->>'load_female_rx',
            v_movement->>'rx_notes', v_movement->>'scaling_notes',
            NULLIF(v_movement->>'superset_group',''));
        v_idx := v_idx + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$function$;

-- 3) fn_list_member_wods — LIVE 정의 재구성. movement jsonb에 superset_group 통과만 추가.
CREATE OR REPLACE FUNCTION public.fn_list_member_wods()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_wods JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'unauthorized');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'title', t.title,
            'format', t.format_type,
            'rounds', t.rounds,
            'time_cap_minutes', t.time_cap_minutes,
            'notes', t.public_notes,
            'movements', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', COALESCE(ml.name_ko, m.custom_label),
                        'target',
                            CASE
                                WHEN m.distance_meters IS NOT NULL THEN m.distance_meters || 'm'
                                WHEN m.duration_seconds IS NOT NULL THEN m.duration_seconds || '초'
                                ELSE m.target_unit
                            END,
                        'reps', m.target_value,
                        'rx_male', m.load_male_rx,
                        'rx_female', m.load_female_rx,
                        'superset_group', m.superset_group
                    )
                    ORDER BY m.sort_order
                )
                FROM public.wod_template_movements m
                LEFT JOIN public.movement_library ml ON ml.id = m.movement_id
                WHERE m.wod_template_id = t.id
            ), '[]'::jsonb)
        )
        ORDER BY t.published_at DESC
    ), '[]'::jsonb)
    INTO v_wods
    FROM public.wod_templates t
    WHERE t.is_member_visible = true
      AND t.published_at IS NOT NULL;

    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('wods', v_wods), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$function$;
