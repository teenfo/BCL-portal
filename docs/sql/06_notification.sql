-- ============================================================================
-- BCL Portal 재구축 DDL — 06_notification.sql
-- ----------------------------------------------------------------------------
-- 목적   : notification 도메인 — notifications / notification_rules /
--          notification_logs / notification_preferences / push_subscriptions
--          + 사이드이펙트 트리거 + 빈자리 트리거 + 리마인더/만기 크론 함수
--          + pg_cron 등록 2건 (⚠️ as-is 미등록 상태의 정식 해소)
-- 의존   : 00 (pg_net/pg_cron), 01 (members), 02 (memberships), 03 (sessions/bookings)
-- 참고   : Edge Function 호출 설정(system_config: edge_base_url / edge_service_key)은
--          08_rbac_supplementary.sql의 system_config에 저장 — 트리거는 미설정 시
--          조용히 스킵(알림 INSERT 자체는 실패하지 않음)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. notifications — 인앱 알림 (모든 채널 발송의 원천 레코드)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id   UUID REFERENCES public.members(id) ON DELETE SET NULL,
    title       VARCHAR(200) NOT NULL,
    content     TEXT NOT NULL,
    category    VARCHAR(30) NOT NULL DEFAULT 'system'
                CHECK (category IN ('class_reminder','waitlist_vacancy','membership_expiry',
                                    'promotion','checkin','badge','system')),
    type        VARCHAR(10) NOT NULL DEFAULT 'info'
                CHECK (type IN ('info','success','warning','error','urgent')),
    channel     VARCHAR(10) NOT NULL DEFAULT 'in_app'
                CHECK (channel IN ('in_app','push','kakao','sms','email')),
    action_url  TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 쿼리 패턴: (a) 내 미읽음 목록, (b) 중복 발송 방지(카테고리+metadata 조회)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_category
    ON public.notifications(user_id, category, created_at DESC);

COMMENT ON TABLE public.notifications IS 'notification: 알림 원천. INSERT 시 trg_notifications_side_effects가 push/외부 채널 팬아웃';

-- ----------------------------------------------------------------------------
-- 2. notification_rules — 자동 알림 규칙 (Admin CRM 탭)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id       UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    name              VARCHAR(100) NOT NULL,
    description       TEXT,
    trigger_type      VARCHAR(30) NOT NULL
                      CHECK (trigger_type IN ('class_reminder','membership_expiry',
                                              'waitlist_vacancy','absence','birthday','manual')),
    trigger_config    JSONB NOT NULL DEFAULT '{}'::jsonb,      -- {"minutes_before":60} / {"days_before":[7,3,1]}
    title_template    VARCHAR(200) NOT NULL,
    message_template  TEXT NOT NULL,
    category          VARCHAR(30) NOT NULL,
    channels          TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_rules IS 'notification: 자동 알림 규칙. 크론 함수가 is_active 규칙의 trigger_config를 읽어 발송 파라미터화';

-- ----------------------------------------------------------------------------
-- 3. notification_logs — 채널 발송 로그
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id          UUID REFERENCES public.notification_rules(id) ON DELETE SET NULL,
    notification_id  UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel          VARCHAR(10) NOT NULL,
    status           VARCHAR(10) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','sent','failed','read')),
    sent_at          TIMESTAMPTZ,
    read_at          TIMESTAMPTZ,
    error_message    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON public.notification_logs(notification_id);

COMMENT ON TABLE public.notification_logs IS 'notification: 채널별 발송 결과. Edge Function 콜백/응답이 status 갱신';

-- ----------------------------------------------------------------------------
-- 4. notification_preferences — 사용자 수신 설정
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    class_reminder       BOOLEAN NOT NULL DEFAULT true,
    waitlist_vacancy     BOOLEAN NOT NULL DEFAULT true,
    membership_expiry    BOOLEAN NOT NULL DEFAULT true,
    promotion            BOOLEAN NOT NULL DEFAULT true,
    checkin              BOOLEAN NOT NULL DEFAULT true,
    system_notification  BOOLEAN NOT NULL DEFAULT true,
    push_enabled         BOOLEAN NOT NULL DEFAULT true,
    kakao_enabled        BOOLEAN NOT NULL DEFAULT false,
    sms_enabled          BOOLEAN NOT NULL DEFAULT false,
    email_enabled        BOOLEAN NOT NULL DEFAULT false,
    celebrate_opt_in     BOOLEAN NOT NULL DEFAULT true,   -- 🔄 Class screen PR 축하 티커 공개 동의 (05-class-portal §3.2)
    quiet_hours_start    TIME,
    quiet_hours_end      TIME,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_preferences IS 'notification: 수신 설정. user당 1행(UNIQUE — as-is 무제약 정리). 없으면 전 채널 기본값 허용으로 간주';

