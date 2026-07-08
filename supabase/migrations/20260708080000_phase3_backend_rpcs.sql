-- ============================================================================
-- BCL Portal — 20260708080000_phase3_backend_rpcs.sql
-- Phase 3.5 백엔드 갭 보강 (UI 에이전트가 플래그한 미구현 서버 RPC ~22종)
-- ----------------------------------------------------------------------------
-- 공통 규약 (docs/sql/09_rpc.sql 계약 §3 준수):
--   - SECURITY DEFINER + SET search_path = public
--   - 내부 auth.uid()/is_admin()/is_admin_or_coach()/current_member_id() 게이트
--     (클라이언트가 actor 식별자를 전달하지 않는다)
--   - envelope 1종: {success boolean, data jsonb|null, error text|null}
--   - REVOKE ALL FROM PUBLIC + GRANT authenticated (anon 화이트리스트 6종만)
--   - anon 데이터 접근 = Display-Safe 컬럼만 반환하는 좁은 DEFINER RPC
--     (부상/메모/정산/개인정보/secret 절대 비노출 — docs/05 §6)
-- 결제/주문/과금 RPC는 명시적 DEFERRED — 본 마이그레이션에 없음.
-- ============================================================================


-- ============================================================================
-- [R1] Kiosk (docs/06-kiosk §4)
-- ============================================================================

-- R1.0 스키마 보강: kiosk 오프라인 replay/heartbeat 부속 — 없으면 무해 스킵
-- (kiosk_devices.last_heartbeat/status 는 기존 존재)

-- R1.1 fn_kiosk_checkin(p_payload, p_device_id, p_scanned_at) — 🔄 시그니처 변경
--   BUG FIX(§4.2⑤): 횟수제 크레딧 1→0 원자 차감(기존 RPC는 검사만 하고 미차감).
--   중복(같은 날) = 성공 payload(duplicated:true, 2차 미기록).
--   오프라인 replay: p_scanned_at 을 만료/중복 판정 기준시각으로 사용(기본 now()).
--   facility 강제: p_device_id 제공 시 단말 facility ≠ payload.fid 이면 실패
--     (멤버십 plan.facility_sharing=true 인 경우만 예외).
DROP FUNCTION IF EXISTS public.fn_kiosk_checkin(jsonb);
CREATE OR REPLACE FUNCTION public.fn_kiosk_checkin(
    p_payload JSONB,
    p_device_id UUID DEFAULT NULL,
    p_scanned_at TIMESTAMPTZ DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_facility_id UUID;
    v_ts BIGINT;
    v_member RECORD;
    v_mem RECORD;
    v_booking RECORD;
    v_checkin_id UUID;
    v_scan TIMESTAMPTZ := COALESCE(p_scanned_at, now());
    v_dev_facility UUID;
    v_sharing BOOLEAN := false;
    v_already_charged BOOLEAN := false;
    v_dup RECORD;
    v_remaining INT;
    v_dday INT;
BEGIN
    -- 1) 페이로드 구조 검증
    BEGIN
        v_member_id   := (p_payload->>'mid')::UUID;
        v_facility_id := (p_payload->>'fid')::UUID;
        v_ts          := (p_payload->>'ts')::BIGINT;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_payload');
    END;
    IF v_member_id IS NULL OR v_facility_id IS NULL OR v_ts IS NULL
       OR COALESCE((p_payload->>'v')::INT, 0) <> 1 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_payload');
    END IF;

    -- 2) QR 만료 검증 (발급 후 5분 — 스캔 시각 기준, 오프라인 replay 정합)
    IF ABS(EXTRACT(EPOCH FROM v_scan) - v_ts) > 300 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'qr_expired');
    END IF;

    -- 3) 회원 상태 검증
    SELECT id, name, status, is_blacklisted INTO v_member
    FROM public.members WHERE id = v_member_id;
    IF v_member.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF v_member.status <> 'active' OR v_member.is_blacklisted THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_active');
    END IF;

    -- 3b) facility 강제 (단말 배정 facility ≠ payload fid → 공유 멤버십만 예외)
    IF p_device_id IS NOT NULL THEN
        SELECT facility_id INTO v_dev_facility FROM public.kiosk_devices WHERE id = p_device_id;
        IF v_dev_facility IS NOT NULL AND v_dev_facility <> v_facility_id THEN
            SELECT COALESCE(bool_or(mp.facility_sharing), false) INTO v_sharing
            FROM public.memberships ms
            JOIN public.membership_plans mp ON mp.id = ms.plan_id
            WHERE ms.member_id = v_member_id AND ms.status = 'active';
            IF NOT v_sharing THEN
                RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'facility_mismatch');
            END IF;
            -- 공유 허용 시 체크인 facility 는 실제 단말 facility 로 기록
            v_facility_id := v_dev_facility;
        END IF;
    END IF;

    -- 4) ±30분 시작 세션의 confirmed 예약 자동 감지 (크레딧 선차감 여부 포함)
    SELECT b.id AS booking_id, b.attendance_outcome, b.credit_used,
           s.id AS session_id, s.title
    INTO v_booking
    FROM public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
    WHERE b.member_id = v_member_id
      AND b.status = 'confirmed'
      AND s.facility_id = v_facility_id
      AND s.session_date = v_scan::date
      AND (s.session_date + s.start_time) BETWEEN v_scan - INTERVAL '30 minutes'
                                              AND v_scan + INTERVAL '30 minutes'
    ORDER BY (s.session_date + s.start_time)
    LIMIT 1;
    v_already_charged := COALESCE(v_booking.credit_used, false);

    -- 5) 같은 날 중복 체크인 = 성공 payload(친화 화면), 2차 미기록
    SELECT id, checkin_time INTO v_dup
    FROM public.checkins
    WHERE member_id = v_member_id
      AND facility_id = v_facility_id
      AND checkin_time::date = v_scan::date
    ORDER BY checkin_time
    LIMIT 1;
    IF v_dup.id IS NOT NULL THEN
        SELECT ms.remaining_credits,
               CASE WHEN ms.end_date IS NOT NULL THEN (ms.end_date - v_scan::date) END
        INTO v_remaining, v_dday
        FROM public.memberships ms
        WHERE ms.member_id = v_member_id AND ms.status = 'active'
        ORDER BY ms.end_date ASC NULLS LAST LIMIT 1;
        RETURN jsonb_build_object('success', true,
            'data', jsonb_build_object(
                'duplicated', true,
                'member_name', v_member.name,
                'checkin_time', v_dup.checkin_time,
                'remaining_credits', v_remaining,
                'membership_dday', v_dday),
            'error', NULL);
    END IF;

    -- 6) 멤버십 유효성 + 크레딧 원자 차감
    --    예약 링크가 이미 크레딧을 소진했다면(예약 시 차감) 재차감하지 않음(이중과금 방지).
    --    자유 출입(예약 없음)이면 유효 멤버십 필수 + 횟수제는 1 차감.
    SELECT ms.id, ms.remaining_credits, ms.end_date, mp.plan_kind, mp.name AS plan_name
    INTO v_mem
    FROM public.memberships ms
    LEFT JOIN public.membership_plans mp ON mp.id = ms.plan_id
    WHERE ms.member_id = v_member_id
      AND ms.status = 'active'
      AND ms.start_date <= v_scan::date
      AND (ms.end_date IS NULL OR ms.end_date >= v_scan::date)
      AND (ms.remaining_credits IS NULL OR ms.remaining_credits > 0)
    ORDER BY ms.end_date ASC NULLS LAST
    LIMIT 1
    FOR UPDATE OF ms;

    IF v_booking.booking_id IS NULL THEN
        -- 자유 출입: 유효 멤버십 필수
        IF v_mem.id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'no_active_membership');
        END IF;
        IF v_mem.remaining_credits IS NOT NULL THEN
            -- 횟수제 원자 차감 (음수 방지 — WHERE 절이 >0 보장, 방어적으로 GREATEST)
            UPDATE public.memberships
            SET remaining_credits = GREATEST(remaining_credits - 1, 0), updated_at = now()
            WHERE id = v_mem.id;
            v_remaining := v_mem.remaining_credits - 1;
        ELSE
            v_remaining := NULL; -- 기간제
        END IF;
    ELSE
        -- 예약 링크 존재: 예약 시점에 이미 검증/차감됨. 재차감 안 함.
        v_remaining := v_mem.remaining_credits;  -- 표시용(차감 없음), 없으면 NULL
    END IF;

    v_dday := CASE WHEN v_mem.end_date IS NOT NULL THEN (v_mem.end_date - v_scan::date) END;

    -- 7) 체크인 기록 (세션 미감지 시 자유 출입)
    INSERT INTO public.checkins (booking_id, member_id, session_id, facility_id, checkin_method, checkin_time)
    VALUES (v_booking.booking_id, v_member_id, v_booking.session_id, v_facility_id, 'kiosk', v_scan)
    ON CONFLICT (session_id, member_id) WHERE session_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_checkin_id;

    -- 8) 출결 연동: pending → checked_in
    IF v_booking.booking_id IS NOT NULL AND v_booking.attendance_outcome = 'pending' THEN
        UPDATE public.bookings
        SET attendance_outcome = 'checked_in', attendance_marked_at = v_scan, updated_at = v_scan
        WHERE id = v_booking.booking_id;
    END IF;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'checkin_id', v_checkin_id,
            'duplicated', false,
            'member_name', v_member.name,
            'membership_plan_kind', COALESCE(v_mem.plan_kind, 'standard'),
            'membership_plan_name', v_mem.plan_name,
            'remaining_credits', v_remaining,
            'membership_dday', v_dday,
            'session_id', v_booking.session_id,
            'session_title', v_booking.title,
            'linked_booking', v_booking.booking_id IS NOT NULL,
            'checkin_time', v_scan),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_kiosk_checkin(jsonb,uuid,timestamptz) IS
