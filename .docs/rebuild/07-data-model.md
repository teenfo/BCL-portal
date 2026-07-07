# 07. 데이터 모델 — Supabase 재설계 설계도 (to-be)

> **위치**: `.docs/rebuild/07-data-model.md` · **실행 DDL**: `.docs/rebuild/sql/00~09` (10파일, 순서 적용)
> **선행 계약**: `_source/contract.md` (표준 명칭·권한 모델·envelope — 본 문서는 계약의 구현 명세)
> **표기**: ✅ 운영 승계 · 🟡 코드완료 승계 · 🧪 mock · ⏳ 신규 설계 · 🔄 to-be 변경/통합

이 문서는 재구축 작업자가 **이것만 보고 Supabase 프로젝트를 다시 세울 수 있는** 데이터 계층의 단일 명세다.
as-is 31개 마이그레이션(~45테이블, ~40 RPC)을 검수해 통합·간소화한 to-be를 정의하며,
모든 변경의 근거는 §10 「as-is → to-be 변경 대조표」에 남긴다.

---

## 0. 파일 구성과 적용 순서

```
sql/
├── 00_extensions_helpers.sql   # pgcrypto/pg_net/pg_cron + is_admin()/is_admin_or_coach()
│                               # + current_member_id() + updated_at 트리거 fn + Storage 버킷 4종
├── 01_core.sql                 # facilities(🔄+booking_policy) / profiles / members / coaches
│                               # / member_notes(🔄통합) / member_agreements(⏳G-6)
│                               # + auth.users INSERT 트리거(가입 즉시 profiles pending + members)
├── 02_membership_finance.sql   # membership_plans(🔄+plan_kind, 환불 산식 G-8) / memberships
│                               # / membership_history / transactions(🔄UUID +현금영수증 G-9)
│                               # / refunds / pg_settings / coach_settlements
├── 03_sessions_bookings.sql    # sessions(🔄wod_description 제거 +session_type 확장형) / session_coaches / bookings(🔄상태 분리)
│                               # / checkins / session_rotation_states / session_feedback
├── 04_wod_runbook.sql          # movement_categories(시드8) / movement_library / wod_templates(+movements)
│                               # / session_wods / session_wod_results(⏳G-1 일일 WOD 화이트보드)
│                               # / class_runbook_templates / session_runbooks / member_alert_flags
├── 05_race.sql                 # pm5_devices / race_events(🔄group·heat) / race_teams / race_live_state
│                               # / race_recordings / race_records
├── 06_notification.sql         # notifications / rules / logs / preferences / push_subscriptions
│                               # + 사이드이펙트·빈자리 트리거 + 리마인더·만기 크론 fn + cron.schedule 2건
├── 07_performance_badges.sql   # benchmark_definitions(시드6) / member_benchmark_results(🔄+rx_status) / coach_followups
│                               # + ⏳badge_definitions(시드12) / badge_awards + 판정 트리거 4종
├── 08_rbac_supplementary.sql   # admin_roles(시드4, 🔄JSONB 단일형) / admin_user_roles / notices / banners
│                               # / support_tickets / faqs / lockers(🔄단일화) / qr_codes / kiosk_devices
│                               # / audit_logs / system_config / widget_settings(🔄4→1)
└── 09_rpc.sql                  # 표준 RPC 전수 + _assert 게이트 2종 + 부속 결제 함수 + REVOKE/GRANT
```

- **의존 순서 고정**: 00 → 01 → … → 09. 각 파일 헤더에 의존이 주석으로 명시돼 있다.
- **멱등**: 전부 `IF NOT EXISTS` / `CREATE OR REPLACE` / `ON CONFLICT DO NOTHING` — 재실행 안전.
- **시드 최소셋**: 운동 카테고리 8종 · 벤치마크 6종 · 배지 12종 · admin_roles 4종.
  (운동 라이브러리 35종·벤치마크 WOD 10종의 대형 시드는 as-is `p1a_class_standardization.sql §F`를 별도 seed 스크립트로 재사용)

---

## 1. 데이터 계층 불변 규칙 (전 도메인 공통)

| # | 규칙 | 구현 |
|---|---|---|
| R1 | **권한 판정 단일 소스** = `profiles.role` + `profiles.approval_status` | RLS 헬퍼 `is_admin()`/`is_admin_or_coach()` 2종만. 세부 화면 권한은 `fn_my_permissions()` 1함수 |
| R2 | **비즈니스 테이블은 `member_id`만 참조** (user_id 직접 참조 금지) | user_id는 profiles/members/coaches의 auth 연결 컬럼과 알림·감사 계열에만 존재. RPC는 `current_member_id()`로 해석 |
| R3 | **클라이언트가 사용자 식별자를 전달하지 않는다** | 전 RPC `SECURITY DEFINER + SET search_path=public` + 내부 `auth.uid()` 검증 |
| R4 | **응답 envelope 1종**: `{success, data, error}` | 09_rpc 전 함수. as-is의 status 필드 혼용 폐지 |
| R5 | **쓰기 하드닝 표준**: SELECT=역할별, INSERT/UPDATE=admin+coach(도메인별), DELETE=admin | 세션 귀속 리소스는 "배정 코치"로 추가 제한 |
| R6 | **anon 접근 전면 차단이 기본값** — 예외는 화이트리스트만 | §7 RLS 매트릭스 및 05-class-portal §6.1: `session_rotation_states` SELECT, race 4테이블 SELECT, 공개 RPC 5종(fn_kiosk_checkin + Class 4종) |
| R7 | **결제 안전 불변식**: 금액은 서버 재계산, Toss 원본 불변 보존, `payment_mode` 기본 simulation | transactions.toss_raw_data, pg_settings.payment_mode |
| R8 | **Race 3경로 분리**: Broadcast(0.3s, DB 미기록) / race_live_state(5s, 종료 시 DELETE) / JSONL→race_records(멱등) | §4.6, 15-race-system |
| R9 | **출결 이중 기록**: 사실=`checkins`(append-only) / 판정=`bookings.attendance_outcome` | fn_mark_attendance·fn_kiosk_checkin이 원자적으로 동기화 |
| R10 | **동시성 advisory lock 대상 3곳**: 예약 정원(세션), PR 판정(회원×종목), Race 세션 준비(세션) | `pg_advisory_xact_lock(hashtext(...))` |
| R11 | **인증 트리거는 email_confirmed_at 의존 금지** — Auth 'Confirm email' OFF 확정 | auth.users INSERT 즉시 profiles(pending)+members 생성, 가입 즉시 세션 발급 → pending-approval 격리 |

---

## 2. 상태머신 · enum 표준 전수

> 모든 CHECK 제약의 허용값. 앱 코드의 타입/상수는 이 표에서 생성한다. **여기 없는 값 사용 금지.**

| 도메인 | 컬럼 | 허용값 (기본값 굵게) | 비고 |
|---|---|---|---|
| core | `profiles.role` | admin / coach / **member** | RLS 판정 단일 소스 |
| core | `profiles.approval_status` | **pending** / approved / rejected | 가입 승인 워크플로우 |
| core | `members.status` | **active** / inactive / suspended | |
| core | `members.gender` | male / female / other / NULL | |
| core | `member_notes.author_role` | admin / **coach** | 🔄 2테이블 통합의 구분자 |
| core | `member_notes.note_type` | **general** / injury / progress / caution / counseling | counseling=구 members.counseling_notes 이관 |
| core | `coaches.status` | **active** / inactive / on_leave | 소문자만(as-is 'Inactive' 혼용 정리) |
| core | `member_agreements.doc_type` | terms / privacy / refund_policy / health_waiver | ⏳ G-6 전자 동의 |
| membership | `membership_plans.type` | period / count | |
| membership | `membership_plans.plan_kind` | **standard** / drop_in / trial | 🔄 G-7 드롭인·체험권 |
| membership | `memberships.status` | **active** / paused / expired / cancelled | 🔄 paused 정식 추가 |
| membership | `membership_history.action_type` | created / extended / paused / resumed / credit_adjusted / transferred / cancelled | |
| finance | `transactions.status` | **pending** / completed / failed / cancelled / refunded / partial_refunded | 🔄 payment_status·status 혼용 → 1컬럼 |
| finance | `transactions.transaction_type` | **purchase** / refund / adjustment | |
| finance | `transactions.category` | **membership** / pt / goods / locker / etc | |
| finance | `transactions.source` | online / pos / **manual** | |
| finance | `refunds.status` | **pending** / approved / completed / rejected | |
| finance | `pg_settings.payment_mode` | **simulation** / live | 결제 이중장치 |
| finance | `transactions.cash_receipt_status` | **not_required** / pending / issued / failed | 🔄 G-9 현금영수증 의무발행 |
| finance | `coach_settlements.status` | **pending** / confirmed / paid | confirmed 이후 자동 재계산 금지 |
| sessions | `sessions.status` | **scheduled** / in_progress / completed / cancelled | |
| sessions | `sessions.session_type` | **group** / personal | ⏳ G-19 확장형(personal은 예약만·구현 없음) |
| sessions | `sessions.intensity_level` | beginner / intermediate / advanced / NULL | |
| sessions | `bookings.status` | **confirmed** / waitlisted / cancelled | 🔄 예약 수명주기 3종으로 정규화(no_show·waitlist 표기 제거) |
| sessions | `bookings.booking_type` | **regular** / trial / makeup | |
| sessions | `bookings.attendance_outcome` | **pending** / checked_in / no_show / late_cancel / coach_excused / walk_in | 운영 판정 — status와 역할 분리 |
| sessions | `checkins.checkin_method` | **qr** / kiosk / manual / manual_coach | |
| wod | `wod_templates.template_kind` | **daily** / benchmark / skill / strength / conditioning | |
| wod | `wod_templates.format_type` (=`session_wods.format_override`) | for_time / amrap / emom / tabata / chipper / strength / custom / station_circuit / NULL | station_circuit 포함 |
| wod | `session_wods.publish_state` | **draft** / published / archived | Class 노출은 published만 |
| wod | `session_wod_results.score_type` | time / reps / rounds_reps / weight / distance / calories | ⏳ G-1 (time=낮을수록, rounds_reps=rounds*1000+reps) |
| wod | `session_wod_results.rx_status` (=`member_benchmark_results.rx_status`) | rx_plus / **rx** / scaled | ⏳ G-2 계층 리더보드 어휘 (Rx+→Rx→Scaled) |
| wod | `member_alert_flags.flag_type` | trial / injury / renewal_due / returning_after_absence / vip_attention | |
| wod | `member_alert_flags.severity` | **info** / warning / critical | |
| race | `race_events.event_type` | **rowing** / bike / skierg / run / other | R-11 트랙/이펙트 비주얼 테마 결정 소스(15 §5b.3b) |
| race | `race_events.race_format` | **individual** / team / **group(🔄신규)** / relay | 경기 모드 3종+릴레이 |
| race | `race_events.status` | **scheduled** / in_progress / completed / cancelled | |
| race | `race_events.lobby_status` | **setup** → lobby → countdown → racing → finished | 진행 상태머신(부정출발 완화: READY 중 무시) |
| race | `pm5_devices.device_type` | **rower** / bike / skierg / treadmill / other | R-11 레인 캐릭터 테마 결정 소스 |
| race | `pm5_devices.status` | online / **offline** / maintenance | |
| race | `pm5_devices.current_mode` | **idle** / racing / personal_recording | 기기 모드락 |
| race | `race_live_state.connection_status` | **connected** / racing / idle / disconnected / offline | |
| notification | `notifications.category` | class_reminder / waitlist_vacancy / membership_expiry / promotion / checkin / badge / **system** | |
| notification | `notifications.type` | **info** / success / warning / error / urgent | urgent=외부 채널 발송 조건 |
| notification | `notifications.channel` | **in_app** / push / kakao / sms / email | |
| notification | `notification_rules.trigger_type` | class_reminder / membership_expiry / waitlist_vacancy / absence / birthday / manual | |
| notification | `notification_logs.status` | **pending** / sent / failed / read | |
| performance | `benchmark_definitions.metric_type` | time / reps / weight / distance / calories | time=낮을수록 우수(유일 규칙) |
| performance | `coach_followups.followup_type` | injury / trial_conversion / renewal / absence / motivation | |
| performance | `coach_followups.priority` | low / **normal** / high | |
| performance | `coach_followups.status` | **open** / completed / dismissed | |
| performance | `badge_definitions.category` | attendance / performance / race / membership / special | ⏳ |
| performance | `badge_definitions.metric_type` | checkin_count / checkin_streak_weeks / pr_count / race_count / race_podium_count / membership_days / manual | ⏳ |
| performance | `badge_awards.source` | **auto** / manual | |
| supplementary | `notices.category` | **general** / schedule / event / maintenance / emergency | |
| supplementary | `notices.priority` | urgent / high / **normal** / low | |
| supplementary | `banners.position` | **home_top** / home_mid / home_bottom / popup / event | 🔄 한글값 → 슬러그 |
| supplementary | `support_tickets.category` | **inquiry** / complaint / suggestion / refund | |
| supplementary | `support_tickets.status` | **open** / in_progress / resolved / closed | |
| supplementary | `support_tickets.priority` | low / **normal** / high / urgent | |
| supplementary | `lockers.size` | S / **M** / L | |
| supplementary | `lockers.status` | **available** / occupied / maintenance / disabled | occupied↔assigned_member_id 정합 CHECK |
| supplementary | `kiosk_devices.status` | **active** / offline / maintenance | |
| supplementary | `qr_codes.qr_type` | facility / session / member | |

