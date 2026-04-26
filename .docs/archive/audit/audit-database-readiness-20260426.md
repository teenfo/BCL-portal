# BCL Portal DB 구현/문서/배포 준비도 감사 보고서

> **Status**: Audit Complete
> **Author**: Codex
> **Created**: 2026-04-26
> **Scope**:
> - `supabase/migrations/*`
> - `.docs/database/*`
> - `.docs/database-reference.md`
> - `src/types/supabase.ts`
> - DB를 직접 호출하는 주요 앱 코드 (`src/app/class/wod/page.tsx` 등)
> **Method**: 저장소 정적 감사. 실제 원격 DB 적용/실행 검증은 수행하지 않음.
> **Remote Comparison Addendum**: [audit-database-remote-comparison-20260426.md](/Users/kimchoho/dev/workspace/BCL-portal/.docs/archive/audit/audit-database-remote-comparison-20260426.md)

---

## 1. 결론

현재 저장소 기준으로 보면, **DB 기능은 상당히 많이 구현되어 있지만 저장소만으로 동일한 DB를 재현할 수 있는 상태는 아니다.**

판단은 아래와 같다.

- **현재 운영형 기능 구현 범위**: 넓음
  - 회원/멤버십/예약/출석
  - 코치앱 P0 RPC
  - Race 시스템
  - 결제/정산
  - 알림 자동화
  - Admin RBAC
  - 락커/보조 시스템
  - WOD 관련 라이브 스키마 흔적
- **문서 정합성**: 낮음
  - 일반 DB 문서는 현재 저장소/마이그레이션 구조를 제대로 반영하지 못함
- **클린 배포 가능성**: 낮음
  - 저장소의 마이그레이션만으로 현재 타입/앱 코드가 기대하는 DB를 완전히 재구성할 수 없음
- **우선 조치 필요성**: 높음
  - 특히 `Priority 23 P1-A` 마이그레이션은 현 상태 그대로는 배포 차단급 이슈가 있음

---

## 2. 주요 발견

### 2.1 Critical — 저장소만으로 현재 DB 상태를 재현할 수 없다

다음 객체는 앱 코드 또는 `src/types/supabase.ts`에는 존재하지만, 저장소의 `supabase/migrations/`와 `.docs/database/schema/`에는 생성 경로가 없다.

- `public.wods`
- `public.notification_rules`
- `public.notification_preferences`
- `public.push_subscriptions`
- `public.system_config`

근거:

- `src/types/supabase.ts:1006` `notification_preferences`
- `src/types/supabase.ts:1074` `notification_rules`
- `src/types/supabase.ts:1402` `push_subscriptions`
- `src/types/supabase.ts:2088` `system_config`
- `src/types/supabase.ts:2334` `wods`
- `supabase/migrations/20260217203900_create_notification_logs.sql:3`은 `notification_rules는 이미 존재`라고 가정하지만, 해당 생성 마이그레이션은 저장소에 없다.
- `supabase/migrations/20260426120000_p1a_class_standardization.sql:1254`는 `public.wods`에 comment를 달지만, `public.wods`를 생성하는 SQL은 저장소에 없다.

영향:

- 새 환경에서 `supabase/migrations`만 적용하면 현재 앱/타입이 기대하는 DB와 다른 상태가 된다.
- 운영 DB가 저장소 밖에서 수동 변경되었거나, 누락된 마이그레이션이 있다는 뜻이다.

판정:

- **현재 저장소는 DB SSOT로 신뢰할 수 없다.**

### 2.2 Critical — `Priority 23 P1-A` 마이그레이션은 현 상태 그대로 배포 불가다

`supabase/migrations/20260426120000_p1a_class_standardization.sql`에는 최소 2개의 배포 차단 요소가 있다.

1. 존재하지 않는 컬럼 참조
   - `supabase/migrations/20260426120000_p1a_class_standardization.sql:982` → `cn.note`
   - 실제 `coaching_notes` 스키마는 `content` 컬럼만 가진다.
   - 근거: `supabase/migrations/20260221000000_coach_feature_enhancement.sql:10`

2. 존재 보장이 없는 테이블에 대한 comment
   - `supabase/migrations/20260426120000_p1a_class_standardization.sql:1254` → `COMMENT ON TABLE public.wods`
   - 저장소에는 `public.wods`를 생성하는 마이그레이션이 없다.