'키오스크 QR 체크인. 횟수제 원자 차감(자유출입만), 예약 링크 시 이중과금 방지, 같은 날 중복=성공(duplicated), 오프라인 replay(p_scanned_at), facility 강제(p_device_id). anon 실행.';

-- R1.2 fn_kiosk_lookup_member — ANON 수기 대체 조회 (전화 뒷4자리 → 마스킹 후보)
CREATE OR REPLACE FUNCTION public.fn_kiosk_lookup_member(
    p_facility_id UUID, p_phone_last4 TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    IF p_facility_id IS NULL OR p_phone_last4 IS NULL OR length(p_phone_last4) < 4 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_input');
    END IF;

    SELECT COALESCE(jsonb_agg(t ORDER BY t->>'masked_name'), '[]'::jsonb) INTO v_data
    FROM (
        SELECT jsonb_build_object(
            'member_id', m.id,
            -- 마스킹: 첫 글자 + '*' (개인정보 최소 노출)
            'masked_name', left(m.name, 1) || repeat('*', GREATEST(char_length(m.name) - 1, 1)),
            'phone_tail', right(regexp_replace(m.phone, '\D', '', 'g'), 4)
        ) AS t
        FROM public.members m
        WHERE m.facility_id = p_facility_id
          AND m.status = 'active'
          AND right(regexp_replace(COALESCE(m.phone,''), '\D', '', 'g'), 4) = right(p_phone_last4, 4)
        LIMIT 10
    ) sub;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_kiosk_lookup_member(uuid,text) IS
'ANON 키오스크 수기 대체: 전화 뒷4자리로 마스킹된 회원 후보 목록(member_id+마스킹이름). 개인정보 최소 노출.';

-- R1.3 fn_kiosk_heartbeat — ANON 단말 상태 갱신 (테이블 anon 노출 없이 DEFINER)
CREATE OR REPLACE FUNCTION public.fn_kiosk_heartbeat(
    p_device_id UUID, p_status TEXT DEFAULT 'online')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_found UUID;
BEGIN
    IF p_device_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'device_required');
    END IF;
    IF p_status NOT IN ('online','offline','maintenance','error') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_status');
    END IF;

    UPDATE public.kiosk_devices
    SET status = p_status, last_heartbeat = now(), updated_at = now()
    WHERE id = p_device_id
    RETURNING id INTO v_found;

    IF v_found IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'device_not_found');
    END IF;
    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('device_id', v_found, 'status', p_status, 'at', now()),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_kiosk_heartbeat(uuid,text) IS
'ANON 키오스크 하트비트: kiosk_devices.last_heartbeat/status 갱신(테이블 anon GRANT 없이 DEFINER).';