**핵심 상태머신 전이 규칙**

```
bookings.status:        confirmed ⇄ waitlisted → cancelled   (승급 시 waitlist_promoted_at 기록)
attendance_outcome:     pending → checked_in | no_show | late_cancel | coach_excused
                        (walk_in은 예약 없는 현장 참가 시 booking 생성과 동시 부여)
                        코치 판정(attendance_marked_by 有)은 키오스크가 덮어쓰지 않는다
session_wods:           draft → published → archived  (published 스냅샷은 템플릿 변경 무영향)
race_events.lobby:      setup → lobby → countdown → racing → finished  (역행 금지, 히트 전환은 새 이벤트)
memberships.status:     active ⇄ paused → expired | cancelled  (pause_count ≤ plan.max_pauses)
refunds.status:         pending → approved → completed | rejected
coach_settlements:      pending → confirmed → paid  (confirmed 이후 fn_calculate가 덮어쓰지 않음)
profiles.approval:      pending → approved | rejected  (admin 전용 전이)
```

---

## 3. 도메인별 스키마 (1/2) — core · membership · finance · sessions

### 3.1 core (`01_core.sql`)

```mermaid
erDiagram
    facilities ||--o{ members : "facility_id"
    facilities ||--o{ coaches : "facility_id"
    auth_users ||--|| profiles : "id = auth.uid"
    auth_users ||--o| members : "user_id (nullable)"
    auth_users ||--o| coaches : "user_id (nullable)"
    members ||--o{ member_notes : "member_id"
    auth_users ||--o{ member_notes : "author_id"
    members ||--o{ member_agreements : "member_id"
```

**facilities** — 지점 ✅

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | |
| name | VARCHAR(100) | NOT NULL | | |
| address / phone | TEXT / VARCHAR(20) | | | |
| operating_hours | JSONB | | '{}' | 요일별 운영시간 |
| latitude / longitude | NUMERIC(10,7) | | | 지도 연동 |
| photos | TEXT[] | | '{}' | Storage facility-photos |
| terms_of_service / privacy_policy / refund_policy | TEXT | | | 약관 원문 |
| booking_policy | JSONB | NOT NULL | 기본 정책 JSON | 🔄 G-4/G-5 예약 정책 단일 소스: booking_open_days(7)/cancel_deadline_hours(3)/weekly_booking_cap(null)/noshow_penalty{credit_forfeit:true, monthly_threshold:3, restrict_days:7}. 집행은 예약 RPC 내부만 |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | now() | updated_at 트리거 |

**profiles** — 인증 게이트 ✅🔄

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK, FK auth.users ON DELETE CASCADE | | = auth.uid() |
| email / name | VARCHAR(255)/(100) | | | |
| role | VARCHAR(10) | CHECK(admin/coach/member) | 'member' | **RLS 판정 단일 소스** |
| approval_status | VARCHAR(10) | CHECK(pending/approved/rejected) | 'pending' | 가입 승인 워크플로우 |
| approved_at / approved_by | TIMESTAMPTZ / UUID FK | | | |
| rejected_reason | TEXT | | | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | now() | |

인덱스: `(role, approval_status)` — 승인 대기 목록·역할 스캔.
쓰기 규칙: **본인 UPDATE 정책 없음**(role/approval 자가 변경 차단). 변경은 admin RLS 또는 RPC만.

**members** — 회원 ✅🔄

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | 비즈니스 참조의 기준(R2) |
| user_id | UUID | UNIQUE, FK auth.users ON DELETE SET NULL | | NULL=계정 미연결(오프라인 등록) |
| facility_id | UUID | FK facilities | | |
| name | VARCHAR(100) | NOT NULL | | |
| email / phone | VARCHAR(255)/(20) | | | |
| birthday | DATE | | | |
| gender | VARCHAR(10) | CHECK 또는 NULL | | |
| emergency_contact | VARCHAR(50) | | | |
| medical_notes | TEXT | | | |
| avatar_url | TEXT | | | Storage avatars |
| preferences | JSONB | NOT NULL | '{}' | 앱 설정 |
| status | VARCHAR(20) | CHECK(active/inactive/suspended) | 'active' | |
| is_blacklisted / blacklist_reason | BOOLEAN / TEXT | NOT NULL / | false / | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | now() | |

🔄 **제거 컬럼**: `locker_number`(→ lockers.assigned_member_id), `counseling_notes`(→ member_notes note_type=counseling).
인덱스: `user_id`(부분) / `(facility_id, status)` / `name`(Admin 검색).

**coaches** — 코치 ✅

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | |
| user_id | UUID | UNIQUE, FK auth.users SET NULL | | 계정 연결 |
| facility_id | UUID | FK facilities | | |
| name / email / phone | VARCHAR | name NOT NULL | | |
| specialties | TEXT[] | | '{}' | |
| bio / profile_image_url | TEXT | | | |
| base_salary / session_allowance | INTEGER | NOT NULL | 0 | 정산 파라미터(원) |
| status | VARCHAR(20) | CHECK(active/inactive/on_leave) | 'active' | 소문자만 |
| linked_at / linked_by | TIMESTAMPTZ / UUID FK | | | promote_to_coach 기록 |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**member_notes** — 회원 메모 통합 🔄 (as-is coaching_notes + member_notes → 1테이블)

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | |
| member_id | UUID | NOT NULL, FK members CASCADE | | |
| author_id | UUID | FK auth.users SET NULL | | 작성자 |
| author_role | VARCHAR(10) | CHECK(admin/coach) | 'coach' | 구 2테이블 구분 흡수 |
| note_type | VARCHAR(20) | CHECK(general/injury/progress/caution/counseling) | 'general' | |
| content | TEXT | NOT NULL | | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | now() | |

인덱스: `(member_id, created_at DESC)` / `(note_type, created_at DESC)`.

**member_agreements** — 전자 동의·웨이버 서명 증빙 ⏳ (G-6)

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | |
| member_id | UUID | NOT NULL, FK members CASCADE | | |
| doc_type | VARCHAR(20) | CHECK(terms/privacy/refund_policy/health_waiver) | | |
| doc_version | VARCHAR(20) | NOT NULL, UNIQUE(member,doc_type,doc_version) | | 약관 개정 시 재서명 요구 |
| signature | TEXT | NOT NULL | | 서명 이미지(data URL) 또는 해시 |
| signed_at | TIMESTAMPTZ | NOT NULL | now() | |
| ip_address / user_agent | INET / TEXT | | | 증빙 보강 |

기록은 `fn_sign_agreement` RPC 경유. **UPDATE 정책 없음(증빙 불변)**, DELETE=admin만. 가입 승인 전 서명 단계 + Admin 미서명 필터의 소스.

**auth 연동 트리거** `handle_new_auth_user()` (R11): auth.users INSERT 즉시 → profiles(role=member, approval=pending) 생성 + 동일 이메일 미연결 members 연결(없으면 신규). **email_confirmed_at 의존 금지** — Confirm email OFF 확정, `/auth/email-verify` 라우트 폐지.

---

### 3.2 membership (`02_membership_finance.sql` 전반부)

```mermaid
erDiagram
    membership_plans ||--o{ memberships : "plan_id"
    members ||--o{ memberships : "member_id"
    memberships ||--o{ membership_history : "membership_id"
```

**membership_plans** ✅

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | |
| facility_id | UUID | FK facilities SET NULL | | NULL=전 지점 공용 |
| name | VARCHAR(100) | NOT NULL | | |
| type | VARCHAR(10) | CHECK(period/count) | | + `chk_plan_type`(형별 필수 필드) |
| plan_kind | VARCHAR(10) | CHECK(standard/drop_in/trial) | 'standard' | 🔄 G-7 드롭인·체험권 정식 상품 |
| duration_days / credit_count | INT | 형별 필수 | | |
| price / discount_price | NUMERIC(12,0) | price NOT NULL, ≥0 | | 원화 정수 |
| description | TEXT | | | |
| refund_policy | JSONB | NOT NULL | {"formula":"statutory_kr","penalty_rate_cap":0.10} | 🔄 G-8 기본 산식(계약 §6b): **환불금 = 결제금액 − 이용일수 해당액 − min(위약금, 결제금액×10%)**. `chk_refund_penalty_cap`으로 cap>0.10 설정 금지. 구 "1/2 경과 전 20%/후 환불 불가" 기본값 폐기 |
| max_pauses | INT | NOT NULL | 0 | |
| facility_sharing | BOOLEAN | NOT NULL | false | |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**memberships** ✅🔄

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | |
| member_id | UUID | NOT NULL, FK members CASCADE | | |
| plan_id | UUID | FK plans SET NULL | | |
| start_date / end_date | DATE | start NOT NULL | | |
| remaining_credits | INT | ≥0 또는 NULL | | 횟수제만. 증감은 RPC 전용 |
| status | VARCHAR(10) | CHECK(active/paused/expired/cancelled) | 'active' | 🔄 paused 정식화 |
| pause_count / paused_at / pause_reason | INT / TIMESTAMPTZ / TEXT | | 0 | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | now() | |

인덱스: `(member_id, status, end_date DESC)` — 회원 상세 활성권 / `end_date WHERE status='active'`(부분) — 만기 크론 스캔.

**membership_history** ✅ — action_type CHECK 7종, `(membership_id, created_at DESC)` 인덱스. 모든 상태 변경은 기록 후 갱신.

---

### 3.3 finance (`02_membership_finance.sql` 후반부)

```mermaid
erDiagram
    members ||--o{ transactions : "member_id"
    membership_plans ||--o{ transactions : "plan_id"
    memberships ||--o{ transactions : "membership_id"
    transactions ||--o{ refunds : "transaction_id (UUID FK)"
    facilities ||--o| pg_settings : "facility_id UNIQUE"
    coaches ||--o{ coach_settlements : "coach_id"
```

