# 10. 갭 & 부채 해소 계획 (Gaps and Debt)

> 재구축에서 해소할 항목 **전수**를 우선순위로 정렬한 단일 목록.
> 근거 스냅샷: [`_source/nonfunctional-history.md`](./_source/nonfunctional-history.md), [`_source/screens-inventory.md`](./_source/screens-inventory.md), [`_source/backend-inventory.md`](./_source/backend-inventory.md)
> 표기: ✅ 운영 · 🟡 코드완료(검증 대기) · 🧪 mock/시뮬레이션 · ⏳ 미구현 · 🔄 to-be 변경/통합

## 0. 우선순위 정의

| 등급 | 의미 | 게이트 |
|---|---|---|
| **P1 필수** | 이것을 해소하지 않으면 재구축의 의미가 없음(구조 부채·보안·안정성) 또는 신규 스키마에 반드시 선반영해야 하는 항목 | 해당 Phase 병합 게이트에서 차단 (11번 문서 로드맵) |
| **P2 권장** | 재구축 범위 내 완성 목표. 단 Phase 지연 시 cutover 이후 후속 스프린트로 이월 가능 | Phase 5 종료 전 완료 목표 |
| **P3 후순위** | 재구축 cutover의 전제조건 아님. 신규 스키마/구조가 수용할 수 있게 **설계만 선반영**하고 구현은 후속 | 로드맵 외 백로그 |

---

## 1. P1 필수 — 구조 부채 (신규 스키마·아키텍처에 선반영)

