# [원자료] 데이터/백엔드 인벤토리 (as-is)

> supabase/migrations 31개 + database-reference + race/ + Edge Functions 전수 조사 스냅샷 (2026-07-06).
> to-be 설계는 `07-data-model.md` + `sql/`을 따른다.

## 테이블 (도메인별, ~45개)

### A. 회원/시설
- `facilities`: name, address, operating_hours, lat/lng, photos[], terms/privacy/refund_policy
- `members`: user_id(nullable→auth.users), name, email, status, phone, birthday, emergency_contact, avatar_url, preferences(JSONB), is_blacklisted, locker_number(부채)
- `profiles`: id(=auth.uid), **role(admin/coach/member)** — 실제 RLS 권한 소스, approval_status(pending/approved/rejected), email
- `coaches`: user_id(UNIQUE, nullable), name, specialties[], bio, base_salary, session_allowance, status, linked_at/by
- `coaching_notes`: coach_id, member_id, note_type(general/injury/progress/caution), content
- `member_notes`: 레거시 회원 메모 (coaching_notes와 중복 성격)

### B. 멤버십
- `membership_plans`: name, type, price, duration_days, credit_count, refund_policy(JSONB), max_pauses, facility_sharing
- `memberships`: member_id, plan_id, start/end_date, status, remaining_credits, pause_count, paused_at
- `membership_history`: action_type(created/extended/paused/resumed/credit_adjusted/transferred/cancelled), old/new_values, changed_by

### C. 세션·예약·체크인
- `sessions`: title, session_date, start/end_time, capacity, status, facility_id, wod_description(DEPRECATED)
- `session_coaches`: assignment_role(lead/assistant), display_order
- `bookings`: status(confirmed/waitlisted/cancelled/...), booking_type, **attendance_outcome(pending/checked_in/no_show/late_cancel/coach_excused/walk_in)**, attendance_marked_at/by, waitlist_promoted_at, cancel_reason
- `checkins`: member_id, session_id, checkin_time, checkin_method
- `session_rotation_states`: session_id PK, 서킷 타이머(round/seconds/is_running/team_assignments) — SELECT anon 공개(TV HUD), 쓰기 배정코치/admin

### D. WOD·런시트 (P1-A/P26)
- `movement_categories`: slug UNIQUE, name_ko/en, color, sort_order
- `movement_library`: slug UNIQUE, category(→movement_categories.slug FK), equipment[], difficulty 1-5, thumbnail/video_url
- `wod_templates`: facility_id(NULL=글로벌), template_kind(daily/benchmark/skill/strength/conditioning), format_type(for_time/amrap/emom/tabata/chipper/strength/custom/station_circuit), time_cap, rounds, is_shared, is_benchmark
- `wod_template_movements`: sort_order, movement_id|custom_label, target_value/unit, distance, duration, load_male/female_rx
- `session_wods`: session_id UNIQUE, publish_state(draft/published/archived), movements_snapshot(JSONB 동결)
- `class_runbook_templates` / `session_runbooks`(1:1, *_override NULL=상속)
- `member_alert_flags`: flag_type(trial/injury/renewal_due/returning_after_absence/vip_attention), severity(info/warning/critical), resolved_at
- `wods`: **레거시(제거 대상)**

### E. 결제
- `transactions`: **id=text(부채)**, order_id UNIQUE, payment_key, toss_status, source(online/pos/manual), toss_raw_data
- `pg_settings`: provider, *_key_encrypted(pgp_sym), **payment_mode(simulation/live)**
- `refunds`: penalty_amount, status(pending/approved/completed/rejected), toss_cancel_key
- `coach_settlements`: year_month, base_salary, session_count, allowance, total, status(pending/confirmed/paid), UNIQUE(coach,ym)

### F. 알림
- `notifications`(category/type/channel/action_url/metadata/is_read), `notification_rules`(trigger_type/config/channels[]), `notification_logs`(status: pending/sent/failed/read), `notification_preferences`(카테고리 on/off, quiet_hours), `push_subscriptions`(VAPID endpoint/keys)

### G. Race
- `race_events`: event_type(rowing/bike/skierg/run/other), status(scheduled/in_progress/completed/cancelled), race_format(individual/team/relay), **lobby_status(setup/lobby/countdown/racing/finished)**, session_id, coach_id, target_distance_m
- `race_records`: result_time **INTERVAL**, distance, calories, avg/max_watts, avg_spm, hr, is_pr, team_id, lane, finish_rank, UNIQUE(event,member)
- `pm5_devices`: serial UNIQUE(주 식별자), mac, ble_name, device_type(rower/bike/skierg/treadmill/other), status(online/offline/maintenance), **current_mode(idle/racing/personal_recording)**
- `race_live_state`: UNIQUE(event,device), 5s 스냅샷, connection_status, 종료 시 DELETE
- `race_recordings`: JSONL 파일 메타(file_path/size/points)
- `race_teams`: UNIQUE(event,team_name), team_color