**transactions** 🔄 (id text → **UUID**)

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | 🔄 외부 식별자와 PK 분리 |
| member_id / facility_id / membership_id / plan_id | UUID | FK (SET NULL) | | |
| order_id | TEXT | UNIQUE | | Toss orderId |
| payment_key | TEXT | | | Toss paymentKey |
| amount | NUMERIC(12,0) | NOT NULL, ≥0 | | 서버 재계산 값만(R7) |
| status | VARCHAR(15) | CHECK 6종 | 'pending' | 🔄 payment_status 혼용 정리 |
| transaction_type | VARCHAR(15) | CHECK(purchase/refund/adjustment) | 'purchase' | |
| category | VARCHAR(20) | CHECK 5종 | 'membership' | |
| payment_method | VARCHAR(50) | | | |
| source | VARCHAR(10) | CHECK(online/pos/manual) | 'manual' | |
| toss_status / cancel_reason / receipt_url | TEXT | | | |
| cancel_amount | NUMERIC(12,0) | | | |
| cancelled_at | TIMESTAMPTZ | | | |
| toss_raw_data | JSONB | NOT NULL | '{}' | 승인 응답 불변 원본 |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | now() | |

인덱스(복합 위주): `(member_id, created_at DESC)` 회원 이력 / `(status, created_at DESC)` 매출 리포트 / `(facility_id, created_at DESC)` 지점 리포트 / `order_id` UNIQUE(콜백 조회).
쓰기: 클라이언트 직접 INSERT 금지 — 서버 라우트(Service Role)·admin만.

**refunds** ✅🔄 — transaction_id **UUID NOT NULL FK(RESTRICT)** (구 text FK 정합 해소). amount>0, penalty_amount≥0, status CHECK 4종, toss_cancel_key, processed_by. 인덱스 `(transaction_id)`, `(status, created_at DESC)`.

**pg_settings** ✅ — facility_id **UNIQUE**(지점당 1행 — as-is 무제약 정리). `*_encrypted` 컬럼은 pgp_sym(RPC `save_pg_settings` 전용 기록). `payment_mode` CHECK(simulation/live) 기본 simulation — 실결제 전환의 유일한 스위치. RLS admin 전용(코치 포함 비노출).

**coach_settlements** ✅ — UNIQUE(coach_id, year_month), year_month `^\d{4}-\d{2}$` CHECK. status pending→confirmed→paid (확정 후 `fn_calculate_monthly_settlement` 재계산이 덮어쓰지 않음 — WHERE status='pending' 가드).

---

### 3.4 sessions (`03_sessions_bookings.sql`)

```mermaid
erDiagram
    facilities ||--o{ sessions : "facility_id"
    sessions ||--o{ session_coaches : ""
    coaches ||--o{ session_coaches : ""
    sessions ||--o{ bookings : ""
    members ||--o{ bookings : ""
    memberships ||--o{ bookings : "membership_id(차감 원천)"
    sessions ||--o{ checkins : ""
    members ||--o{ checkins : ""
    bookings ||--o| checkins : "booking_id"
    sessions ||--o| session_rotation_states : "1:1"
    sessions ||--o{ session_feedback : ""
    members ||--o{ session_feedback : ""
```

**sessions** 🔄 (`wod_description` **제거** — WOD는 session_wods가 유일 소스)

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | |
| facility_id | UUID | NOT NULL, FK CASCADE | | |
| title | VARCHAR(200) | NOT NULL | | |
| description | TEXT | | | |
| session_type | VARCHAR(10) | CHECK(group/personal) | 'group' | ⏳ G-19 확장형 컬럼만 — personal(1:1 PT) 스키마 여지, 현 Phase 구현 없음 |
| class_type | VARCHAR(40) | | | 런시트 템플릿 매칭 키 |
| session_date | DATE | NOT NULL | | |
| start_time / end_time | TIME | NOT NULL | | |
| capacity | INT | NOT NULL, >0 | 15 | |
| intensity_level | VARCHAR(15) | CHECK 3종/NULL | | |
| status | VARCHAR(15) | CHECK 4종 | 'scheduled' | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | now() | |

인덱스: `(facility_id, session_date, start_time)` 캘린더 / `(session_date, status)` KPI 월 집계·리마인더 크론.

**session_coaches** ✅ — UNIQUE(session_id, coach_id), assignment_role CHECK(lead/assistant) 기본 lead, display_order. 인덱스 `(coach_id, session_id)`(코치 역방향 조회 — as-is 단일컬럼 인덱스 대체).

**bookings** 🔄 — 상태머신 정규화의 핵심 (§2 전이 규칙 참조)

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | |
| session_id / member_id | UUID | NOT NULL, FK CASCADE, UNIQUE 쌍 | | 세션당 회원 1행 |
| membership_id | UUID | FK memberships SET NULL | | 크레딧 차감 원천 |
| status | VARCHAR(10) | CHECK(confirmed/waitlisted/cancelled) | 'confirmed' | 예약 수명주기만 |
| booking_type | VARCHAR(10) | CHECK(regular/trial/makeup) | 'regular' | |
| credit_used | BOOLEAN | NOT NULL | false | 🔄 환원 정합의 유일 근거 |
| attendance_outcome | VARCHAR(15) | CHECK 6종 | 'pending' | 운영 판정(fn_mark_attendance 전용) |
| attendance_marked_at / attendance_marked_by | TIMESTAMPTZ / UUID FK | | | 판정자 추적 |
| waitlist_promoted_at | TIMESTAMPTZ | | | 승급 기록 |
| cancel_reason | TEXT | | | |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | now() | |

인덱스: `(session_id, status)` 세션 보드 / `(member_id, created_at DESC)` 내 예약 / `attendance_outcome WHERE <> 'pending'`(부분) KPI / `(session_id, created_at) WHERE status='waitlisted'`(부분) 대기열 순번.
쓰기: member 직접 INSERT/UPDATE 정책 없음 — `fn_book_with_credit`/`fn_cancel_booking_with_credit`/`fn_mark_attendance` RPC 경유(정원·크레딧 검증 우회 차단).

**checkins** ✅🔄 — append-only 사실 로그

| 컬럼 | 타입 | 제약 | 기본값 |
|---|---|---|---|
| id | UUID | PK | gen_random_uuid() |
| booking_id | UUID | FK SET NULL | |
| member_id | UUID | NOT NULL, FK CASCADE | |
| session_id | UUID | FK SET NULL (NULL=자유 출입) | |
| facility_id | UUID | FK SET NULL | |
| checkin_time | TIMESTAMPTZ | NOT NULL | now() |
| checkin_method | VARCHAR(15) | CHECK(qr/kiosk/manual/manual_coach) | 'qr' |
| notes / created_at | TEXT / TIMESTAMPTZ | | now() |

인덱스: 🔄 **부분 UNIQUE `(session_id, member_id) WHERE session_id IS NOT NULL`** — 세션당 1회 체크인 DB 보장(as-is는 앱 로직만). `(member_id, checkin_time DESC)` / `(facility_id, checkin_time DESC)`.

**session_rotation_states** ✅ — 세션 1:1 PK(session_id). 서킷 타이머(current_round/total_rounds/seconds_per_round/is_running/timer_started_at/paused_remaining_seconds/team_assignments JSONB). **anon SELECT 의도적 공개**(TV HUD — RLS 예외 화이트리스트), 쓰기는 admin+배정 코치.

**session_feedback** ✅ (계약 보정으로 정식 등재) — UNIQUE(session_id, member_id), rating 1~5 NOT NULL, comment, admin_response/responded_by/responded_at. 인덱스 `(created_at DESC)` 관리 목록 / `(coach_id, rating)` 코치 평점 집계. RLS: member 본인 INSERT+읽기, staff 읽기, admin 응답 UPDATE.

---

## 4. 도메인별 스키마 (2/2) — wod · race · notification · performance · rbac · supplementary

### 4.1 wod (`04_wod_runbook.sql`) — ※ 레거시 `wods` 테이블은 to-be에서 **생성하지 않음(폐지)**

```mermaid
erDiagram
    movement_categories ||--o{ movement_library : "category(slug FK)"
    movement_library ||--o{ wod_template_movements : "movement_id"
    wod_templates ||--o{ wod_template_movements : ""
    wod_templates ||--o{ session_wods : "template_id"
    sessions ||--o| session_wods : "1:1 UNIQUE"
    session_wods ||--o{ session_wod_results : "UNIQUE(wod,member)"
    members ||--o{ session_wod_results : ""
    facilities ||--o{ class_runbook_templates : ""
    class_runbook_templates ||--o{ session_runbooks : "template_id"
    sessions ||--o| session_runbooks : "1:1 UNIQUE"
    session_wods ||--o{ session_runbooks : "session_wod_id"
    members ||--o{ member_alert_flags : ""
```

**movement_categories** ✅ (시드 8종: weightlifting/gymnastics/monostructural/dumbbell/kettlebell/medball/other_equipment/accessory)

| 컬럼 | 타입 | 제약 | 기본값 |
|---|---|---|---|
| id | UUID | PK | gen_random_uuid() |
| slug | VARCHAR(40) | NOT NULL UNIQUE | |
| name_ko / name_en | VARCHAR(60) | NOT NULL | |
| color | VARCHAR(9) | | |
| sort_order | INT | NOT NULL | 0 |
| is_active | BOOLEAN | NOT NULL | true |
| created_at | TIMESTAMPTZ | NOT NULL | now() |

**movement_library** ✅🔄 — `category`는 **최초부터 movement_categories.slug FK**(ON UPDATE CASCADE, DELETE RESTRICT — as-is 하드코딩 CHECK→FK 전환 이력 흡수). slug UNIQUE, name_ko/en, equipment TEXT[], difficulty_level 1~5, primary_muscles TEXT[], coaching_points, thumbnail_url/video_url(Storage movement-media), source_tag, is_active. 인덱스 `(category, is_active)`.

**wod_templates** ✅ — facility_id NULL=글로벌 공유(벤치마크), template_kind 5종, format_type 8종(+station_circuit)/NULL, time_cap_minutes, rounds, description/public_notes(공개)/coach_notes(코치 전용), is_shared/is_benchmark, published_at, created_by/updated_by. 인덱스 `(facility_id, template_kind)` / `is_shared`·`is_benchmark`(부분).

**wod_template_movements** ✅ — sort_order, movement_id FK(SET NULL) 또는 custom_label (CHECK: 둘 중 하나 필수), target_value/unit, distance_meters, duration_seconds, load_male/female_rx, rx_notes, scaling_notes. 인덱스 `(wod_template_id, sort_order)`.

**session_wods** ✅ — 세션당 1행(UNIQUE session_id). publish_state draft→published→archived, source_version, *_override 4종(title/format/time_cap/description), **movements_snapshot JSONB**(발행 시점 동결 — 템플릿 변경 무영향), coach_notes/class_display_notes, edited_by/published_by/published_at. 인덱스 `published_at DESC WHERE published`(Class Display 최신분).

**session_wod_results** — 일일 WOD 점수 로깅 ⏳ (G-1/G-2 디지털 화이트보드)

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | |
| session_wod_id | UUID | NOT NULL, FK session_wods CASCADE, UNIQUE(wod,member) | | WOD당 회원 1행(수정=upsert) |
| member_id | UUID | NOT NULL, FK members CASCADE | | |
| score | NUMERIC(12,2) | NOT NULL, >0 | | time=초(낮을수록 우수), rounds_reps=rounds*1000+reps 합성, 그 외=높을수록 우수 |
| score_type | VARCHAR(15) | CHECK 6종 | | time/reps/rounds_reps/weight/distance/calories |
| rx_status | VARCHAR(10) | CHECK(rx_plus/rx/scaled) | 'rx' | G-2 계층 리더보드 1차 정렬 키 |
| note | TEXT | | | 스케일 내용 등 |
| recorded_by | UUID | FK auth.users SET NULL | | 본인 또는 코치 대리 기록 |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | now() | |