-- ----------------------------------------------------------------------------
-- 5. push_subscriptions — 웹 푸시(VAPID) 구독
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint      TEXT NOT NULL UNIQUE,
    p256dh_key    TEXT NOT NULL,
    auth_key      TEXT NOT NULL,
    device_type   VARCHAR(20),
    user_agent    TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    last_used_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
    ON public.push_subscriptions(user_id) WHERE is_active = true;

COMMENT ON TABLE public.push_subscriptions IS 'notification: 웹 푸시 구독. endpoint UNIQUE(중복 구독 방지 — as-is 무제약 정리)';

-- ----------------------------------------------------------------------------
-- 6. 내부 헬퍼 — Edge Function 설정 조회 (system_config, 미설정 시 NULL)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._notify_edge_config()
RETURNS TABLE (base_url TEXT, service_key TEXT)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
    IF to_regclass('public.system_config') IS NULL THEN
        RETURN;                                          -- 부트스트랩 중(08 미적용)이면 스킵
    END IF;
    RETURN QUERY
    SELECT
        (SELECT config_value #>> '{}' FROM public.system_config WHERE config_key = 'edge_base_url'),
        (SELECT config_value #>> '{}' FROM public.system_config WHERE config_key = 'edge_service_key');
END;
$$;

COMMENT ON FUNCTION public._notify_edge_config() IS 'notification 내부: Edge Function base URL/키를 system_config에서 조회 (as-is의 request.headers 의존 제거 — cron 컨텍스트에서도 동작)';

-- ----------------------------------------------------------------------------
-- 7. 트리거 함수 ① — 알림 사이드이펙트 (push / 외부 채널 팬아웃)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_handle_notification_side_effects()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefs RECORD;
    v_sub   RECORD;
    v_cfg   RECORD;
    v_phone TEXT;
BEGIN
    SELECT * INTO v_cfg FROM public._notify_edge_config();
    IF v_cfg.base_url IS NULL OR v_cfg.service_key IS NULL THEN
        RETURN NEW;                                      -- 설정 없으면 인앱 알림만 (발송 스킵)
    END IF;

    SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = NEW.user_id;

    -- (1) Web Push: 설정 없거나 push_enabled=true인 사용자의 활성 구독 전체
    IF (v_prefs IS NULL OR v_prefs.push_enabled) THEN
        FOR v_sub IN
            SELECT endpoint, p256dh_key, auth_key
            FROM public.push_subscriptions
            WHERE user_id = NEW.user_id AND is_active = true
        LOOP
            BEGIN
                PERFORM net.http_post(
                    url     := v_cfg.base_url || '/functions/v1/send-push-notification',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || v_cfg.service_key),
                    body    := jsonb_build_object(
                        'subscription', jsonb_build_object(
                            'endpoint', v_sub.endpoint,
                            'keys', jsonb_build_object('p256dh', v_sub.p256dh_key, 'auth', v_sub.auth_key)),
                        'notification', jsonb_build_object(
                            'title', NEW.title,
                            'body',  NEW.content,
                            'data',  COALESCE(NEW.metadata, '{}'::jsonb)
                                     || jsonb_build_object('id', NEW.id, 'action_url', NEW.action_url)))
                );
                INSERT INTO public.notification_logs (notification_id, user_id, channel, status, sent_at)
                VALUES (NEW.id, NEW.user_id, 'push', 'sent', now());
            EXCEPTION WHEN OTHERS THEN
                INSERT INTO public.notification_logs (notification_id, user_id, channel, status, error_message)
                VALUES (NEW.id, NEW.user_id, 'push', 'failed', SQLERRM);
            END;
        END LOOP;
    END IF;

    -- (2) 외부 채널(카카오/SMS): 중요 알림 + 사용자 옵트인 시에만  🧪 EF는 현행 mock
    IF (NEW.category = 'membership_expiry' OR NEW.type = 'urgent')
       AND v_prefs IS NOT NULL AND (v_prefs.kakao_enabled OR v_prefs.sms_enabled) THEN
        SELECT phone INTO v_phone FROM public.members WHERE user_id = NEW.user_id LIMIT 1;
        IF v_phone IS NOT NULL THEN
            BEGIN
                PERFORM net.http_post(
                    url     := v_cfg.base_url || '/functions/v1/send-external-notification',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || v_cfg.service_key),
                    body    := jsonb_build_object(
                        'channel',  CASE WHEN v_prefs.kakao_enabled THEN 'kakao' ELSE 'sms' END,
                        'phone',    v_phone,
                        'message',  NEW.content,
                        'category', NEW.category)
                );
                INSERT INTO public.notification_logs (notification_id, user_id, channel, status, sent_at)
                VALUES (NEW.id, NEW.user_id,
                        CASE WHEN v_prefs.kakao_enabled THEN 'kakao' ELSE 'sms' END, 'sent', now());
            EXCEPTION WHEN OTHERS THEN
                INSERT INTO public.notification_logs (notification_id, user_id, channel, status, error_message)
                VALUES (NEW.id, NEW.user_id,
                        CASE WHEN v_prefs.kakao_enabled THEN 'kakao' ELSE 'sms' END, 'failed', SQLERRM);
            END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_side_effects ON public.notifications;
