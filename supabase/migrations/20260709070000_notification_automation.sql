-- ============================================================================
-- BCL Portal — 20260709070000_notification_automation.sql
-- ----------------------------------------------------------------------------
-- 목적 : 알림 자동화 계약(docs/08 §2.2)의 정식 보증 + 서버 발송 진입점 RPC.
--   (1) fn_dispatch_notification — 신규 알림 디스패치 RPC(SECURITY DEFINER, envelope).
--       send-notification Edge Function의 in_app 경로 및 Admin 브로드캐스트가 호출.
--       notifications INSERT → 기존 trg_notifications_side_effects가 push/외부 채널 팬아웃.
--   (2) §2.2 자동화(pg_cron 2종 + 트리거 2종) 멱등 재등록 —
--       함수 본체는 06_notification 마이그레이션(SSOT)에 정의됨. 여기서는 registration만 보증.
--         · cron: bcl-class-reminders(*/10) · bcl-membership-expiry-reminders(0 0 * * *)
--         · trg : trg_notifications_side_effects(notifications AFTER INSERT)
--                 trg_notify_waitlist_on_vacancy(bookings AFTER UPDATE OF status)
-- 의존 : 06_notification(테이블·함수·트리거), 00(pg_cron/pg_net), is_admin(), members
-- 규약 : 신규 RPC = SECURITY DEFINER + SET search_path=public + 내부 auth.uid() 검증 +
--        envelope {success,data,error} 1종 (CLAUDE.md 데이터 규칙).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. fn_dispatch_notification — 서버 측 알림 디스패치 (in_app 원천 레코드 생성)
--    · 본인 대상 = 누구나 / 타인 대상 = admin 전용 (클라이언트가 임의 user_id 주입 차단)
--    · notifications 는 authenticated INSERT 정책이 없음 → SECURITY DEFINER 로 우회 삽입
--    · INSERT 성공 시 trg_notifications_side_effects 가 채널 팬아웃 수행
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_dispatch_notification(
    p_user_id    UUID,
    p_title      TEXT,
    p_content    TEXT,
    p_category   TEXT  DEFAULT 'system',
    p_type       TEXT  DEFAULT 'info',
    p_action_url TEXT  DEFAULT NULL,
    p_metadata   JSONB DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller    UUID := auth.uid();
    v_member_id UUID;
    v_notif_id  UUID;
BEGIN
    IF v_caller IS NULL THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'no_session');
    END IF;

    -- 대상 권한: 본인 지정만 허용, 타인 지정은 admin 만
    IF p_user_id IS NULL OR p_user_id <> v_caller THEN
        IF NOT public.is_admin() THEN
            RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
        END IF;
    END IF;

    IF p_title IS NULL OR btrim(p_title) = ''
       OR p_content IS NULL OR btrim(p_content) = '' THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'missing_required_fields');
    END IF;

    -- notifications CHECK 제약과 동일 집합 검증 (제약 위반 예외 대신 명시적 error)
    IF p_category NOT IN ('class_reminder','waitlist_vacancy','membership_expiry',
                          'promotion','checkin','badge','system') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_category');
    END IF;
    IF p_type NOT IN ('info','success','warning','error','urgent') THEN
        RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_type');
    END IF;

    -- 비즈니스 참조는 member_id 기준(user_id 는 알림 원천 컬럼) — 계정 미연결 시 NULL 허용
    SELECT id INTO v_member_id FROM public.members WHERE user_id = p_user_id LIMIT 1;

    INSERT INTO public.notifications
        (user_id, member_id, title, content, category, type, channel, action_url, metadata)
    VALUES
        (p_user_id, v_member_id, p_title, p_content, p_category, p_type,
         'in_app', p_action_url, COALESCE(p_metadata, '{}'::jsonb))
    RETURNING id INTO v_notif_id;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object('notification_id', v_notif_id),
        'error', NULL);
END;
$$;

COMMENT ON FUNCTION public.fn_dispatch_notification(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) IS
    'RPC: 알림 디스패치. 본인/admin 만 대상 지정, in_app INSERT → 사이드이펙트 트리거 팬아웃. envelope 반환';

REVOKE ALL ON FUNCTION public.fn_dispatch_notification(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_dispatch_notification(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. §2.2 자동화 멱등 재등록 (함수 본체는 06_notification 이 SSOT)
--    트리거는 존재하지 않을 때만 생성(기존 정의 클로버 방지), cron 은 동명 UPSERT 안전
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notifications_side_effects') THEN
        CREATE TRIGGER trg_notifications_side_effects
            AFTER INSERT ON public.notifications
            FOR EACH ROW EXECUTE FUNCTION public.fn_handle_notification_side_effects();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_waitlist_on_vacancy') THEN
        CREATE TRIGGER trg_notify_waitlist_on_vacancy
            AFTER UPDATE OF status ON public.bookings
            FOR EACH ROW EXECUTE FUNCTION public.fn_notify_waitlist_on_vacancy();
    END IF;
END $$;

-- pg_cron 2종 — 동일 jobname UPSERT (재적용 안전, docs/08 §2.2 등록 DDL 규약)
SELECT cron.schedule(
    'bcl-class-reminders',
    '*/10 * * * *',
    $$SELECT public.fn_send_class_reminders()$$
);
SELECT cron.schedule(
    'bcl-membership-expiry-reminders',
    '0 0 * * *',
    $$SELECT public.fn_send_membership_expiry_reminders()$$
);

-- ============================================================================
-- 끝 — 검증: SELECT * FROM cron.job (2건) · SELECT public.fn_dispatch_notification(...)
-- ============================================================================
