# BCL Portal DB 감사보고서 원격 Supabase 대조 부록

> **Status**: Remote Comparison Complete
> **Author**: Codex
> **Created**: 2026-04-26
> **Compared Against**:
> - [audit-database-readiness-20260426.md](/Users/kimchoho/dev/workspace/BCL-portal/.docs/archive/audit/audit-database-readiness-20260426.md)
> - 현재 Supabase 원격 프로젝트 (`meklaisrcpecuwwwakhv`)
> **Method**:
> - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`로 원격 REST 읽기 검증
> - 읽기 전용 RPC 존재 여부 검증
> - 쓰기 함수(`fn_calculate_monthly_settlement`, 출결 변경 RPC)는 실행 부작용 위험 때문에 호출하지 않음
> **Limitations**:
> - 이번 검증은 데이터 plane 중심이다.
> - 원격 마이그레이션 ledger 자체(`schema_migrations`)는 관리 권한 경로로 직접 대조하지 못했다.
> - 현재 세션에서는 Supabase MCP 도구가 직접 주입되지 않아, 원격 관리 API 기반 검증 대신 REST 기반 존재/응답 비교를 사용했다.

---

## 1. 결론

정적 감사보고서의 핵심 판단은 대체로 **원격 Supabase 상태와 일치**했다.

특히 아래 3개는 원격 비교로 더 강하게 확정됐다.

- 저장소에 없는 DB 객체가 원격에는 실제로 존재한다.
- `Priority 23 P1-A` 객체는 원격에 아직 배포되지 않았다.
- `wods`는 원격에 존재하지만, 현재 클래스 WOD 화면이 기대하는 구조와 다른 레거시 계약으로 남아 있다.

반대로 정적 감사에는 없던 **새로운 운영 보안 이슈**도 확인됐다.

- `members`
- `coaches`
- `wods`

위 테이블은 anon key만으로 실제 row가 읽혔다.

이건 문서 정합성 문제보다 우선순위가 높은 원격 보안 이슈다.

---

## 2. 항목별 비교

### 2.1 Critical — 저장소에는 없지만 원격에는 존재하는 테이블

정적 감사보고서 2.1은 아래 객체가 저장소 마이그레이션 기준으로는 생성 경로가 없다고 판단했다.

- `public.wods`
- `public.notification_rules`
- `public.notification_preferences`
- `public.push_subscriptions`
- `public.system_config`

원격 대조 결과:

- `wods`: 존재 확인
- `notification_rules`: 존재 확인
- `notification_preferences`: 존재 확인
- `push_subscriptions`: 존재 확인
- `system_config`: 존재 확인

판정:

- **정적 감사 2.1은 confirmed**
- 저장소와 원격 DB 사이에 실제 drift가 존재한다.
- 따라서 “저장소만으로 현재 DB 재현 불가” 판단은 가정이 아니라 **실증**이다.

---

### 2.2 Critical — `Priority 23 P1-A`는 원격에 아직 배포되지 않음

정적 감사보고서 2.2는 `20260426120000_p1a_class_standardization.sql`이 현 상태 그대로는 배포 불가라고 판단했다.

원격 대조 결과:

- `movement_library`: 없음
- `wod_templates`: 없음
- `wod_template_movements`: 없음
- `session_wods`: 없음
- `class_runbook_templates`: 없음
- `session_runbooks`: 없음
- `fn_get_class_display_wod(...)`: 없음

또한 `coaching_notes.note` 컬럼은 원격에서 존재하지 않았고, `coaching_notes.content` 조회는 정상 응답했다.

이건 감사보고서가 지적한 `cn.note` 오참조와 직접 맞물린다.

판정:

- **정적 감사 2.2는 confirmed**
- P1-A는 원격에 아직 반영되지 않았다.
- 현재 운영 DB는 P1-A 이전 상태로 보는 것이 맞다.

---

### 2.3 High — P1-A RLS 과개방 문제는 아직 “배포 전 위험” 상태

정적 감사보고서 2.3은 P1-A 신규 테이블들의 RLS가 과도하게 열려 있다고 판단했다.

원격 대조 결과:

- P1-A 테이블 자체가 원격에 없다.

판정:

- **정적 감사 2.3의 설계상 위험은 유지**
- 다만 원격 운영 DB 기준으로는 아직 배포되지 않았으므로, 현재 시점에는 “실배포된 권한 이슈”가 아니라 **배포 전 차단 이슈**다.

---

### 2.4 High — DB 문서가 SSOT가 아니라는 판단은 더 강해짐

정적 감사보고서 2.4는 `.docs/database/*`와 `.docs/database-reference.md`가 현재 구조를 설명하지 못한다고 판단했다.

원격 대조 결과:

- 저장소에 생성 경로가 없는 테이블들이 원격에 실제로 존재한다.
- 즉 문서뿐 아니라 **저장소 마이그레이션 자체도 원격의 SSOT가 아니다**.

판정:

- **정적 감사 2.4는 strengthened**
- 이 문제는 “문서가 낡았다” 수준이 아니라, “운영 DB와 저장소 기준선이 분리됐다”는 수준이다.

---

### 2.5 Medium — WOD 계약 충돌은 원격에서도 그대로 확인됨

정적 감사보고서 2.5는 `wods` 계약이 코드/타입/마이그레이션 사이에서 충돌한다고 판단했다.

원격 `wods` 샘플 응답 구조는 아래와 같았다.

- `date`
- `title`
- `warmup`
- `strength`
- `metcon`
- `cooldown`

이건 정적 감사보고서가 지적한 레거시 `wods` 구조와 일치한다.

즉 원격 `wods`는 다음 형태가 아니다.

- `description`
- `wod_type`
- `time_cap_minutes`
- `rounds`
- `movements`
- `session_date`

판정:

- **정적 감사 2.5는 confirmed**
- 현재 운영 DB의 WOD는 아직 레거시 구조다.
- 따라서 클래스 WOD 표시/공유 기능은 신규 공유 모델(`session_wods` 등)로 재구성하기 전까지 구조 충돌이 계속된다.

---

### 2.6 Medium — `waitlist` / `waitlisted` 드리프트는 원격에서 “잠재” 상태

정적 감사보고서 2.6은 `waitlist` / `waitlisted` 값 혼재를 장기적 리스크로 봤다.

원격 대조 결과:

- `status=eq.waitlist` 조회는 정상 응답
- `status=eq.waitlisted` 조회도 정상 응답
- 다만 이번 샘플에서는 두 값 모두 row가 잡히지 않았다

판정:

- **정적 감사 2.6은 partially confirmed**
- 스키마/호환 코드 차원의 리스크는 유지된다.
- 하지만 이번 원격 샘플만으로 실제 데이터에 두 값이 섞여 있다고까지는 단정할 수 없다.

---

### 2.7 Medium — 타입 동기화 미완료는 원격 상태와도 일치

정적 감사보고서 2.7은 P1-A 타입이 반영되지 않았다고 판단했다.

원격 대조 결과:

- P1-A 객체가 원격에 없다.

판정:

- **정적 감사 2.7은 operationally aligned**
- 지금 시점의 원격 운영 DB는 P1-A 전 상태라서, 타입이 P1-A를 반영하지 않은 것 자체는 “현재 운영과는 일치”한다.
- 다만 P1-A를 배포하려면 타입 재생성 절차는 여전히 필수다.

---

## 3. 원격에서 추가로 확인된 내용

### 3.1 P0 읽기 RPC는 원격에 배포되어 있음

다음 읽기 RPC는 원격에서 실제 응답했다.

- `fn_get_my_coach_context()`
- `fn_get_my_coach_dashboard()`
- `fn_get_coach_schedule(p_from, p_to)`
- `fn_get_coach_session_board(p_session_id)`

인증 없이 호출했기 때문에 응답은 `no_session` / `unauthenticated`였지만, 함수 자체는 존재한다.

판정:

- `Priority 22`의 읽기 계층은 원격에 반영되어 있다.

---

### 3.2 P0 스키마 컬럼도 원격에 반영된 것으로 보임

다음 컬럼 조회는 에러 없이 응답했다.

- `bookings.attendance_outcome`
- `bookings.attendance_marked_at`
- `bookings.attendance_marked_by`
- `bookings.waitlist_promoted_at`
- `bookings.cancel_reason`
- `session_coaches.assignment_role`
- `session_coaches.display_order`

샘플 row 자체는 이번 조회에서 비어 있었지만, 컬럼 미존재 에러가 없었다.

판정:

- `Priority 22`의 컬럼 확장은 원격에 반영된 것으로 판단된다.

---

## 4. 원격 비교에서 새로 발견된 보안 이슈

### 4.1 High — `members`가 anon key로 실제 row 반환

anon key만으로 `members` 조회 시 실제 row가 반환됐다.

샘플에 포함된 필드 예:

- `user_id`
- `name`
- `email`
- `phone`
- `joined_date`
- `plan`

판정:

- **원격 운영 DB에서 회원 개인정보가 과도하게 노출될 가능성**
- 이건 정적 감사에는 없던, 실제 운영 보안 이슈다.

권고:

- `members` RLS/GRANT를 즉시 재검토
- anon 사용자에게 필요한 최소 컬럼만 별도 view/RPC로 분리

---

### 4.2 High — `coaches`가 anon key로 실제 row 반환

anon key만으로 `coaches` 조회 시 실제 row가 반환됐다.

샘플에 포함된 필드 예:

- `name`
- `email`
- `phone`
- `user_id`
- `specialties`

판정:

- **코치 개인정보도 익명 클라이언트에서 노출 가능**

권고:

- `coaches` RLS/GRANT 즉시 점검
- 앱이 공개적으로 필요한 코치 프로필만 별도 projection으로 노출

---

### 4.3 Medium — `wods`도 anon key로 실제 row 반환

`wods`는 개인정보보다는 운영 컨텐츠에 가깝지만, 현재도 anon key로 row가 직접 조회된다.

판정:

- 보안 임팩트는 `members`, `coaches`보다 낮다.
- 다만 공개 범위를 의도한 설계인지 점검이 필요하다.

---

## 5. 최종 판정

원격 Supabase와 비교한 결과, 기존 감사보고서의 큰 방향은 맞았다.

정리하면:

- **맞았던 것**
  - 저장소/문서/원격 DB가 분리되어 있다.
  - `wods`와 알림 관련 일부 테이블은 원격에만 존재한다.
  - P1-A는 아직 운영 DB에 반영되지 않았다.
  - `wods` 계약 충돌은 실제 운영 상태에서도 존재한다.

- **원격 비교로 더 강해진 것**
  - 저장소가 SSOT가 아니라는 판단
  - P1-A 배포 차단 판단

- **새로 드러난 것**
  - `members`, `coaches`의 anon 읽기 가능성

현재 우선순위는 아래 순서가 맞다.

1. `members`, `coaches` 원격 노출 여부 즉시 점검 및 차단
2. 저장소 밖에서 생성된 테이블의 생성 경로 복구
3. P1-A SQL 수정 전 배포 금지 유지
4. WOD 공유 구조 재설계 전까지 레거시 `wods`를 운영 기준으로 명시

