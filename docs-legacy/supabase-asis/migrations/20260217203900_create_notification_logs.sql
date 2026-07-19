-- =============================================
-- Migration: Notification Logs
-- notification_rules는 이미 존재, notification_logs만 추가
-- =============================================

CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.notification_rules(id),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.notification_logs IS '알림 발송 로그 테이블';

-- 인덱스
CREATE INDEX idx_notification_logs_rule ON public.notification_logs(rule_id);
CREATE INDEX idx_notification_logs_user ON public.notification_logs(user_id);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notification_logs_sent ON public.notification_logs(sent_at);

-- RLS 활성화
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read notification_logs" ON public.notification_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin manage notification_logs" ON public.notification_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
