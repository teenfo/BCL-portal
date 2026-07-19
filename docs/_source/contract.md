# [계약] 재구축 표준 계약 (전 문서 공통 준수)

> 모든 rebuild 문서·DDL은 이 계약의 명칭/구조만 사용한다. 위반 = 교차검수 반려.

## 1. 상태 표기 규약
✅ 운영 중 · 🟡 코드완료(검증 대기) · 🧪 mock/시뮬레이션 · ⏳ 미구현(신규 설계) · 🔄 to-be에서 변경/통합

## 2. 표준 테이블 명칭 (to-be)
표준: `checkins`(NOT check_ins), `bookings`(NOT reservations), `membership_plans`(NOT plans)

**도메인/테이블 확정 목록** (모든 문서는 이 이름만 사용):
- core: `facilities`🔄(+booking_policy JSONB — 예약 윈도우/취소 마감/주간 상한/노쇼 페널티 규칙, G-4·G-5), `profiles`(id=auth.uid, approval_status), `members`, `coaches`, `member_notes`🔄(coaching_notes+member_notes 통합: author_id, author_role, member_id, note_type[general/injury/progress/caution/counseling], content), `member_agreements`⏳(전자 동의·서명 증빙: doc_type, doc_version, signed_at, signature — G-6)
- membership: `membership_plans`🔄(+plan_kind: standard/drop_in/trial — G-7), `memberships`, `membership_history`
- finance: `transactions`🔄(id UUID, +cash_receipt_status/cash_receipt_approval_no — G-9 현금영수증 의무발행), `refunds`, `pg_settings`, `coach_settlements`
- sessions: `sessions`🔄(wod_description 제거, session_type CHECK 확장형[group|personal⏳예약만]), `session_coaches`, `bookings`, `checkins`, `session_rotation_states`, `session_feedback`(rating 1-5, admin_response)
- wod: `movement_categories`, `movement_library`, `wod_templates`, `wod_template_movements`, `session_wods`, `session_wod_results`⏳(일일 WOD 점수 로깅: session_wod_id, member_id, score, score_type, rx_status[rx_plus/rx/scaled], note — G-1·G-2), `class_runbook_templates`, `session_runbooks`, `member_alert_flags`  ※ `wods` 폐지
- race: `race_events`🔄(race_format: individual|team|group|relay + group_target_m, heat_no), `race_records`, `pm5_devices`, `race_live_state`, `race_recordings`, `race_teams`
- notification: `notifications`, `notification_rules`, `notification_logs`, `notification_preferences`, `push_subscriptions`
- performance: `benchmark_definitions`, `member_benchmark_results`, `coach_followups`, `badge_definitions`⏳, `badge_awards`⏳
- rbac: `admin_roles`🔄(permissions JSONB 단일형: {group: string[]}), `admin_user_roles`(권한 단일 소스로 승격)
- supplementary: `notices`, `banners`, `support_tickets`, `faqs`, `lockers`🔄(단일화: assigned_member_id/start/end — locker_assignments·members.locker_number 폐지), `qr_codes`, `kiosk_devices`, `audit_logs`, `system_config`, `widget_settings`🔄(위젯 4테이블→1)

## 3. 권한 모델 (to-be 단일화)
- 역할 판정: `profiles.role`(admin/coach/member) + `profiles.approval_status` — 인증 게이트
- 세부 권한: `admin_user_roles`→`admin_roles.permissions`(JSONB `{group: ['view','edit',...]}` **1형태만**). 와일드카드 `{"*": ["all"]}`=super_admin(편집 잠금)
- RLS 헬퍼 3종만: `is_admin()`, `is_admin_or_coach()`, `fn_my_permissions()`(UI용 병합 조회)
- 쓰기 하드닝 표준: INSERT/UPDATE=admin+coach(도메인별), DELETE=admin 전용
- RPC 표준: SECURITY DEFINER + `SET search_path=public` + 내부 `auth.uid()` 검증(클라이언트가 식별자 전달 금지) + envelope `{success, data, error}` 1종

