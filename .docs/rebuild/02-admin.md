# 02. Admin 앱 설계서 (to-be)

> **적용 계약**: `_source/contract.md` — §2 표준 테이블 명칭 · §3 권한 모델 · §4 표준 RPC(30종) · §5 to-be IA를 그대로 따른다.
> **as-is 근거**: `_source/screens-inventory.md` §1(Admin 5그룹), `_source/backend-inventory.md`.
> 상태 표기: ✅ 운영 중 · 🟡 코드완료(검증 대기) · 🧪 mock/시뮬레이션 · ⏳ 미구현(신규 설계) · 🔄 to-be에서 변경/통합

---

## 0. 개요

| 항목 | 내용 |
|---|---|
| 대상 | 시설 운영자(admin). 데스크탑 고밀도 운영도구 |
| URL Prefix | `/admin/*` |
| 진입 가드 | `profiles.role='admin'` + `approval_status='approved'`. 세부 화면 접근은 `admin_user_roles` → `admin_roles.permissions` 그룹 기준 |
| 밀도 프로파일 | `data-density="admin"` (12-design-system), 다크 기본 테마 |
| 규모 | as-is **23화면**(5그룹) → to-be **14화면**(단층 사이드바 + 화면 내 탭) |

**설계 원칙**
1. **1도메인 = 1화면**: 같은 데이터를 다루는 "관리 화면"과 "리포트 화면"을 분리하지 않는다. 리포트는 해당 화면의 탭이다.
2. **목록→상세→행동**: 별도 관리 화면으로 빠지지 않고 상세(패널/모달) 안에서 행동을 완결한다. (회원 상세 안 멤버십 관리, 캘린더 세션 클릭 안 예약 관리)
3. **탭 = URL 쿼리**: 탭 상태는 `?tab=` 쿼리로 표현해 딥링크·위젯 점프를 보장한다.
4. **파괴적 행동 확인 단계 필수**: 삭제/환불/취소/양도/블랙리스트 등은 화면별 규칙(각 명세의 "파괴적 행동" 항목)을 따르며 전부 `audit_logs`에 기록한다.
5. **RPC 우선**: 다단계 정합성이 필요한 쓰기는 계약 §4의 표준 RPC만 사용(클라이언트 식별자 전달 금지, envelope `{success, data, error}`).

---

## 1. as-is → to-be 메뉴 대조표 (23 → 14)

### 1.1 통폐합 7축 + 정식 편입/제거

| # | 통합축 | as-is (라우트) | to-be | 근거 |
|---|---|---|---|---|
| 1 | **피드백 이중화 해소** | `/admin/insights/feedback`(평점 분석) + `/admin/crm/feedback`(응대·답변) | `/admin/feedback` — 분석 탭 + 응대 탭 | 동일 `session_feedback` 데이터를 두 화면이 절반씩 표시. "저평점 발견→답변" 흐름이 화면 이동을 강요했음 → 한 화면에서 발견·응대 완결 |
| 2 | **출석 이중화 해소** | `/admin/insights/attendance`(Heatmap 리포트) + `/admin/checkins`(실시간 로그) | `/admin/attendance` — 실시간 로그 탭 + 리포트 탭 | 로그(사실)와 리포트(집계)는 같은 `checkins` 도메인의 시점 차이일 뿐. 수동 출석 처리도 이 화면으로 단일화 |
| 3 | **회원 축 통합** | `/admin/members`(+`/[id]`) + `/admin/memberships` | `/admin/members` — 목록 1화면, **멤버십 관리는 회원 상세 내 탭** | 멤버십은 항상 "특정 회원의" 멤버십. 회원 검색→멤버십 화면 재검색의 이중 탐색 제거. 전체 멤버십 현황은 목록의 필터 뷰로 흡수 |
| 4 | **수업 축 통합** | `/admin/operations/schedule`(캘린더) + `/admin/operations/reservations`(예약 명단) | `/admin/schedule` — 캘린더에서 **세션 클릭 → 예약·대기·출결 통합 패널** | 예약 명단은 항상 "특정 세션의" 명단. 세션 컨텍스트 없는 예약 목록 화면은 탐색 비용만 유발 |
| 5 | **WOD 스튜디오** | `/admin/operations/wod-templates` + `/admin/operations/movement-library` | `/admin/wod-studio` — 템플릿 탭 + 라이브러리 탭 | 동일 도메인(템플릿이 라이브러리 동작을 참조). 동작 추가→템플릿 반영 흐름을 탭 전환으로 단축 |
| 6 | **설정 통합** | `/admin/setup/branch` + `/admin/setup/system` + `/admin/setup/settings` + `/admin/setup/audit` + `/admin/operations/roles` + `/admin/operations/infrastructure` | `/admin/settings` — 지점/시스템/사이트/권한/감사 5탭 | 설정 3분할은 저빈도 화면의 메뉴 낭비. `roles`는 성격상 "운영"이 아닌 "설정"(권한 탭). `infrastructure`(고정 QR·키오스크 기기)는 시스템 탭에 흡수. `audit`은 설정 하위 탭 |
| 7 | **매출 축 통합** | `/admin/transactions`(거래·환불) + `/admin/insights/finance`(매출 리포트) | `/admin/payments` — 거래 탭 + 리포트 탭 | 동일 `transactions` 도메인. "이상 거래 발견→환불 처리" 와 "월 매출 확인"이 한 화면에서 |
| + | **badges 정식 편입** | `/admin/operations/badges` (실존·**미문서화**, 스키마 마이그레이션 부재) | `/admin/badges` — 정식 1급 메뉴 + 정식 스키마(⏳ §3.11) | as-is는 UI만 존재하고 `badge_definitions`/`badge_awards` 테이블·RPC 실체가 없던 유령 화면 → to-be에서 스키마·판정 트리거 포함 정식 설계 |
| − | **스테일 링크 제거** | `/admin/insights/coaches` (문서·위젯 링크만 존재, 라우트 없음) | 제거 — 코치 성과는 `/admin/coaches` 성과 탭 | 문서-코드 드리프트 해소. 대시보드 위젯의 해당 링크도 `/admin/coaches?tab=performance`로 교체 |

### 1.2 전수 대조표 (as-is 23 → to-be 14)