CREATE TRIGGER trg_notifications_side_effects
    AFTER INSERT ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.fn_handle_notification_side_effects();

COMMENT ON FUNCTION public.fn_handle_notification_side_effects() IS '트리거: notifications INSERT → pg_net으로 Edge Function 비동기 팬아웃 + notification_logs 기록. 실패해도 원본 INSERT는 성공';

-- ----------------------------------------------------------------------------
-- 8. 트리거 함수 ② — 예약 취소 시 빈자리 알림 (대기열 상위 3명)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notify_waitlist_on_vacancy()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_title TEXT;
    v_waiter RECORD;
BEGIN
    IF (OLD.status = 'confirmed' AND NEW.status = 'cancelled') THEN
        SELECT title INTO v_session_title FROM public.sessions WHERE id = NEW.session_id;

        FOR v_waiter IN
            SELECT m.user_id, b.member_id, m.name
            FROM public.bookings b
            JOIN public.members m ON m.id = b.member_id
            WHERE b.session_id = NEW.session_id
              AND b.status = 'waitlisted'
              AND m.user_id IS NOT NULL
            ORDER BY b.created_at ASC
            LIMIT 3
        LOOP
            INSERT INTO public.notifications (user_id, member_id, title, content, category, type, action_url, metadata)
            VALUES (
                v_waiter.user_id, v_waiter.member_id,
                '빈자리 알림',
                v_waiter.name || '님, 대기 중인 [' || COALESCE(v_session_title,'수업') || ']에 빈자리가 생겼습니다. 지금 예약하세요.',
                'waitlist_vacancy', 'info', '/apps/schedule',
                jsonb_build_object('session_id', NEW.session_id)
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_waitlist_on_vacancy ON public.bookings;
CREATE TRIGGER trg_notify_waitlist_on_vacancy
    AFTER UPDATE OF status ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.fn_notify_waitlist_on_vacancy();

COMMENT ON FUNCTION public.fn_notify_waitlist_on_vacancy() IS '트리거: confirmed→cancelled 전환 시 waitlisted 상위 3명에게 빈자리 알림';

-- ----------------------------------------------------------------------------
-- 9. 크론 함수 ① — 수업 리마인더 (시작 60분 전, 10분 주기 스캔)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_send_class_reminders()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_booking RECORD;
BEGIN
    FOR v_session IN
        SELECT s.id, s.title, s.start_time, f.name AS facility_name
        FROM public.sessions s
        JOIN public.facilities f ON f.id = s.facility_id
        WHERE s.session_date = CURRENT_DATE
          AND s.status = 'scheduled'
          -- 시작 50~70분 전 창(10분 주기 스캔과 겹침 방지)
          AND (s.session_date + s.start_time) BETWEEN now() + INTERVAL '50 minutes'
                                                  AND now() + INTERVAL '70 minutes'
    LOOP
        FOR v_booking IN
            SELECT b.id AS booking_id, m.user_id, m.id AS member_id, m.name AS member_name
            FROM public.bookings b
            JOIN public.members m ON m.id = b.member_id
            WHERE b.session_id = v_session.id
              AND b.status = 'confirmed'
              AND m.user_id IS NOT NULL
        LOOP
            -- 중복 발송 방지: 같은 세션 리마인더가 2시간 내 존재하면 스킵
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications
                WHERE user_id = v_booking.user_id
                  AND category = 'class_reminder'
                  AND metadata->>'session_id' = v_session.id::text
                  AND created_at > now() - INTERVAL '2 hours'
            ) THEN
                INSERT INTO public.notifications (user_id, member_id, title, content, category, type, channel, action_url, metadata)
                VALUES (
                    v_booking.user_id, v_booking.member_id,
                    '수업 리마인더',
                    v_booking.member_name || '님, [' || v_session.title || '] 수업 시작 1시간 전입니다. '
                        || v_session.facility_name || '에서 만나요!',
                    'class_reminder', 'info', 'push', '/apps/schedule',
                    jsonb_build_object('session_id', v_session.id, 'booking_id', v_booking.booking_id)
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.fn_send_class_reminders() IS '크론(10분): 시작 60분 전 수업의 confirmed 예약자에게 리마인더. 중복 발송 2시간 가드';

-- ----------------------------------------------------------------------------
-- 10. 크론 함수 ② — 멤버십 만기 D-7/D-3/D-1 알림 (⏳ as-is에는 문서만 존재 → 정식 구현)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_send_membership_expiry_reminders()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row RECORD;
    v_days INT;
BEGIN
    FOR v_row IN
        SELECT ms.id AS membership_id, ms.end_date, ms.member_id,
               m.user_id, m.name AS member_name, mp.name AS plan_name
        FROM public.memberships ms
        JOIN public.members m ON m.id = ms.member_id
        LEFT JOIN public.membership_plans mp ON mp.id = ms.plan_id
        WHERE ms.status = 'active'
          AND m.user_id IS NOT NULL
          AND ms.end_date IN (CURRENT_DATE + 7, CURRENT_DATE + 3, CURRENT_DATE + 1)
    LOOP
        v_days := (v_row.end_date - CURRENT_DATE);

        -- 멤버십·디데이 단위 중복 발송 방지 (하루 1회)
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications
            WHERE user_id = v_row.user_id
              AND category = 'membership_expiry'
              AND metadata->>'membership_id' = v_row.membership_id::text
              AND metadata->>'d_day' = v_days::text
        ) THEN
            INSERT INTO public.notifications (user_id, member_id, title, content, category, type, channel, action_url, metadata)
            VALUES (
                v_row.user_id, v_row.member_id,
                '멤버십 만료 D-' || v_days,
                v_row.member_name || '님, ' || COALESCE(v_row.plan_name,'멤버십') || '이(가) '
                    || TO_CHAR(v_row.end_date, 'MM월 DD일') || ' 만료됩니다. 갱신을 잊지 마세요.',
                'membership_expiry',
                CASE WHEN v_days = 1 THEN 'urgent' ELSE 'warning' END,
                'push', '/apps/profile',
                jsonb_build_object('membership_id', v_row.membership_id, 'd_day', v_days)
            );
        END IF;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.fn_send_membership_expiry_reminders() IS '크론(일일): active 멤버십 만기 D-7/3/1 알림. (membership_id, d_day) 단위 멱등';