| # | 항목 | as-is 문제 | to-be 해소 방법 | 담당 문서/SQL |
|---|---|---|---|---|
| P1-01 | **권한 소스 이원화** 🔄 | `profiles.role`=실제 RLS vs `admin_roles/admin_user_roles`=UI 전용 미연동. permissions JSONB 2형태 혼재(배열형 vs 불리언맵)→TypeError 실사고 | `admin_user_roles` 단일 소스 승격, permissions JSONB `{group: string[]}` 1형태만, RLS 헬퍼 3종(`is_admin()`/`is_admin_or_coach()`/`fn_my_permissions()`)으로 통일 | [07-data-model.md](./07-data-model.md) §RBAC, [`sql/00_extensions_helpers.sql`](./sql/00_extensions_helpers.sql), [`sql/08_rbac_supplementary.sql`](./sql/08_rbac_supplementary.sql) |
| P1-02 | **인증 장애 패턴** | onAuthStateChange 내 await→락 교착(로그인 5~10s), 서버/클라 쿠키명 불일치→관리자 진입 불가, 앱 전환 세션 끊김 — 반복 실사고 | 세션 상수 1곳(`AUTH_STORAGE_KEY`)+공용 팩토리, 금칙 패턴 명문화, `resolvePostLoginRoute()` 단일 함수, 인증 E2E CI 필수 게이트 | [01-auth.md](./01-auth.md), [contract.md §7](./_source/contract.md), [09-nonfunctional.md](./09-nonfunctional.md) §테스트, [13-repo-structure.md](./13-repo-structure.md) CLAUDE.md 불변규칙 |
| P1-03 | **테이블 네이밍 불일치** 🔄 | 문서·코드에 check_ins/checkins, reservations/bookings, plans/membership_plans 혼용 | 표준 명칭 확정(`checkins`/`bookings`/`membership_plans`) — 신규 DDL·전 문서·전 코드 단일 명칭 | [contract.md §2](./_source/contract.md), [07-data-model.md](./07-data-model.md), `sql/01~03` |
| P1-04 | **레거시 테이블/RPC 잔존** 🔄 | `wods` 테이블, `sessions.wod_description`, 구 코치 RPC 3종(fn_get_coach_dashboard/fn_get_session_attendees/fn_coach_mark_attendance), `member_notes`+`coaching_notes` 중복 | 신규 스키마에서 **미생성**(제거가 아니라 애초에 만들지 않음). WOD=`session_wods` 단일 경로, 노트=`member_notes(author_role)` 통합 1테이블, RPC ~40→30종 재편(`fn_mark_attendance` 단건+일괄 통합 등) | [07-data-model.md](./07-data-model.md) §as-is→to-be 대조표, [`sql/01_core.sql`](./sql/01_core.sql), [`sql/04_wod_runbook.sql`](./sql/04_wod_runbook.sql), [`sql/09_rpc.sql`](./sql/09_rpc.sql) |
| P1-05 | **transactions.id = text** 🔄 | 전 테이블 UUID 원칙에서 유일한 이질 타입 — 조인·FK·타입 안전성 저해 | 신규 스키마 `transactions.id UUID` (order_id UNIQUE는 유지, 이관 시 매핑표) | [07-data-model.md](./07-data-model.md) §finance, [`sql/02_membership_finance.sql`](./sql/02_membership_finance.sql), [11-deployment-cutover.md](./11-deployment-cutover.md) §데이터 이관 |
| P1-06 | **테스트 0 (러너/파일 부재)** | Vitest/Playwright 계획만 존재, CI는 lint/typecheck/build만 | 재구축 초기부터 테스트 러너 동봉: 인증 E2E 스모크 = CI 필수 게이트, 앱별 수용 시나리오 = Phase 완료 기준, RPC 단위 테스트(envelope 계약) | [09-nonfunctional.md](./09-nonfunctional.md) §테스트 전략, [13-repo-structure.md](./13-repo-structure.md) `.claude/skills/verify`, [14-agent-workflow.md](./14-agent-workflow.md) §검증 에이전트 |
| P1-07 | **3중 테마 혼재** 🔄 | admin 다크+수동 유틸 / apps·coach 라이트 `.app-page` 토큰(--app-accent=#D2691E ≠ 문서 #ff6a00) / race 브랜드 컬러. 미정의 토큰·UA 기본스타일 버그의 근원 | `--bcl-*` 단일 토큰 1세트 + `data-theme` 다크/라이트 매핑 + `data-density=admin|mobile|tv` 밀도 프로파일. UA 리셋 필수, 표준 컴포넌트 외 인라인 재구현 금지 | [12-design-system.md](./12-design-system.md), [contract.md §6](./_source/contract.md) |
| P1-08 | **배지 시스템 스키마 부재** ⏳ | `badge_definitions`/`badge_awards`·RPC가 **문서에만 존재**(마이그레이션 0건), UI(/apps/badges, /admin badges)는 실존 — 문서-실체 괴리의 대표 사례 | 정식 스키마 신설 + 판정 트리거(`fn_evaluate_badges`) + `fn_get_my_badges` | [07-data-model.md](./07-data-model.md) §performance, [`sql/07_performance_badges.sql`](./sql/07_performance_badges.sql), [02-admin.md](./02-admin.md)·[03-user-app.md](./03-user-app.md) 배지 화면 |
| P1-09 | **pg_cron 등록 0건** ⏳ | `fn_send_class_reminders` 함수만 정의·미스케줄, `fn_send_membership_expiry_reminders`는 문서만 — 시간기반 알림 전체 미가동 | cron 등록을 **DDL에 포함**(수동 등록 절차 폐지). 리마인더/만기알림 스케줄 명세 | [08-integrations.md](./08-integrations.md) §알림, [`sql/06_notification.sql`](./sql/06_notification.sql) |
| P1-10 | **lockers 삼중 구조** 🔄 | `lockers`+`locker_assignments`+`members.locker_number` 3곳 분산 | `lockers(assigned_member_id/start/end)` 중심 단일화, 나머지 2곳 미생성 | [07-data-model.md](./07-data-model.md), [`sql/08_rbac_supplementary.sql`](./sql/08_rbac_supplementary.sql) |
| P1-11 | **문서-코드 드리프트 구조** | 미문서화 라우트 9개, 스테일 링크(`/admin/insights/coaches`), 미존재 마이그레이션 참조, blueprint 거대 단일문서, 마이그레이션 원격-로컬 불일치 실사고 4건 | docs/=라우트 1:1 매핑 단일 SSOT, 완료이력=git log 대체, 코드 변경 시 갱신 문서 1개 이하, 마이그레이션 규약 스킬화 | [13-repo-structure.md](./13-repo-structure.md), [14-agent-workflow.md](./14-agent-workflow.md) §문서동기화 에이전트 |
| P1-12 | **Admin 화면 이중화** 🔄 | 피드백 2화면, 출석 2화면(insights/attendance+checkins), 거래 2화면, 설정 3분할 등 20+ 화면 | to-be IA 14화면 통폐합(각 앱 문서의 as-is→to-be 대조표) | [contract.md §5](./_source/contract.md), [02-admin.md](./02-admin.md)~[06-kiosk.md](./06-kiosk.md), [00-overview.md](./00-overview.md) IA 다이어그램 |

## 2. P2 권장 — 미구현·미가동 기능 및 수용검증 이관

### 2-1. 미구현/미가동 (재구축 범위 내 완성 목표)

| # | 항목 | 현행 상태 | to-be 해소 방법 | 담당 문서/SQL |
|---|---|---|---|---|
| P2-01 | **Kiosk QR 자동인식** 🧪 | 카메라 디코딩 mock — 수동입력 폴백만 실동작 | jsQR(또는 BarcodeDetector) 통합을 **정식 요구로 승격**. 수동입력은 폴백으로 유지 | [06-kiosk.md](./06-kiosk.md) §scan |
| P2-02 | **Toss 실결제 전환** 🧪 | 스키마 완비, `payment_mode` 기본 simulation | 결제 불변식(클라이언트 금액 불신뢰/Fail-to-NOT-charge/orderId UNIQUE+FOR UPDATE/min(Admin,env) 이중장치) 준수 확인 후 live 전환 — Phase 5 | [08-integrations.md](./08-integrations.md) §결제, [11-deployment-cutover.md](./11-deployment-cutover.md) Phase 5, [`sql/02_membership_finance.sql`](./sql/02_membership_finance.sql) |
| P2-03 | **알림 실가동 QA (구 P14)** 🟡 | pg_cron 미등록(→P1-09), 트리거·Push 실수신 QA 미실시 | 트리거 경로(notifications INSERT→pg_net→EF)·Web Push 실수신·빈자리 상위 3명 알림을 Phase 5 수용 시나리오로 검증 | [08-integrations.md](./08-integrations.md), [`sql/06_notification.sql`](./sql/06_notification.sql), [14-agent-workflow.md](./14-agent-workflow.md) Phase 5 검증 |
| P2-04 | **Race 실장비 수용검증 (구 P21 Phase4, L1~L4)** 🟡 | 시뮬레이터 검증만, 실장비 체크리스트 미실시 | race-acceptance-checklist **L1(시뮬레이터)→L2→L3→L4(실장비 20대)**를 재구축 Phase 4 수용 기준으로 정식 편입. L1=병합 게이트, L2~L4=현장 검증 게이트 | [15-race-system.md](./15-race-system.md) §8 수용 기준, [14-agent-workflow.md](./14-agent-workflow.md) Phase 4 |
| P2-05 | **수동 수용테스트 잔여 (구 P22 Ph5 / P23 Ph4 / P25 §11.8)** 🟡 | 코드완료·수동 시나리오 미실시 상태로 운영 진입 | 각 항목을 해당 앱의 **재구축 수용 시나리오로 이관**하여 Phase 3~4 완료 기준에 편입(별도 문서로 방치하지 않음) | [04-coach-app.md](./04-coach-app.md)·[05-class-portal.md](./05-class-portal.md) 수용 시나리오 절, [14-agent-workflow.md](./14-agent-workflow.md) §검증 에이전트 |
| P2-06 | **인프라 정합** | portal 3001 vs 가이드 8080 포트 불일치, staging 부재, race-service 결합 배포 | 포트 표준 통일, staging 신설, race-service 분리 배포, 시크릿 규약 | [11-deployment-cutover.md](./11-deployment-cutover.md) §인프라 |
| P2-07 | **보안 🟡 잔여** | HTTPS·HSTS(운영 nginx), 백업 복구 리허설 미실시 | cutover 전 완료 필수(릴리즈 게이트에 편입: SRK .next/static 0건, 신규 테이블 RLS, 신규 RPC=SECURITY DEFINER) | [09-nonfunctional.md](./09-nonfunctional.md) §보안, [11-deployment-cutover.md](./11-deployment-cutover.md) §cutover |
| P2-08 | **위젯 시스템 축소** 🔄 | 위젯 4테이블 설계만 존재, localStorage 상태, AI 생성기(Gemini) 설계만 | `widget_settings` 1테이블로 축소, AI 생성기는 P3로 강등 | [07-data-model.md](./07-data-model.md), [`sql/08_rbac_supplementary.sql`](./sql/08_rbac_supplementary.sql), [02-admin.md](./02-admin.md) §dashboard |

### 2-2. Race 모드 확장 (재구축 신규 요구)

| # | 항목 | 상태 | 해소 방법 | 담당 |
|---|---|---|---|---|
| P2-09 | **경기 모드 3종(individual/team/group)** ⏳ | race_format에 group 부재, 모드별 편성/집계/화면 미설계 | `race_events.race_format` 확장(+group_target_m, heat_no), `fn_prepare_race_session(p_race_format)` 파라미터화, 모드별 화면 변형 | [15-race-system.md](./15-race-system.md) §4-b, [`sql/05_race.sql`](./sql/05_race.sql) |
| P2-10 | **2.5D 카트레이싱 연출 + 에셋** ⏳ | 현행 2.5D 뷰는 기본 연출 | 카트게임 문법 재설계 + Claude 제작 SVG/스프라이트 에셋 매니페스트(12번 토큰 일관) | [15-race-system.md](./15-race-system.md) §5-b, [12-design-system.md](./12-design-system.md) |

## 3. P3 후순위 — 설계만 선반영, 구현은 후속 백로그

| # | 항목 | 상태 | 선반영 내용 | 담당 |
|---|---|---|---|---|
| P3-01 | **소셜 로그인(Google/Kakao)** ⏳ | Phase 2 계획만 | `/auth/callback` 라우트·profiles 승인 워크플로우가 OAuth를 수용하도록 설계(스키마 변경 불필요 확인) | [01-auth.md](./01-auth.md) §확장 |
| P3-02 | **카카오/SMS 외부채널 실연동** 🧪 | `send-external-notification` EF mock | EF 인터페이스·notification_rules.channels[] 계약은 확정, 사업자 계약 후 키만 주입 | [08-integrations.md](./08-integrations.md) §외부채널 |
| P3-03 | **Timer 원격제어** ⏳ | /class/timer 4모드 로컬 조작만 | screen-console 통합 시 Realtime 리모컨 채널 설계 선반영(rotation-hud 패턴 재사용) | [05-class-portal.md](./05-class-portal.md) §screen-console |
| P3-04 | **Personal Recording Mode** ⏳ | pm5_devices.current_mode enum에 값만 존재 | QR 바인딩 플로우 설계 명세(모드락과 충돌 없음 확인), 구현은 후속 Phase | [15-race-system.md](./15-race-system.md) §7 로드맵 |
| P3-05 | **Race 다중시설 스코핑** | 단일시설 전제 하드코딩 | race 테이블 facility_id 컬럼은 스키마에 선반영, 스코핑 로직은 후속 | [15-race-system.md](./15-race-system.md) §7, [`sql/05_race.sql`](./sql/05_race.sql) |
| P3-06 | **AI 위젯 생성기** ⏳ | 설계만(Gemini) | 부록 처리 — widget_settings 스키마가 수용 가능함만 확인 | [02-admin.md](./02-admin.md) 부록 |
| P3-07 | **보안 ⏳ 계획군** | MFA, CSP(Report-Only), CSRF 토큰, rate limit, Fail2ban, Dependabot, 개인정보 파기 절차 | 로드맵·적용 순서만 명세(재구축 아키텍처가 차단하지 않음 확인) | [09-nonfunctional.md](./09-nonfunctional.md) §보안 로드맵 |

## 4. 커버리지 대조 (전수 확인)

- **미구현/mock 6종** (plan 확정 목록): 배지 스키마(P1-08) · pg_cron(P1-09) · 카카오/SMS(P3-02) · Kiosk QR(P2-01) · 소셜로그인(P3-01) · Timer 원격(P3-03) + Personal Recording(P3-04), Toss simulation(P2-02) — **전부 등재**
- **수동 수용테스트 잔여**: P14 알림 QA(P2-03) · P21 L1~L4(P2-04) · P22 Ph5/P23 Ph4/P25 §11.8(P2-05) — **재구축 수용 기준으로 전량 이관**
- **구조 부채**: 권한 이원화(P1-01) · 네이밍(P1-03) · 레거시 wods/RPC/노트 중복(P1-04) · transactions.id(P1-05) · 테스트 0(P1-06) · 3중 테마(P1-07) · 인증 장애 패턴(P1-02) · lockers 삼중(P1-10) · 문서 드리프트(P1-11) · 화면 이중화(P1-12) · 위젯 4테이블(P2-08) — **전부 등재**

> 이 문서의 P1 전 항목은 [14-agent-workflow.md](./14-agent-workflow.md)의 병합 게이트 체크리스트에 그대로 인용된다. 신규 항목 발견 시 이 표에 먼저 추가한 뒤 담당 문서를 갱신한다(1문서 갱신 원칙).