인덱스: `(member_id, created_at DESC)`(내 타임라인). 기록=`fn_record_session_wod_result`, 전원 열람=`fn_get_session_wod_whiteboard`(DEFINER) 경유 — **테이블 전원 SELECT·anon 미공개**(05 §6.1 화이트리스트 정합: Class TV 노출이 필요해지면 공개 RPC 신설로만 확장). 벤치마크(member_benchmark_results)와의 역할 분리: 벤치마크=종목 단위 PR 추적, 본 테이블=세션(일일 WOD) 단위 화이트보드.

**class_runbook_templates** ✅ — facility_id NOT NULL, class_type(sessions.class_type 매칭), warmup/movement_prep/scaling_options/coach_cues/safety_notes/finish_notes, default_wod_template_id, is_default. 인덱스 `(facility_id, class_type)`.

**session_runbooks** ✅ — 세션 1:1(UNIQUE), template_id/session_wod_id, `*_override` 6종(**NULL=템플릿 상속**), published_at, updated_by.

**member_alert_flags** ✅ — flag_type 5종, severity 3종, starts_at/ends_at, note, created_by/resolved_by/resolved_at. **활성 판정 = resolved_at IS NULL AND (ends_at IS NULL OR ends_at > now())**. 부분 인덱스 `(member_id, flag_type) WHERE resolved_at IS NULL`.

---

### 4.2 race (`05_race.sql`)

```mermaid
erDiagram
    facilities ||--o{ pm5_devices : ""
    sessions ||--o{ race_events : "session_id (활성 1개 부분유니크)"
    coaches ||--o{ race_events : ""
    race_events ||--o{ race_events : "parent_event_id (히트 시리즈)"
    race_events ||--o{ race_teams : ""
    race_events ||--o{ race_live_state : "UNIQUE(event,device)"
    pm5_devices ||--o{ race_live_state : ""
    race_events ||--o{ race_recordings : ""
    race_events ||--o{ race_records : "UNIQUE(event,member)"
    members ||--o{ race_records : ""
    race_teams ||--o{ race_records : "team_id"
    race_recordings ||--o{ race_records : "recording_id"
```

**pm5_devices** ✅ — serial_number **UNIQUE = 주 식별자**(iOS MAC 숨김 대응), mac_address, ble_name, qr_identifier(Personal Recording 후속 Phase), device_type CHECK 5종(**R-11 레인 캐릭터 테마 소스**), status(online/offline/maintenance, 기본 offline), current_mode(기기 모드락 3종), firmware_version, last_sync_at. 인덱스 `(facility_id, status)`.

**race_events** 🔄 — 경기 모드 3종+히트 확장 (15-race-system §4b 확정본)

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | |
| facility_id / session_id / coach_id | UUID | FK SET NULL | | 세션 연동=fn_prepare_race_session |
| name | VARCHAR(200) | NOT NULL | | |
| event_date | DATE | NOT NULL | CURRENT_DATE | |
| event_type | VARCHAR(20) | CHECK(rowing/bike/skierg/run/other) | 'rowing' | **R-11 트랙/이펙트 테마 소스** |
| race_format | VARCHAR(15) | CHECK(individual/team/**group**/relay) | 'individual' | 🔄 group 신규 |
| target_distance_m | INT | | | 개인/팀/릴레이 목표. NULL=시간제 |
| duration_minutes | INT | | | 시간제 레이스 |
| group_target_m | INT | | | 🔄 단체전 A안 공동 목표 |
| heat_no | INT | NOT NULL | 1 | 🔄 단체전 B안 히트 번호(개인/팀전 항상 1) |
| parent_event_id | UUID | FK race_events SET NULL | | 🔄 히트 시리즈 루트 |
| carryover_m | NUMERIC(10,2) | NOT NULL | 0 | 🔄 공동목표 이월 누계 |
| description | TEXT | | | |
| status | VARCHAR(15) | CHECK 4종 | 'scheduled' | |
| lobby_status | VARCHAR(15) | CHECK 5종 | 'setup' | 진행 상태머신 |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL | now() | |

인덱스: **부분 UNIQUE `uq_race_events_active_session(session_id) WHERE 미종료`** — 세션당 활성 이벤트 1개(R-8) / `(facility_id, event_date DESC)` / `status WHERE in_progress`(부분) / `parent_event_id`(부분, 히트 시리즈 집계).
히트 통합 랭킹: `COALESCE(parent_event_id, id)` 시리즈 기준 race_records 집계 — records 스키마는 오염 없음.

**race_teams** ✅ — UNIQUE(event_id, team_name), team_color 기본 '#FF6A00', total_distance_m(종료 시 확정 합산 — 실시간은 Broadcast).

**race_live_state** ✅ — UNIQUE(event_id, device_id). 5초 스냅샷(재접속 복원 전용), lane_number, member_id/team_id, distance_m/power_w/stroke_rate_spm/hr_bpm/calories_burned/max_watts, connection_status 5종, last_updated_at. **이벤트 종료 시 DELETE**(3경로 원칙). 인덱스 `device_id`.

**race_recordings** ✅ — JSONL 메타(file_path/file_size_bytes/total_data_points/duration_seconds). 본체는 race-service 로컬 30일. 인덱스 `(event_id, device_serial)` — 멱등 적재 경로.

**race_records** ✅ — UNIQUE(event_id, member_id) 멱등. result_time INTERVAL, result_distance, calories_burned, avg/max_watts, avg_spm, avg_pace INTERVAL, avg/max_hr_bpm, lane_number, finish_rank, is_pr, team_id/recording_id/device_serial. 인덱스 `(event_id, device_serial)` 적재 / `(member_id, created_at DESC)` 퍼포먼스 이력.
연동: INSERT → `trg_badges_on_race_record`(배지 판정) + `fn_get_member_performance_profile` 소스.

---

### 4.3 notification (`06_notification.sql`)

```mermaid
erDiagram
    auth_users ||--o{ notifications : "user_id"
    notifications ||--o{ notification_logs : ""
    notification_rules ||--o{ notification_logs : ""
    auth_users ||--|| notification_preferences : "UNIQUE user_id"
    auth_users ||--o{ push_subscriptions : ""
```

**notifications** ✅ — user_id NOT NULL FK, member_id, title, **content**(구 message 표기 통일), category 7종/type 5종/channel 5종, action_url, metadata JSONB(중복 발송 방지 키 보관), is_read/read_at. 인덱스 `(user_id, created_at DESC) WHERE NOT is_read`(부분) / `(user_id, category, created_at DESC)`(dedupe 조회).

**notification_rules** ✅ — trigger_type 6종, trigger_config JSONB, title/message_template, channels TEXT[], is_active. RLS 🔄 admin 전용(as-is 전체 읽기 제거).

**notification_logs** ✅ — rule_id/notification_id/user_id, channel, status 4종, sent_at/read_at/error_message. RLS 🔄 admin 전용(타인 로그 노출 차단).

**notification_preferences** ✅🔄 — **user_id UNIQUE**(as-is 무제약 정리). 카테고리 토글 6종 + push/kakao/sms/email_enabled + **celebrate_opt_in**(🔄 Class PR 티커 공개 동의) + quiet_hours. 없으면 전 채널 기본 허용으로 간주.

**push_subscriptions** ✅🔄 — **endpoint UNIQUE**(중복 구독 방지). p256dh_key/auth_key(VAPID), device_type/user_agent, is_active, last_used_at.

---

### 4.4 performance + badges (`07_performance_badges.sql`)

```mermaid
erDiagram
    benchmark_definitions ||--o{ member_benchmark_results : ""
    members ||--o{ member_benchmark_results : ""
    sessions ||--o{ member_benchmark_results : "session_id"
    race_events ||--o{ member_benchmark_results : "race_event_id"
    coaches ||--o{ coach_followups : ""
    members ||--o{ coach_followups : ""
    badge_definitions ||--o{ badge_awards : ""
    members ||--o{ badge_awards : "UNIQUE(member,badge)"
```

**benchmark_definitions** ✅ (시드 6종: 500m/1000m/2000m Row, Max Back Squat/Deadlift/Pull-ups) — name UNIQUE, metric_type 5종(time=낮을수록 우수), unit, facility_id NULL=공용, is_active.

**member_benchmark_results** ✅🔄 — result_value NUMERIC(12,2) >0(time이면 초), result_meta JSONB, **rx_status(rx_plus/rx/scaled — 🔄 G-2, PR 판정은 동일 rx 계층 내 비교)**, is_pr(기록 시점 판정 — advisory lock), session_id/race_event_id 연동, recorded_by/recorded_at. 인덱스 `(member_id, benchmark_id, recorded_at DESC)` / `recorded_at DESC WHERE is_pr`(부분 — PR 티커).

**coach_followups** ✅ — followup_type 5종, priority 3종, status 3종, due_date, note, completed_at. 인덱스 `(coach_id, due_date) WHERE open`(부분) / `(member_id, created_at DESC)`. **회원 비노출**(RLS coach 본인+admin).

**badge_definitions** ⏳ (as-is 마이그레이션 부재 → 최초 정식 설계. 시드 12종)

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | |
| slug | VARCHAR(60) | NOT NULL UNIQUE | | first-checkin, checkin-10/50/100, streak-4w, first-pr, pr-10, first-race, race-5, race-podium, member-90d, member-365d |
| name / description / icon | VARCHAR/TEXT | name NOT NULL | | icon=디자인 시스템 키 |
| category | VARCHAR(20) | CHECK 5종 | | |
| metric_type | VARCHAR(30) | CHECK 7종 | | manual=Admin 수동 수여 전용 |
| threshold_value | NUMERIC | NOT NULL >0 | 1 | |
| sort_order / is_active | INT / BOOLEAN | NOT NULL | 0 / true | |

**badge_awards** ⏳ — **UNIQUE(member_id, badge_id)**(중복 수여 원천 차단 — 판정 멱등의 기반), source(auto/manual), progress_value(수여 시점 지표), awarded_by, awarded_at.

**배지 판정 트리거 4종**: `trg_badges_on_checkin`(checkins INSERT) / `trg_badges_on_benchmark`(results INSERT, is_pr만) / `trg_badges_on_race_record`(race_records INSERT) / `trg_badges_on_membership`(memberships INSERT). 전부 wrapper가 `fn_evaluate_badges(member_id, trigger)`를 호출하며 **예외를 삼켜 원 트랜잭션을 실패시키지 않음**. 획득 시 notifications(category=badge) 자동 발행.

---

### 4.5 rbac (`08_rbac_supplementary.sql` 전반부)

```mermaid
erDiagram
    admin_roles ||--o{ admin_user_roles : "role_id"
    auth_users ||--o{ admin_user_roles : "user_id"
    facilities ||--o{ admin_user_roles : "facility_id(NULL=전지점)"
```

**admin_roles** 🔄 — permissions **JSONB 단일형 강제**: `{"<권한그룹>": ["view","edit",...]}` 배열형 1종만(as-is 불리언맵/배열 혼재 해소, `jsonb_typeof='object'` CHECK). 와일드카드 `{"*":["all"]}`=super_admin(UI 편집 잠금). **권한 그룹 키 = Admin 14화면과 1:1**: dashboard/members/attendance/payments/plans/schedule/coaches/wod_studio/race/lockers/badges/feedback/crm/settings.
시드 4종: super_admin(`{"*":["all"]}`) / manager(운영 전반 view+edit) / staff(출석·회원·락커 중심) / viewer(읽기 전용).

