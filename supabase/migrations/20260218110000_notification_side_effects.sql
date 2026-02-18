-- =============================================
-- Migration: Notification Side Effects & Automation Enhancement
-- Description: 알림 생성 시 푸시/외부 채널 발송 연동 트리거 및 자동화 로직 고도화
-- =============================================

-- ─── 1. pg_net 확장 활성화 (HTTP 요청용) ─────────────────
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── 2. 알림 사이드 이펙트 처리 함수 ───────────────────────
CREATE OR REPLACE FUNCTION public.fn_handle_notification_side_effects()
RETURNS TRIGGER AS $$
DECLARE
  v_prefs RECORD;
  v_sub RECORD;
  v_edge_url_push TEXT;
  v_edge_url_external TEXT;
  v_service_key TEXT;
BEGIN
  -- 1. 사용자 수신 설정 로드
  SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = NEW.user_id;
  
  -- 설정이 없으면 기본값(모두 허용) 가정
  IF NOT FOUND THEN
    -- 기본 설정을 위한 Mock RECORD 또는 처리
    -- 여기서는 간단하게 변수 초기화
  END IF;

  -- 2. 환경 변수 (이 값들은 실제 배포 시 vault 또는 환경 변수에서 가져오게 설정 권장)
  -- 여기서는 시뮬레이션을 위해 하드코딩된 URL 사용 (실제로는 fetch 시점에 결정됨)
  v_edge_url_push := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/send-push-notification';
  v_edge_url_external := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/send-external-notification';

  -- 3. Web Push 처리
  -- preferences에서 push_enabled가 true이고, notifications.channel에 push가 포함되어 있거나 
  -- 명시적으로 push를 보내야 하는 경우 (또는 기본 채널인 경우)
  IF (v_prefs.push_enabled IS NULL OR v_prefs.push_enabled = true) THEN
    -- 사용자의 모든 활성 구독 조회
    FOR v_sub IN
      SELECT endpoint, p256dh_key, auth_key
      FROM public.push_subscriptions
      WHERE user_id = NEW.user_id AND is_active = true
    LOOP
      -- Edge Function 호출 (Async)
      PERFORM net.http_post(
        url := v_edge_url_push,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'apikey'
        ),
        body := jsonb_build_object(
          'subscription', jsonb_build_object(
            'endpoint', v_sub.endpoint,
            'keys', jsonb_build_object(
              'p256dh', v_sub.p256dh_key,
              'auth', v_sub.auth_key
            )
          ),
          'notification', jsonb_build_object(
            'title', NEW.title,
            'body', NEW.content,
            'data', COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object('id', NEW.id, 'action_url', NEW.action_url)
          )
        )
      );
    END LOOP;
  END IF;

  -- 4. 외부 채널 (Kakao/SMS) 처리
  -- 중요 알림(membership_expiry 등)이면서 채널 설정이 되어 있는 경우
  IF (NEW.category = 'membership_expiry' OR NEW.type = 'urgent') AND (v_prefs.kakao_enabled = true OR v_prefs.sms_enabled = true) THEN
    PERFORM net.http_post(
        url := v_edge_url_external,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'apikey'
        ),
        body := jsonb_build_object(
          'channel', CASE WHEN v_prefs.kakao_enabled THEN 'kakao' ELSE 'sms' END,
          'phone', (SELECT phone FROM public.members WHERE user_id = NEW.user_id LIMIT 1),
          'message', NEW.content,
          'category', NEW.category
        )
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. 트리거 등록 ─────────────────────────────────────
DROP TRIGGER IF EXISTS trg_notifications_side_effects ON public.notifications;
CREATE TRIGGER trg_notifications_side_effects
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_notification_side_effects();


-- ─── 4. 수업 리마인더 로직 고도화 ─────────────────────────
CREATE OR REPLACE FUNCTION public.fn_send_class_reminders()
RETURNS void AS $$
DECLARE
  v_session RECORD;
  v_booking RECORD;
BEGIN
  -- 시작 60분 전 수업 조회 (이미 발송된 건 제외를 위해 notifications와 JOIN 고려 가능하나 여기서는 간단히)
  FOR v_session IN
    SELECT s.id, s.title, s.start_time, f.name as facility_name
    FROM public.sessions s
    JOIN public.facilities f ON s.facility_id = f.id
    WHERE s.session_date = CURRENT_DATE
      AND s.start_time > CURRENT_TIME
      AND s.start_time <= (CURRENT_TIME + interval '65 minutes')
      AND s.status = 'scheduled'
  LOOP
    FOR v_booking IN
      SELECT b.id as booking_id, b.user_id, m.id as member_id, m.name as member_name
      FROM public.bookings b
      JOIN public.members m ON b.member_id = m.id
      WHERE b.session_id = v_session.id
        AND b.status = 'confirmed'
    LOOP
      -- 중복 발송 방지 (같은 수업에 대해 2시간 이내 발송 내역 확인)
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = v_booking.user_id 
          AND category = 'class_reminder'
          AND metadata->>'session_id' = v_session.id::text
          AND created_at > (now() - interval '2 hours')
      ) THEN
        INSERT INTO public.notifications (
          user_id, member_id, title, content, category, type, channel, action_url, metadata
        ) VALUES (
          v_booking.user_id,
          v_booking.member_id,
          '수업 리마인더 📅',
          v_booking.member_name || '님, [' || v_session.title || '] 수업 시작 1시간 전입니다. ' || v_session.facility_name || '에서 만나요!',
          'class_reminder',
          'info',
          'push', -- 트리거가 push/in-app 모두 처리하므로 대표 채널 지정
          '/apps/schedule',
          jsonb_build_object('session_id', v_session.id, 'booking_id', v_booking.booking_id)
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── 5. 빈자리 알림 트리거 고도화 ─────────────────────────
CREATE OR REPLACE FUNCTION public.fn_notify_waitlist_on_vacancy()
RETURNS TRIGGER AS $$
DECLARE
  v_session_title TEXT;
  v_waiter RECORD;
  v_limit INT := 3; -- 상위 3명에게만 알림
BEGIN
  -- 취소된 경우에만 동작
  IF (OLD.status = 'confirmed' AND NEW.status = 'cancelled') THEN
    
    SELECT title INTO v_session_title FROM public.sessions WHERE id = NEW.session_id;

    -- 대기열 상위 N명 조회
    FOR v_waiter IN
      SELECT b.user_id, b.member_id, m.name
      FROM public.bookings b
      JOIN public.members m ON b.member_id = m.id
      WHERE b.session_id = NEW.session_id
        AND b.status = 'waitlist'
      ORDER BY b.created_at ASC
      LIMIT v_limit
    LOOP
      INSERT INTO public.notifications (
        user_id, member_id, title, content, category, type, action_url, metadata
      ) VALUES (
        v_waiter.user_id,
        v_waiter.member_id,
        '빈자리 알림 🎉',
        v_waiter.name || '님, 예약 대기 중인 [' || v_session_title || '] 수업에 빈자리가 생겼습니다! 지금 바로 예약하세요.',
        'waitlist_vacancy',
        'info',
        '/apps/schedule',
        jsonb_build_object('session_id', NEW.session_id)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_waitlist_on_vacancy ON public.bookings;
CREATE TRIGGER trg_notify_waitlist_on_vacancy
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_waitlist_on_vacancy();
