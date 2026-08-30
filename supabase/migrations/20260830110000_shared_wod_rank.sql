-- ============================================================================
-- WOD 결과 랭킹 규칙 단일화 (기획서 2-1 "정렬 정의를 코치용 RPC와 단일 공유")
-- ----------------------------------------------------------------------------
-- 종전: 같은 ORDER BY(Rx 계층 → score_type 방향 → 기록시각)가 코치용
--   fn_get_session_wod_whiteboard 와 TV용 fn_get_class_wod_board 두 곳에 복제.
--   결과는 같아도 한쪽만 고치면 코치 화면과 TV 순위가 어긋난다.
-- 변경: 순위 계산만 내부 헬퍼 _rank_session_wod_results 로 뽑고, 두 RPC는
--   결과 id로 조인해 각자의 컬럼만 투영한다(Display-Safe 경계 유지 —
--   TV는 note·member_id·avatar_url을 여전히 SELECT하지 않는다).
-- 헬퍼는 내부 전용: DEFAULT PRIVILEGES로 새 함수에 붙는 anon EXECUTE를 회수한다.
-- ============================================================================

CREATE OR REPLACE FUNCTION public._rank_session_wod_results(p_session_wod_id UUID)
RETURNS TABLE (result_id UUID, rank INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT r.id,
           (ROW_NUMBER() OVER (
               ORDER BY CASE r.rx_status WHEN 'rx_plus' THEN 0 WHEN 'rx' THEN 1 ELSE 2 END,
                        CASE WHEN r.score_type = 'time' THEN r.score END ASC NULLS LAST,
                        CASE WHEN r.score_type <> 'time' THEN r.score END DESC NULLS LAST,
                        r.created_at ASC
           ))::INT
    FROM public.session_wod_results r
    WHERE r.session_wod_id = p_session_wod_id;
$$;

COMMENT ON FUNCTION public._rank_session_wod_results(uuid) IS
'세션 WOD 결과 순위 규칙 단일 정의(Rx+→Rx→Scaled → time 오름/그 외 내림 → 기록시각). 내부 전용 — 코치·TV 화이트보드 RPC가 공유';

REVOKE ALL ON FUNCTION public._rank_session_wod_results(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._rank_session_wod_results(uuid) FROM anon;
REVOKE ALL ON FUNCTION public._rank_session_wod_results(uuid) FROM authenticated;

-- 코치용(authenticated) — note·avatar 포함 투영 유지
CREATE OR REPLACE FUNCTION public.fn_get_session_wod_whiteboard(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_wod RECORD;
    v_results JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'no_session');
    END IF;

    SELECT sw.id, sw.session_id, COALESCE(sw.title_override, wt.title) AS wod_title,
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

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.rank), '[]'::jsonb) INTO v_results
    FROM (
        SELECT k.rank,
               m.name AS member_name, m.avatar_url,
               r.member_id, r.score, r.score_type, r.rx_status, r.note, r.created_at
        FROM public.session_wod_results r
        JOIN public._rank_session_wod_results(v_wod.id) k ON k.result_id = r.id
        JOIN public.members m ON m.id = r.member_id
        WHERE r.session_wod_id = v_wod.id
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'session_id', v_wod.session_id, 'session_title', v_wod.session_title,
            'session_date', v_wod.session_date,
            'wod_title', v_wod.wod_title, 'format', v_wod.format,
            'results', v_results),
        'error', NULL);
END;
$$;

-- TV용(anon, Display-Safe) — 이름·점수·rx·기록시각만 투영(note·member_id 미SELECT 유지)
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
        SELECT k.rank,
               m.name AS member_name,
               r.score, r.score_type, r.rx_status, r.created_at
        FROM public.session_wod_results r
        JOIN public._rank_session_wod_results(v_wod.id) k ON k.result_id = r.id
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