**admin_user_roles** 🔄 (**권한 단일 소스로 승격** — as-is "UI 전용 미연동" 해소) — UNIQUE(user_id, role_id, facility_id), assigned_by/at. **게이트 순서**: ① `profiles.role='admin'`(RLS·라우트 진입) → ② `fn_my_permissions()`(화면·기능 단위). role=admin인데 매핑이 없으면 super_admin으로 간주(부트스트랩 잠금 방지 — fn_my_permissions 내 규칙).

### 4.6 supplementary (`08_rbac_supplementary.sql` 후반부)

**notices** ✅ — category 5종, priority 4종, is_pinned/is_published/published_at/expires_at. 부분 인덱스 `(facility_id, is_pinned DESC, published_at DESC) WHERE is_published`.

**banners** ✅🔄 — position 슬러그 5종(한글값 폐지), priority_order, start/end_date(CHECK end>start), is_active. 부분 인덱스 활성창.

**support_tickets** ✅ — category/status/priority CHECK, assigned_to, resolved_at. 인덱스 `(status, created_at DESC)` / `(member_id, created_at DESC)`.

**faqs** ⏳ — category, question/answer, sort_order, is_published. (회원 앱 고객센터)

**lockers** 🔄 — **삼중 구조(lockers + locker_assignments + members.locker_number) → 1테이블 단일화**

| 컬럼 | 타입 | 제약 | 기본값 | 설명 |
|---|---|---|---|---|
| id | UUID | PK | gen_random_uuid() | |
| facility_id | UUID | NOT NULL FK, UNIQUE(facility, locker_number) | | |
| locker_number | VARCHAR(20) | NOT NULL | | |
| size | VARCHAR(5) | CHECK(S/M/L) | 'M' | |
| monthly_fee | NUMERIC(12,0) | NOT NULL | 0 | |
| status | VARCHAR(15) | CHECK 4종 + **배정 정합 CHECK**(occupied ↔ assigned_member_id) | 'available' | |
| assigned_member_id | UUID | FK members SET NULL | | 현재 배정(단일 소스) |
| assigned_start_date / assigned_end_date | DATE | | | |
| memo | TEXT | | | |

배정 이력은 audit_logs(action=LOCKER_ASSIGN/RELEASE)로 기록 — 별도 이력 테이블 폐지. 부분 인덱스 `assigned_member_id` / `assigned_end_date WHERE occupied`(만기 스캔).

**qr_codes** ✅ — 고정 QR(facility/session/member)만. **회원 체크인 동적 QR({mid,fid,ts,v}, 5분)은 DB 미저장** — fn_kiosk_checkin이 검증. RLS admin 전용.

**kiosk_devices** ✅ — device_name/ip, status 3종, display_message, last_heartbeat(60s 미갱신=offline 표시). RLS admin 전용(단말은 Service Role/anon RPC 사용).

**audit_logs** ✅ — action/table_name/record_id/old·new_values/ip/user_agent. **append-only**(UPDATE/DELETE 정책 없음), 열람 admin 전용(as-is 전체 읽기 제거). 인덱스 `created_at DESC` / `(table_name, record_id)`.

**system_config** ✅ — config_key UNIQUE, config_value JSONB, category, is_secret(UI 마스킹), updated_by. 필수 키: `edge_base_url`, `edge_service_key`(알림 팬아웃 — 06 참조, Vault 권장).

**widget_settings** 🔄 — **위젯 4테이블(정의/인스턴스/레이아웃/AI생성 — 설계만 존재) → 1테이블 축소**. UNIQUE(facility_id, widget_key), title, config JSONB, is_enabled, sort_order. AI 생성기는 후순위 부록.

---

## 5. 인덱스 전략 요약

원칙: **쿼리 패턴 근거 복합 인덱스 위주** + 조건 스캔은 부분 인덱스. as-is의 관성적 단일컬럼 인덱스(예: bookings.status 단독, sessions.status 단독, members.email 단독 등)는 폐기하고 아래로 재산정했다.

| 쿼리 패턴 (화면/기능) | 인덱스 |
|---|---|
| Admin 캘린더·Class 보드: 시설+날짜 세션 | `sessions(facility_id, session_date, start_time)` |
| 코치 KPI 월 집계·리마인더 크론 | `sessions(session_date, status)`, `session_coaches(coach_id, session_id)` |
| 세션 보드 참석자 | `bookings(session_id, status)` |
| 회원 예약/결제/출석 이력 | `bookings(member_id, created_at DESC)`, `transactions(member_id, created_at DESC)`, `checkins(member_id, checkin_time DESC)` |
| 대기열 순번(FIFO) | `bookings(session_id, created_at) WHERE waitlisted` (부분) |
| 출결 KPI | `bookings(attendance_outcome) WHERE <> 'pending'` (부분) |
| 세션당 1회 체크인 보장 | `checkins(session_id, member_id) UNIQUE WHERE session_id IS NOT NULL` |
| 만기 D-n 크론 | `memberships(end_date) WHERE status='active'` (부분) |
| 매출 리포트 | `transactions(status, created_at DESC)`, `(facility_id, created_at DESC)` |
| Toss 콜백 | `transactions(order_id) UNIQUE` |
| 세션당 활성 Race 1개(R-8) | `race_events(session_id) UNIQUE WHERE 미종료` (부분) |
| Race 결과 멱등 적재 | `race_records(event_id, device_serial)`, `race_recordings(event_id, device_serial)`, `race_records(event_id, member_id) UNIQUE` |
| 미읽음 알림 | `notifications(user_id, created_at DESC) WHERE NOT is_read` (부분) |
| PR 티커 | `member_benchmark_results(recorded_at DESC) WHERE is_pr` (부분) |
| 활성 플래그/오픈 팔로업 | `member_alert_flags(member_id, flag_type) WHERE resolved_at IS NULL`, `coach_followups(coach_id, due_date) WHERE open` |

---

## 6. RLS 정책 매트릭스 (역할 × 테이블 × CRUD)

범례: `S`=SELECT, `I`=INSERT, `U`=UPDATE, `D`=DELETE. `own`=본인 행만(user_id/member 연결), `assigned`=배정 코치만, `pub`=게시분만, `−`=차단.
**anon 열이 −가 아닌 행 = 공개 화이트리스트 전부**다(R6). member/coach/admin은 approval_status=approved 전제.

| 테이블 | anon | member | coach | admin |
|---|---|---|---|---|
| facilities | − | S | S | SIUD |
| profiles | − | S(own) | S(own) | SIUD |
| members | − | S,U(own) | S | SIUD |
| coaches | − | S | S, U(own) | SIUD |
| member_notes | − | − | S,I,U | SIUD |
| member_agreements ⏳ | − | S(own) (기록=fn_sign_agreement, U 불가—증빙 불변) | S | S,D |
| membership_plans | − | S | S | SIUD |
| memberships | − | S(own) | S | SIUD (크레딧 증감=RPC) |
| membership_history | − | S(own) | − | SIUD |
| transactions | − | S(own) | − | SIUD (INSERT=서버 라우트/SRK) |
| refunds | − | S(own) | − | SIUD |
| pg_settings | − | − | − | SIUD (시크릿 마스킹) |
| coach_settlements | − | − | S(own) | SIUD |
| sessions | − | S | S | SIUD |
| session_coaches | − | S | S | SIUD |
| bookings | − | S(own) (쓰기=RPC) | S (판정=RPC) | SIUD |
| checkins | − | S(own) | S | SIUD (INSERT=RPC/키오스크) |
| session_rotation_states | **S** (TV HUD 의도적 공개) | S | S, IUD(assigned) | SIUD |
| session_feedback | − | S(own), I(own) | S | SIUD(응답) |
| movement_categories / movement_library | − | S | S,I,U | SIUD |
| wod_templates / wod_template_movements / class_runbook_templates | − | S | S,I,U | SIUD (D=admin) |
| session_wods / session_runbooks | − | S | S, IUD(assigned) | SIUD |
| session_wod_results ⏳ | − | S,I,U(own) (전원 열람=whiteboard RPC) | S,I,U | SIUD |
| member_alert_flags | − | − | S,I,U | SIUD |
| pm5_devices | − | S | S,I,U | SIUD |
| race_events / race_teams / race_live_state / race_records | **S** (🔄 Race TV 미인증 구동) | S | S,I,U (live_state는 D도 staff) | SIUD |
| race_recordings | − | S | S,I,U | SIUD |
| notifications | − | S,U(own — 읽음 처리) | S,U(own) | SIUD |
| notification_rules / notification_logs | − | − | − | SIUD (🔄 전체 읽기 제거) |
| notification_preferences / push_subscriptions | − | SIUD(own) | SIUD(own) | S(preferences) |
| benchmark_definitions | − | S | S,I,U | SIUD |
| member_benchmark_results | − | S(own) | S,I,U | SIUD |
| coach_followups | − | − (**회원 절대 비노출**) | SIUD(own coach) | SIUD |
| badge_definitions | − | S | S | SIUD |
| badge_awards | − | S(own) | S | SIUD (auto 수여=DEFINER RPC) |
| admin_roles | − | − | − | SIUD |
| admin_user_roles | − | S(own) | S(own) | SIUD |
| notices | − | S(pub) | S(pub) | SIUD |
| banners | − | S(활성창) | S(활성창) | SIUD |
| support_tickets | − | S(own), I(own) | − | SIUD |
| faqs | − | S(pub) | S(pub) | SIUD |
| lockers | − | S(own 배정분) | − | SIUD |
| qr_codes / kiosk_devices | − | − | − | SIUD |
| audit_logs | − | − | − | S (append-only, 쓰기=DEFINER fn) |
| system_config / widget_settings | − | − | − | SIUD |

**RPC 실행 권한(EXECUTE) 화이트리스트**
- anon + authenticated: `fn_kiosk_checkin`, `fn_get_class_display_wod`, `fn_get_class_live_board`, `fn_get_class_screen_prs`, `fn_get_class_leaderboard`
- authenticated 전용: 나머지 전부 (내부에서 역할 재검증)
- Service Role 전용(클라이언트 미노출): `get_decrypted_pg_settings`

---

## 7. RPC 계약서 — 표준 38종 (계약 §4 + 보정: kiosk 1 + Class 공개 3 + 4차 보정 G-계열 4)

> 전 함수 공통: `SECURITY DEFINER` + `SET search_path=public` + envelope `{success, data, error}`.
> 폐지 목록(§10 참조)의 함수명은 to-be 코드 어디에서도 등장 금지.
> 게이트 헬퍼: `_assert_coach_or_admin()` / `_assert_coach_can_edit_session(session_id)` — RPC 내부 전용.

### 7.1 계정/권한 (4)

| # | 시그니처 | 권한 | 설명 |
|---|---|---|---|
| 1 | `fn_my_permissions()` | authenticated | 역할+승인+세부 권한 병합. UI 게이트 유일 소스 |
| 2 | `promote_to_coach(p_target_user_id uuid)` | admin (내부 is_admin) | 🔄 admin_user_id 파라미터 제거. profiles.role 변경 + coaches upsert + audit |
| 3 | `demote_from_coach(p_target_user_id uuid)` | admin | role=member + coaches inactive + audit |
| 3b | `fn_sign_agreement(p_doc_type, p_doc_version, p_signature)` ⏳G-6 | member 본인 | 전자 동의·웨이버 서명 기록(불변 증빙). 동일 (type,version) 재서명 시 `already_signed:true` |

