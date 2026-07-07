-- ==========================================
-- Race System Enhancement Migration
-- Created at: 2026-02-21
-- ==========================================

-- 1. race_events 테이블 확장
ALTER TABLE public.race_events ADD COLUMN IF NOT EXISTS race_format VARCHAR(20) DEFAULT 'individual'
    CHECK (race_format IN ('individual', 'team', 'relay'));
ALTER TABLE public.race_events ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id);
ALTER TABLE public.race_events ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.coaches(id);
ALTER TABLE public.race_events ADD COLUMN IF NOT EXISTS target_distance_m INT;
ALTER TABLE public.race_events ADD COLUMN IF NOT EXISTS lobby_status VARCHAR(20) DEFAULT 'setup'
    CHECK (lobby_status IN ('setup', 'lobby', 'countdown', 'racing', 'finished'));

-- 2. pm5_devices 테이블 확장
ALTER TABLE public.pm5_devices ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE public.pm5_devices ADD COLUMN IF NOT EXISTS ble_name VARCHAR(100);
ALTER TABLE public.pm5_devices ADD COLUMN IF NOT EXISTS current_mode VARCHAR(30) DEFAULT 'idle'
    CHECK (current_mode IN ('idle', 'racing', 'personal_recording'));
ALTER TABLE public.pm5_devices ADD COLUMN IF NOT EXISTS qr_identifier VARCHAR(100);
ALTER TABLE public.pm5_devices DROP CONSTRAINT IF EXISTS pm5_devices_device_type_check;
ALTER TABLE public.pm5_devices ADD CONSTRAINT pm5_devices_device_type_check
    CHECK (device_type IN ('rower', 'bike', 'skierg', 'treadmill', 'other'));

-- 3. race_teams 테이블 신설 (팀전 지원)
CREATE TABLE IF NOT EXISTS public.race_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.race_events(id) ON DELETE CASCADE,
    team_name VARCHAR(100) NOT NULL,
    team_color VARCHAR(7) NOT NULL DEFAULT '#FF6A00',
    total_distance_m DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, team_name)
);
CREATE INDEX IF NOT EXISTS idx_race_teams_event ON public.race_teams(event_id);

-- 4. race_live_state 테이블 신설 (레코드 실시간 상태)
CREATE TABLE IF NOT EXISTS public.race_live_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.race_events(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.pm5_devices(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id),
    lane_number INT NOT NULL,
    team_id UUID REFERENCES public.race_teams(id),
    distance_m DECIMAL(10,2) DEFAULT 0,
    power_w DECIMAL(8,2) DEFAULT 0,
    stroke_rate_spm DECIMAL(5,1) DEFAULT 0,
    hr_bpm INT,
    calories_burned INT DEFAULT 0,
    max_watts DECIMAL(8,2) DEFAULT 0,
    connection_status VARCHAR(20) DEFAULT 'connected'
        CHECK (connection_status IN ('connected','racing','idle','disconnected','offline')),
    last_updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, device_id)
);
CREATE INDEX IF NOT EXISTS idx_race_live_state_event ON public.race_live_state(event_id);

-- 5. race_recordings 테이블 신설 (파일 메타데이터)
CREATE TABLE IF NOT EXISTS public.race_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.race_events(id) ON DELETE SET NULL,
    device_id UUID REFERENCES public.pm5_devices(id) ON DELETE SET NULL,
    device_serial VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    total_data_points INT,
    duration_seconds INT,
    recorded_at TIMESTAMPTZ DEFAULT now(),
    recorded_by UUID REFERENCES auth.users(id),
    facility_id UUID REFERENCES public.facilities(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_race_recordings_event ON public.race_recordings(event_id);
CREATE INDEX IF NOT EXISTS idx_race_recordings_device ON public.race_recordings(device_id);
CREATE INDEX IF NOT EXISTS idx_race_recordings_recorded_at ON public.race_recordings(recorded_at);

-- 6. race_records 테이블 확장 (결과 데이터 추가)
ALTER TABLE public.race_records ALTER COLUMN event_id DROP NOT NULL;
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS max_watts DECIMAL(8,2);
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS max_hr_bpm INT;
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS avg_spm DECIMAL(5,1);
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS avg_hr_bpm INT;
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS recording_id UUID REFERENCES public.race_recordings(id);
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.race_teams(id);
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS lane_number INT;
ALTER TABLE public.race_records ADD COLUMN IF NOT EXISTS finish_rank INT;

-- ==========================================
-- RLS Policies
-- ==========================================

-- race_live_state
ALTER TABLE public.race_live_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read race_live_state" ON public.race_live_state
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow coach/admin manage race_live_state" ON public.race_live_state
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach'))
    );

-- race_recordings
ALTER TABLE public.race_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read race_recordings" ON public.race_recordings
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow coach/admin manage race_recordings" ON public.race_recordings
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach'))
    );

-- race_teams
ALTER TABLE public.race_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read race_teams" ON public.race_teams
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow coach/admin manage race_teams" ON public.race_teams
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach'))
    );
