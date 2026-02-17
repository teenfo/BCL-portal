-- =============================================
-- Migration: Race System (race_events, race_records, pm5_devices)
-- =============================================

-- Race 이벤트 테이블
CREATE TABLE IF NOT EXISTS public.race_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.facilities(id),
    name VARCHAR(200) NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('rowing', 'bike', 'skierg', 'run', 'other')),
    distance_meters INT,
    duration_minutes INT,
    description TEXT,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.race_events IS 'Race 이벤트 테이블';
COMMENT ON COLUMN public.race_events.event_type IS '종목: rowing, bike, skierg, run, other';

-- Race 기록 테이블
CREATE TABLE IF NOT EXISTS public.race_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.race_events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    device_serial VARCHAR(100),
    result_time INTERVAL,
    result_distance DECIMAL(10,2),
    calories_burned INT,
    avg_watts DECIMAL(8,2),
    avg_pace INTERVAL,
    is_pr BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, member_id)
);

COMMENT ON TABLE public.race_records IS 'Race 기록 테이블';

-- PM5 기기 관리 테이블
CREATE TABLE IF NOT EXISTS public.pm5_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.facilities(id),
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('rower', 'bike', 'skierg')),
    status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'maintenance')),
    firmware_version VARCHAR(50),
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.pm5_devices IS 'PM5 기기 관리 테이블';

-- 인덱스
CREATE INDEX idx_race_events_facility ON public.race_events(facility_id);
CREATE INDEX idx_race_events_date ON public.race_events(event_date);
CREATE INDEX idx_race_events_status ON public.race_events(status);
CREATE INDEX idx_race_records_event ON public.race_records(event_id);
CREATE INDEX idx_race_records_member ON public.race_records(member_id);
CREATE INDEX idx_pm5_devices_facility ON public.pm5_devices(facility_id);

-- RLS 활성화
ALTER TABLE public.race_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm5_devices ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 읽기 (인증 사용자)
CREATE POLICY "Allow authenticated read race_events" ON public.race_events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read race_records" ON public.race_records
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read pm5_devices" ON public.pm5_devices
  FOR SELECT TO authenticated USING (true);

-- RLS 정책: 관리자 전체 관리
CREATE POLICY "Allow admin manage race_events" ON public.race_events
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Allow admin manage race_records" ON public.race_records
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Allow admin manage pm5_devices" ON public.pm5_devices
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