`fn_my_permissions` 반환 예시:
```json
{ "success": true, "error": null,
  "data": { "user_id": "…", "role": "admin", "approval_status": "approved",
            "is_super_admin": false,
            "permissions": { "members": ["view","edit"], "payments": ["view"] } } }
```
규칙: admin_user_roles의 모든 역할 permissions를 그룹별 배열 union으로 병합. `role='admin'`인데 매핑 0건이면 `{"*":["all"]}` 간주(부트스트랩 잠금 방지).

### 7.2 예약 · 키오스크 (3)

| # | 시그니처 | 권한 | 동시성 |
|---|---|---|---|
| 4 | `fn_book_with_credit(p_session_id uuid)` | authenticated(member 본인 파생) | **advisory lock** `booking:{session_id}` + 멤버십 행 FOR UPDATE |
| 5 | `fn_cancel_booking_with_credit(p_booking_id uuid, p_reason text=null)` | 본인 또는 admin | booking 행 FOR UPDATE |
| 6 | `fn_kiosk_checkin(p_payload jsonb)` ⏳ | **anon 허용**(키오스크 단말) | 5분 중복 가드 |

- **fn_book_with_credit** 🔄: p_user_id 제거(auth.uid()→current_member_id()). 흐름 = 세션 유효성(scheduled·미시작) → **G-4/G-5 booking_policy 검증**(① 예약 윈도우 `booking_open_days` 밖 → `booking_not_open` ② 주간 상한 `weekly_booking_cap` 도달 → `weekly_cap_reached` ③ 최근 30일 no_show ≥ `noshow_penalty.monthly_threshold`이고 최근 no_show 후 `restrict_days` 이내 → `booking_restricted_noshow`) → lock → 중복 검사 → 정원 판정 → 초과 시 waitlisted(크레딧 미차감) / 여유 시 횟수제 활성권 차감 + `bookings.membership_id/credit_used` 기록. **정책 값은 facilities.booking_policy에서만 읽는다(계약 §6b — 클라이언트 하드코딩 금지)**.
  ```json
  { "success": true, "data": { "booking_id": "…", "status": "confirmed",
    "credits_used": 1, "remaining_credits": 7 }, "error": null }
  ```
- **fn_cancel_booking_with_credit** 🔄: 환원은 `credit_used=true`인 예약의 `membership_id`에만 +1 (as-is의 "아무 활성권에나 +1" 버그 해소). **G-4/G-5**: `cancel_deadline_hours` 경과 후 취소 = `late_cancel` 판정 자동 기록 + `noshow_penalty.credit_forfeit=true`면 크레딧 몰수(반환값 `late_cancel`/`credit_forfeited`/`credit_refunded`). admin 대리 취소는 페널티 예외. confirmed→cancelled 전환이 빈자리 알림 트리거를 발화.
- **fn_kiosk_checkin**: 페이로드 `{mid,fid,ts,v:1}` — ① 구조·버전 검증 ② `|now-ts|>300s`→`qr_expired` ③ 회원 active·비블랙리스트 ③b **G-7 멤버십 유효성**(기간 유효 또는 잔여 크레딧>0 — `plan_kind` 무관: standard/drop_in/trial 동일 규칙으로 통과, 없으면 `no_active_membership`. as-is NO_MEMBERSHIP 거부로 드롭인 불가하던 분기 해소) ④ 5분 내 중복→`duplicate_checkin` ⑤ 오늘 ±30분 시작 confirmed 예약 자동 감지 ⑥ checkins INSERT(kiosk) ⑦ outcome pending→checked_in(**코치 기판정 미변경**). 응답에 `membership_plan_kind/plan_name` 포함(키오스크 안내 문구용).
  ```json
  { "success": true, "data": { "checkin_id": "…", "member_name": "김회원",
    "session_id": "…", "session_title": "WOD 10:00", "linked_booking": true,
    "checkin_time": "2026-07-07T01:00:00Z" }, "error": null }
  ```

### 7.3 코치 운영 (5)

| # | 시그니처 | 권한 | 설명 |
|---|---|---|---|
| 7 | `fn_get_my_coach_context()` | authenticated | 연결 상태 단일 진입점 (unlinked/on_leave/linked_active/linked_unassigned) |
| 8 | `fn_get_my_coach_dashboard()` | coach 본인 | 당일 세션 + risk_summary(waitlist/unchecked/starting_soon) + open_followups |
| 9 | `fn_get_coach_schedule(p_from date, p_to date)` | coach 본인 | 기간 ≤92일. 세션별 집계 + has_wod + race_linked |
| 10 | `fn_get_coach_session_board(p_session_id uuid)` | **배정 코치/admin** (_assert) | 보드 단일 소스: session+coaches+attendees(+active_flags)+summary |
| 11 | `fn_mark_attendance(p_session_id uuid, p_items jsonb)` 🔄 | 배정 코치/admin | **mark+bulk_mark 통합**. items=[{member_id, action}] — 단건=1원소. walk_in은 booking 자동 생성. 부분 성공 반환 |

`fn_mark_attendance` 반환:
```json
{ "success": false, "error": "partial_failure",
  "data": { "success_count": 3, "failure_count": 1,
    "results": [ { "member_id": "…", "action": "checked_in", "success": true, "error": null }, … ] } }
```
action ∈ checked_in/no_show/late_cancel/coach_excused/walk_in. checked_in·walk_in은 checkins 사실 기록 동반(부분 유니크로 멱등).

### 7.4 WOD (10)

| # | 시그니처 | 권한 |
|---|---|---|
| 12 | `fn_search_wod_movements(p_query, p_category, p_equipment, p_limit=50)` | staff |
| 13 | `fn_list_movement_library(p_query, p_category, p_is_active, p_limit=100, p_offset=0)` | staff — Admin 관리용(usage count+카테고리 조인+total) |
| 14 | `fn_list_wod_templates(p_scope='shared'|'facility'|'benchmark', p_facility_id, p_template_kind)` | staff |
| 15 | `fn_get_wod_template(p_template_id uuid)` ⏳신설 | staff |
| 16 | `fn_upsert_wod_template(p_payload jsonb)` | staff — movement line 전체 교체(멱등) |
| 17 | `fn_publish_wod_template(p_template_id uuid)` ⏳신설 | staff — published_at 스탬프 |
| 18 | `fn_get_session_wod(p_session_id uuid)` | staff |
| 19 | `fn_upsert_session_wod(p_session_id uuid, p_payload jsonb)` | 배정 코치/admin — draft upsert |
| 20 | `fn_publish_session_wod(p_session_id uuid)` | 배정 코치/admin — draft→published, source_version+1 |
| 21 | `fn_get_class_display_wod(p_facility_id uuid=null, p_date date=today, p_session_id uuid=null)` 🔄 | **anon 허용** — published 스냅샷만(Display-Safe) |

### 7.5 런시트 (4)

| # | 시그니처 | 권한 |
|---|---|---|
| 22 | `fn_list_runbook_templates(p_facility_id, p_class_type)` | staff |
| 23 | `fn_upsert_runbook_template(p_payload jsonb)` | staff |
| 24 | `fn_get_session_runbook(p_session_id uuid)` | staff — 오버라이드+상속 템플릿 동시 반환 |
| 25 | `fn_upsert_session_runbook(p_session_id uuid, p_payload jsonb)` | 배정 코치/admin |

### 7.6 회원 컨텍스트 (2)

| # | 시그니처 | 권한 |
|---|---|---|
| 26 | `fn_get_member_context_panel(p_member_id uuid)` 🔄 | staff — member+active_flags+recent_notes(member_notes 통합)+attendance+active_membership+**open_followups** (fn_list_member_alert_flags 흡수) |
| 27 | `fn_upsert_member_alert_flag(p_member_id uuid, p_payload jsonb)` | staff — resolved=true 시 해제 |

### 7.7 KPI/정산 (2)

| # | 시그니처 | 권한 |
|---|---|---|
| 28 | `fn_get_coach_monthly_report(p_year_month text=null, p_sections text[]=['basis','kpis','retention'])` 🔄 | coach 본인 — **P1-B 3종 통합** |
| 29 | `fn_calculate_monthly_settlement(p_year_month text)` 🔄 | admin — 전 코치 스냅샷 upsert. cancelled 세션 제외(버그 수정), confirmed/paid 스냅샷 보호 |

`fn_get_coach_monthly_report` 반환(섹션 선택형):
```json
{ "success": true, "error": null, "data": {
  "year_month": "2026-07",
  "basis":     { "base_salary": 2000000, "session_allowance": 30000,
                 "payable_session_count": 42, "cancelled_session_count": 2,
                 "completed_session_count": 8, "expected_total_amount": 3260000,
                 "settlement_snapshot_status": null },
  "kpis":      { "total_sessions": 44, "total_bookings": 380, "checkin_count": 330,
                 "no_show_count": 18, "attendance_rate": 86.8, "no_show_rate": 4.7,
                 "waitlist_converted": 12, "payable_session_count": 42 },
  "retention": { "renewal_risk": [ { "member_id": "…", "name": "…", "end_date": "…", "days_until_expiry": 12 } ],
                 "long_absence": [ { "member_id": "…", "name": "…", "last_checkin": "…" } ] } } }
```

### 7.8 퍼포먼스 (6)

| # | 시그니처 | 권한 | 동시성 |
|---|---|---|---|
| 30 | `fn_list_benchmark_definitions(p_include_inactive bool=false)` | authenticated | |
| 31 | `fn_record_member_benchmark_result(p_member_id, p_benchmark_id, p_result_value, p_session_id=null, p_race_event_id=null, p_result_meta='{}', p_rx_status='rx')` 🔄+rx | staff (+세션 지정 시 배정 코치 검증) | **advisory lock** `member:benchmark` — PR 판정 직렬화, **동일 rx 계층 내 비교(G-2)** |
| 32 | `fn_get_member_performance_profile(p_member_id uuid)` 🔄 | 본인 또는 staff | 반환에 `wod_timeline`(최근 일일 WOD 기록 10건 — G-1) 추가 |
| 33 | `fn_create_followup(p_payload jsonb)` | coach 본인 | 입력 사전 검증(P25) |
| 34 | `fn_complete_followup(p_followup_id uuid, p_status='completed')` | 소유 코치/admin | completed/dismissed/open(재오픈) |
| 35 | `fn_get_my_followups(p_status='open', p_member_id=null, p_limit=50)` | coach 본인 | priority>due_date 정렬 + is_overdue |

### 7.8b 일일 WOD 기록 (3) ⏳ — G-1~G-3 디지털 화이트보드

| # | 시그니처 | 권한 | 설명 |
|---|---|---|---|
| 35b | `fn_record_session_wod_result(p_session_id uuid, p_score numeric, p_score_type text, p_rx_status text='rx', p_note text=null)` | member 본인 | published WOD + 세션 참가자(confirmed/walk_in)만. UNIQUE(wod,member) upsert — 재기록=수정 |
| 35c | `fn_get_session_wod_whiteboard(p_session_id uuid)` | authenticated | 세션 전원 결과. 정렬: ① rx 계층(Rx+→Rx→Scaled) ② score_type 방향(time 오름차순/그 외 내림차순) ③ 기록 시각. anon 미공개 |
| 35d | `fn_get_my_wod_prep(p_session_id uuid)` | member 본인 | 예정(published) WOD + 동일 템플릿 본인 과거 기록 3건 + 동명 벤치마크 본인 베스트(rx 계층별) 조인 |

`fn_get_session_wod_whiteboard` 반환 예시:
```json
{ "success": true, "error": null, "data": {
  "session_id": "…", "session_title": "WOD 10:00", "session_date": "2026-07-07",
  "wod_title": "Fran", "format": "for_time",
  "results": [
    { "rank": 1, "member_name": "김회원", "score": 245, "score_type": "time",
      "rx_status": "rx_plus", "note": null, "created_at": "…" },
    { "rank": 2, "member_name": "이회원", "score": 262, "score_type": "time",
      "rx_status": "rx", "note": null, "created_at": "…" },
    { "rank": 3, "member_name": "박회원", "score": 230, "score_type": "time",
      "rx_status": "scaled", "note": "풀업→링로우", "created_at": "…" } ] } }
```