-- ----------------------------------------------------------------------------
-- 11. pg_cron 등록 — 【as-is 등록 0건의 해소, 이 파일이 SSOT】
--     cron.schedule(jobname, ...)은 동일 jobname UPSERT — 재실행 안전
-- ----------------------------------------------------------------------------
SELECT cron.schedule(
    'bcl-class-reminders',                  -- 수업 리마인더: 10분 주기
    '*/10 * * * *',
    $$SELECT public.fn_send_class_reminders()$$
);

SELECT cron.schedule(
    'bcl-membership-expiry-reminders',      -- 만기 D-7/3/1: 매일 00:00 UTC = KST 09:00
    '0 0 * * *',
    $$SELECT public.fn_send_membership_expiry_reminders()$$
);

-- ----------------------------------------------------------------------------
-- 12. updated_at 트리거 + RLS
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_notification_rules_updated_at ON public.notification_rules;
CREATE TRIGGER trg_notification_rules_updated_at BEFORE UPDATE ON public.notification_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions       ENABLE ROW LEVEL SECURITY;

-- notifications: 본인 읽기 + is_read/read_at 갱신 / admin 관리 (INSERT는 트리거·서버 경유)
DROP POLICY IF EXISTS "notifications own read" ON public.notifications;
CREATE POLICY "notifications own read" ON public.notifications
    FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications own update" ON public.notifications;
CREATE POLICY "notifications own update" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications admin manage" ON public.notifications;
CREATE POLICY "notifications admin manage" ON public.notifications
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- notification_rules: admin 전용 (as-is의 authenticated 전체 읽기 제거)
DROP POLICY IF EXISTS "notification_rules admin only" ON public.notification_rules;
CREATE POLICY "notification_rules admin only" ON public.notification_rules
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- notification_logs: admin 전용 (as-is의 authenticated 전체 읽기 제거 — 타인 로그 노출 차단)
DROP POLICY IF EXISTS "notification_logs admin only" ON public.notification_logs;
CREATE POLICY "notification_logs admin only" ON public.notification_logs
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- notification_preferences / push_subscriptions: 본인 관리 + admin 읽기
DROP POLICY IF EXISTS "notification_preferences own manage" ON public.notification_preferences;
CREATE POLICY "notification_preferences own manage" ON public.notification_preferences
    FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "notification_preferences admin read" ON public.notification_preferences;
CREATE POLICY "notification_preferences admin read" ON public.notification_preferences
    FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "push_subscriptions own manage" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions own manage" ON public.push_subscriptions
    FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 06_notification.sql 끝 — 다음: 07_performance_badges.sql
-- ============================================================================