## 4. 표준 RPC 목록 (to-be — 공칭 그룹 목록. 함수 단위 전수·시그니처는 07-data-model §7이 SSOT)
계정/권한: `fn_my_permissions()`, `promote_to_coach`, `demote_from_coach`, `fn_sign_agreement(p_doc_type, p_doc_version, p_signature)`⏳(G-6)
예약: `fn_book_with_credit`, `fn_cancel_booking_with_credit` — 🔄 두 RPC 모두 `facilities.booking_policy` 검증 단계 필수(예약 윈도우/취소 마감/주간 상한/페널티 집행, G-4·G-5)
코치 운영: `fn_get_my_coach_context`, `fn_get_my_coach_dashboard`, `fn_get_coach_schedule`, `fn_get_coach_session_board`, `fn_mark_attendance(p_session_id, p_items jsonb[])`🔄(단건+일괄 통합)
WOD: `fn_search_wod_movements`, `fn_list_movement_library`, `fn_list_wod_templates`, `fn_get_wod_template`, `fn_upsert_wod_template`, `fn_publish_wod_template`, `fn_get_session_wod`, `fn_upsert_session_wod`, `fn_publish_session_wod`, `fn_get_class_display_wod`
런시트: `fn_list_runbook_templates`, `fn_upsert_runbook_template`, `fn_get_session_runbook`, `fn_upsert_session_runbook`
회원 컨텍스트: `fn_get_member_context_panel`, `fn_upsert_member_alert_flag`
KPI/정산: `fn_get_coach_monthly_report(p_year_month, p_sections text[])`🔄(basis+kpis+retention 통합), `fn_calculate_monthly_settlement`(Admin), `fn_calculate_refund(p_transaction_id, p_membership_id)`(Admin — 환불 서버 계산, 10% 캡 내장 §6b)
퍼포먼스: `fn_list_benchmark_definitions`, `fn_record_member_benchmark_result`🔄(+rx_status), `fn_get_member_performance_profile`🔄(+일일 WOD 기록 타임라인 포함), `fn_create_followup`, `fn_complete_followup`, `fn_get_my_followups`
일일 WOD 기록⏳(G-1~G-3): `fn_record_session_wod_result`(본인 기록, rx_status 포함), `fn_get_session_wod_whiteboard(p_session_id)`(전원 결과 — Rx+→Rx→Scaled 계층 정렬), `fn_get_my_wod_prep(p_session_id)`(예정 WOD + 동일 벤치마크·동작의 본인 과거 베스트 조인)
배지⏳: `fn_get_my_badges`, `fn_evaluate_badges`(트리거 경유)
Race: `fn_prepare_race_session(p_session_id, p_race_format)`🔄(모드 파라미터)
키오스크: `fn_kiosk_checkin(p_payload)`⏳(QR 검증→예약 감지→checkins+outcome 원자 처리 — 06 문서 제안 등재. 🔄 plan_kind=drop_in/trial 멤버십도 유효 처리 — NO_MEMBERSHIP 거부 분기 해소, G-7)
Class 공개(anon, Display-Safe)⏳: `fn_get_class_live_board`, `fn_get_class_screen_prs`, `fn_get_class_leaderboard` — TV 직접 SELECT 회수용 (05 문서 제안 등재)
※ `fn_prepare_race_session` 최종 시그니처: (p_session_id, p_race_format, p_options jsonb) — 15 문서 확정
Admin 대시보드: `fn_get_dashboard_kpis`, `fn_get_revenue_stats`, `fn_get_coach_performance_stats`
※ 폐지: fn_get_coach_dashboard/fn_get_session_attendees/fn_coach_mark_attendance/fn_bulk_mark_session_attendance(→fn_mark_attendance)/fn_get_coach_monthly_settlement_basis·kpis·retention_panel(→monthly_report)