### 7.9 배지 (2) ⏳

| # | 시그니처 | 권한 |
|---|---|---|
| 36 | `fn_get_my_badges()` | member 본인 — 보유+미보유 진행률(current_value/threshold). 조회 시 재평가(멱등) |
| 37 | `fn_evaluate_badges(p_member_id uuid, p_trigger text=null)` | 트리거 4종 경유(DEFINER) / 직접 호출은 staff 또는 본인 |

`fn_evaluate_badges` 반환:
```json
{ "success": true, "error": null, "data": {
  "member_id": "…", "trigger": "checkin",
  "newly_awarded": [ { "badge_id": "…", "slug": "checkin-10", "name": "출석 10회" } ],
  "metrics": { "checkin_count": 10, "streak_weeks": 3, "pr_count": 2,
               "race_count": 1, "race_podium_count": 0, "membership_days": 45 } } }
```

### 7.10 Race (1)

| # | 시그니처 | 권한 | 동시성 |
|---|---|---|---|
| 38 | `fn_prepare_race_session(p_session_id uuid, p_race_format text='individual', p_options jsonb='{}')` 🔄 | 배정 코치/admin | **advisory lock** `race_session:{id}` + 부분 유니크 이중 방어 |

p_options 키(15-race-system §4b): `target_distance_m`(개인/팀/릴레이) · `duration_minutes`(시간제) · `group_target_m`(단체전 A안) · `heat_mode`(bool, B안) · `next_heat_of`(event_id — heat_no+1, parent 연결, **carryover 자동 계산**=이전 이월+이전 히트 기록 합).
동작: 미종료 이벤트 존재 시 재개(created=false); `next_heat_of` 지정 시 이전 히트 종료 검증 후 신규 생성.
```json
{ "success": true, "error": null, "data": {
  "created": true, "event_id": "…", "event_name": "WOD 10:00 — 07/07 (Heat 2)",
  "session_id": "…", "status": "scheduled", "lobby_status": "setup",
  "race_format": "group", "target_distance_m": null, "duration_minutes": null,
  "group_target_m": 10000, "heat_no": 2, "parent_event_id": "…", "carryover_m": 4180.5 } }
```

### 7.11 Class 공개 (3) ⏳ — anon 실행, Display-Safe를 데이터 계층에서 강제

| # | 시그니처 | 반환 범위 (민감 컬럼 SELECT 자체 금지) |
|---|---|---|
| 39 | `fn_get_class_live_board(p_facility_id uuid)` | 현재/다음 세션 메타+집계+체크인 **이름만** (연락처·판정·메모 원천 미포함) |
| 40 | `fn_get_class_screen_prs(p_facility_id uuid, p_days int=7)` | 최근 PR: 이름+항목+기록 라벨. `celebrate_opt_in` 존중, 생체 지표 제외 |
| 41 | `fn_get_class_leaderboard(p_facility_id uuid, p_scope text='month'|'week'|'all')` | 이름+거리/승수/PR수 랭킹 top10 (HR 등 생체 제외) |

`fn_get_class_live_board` 반환 예시:
```json
{ "success": true, "error": null, "data": {
  "server_time": "2026-07-07T01:00:00Z",
  "current": { "id": "…", "title": "WOD 10:00", "start_time": "10:00", "end_time": "11:00",
               "capacity": 15, "coach_names": ["박코치"], "booked_count": 12,
               "checkin_count": 9, "checked_in_names": ["김회원", "이회원"] },
  "next": { "id": "…", "title": "Strength 11:30", "start_time": "11:30",
            "end_time": "12:30", "capacity": 12, "booked_count": 7 } } }
```

### 7.12 Admin 대시보드 (3) 🔄 fn_ 접두 표준화 + admin 게이트

| # | 시그니처 | 설명 |
|---|---|---|
| 42 | `fn_get_dashboard_kpis()` | 회원/승인대기/체크인/예약/세션/월매출/활성권/만기 D-7/코치/신규/티켓 — as-is의 스테일 컬럼 참조(joined_date, start_time::date 등) 전부 수정 |
| 43 | `fn_get_revenue_stats(p_start_date, p_end_date)` | completed 기준 합계+카테고리별+소스별 |
| 44 | `fn_get_coach_performance_stats()` | 코치별 세션수/평점(session_feedback)/담당 회원수 |

### 7.13 부속 내부 함수 (표준 34종 외)

| 함수 | 권한 | 비고 |
|---|---|---|
| `save_pg_settings(facility, test_key, live_key, webhook, enc_key)` | admin (🔄 게이트 추가) | facility_id 기준 UPSERT(as-is id 충돌 버그 수정), 부분 갱신 COALESCE |
| `get_decrypted_pg_settings(facility, enc_key)` | **Service Role 전용** (authenticated REVOKE) | 서버 결제 라우트만 |
| `current_member_id()` / `is_admin()` / `is_admin_or_coach()` | authenticated | 00_extensions_helpers |
| `_assert_coach_or_admin()` / `_assert_coach_can_edit_session()` | RPC 내부 | 09 |

> **함수 수 주기**: 계약 §4는 그룹 공칭이며, 함수 단위 전수는 위 **48개**(표준 38분류 = 34 + 4차 보정 4종[fn_sign_agreement, 일일 WOD 3종])+부속이다. 교차검수는 이 표의 함수명 목록을 기준으로 한다.

---

## 8. 자동화 (트리거 · pg_cron) / Storage / Edge Functions

### 8.1 트리거 전수

| 트리거 | 테이블/이벤트 | 함수 | 효과 |
|---|---|---|---|
| trg_on_auth_user_created | auth.users INSERT | handle_new_auth_user | profiles(pending)+members 생성·연결 (R11: email_confirmed_at 의존 금지) |
| trg_notifications_side_effects | notifications INSERT | fn_handle_notification_side_effects | pg_net→EF 팬아웃(push 전 구독, 중요 알림은 kakao/sms) + notification_logs. **실패해도 원 INSERT 성공** |
| trg_notify_waitlist_on_vacancy | bookings UPDATE OF status | fn_notify_waitlist_on_vacancy | confirmed→cancelled 시 waitlisted 상위 3명 알림 |
| trg_badges_on_checkin | checkins INSERT | _badges_on_checkin → fn_evaluate_badges | 출석 배지 판정 |
| trg_badges_on_benchmark | member_benchmark_results INSERT(is_pr) | _badges_on_benchmark | PR 배지 판정 |
| trg_badges_on_race_record | race_records INSERT | _badges_on_race_record | 레이스 배지 판정 |
| trg_badges_on_membership | memberships INSERT | _badges_on_membership | 멤버십 기간 배지 판정 |
| trg_*_updated_at (25+) | 각 테이블 BEFORE UPDATE | update_updated_at_column | updated_at 자동 갱신 |

### 8.2 pg_cron — 🔄 **DDL에 등록 포함 (as-is 등록 0건 해소)**, `06_notification.sql`이 SSOT

| jobname | 스케줄 | 함수 | 내용 |
|---|---|---|---|
| `bcl-class-reminders` | `*/10 * * * *` | fn_send_class_reminders | 시작 50~70분 전 창의 confirmed 예약자 리마인더. 세션당 2시간 dedupe |
| `bcl-membership-expiry-reminders` | `0 0 * * *` (UTC = KST 09:00) | fn_send_membership_expiry_reminders ⏳ | active 만기 **D-7/D-3/D-1**. (membership_id, d_day) 멱등. as-is에선 문서만 존재 → 정식 구현 |

Edge 호출 설정은 `system_config(edge_base_url, edge_service_key)` — as-is의 `request.headers` 의존(크론 컨텍스트 불능) 제거. 미설정 시 인앱 알림만 남기고 발송 스킵.

### 8.3 Storage 버킷 (00_extensions_helpers.sql)

| 버킷 | 공개 | 용도 | 쓰기 정책 |
|---|---|---|---|
| `avatars` | public read | 회원/코치 프로필 | 본인 경로(`{uid}/…`)만 INSERT |
| `facility-photos` | public read | 시설 사진 | staff |
| `movement-media` | public read | 운동 썸네일/영상 | staff |
| `uploads` | private | 티켓 첨부 등 | 본인 경로 RW + admin |

### 8.4 Edge Functions

| 함수 | 상태 | 호출 경로 | 비고 |
|---|---|---|---|
| `send-push-notification` | ✅ 실동작(web-push+VAPID) | notifications 트리거 → pg_net | 구독 무효(410) 시 push_subscriptions.is_active=false 콜백 권장 |
| `send-external-notification` | 🧪 카카오/SMS mock | 동일 트리거(중요 알림+옵트인) | P14 실연동 대기 — 인터페이스(채널/phone/message/category)는 확정 |

(참고) Race Python 브릿지(FastAPI 8001)는 Service Role Key로 DB 접근 — RLS 미적용 경로. REST/Broadcast 계약은 15-race-system.

---

## 9. 데이터 접근 규약 (앱 구현 에이전트용)

1. **읽기**: 단순 목록/상세는 PostgREST(select) + RLS. 집계·교차 도메인·공개 화면은 반드시 표준 RPC.
2. **쓰기**: bookings/checkins/attendance/크레딧/배지/정산/Race 준비는 **RPC 전용** — 테이블 직접 쓰기 금지(정책도 없음).
3. **결제**: 클라이언트는 결제창 오픈까지만. 승인/취소/환불은 서버 라우트(Service Role)에서 transactions/refunds 기록.
4. **Realtime**: postgres_changes 구독은 `checkins`(Class live), `session_rotation_states`(HUD), `race_live_state`(복원)에 한정. 고빈도 스트림은 Broadcast(0.3s)로 — DB에 흘리지 않는다.
5. **타입 생성**: `supabase gen types typescript` 결과를 §2 enum 표와 대조하는 스크립트를 CI 게이트로 (11-deployment §CI).

---

## 10. as-is → to-be 변경 대조표 (전환 근거 — 이관 스크립트의 매핑 기준)

### 10.1 권한/계정

| # | as-is | to-be | 근거/이관 |
|---|---|---|---|
| 1 | 권한 이원화: profiles.role(실제 RLS) vs admin_roles(UI 전용 미연동) | **단일 체계**: profiles.role(1차 게이트) + admin_user_roles→admin_roles(세부) + `fn_my_permissions()` 1함수 | UI/서버 판정 불일치 제거. 이관: 기존 admin에게 super_admin 매핑 1행 생성 |
| 2 | admin_roles.permissions 2형태 혼재(불리언맵 `{read:true}` vs 배열) | **`{group: string[]}` 배열형 1종** + jsonb_typeof CHECK. 그룹 키=Admin 14화면 | 시드 재작성. 구 데이터는 시드로 대체(운영 커스텀 역할 없음 확인) |
| 3 | promote/demote가 admin_user_id 파라미터 수신 | auth.uid() 내부 검증 + coaches upsert 원자화 + envelope | 클라이언트 식별자 전달 금지(R3) |
| 4 | profiles 본인 UPDATE로 role 변경 이론상 가능 | 본인 UPDATE 정책 제거(권한상승 벡터 차단) | |
| 5 | 이메일 검증 흐름 잔존(/auth/email-verify) | **Confirm email OFF 확정** — 트리거 email_confirmed_at 의존 금지, 라우트 폐지 | R11 |

### 10.2 테이블 통합/제거

