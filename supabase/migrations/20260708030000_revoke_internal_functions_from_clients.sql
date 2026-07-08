-- 내부 함수(트리거·크론·설정)를 client 역할에서 회수 — anon 화이트리스트 계약 준수.
-- 직전 grant 복원이 함수 EXECUTE를 anon에 광범위 부여했으므로, 09 [Z] 화이트리스트 상태로 재수렴.
-- 트리거는 트리거 메커니즘으로, 크론은 크론 소유자로 실행되므로 client EXECUTE 회수해도 정상 동작.
-- ※ RLS 헬퍼(is_admin/is_admin_or_coach/current_member_id)는 RLS 평가에 EXECUTE 필요 → 제외.
-- ※ docs/sql/09_rpc.sql [Z] 블록에 동일 내용 반영.

-- anon 함수 실행을 화이트리스트로 재제한
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_kiosk_checkin(jsonb)                 TO anon;
GRANT EXECUTE ON FUNCTION public.fn_get_class_display_wod(uuid,date,uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_get_class_live_board(uuid)           TO anon;
GRANT EXECUTE ON FUNCTION public.fn_get_class_screen_prs(uuid,int)       TO anon;
GRANT EXECUTE ON FUNCTION public.fn_get_class_leaderboard(uuid,text)     TO anon;

-- ⚠️ service_key 반환 함수 — 전 client 역할 회수 (트리거 definer 내부 호출만 허용)
REVOKE ALL ON FUNCTION public._notify_edge_config() FROM PUBLIC, anon, authenticated;

-- 트리거·크론 함수 — PG 기본 PUBLIC EXECUTE 제거
REVOKE ALL ON FUNCTION public._badges_on_benchmark()                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._badges_on_checkin()                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._badges_on_membership()               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._badges_on_race_record()              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_handle_notification_side_effects() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_notify_waitlist_on_vacancy()       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_auth_user()                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_send_class_reminders()             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_send_membership_expiry_reminders() FROM PUBLIC, anon;