영향:

- P1-A 마이그레이션은 클린 환경에서 실패할 가능성이 높다.
- 적용 가이드가 아무리 상세해도 본문 SQL이 깨져 있으면 배포 문서로 사용할 수 없다.

판정:

- **P1-A는 수정 전까지 DEV/PROD 배포 금지**

### 2.3 High — P1-A RLS가 설계 의도보다 과도하게 열려 있다

`movement_library`를 제외한 P1-A 신규 테이블 다수는 `coach` 역할이면 직접 `FOR ALL` 관리가 가능하다.

근거:

- `supabase/migrations/20260426120000_p1a_class_standardization.sql:217`
- `...:228`
- `...:239`
- `...:250`
- `...:261`
- `...:273`

구체 문제:

- `wod_templates`: 모든 코치가 직접 수정/삭제 가능
- `wod_template_movements`: 모든 코치가 직접 수정/삭제 가능
- `session_wods`: 배정 여부와 무관하게 모든 코치가 직접 수정/삭제 가능
- `class_runbook_templates`, `session_runbooks`: 동일

이건 같은 파일의 helper/RPC가 의도한 더 좁은 권한 모델과 충돌한다.

- `_p1a_assert_coach_can_edit_session()`는 세션 배정 검증을 한다. `supabase/migrations/20260426120000_p1a_class_standardization.sql:305`
- 그러나 테이블 RLS 자체가 넓으면, 클라이언트가 RPC를 우회해 direct table mutation을 할 수 있다.

판정:

- **현재 P1-A RLS는 배포 전 재설계 필요**

### 2.4 High — 일반 DB 문서는 현재 구조를 설명하지 못한다

`.docs/database/README.md`, `.docs/database-reference.md`, `.docs/database/migrations/versioning-strategy.md`는 현재 저장소 기준으로 SSOT가 아니다.

대표 불일치:

- 문서는 `.docs/database/schema/001~004` 구조를 안내하지만, 실제 운영 마이그레이션은 `supabase/migrations/*.sql` 타임스탬프 체계다.
  - `.docs/database/README.md:34-53`
  - `.docs/database/README.md:59-92`
  - `.docs/database/migrations/versioning-strategy.md:18-22`
  - `.docs/database/migrations/versioning-strategy.md:156-177`
- README는 존재하지 않는 문서를 참조한다.
  - `rollback-guide.md` → `.docs/database/README.md:44`, `.docs/database-reference.md:205`
  - `indexes/performance-indexes.md` → `.docs/database/README.md:52`, `.docs/database/README.md:138`, `.docs/database-reference.md:353`
- `database-reference.md`의 마이그레이션 목록은 실제 파일셋과 다르다.
  - `.docs/database-reference.md:163-190`
- `database-reference.md`는 `npm run db:seed`, `npm run db:seed:test`를 안내하지만 실제 스크립트가 없다.
  - `.docs/database-reference.md:234-240`
  - `package.json:5-11`

판정:

- **일반 DB 문서는 배포 가이드로 사용하면 안 된다**

### 2.5 Medium — WOD 계약이 코드/타입/마이그레이션 사이에서 서로 다르다

`/class/wod`는 `wods`를 조회하지만, 화면이 기대하는 컬럼과 타입 정의의 `wods` 구조가 다르다.

근거:

- 화면 인터페이스: `src/app/class/wod/page.tsx:7-15`
  - `description`, `wod_type`, `time_cap_minutes`, `rounds`, `movements`, `session_date`
- 실제 query 대상: `src/app/class/wod/page.tsx:54`
- 타입 정의: `src/types/supabase.ts:2334-2344`
  - `date`, `warmup`, `strength`, `metcon`, `cooldown`

즉, `wods`는 “있다/없다”만의 문제가 아니라 **계약 자체가 충돌**하고 있다.

판정:

- **WOD 관련 DB는 현재 재설계 중이며, 현 상태를 안정적인 운영 스키마로 보면 안 된다**

### 2.6 Medium — `waitlist` / `waitlisted` 상태 값 드리프트가 남아 있다

기준 스키마는 `bookings.status`를 `waitlist`로 정의한다.

- `.docs/database/schema/001_initial_schema.sql:153`

