-- ============================================================================
-- BCL Portal — race_lane_assignment.sql
-- ----------------------------------------------------------------------------
-- 목적 : 코치/admin 레인 배정 — race_live_state 에 (event, device, lane, member) 배정.
--        fn_prepare_race_session/fn_create_coach_race_event 는 이벤트만 만들고 참가자 미배정.
--        이 마이그레이션이 그 공백(레인 배정 UI/RPC)을 채운다.
-- 의존 : 05_race (race_events/race_live_state/pm5_devices), 03 (sessions/bookings/checkins/
--        session_coaches), 01 (members/coaches).
-- 규약 : SECURITY DEFINER + SET search_path=public · envelope {success,data,error} 1종 ·
--        내부 auth.uid() 검증(클라이언트 coach_id 미전달) · authenticated GRANT / anon REVOKE.
-- 안전 : fn_set_race_lanes 는 lobby_status IN ('setup','lobby')에서만 — 진행 중 레이스 미교란.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (1) fn_get_assignable_roster(p_event_id) — 배정 화면 소스(회원/기기/현재 배정)
--     회원 = 세션 로스터(확정 예약 + 체크인) ∪ 시설 회원(source roster|facility)
--     기기 = 시설 PM5 목록 · current = 이벤트의 현재 race_live_state 배정
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_assignable_roster(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_coach_id  UUID;
    v_event     RECORD;
    v_members   JSONB;
    v_devices   JSONB;
    v_current   JSONB;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF p_event_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_required');
    END IF;

    SELECT id, facility_id, session_id, coach_id INTO v_event
    FROM public.race_events WHERE id = p_event_id;
    IF v_event.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_not_found');
    END IF;

    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    IF NOT public.is_admin()
       AND v_event.coach_id IS DISTINCT FROM v_coach_id
       AND NOT EXISTS (SELECT 1 FROM public.session_coaches sc
                       WHERE sc.session_id = v_event.session_id AND sc.coach_id = v_coach_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_assigned');
    END IF;

    -- 회원: 세션 로스터(확정 예약 ∪ 체크인) 우선(source=roster), 그 외 시설 활성 회원(source=facility)
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.source_rank, t.name), '[]'::jsonb) INTO v_members
    FROM (
        SELECT m.id AS member_id, m.name,
               CASE WHEN r.member_id IS NOT NULL THEN 'roster' ELSE 'facility' END AS source,
               CASE WHEN r.member_id IS NOT NULL THEN 0 ELSE 1 END AS source_rank
        FROM public.members m
        LEFT JOIN (
            SELECT DISTINCT member_id FROM (
                SELECT b.member_id
                FROM public.bookings b
                WHERE v_event.session_id IS NOT NULL
                  AND b.session_id = v_event.session_id
                  AND b.status = 'confirmed'
                UNION
                SELECT c.member_id
                FROM public.checkins c
                WHERE v_event.session_id IS NOT NULL
                  AND c.session_id = v_event.session_id
            ) roster_src
        ) r ON r.member_id = m.id
        WHERE m.status = 'active'
          AND (
                r.member_id IS NOT NULL
                OR (v_event.facility_id IS NOT NULL AND m.facility_id = v_event.facility_id)
              )
    ) t;

    -- 기기: 이벤트 시설의 PM5 목록
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.serial_number), '[]'::jsonb) INTO v_devices
    FROM (
        SELECT d.id AS device_id, d.serial_number, d.device_type, d.status
        FROM public.pm5_devices d
        WHERE v_event.facility_id IS NOT NULL AND d.facility_id = v_event.facility_id
    ) t;

    -- 현재 배정
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.lane_number), '[]'::jsonb) INTO v_current
    FROM (
        SELECT ls.device_id, ls.lane_number, ls.member_id, ls.team_id
        FROM public.race_live_state ls
        WHERE ls.event_id = p_event_id
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'event_id', p_event_id,
            'lobby_status', (SELECT lobby_status FROM public.race_events WHERE id = p_event_id),
            'members', v_members,
            'devices', v_devices,
            'current', v_current),
        'error', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_assignable_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_assignable_roster(uuid) TO authenticated;