-- R1.4 fn_get_kiosk_notices — ANON 유휴 화면 공지/배너 (게시된 것만, 안전 컬럼만)
CREATE OR REPLACE FUNCTION public.fn_get_kiosk_notices(p_facility_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    IF p_facility_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'facility_required');
    END IF;

    SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'is_pinned')::boolean DESC, (t->>'published_at') DESC), '[]'::jsonb)
    INTO v_data
    FROM (
        SELECT jsonb_build_object(
            'id', n.id, 'title', n.title, 'body', n.content,
            'category', n.category, 'priority', n.priority,
            'is_pinned', n.is_pinned, 'published_at', n.published_at
        ) AS t
        FROM public.notices n
        WHERE (n.facility_id = p_facility_id OR n.facility_id IS NULL)
          AND n.is_published = true
          AND (n.expires_at IS NULL OR n.expires_at > now())
        LIMIT 20
    ) sub;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_kiosk_notices(uuid) IS
'ANON 키오스크 유휴 공지: 게시·미만료 notices(title/body/category만). notices 테이블 이미지 컬럼 없음.';


-- ============================================================================
-- [R2] Member (docs/03-user-app §3)
-- ============================================================================

-- R2.1 fn_record_my_benchmark_result — 본인 벤치마크 자가 기록 (member 스코프)
--   admin/coach 게이트인 fn_record_member_benchmark_result 와 달리 current_member_id() 본인만.
CREATE OR REPLACE FUNCTION public.fn_record_my_benchmark_result(
    p_benchmark_id UUID,
    p_result_value NUMERIC,
    p_rx_status TEXT DEFAULT 'rx',
    p_session_id UUID DEFAULT NULL,
    p_result_meta JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_metric_type TEXT;
    v_best NUMERIC;
    v_is_pr BOOLEAN := false;
    v_row public.member_benchmark_results;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;

    SELECT metric_type INTO v_metric_type
    FROM public.benchmark_definitions WHERE id = p_benchmark_id AND is_active;
    IF v_metric_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'benchmark_not_found');
    END IF;
    IF p_result_value IS NULL OR p_result_value <= 0 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_result_value');
    END IF;
    IF p_rx_status NOT IN ('rx_plus','rx','scaled') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_rx_status');
    END IF;

    -- 세션 연결 시 본인이 참가자인지 검증
    IF p_session_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.session_id = p_session_id AND b.member_id = v_member_id
          AND (b.status = 'confirmed' OR b.attendance_outcome = 'walk_in')
    ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_session_participant');
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_member_id::text || ':' || p_benchmark_id::text));

    IF v_metric_type = 'time' THEN
        SELECT MIN(result_value) INTO v_best FROM public.member_benchmark_results
        WHERE member_id = v_member_id AND benchmark_id = p_benchmark_id AND rx_status = p_rx_status;
        v_is_pr := (v_best IS NULL OR p_result_value < v_best);
    ELSE
        SELECT MAX(result_value) INTO v_best FROM public.member_benchmark_results
        WHERE member_id = v_member_id AND benchmark_id = p_benchmark_id AND rx_status = p_rx_status;
        v_is_pr := (v_best IS NULL OR p_result_value > v_best);
    END IF;

    INSERT INTO public.member_benchmark_results
        (member_id, benchmark_id, session_id, result_value, result_meta, rx_status, is_pr, recorded_by)
    VALUES (v_member_id, p_benchmark_id, p_session_id, p_result_value,
            COALESCE(p_result_meta,'{}'::jsonb), p_rx_status, v_is_pr, auth.uid())
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'id', v_row.id, 'benchmark_id', v_row.benchmark_id,
            'result_value', v_row.result_value, 'rx_status', v_row.rx_status,
            'is_pr', v_row.is_pr, 'previous_best', v_best, 'recorded_at', v_row.recorded_at),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_record_my_benchmark_result(uuid,numeric,text,uuid,jsonb) IS
'회원 본인 벤치마크 자가 기록. current_member_id() 스코프 + 동일 rx 계층 PR 판정.';

-- R2.2 fn_get_member_schedule(p_from, p_to) — 기간 세션 + 정원/예약 카운트 + 본인 예약상태
CREATE OR REPLACE FUNCTION public.fn_get_member_schedule(p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_facility_id UUID;
    v_data JSONB;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF p_from IS NULL OR p_to IS NULL OR p_from > p_to OR p_to - p_from > 92 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_date_range');
    END IF;
    SELECT facility_id INTO v_facility_id FROM public.members WHERE id = v_member_id;

    SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'session_date'), (t->>'start_time')), '[]'::jsonb)
    INTO v_data
    FROM (
        SELECT jsonb_build_object(
            'id', s.id, 'title', s.title, 'session_date', s.session_date,
            'start_time', s.start_time, 'end_time', s.end_time,
            'class_type', s.class_type, 'capacity', s.capacity, 'status', s.status,
            'coach_names', (SELECT COALESCE(jsonb_agg(c.name ORDER BY sc.display_order), '[]'::jsonb)
                            FROM public.session_coaches sc
                            JOIN public.coaches c ON c.id = sc.coach_id
                            WHERE sc.session_id = s.id),
            'booked_count', (SELECT COUNT(*) FROM public.bookings b
                             WHERE b.session_id = s.id AND b.status = 'confirmed'),
            'waitlist_count', (SELECT COUNT(*) FROM public.bookings b
                               WHERE b.session_id = s.id AND b.status = 'waitlisted'),
            'remaining', GREATEST(s.capacity - (SELECT COUNT(*) FROM public.bookings b
                             WHERE b.session_id = s.id AND b.status = 'confirmed'), 0),
            'my_booking_status', (SELECT b.status FROM public.bookings b
                                  WHERE b.session_id = s.id AND b.member_id = v_member_id
                                    AND b.status <> 'cancelled' LIMIT 1),
            'has_wod', EXISTS (SELECT 1 FROM public.session_wods sw
                               WHERE sw.session_id = s.id AND sw.publish_state = 'published')
        ) AS t
        FROM public.sessions s
        WHERE (s.facility_id = v_facility_id OR v_facility_id IS NULL)
          AND s.session_date BETWEEN p_from AND p_to
          AND s.status <> 'cancelled'
    ) sub;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_member_schedule(date,date) IS
