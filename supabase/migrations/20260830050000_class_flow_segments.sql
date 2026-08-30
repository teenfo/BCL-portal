-- ============================================================================
-- Class TV 수업 플로우(세그먼트 타임라인) — docs/05 §3.2 flow 모드 (1차 스프린트)
-- ----------------------------------------------------------------------------
-- session_wods.segments JSONB: 코치가 WodPanel에서 저장하는 세그먼트 플랜.
--   형태 = class-broadcast 계약 FlowSegment[]: [{name, timer, autoStart?, showBoard?}]
--   빈 배열 = 미설정(코치 스크린 제어가 포맷 기반 자동 제안 폴백).
-- 함수 2종은 시그니처 동일 CREATE OR REPLACE — 기존 GRANT(anon/authenticated) 유지.
-- 신규 함수 없음 → 신규 GRANT/REVOKE 불요(20260708020000 DEFAULT PRIVILEGES 참고).
-- ============================================================================

ALTER TABLE public.session_wods
    ADD COLUMN IF NOT EXISTS segments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.session_wods.segments IS
'수업 세그먼트 플랜 [{name, timer(TimerCommand), autoStart?, showBoard?}] — 계약 SSOT는 src/features/class-broadcast/contract.ts FlowSegment. TV flow 모드는 Broadcast flow 명령으로 수신(§4.1), 이 컬럼은 코치 플랜 영속·자동 제안 시드. Display-Safe: 타이머 구성만 담김(개인정보 없음)';

-- E.8 fn_upsert_session_wod — segments passthrough 추가 (원본: 20260708009000_rpc.sql)
CREATE OR REPLACE FUNCTION public.fn_upsert_session_wod(p_session_id UUID, p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := public._assert_coach_can_edit_session(p_session_id);

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
        COALESCE(p_payload->'segments','[]'::jsonb),
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

-- E.10 fn_get_class_display_wod — segments 반환 추가 (anon GRANT 유지 — 시그니처 동일)
--      Display-Safe: segments는 타이머 구성만 담는 공개 데이터(개인정보 원천 미포함)
CREATE OR REPLACE FUNCTION public.fn_get_class_display_wod(
    p_facility_id UUID DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE,
    p_session_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
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
        'published_at', sw.published_at)
    INTO v_data
    FROM public.session_wods sw
    JOIN public.sessions s ON s.id = sw.session_id
    LEFT JOIN public.wod_templates wt ON wt.id = sw.template_id
    WHERE sw.publish_state = 'published'
      AND (p_session_id IS NULL OR sw.session_id = p_session_id)
      AND (p_session_id IS NOT NULL OR s.session_date = p_date)
      AND (p_facility_id IS NULL OR s.facility_id = p_facility_id)
    ORDER BY s.session_date DESC, s.start_time DESC, sw.published_at DESC
    LIMIT 1;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;