### H. 배지 — **마이그레이션 부재!**
- `badge_definitions`/`badge_awards`는 문서(database-reference)에만 존재. RPC(fn_get_my_badges/fn_evaluate_badges)도 실체 없음. UI(/apps/badges, /admin/operations/badges)는 존재 → 재구축 시 정식 설계 필요.

### I. RBAC
- `admin_roles`(permissions JSONB — **2형태 혼재**: 배열형 vs 시드 불리언맵/'*'), `admin_user_roles`(user,role,facility)
- ⚠️ 실제 RLS는 profiles.role(is_admin()/is_admin_or_coach()), RBAC 테이블은 UI 전용 병행(미연동)

### J. 퍼포먼스 (P2)
- `benchmark_definitions`(metric_type: time/reps/weight/distance/calories — time=낮을수록 우수), `member_benchmark_results`(is_pr, session/race_event 연동), `coach_followups`(followup_type 5종, priority, status open/completed/dismissed, due_date)

### K. 보조
- `session_feedback`(rating 1-5, admin_response), `notices`, `banners`, `support_tickets`, `lockers`+`locker_assignments`(members.locker_number와 삼중), `qr_codes`, `kiosk_devices`(last_heartbeat), `audit_logs`, `system_config`, widget 4테이블(설계만)

## RPC (~40종) — 권한 패턴
- 헬퍼: `is_admin()`, `is_admin_or_coach()` (STABLE, search_path=public) — RLS 공용
- P0 코치 6종(fn_get_my_coach_context/dashboard, fn_get_coach_schedule/session_board, fn_mark/bulk_mark_session_attendance) — auth.uid()→coaches 내부 검증
- P1-A 14종(WOD/런시트/플래그: fn_search_wod_movements, fn_list/get/upsert/publish_wod_template, fn_get/upsert/publish_session_wod, fn_get_class_display_wod, fn_list/upsert_runbook_template, fn_get/upsert_session_runbook, fn_list_member_alert_flags, fn_upsert_member_alert_flag, fn_get_member_context_panel) — _p1a_assert_* 게이트
- P1-B 3종(fn_get_coach_monthly_settlement_basis/kpis/retention_panel)
- P2 7종(fn_list_benchmark_definitions, fn_record_member_benchmark_result[advisory lock+세션검증], fn_get_member_performance_profile, fn_create/complete_followup, fn_get_my_followups, fn_prepare_race_session[락+부분유니크])
- P26: fn_list_movement_library
- 예약: fn_book_with_credit(FOR UPDATE, waitlist 분기), fn_cancel_booking_with_credit
- 정산/성과: fn_calculate_monthly_settlement, fn_get_coach_performance_stats
- 결제: save_pg_settings/get_decrypted_pg_settings(pgp_sym)
- 대시보드: get_dashboard_kpis, get_revenue_stats, get_member_with_membership
- 계정: promote_to_coach/demote_from_coach
- 트리거 fn: fn_handle_notification_side_effects(pg_net→EF), fn_notify_waitlist_on_vacancy, fn_send_class_reminders(**cron 미등록**)
- 레거시(대체 완료·삭제 대상): fn_get_coach_dashboard, fn_get_session_attendees, fn_coach_mark_attendance

## RLS 원칙
- 전 테이블 RLS, anon 차단(fix_anon_rls_exposure) — 예외: session_rotation_states SELECT(TV HUD 의도적 공개), fn_get_class_display_wod
- 3역할 판정=profiles.role. 후기 마이그레이션은 헬퍼 통일
- 쓰기 하드닝 패턴: INSERT/UPDATE=admin+coach, DELETE=admin (템플릿/벤치마크 결과/race)
- coach_followups 회원 비노출, pg_settings admin 전용

## Race Python 서버 (`race/`)
- FastAPI 8001, Service Role Key(Docker env), 파일: main.py(895)/pm5_manager(BLE 멀티어댑터)/pm5_parsers/pm5_spec/recorder(JSONL)/simulator
- 통신: Supabase Broadcast `race:{event_id}` (erg_update 0.3s/race_start/race_finish) 주경로 + WS/REST 폴백
- REST: /api/ble/{scan,connect,disconnect,status}, /api/race/{setup,control,status,live}, /api/recordings/{event_id}/{summary,load-results}(멱등 적재), /api/sim/*
- stop 시 _load_race_results 자동 → race_records upsert

## Edge Functions / cron / 외부
- `send-push-notification`: 실동작(web-push+VAPID)
- `send-external-notification`: **카카오/SMS mock** (P14 대기)
- 호출: notifications INSERT 트리거 → pg_net
- **pg_cron 등록 0건** — 리마인더 함수만 존재, fn_send_membership_expiry_reminders는 문서만
- Toss: 스키마 완비, payment_mode 기본 simulation(실결제 미가동)