COMMENT ON FUNCTION public.fn_get_assignable_roster(uuid) IS
'레인 배정 소스(코치/admin): 세션 로스터∪시설 회원 + 시설 PM5 기기 + 현재 race_live_state 배정.';

-- ----------------------------------------------------------------------------
-- (2) fn_set_race_lanes(p_event_id, p_lanes) — 레인 배정 전체 교체(pre-race 전용)
--     p_lanes = [{device_id, lane_number, member_id|null, team_id|null}, ...]
--     UPSERT ON CONFLICT(event_id, device_id) + 페이로드에 없는 기기 행은 DELETE(전체 교체).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_race_lanes(p_event_id UUID, p_lanes JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id    UUID;
    v_event       RECORD;
    v_lane        JSONB;
    v_device_id   UUID;
    v_lane_number INT;
    v_member_id   UUID;
    v_team_id     UUID;
    v_device_ids  UUID[] := ARRAY[]::UUID[];
    v_count       INT := 0;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF p_event_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_required');
    END IF;

    SELECT id, facility_id, session_id, coach_id, lobby_status INTO v_event
    FROM public.race_events WHERE id = p_event_id;
    IF v_event.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_not_found');
    END IF;

    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    IF NOT public.is_admin()
       AND v_event.coach_id IS DISTINCT FROM v_coach_id
       AND NOT EXISTS (SELECT 1 FROM public.session_coaches sc
                       WHERE sc.session_id = v_event.session_id AND sc.coach_id = v_coach_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_assigned');
    END IF;

    -- 진행 중 레이스는 배정 변경 금지 (setup/lobby 에서만 편집)
    IF v_event.lobby_status NOT IN ('setup', 'lobby') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'race_in_progress');
    END IF;

    IF p_lanes IS NULL OR jsonb_typeof(p_lanes) <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_lanes');
    END IF;

    -- UPSERT 각 레인
    FOR v_lane IN SELECT * FROM jsonb_array_elements(p_lanes) LOOP
        v_device_id := NULLIF(v_lane->>'device_id', '')::UUID;
        IF v_device_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'device_required');
        END IF;
        v_lane_number := NULLIF(v_lane->>'lane_number', '')::INT;
        IF v_lane_number IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'lane_number_required');
        END IF;
        v_member_id := NULLIF(v_lane->>'member_id', '')::UUID;
        v_team_id   := NULLIF(v_lane->>'team_id', '')::UUID;

        -- 기기는 이벤트 시설 소속이어야 함
        IF NOT EXISTS (
            SELECT 1 FROM public.pm5_devices d
            WHERE d.id = v_device_id AND d.facility_id = v_event.facility_id
        ) THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'device_facility_mismatch');
        END IF;

        INSERT INTO public.race_live_state
            (event_id, device_id, member_id, team_id, lane_number, connection_status, last_updated_at)
        VALUES
            (p_event_id, v_device_id, v_member_id, v_team_id, v_lane_number, 'idle', now())
        ON CONFLICT (event_id, device_id) DO UPDATE
            SET lane_number       = EXCLUDED.lane_number,
                member_id         = EXCLUDED.member_id,
                team_id           = EXCLUDED.team_id,
                connection_status = 'idle',
                last_updated_at   = now();

        v_device_ids := array_append(v_device_ids, v_device_id);
        v_count := v_count + 1;
    END LOOP;

    -- 전체 교체: 페이로드에 없는 기기 행 삭제(pre-race 라 안전)
    DELETE FROM public.race_live_state
    WHERE event_id = p_event_id
      AND NOT (device_id = ANY (v_device_ids));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', p_event_id, 'lane_count', v_count),
        'error', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_set_race_lanes(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_set_race_lanes(uuid, jsonb) TO authenticated;
COMMENT ON FUNCTION public.fn_set_race_lanes(uuid, jsonb) IS
'레인 배정 전체 교체(코치/admin, pre-race 전용): race_live_state UPSERT + 누락 기기 DELETE. lobby_status setup/lobby 에서만.';

-- ============================================================================
-- race_lane_assignment.sql 끝
-- ============================================================================