그런데 레거시 코치 RPC는 `waitlisted`를 사용한다.

- `supabase/migrations/20260221000000_coach_feature_enhancement.sql:119`

P0 마이그레이션은 두 값을 모두 허용하는 방향으로 호환 코드를 넣었다.

- `supabase/migrations/20260425120000_coach_p0_session_ops.sql:212`
- `...:255`
- `...:335`
- `...:466`

적용 가이드도 혼용 여부를 사전 점검 대상으로 둔다.

- `.docs/database/migrations/20260425_priority22_apply.md:54`

판정:

- **즉시 장애는 아니지만, 데이터 정규화 없이는 장기적으로 버그 유발 가능**

### 2.7 Medium — 타입 정의는 P0까지는 일부 반영됐지만 P1-A와는 동기화되지 않았다

`src/types/supabase.ts`는 다음을 보여준다.

- P0 함수는 반영됨
  - `src/types/supabase.ts:2467-2474`
- `wods` 등 라이브 스키마 흔적도 반영됨
  - `src/types/supabase.ts:2334-2344`
- 하지만 P1-A 신규 객체(`movement_library`, `wod_templates`, `session_wods`, `fn_get_class_display_wod` 등)는 타입에 보이지 않는다.

영향:

- 이후 P1-A 프론트 구현 시 타입 정의가 저장소 SQL과 어긋난 상태로 진행될 가능성이 높다.

판정:

- **P1-A 적용 후 타입 재생성 절차가 필수**

---

## 3. 구현 현황 요약

현재 저장소 기준으로 파악되는 DB 기능 구현 범위는 다음과 같다.

### 3.1 Core / Operations

- `facilities`, `members`, `membership_plans`, `memberships`
- `coaches`, `sessions`, `session_coaches`, `bookings`, `checkins`
- `notices`, `notifications`, `support_tickets`
- 기본 RLS helpers: `get_user_role`, `is_admin`, `is_coach`
- 근거:
  - `.docs/database/schema/001_initial_schema.sql`
  - `.docs/database/schema/002_rls_policies.sql`

### 3.2 Coach Domain

- `coaching_notes`
- `coach_settlements`
- 레거시 coach RPC
- P0 coach RPC 6종
- 근거:
  - `supabase/migrations/20260221000000_coach_feature_enhancement.sql`
  - `supabase/migrations/20260425120000_coach_p0_session_ops.sql`

### 3.3 Race Domain

- `race_events`, `race_records`, `pm5_devices`
- `race_teams`, `race_live_state`, race enhancement columns
- 근거:
  - `supabase/migrations/20260217203700_create_race_system.sql`
  - `supabase/migrations/20260221084721_race_system_enhancement.sql`

### 3.4 Payments / Finance

- `transactions` 확장
- `pg_settings`
- `refunds`
- 결제 helper RPC
- 코치 정산
- 근거:
  - `supabase/migrations/20260218230000_payment_system_phase1.sql`
  - `supabase/migrations/20260218230100_payment_rpc_helpers.sql`
  - `supabase/migrations/20260221000000_coach_feature_enhancement.sql`

### 3.5 Notifications / Automation

- `notification_logs`
- side effect trigger 함수
- 타입 기준으로는 `notification_rules`, `notification_preferences`, `push_subscriptions`도 존재
- 그러나 일부는 저장소에 생성 마이그레이션이 없음
- 근거:
  - `supabase/migrations/20260217203900_create_notification_logs.sql`
  - `supabase/migrations/20260218110000_notification_side_effects.sql`
  - `src/types/supabase.ts:1006-1128`
  - `src/types/supabase.ts:1402-1454`

### 3.6 Admin / RBAC / Supplementary

- `admin_roles`, `admin_user_roles`
- `membership_history`
- `qr_codes`, `kiosk_devices`, `audit_logs`
- `banners`
- 근거:
  - `supabase/migrations/20260217203800_create_admin_rbac.sql`
  - `supabase/migrations/20260217204000_create_membership_history.sql`
  - `supabase/migrations/20260217204200_create_supplementary_tables.sql`
  - `supabase/migrations/20260217204400_create_banners_table.sql`

### 3.7 P1-A Standardization / WOD