## 5. to-be 메뉴 IA (전 문서 공통)
**Admin (14화면)**: dashboard / members(상세 내 멤버십 통합) / attendance(로그+리포트 탭) / payments(거래+리포트 탭) / plans / schedule(세션 클릭=예약·대기 통합) / coaches(관리+성과 탭) / wod-studio(템플릿+라이브러리 탭) / race / lockers / badges / feedback(분석+응대 탭) / crm(공지·배너+알림+지원 탭) / settings(지점+시스템+사이트+권한 탭) (+audit는 settings 하위)
**User (하단탭 5)**: home / schedule / checkin / performance🔄(기록+랭킹+배지 허브) / profile(설정 단일 시트, purchase·feedback 진입 포함)
**Coach (하단탭 5)**: home / **schedule(중앙 강조)**🔄 / members / race / profile
**Class**: screen-console🔄(wod·live·timer·screen 모드 전환) / race(view·run·result) / rotation-hud / leaderboard
**Kiosk**: idle / scan / success
**Auth**: login / signup / reset-password / callback / pending-approval / rejected / logout — ※ email-verify 폐지(이메일 검증 제외 확정: Supabase Confirm email OFF, 가입 즉시 세션→pending-approval)

## 6. 디자인 토큰 스킴 (클로드 단일 디자인 시스템)
- 네임스페이스: `--bcl-*` 1세트만 (기존 --app-*/--primary/수동 유틸 폐지)
- 시맨틱: `--bcl-bg`, `--bcl-surface`, `--bcl-surface-raised`, `--bcl-border`, `--bcl-text`, `--bcl-text-muted`, `--bcl-accent`(#FF6A00 단일), `--bcl-accent-soft`, `--bcl-accent-border`, `--bcl-success/warning/danger/info`(+-soft), `--bcl-radius-sm/md/lg`, `--bcl-space-1..8`(4px grid), `--bcl-font`(Lexend)
- 테마: `:root[data-theme=dark|light]` 매핑 (동일 시맨틱, 값만 교체). 밀도 프로파일: `data-density=admin|mobile|tv`
- 기본 리셋 필수: button/input UA 스타일 제거 (이번 흰 패널 버그 재발 차단)
- 표준 컴포넌트: Button(variant: primary/soft/danger/ghost), Card, Modal, BottomSheet(92vh), Badge, Input/Select, Tabs, Toast, EmptyState, Skeleton — 인라인 재구현 금지

## 6b. 도메인 정책 계약 (벤치마킹 4차 보정 — 16 문서)
- **환불 위약금 기본 산식(G-8, 법규 교정)**: `환불금 = 결제금액 − 이용일수 해당액 − min(위약금, 결제금액×10%)` (공정위 위약금 산정기준·소비자분쟁해결기준). 구 "1/2 경과 전 20%/후 환불 불가" 기본값 폐기. facility별 refund_policy JSONB 오버라이드는 유지하되 10% 상한 초과 설정 금지
- **예약 정책 단일 소스**: 예약 윈도우/취소 마감/주간 상한/노쇼 페널티는 `facilities.booking_policy` JSONB에만 저장, 집행은 예약 RPC 내부(클라이언트 하드코딩 금지)
- **Race 페이스보트(G-10)**: Broadcast 페이로드 `virtual_lane: true` 레인 허용 — 집계·race_records 적재에서 제외, 렌더 전용(15 §5b)

## 7. 인증 안정성 계약
- **이메일 검증 제외(확정)**: Supabase Auth `Confirm email` OFF — 가입 즉시 세션 발급→pending-approval. 검증 메일·email-verify 라우트 없음. 게이트는 관리자 승인 단일 (01 문서 §1)
- 세션 상수 1곳: `AUTH_STORAGE_KEY='bcl-portal-auth'` — 브라우저/미들웨어/서버 클라이언트 공용 팩토리에서만 참조
- 금칙: onAuthStateChange 콜백 내 await(락 교착), 수동 쿠키명 중복 정의, 무한 스피너(에러 표면화 필수)
- 역할 리다이렉트 단일 함수: `resolvePostLoginRoute(profile)`
- CI 게이트: Playwright 인증 E2E(로그인→역할 진입→새로고침→앱 전환→로그아웃) 실패 시 배포 차단