'회원 스케줄: 기간 세션 + 정원/예약/대기 카운트 + 본인 예약상태. Display-Safe(타인 명단 미노출).';

-- R2.3 fn_get_benchmark_leaderboard(p_benchmark, p_scope) — 종목별 시설 리더보드(이름+기록)
CREATE OR REPLACE FUNCTION public.fn_get_benchmark_leaderboard(
    p_benchmark TEXT, p_scope TEXT DEFAULT 'all')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_facility_id UUID;
    v_bd RECORD;
    v_since DATE;
    v_data JSONB;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL AND NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF v_member_id IS NOT NULL THEN
        SELECT facility_id INTO v_facility_id FROM public.members WHERE id = v_member_id;
    END IF;

    SELECT id, metric_type, unit INTO v_bd
    FROM public.benchmark_definitions
    WHERE name = p_benchmark AND is_active
      AND (facility_id = v_facility_id OR v_facility_id IS NULL OR facility_id IS NULL)
    ORDER BY (facility_id = v_facility_id) DESC NULLS LAST
    LIMIT 1;
    IF v_bd.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'benchmark_not_found');
    END IF;

    v_since := CASE p_scope
        WHEN 'week'  THEN CURRENT_DATE - 7
        WHEN 'month' THEN CURRENT_DATE - 30
        WHEN 'year'  THEN CURRENT_DATE - 365
        ELSE DATE '2000-01-01'
    END;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.rank), '[]'::jsonb) INTO v_data
    FROM (
        SELECT ROW_NUMBER() OVER (
                   ORDER BY CASE WHEN v_bd.metric_type = 'time' THEN best END ASC NULLS LAST,
                            CASE WHEN v_bd.metric_type <> 'time' THEN best END DESC NULLS LAST
               ) AS rank,
               m.name AS member_name,
               best AS best_value,
               v_bd.unit AS unit,
               rx_status
        FROM (
            SELECT r.member_id, r.rx_status,
                   CASE WHEN v_bd.metric_type = 'time' THEN MIN(r.result_value)
                        ELSE MAX(r.result_value) END AS best
            FROM public.member_benchmark_results r
            WHERE r.benchmark_id = v_bd.id
              AND r.recorded_at >= v_since
              AND r.rx_status IN ('rx_plus','rx')
            GROUP BY r.member_id, r.rx_status
        ) agg
        JOIN public.members m ON m.id = agg.member_id
        WHERE (m.facility_id = v_facility_id OR v_facility_id IS NULL)
        LIMIT 20
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('benchmark', p_benchmark, 'metric_type', v_bd.metric_type,
                                   'unit', v_bd.unit, 'scope', p_scope, 'entries', v_data),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_benchmark_leaderboard(text,text) IS
'종목별 시설 리더보드(이름+기록, rx/rx_plus만). Display-Safe. 생체지표 제외.';

-- R2.4 fn_create_support_ticket(p_subject, p_content, p_category) — 회원 문의 생성
CREATE OR REPLACE FUNCTION public.fn_create_support_ticket(
    p_subject TEXT, p_content TEXT, p_category TEXT DEFAULT 'inquiry')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_row public.support_tickets;
BEGIN
    v_member_id := public.current_member_id();
    IF v_member_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    IF COALESCE(NULLIF(trim(p_subject), ''), '') = ''
       OR COALESCE(NULLIF(trim(p_content), ''), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'missing_required_fields');
    END IF;
    -- 카테고리는 support_tickets_category_check 제약과 정합
    IF COALESCE(NULLIF(p_category,''),'inquiry') NOT IN ('inquiry','complaint','suggestion','refund') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_category');
    END IF;

    INSERT INTO public.support_tickets (member_id, subject, content, category, status, priority)
    VALUES (v_member_id, trim(p_subject), p_content, COALESCE(NULLIF(p_category,''),'inquiry'), 'open', 'normal')
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('ticket_id', v_row.id, 'status', v_row.status,
                                   'created_at', v_row.created_at),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_create_support_ticket(text,text,text) IS
'회원 본인 문의 티켓 생성(member 스코프). 답변은 fn_reply_support_ticket(admin).';


-- ============================================================================
-- [R3] Coach (docs/04-coach-app §3)
-- ============================================================================

-- R3.1 fn_record_session_wod_result — 🔄 시그니처 변경: p_member_id 추가(코치 대리 입력)
--   null = 본인(current_member_id, 기존과 동일) / 지정 = 해당 세션 코치만 대리(또는 admin). §3.2 b-2 / S-24
DROP FUNCTION IF EXISTS public.fn_record_session_wod_result(uuid,numeric,text,text,text);
CREATE OR REPLACE FUNCTION public.fn_record_session_wod_result(
    p_session_id UUID,
    p_score NUMERIC,
    p_score_type TEXT,
    p_rx_status TEXT DEFAULT 'rx',
    p_note TEXT DEFAULT NULL,
    p_member_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_is_proxy BOOLEAN := false;
    v_session_wod_id UUID;
    v_row public.session_wod_results;
BEGIN
    IF p_member_id IS NULL THEN
        v_member_id := public.current_member_id();
        IF v_member_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
        END IF;
    ELSE
        -- 코치 대리 입력: 해당 세션의 배정 코치이거나 admin 만
        v_is_proxy := true;
        IF NOT public.is_admin() AND NOT EXISTS (
            SELECT 1 FROM public.session_coaches sc
            JOIN public.coaches c ON c.id = sc.coach_id
            WHERE sc.session_id = p_session_id AND c.user_id = auth.uid()
        ) THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
        END IF;
        v_member_id := p_member_id;
    END IF;

    IF p_score IS NULL OR p_score <= 0 THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_score');
    END IF;
    IF p_score_type NOT IN ('time','reps','rounds_reps','weight','distance','calories') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_score_type');
    END IF;
    IF p_rx_status NOT IN ('rx_plus','rx','scaled') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_rx_status');
    END IF;

    SELECT id INTO v_session_wod_id
    FROM public.session_wods
    WHERE session_id = p_session_id AND publish_state = 'published';
    IF v_session_wod_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_wod_not_published');
    END IF;

    -- 대상 회원이 해당 세션 참가자인지 검증 (본인/대리 공통)
    IF NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.session_id = p_session_id AND b.member_id = v_member_id
          AND (b.status = 'confirmed' OR b.attendance_outcome = 'walk_in')
    ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_session_participant');
    END IF;

    INSERT INTO public.session_wod_results
        (session_wod_id, member_id, score, score_type, rx_status, note, recorded_by)
    VALUES (v_session_wod_id, v_member_id, p_score, p_score_type, p_rx_status,
            NULLIF(p_note,''), auth.uid())
    ON CONFLICT (session_wod_id, member_id) DO UPDATE SET
        score = EXCLUDED.score, score_type = EXCLUDED.score_type,
        rx_status = EXCLUDED.rx_status, note = EXCLUDED.note,
        recorded_by = EXCLUDED.recorded_by, updated_at = now()
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true,
        'data', to_jsonb(v_row) || jsonb_build_object('is_proxy', v_is_proxy), 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_record_session_wod_result(uuid,numeric,text,text,text,uuid) IS
'G-1/S-24: WOD 점수 기록. p_member_id NULL=본인, 지정=배정코치/admin 대리 입력. published WOD + 참가자만.';

-- R3.2 fn_get_coach_members(p_search) — 코치 담당 회원 로스터 (Display-Safe, 정산 제외)
CREATE OR REPLACE FUNCTION public.fn_get_coach_members(p_search TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_facility_id UUID;
    v_is_admin BOOLEAN := public.is_admin();
    v_data JSONB;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    SELECT id, facility_id INTO v_coach_id, v_facility_id
    FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    IF v_coach_id IS NULL AND NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_linked');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.member_name), '[]'::jsonb) INTO v_data
    FROM (
        SELECT DISTINCT ON (m.id)
            m.id AS member_id, m.name AS member_name, m.phone, m.avatar_url, m.status,
            (SELECT ms.end_date FROM public.memberships ms
             WHERE ms.member_id = m.id AND ms.status = 'active'
             ORDER BY ms.end_date ASC NULLS LAST LIMIT 1) AS membership_end_date,
            (SELECT ms.remaining_credits FROM public.memberships ms
             WHERE ms.member_id = m.id AND ms.status = 'active'
             ORDER BY ms.end_date ASC NULLS LAST LIMIT 1) AS remaining_credits,
            (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'flag_type', f.flag_type, 'severity', f.severity, 'note', f.note)), '[]'::jsonb)
             FROM public.member_alert_flags f
             WHERE f.member_id = m.id AND f.resolved_at IS NULL
               AND (f.ends_at IS NULL OR f.ends_at > now())) AS active_flags,
            (SELECT MAX(c.checkin_time) FROM public.checkins c WHERE c.member_id = m.id) AS last_checkin
        FROM public.members m
        WHERE (v_is_admin OR EXISTS (
                SELECT 1 FROM public.bookings b
                JOIN public.session_coaches sc ON sc.session_id = b.session_id
                WHERE b.member_id = m.id AND sc.coach_id = v_coach_id
                  AND b.status IN ('confirmed','waitlisted')))
          AND (v_facility_id IS NULL OR m.facility_id = v_facility_id OR v_is_admin)
          AND (p_search IS NULL OR p_search = ''
               OR m.name ILIKE '%'||p_search||'%'
               OR regexp_replace(COALESCE(m.phone,''),'\D','','g') LIKE '%'||regexp_replace(p_search,'\D','','g')||'%')
    ) t;

    RETURN jsonb_build_object('success', true, 'data', v_data, 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_coach_members(text) IS
'코치 담당 회원 로스터(자기 세션 참가자/시설 스코프). 플래그·노트 열람 허용(§3.3), 정산 비노출.';

-- R3.3 fn_upsert_member_note(p_member_id, p_note_id, p_body, p_note_type) — 코치 회원 노트
CREATE OR REPLACE FUNCTION public.fn_upsert_member_note(
    p_member_id UUID, p_note_id UUID DEFAULT NULL,
    p_body TEXT DEFAULT NULL, p_note_type TEXT DEFAULT 'general')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_row public.member_notes;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    IF COALESCE(NULLIF(trim(p_body), ''), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'empty_body');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.members WHERE id = p_member_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'member_not_found');
    END IF;
    v_role := CASE WHEN public.is_admin() THEN 'admin' ELSE 'coach' END;

    IF p_note_id IS NOT NULL THEN
        UPDATE public.member_notes
        SET content = p_body,
            note_type = COALESCE(p_note_type, note_type),
            updated_at = now()
        WHERE id = p_note_id AND member_id = p_member_id
        RETURNING * INTO v_row;
        IF v_row.id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'note_not_found');
        END IF;
    ELSE
        INSERT INTO public.member_notes (member_id, author_id, author_role, note_type, content)
        VALUES (p_member_id, auth.uid(), v_role, COALESCE(p_note_type,'general'), p_body)
        RETURNING * INTO v_row;
    END IF;

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row), 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_upsert_member_note(uuid,uuid,text,text) IS
'코치/admin 회원 노트 작성·수정(member_notes). p_note_id NULL=신규.';