| as-is 라우트 | as-is 상태 | → to-be 화면 (탭) |
|---|---|---|
| `/admin` (인덱스 리다이렉트) | ✅ | `/admin` → `/admin/dashboard` 리다이렉트 유지 |
| `/admin/dashboard` | ✅ | `/admin/dashboard` |
| `/admin/members` | ✅ | `/admin/members` |
| `/admin/members/[id]` | ✅ | `/admin/members/[id]` (멤버십 탭 신설 🔄) |
| `/admin/memberships` | ✅ | 🔄 `/admin/members/[id]?tab=membership` 으로 흡수 (전체 현황은 목록 필터 뷰) |
| `/admin/checkins` | ✅ | 🔄 `/admin/attendance?tab=live` |
| `/admin/insights/attendance` | ✅ | 🔄 `/admin/attendance?tab=report` |
| `/admin/transactions` | ✅ | 🔄 `/admin/payments?tab=transactions` |
| `/admin/insights/finance` | ✅ | 🔄 `/admin/payments?tab=report` |
| `/admin/plans` | ✅ | `/admin/plans` |
| `/admin/operations/schedule` | ✅ | 🔄 `/admin/schedule` (세션 패널에 예약 관리 내장) |
| `/admin/operations/reservations` | ✅ | 🔄 `/admin/schedule` 세션 통합 패널로 흡수 |
| `/admin/operations/coaches` | ✅ | `/admin/coaches` (관리+성과 2탭 승계) |
| `/admin/insights/coaches` | ❌ 스테일 링크 | **제거** → `/admin/coaches?tab=performance` |
| `/admin/operations/wod-templates` | ✅ | 🔄 `/admin/wod-studio?tab=templates` |
| `/admin/operations/movement-library` | ✅ | 🔄 `/admin/wod-studio?tab=library` |
| `/admin/operations/race` | ✅ | `/admin/race` |
| `/admin/operations/lockers` | ✅ | `/admin/lockers` (lockers 단일 테이블化 🔄) |
| `/admin/operations/badges` | 🟡 미문서화·스키마 부재 | 🔄 `/admin/badges` 정식 편입 (스키마 ⏳) |
| `/admin/operations/roles` | ✅ | 🔄 `/admin/settings?tab=roles` |
| `/admin/operations/infrastructure` | ✅ | 🔄 `/admin/settings?tab=system` (QR·키오스크 섹션) |
| `/admin/crm/content` | ✅ | 🔄 `/admin/crm?tab=content` |
| `/admin/crm/notifications` | ✅ | 🔄 `/admin/crm?tab=notifications` |
| `/admin/crm/support` | ✅ | 🔄 `/admin/crm?tab=support` |
| `/admin/crm/feedback` | ✅ | 🔄 `/admin/feedback?tab=inbox` |
| `/admin/insights/feedback` | ✅ | 🔄 `/admin/feedback?tab=analytics` |
| `/admin/setup/branch` | ✅ | 🔄 `/admin/settings?tab=branch` |
| `/admin/setup/system` | ✅ | 🔄 `/admin/settings?tab=system` |
| `/admin/setup/settings` | ✅ | 🔄 `/admin/settings?tab=site` |
| `/admin/setup/audit` | ✅ | 🔄 `/admin/settings?tab=audit` |

---

## 2. 사이드바 구조 · 라우트 경로표

### 2.1 to-be 사이드바 (그룹 헤더 + 14 메뉴, 계층 1단)

```
BCL Admin
├─ 대시보드          /admin/dashboard
│
├─ [운영]
│   ├─ 회원          /admin/members        (상세: /admin/members/[id])
│   ├─ 출석          /admin/attendance     (탭: live | report)
│   ├─ 스케줄        /admin/schedule       (뷰: week | day, 세션 패널)
│   └─ 코치          /admin/coaches        (탭: manage | performance)
│
├─ [매출]
│   ├─ 결제          /admin/payments       (탭: transactions | report)
│   └─ 요금제        /admin/plans
│
├─ [프로그램]
│   ├─ WOD 스튜디오  /admin/wod-studio     (탭: templates | library)
│   ├─ Race          /admin/race           (탭: events | devices | records)
│   └─ 배지          /admin/badges         (탭: definitions | awards)
│
├─ [고객]
│   ├─ 피드백        /admin/feedback       (탭: analytics | inbox)
│   └─ CRM           /admin/crm            (탭: content | notifications | support)
│
├─ [시설]
│   └─ 락커          /admin/lockers
│
└─ 설정              /admin/settings       (탭: branch | system | site | roles | audit)
```

- 사이드바 항목은 `fn_my_permissions()` 결과에 해당 권한 그룹 `view`가 없으면 **렌더링하지 않는다**(비활성 아님, 미노출).
- 그룹 헤더는 시각 구분용이며 URL 세그먼트를 만들지 않는다 — as-is의 `insights/operations/crm/setup` 중간 세그먼트 폐지(라우트 평탄화).
- 탭 딥링크: 모든 탭 화면은 `?tab=` 쿼리를 SSOT로 사용하며 위젯·알림·타 화면 점프가 이 쿼리를 사용한다.

### 2.2 라우트 경로표 (`/admin/*` to-be 전수)

