-- ============================================================================
-- 20260709100000_race_pacer.sql
-- 목적 : Race 페이서(가상 페이스) — G-10 / docs/15 §4b.5.
--        race_events.pacer_config(jsonb) 컬럼 + 설정 RPC fn_set_race_pacer.
--        페이서는 "렌더 전용" 목표 페이스 기준선 — race_records/집계/순위 미영향(§4b.5).
--        클라이언트(Class TV)는 race_events anon SELECT로 pacer_config를 읽어
--        rAF 루프에서 페이스 라인을 그린다(별도 조회 RPC 불필요).
-- 규약 : SECURITY DEFINER + SET search_path=public + auth.uid() 내부 검증 +
--        envelope {success,data,error}. 클라이언트가 coach_id 전달 금지.
-- ============================================================================

-- 1) pacer_config 컬럼 ---------------------------------------------------------
ALTER TABLE public.race_events
    ADD COLUMN IF NOT EXISTS pacer_config JSONB;

COMMENT ON COLUMN public.race_events.pacer_config IS
    '버추얼 페이서 설정(G-10, 15 §4b.5) — {enabled, source(coach_split|member_pr|club_record), split_500m(초/500m), member_id?, label?}. 렌더 전용: 순위·팀합산·race_records 적재 미포함. NULL=페이서 없음.';

-- 2) fn_set_race_pacer(p_event_id, p_pacer) -----------------------------------
--    코치/admin가 컨트롤 룸에서 페이서를 설정/해제. 서버가 shape 정규화 후 저장.
--    소유 검증: admin || 이벤트 소유 코치 || 세션 담당 코치(fn_finish_race_event와 동일 규칙).
CREATE OR REPLACE FUNCTION public.fn_set_race_pacer(p_event_id UUID, p_pacer JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id  UUID;
    v_event     RECORD;
    v_enabled   BOOLEAN;
    v_source    TEXT;
    v_split     NUMERIC;
    v_member    UUID;
    v_label     TEXT;
    v_config    JSONB;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;

    SELECT re.* INTO v_event FROM public.race_events re WHERE re.id = p_event_id;
    IF v_event.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_not_found');
    END IF;

    IF NOT public.is_admin()
       AND v_event.coach_id IS DISTINCT FROM v_coach_id
       AND NOT EXISTS (
           SELECT 1 FROM public.session_coaches sc
           WHERE sc.session_id = v_event.session_id AND sc.coach_id = v_coach_id
       ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;

    -- shape 정규화(클라이언트 입력 불신) ---------------------------------------
    v_enabled := COALESCE((p_pacer->>'enabled')::BOOLEAN, false);

    IF NOT v_enabled THEN
        -- 해제: NULL 저장(페이서 없음)
        UPDATE public.race_events SET pacer_config = NULL, updated_at = now()
        WHERE id = p_event_id;
        RETURN jsonb_build_object('success', true,
            'data', jsonb_build_object('event_id', p_event_id, 'pacer_config', NULL),
            'error', NULL);
    END IF;

    v_source := COALESCE(NULLIF(p_pacer->>'source', ''), 'coach_split');
    IF v_source NOT IN ('coach_split', 'member_pr', 'club_record') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_source');
    END IF;

    v_split  := NULLIF(p_pacer->>'split_500m', '')::NUMERIC;
    v_member := NULLIF(p_pacer->>'member_id', '')::UUID;
    v_label  := NULLIF(trim(p_pacer->>'label'), '');

    -- coach_split은 split_500m 필수(렌더 페이스 라인 계산 기준). 여타 소스는
    -- 향후 서버 조회(member_benchmark_results/race_records)로 split 해석 여지(⏳) —
    -- 현 구현은 저장된 split_500m로 클라이언트가 페이스 라인을 그린다.
    IF v_source = 'coach_split' AND (v_split IS NULL OR v_split <= 0) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'split_required');
    END IF;
    IF v_split IS NOT NULL AND (v_split <= 0 OR v_split > 3600) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_split');
    END IF;

    v_config := jsonb_strip_nulls(jsonb_build_object(
        'enabled',    true,
        'source',     v_source,
        'split_500m', v_split,
        'member_id',  v_member,
        'label',      v_label
    ));

    UPDATE public.race_events SET pacer_config = v_config, updated_at = now()
    WHERE id = p_event_id;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', p_event_id, 'pacer_config', v_config),
        'error', NULL);
END;
$$;

COMMENT ON FUNCTION public.fn_set_race_pacer(uuid, jsonb) IS
    'Race 페이서(가상 페이스) 설정/해제(코치/admin). enabled=false → pacer_config NULL. 렌더 전용(G-10, 15 §4b.5).';

-- 기본권한(ALTER DEFAULT PRIVILEGES)이 anon에 부여될 수 있어 명시 회수 —
-- 코치 RPC 관례({authenticated,service_role,postgres})와 일치(anon 발행 금지).
REVOKE ALL ON FUNCTION public.fn_set_race_pacer(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_set_race_pacer(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_set_race_pacer(uuid, jsonb) TO authenticated;