-- R3.4 fn_update_my_coach_profile(p_patch) — 코치 본인 비-급여 프로필 편집
--   급여(base_salary/session_allowance)·status 는 화이트리스트에서 명시 제외(§1.2 admin 전용).
CREATE OR REPLACE FUNCTION public.fn_update_my_coach_profile(p_patch JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
BEGIN
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    IF v_coach_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_linked');
    END IF;
    IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::jsonb THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'empty_patch');
    END IF;
    -- 화이트리스트: 급여/상태 필드는 허용 목록에 없으므로 unknown_field 로 거부
    IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(p_patch) AS k
        WHERE k NOT IN ('name','phone','bio','specialties','profile_image_url')
    ) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'unknown_field');
    END IF;
    IF p_patch ? 'name' AND COALESCE(NULLIF(trim(p_patch->>'name'), ''), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_name');
    END IF;

    UPDATE public.coaches SET
        name              = CASE WHEN p_patch ? 'name' THEN trim(p_patch->>'name') ELSE name END,
        phone             = CASE WHEN p_patch ? 'phone' THEN NULLIF(p_patch->>'phone','') ELSE phone END,
        bio               = CASE WHEN p_patch ? 'bio' THEN NULLIF(p_patch->>'bio','') ELSE bio END,
        specialties       = CASE WHEN p_patch ? 'specialties'
                                 THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'specialties'))
                                 ELSE specialties END,
        profile_image_url = CASE WHEN p_patch ? 'profile_image_url'
                                 THEN NULLIF(p_patch->>'profile_image_url','') ELSE profile_image_url END,
        updated_at        = now()
    WHERE id = v_coach_id;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('coach_id', v_coach_id), 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_update_my_coach_profile(jsonb) IS
