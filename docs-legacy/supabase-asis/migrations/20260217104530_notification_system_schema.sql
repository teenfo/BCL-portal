-- ============================================================
-- Migration: notification_system_schema
-- Purpose: 알림 시스템 핵심 테이블 복구
--   저장소에 생성 마이그레이션이 누락된 원격 live-schema 테이블 복원
--   (감사 지적 2.1 해소)
-- Date: 2026-02-17 (원래 생성 시점 기준 타임스탬프)
-- ============================================================

-- notification_rules
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    description TEXT,
    trigger_type VARCHAR NOT NULL,
    trigger_config JSONB NOT NULL DEFAULT '{}'::JSONB,
    title_template VARCHAR NOT NULL,
    message_template TEXT NOT NULL,
    category VARCHAR NOT NULL,
    channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    facility_id UUID REFERENCES public.facilities(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin manage notification_rules" ON public.notification_rules
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Allow authenticated read notification_rules" ON public.notification_rules
    FOR SELECT TO authenticated USING (TRUE);

COMMENT ON TABLE public.notification_rules IS '자동 알림 규칙 정의';

-- notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id),
    class_reminder BOOLEAN DEFAULT TRUE,
    waitlist_vacancy BOOLEAN DEFAULT TRUE,
    membership_expiry BOOLEAN DEFAULT TRUE,
    promotion BOOLEAN DEFAULT TRUE,
    checkin BOOLEAN DEFAULT TRUE,
    system_notification BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    kakao_enabled BOOLEAN DEFAULT FALSE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    email_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notification_preferences" ON public.notification_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin read all notification_preferences" ON public.notification_preferences
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE public.notification_preferences IS '사용자별 알림 수신 설정';

-- push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id),
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    device_type VARCHAR,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push_subscriptions" ON public.push_subscriptions
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.push_subscriptions IS '웹 푸시 구독 정보';

-- wods (레거시 — 향후 session_wods로 마이그레이션 예정)
CREATE TABLE IF NOT EXISTS public.wods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL,
    warmup JSONB,
    strength JSONB,
    metcon JSONB,
    cooldown JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read wods" ON public.wods
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Allow admin/coach manage wods" ON public.wods
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')));

COMMENT ON TABLE public.wods IS 'LEGACY: 레거시 WOD 테이블. Priority 23 P1-A session_wods 전환 완료 후 제거 예정.';
