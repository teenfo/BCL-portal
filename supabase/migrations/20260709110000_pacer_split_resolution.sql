-- ============================================================================
-- 20260709110000_pacer_split_resolution.sql
-- 목적 : fn_set_race_pacer 확장 — source가 member_pr/club_record일 때
--        서버가 500m 스플릿을 직접 해석(resolve)해 pacer_config.split_500m에 적재.
--        기존 동작(20260709100000_race_pacer.sql)은 전부 보존하고 해석만 추가.
--
-- 배경(갭) : 종전 구현은 coach_split만 동작 — 클라이언트가 split_500m를 줘야 했다.
--            member_pr/club_record는 서버가 split을 해석하지 않아 페이스 라인 미표시.
--
-- 해석 규칙(렌더 전용 스냅샷 — 순위/집계/race_records 미영향, 15 §4b.5):
--   * 500m 스플릿 소스 두 가지를 통합(fastest = MIN):
--     (a) member_benchmark_results ⨝ benchmark_definitions
--         — metric_type='time' & 이름에 'row' 포함(로잉 시간 벤치마크: 500/1000/2000m Row).
--           result_value(초)를 500m 등가로 환산: value * 500 / 이름_내_거리(m).
--     (b) race_records.avg_pace — 로잉 평균 페이스(=초/500m 스플릿). EXTRACT(EPOCH).
--   * member_pr : p_pacer.member_id 회원의 (a)+(b) 최소값(가장 빠른 스플릿).
--                 member_id 누락 시 error 'member_required'.
--   * club_record: 이벤트 facility 전체 회원/기록의 (a)+(b) 최소값.
--
-- 우선순위 : 명시 split_500m(호출자 입력) > 서버 해석값. (explicit > resolved)
-- 폴백     : 해석 결과가 없으면(기록 없음) 오류 대신 split_500m 없이 config 저장
--            (enabled/source/member_id/label 보존). UI는 "기록 없음" 표시.
--            → 코치 의도(해당 소스로 페이서 활성) 보존이 가장 덜 놀라운 동작.
--            data.resolved(boolean)로 해석 성공 여부를 코치 UI에 전달.
-- 규약     : SECURITY DEFINER + SET search_path=public + auth.uid() 내부 검증 +
--            envelope {success,data,error} (기존과 동일). anon 발행 금지.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_set_race_pacer(p_event_id UUID, p_pacer JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id  UUID;
    v_event     RECORD;
    v_enabled   BOOLEAN;
    v_source    TEXT;
    v_explicit  NUMERIC;   -- 호출자가 명시한 split_500m (신뢰하되 범위 검증)
    v_resolved  NUMERIC;   -- 서버 해석 split_500m (member_pr/club_record)
    v_split     NUMERIC;   -- 최종 저장 split (explicit > resolved)
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

    v_explicit := NULLIF(p_pacer->>'split_500m', '')::NUMERIC;
    v_member   := NULLIF(p_pacer->>'member_id', '')::UUID;
    v_label    := NULLIF(trim(p_pacer->>'label'), '');

    -- 명시 split은 즉시 범위 검증(기존 동작 보존: 잘못된 값은 오류 표면화).
    IF v_explicit IS NOT NULL AND (v_explicit <= 0 OR v_explicit > 3600) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_split');
    END IF;

    -- coach_split은 split_500m 필수(렌더 페이스 라인 계산 기준) — 기존 동작 보존.
    IF v_source = 'coach_split' AND (v_explicit IS NULL OR v_explicit <= 0) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'split_required');
    END IF;

    -- member_pr는 대상 회원 필수.
    IF v_source = 'member_pr' AND v_member IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_required');
    END IF;

    -- 서버 스플릿 해석(명시값이 없을 때만) ------------------------------------
    -- member_benchmark_results(로잉 시간 벤치마크 500m 등가) + race_records.avg_pace 통합.
    IF v_explicit IS NULL AND v_source = 'member_pr' THEN
        SELECT MIN(s.x) INTO v_resolved FROM (
            SELECT mbr.result_value * 500.0
                     / NULLIF(substring(bd.name FROM '(\d+)')::NUMERIC, 0) AS x
            FROM public.member_benchmark_results mbr
            JOIN public.benchmark_definitions bd ON bd.id = mbr.benchmark_id
            WHERE mbr.member_id = v_member
              AND bd.metric_type = 'time'
              AND bd.name ~* 'row'
              AND mbr.result_value > 0
              AND substring(bd.name FROM '(\d+)') IS NOT NULL
            UNION ALL
            SELECT EXTRACT(EPOCH FROM rr.avg_pace)::NUMERIC
            FROM public.race_records rr
            WHERE rr.member_id = v_member
              AND rr.avg_pace IS NOT NULL
        ) s
        WHERE s.x > 0;
    ELSIF v_explicit IS NULL AND v_source = 'club_record' THEN
        SELECT MIN(s.x) INTO v_resolved FROM (
            SELECT mbr.result_value * 500.0
                     / NULLIF(substring(bd.name FROM '(\d+)')::NUMERIC, 0) AS x
            FROM public.member_benchmark_results mbr
            JOIN public.benchmark_definitions bd ON bd.id = mbr.benchmark_id
            JOIN public.members m ON m.id = mbr.member_id
            WHERE m.facility_id = v_event.facility_id
              AND bd.metric_type = 'time'
              AND bd.name ~* 'row'
              AND mbr.result_value > 0
              AND substring(bd.name FROM '(\d+)') IS NOT NULL
            UNION ALL
            SELECT EXTRACT(EPOCH FROM rr.avg_pace)::NUMERIC
            FROM public.race_records rr
            JOIN public.race_events re2 ON re2.id = rr.event_id
            WHERE re2.facility_id = v_event.facility_id
              AND rr.avg_pace IS NOT NULL
        ) s
        WHERE s.x > 0;
    END IF;

    -- 해석값 범위 방어(비정상값은 오류 대신 무시 → 폴백).
    IF v_resolved IS NOT NULL AND (v_resolved <= 0 OR v_resolved > 3600) THEN
        v_resolved := NULL;
    END IF;

    -- 최종 split: explicit > resolved. 둘 다 없으면 NULL(폴백: split 없이 저장).
    v_split := COALESCE(v_explicit, round(v_resolved, 1));

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
        'data', jsonb_build_object(
            'event_id',     p_event_id,
            'pacer_config', v_config,
            'resolved',     (v_split IS NOT NULL)
        ),
        'error', NULL);
END;
$$;

COMMENT ON FUNCTION public.fn_set_race_pacer(uuid, jsonb) IS
    'Race 페이서(가상 페이스) 설정/해제(코치/admin). enabled=false → pacer_config NULL. '
    'member_pr/club_record는 서버가 500m 스플릿 해석(member_benchmark_results 로잉 시간 벤치마크 500m 등가 + race_records.avg_pace의 최소값). '
    '명시 split_500m > 서버 해석값. 해석 실패 시 split 없이 저장(UI "기록 없음"). 렌더 전용(G-10, 15 §4b.5).';

-- 기본권한(ALTER DEFAULT PRIVILEGES)이 anon에 부여될 수 있어 명시 회수 —
-- 코치 RPC 관례({authenticated,service_role,postgres})와 일치(anon 발행 금지).
REVOKE ALL ON FUNCTION public.fn_set_race_pacer(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_set_race_pacer(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_set_race_pacer(uuid, jsonb) TO authenticated;