'코치 본인 프로필 편집(name/phone/bio/specialties/profile_image_url). 급여·status 는 화이트리스트 제외(admin 전용).';

-- R3.5 fn_get_coach_member_alerts() — Home 경고 위젯: 담당 회원 중 주의 필요 집계
CREATE OR REPLACE FUNCTION public.fn_get_coach_member_alerts()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_flags JSONB;
    v_expiring JSONB;
    v_absent JSONB;
BEGIN
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    IF v_coach_id IS NULL AND NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'coach_not_linked');
    END IF;

    -- 담당 회원 = 이 코치 세션에 예약 이력이 있는 회원
    WITH my_members AS (
        SELECT DISTINCT b.member_id
        FROM public.bookings b
        JOIN public.session_coaches sc ON sc.session_id = b.session_id
        WHERE sc.coach_id = v_coach_id AND b.status IN ('confirmed','waitlisted')
    )
    SELECT
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'member_id', m.id, 'member_name', m.name,
            'flag_type', f.flag_type, 'severity', f.severity)), '[]'::jsonb)
         FROM public.member_alert_flags f
         JOIN public.members m ON m.id = f.member_id
         WHERE f.member_id IN (SELECT member_id FROM my_members)
           AND f.resolved_at IS NULL AND (f.ends_at IS NULL OR f.ends_at > now())),
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'member_id', m.id, 'member_name', m.name, 'end_date', ms.end_date,
            'remaining_credits', ms.remaining_credits)), '[]'::jsonb)
         FROM public.memberships ms
         JOIN public.members m ON m.id = ms.member_id
         WHERE ms.member_id IN (SELECT member_id FROM my_members)
           AND ms.status = 'active'
           AND ((ms.end_date IS NOT NULL AND ms.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7)
                OR (ms.remaining_credits IS NOT NULL AND ms.remaining_credits <= 2))),
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'member_id', m.id, 'member_name', m.name, 'last_checkin', lc.last_checkin)), '[]'::jsonb)
         FROM my_members mm
         JOIN public.members m ON m.id = mm.member_id
         LEFT JOIN LATERAL (SELECT MAX(c.checkin_time) AS last_checkin
                            FROM public.checkins c WHERE c.member_id = m.id) lc ON true
         WHERE lc.last_checkin IS NULL OR lc.last_checkin < now() - INTERVAL '14 days')
    INTO v_flags, v_expiring, v_absent;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object(
            'flags', COALESCE(v_flags, '[]'::jsonb),
            'expiring', COALESCE(v_expiring, '[]'::jsonb),
            'absent', COALESCE(v_absent, '[]'::jsonb),
            'total', jsonb_array_length(COALESCE(v_flags,'[]'::jsonb))
                   + jsonb_array_length(COALESCE(v_expiring,'[]'::jsonb))
                   + jsonb_array_length(COALESCE(v_absent,'[]'::jsonb))),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_coach_member_alerts() IS
'코치 Home 경고 위젯: 담당 회원 flags/만료임박/장기미출석 집계.';

-- R3.6 Circuit Console 지속화 — session_rotation_states (기존 테이블 재사용) RPC 2종
--   ※ 테이블·RLS(admin/배정코치 manage, public read)는 이미 존재 → 신규 생성 안 함.
--     provenance 위해 updated_by 컬럼만 보강.
ALTER TABLE public.session_rotation_states ADD COLUMN IF NOT EXISTS updated_by UUID;

CREATE OR REPLACE FUNCTION public.fn_upsert_session_rotation_state(
    p_session_id UUID, p_state JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_facility_id UUID;
    v_row public.session_rotation_states;
BEGIN
    v_user_id := public._assert_coach_can_edit_session(p_session_id);
    SELECT facility_id INTO v_facility_id FROM public.sessions WHERE id = p_session_id;
    IF v_facility_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'session_not_found');
    END IF;
    IF p_state IS NULL OR jsonb_typeof(p_state) <> 'object' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_state');
    END IF;

    -- UPDATE-first-then-INSERT: partial patch(부분 갱신)가 speculative INSERT NOT NULL 검사에 걸리지 않도록.
    UPDATE public.session_rotation_states SET
        current_round            = COALESCE((p_state->>'current_round')::INT, current_round),
        total_rounds             = COALESCE((p_state->>'total_rounds')::INT, total_rounds),
        seconds_per_round        = COALESCE((p_state->>'seconds_per_round')::INT, seconds_per_round),
        is_running               = COALESCE((p_state->>'is_running')::BOOLEAN, is_running),
        timer_started_at         = CASE WHEN p_state ? 'timer_started_at'
                                        THEN NULLIF(p_state->>'timer_started_at','')::TIMESTAMPTZ ELSE timer_started_at END,
        paused_remaining_seconds = CASE WHEN p_state ? 'paused_remaining_seconds'
                                        THEN (p_state->>'paused_remaining_seconds')::INT ELSE paused_remaining_seconds END,
        team_assignments         = COALESCE(p_state->'team_assignments', team_assignments),
        updated_by = v_user_id, updated_at = now()
    WHERE session_id = p_session_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        INSERT INTO public.session_rotation_states (
            session_id, facility_id, current_round, total_rounds, seconds_per_round, is_running,
            timer_started_at, paused_remaining_seconds, team_assignments, updated_by, updated_at)
        VALUES (p_session_id, v_facility_id,
            COALESCE((p_state->>'current_round')::INT, 1),
            COALESCE((p_state->>'total_rounds')::INT, 1),
            COALESCE((p_state->>'seconds_per_round')::INT, 0),
            COALESCE((p_state->>'is_running')::BOOLEAN, false),
            NULLIF(p_state->>'timer_started_at','')::TIMESTAMPTZ,
            (p_state->>'paused_remaining_seconds')::INT,
            COALESCE(p_state->'team_assignments', '{}'::jsonb), v_user_id, now())
        ON CONFLICT (session_id) DO UPDATE SET
            current_round = COALESCE(EXCLUDED.current_round, public.session_rotation_states.current_round),
            updated_by = v_user_id, updated_at = now()
        RETURNING * INTO v_row;
    END IF;

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;
COMMENT ON FUNCTION public.fn_upsert_session_rotation_state(uuid,jsonb) IS
'Circuit Console 지속화: session_rotation_states upsert(배정코치/admin). Realtime 동기화 소스.';