| # | as-is | to-be | 이관 |
|---|---|---|---|
| 6 | `coaching_notes` + `member_notes` 중복 | **`member_notes` 1테이블**(author_id, author_role, note_type 5종) | coaching_notes→author_role='coach', 구 member_notes→'admin', members.counseling_notes→note_type='counseling' 행 분해 |
| 7 | `wods` 레거시(문서 DEPRECATED) | **폐지 — 생성하지 않음**. WOD 소스=session_wods 유일 | 잔존 데이터는 이관 대상 아님(session_wods 이미 병행 운영) |
| 8 | `lockers`+`locker_assignments`+`members.locker_number` 삼중 | **lockers 단일화**(assigned_member_id/start/end + 정합 CHECK). 이력=audit_logs | locker_assignments 활성행→lockers 컬럼, 과거행→audit_logs INSERT |
| 9 | `sessions.wod_description` (DEPRECATED) | **컬럼 제거** | 값 있는 세션은 session_wods.description_override로 이관 |
| 10 | 위젯 4테이블(설계만 존재, 실체 없음) | **widget_settings 1테이블** | 신규 — 이관 없음 |
| 11 | badge_definitions/badge_awards 문서만 존재(마이그레이션 부재) | ⏳ **정식 스키마 + 판정 트리거 4종 + 시드 12종** | 신규 |
| 12 | session_feedback가 문서상 비정식 | sessions 도메인 정식 등재 + UNIQUE(session,member) | 그대로 이관 |
| 13 | faqs 부재(문서 참조만) | ⏳ 신규 생성 | |

### 10.3 네이밍/타입 표준

| # | as-is | to-be | 이관 |
|---|---|---|---|
| 14 | `transactions.id` **text** (+refunds FK text) | **UUID PK** — Toss 식별자는 order_id/payment_key 컬럼으로 분리 | 구 id는 metadata 보존 or order_id로 매핑. refunds.transaction_id 재매핑 |
| 15 | transactions `payment_status`와 `status` 혼용(마이그레이션마다 상이) | `status` 1컬럼(6값) | payment_status 값 → status 매핑 |
| 16 | check_ins/checkins, reservations/bookings, plans/membership_plans 표기 혼재(문서·코드) | **checkins / bookings / membership_plans**만 사용 | 코드 전수 치환(계약 §2) |
| 17 | bookings.status에 no_show/waitlist·waitlisted 혼재 | status 3값(confirmed/waitlisted/cancelled) — 판정은 attendance_outcome | status='no_show'→status 'confirmed'+outcome 'no_show', 'waitlist'→'waitlisted' |
| 18 | bookings.user_id 직접 참조(구 fn_book_with_credit) | member_id 단일 참조(R2) | user_id→members 매핑 |
| 19 | session_coaches.role(primary/assistant) → assignment_role(lead/assistant) 이중 이력 | assignment_role만 | primary→lead |
| 20 | coaches.status 'Inactive' 대소문자 혼용 | 소문자 CHECK 강제 | lower() 이관 |
| 21 | notifications.message vs content 혼용 | `content` 통일 | |
| 22 | banners.position 한글 CHECK | 영문 슬러그 5종 | 값 매핑 |
| 23 | uuid_generate_v4()/gen_random_uuid() 혼용 | gen_random_uuid() 통일(uuid-ossp 미사용) | |

### 10.4 무결성/보안 강화 (신규 제약)

| # | 항목 | 내용 |
|---|---|---|
| 24 | checkins 세션당 1회 | 부분 UNIQUE(session_id, member_id) — 앱 로직 의존 제거 |
| 25 | bookings 크레딧 정합 | membership_id + credit_used 기록 → 취소 환원이 차감 원천에만 (as-is 무차별 +1 버그) |
| 26 | pg_settings facility당 1행 | UNIQUE(facility_id) + save_pg_settings UPSERT 기준 수정(as-is ON CONFLICT(id) 무의미) |
| 27 | notification_preferences user당 1행 / push endpoint UNIQUE | 중복 구독·설정 방지 |
| 28 | lockers 배정 정합 | CHECK(occupied ↔ assigned_member_id) |
| 29 | coach_settlements 확정 보호 | fn_calculate가 status='pending'만 갱신 |
| 30 | anon RLS | 기본 전면 차단 + 화이트리스트 명문화(rotation_states, race 4테이블 🔄공개 전환, 공개 RPC 5종) — fix_anon_rls_exposure 원칙 승계·확장 |
| 31 | notification_rules/logs·audit_logs·qr/kiosk의 authenticated 전체 읽기 | admin 전용으로 축소 |
| 32 | 대시보드 RPC 무게이트(as-is get_dashboard_kpis 등) | admin 게이트 + 스테일 컬럼 참조(joined_date, checkins.time, memberships.user_id 등) 수정 |

### 10.5 RPC 표면: ~40종 → 표준 34종 통합 매핑

| as-is (폐지) | to-be 대체 |
|---|---|
| fn_get_coach_dashboard(p_user_id) | fn_get_my_coach_dashboard() |
| fn_get_session_attendees | fn_get_coach_session_board |
| fn_coach_mark_attendance(p_coach_user_id…) | fn_mark_attendance |
| fn_mark_session_attendance + fn_bulk_mark_session_attendance | **fn_mark_attendance(p_session_id, p_items[])** 1종 |
| fn_get_coach_monthly_settlement_basis / fn_get_coach_monthly_kpis / fn_get_coach_retention_panel | **fn_get_coach_monthly_report(p_year_month, p_sections[])** 1종 |
| fn_list_member_alert_flags | fn_get_member_context_panel에 흡수(active_flags) |
| get_member_with_membership | PostgREST 중첩 select + RLS로 대체(RPC 불필요) |
| get_dashboard_kpis / get_revenue_stats | fn_get_dashboard_kpis / fn_get_revenue_stats (fn_ 접두 + admin 게이트) |
| fn_book_with_credit(p_session, **p_user_id**) | fn_book_with_credit(p_session) — 식별자 전달 금지 |
| fn_prepare_race_session(p_session) | fn_prepare_race_session(p_session, **p_race_format, p_options**) |
| (부재) fn_send_membership_expiry_reminders | ⏳ 구현 + 크론 등록 |
| (부재) fn_get_my_badges / fn_evaluate_badges | ⏳ 구현(트리거 연동) |
| (부재) 키오스크 체크인 API(클라이언트 조합) | ⏳ fn_kiosk_checkin 원자 RPC |
| (부재) Class 화면의 sessions/checkins 직접 SELECT | ⏳ fn_get_class_live_board / screen_prs / leaderboard (공개 표면 RPC화) |

### 10.5b 벤치마킹 4차 보정 (G-1~G-9 — 16-benchmark-gap-analysis §1)

| # | as-is | to-be | 근거 |
|---|---|---|---|
| G-1 | 일일 WOD 점수 기록 불가(벤치마크만) — 구조적 공백 | ⏳ `session_wod_results` 신설 + 기록/화이트보드/Prep RPC 3종 + 퍼포먼스 프로필 wod_timeline | 5개 WOD 솔루션 공통 중핵(디지털 화이트보드) |
| G-2 | Rx/Scaled 어휘 부재 | `rx_status(rx_plus/rx/scaled)`를 session_wod_results + member_benchmark_results에 — PR 판정·화이트보드 정렬 모두 계층 내 비교 | Wodify/SugarWOD 표준 |
| G-3 | 예정 WOD에 본인 기록 매칭 없음 | ⏳ `fn_get_my_wod_prep` — 동일 템플릿 과거 기록+동명 벤치마크 베스트 조인 | BTWB/SugarWOD |
| G-4 | 예약 정책 저장소·집행 없음("규정 적용" 문구만) | `facilities.booking_policy` JSONB 단일 소스 + fn_book/cancel_with_credit 내부 검증(윈도우/마감/주간 상한) | 클라이언트 하드코딩 부채 차단(계약 §6b) |
| G-5 | 노쇼 판정만 있고 페널티 없음 | booking_policy.noshow_penalty — 월 N회 초과 시 D일 예약 제한 + 마감 후 취소 크레딧 몰수(credit_forfeit) | TeamUp/Glofox |
| G-6 | 약관 "열람"만 — 서명 증빙 없음 | ⏳ `member_agreements` + `fn_sign_agreement`(불변 증빙, 버전 재서명) | 부상 업종 법적 리스크·환불 분쟁 방어 |
| G-7 | plans 2형뿐 — 키오스크 NO_MEMBERSHIP 거부로 드롭인 체크인 불가 | `membership_plans.plan_kind(standard/drop_in/trial)` + fn_kiosk_checkin 멤버십 유효성에서 plan_kind 무관 통과 | 박스 표준 문화·바디코디 일일권 |
| G-8 ⚠️ | 환불 기본값 "1/2 경과 전 20%/후 환불 불가" — 법규 충돌 | 기본 산식 교정: **환불금 = 결제금액 − 이용일수 해당액 − min(위약금, 결제금액×10%)** + `chk_refund_penalty_cap`(cap ≤ 0.10 강제) | 공정위 위약금 산정기준 — 설계 결함 교정 |
| G-9 | 현금/이체 매출 현금영수증 무관리 | `transactions.cash_receipt_status/approval_no` + 미발급(pending/failed) 경고 부분 인덱스 | 국세청 의무발행(미발급 가산세 20%) |
| G-19 | — | `sessions.session_type(group/personal)` 확장형 컬럼만(구현 없음) | PT 상품 판매 시 P1 승격 대비 |

### 10.6 운영 자동화

| # | as-is | to-be |
|---|---|---|
| 33 | pg_cron 등록 **0건** (함수만 존재) | cron.schedule 2건을 06_notification.sql에 포함(리마인더 10분 / 만기 일일) |
| 34 | 트리거 EF URL을 request.headers에서 파생(크론에서 불능) | system_config(edge_base_url/edge_service_key) 기반 + 미설정 시 안전 스킵 + notification_logs 기록 |
| 35 | 배지 판정 경로 부재 | 트리거 4종 + fn_evaluate_badges 멱등 판정 + 획득 알림 |

---

## 11. 검증 체크리스트 (스키마 게이트 — 14-agent-workflow 연동)

- [ ] `sql/00~09` 순서 적용이 빈 프로젝트에서 무오류 완주 + **2회차 재실행도 무오류**(멱등)
- [ ] 시드 검증: movement_categories 8 / benchmark_definitions 6 / badge_definitions 12 / admin_roles 4
- [ ] `select cron.job` 2건(bcl-class-reminders, bcl-membership-expiry-reminders)
- [ ] anon 스모크: 화이트리스트(rotation_states·race 4테이블 SELECT, 공개 RPC 5종)만 통과, 그 외 전부 차단
- [ ] RPC 스모크: §7의 48개 함수명 존재 + envelope 3키 형식 + 폐지 함수명 grep 0건
- [ ] 일일 WOD 스모크: fn_record_session_wod_result → fn_get_session_wod_whiteboard가 Rx+→Rx→Scaled 계층 정렬로 반환
- [ ] G-7 스모크: plan_kind=drop_in 멤버십 회원의 fn_kiosk_checkin 성공 / 무멤버십은 no_active_membership
- [ ] G-4 스모크: booking_open_days 밖 예약 booking_not_open, 마감 후 취소 late_cancel+credit_forfeited
- [ ] enum 대조: `gen types` 결과 ↔ §2 표 일치
- [ ] 동시성: fn_book_with_credit 병렬 10요청 시 정원 초과 0건, fn_prepare_race_session 병렬 호출 시 활성 이벤트 1개

---

**문서 버전**: 1.0.0 (재구축 설계 확정본) · **작성**: 2026-07-07 · **다음 문서**: `08-integrations.md`(결제/알림 외부 연동), `15-race-system.md`(Race 정밀 명세)
