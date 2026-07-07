-- =============================================
-- Migration: 보조 테이블 (qr_codes, kiosk_devices, audit_logs)
-- =============================================

-- ─── 1. QR 코드 관리 테이블 ─────────────────
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.facilities(id),
    code VARCHAR(200) UNIQUE NOT NULL,
    qr_type VARCHAR(50) CHECK (qr_type IN ('facility', 'session', 'member')),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.qr_codes IS '고정 QR 관리 테이블';

CREATE INDEX idx_qr_codes_facility ON public.qr_codes(facility_id);
CREATE INDEX idx_qr_codes_type ON public.qr_codes(qr_type);

-- ─── 2. 키오스크 기기 관리 테이블 ─────────────
CREATE TABLE IF NOT EXISTS public.kiosk_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.facilities(id),
    device_name VARCHAR(100) NOT NULL,
    device_ip VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'offline', 'maintenance')),
    display_message TEXT,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.kiosk_devices IS '키오스크 기기 관리 테이블';

CREATE INDEX idx_kiosk_devices_facility ON public.kiosk_devices(facility_id);
CREATE INDEX idx_kiosk_devices_status ON public.kiosk_devices(status);

-- ─── 3. 감사 로그 테이블 ──────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS '관리자 액션 감사 로그';

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);

-- ─── RLS 활성화 ──────────────────────────────
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiosk_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read qr_codes" ON public.qr_codes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read kiosk_devices" ON public.kiosk_devices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin manage qr_codes" ON public.qr_codes
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Allow admin manage kiosk_devices" ON public.kiosk_devices
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Allow admin manage audit_logs" ON public.audit_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
