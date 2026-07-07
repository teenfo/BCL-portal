-- ============================================================================
-- BCL Portal 재구축 DDL — 05_race.sql
-- ----------------------------------------------------------------------------
-- 목적   : race 도메인 — pm5_devices / race_events / race_teams / race_live_state /
--          race_recordings / race_records
-- 의존   : 00, 01 (facilities/members/coaches), 03 (sessions)
-- 변경   : (to-be) race_format에 'group'(단체전) 추가 + group_target_m(공동 목표) +
--          heat_no(대인원 히트 분할) — 15-race-system.md 경기 모드 3종 설계 반영.
--          세션당 활성 이벤트 1개(부분 유니크) 유지, 코치 쓰기 정책(P25 하드닝) 계승
-- 참고   : Python 브릿지(FastAPI 8001)는 Service Role Key로 접근 — RLS 미적용 경로.
--          3경로 데이터 분리: Broadcast(0.3s, DB 미기록) / race_live_state(5s UPSERT,
--          종료 시 DELETE) / JSONL(로컬 30일 → race_records 멱등 적재)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. pm5_devices — PM5 기기 레지스트리 (시리얼넘버 = 주 식별자)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm5_devices (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id       UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
    serial_number     VARCHAR(100) NOT NULL UNIQUE,          -- 주 식별자 (iOS MAC 숨김 대응)
    mac_address       VARCHAR(17),
    ble_name          VARCHAR(100),
    qr_identifier     VARCHAR(100),                          -- Personal Recording QR 바인딩(후속 Phase)
    device_type       VARCHAR(20) NOT NULL DEFAULT 'rower'
                      CHECK (device_type IN ('rower','bike','skierg','treadmill','other')),
    status            VARCHAR(15) NOT NULL DEFAULT 'offline'
                      CHECK (status IN ('online','offline','maintenance')),
    current_mode      VARCHAR(25) NOT NULL DEFAULT 'idle'
                      CHECK (current_mode IN ('idle','racing','personal_recording')),
    firmware_version  VARCHAR(50),
    last_sync_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm5_devices_facility_status ON public.pm5_devices(facility_id, status);

COMMENT ON TABLE  public.pm5_devices IS 'race: PM5 기기. serial_number 주 식별자. current_mode=기기 모드락(idle/racing/personal_recording)';
COMMENT ON COLUMN public.pm5_devices.device_type IS 'R-11: 레인 캐릭터(스프라이트) 테마 결정 소스 — rower/bike/skierg/treadmill/other (15-race-system §5b.3b)';

-- ----------------------------------------------------------------------------
-- 2. race_events — Race 이벤트 (🔄 race_format group 추가 + group_target_m/heat_no)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.race_events (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id        UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
    session_id         UUID REFERENCES public.sessions(id) ON DELETE SET NULL,   -- 세션 연동 (fn_prepare_race_session)
    coach_id           UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    name               VARCHAR(200) NOT NULL,
    event_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    event_type         VARCHAR(20) NOT NULL DEFAULT 'rowing'
                       CHECK (event_type IN ('rowing','bike','skierg','run','other')),
    race_format        VARCHAR(15) NOT NULL DEFAULT 'individual'
                       CHECK (race_format IN ('individual','team','group','relay')),   -- 🔄 group 추가
    target_distance_m  INT,                                   -- 개인/팀/릴레이: 1인(1팀) 목표 거리. NULL=시간제
    duration_minutes   INT,                                   -- 시간제 레이스(정해진 시간 내 거리 경쟁)
    group_target_m     INT,                                   -- 🔄 단체전 A안: 전원 합산 공동 목표 (예: 10000m)
    heat_no            INT NOT NULL DEFAULT 1,                -- 🔄 단체전 B안: 히트 번호(1부터). 개인/팀전은 항상 1
    parent_event_id    UUID REFERENCES public.race_events(id) ON DELETE SET NULL,
                                                              -- 🔄 히트 시리즈 묶음(1번 히트=부모, 이후 히트가 참조)
    carryover_m        NUMERIC(10,2) NOT NULL DEFAULT 0,      -- 🔄 공동목표 분할 진행 시 이월 누계
    description        TEXT,
    status             VARCHAR(15) NOT NULL DEFAULT 'scheduled'
                       CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
    lobby_status       VARCHAR(15) NOT NULL DEFAULT 'setup'
                       CHECK (lobby_status IN ('setup','lobby','countdown','racing','finished')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 세션당 활성(미종료) 이벤트 1개 보장 — fn_prepare_race_session의 최종 방어선
CREATE UNIQUE INDEX IF NOT EXISTS uq_race_events_active_session
    ON public.race_events(session_id)
    WHERE session_id IS NOT NULL AND status NOT IN ('completed','cancelled');

-- 쿼리 패턴: (a) 시설·날짜 이벤트 목록, (b) 진행 중 이벤트 폴링
CREATE INDEX IF NOT EXISTS idx_race_events_facility_date ON public.race_events(facility_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_race_events_active ON public.race_events(status) WHERE status = 'in_progress';

COMMENT ON TABLE  public.race_events IS 'race: 이벤트. race_format=individual/team/group(단체전 신규)/relay. lobby_status=진행 상태머신(setup→lobby→countdown→racing→finished)';
COMMENT ON COLUMN public.race_events.event_type IS 'rowing/bike/skierg/run/other. R-11: 트랙/이펙트 비주얼 테마 결정 소스 (15-race-system §5b.3b)';
COMMENT ON COLUMN public.race_events.group_target_m IS '단체전 A안 공동 목표 거리(전원 합산). 달성률=(carryover_m+Σdistance)/group_target_m';
COMMENT ON COLUMN public.race_events.heat_no IS '단체전 B안 히트 번호. 통합 랭킹은 COALESCE(parent_event_id,id) 시리즈 기준 집계 (15-race-system §4b.3)';
COMMENT ON COLUMN public.race_events.parent_event_id IS '히트 시리즈 루트. 히트 전환은 이전 이벤트 종료 후 fn_prepare_race_session(next_heat_of)로 생성';
COMMENT ON COLUMN public.race_events.carryover_m IS '공동목표 분할 진행 시 이전 히트 누계 이월(next_heat_of가 자동 계산)';

-- 히트 시리즈 통합 집계 조회용
CREATE INDEX IF NOT EXISTS idx_race_events_parent ON public.race_events(parent_event_id)
    WHERE parent_event_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. race_teams — 팀전 편성
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.race_teams (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          UUID NOT NULL REFERENCES public.race_events(id) ON DELETE CASCADE,
    team_name         VARCHAR(100) NOT NULL,
    team_color        VARCHAR(9) NOT NULL DEFAULT '#FF6A00',
    total_distance_m  NUMERIC(10,2) NOT NULL DEFAULT 0,       -- 종료 시 확정 합산 (실시간은 Broadcast 합산)
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, team_name)
);

COMMENT ON TABLE public.race_teams IS 'race: 팀전 편성 (팀 색상/이름). 레인→팀 매핑은 race_live_state.team_id';

-- ----------------------------------------------------------------------------
-- 4. race_live_state — 5초 스냅샷 (재접속 복원용, 이벤트 종료 시 DELETE)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.race_live_state (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id           UUID NOT NULL REFERENCES public.race_events(id) ON DELETE CASCADE,
    device_id          UUID NOT NULL REFERENCES public.pm5_devices(id) ON DELETE CASCADE,
    member_id          UUID REFERENCES public.members(id) ON DELETE SET NULL,
    team_id            UUID REFERENCES public.race_teams(id) ON DELETE SET NULL,
    lane_number        INT NOT NULL,
    distance_m         NUMERIC(10,2) NOT NULL DEFAULT 0,
    power_w            NUMERIC(8,2) NOT NULL DEFAULT 0,
    stroke_rate_spm    NUMERIC(5,1) NOT NULL DEFAULT 0,
    hr_bpm             INT,
    calories_burned    INT NOT NULL DEFAULT 0,
    max_watts          NUMERIC(8,2) NOT NULL DEFAULT 0,
    connection_status  VARCHAR(15) NOT NULL DEFAULT 'connected'
                       CHECK (connection_status IN ('connected','racing','idle','disconnected','offline')),
    last_updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, device_id)
);

-- 스냅샷 UPSERT 루프가 device_id로 조인 (UNIQUE가 event_id 선두 커버)
CREATE INDEX IF NOT EXISTS idx_race_live_state_device ON public.race_live_state(device_id);

COMMENT ON TABLE public.race_live_state IS 'race: 5s 스냅샷(3경로 중 복원 경로). 주 경로는 Broadcast race:{event_id}(DB 미기록). 이벤트 종료 시 DELETE';

-- ----------------------------------------------------------------------------
-- 5. race_recordings — JSONL 원시 레코딩 메타 (파일 본체는 브릿지 서버 로컬 30일)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.race_recordings (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id           UUID REFERENCES public.race_events(id) ON DELETE SET NULL,
    device_id          UUID REFERENCES public.pm5_devices(id) ON DELETE SET NULL,
    device_serial      VARCHAR(100) NOT NULL,
    facility_id        UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
    file_path          VARCHAR(500) NOT NULL,
    file_size_bytes    BIGINT,
    total_data_points  INT,
    duration_seconds   INT,
    recorded_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    recorded_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 결과 적재(멱등)와 recording 매핑이 (event_id, device_serial)로 조회
CREATE INDEX IF NOT EXISTS idx_race_recordings_event_device
    ON public.race_recordings(event_id, device_serial);

COMMENT ON TABLE public.race_recordings IS 'race: JSONL 레코딩 메타. 본체는 race-service 로컬 보관(30일), 종료 후 race_records 멱등 적재의 원천';

-- ----------------------------------------------------------------------------
-- 6. race_records — 최종 결과 (이벤트당 회원 1행, 멱등 적재)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.race_records (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id         UUID REFERENCES public.race_events(id) ON DELETE CASCADE,
    member_id        UUID REFERENCES public.members(id) ON DELETE CASCADE,
    team_id          UUID REFERENCES public.race_teams(id) ON DELETE SET NULL,
    recording_id     UUID REFERENCES public.race_recordings(id) ON DELETE SET NULL,
    device_serial    VARCHAR(100),
    lane_number      INT,
    -- 주의: 히트/공동목표 메타(heat_no/parent_event_id/carryover_m)는 race_events가 보유
    --       (records 스키마 오염 없음 — 15-race-system §4b.3)
    result_time      INTERVAL,                                -- 완주 시간
    result_distance  NUMERIC(10,2),                           -- 완주 거리(m)
    calories_burned  INT,
    avg_watts        NUMERIC(8,2),
    max_watts        NUMERIC(8,2),
    avg_spm          NUMERIC(5,1),
    avg_pace         INTERVAL,                                -- /500m 페이스
    avg_hr_bpm       INT,
    max_hr_bpm       INT,
    finish_rank      INT,
    is_pr            BOOLEAN NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, member_id)
);

-- 쿼리 패턴: (a) 멱등 적재 (event,device_serial), (b) 회원 퍼포먼스 이력, (c) 이벤트 리더보드
CREATE INDEX IF NOT EXISTS idx_race_records_event_device ON public.race_records(event_id, device_serial);
CREATE INDEX IF NOT EXISTS idx_race_records_member ON public.race_records(member_id, created_at DESC);

COMMENT ON TABLE public.race_records IS 'race: 최종 결과. UNIQUE(event,member) 멱등. race-service /recordings/{event}/load-results가 적재. 퍼포먼스 프로필/배지 트리거 연동';

-- ----------------------------------------------------------------------------
-- 7. updated_at 트리거
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_pm5_devices_updated_at ON public.pm5_devices;
CREATE TRIGGER trg_pm5_devices_updated_at BEFORE UPDATE ON public.pm5_devices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_race_events_updated_at ON public.race_events;
CREATE TRIGGER trg_race_events_updated_at BEFORE UPDATE ON public.race_events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 8. RLS  (INSERT/UPDATE=admin+coach, DELETE=admin — P25 하드닝 패턴)
--     Python 브릿지는 Service Role로 우회(RLS 미적용)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pm5_devices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_teams      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_live_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_records    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['pm5_devices','race_events','race_teams',
                             'race_live_state','race_recordings','race_records'] LOOP
        -- 읽기 정책은 아래에서 테이블별 분리 정의 (anon 화이트리스트 4종 / authenticated 2종)
        EXECUTE format('DROP POLICY IF EXISTS "%s read" ON public.%I', t, t);
        -- staff 쓰기
        EXECUTE format('DROP POLICY IF EXISTS "%s staff insert" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s staff insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_coach())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s staff update" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s staff update" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin_or_coach()) WITH CHECK (public.is_admin_or_coach())', t, t);
        -- admin 삭제
        EXECUTE format('DROP POLICY IF EXISTS "%s admin delete" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s admin delete" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t, t);
    END LOOP;
END $$;

-- 【anon SELECT 화이트리스트】 Race TV 화면 미인증 구동 (05-class-portal §6.1)
--   race_events/race_teams/race_live_state/race_records 4종만 공개(이름·기록 수준),
--   pm5_devices/race_recordings는 authenticated 유지(기기·파일 메타 비공개)
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['race_events','race_teams','race_live_state','race_records'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s public read" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s public read" ON public.%I FOR SELECT USING (true)', t, t);  -- TO 미지정 = anon 포함 (의도적)
    END LOOP;
END $$;

DROP POLICY IF EXISTS "pm5_devices read" ON public.pm5_devices;
CREATE POLICY "pm5_devices read" ON public.pm5_devices
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "race_recordings read" ON public.race_recordings;
CREATE POLICY "race_recordings read" ON public.race_recordings
    FOR SELECT TO authenticated USING (true);

-- race_live_state는 이벤트 종료 시 코치 경로에서도 DELETE가 필요 → staff delete로 완화
DROP POLICY IF EXISTS "race_live_state admin delete" ON public.race_live_state;
DROP POLICY IF EXISTS "race_live_state staff delete" ON public.race_live_state;
CREATE POLICY "race_live_state staff delete" ON public.race_live_state
    FOR DELETE TO authenticated USING (public.is_admin_or_coach());

-- ============================================================================
-- 05_race.sql 끝 — 다음: 06_notification.sql
-- ============================================================================
