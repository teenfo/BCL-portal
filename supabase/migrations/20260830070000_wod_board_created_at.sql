-- ============================================================================
-- Class TV 라이브 화이트보드 — 기록 시각 반환 (Class TV 2.0 플랜 2-1 정렬 옵션 3종)
-- ----------------------------------------------------------------------------
-- fn_get_class_wod_board 재정의: results 행에 created_at 추가(기록순 정렬용).
-- Display-Safe 불변: 이름+점수+rx 배지+기록시각만(note·member_id·avatar 미노출).
-- 시그니처 동일 CREATE OR REPLACE — anon GRANT 유지.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_class_wod_board(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_wod RECORD;
    v_data JSONB;
BEGIN
    IF p_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_required');
    END IF;

    SELECT sw.id, COALESCE(sw.title_override, wt.title) AS wod_title,
           COALESCE(sw.format_override, wt.format_type) AS format,
           s.session_date, s.title AS session_title
    INTO v_wod
    FROM public.session_wods sw
    JOIN public.sessions s ON s.id = sw.session_id
    LEFT JOIN public.wod_templates wt ON wt.id = sw.template_id
    WHERE sw.session_id = p_session_id AND sw.publish_state = 'published';
    IF v_wod.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_wod_not_published');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.rank), '[]'::jsonb) INTO v_data
    FROM (
        SELECT ROW_NUMBER() OVER (
                   ORDER BY CASE r.rx_status WHEN 'rx_plus' THEN 0 WHEN 'rx' THEN 1 ELSE 2 END,
                            CASE WHEN r.score_type = 'time' THEN r.score END ASC NULLS LAST,
                            CASE WHEN r.score_type <> 'time' THEN r.score END DESC NULLS LAST,
                            r.created_at ASC
               ) AS rank,
               m.name AS member_name,
               r.score, r.score_type, r.rx_status, r.created_at
        FROM public.session_wod_results r
        JOIN public.members m ON m.id = r.member_id
        WHERE r.session_wod_id = v_wod.id
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'session_id', p_session_id, 'session_title', v_wod.session_title,
            'session_date', v_wod.session_date, 'wod_title', v_wod.wod_title,
            'format', v_wod.format, 'results', v_data),
        'error', NULL);
END;
$$;

COMMENT ON FUNCTION public.fn_get_class_wod_board(uuid) IS
'ANON Class TV 일일 WOD 화이트보드(이름+점수+rx 배지+기록시각, Rx+→Rx→Scaled 정렬). 개인 메모 미포함. created_at은 기록순 정렬 옵션용(2-1)';