| 경로 | 화면 | 권한 그룹 | 승계 원본 |
|---|---|---|---|
| `/admin` | → `/admin/dashboard` 리다이렉트 | — | `/admin` |
| `/admin/dashboard` | 대시보드 | `dashboard` | dashboard |
| `/admin/members` | 회원 목록 | `members` | members |
| `/admin/members/[id]` | 회원 상세(멤버십 통합) | `members` | members/[id] + memberships |
| `/admin/attendance` | 출석 (로그+리포트) | `attendance` | checkins + insights/attendance |
| `/admin/payments` | 결제 (거래+리포트) | `payments` | transactions + insights/finance |
| `/admin/plans` | 요금제 | `plans` | plans |
| `/admin/schedule` | 스케줄 (세션 통합 패널) | `schedule` | operations/schedule + operations/reservations |
| `/admin/coaches` | 코치 (관리+성과) | `coaches` | operations/coaches (+insights/coaches 스테일 대체) |
| `/admin/wod-studio` | WOD 스튜디오 | `wod` | operations/wod-templates + movement-library |
| `/admin/race` | Race 운영 | `race` | operations/race |
| `/admin/lockers` | 락커 | `lockers` | operations/lockers |
| `/admin/badges` | 배지 | `badges` | operations/badges (정식 편입) |
| `/admin/feedback` | 피드백 (분석+응대) | `feedback` | insights/feedback + crm/feedback |
| `/admin/crm` | CRM (공지·배너+알림+지원) | `crm` | crm/content + crm/notifications + crm/support |
| `/admin/settings` | 설정 (5탭) | `settings` (감사 탭은 `audit`) | setup/* 4종 + operations/roles + operations/infrastructure |

---

## 3. to-be 14화면 상세 명세

공통 규칙(전 화면 적용, 개별 명세에서 반복하지 않음):
- **권한**: 진입=해당 그룹 `view`. 생성/수정=`edit`(또는 `create`), 삭제·환불승인 등 파괴적 행동=`delete`/`approve`. super_admin(`{"*":["all"]}`)은 전부 통과.
- **감사**: `edit` 이상 모든 쓰기는 `audit_logs`(actor, action, target, old/new_values) 기록.
- **UI**: EmptyState 필수, Skeleton 권장, 목록은 서버 페이지네이션, 검색 300ms 디바운스.

### 3.1 `/admin/dashboard` — 대시보드

| 항목 | 내용 |
|---|---|
| 목적 | 시설 운영 상태를 한 화면에서 파악하고, 위젯 클릭으로 상세 화면·모달로 점프하는 운영 홈 |
| 탭 | 없음 (위젯 그리드 단일 뷰 + 편집 모드 토글) |
| 권한 | `dashboard: view` (위젯 개별 데이터는 각 그룹 `view` 보유 시에만 로드 — 미보유 위젯은 자동 숨김) |

**핵심 기능**
- KPI 스트립: 오늘 체크인 수 / 활성 회원 수 / 이번 달 매출 / 만기 임박(D-7) 멤버십 — `fn_get_dashboard_kpis`
- 주간 추이 차트(체크인·매출), 긴급 위젯(미처리 환불, 대기열 초과 세션, 미답변 저평점 피드백, 키오스크 오프라인)
- 위젯 그리드: 8종 위젯 배치/숨김/순서 변경(§4 위젯 시스템), 편집 모드에서 DnD
- Quick Actions: 회원 등록 / 세션 생성 / 공지 작성 / 수동 결제 등록 — 각 화면의 생성 모달을 직접 오픈
- 위젯 클릭 → 요약 모달(§4) 또는 해당 화면 딥링크(`?tab=` 포함)

**데이터 소스**: `fn_get_dashboard_kpis`, `fn_get_revenue_stats`, `fn_get_coach_performance_stats`, `widget_settings`(위젯 배치), 각 위젯별 도메인 테이블(§4 표 참조)

**파괴적 행동**: 없음 (읽기 전용 + 위젯 배치 저장뿐. 배치 초기화는 confirm 1단계)

**현재 상태**: ✅ 화면·KPI 승계 / 🔄 위젯 상태 localStorage → `widget_settings` DB 이관 / ⏳ AI 위젯 생성기(부록 §5, 후순위) / ❌ `insights/coaches` 위젯 링크 제거

---

### 3.2 `/admin/members` (+`/[id]`) — 회원 (상세 내 멤버십 통합)

| 항목 | 내용 |
|---|---|
| 목적 | 회원 탐색·등록·상태 관리와, **회원 상세 안에서 멤버십 전 라이프사이클을 완결** (별도 memberships 화면 폐지) |
| 탭 | 목록: 없음(필터 뷰 — 전체/활성/만기임박/홀딩중/블랙리스트). 상세: `overview` \| `membership` \| `activity` \| `notes` \| `performance` |
| 권한 | `members: view/create/edit/delete` (블랙리스트·양도·취소는 `delete` 수준) |

**핵심 기능 — 목록**
- 통합검색(이름/전화/이메일), 상태·멤버십 상태 필터 (as-is memberships 화면의 "홀딩중/만기임박 전체 현황" 요구를 필터 뷰로 흡수)
- 회원 등록(계정 미연결 회원 허용 — `members.user_id` nullable), CSV 내보내기
- 행 클릭 → 상세. 가입 승인 대기(`profiles.approval_status='pending'`) 배지 노출 및 승인/거부 처리

**핵심 기능 — 상세 `overview` 탭**
- 프로필(연락처/비상연락/생일/선호), 현재 멤버십 요약 카드(잔여 크레딧·D-Day), 경고 플래그(`member_alert_flags`) 표시·설정, 블랙리스트 토글

**핵심 기능 — 상세 `membership` 탭 (🔄 통합 UX 핵심)**
한 탭 안에서 멤버십 전 수명주기를 처리한다. 상단=현재 멤버십 카드(들), 하단=이력 타임라인.
- **생성**: 요금제 선택(`membership_plans`) → 시작일 → 결제 연결(현장결제 시 수동 `transactions` 생성 링크) — 미리보기(종료일·크레딧 자동 계산) 후 확정
- **연장**: 기간 연장(일수) 또는 크레딧권 재충전 — 사유 필수
- **홀딩/재개**: `max_pauses` 잔여 검증, 홀딩 기간만큼 종료일 자동 이월, 재개 시 이월 반영 미리보기
- **크레딧 조정**: ± 조정 + 사유 필수 (음수 잔여 불가 검증)
- **양도**: 대상 회원 검색 → 잔여기간/크레딧 이관 미리보기 → 확인 단계
- **취소(중도해지)**: 요금제 `refund_policy` 기반 환급액 서버 계산 표시 → `/admin/payments` 환불 워크플로우로 연결
- **이력**: `membership_history` 타임라인(action_type/old·new_values/changed_by) — 모든 위 행동이 자동 적재

**핵심 기능 — 상세 `activity` / `notes` / `performance` 탭**
- `activity`: 예약·출석 이력(`bookings`+`checkins`), 결제 이력(`transactions` 요약, 결제 화면 딥링크)
- `notes`: 상담/코칭 노트 통합 타임라인 — `member_notes`(author_role로 admin/coach 구분, note_type: general/injury/progress/caution/counseling) 🔄(coaching_notes 통합)
- `performance`: 벤치마크·PR 요약(`fn_get_member_performance_profile`), 보유 배지(`badge_awards` ⏳)

**데이터 소스**: `members`, `profiles`(승인), `memberships`, `membership_plans`, `membership_history`, `member_notes`🔄, `member_alert_flags`, `bookings`, `checkins`, `transactions`, `badge_awards`⏳ / RPC: `fn_get_member_context_panel`, `fn_get_member_performance_profile`, `fn_upsert_member_alert_flag`, `promote_to_coach`

**파괴적 행동 확인 규칙**
- 블랙리스트 지정: 사유 입력 필수 + confirm — 즉시 예약 차단됨을 명시
- 멤버십 취소: 2단계(환급액 서버 계산 표시 → "취소" 타이핑 확인), 환불 실행은 payments 승인 절차로만
- 양도: 이관 내역 미리보기 + 양측 회원명 표시 confirm, 되돌리기 불가 명시
- 회원 삭제: 금지(soft delete/비활성만). 거래·출석 이력 보존

**현재 상태**: ✅ 목록·상세·memberships 기능 전부 as-is 운영 승계 / 🔄 화면 통합·member_notes 단일화가 재구축 신규 / ⏳ performance 탭의 배지 표시(배지 스키마 신설 후)

---

### 3.3 `/admin/attendance` — 출석 (실시간 로그 + 리포트)

| 항목 | 내용 |
|---|---|
| 목적 | 체크인 사실 확인·수동 처리(로그)와 출석 패턴 분석(리포트)을 한 화면에서 |
| 탭 | `live`(실시간 로그) \| `report`(리포트) |
| 권한 | `attendance: view/edit` (수동 출석·출결 정정=edit) |

**핵심 기능 — `live` 탭**
- 실시간 체크인 스트림(Supabase Realtime — `checkins` INSERT 구독), 회원/세션/방법(QR·키오스크·수동) 표시
- 수동 체크인 처리(회원 검색 → 세션 선택), 오늘 세션별 출결 현황 요약(정원 대비)
- 출결 판정 정정: `fn_mark_attendance(p_session_id, p_items[])` — checked_in/no_show/late_cancel/coach_excused/walk_in (사실 `checkins` vs 판정 `bookings.attendance_outcome` 분리 원칙 유지)

**핵심 기능 — `report` 탭**
- 요일×시간 Heatmap, 기간 필터, 세션 유형·코치별 출석률, 노쇼율 추이
- 회원별 출석 순위/장기 미출석 리스트(재방문 유도 → CRM 알림 작성 딥링크)
- CSV/Excel 내보내기

**데이터 소스**: `checkins`, `bookings`(attendance_outcome), `sessions`, `members` / RPC: `fn_mark_attendance`🔄(단건+일괄 통합형)

**파괴적 행동**: 출결 판정 변경 시 confirm(정산 Basis에 영향 명시) + 사유, `audit_logs` 기록. 체크인 레코드 삭제 금지(정정은 판정 변경으로만)

**현재 상태**: ✅ checkins 로그·insights 리포트 승계 / 🔄 화면 통합 + `fn_mark_attendance` 통합 RPC 전환(기존 mark/bulk_mark 폐지)

---

### 3.4 `/admin/payments` — 결제 (거래 + 리포트)

| 항목 | 내용 |
|---|---|
| 목적 | PG 거래 관제·환불 워크플로우·월 정산과 매출 분석을 한 화면에서 |
| 탭 | `transactions`(거래·환불) \| `report`(매출 리포트) |
| 권한 | `payments: view/edit/approve` (환불 승인·정산 확정=approve) |

**핵심 기능 — `transactions` 탭**
- 거래 목록: 기간/상태(toss_status)/수단/source(online·pos·manual) 필터, order_id 검색, 원본 payload(toss_raw_data) 열람
- 수동 결제 등록(현장 POS/이체 — source=manual)
- **환불 워크플로우**(결제 불변식 준수): 요청 접수 → 위약금·환급액 **서버 계산** 표시 → 관리자 승인(2단계) → PG 취소 실행(`refunds` 상태: pending→approved→completed/rejected) → audit 기록
- 시뮬레이션 거래 구분 배지(`pg_settings.payment_mode`), live 미가동 상태 명시

**핵심 기능 — `report` 탭**
- 월/기간 매출(`fn_get_revenue_stats`), 요금제별 매출 구성, 결제수단 통계, 환불율
- 코치 월 정산 섹션: `fn_calculate_monthly_settlement` 실행(관리자 전용, Coach는 read-only 원칙) → `coach_settlements` 상태 관리(pending→confirmed→paid) — 상세 근거는 `/admin/coaches?tab=performance`와 상호 딥링크

**데이터 소스**: `transactions`🔄(id UUID), `refunds`, `pg_settings`, `coach_settlements`, `membership_plans` / RPC: `fn_get_revenue_stats`, `fn_calculate_monthly_settlement`

**파괴적 행동 확인 규칙**
- 환불: **2단계 승인**(계산 결과 확인 → 금액 재표시 + "환불" 타이핑) — 클라이언트 금액 전달 금지, 서버가 DB 기준 재계산 (Fail-to-NOT-charge)
- 정산 확정(confirmed→paid): confirm + 되돌리기 불가 명시
- 거래 삭제 금지 — 취소는 PG 취소 플로우로만

**현재 상태**: ✅ 거래·환불·정산 승계 / 🧪 Toss 실결제(payment_mode 기본 simulation — live 전환은 settings 시스템 탭 이중장치) / 🔄 transactions.id text→UUID, 화면 통합

---

### 3.5 `/admin/plans` — 요금제

| 항목 | 내용 |
|---|---|
| 목적 | 판매 상품(기간제/횟수권) 설계와 정책(환급/홀딩/지점공유) 관리 |
| 탭 | 없음 (목록 + 편집 패널) |
| 권한 | `plans: view/edit/delete` |

**핵심 기능**
- 요금제 CRUD: type(기간제/횟수권), price, duration_days, credit_count, 판매 상태(활성/숨김)
- 정책 편집: `refund_policy`(JSONB — 경과 기간별 환급률), `max_pauses`(홀딩 허용 횟수), `facility_sharing`
- 활성 구독 수 표시(요금제별 `memberships` count), 가격 변경 시 기존 멤버십 불변 명시(스냅샷 원칙)
- User 앱 `purchase` 노출 순서/추천 배지 설정

**데이터 소스**: `membership_plans`, `memberships`(참조 count)

**파괴적 행동**: 활성 구독이 있는 요금제 삭제 **차단**(숨김만 허용). 가격/정책 변경 confirm(신규 판매분부터 적용 명시)

**현재 상태**: ✅ as-is 승계 (`plans`→`membership_plans` 표준 명칭 전환만)

---

### 3.6 `/admin/schedule` — 스케줄 (세션 클릭 = 예약·대기·출결 통합 패널)

| 항목 | 내용 |
|---|---|
| 목적 | 주간 캘린더에서 세션 생성·배치와, **세션 클릭 한 번으로 예약/대기/출결/WOD까지 운영 완결** (reservations 화면 폐지) |
| 탭 | 뷰 전환: `week` \| `day` (탭 아님, 캘린더 뷰 토글) + 세션 사이드 패널 내 서브탭: `roster` \| `waitlist` \| `wod` |
| 권한 | `schedule: view/create/edit/delete` |

**핵심 기능 — 캘린더**
- 주간 그리드 DnD: 세션 생성/이동/복제(주 단위 반복 생성), 정원·시간 편집
- 다중 코치 배정(`session_coaches` — lead/assistant, display_order), 코치별 색상 필터
- 세션 상태(scheduled/cancelled/completed) 및 정원 게이지(확정/대기 수) 셀 표시

**핵심 기능 — 세션 통합 패널 (🔄 핵심, 세션 클릭 시 우측 슬라이드)**
- 헤더: 세션 정보 요약 + 상태 변경 + 세션 취소
- `roster` 서브탭: 확정 예약 명단(`bookings.status=confirmed`), 관리자 대리 예약(회원 검색 → `fn_book_with_credit`), 대리 취소(`fn_cancel_booking_with_credit` — 크레딧 복구 규칙 서버 판정), 출결 판정 일괄/개별(`fn_mark_attendance`), walk_in 추가
- `waitlist` 서브탭: 대기열 순번(`waitlisted`), 우선순위 수동 조정, 수동 승격(빈자리 발생 시 자동 승격 트리거 `fn_notify_waitlist_on_vacancy`와 병행), 노쇼 통제 정책 표시
- `wod` 서브탭: 세션 WOD 조회(`fn_get_session_wod`)·배정(`fn_upsert_session_wod` — wod-studio 템플릿 검색 연결)·게시(`fn_publish_session_wod`). ※ `sessions.wod_description` 컬럼 폐지 — `session_wods` 스냅샷만 사용

**데이터 소스**: `sessions`🔄(wod_description 제거), `session_coaches`, `bookings`, `checkins`, `session_wods`, `coaches`, `members` / RPC: `fn_book_with_credit`, `fn_cancel_booking_with_credit`, `fn_mark_attendance`, `fn_get_session_wod`, `fn_upsert_session_wod`, `fn_publish_session_wod`

**파괴적 행동 확인 규칙**
- 세션 삭제: 예약자 존재 시 **차단** → "취소" 전환만 허용(사유 입력 → 예약자 전원 크레딧 복구 + 알림 발송 미리보기 confirm)
- 세션 시간 이동(예약자 존재): 영향 인원 수 표시 + 알림 발송 여부 선택 confirm
- 대리 취소: 크레딧 복구/차감 결과 미리보기 confirm

**현재 상태**: ✅ 캘린더 DnD·예약 관리 기능 승계 / 🔄 두 화면 통합 + 세션 패널 신규 UX + wod_description 폐지

---

### 3.7 `/admin/coaches` — 코치 (관리 + 성과)

| 항목 | 내용 |
|---|---|
| 목적 | 코치 등록·계정 연결·급여 설정(관리)과 KPI·정산 근거(성과)를 한 화면에서 |
| 탭 | `manage`(코치 관리) \| `performance`(성과 분석) |
| 권한 | `coaches: view/edit/approve` (계정 연결·급여 변경=approve 수준) |

**핵심 기능 — `manage` 탭**
- 코치 등록 2-Step(프로필 → 계정 연결), 계정 연결/해제: `promote_to_coach`/`demote_from_coach` (coaches.user_id nullable — 미연결 코치 허용)
- 코치 상태머신 관리: unlinked → linked_unassigned → linked_active, on_leave 전환
- 급여 설정: base_salary, session_allowance (변경 이력 audit)
- 전문분야/소개 편집(User 앱 `coaches` 화면 노출 내용)

**핵심 기능 — `performance` 탭** (스테일 `/admin/insights/coaches`의 정식 대체)
- 코치별 KPI: 담당 세션 수/출석률/평점/리텐션 — `fn_get_coach_performance_stats`
- 월별 상세: `fn_get_coach_monthly_report(p_year_month, p_sections[])`🔄(basis+kpis+retention 통합 RPC) — 정산 Basis(코치 앱과 **동일 수치** 원칙: 예상정산 = base + payable×allowance)
- 정산 실행 링크 → `/admin/payments?tab=report` (Admin=정산 실행, Coach=read-only 원칙)

**데이터 소스**: `coaches`, `profiles`, `session_coaches`, `sessions`, `session_feedback`※, `coach_settlements` / RPC: `promote_to_coach`, `demote_from_coach`, `fn_get_coach_performance_stats`, `fn_get_coach_monthly_report`🔄

**파괴적 행동**: 계정 연결 해제(demote): 진행 중 세션 배정 존재 시 경고 + confirm. 급여 변경: 적용 시작 월 명시 confirm. 코치 삭제 금지(상태 전환만)

**현재 상태**: ✅ 2탭 구조 as-is 승계 / 🔄 정산 RPC 3종 → `fn_get_coach_monthly_report` 1종 통합

---

### 3.8 `/admin/wod-studio` — WOD 스튜디오 (템플릿 + 라이브러리 2탭)

| 항목 | 내용 |
|---|---|
| 목적 | WOD 템플릿 설계·게시와 동작(movement) 마스터 데이터 관리를 단일 스튜디오에서 |
| 탭 | `templates`(WOD 템플릿) \| `library`(동작 라이브러리) |
| 권한 | `wod: view/edit/delete` |

**핵심 기능 — `templates` 탭**
- 템플릿 목록: 스코프 필터(Benchmark / Facility / Shared — `facility_id NULL`=글로벌, `is_shared`, `is_benchmark`), kind(daily/benchmark/skill/strength/conditioning)·format(for_time/amrap/emom/tabata/chipper/strength/custom/station_circuit) 필터 — `fn_list_wod_templates`
- 편집 패널: 메타(time_cap/rounds) + 동작 구성(`wod_template_movements` — sort_order, movement 참조 또는 custom_label, target value/unit, RX 중량 남/여) — `fn_get_wod_template` → `fn_upsert_wod_template`
- 동작 검색 위젯: `fn_search_wod_movements` (library 탭과 동일 소스 — 탭 전환 없이 인라인 검색)
- draft → publish 워크플로우: `fn_publish_wod_template` (게시본만 세션 배정 가능)
- 세션 배정 현황(이 템플릿을 쓰는 예정 세션 목록) 표시

**핵심 기능 — `library` 탭**
- 마스터-디테일: 카테고리(`movement_categories` — 동적, color/sort_order 관리) × 동작 목록 — `fn_list_movement_library`
- 동작 CRUD: slug UNIQUE, name_ko/en, equipment[], difficulty 1-5, thumbnail/video_url 업로드
- 템플릿 참조 수 표시(참조 중 동작의 의미 변경 경고)

**데이터 소스**: `wod_templates`, `wod_template_movements`, `movement_library`, `movement_categories`, `session_wods`(참조 현황) / RPC: `fn_list_wod_templates`, `fn_get_wod_template`, `fn_upsert_wod_template`, `fn_publish_wod_template`, `fn_search_wod_movements`, `fn_list_movement_library` ※ 레거시 `wods` 테이블 폐지 — 마이그레이션 대상 없음

**파괴적 행동**: 게시된 템플릿 삭제 → **archive만 허용**(세션 스냅샷 `movements_snapshot`은 동결이므로 과거 세션 무영향 명시). 템플릿 참조가 있는 동작 삭제 차단(비활성만). 카테고리 삭제는 소속 동작 0일 때만

**현재 상태**: ✅ 두 화면 기능 as-is 운영 승계 / 🔄 1화면 2탭 통합

---

### 3.9 `/admin/race` — Race 운영

| 항목 | 내용 |
|---|---|
| 목적 | Race 이벤트 생성·기기 관리·기록 통계 (역할 3분할 중 **Admin=기기 관리** 담당. BLE 제어=Python, 진행·렌더=Coach/Class) |
| 탭 | `events`(이벤트) \| `devices`(PM5 기기) \| `records`(기록 통계) |
| 권한 | `race: view/edit/delete` |

**핵심 기능**
- `events`: 이벤트 CRUD — event_type(rowing/bike/skierg/run/other), `race_format`🔄(individual/team/group/relay + group_target_m, heat_no), 세션 연결(`fn_prepare_race_session(p_session_id, p_race_format)` — 세션당 활성 이벤트 1개 보장), lobby_status 모니터(setup→lobby→countdown→racing→finished, 제어는 Coach Control 소관), 팀 편성 현황(`race_teams`) 열람
- `devices`: PM5 등록/관리 — **시리얼 넘버=주 식별자**(iOS MAC 숨김 대응), device_type, status(online/offline/maintenance), current_mode(idle/racing/personal_recording) 모니터, Python 브릿지 연결 상태(REST `/api/ble/status`) 표시
- `records`: 이벤트별 결과(`race_records` — finish_rank/watts/spm/hr/is_pr), 회원 벤치마크 연동 현황, JSONL 적재 상태(`race_recordings` — 30일 보존), 통계(참가율/PR 발생률)

**데이터 소스**: `race_events`🔄, `race_records`, `pm5_devices`, `race_teams`, `race_live_state`(모니터 read-only), `race_recordings` / RPC: `fn_prepare_race_session`🔄 / 외부: Python 브릿지 REST(기기 상태 조회)

**파괴적 행동**: 진행 중(racing) 이벤트 취소 — 2단계 confirm(라이브 데이터 유실 경고). 기기 삭제는 racing 모드 아닐 때만. `race_records` 수정은 사유+audit 필수(리더보드·PR 영향 명시)

**현재 상태**: ✅ 이벤트·기기·기록 승계 / 🔄 race_format 확장(group + group_target_m/heat_no — 15-race-system 참조) / 🟡 실장비 수용검증(P21 Phase4 L1~L4)은 재구축 게이트

---

### 3.10 `/admin/lockers` — 락커

| 항목 | 내용 |
|---|---|
| 목적 | 락커 재고·배정 관리 (as-is 삼중 구조 → `lockers` 단일 테이블) |
| 탭 | 없음 (KPI 스트립 + 그리드/목록) |
| 권한 | `lockers: view/edit` |

**핵심 기능**
- KPI: 전체/사용 중/만기 임박/비가용
- 락커 그리드: 번호별 상태 시각화, 클릭 → 배정 패널
- 배정: 회원 검색 → `assigned_member_id` + `start`/`end` 설정. 해제/연장/회원 교체
- 만기 임박 알림 연동(CRM 알림 규칙 딥링크), 회원 상세(§3.2)와 상호 링크

**데이터 소스**: `lockers`🔄(단일화: assigned_member_id/start/end — `locker_assignments`·`members.locker_number` 폐지)

**파괴적 행동**: 사용 중 락커 강제 해제 confirm(회원명 표시). 락커 삭제는 미배정 상태만

**현재 상태**: ✅ 기능 승계 / 🔄 데이터 모델 단일화(삼중 구조 해소)가 재구축 신규

---

### 3.11 `/admin/badges` — 배지 (신규 정식 명세)

> as-is `/admin/operations/badges`는 **미문서화 라우트**였고, `badge_definitions`/`badge_awards` 테이블·RPC는 **마이그레이션 실체가 없다**(문서에만 존재). to-be에서 스키마(07-data-model, `sql/07_performance_badges.sql`)와 함께 처음으로 정식 설계한다.

| 항목 | 내용 |
|---|---|
| 목적 | 배지 정의(획득 조건 규칙) 관리와 수여 현황·수동 수여/회수 |
| 탭 | `definitions`(배지 정의) \| `awards`(수여 현황) |
| 권한 | `badges: view/edit/delete` |

**핵심 기능 — `definitions` 탭**
- 배지 CRUD: 이름/설명/아이콘(에셋 업로드 또는 프리셋)/등급(bronze·silver·gold 등)/활성 여부
- **획득 조건 규칙(criteria JSONB)** 편집: 조건 유형별 파라미터 폼
  - 출석 누적(예: 체크인 N회), 연속 출석(streak N일/주)
  - 벤치마크 달성(benchmark_definition + 기준값 — time은 이하, 그 외 이상)
  - PR 달성 횟수, Race 참가/입상(finish_rank ≤ N)
  - 멤버십 지속(가입 N개월)
- 판정 방식 선택: 자동(트리거 경유 `fn_evaluate_badges` — checkins/benchmark_results/race_records INSERT 시) / 수동 전용
- 조건 시뮬레이션: "현재 조건이면 대상 회원 N명" 미리보기(수여 실행 아님)

**핵심 기능 — `awards` 탭**
- 수여 이력: 회원×배지, awarded_at, 판정 근거(자동/수동, 트리거 소스), 회원 상세 딥링크
- 수동 수여(회원 검색 → 배지 선택 → 사유), 회수(revoke — 사유 필수)
- 배지별 보유자 수 통계, User 앱 `performance` 허브 노출과 동기화

**데이터 소스**: `badge_definitions`⏳, `badge_awards`⏳ / RPC: `fn_evaluate_badges`⏳(트리거 경유), `fn_get_my_badges`⏳(User 앱 소비 — Admin은 테이블 직조회)

**파괴적 행동**: 배지 정의 삭제 — 수여 이력 존재 시 **차단**(비활성만, 기존 보유자 유지 명시). 회수: 사유 필수 + confirm(회원 앱에서 즉시 사라짐 명시). 조건 변경: 소급 재판정 없음(신규 이벤트부터) 명시

**현재 상태**: ⏳ 전면 신규(스키마·트리거·RPC) — UI 골격만 as-is 존재(🟡). 재구축 시 `sql/07_performance_badges.sql` 선행 필수

---

### 3.12 `/admin/feedback` — 피드백 (분석 + 응대)

| 항목 | 내용 |
|---|---|
| 목적 | 수업 피드백의 트렌드 분석과 저평점 응대를 한 화면에서 (as-is 이중화 해소) |
| 탭 | `analytics`(분석) \| `inbox`(응대) |
| 권한 | `feedback: view/edit` (답변 작성=edit) |

**핵심 기능 — `analytics` 탭**
- 수업별/기간별 평점 트렌드, 코치별 평점 비교(코치 성과 탭 딥링크)
- 저평점(≤2) 분류·급증 알림, 키워드/사유 분포
- 저평점 항목 클릭 → `inbox` 탭 해당 건으로 점프(`?tab=inbox&id=`)

**핵심 기능 — `inbox` 탭**
- 미답변/답변완료 필터, 세션·회원·코치 컨텍스트 표시
- 관리자 답변 작성(admin_response — User 앱 노출), 내부 메모(비노출)
- 응대 완료 처리, 반복 저평점 회원 → 회원 상세 노트 연동

**데이터 소스**: `session_feedback`(rating 1-5, admin_response), `sessions`, `members`, `coaches`
※ `session_feedback`은 계약 §2 목록 누락분 — 07-data-model 등재 필요(supplementary 도메인, as-is 실존 테이블)

**파괴적 행동**: 피드백 삭제 금지(숨김만 — 평점 집계 제외 여부 선택 confirm). 답변 수정 이력 보존

**현재 상태**: ✅ 두 화면 기능 승계 / 🔄 1화면 2탭 통합 + 분석→응대 점프 UX 신규

---

### 3.13 `/admin/crm` — CRM (공지·배너 + 알림 + 지원)

| 항목 | 내용 |
|---|---|
| 목적 | 회원 대상 커뮤니케이션 채널(콘텐츠/알림/지원) 통합 운영 |
| 탭 | `content`(공지·배너) \| `notifications`(알림) \| `support`(지원·FAQ) |
| 권한 | `crm: view/edit/delete` |

**핵심 기능 — `content` 탭**
- 공지(`notices`) CRUD: 게시 기간, 고정, 대상(전체/멤버십 상태별), User 앱·Kiosk Idle 노출
- 배너(`banners`) CRUD: 이미지 업로드(10MB 제한), 노출 순서, 링크

**핵심 기능 — `notifications` 탭** (as-is 3서브탭 승계)
- History: 발송 이력(`notification_logs` — pending/sent/failed/read), 채널·상태 필터, 실패 재발송
- Rules: 자동 규칙(`notification_rules` — trigger_type/config/channels[]) — 시간 기반=pg_cron(수업 리마인더·만기 D-7 — **to-be에서 cron 정식 등록**, as-is 미등록 부채 해소), 이벤트 기반=트리거(빈자리 대기열 상위 3명 등)
- Compose: 수동 발송 — 대상 세그먼트(전체/필터), 채널 우선순위(In-App+Realtime → Web Push → 카카오/SMS)

**핵심 기능 — `support` 탭**
- 티켓(`support_tickets`) 상태별 관리(접수→처리 중→완료), 담당자 배정, 답변
- FAQ(`faqs`) CRUD, 카테고리·노출 순서

**데이터 소스**: `notices`, `banners`, `notifications`, `notification_rules`, `notification_logs`, `notification_preferences`(발송 시 수신 동의 필터), `push_subscriptions`, `support_tickets`, `faqs` / Edge Functions: `send-push-notification`(✅ 실동작), `send-external-notification`(🧪 카카오/SMS mock)

**파괴적 행동**: 대량 발송(Compose): 대상 인원 수 + 채널별 비용 고지 confirm 2단계. 규칙 삭제: 활성 규칙은 비활성 → 삭제 순서 강제. 공지 삭제는 confirm 1단계

**현재 상태**: ✅ 3화면 기능 승계·통합 / 🧪 카카오·SMS 채널(P14 실가동 QA 잔여) / 🔄 pg_cron 정식 등록(as-is 0건 부채 해소), `fn_send_membership_expiry_reminders` 실구현

---

### 3.14 `/admin/settings` — 설정 (지점 + 시스템 + 사이트 + 권한 + 감사 5탭)

| 항목 | 내용 |
|---|---|
| 목적 | 저빈도·고위험 설정의 단일 진입점 (as-is 4개 setup 화면 + roles + infrastructure 통합) |
| 탭 | `branch`(지점) \| `system`(시스템) \| `site`(사이트) \| `roles`(권한) \| `audit`(감사) |
| 권한 | `settings: view/edit` — 단, `roles` 탭은 super_admin 전용 편집, `audit` 탭은 `audit: view` 별도 그룹 |

**핵심 기능 — `branch` 탭**
- 지점 정보(`facilities`): 이름/주소/좌표/사진, 운영시간, 약관·개인정보·환불정책 문서

**핵심 기능 — `system` 탭**
- PG 연동: `pg_settings` — 키 암호화 저장(`save_pg_settings`/`get_decrypted_pg_settings`, pgp_sym), **payment_mode(simulation/live) 전환**
- API/Webhook 설정, `system_config` 키-값 관리
- 인프라(as-is infrastructure 흡수): 고정 QR(`qr_codes`) 발급·재발급, 키오스크 기기(`kiosk_devices`) 등록·heartbeat 모니터(30s)·원격 제어(재시작/공지 갱신)

**핵심 기능 — `site` 탭**
- 업로드 설정(용량/포맷), 사이트 정보(로고/연락처), 대시보드 Quick Action 구성 관리

**핵심 기능 — `roles` 탭** (as-is `/admin/operations/roles` 이동)
- 역할(`admin_roles`) CRUD: `permissions` JSONB **단일형** `{group: ['view','edit',...]}` — as-is 2형태 혼재(배열형 vs 불리언맵) 해소
- 권한 매트릭스 UI: 그룹(dashboard/members/attendance/payments/plans/schedule/coaches/wod/race/lockers/badges/feedback/crm/settings/audit) × 액션(view/create/edit/delete/approve)
- 사용자 배정(`admin_user_roles`) — **권한 단일 소스**(as-is profiles.role↔admin_roles 이원화 해소, 07-data-model 통합안). super_admin(`{"*":["all"]}`)은 편집 잠금
- 내 권한 미리보기: `fn_my_permissions()` 결과 확인

**핵심 기능 — `audit` 탭**
- `audit_logs` 조회: actor/action/target/기간 필터, old·new_values diff 뷰, 에러 로그, CSV 내보내기 (읽기 전용)

**데이터 소스**: `facilities`, `pg_settings`, `system_config`, `qr_codes`, `kiosk_devices`, `admin_roles`🔄, `admin_user_roles`, `audit_logs` / RPC: `fn_my_permissions`, `save_pg_settings`, `get_decrypted_pg_settings`

**파괴적 행동 확인 규칙**
- **payment_mode live 전환**: 최고 위험 — 2단계(체크리스트 확인 → "LIVE" 타이핑) + min(Admin 설정, env) 이중장치로 env가 simulation이면 live 불가 명시
- 역할 삭제: 배정 사용자 존재 시 차단. super_admin 역할 편집·삭제 불가(하드 잠금)
- 자기 자신의 권한 축소: 경고 confirm(잠금 사고 방지 — settings edit 권한 제거 시 이중 확인)
- QR 재발급: 기존 QR 즉시 무효 명시 confirm
- 감사 로그: 수정·삭제 불가(append-only)

**현재 상태**: ✅ setup 4화면 + roles + infrastructure 기능 승계 / 🔄 통합 + permissions JSONB 단일형 + admin_user_roles 단일 소스 승격이 재구축 핵심 변경

---

## 4. 대시보드 위젯 시스템 (범위 축소안)

as-is 설계서는 위젯 전용 테이블 4개 + 모달 18종 + AI 위젯 생성기(Gemini)를 계획했으나 **테이블은 설계만 존재, 상태는 localStorage**였다. to-be는 아래로 축소 확정한다.

### 4.1 저장 모델 — `widget_settings` 1테이블 (4테이블 → 1 🔄)

```
widget_settings (
  user_id      uuid PK → profiles.id,   -- 관리자 개인별 배치
  layout       jsonb NOT NULL,          -- [{id, type, position, size, visible, config}]
  updated_at   timestamptz
)
```
- 위젯 정의(종류/기본 config)는 **코드 상수**로 관리 — DB 스키마화하지 않는다(위젯 카탈로그 테이블 폐지).
- RLS: 본인 행만 read/write. 기본 배치는 코드 기본값(행 없으면 default layout).
- localStorage → DB 이관으로 기기 간 배치 동기화 확보.

### 4.2 위젯 8종 (as-is 승계, 링크 to-be 경로로 교체)

| 위젯 | 요약 표시 | 클릭 모달(핵심만) | 딥링크 |
|---|---|---|---|
| members | 신규/승인대기/전체 | 승인 대기 목록 + 즉시 승인 | `/admin/members` |
| schedule | 오늘 세션 타임라인 | 세션 요약(정원/대기) | `/admin/schedule` (세션 패널 오픈) |
| checkins | 실시간 체크인 티커 | 최근 체크인 20건 | `/admin/attendance?tab=live` |
| transactions | 오늘 매출/미처리 환불 | 미처리 환불 목록 | `/admin/payments?tab=transactions` |
| notifications | 발송 실패 수 | 실패 로그 + 재발송 | `/admin/crm?tab=notifications` |
| memberships | 만기 D-7/홀딩 수 | 만기 임박 회원 목록 | `/admin/members` (만기임박 필터) |
| coaches | 오늘 배정 코치 | 코치별 세션 수 | `/admin/coaches?tab=performance` |
| support | 미처리 티켓 수 | 미처리 티켓 목록 | `/admin/crm?tab=support` |

- **모달 정책**: 위젯당 요약 모달 최대 1종(총 8종) — as-is 18종 모달 계획 폐기. 상세 행동은 전부 해당 화면 딥링크로 위임(기능 중복 구현 금지).
- DnD: @dnd-kit 유지(편집 모드에서만 활성).
- 권한: 위젯별 대응 권한 그룹 `view` 미보유 시 카탈로그에서 숨김(§3.1).

### 4.3 AI 위젯 생성기 — 부록/후순위 ⏳

- as-is에 설계만 존재(Gemini 기반). **재구축 범위에서 제외**하고 부록으로만 남긴다.
- 재개 조건: 위젯 8종 안정 운영 + widget_settings 스키마 검증 후. 재개 시 `layout[].config`에 `custom_query` 형태로 얹는 방향(신규 테이블 불필요)만 열어둔다.

---

## 5. 화면 간 네비게이션 맵 (크로스 딥링크 요약)

| 출발 | 도착 | 트리거 |
|---|---|---|
| dashboard 위젯 | 각 화면 `?tab=` | §4.2 표 |
| members 상세 `membership` 취소 | payments 환불 워크플로우 | 중도해지 환급 |
| members 상세 `activity` | payments 거래 상세 | 결제 이력 행 |
| attendance report 장기 미출석 | crm Compose | 재방문 유도 발송 |
| coaches performance | payments report 정산 섹션 | 정산 실행 |
| feedback analytics 저평점 | feedback inbox 해당 건 | `?tab=inbox&id=` |
| feedback / lockers | members 상세 | 회원명 클릭 |
| schedule 세션 `wod` 서브탭 | wod-studio templates | 템플릿 검색·편집 |
| race events | schedule 세션 | 세션 연결 |
| settings system 키오스크 | attendance live | 키오스크 체크인 확인 |

---

## 6. 재구축 우선순위 요약 (Admin 관점)

1. **Phase 2 코어**(11-deployment 로드맵): members(멤버십 통합) → schedule(세션 패널) → attendance → payments → plans — 운영 필수 경로
2. coaches / wod-studio / crm / feedback / settings — 승계 통합(기능 동일, IA만 재편)
3. badges ⏳ — `sql/07_performance_badges.sql` 스키마 선행 후 구현
4. 위젯 시스템 🔄 — widget_settings 1테이블 + 8위젯 (AI 생성기 ⏳ 제외)
5. 잔여 검증 게이트: Toss live 🧪, 카카오/SMS 🧪(P14), pg_cron 등록 확인