CREATE OR REPLACE FUNCTION public.fn_get_session_rotation_state(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_row public.session_rotation_states;
BEGIN
    PERFORM public._assert_coach_can_edit_session(p_session_id);
    SELECT * INTO v_row FROM public.session_rotation_states WHERE session_id = p_session_id;
    IF v_row.session_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'data', NULL, 'error', NULL);
    END IF;
    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', SQLERRM);
END;
$$;
COMMENT ON FUNCTION public.fn_get_session_rotation_state(uuid) IS
'Circuit Console 상태 조회(배정코치/admin).';

-- R3.7 Coach Race RPC 4종
-- fn_list_coach_race_events(p_scope) — live/history
CREATE OR REPLACE FUNCTION public.fn_list_coach_race_events(p_scope TEXT DEFAULT 'live')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_facility_id UUID;
    v_is_admin BOOLEAN := public.is_admin();
    v_data JSONB;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    SELECT id, facility_id INTO v_coach_id, v_facility_id
    FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.event_date DESC, t.created_at DESC), '[]'::jsonb)
    INTO v_data
    FROM (
        SELECT re.id, re.name, re.event_date, re.event_type, re.race_format, re.status,
               re.lobby_status, re.target_distance_m, re.duration_minutes, re.session_id,
               re.created_at,
               (SELECT COUNT(*) FROM public.race_records rr WHERE rr.event_id = re.id) AS record_count
        FROM public.race_events re
        WHERE (v_is_admin OR re.facility_id = v_facility_id OR re.coach_id = v_coach_id)
          AND CASE
                WHEN p_scope = 'history' THEN re.status IN ('completed','cancelled')
                ELSE re.status NOT IN ('completed','cancelled')
              END
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('scope', p_scope, 'events', v_data), 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_list_coach_race_events(text) IS
'코치 Race 이벤트 목록(live/history), 시설/담당 스코프.';

-- fn_create_coach_race_event(p_payload) — 세션 비연동 단독 Race 생성
CREATE OR REPLACE FUNCTION public.fn_create_coach_race_event(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_facility_id UUID;
    v_name TEXT;
    v_format TEXT;
    v_row public.race_events;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    SELECT id, facility_id INTO v_coach_id, v_facility_id
    FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    v_facility_id := COALESCE(NULLIF(p_payload->>'facility_id','')::UUID, v_facility_id);
    IF v_facility_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'facility_required');
    END IF;

    v_name := NULLIF(trim(p_payload->>'name'), '');
    IF v_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'name_required');
    END IF;
    v_format := COALESCE(NULLIF(p_payload->>'race_format',''), 'individual');
    IF v_format NOT IN ('individual','team','group','relay') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_race_format');
    END IF;

    INSERT INTO public.race_events (
        facility_id, session_id, coach_id, name, event_date, event_type, race_format,
        target_distance_m, duration_minutes, group_target_m, status, lobby_status)
    VALUES (
        v_facility_id, NULL, v_coach_id, v_name,
        COALESCE(NULLIF(p_payload->>'event_date','')::DATE, CURRENT_DATE),
        COALESCE(NULLIF(p_payload->>'event_type',''), 'rowing'), v_format,
        NULLIF(p_payload->>'target_distance_m','')::INT,
        NULLIF(p_payload->>'duration_minutes','')::INT,
        NULLIF(p_payload->>'group_target_m','')::INT,
        'scheduled', 'setup')
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', v_row.id, 'name', v_row.name,
                                   'status', v_row.status, 'lobby_status', v_row.lobby_status,
                                   'race_format', v_row.race_format),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_create_coach_race_event(jsonb) IS
'세션 비연동 단독 Race 이벤트 생성(코치/admin).';

-- fn_finish_race_event(p_event_id) — 종료 처리 + finish_rank 계산
CREATE OR REPLACE FUNCTION public.fn_finish_race_event(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_coach_id UUID;
    v_event RECORD;
    v_ranked INT;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;

    SELECT re.* INTO v_event FROM public.race_events re WHERE re.id = p_event_id;
    IF v_event.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_not_found');
    END IF;
    IF NOT public.is_admin() AND v_event.coach_id IS DISTINCT FROM v_coach_id
       AND NOT EXISTS (SELECT 1 FROM public.session_coaches sc
                       WHERE sc.session_id = v_event.session_id AND sc.coach_id = v_coach_id) THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'not_assigned');
    END IF;
    IF v_event.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'already_completed');
    END IF;

    -- finish_rank 계산: 거리목표 레이스=시간 오름차순, 그 외=거리 내림차순
    WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   ORDER BY CASE WHEN v_event.target_distance_m IS NOT NULL THEN result_time END ASC NULLS LAST,
                            result_distance DESC NULLS LAST
               ) AS rnk
        FROM public.race_records WHERE event_id = p_event_id
    )
    UPDATE public.race_records rr
    SET finish_rank = ranked.rnk
    FROM ranked WHERE rr.id = ranked.id;
    GET DIAGNOSTICS v_ranked = ROW_COUNT;

    UPDATE public.race_events
    SET status = 'completed', lobby_status = 'finished', updated_at = now()
    WHERE id = p_event_id;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), 'FINISH_RACE_EVENT', 'race_events', p_event_id,
            jsonb_build_object('status', v_event.status, 'lobby_status', v_event.lobby_status),
            jsonb_build_object('status', 'completed', 'lobby_status', 'finished', 'ranked', v_ranked));

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', p_event_id, 'ranked_records', v_ranked,
                                   'status', 'completed'),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_finish_race_event(uuid) IS
'Race 이벤트 종료(코치/admin): status=completed, lobby=finished, finish_rank 계산.';

