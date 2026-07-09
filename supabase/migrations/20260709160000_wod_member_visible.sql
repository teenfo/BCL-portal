-- WOD 회원 공개 (docs/03 회원 앱 · 02-admin §3.8 WOD 스튜디오)
-- 1) wod_templates.is_member_visible 토글 컬럼 추가
-- 2) fn_upsert_wod_template: is_member_visible 읽어 저장 (기존 로직 전부 보존, 컬럼 1개만 추가)
-- 3) fn_list_member_wods: 회원 앱 공개 WOD 목록 (게시본 + 공개 토글 ON, Display-Safe)

-- 1) 컬럼 --------------------------------------------------------------------
ALTER TABLE public.wod_templates
  ADD COLUMN IF NOT EXISTS is_member_visible boolean NOT NULL DEFAULT false;

-- 2) upsert RPC 갱신 (라이브 정의 기준 + is_member_visible 추가) --------------
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
            load_male_rx, load_female_rx, rx_notes, scaling_notes)
        VALUES (
            v_id, v_idx,
            NULLIF(v_movement->>'movement_id','')::UUID,
            v_movement->>'custom_label',
            (v_movement->>'target_value')::NUMERIC,
            v_movement->>'target_unit',
            (v_movement->>'distance_meters')::INT,
            (v_movement->>'duration_seconds')::INT,
            v_movement->>'load_male_rx', v_movement->>'load_female_rx',
            v_movement->>'rx_notes', v_movement->>'scaling_notes');
        v_idx := v_idx + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$function$;

-- 3) 회원 앱 공개 WOD 목록 RPC ----------------------------------------------
-- 게시본(published_at NOT NULL) + is_member_visible=true 만 노출.
-- Display-Safe: coach_notes/정산/부상 등 내부 정보 미포함 (public_notes만 notes로 노출).
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
    -- 로그인 회원(authenticated) 검증 — 클라이언트가 식별자 전달하지 않음
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
                        'rx_female', m.load_female_rx
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

REVOKE ALL ON FUNCTION public.fn_list_member_wods() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_list_member_wods() FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_list_member_wods() TO authenticated;