- 저장소에는 `movement_library`, `wod_templates`, `wod_template_movements`, `session_wods`, `class_runbook_templates`, `session_runbooks`, `member_alert_flags` 마이그레이션이 추가되어 있음
- 다만 현재는 **배포 준비 완료 상태가 아님**
- 근거:
  - `supabase/migrations/20260426120000_p1a_class_standardization.sql`

---

## 4. 문서별 사용 가능성 평가

### 4.1 바로 배포 SSOT로 사용 가능

- `supabase/migrations/*.sql`
  - 단, **P1-A 파일은 수정 전 제외**
- `.docs/database/migrations/20260425_priority22_apply.md`
  - 적용 가이드로서 품질이 상대적으로 높음
  - 단, 실제 실행 전 SQL 본문과 함께 검증 필요

### 4.2 참고는 가능하지만 SSOT로 쓰면 안 됨

- `.docs/database-reference.md`
- `.docs/database/README.md`
- `.docs/database/migrations/versioning-strategy.md`
- `.docs/database/schema/*`

이유:

- 현행 스키마 전체를 포괄하지 못함
- 저장소 파일 구조와 불일치
- 누락된 문서/스크립트를 참조

### 4.3 현 상태로 배포 문서로 사용 불가

- `.docs/database/migrations/20260426_priority23_p1a_apply.md`

이유:

- 문서 자체는 상세하지만, 기반 SQL인 `20260426120000_p1a_class_standardization.sql`이 깨져 있음

---

## 5. 배포 준비도 판정

### 5.1 Clean-room 배포

- **판정: 불가**

사유:

- 저장소에 없는 테이블이 타입/코드/후속 마이그레이션에서 가정됨
- P1-A 마이그레이션 본문 오류

### 5.2 현재 운영 DB에 대한 점진 배포

- **판정: 조건부 가능**

조건:

1. 현재 운영 DB에 누락 객체(`wods`, `notification_rules` 등)가 이미 존재해야 함
2. P1-A는 적용 전 수정해야 함
3. 문서가 아니라 실제 `supabase/migrations`를 기준으로 검증해야 함

### 5.3 문서 기반 수동 배포

- **판정: 일반 DB 문서 기준으로는 불가**
- `Priority 22` 적용 가이드처럼 특정 마이그레이션 전용 문서만 부분적으로 사용 가능

---

## 6. 권고 순서

1. **저장소 기준 DB SSOT를 하나로 고정**
   - 원칙: `supabase/migrations`만 배포 기준
2. **누락된 live-schema 테이블의 생성 마이그레이션 복구**
   - 최소: `wods`, `notification_rules`, `notification_preferences`, `push_subscriptions`, `system_config`
3. **P1-A 마이그레이션 즉시 수정**
   - `cn.note` -> `cn.content`
   - `COMMENT ON TABLE public.wods`는 존재 검사 후 수행하거나 제거
4. **P1-A RLS 재설계**
   - `session_wods`, `session_runbooks`는 세션 배정 기반 제한 필요
   - 공유 템플릿 수정 권한은 admin/head coach 중심으로 재정의 필요
5. **waitlist 값 정규화**
   - `waitlist`로 통일하고 legacy 함수 제거
6. **문서 재작성**
   - `.docs/database/README.md`
   - `.docs/database-reference.md`
   - `.docs/database/migrations/versioning-strategy.md`
7. **타입 재생성**
   - 누락/드리프트 수정 후 `src/types/supabase.ts` 재생성
8. **CI 수준 검증 추가**
   - 빈 DB에 전체 마이그레이션 적용 테스트
   - 스키마 diff 또는 `supabase db diff` 기준 검증

---

## 7. 최종 판단

2026년 4월 26일 기준 이 프로젝트의 DB는 **기능 폭은 넓지만, 저장소/문서/타입/실제 기대 스키마가 하나로 수렴돼 있지 않다.**

가장 중요한 한 줄은 이렇다.

> **현재 저장소는 “운영 DB의 완전한 복제본”이 아니라 “운영 DB를 부분적으로 설명하는 코드와 문서의 집합”에 가깝다.**

따라서 지금 당장 필요한 일은 새 기능 추가보다 먼저 아래 3가지다.

1. 누락된 스키마를 마이그레이션으로 복구
2. P1-A 배포 차단 이슈 수정
3. DB 문서 SSOT 재정립