-- fn_get_race_event_result(p_event_id) — 이벤트별 리더보드(코치/admin 뷰)
CREATE OR REPLACE FUNCTION public.fn_get_race_event_result(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_data JSONB;
BEGIN
    IF NOT public.is_admin_or_coach() THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
    END IF;
    SELECT id, name, event_date, race_format, status, target_distance_m
    INTO v_event FROM public.race_events WHERE id = p_event_id;
    IF v_event.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_not_found');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.finish_rank NULLS LAST), '[]'::jsonb) INTO v_data
    FROM (
        SELECT rr.finish_rank, m.name AS member_name, rr.lane_number,
               rr.result_distance, EXTRACT(EPOCH FROM rr.result_time)::NUMERIC AS result_time_sec,
               rr.avg_watts, rr.avg_spm, rr.is_pr
        FROM public.race_records rr
        LEFT JOIN public.members m ON m.id = rr.member_id
        WHERE rr.event_id = p_event_id
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', v_event.id, 'name', v_event.name,
                                   'status', v_event.status, 'results', v_data),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_race_event_result(uuid) IS
'이벤트별 Race 리더보드(코치/admin 뷰).';


-- ============================================================================
-- [R4] Class anon (docs/05 §6, docs/15)
-- ============================================================================

-- R4.1 fn_get_race_lanes(p_event_id) — ANON 레인 배정 + device_type + 이름 (Display-Safe)
--   pm5_devices anon 갭 해소: 레인별 device_type만 반환(테이블 미노출). 생체지표(hr) 제외.
CREATE OR REPLACE FUNCTION public.fn_get_race_lanes(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    IF p_event_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_required');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.lane_number), '[]'::jsonb) INTO v_data
    FROM (
        SELECT ls.lane_number,
               m.name AS member_name,
               d.device_type,
               ls.connection_status,
               ls.distance_m, ls.power_w, ls.stroke_rate_spm
        FROM public.race_live_state ls
        LEFT JOIN public.members m ON m.id = ls.member_id
        LEFT JOIN public.pm5_devices d ON d.id = ls.device_id
        WHERE ls.event_id = p_event_id
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', p_event_id, 'lanes', v_data), 'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_race_lanes(uuid) IS
'ANON 레인 배정: race_live_state 레인별 이름+device_type+성능(거리/파워/SPM). 생체지표(HR) 제외, 테이블 미노출.';

-- R4.2 fn_get_class_race_result(p_event_id) — ANON 최종 결과 (이름+거리/시간+순위)
CREATE OR REPLACE FUNCTION public.fn_get_class_race_result(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_data JSONB;
BEGIN
    IF p_event_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_required');
    END IF;
    SELECT id, name, event_date, race_format, status INTO v_event
    FROM public.race_events WHERE id = p_event_id;
    IF v_event.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'event_not_found');
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.finish_rank NULLS LAST), '[]'::jsonb) INTO v_data
    FROM (
        SELECT rr.finish_rank, m.name AS member_name, rr.lane_number,
               rr.result_distance, EXTRACT(EPOCH FROM rr.result_time)::NUMERIC AS result_time_sec,
               rr.avg_spm, rr.is_pr
        FROM public.race_records rr
        LEFT JOIN public.members m ON m.id = rr.member_id
        WHERE rr.event_id = p_event_id
    ) t;

    RETURN jsonb_build_object('success', true,
        'data', jsonb_build_object('event_id', v_event.id, 'name', v_event.name,
                                   'race_format', v_event.race_format, 'status', v_event.status,
                                   'results', v_data),
        'error', NULL);
END;
$$;
COMMENT ON FUNCTION public.fn_get_class_race_result(uuid) IS
'ANON Class TV 최종 Race 결과: 이름+거리/시간+순위(Display-Safe). 생체지표(HR)/개인정보 제외.';

-- R4.3 fn_get_class_wod_board(p_session_id) — ANON 일일 WOD 화이트보드 (rx 배지)
--   docs/05 §5.3 whiteboard mode. authenticated 전용 fn_get_session_wod_whiteboard 의 anon Display-Safe 판.
--   note(개인 메모) 미포함. p_session_id NULL 시 시설 파라미터가 아니므로 세션 필수.
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
               r.score, r.score_type, r.rx_status
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
'ANON Class TV 일일 WOD 화이트보드(이름+점수+rx 배지, Rx+→Rx→Scaled 정렬). 개인 메모 미포함.';


-- ============================================================================
-- [R.GRANT] 권한 부여 — authenticated 기본, anon 화이트리스트 6종
-- ============================================================================
DO $$
DECLARE
    v_fn text;
BEGIN
    -- authenticated 전용 (member/coach RPC)
    FOR v_fn IN VALUES
        ('public.fn_record_my_benchmark_result(uuid,numeric,text,uuid,jsonb)'),
        ('public.fn_get_member_schedule(date,date)'),
        ('public.fn_get_benchmark_leaderboard(text,text)'),
        ('public.fn_create_support_ticket(text,text,text)'),
        ('public.fn_record_session_wod_result(uuid,numeric,text,text,text,uuid)'),
        ('public.fn_get_coach_members(text)'),
        ('public.fn_upsert_member_note(uuid,uuid,text,text)'),
        ('public.fn_update_my_coach_profile(jsonb)'),
        ('public.fn_get_coach_member_alerts()'),
        ('public.fn_upsert_session_rotation_state(uuid,jsonb)'),
        ('public.fn_get_session_rotation_state(uuid)'),
        ('public.fn_list_coach_race_events(text)'),
        ('public.fn_create_coach_race_event(jsonb)'),
        ('public.fn_finish_race_event(uuid)'),
        ('public.fn_get_race_event_result(uuid)')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_fn);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_fn);
    END LOOP;

    -- anon 화이트리스트 (Kiosk 4종 + Class 2종 + 변경된 kiosk_checkin)
    FOR v_fn IN VALUES
        ('public.fn_kiosk_checkin(jsonb,uuid,timestamptz)'),
        ('public.fn_kiosk_lookup_member(uuid,text)'),
        ('public.fn_kiosk_heartbeat(uuid,text)'),
        ('public.fn_get_kiosk_notices(uuid)'),
        ('public.fn_get_race_lanes(uuid)'),
        ('public.fn_get_class_race_result(uuid)'),
        ('public.fn_get_class_wod_board(uuid)')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', v_fn);
    END LOOP;
END $$;
