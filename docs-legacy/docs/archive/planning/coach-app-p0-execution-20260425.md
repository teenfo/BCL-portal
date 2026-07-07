# BCL Portal – 코치앱 P0 실행 명세서

> **Status**: Approved  
> **Author**: Codex (Execution Spec)  
> **Created**: 2026-04-25  
> **Last Updated**: 2026-04-25  
> **Superseded By**: `.docs/archive/planning/coach-app-master-plan-20260425.md`
> **Related**:
> - `.docs/archive/planning/coach-app-benchmark-and-improvement-20260425.md`
> - `.docs/sitemap/coach-app.md`
> - `src/app/coach/layout.tsx`
> - `src/app/coach/dashboard/page.tsx`
> - `src/app/coach/schedule/page.tsx`
> - `src/app/coach/members/page.tsx`
> - `src/app/coach/profile/page.tsx`
> - `supabase/migrations/20260221000000_coach_feature_enhancement.sql`
> - `.docs/database/schema/002_rls_policies.sql`

---

## 1. 목적

본 문서는 상위 기획서에서 정의한 코치앱 개선안 중 `P0` 범위를 실제 개발 착수 가능한 수준으로 세분화한 실행 명세서다.

이번 P0의 목표는 아래 4가지만 확실히 닫는 것이다.

1. **코치 컨텍스트를 서버 권한 기준으로 정리**
2. **세션 운영 보드의 최소 기능 구현**
3. **출결 상태를 운영 가능한 수준으로 확장**
4. **미연결/미배정 코치 상태를 제품 상태로 분리**

즉, 이번 단계는 코치앱을 “더 많은 기능이 있는 앱”으로 만드는 단계가 아니라,
**오늘 수업 운영이 꼬이지 않는 앱**으로 만드는 단계다.

---

## 2. P0 범위 정의

### 2.1 포함 범위

- `auth.uid()` 기반 코치 컨텍스트 RPC 도입
- `Dashboard` / `Schedule`의 P0 리팩토링
- 세션 운영 보드(`Session Operations Board`) 1차 구현
- 출결 결과 상태 확장
- 미연결/미배정 상태 화면 도입
- Members 화면의 기본 권한/범위 정렬

### 2.2 제외 범위

아래는 **P1 또는 P2로 넘긴다**.

- 클래스 런시트 템플릿 시스템
- member alert flags 신규 테이블
- follow-up task
- KPI/리텐션/예상 정산 대시보드 확장
- 정산 실행 / 정산 상태 변경 / 운영용 CSV 다운로드
- Screen Mode / Class Board
- Benchmark / PR / Habit tracking
- Race 퍼포먼스 일반화

### 2.3 P0 완료 기준

아래 조건이 모두 충족되면 P0 완료로 본다.

1. 코치앱에서 `user_id`, `coach_user_id`를 직접 넘기는 핵심 RPC가 제거된다.
2. 코치는 `Dashboard -> Schedule -> 세션 운영 보드` 흐름으로 출결을 처리할 수 있다.
3. `waitlist`, `checked_in`, `no_show`, `late_cancel`, `coach_excused` 정도의 최소 운영 상태를 다룰 수 있다.
4. 미연결 코치는 빈 화면이 아니라 전용 상태 화면을 본다.

---

## 3. 현재 구현 기준 문제점

### 3.1 현재 파일별 핵심 문제

| 파일 | 현재 문제 |
|---|---|
| `src/app/coach/layout.tsx` | 미연결 코치 상태를 배너만으로 처리 |
| `src/app/coach/dashboard/page.tsx` | `fn_get_coach_dashboard(p_user_id)` 호출에 의존 |
| `src/app/coach/schedule/page.tsx` | 대시보드 RPC + 직접 쿼리 혼합, 세션 운영 보드 부재, 출결 상태가 단순함 |
| `src/app/coach/members/page.tsx` | 기본값이 전체 회원 중심이며 권한 계층이 약함 |
| `src/app/coach/profile/page.tsx` | 코치 컨텍스트 상태 분리가 없어 linked/unlinked 개념이 약함 |
| `supabase/migrations/20260221000000_coach_feature_enhancement.sql` | 코치 RPC가 클라이언트 전달 ID에 의존 |

### 3.2 현재 RPC 구조의 핵심 한계

| 함수 | 한계 |
|---|---|
| `fn_get_coach_dashboard(p_user_id)` | 서버가 아닌 클라이언트 입력 기준으로 코치 식별 |
| `fn_get_session_attendees(p_session_id)` | “이 세션이 내 세션인가”를 충분히 닫아주지 못함 |
| `fn_coach_mark_attendance(..., p_coach_user_id)` | 출석 처리 권한이 서버 일관성 있게 설계되지 않음 |

### 3.3 현재 UI 흐름의 핵심 한계

현재는 코치가 수업 운영을 하려면:

1. Dashboard에서 세션 클릭
2. Schedule로 이동
3. 참석자 로드
4. 개별 체크인

정도까지는 가능하지만, 아래가 부족하다.

- 세션 위험 요소 요약
- 일괄 출결 처리
- no-show / late-cancel 처리
- 대기 승급
- 코치 상태별 진입 제어

---

## 4. P0 설계 원칙

### 4.1 서버 권한 우선

- 모든 코치 컨텍스트는 `auth.uid()` 기반으로 찾는다.
- 클라이언트는 코치 식별자 전달 책임을 가지지 않는다.

### 4.2 세션 단위 운영

- Dashboard와 Schedule은 모두 결국 `세션 운영 보드`로 연결되어야 한다.
- 코치가 실제 작업하는 최소 단위는 `세션`이다.

### 4.3 출결 상태와 출석 이벤트 분리

- `checkins`는 실제 출석 이벤트 증거 데이터로 유지
- `bookings.attendance_outcome`은 운영 판정 상태로 사용

즉:

- 누가 실제 체크인했는가 = `checkins`
- 누가 no-show / late cancel / excused였는가 = `bookings`

### 4.4 신규 도입은 최소화

P0에서는 테이블을 대폭 늘리지 않는다.  
핵심은 기존 구조를 정리해서 운영 가능한 수준으로 만드는 것이다.

---

## 5. P0 데이터 모델 변경안

## 5.1 `bookings` 확장

### 목적

예약 상태와 운영 결과를 분리해서 기록하기 위함

### 권장 추가 컬럼

| 컬럼 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `attendance_outcome` | TEXT | `pending` | `pending`, `checked_in`, `no_show`, `late_cancel`, `coach_excused`, `walk_in` |
| `attendance_marked_at` | TIMESTAMPTZ | `NULL` | 코치/시스템이 최종 판정한 시각 |
| `attendance_marked_by` | UUID | `NULL` | 처리한 사용자 |
| `waitlist_promoted_at` | TIMESTAMPTZ | `NULL` | waitlist에서 승급된 시각 |
| `cancel_reason` | TEXT | `NULL` | 취소/예외 처리 사유 |

### 설계 주의사항

1. 기존 `bookings.status`는 예약 상태로 유지한다.
2. `attendance_outcome`은 수업 종료 전후의 운영 결과를 담는다.
3. 기존 `checkins` 데이터와 충돌하지 않도록, 체크인 성공 시 `attendance_outcome='checked_in'`을 함께 반영한다.

## 5.2 `session_coaches` 확장

### 목적

lead / assistant 표시와 운영 보드 헤더 표현을 위한 최소 정보 확보

### 권장 추가 컬럼

| 컬럼 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `assignment_role` | TEXT | `lead` | `lead`, `assistant` |
| `display_order` | INT | `0` | 다중 코치 표시 순서 |

## 5.3 신규 테이블 도입 여부

P0에서는 신규 테이블을 **가능하면 도입하지 않는다**.

이유:

- 권한 모델 정리와 세션 운영 보드 도입만으로도 작업량이 큼
- 플래그 / follow-up / runbook은 P1에서도 충분히 분리 구현 가능

즉, 이번 단계는 아래만 우선 정리한다.

- `bookings`
- `session_coaches`
- 코치용 RPC

---

## 6. P0 RPC 설계

## 6.1 `fn_get_my_coach_context()`

### 목적

현재 로그인 사용자의 코치 연결 상태를 단일 함수로 판단한다.

### 반환해야 하는 상태

| 필드 | 설명 |
|---|---|
| `status` | `unlinked`, `linked_unassigned`, `linked_active`, `on_leave` |
| `coach_id` | 연결된 경우 코치 ID |
| `coach_name` | 코치 표시명 |
| `facility_ids` | 배정된 지점 목록 또는 주 지점 |
| `has_assignments` | 활성 배정 여부 |

### 사용 위치

- `src/app/coach/layout.tsx`
- `Dashboard`
- `Schedule`
- `Members`
- `Profile`

### 응답 예시

```json
{
  "success": true,
  "status": "linked_active",
  "data": {
    "coach_id": "uuid",
    "coach_name": "홍길동",
    "has_assignments": true
  },
  "error": null
}
```

## 6.2 `fn_get_my_coach_dashboard()`

### 목적

Dashboard에 필요한 모든 요약 정보를 반환한다.

### 포함 데이터

- 오늘 세션 목록
- 다음 세션
- 오늘 총 예약 수
- 오늘 총 체크인 수
- 이번 주 세션 수
- 운영 위험 요약
  - waitlist count
  - unchecked confirmed count
  - session starting soon count

### 대체 대상

- `fn_get_coach_dashboard(p_user_id)`

## 6.3 `fn_get_coach_schedule(p_from DATE, p_to DATE)`

### 목적

현재 코치의 기간별 스케줄과 세션별 집계 정보를 반환한다.

### 포함 데이터

- 세션 기본 정보
- 예약/체크인/대기 수
- attendance_outcome 요약
- race linked 여부

### 대체 대상

- `schedule/page.tsx` 안의 `session_coaches -> sessions -> bookings/checkins` 직접 조회 조합

## 6.4 `fn_get_coach_session_board(p_session_id UUID)`

### 목적

세션 운영 보드의 단일 데이터 소스 역할

### 포함 데이터

- 세션 헤더
- 담당 코치 목록
- 예약 인원
- 참석자 리스트
  - booking status
  - attendance outcome
  - checked_in 여부
- 운영 요약
  - confirmed / waitlisted / checked_in / no_show / late_cancel 수

### 권한 규칙

- 현재 로그인 코치가 해당 세션에 배정된 경우만 반환
- 아니면 `forbidden` 반환

## 6.5 `fn_mark_session_attendance(p_session_id UUID, p_member_id UUID, p_action TEXT)`

### 목적

개별 출결 처리 단일 함수

### 허용 액션

- `checked_in`
- `no_show`
- `late_cancel`
- `coach_excused`

### 동작 규칙

#### `checked_in`

- booking 존재 확인
- 이미 체크인 없으면 `checkins` insert
- booking `attendance_outcome='checked_in'` 업데이트

#### `no_show` / `late_cancel` / `coach_excused`

- booking `attendance_outcome` 업데이트
- `attendance_marked_at`, `attendance_marked_by` 반영

## 6.6 `fn_bulk_mark_session_attendance(p_session_id UUID, p_payload JSONB)`

### 목적

체크인/미체크인 일괄 처리

### P0 허용 범위

- 다건 `checked_in`
- 다건 `no_show`

복잡한 부분 성공 처리까지 포함하되, UI는 1차에서 단순하게 사용해도 된다.

---

## 7. DB 마이그레이션 작업 명세

### 권장 마이그레이션 파일명

- `supabase/migrations/20260425120000_coach_p0_session_ops.sql`

### 포함 작업

1. `bookings` 컬럼 추가
2. `attendance_outcome` 기본값 백필
3. `session_coaches` 컬럼 추가
4. 신규 RPC 생성
5. 기존 RPC deprecate 주석 또는 유지 여부 결정

### 하위 호환성 방안

1. 기존 RPC는 즉시 삭제하지 않는다.
2. 프론트 전환 완료 후 제거 또는 v1/v2 정리
3. 기존 데이터에는 `attendance_outcome='pending'`로 백필

---

## 8. 프론트엔드 실행 명세

## 8.1 신규 컴포넌트 제안

### `src/components/coach/CoachStateGate.tsx`

목적:

- 코치 상태를 읽고 화면을 분기

담당 역할:

- `unlinked` -> 연결 요청 화면
- `linked_unassigned` -> 배정 대기 화면
- `linked_active` -> 실제 children 렌더
- `on_leave` -> 제한된 안내 화면

### `src/components/coach/CoachStateScreen.tsx`

목적:

- 미연결/미배정/휴직 상태 공통 UI

### `src/components/coach/SessionOperationsBoard.tsx`

목적:

- 세션 운영 보드 메인 패널

포함 블록:

- 세션 헤더
- 운영 요약 통계
- 참석자 리스트
- 빠른 액션 바

### `src/components/coach/AttendanceOutcomeChip.tsx`

목적:

- `pending`, `checked_in`, `no_show`, `late_cancel`, `coach_excused` 시각화

## 8.2 `src/app/coach/layout.tsx`

### 현재 문제

- `CoachUnlinkedBanner`만 있고 진짜 상태 제어가 없음

### 변경 작업

1. 레이아웃 진입 시 `fn_get_my_coach_context()` 호출
2. `CoachStateGate` 적용
3. 배너는 제거하거나 보조 정보로 축소

### 결과

- 빈 화면/부분 기능 제한 대신 상태 기반 진입 제어가 가능해진다.

## 8.3 `src/app/coach/dashboard/page.tsx`

### 현재 문제

- `fn_get_coach_dashboard(p_user_id)` 의존
- 단순 숫자 카드 중심

### 변경 작업

1. `fn_get_my_coach_dashboard()`로 교체
2. 오늘 세션 목록에서 운영 위험 요약 표시
3. 현재/다음 세션 CTA를 `세션 운영 보드` 진입으로 정렬

### P0에서 추가할 정보

- waitlist 수
- 체크인 미완료 확정 예약 수
- 곧 시작할 세션 강조

## 8.4 `src/app/coach/schedule/page.tsx`

### 현재 문제

- 대시보드 RPC + 직접 테이블 조회 혼합
- 세션 상세가 사실상 단순 모달
- 출결 액션이 `checked_in` 단일 위주

### 변경 작업

1. 스케줄 로딩을 `fn_get_coach_schedule()`로 교체
2. 세션 클릭 시 `fn_get_coach_session_board()` 호출
3. 모달 내용을 `SessionOperationsBoard` 중심으로 리팩터
4. 개별 출결 액션 추가
   - 체크인
   - 노쇼
   - 지각취소
   - 예외처리
5. 일괄 처리 버튼 추가
   - 전체 체크인
   - 미도착자 no_show 처리

### P0에서 유지할 것

- 일간/주간 뷰
- WOD 텍스트 수정

### P0에서 하지 않을 것

- 구조화된 runbook 편집
- member flag UI

## 8.5 `src/app/coach/members/page.tsx`

### 현재 문제

- 기본값이 사실상 전체 회원 뷰
- 권한 계층이 불명확

### 변경 작업

1. 기본 필터를 `my`로 변경 검토
2. `시설 전체 검색`은 유지하되 상세 노출은 제한
3. 코치 상태가 `unlinked` 또는 `linked_unassigned`면 읽기 범위를 축소

### P0 목표

- Members 화면을 완전히 재설계하지 않고, 권한 혼선을 줄이는 수준까지 정리

## 8.6 `src/app/coach/profile/page.tsx`

### 변경 작업

1. 코치 상태(`linked_active`, `linked_unassigned`, `on_leave`) 배지 표시
2. linked 상태가 아니면 일부 운영 통계 영역 숨김 또는 안내 문구 처리

### P0 목표

- Profile을 KPI 화면으로 확장하는 것이 아니라, 상태 일관성을 맞추는 수준

---

## 9. 파일별 작업 목록

### DB / SQL

- `supabase/migrations/20260425120000_coach_p0_session_ops.sql` 신규

### 프론트 수정

- `src/app/coach/layout.tsx`
- `src/app/coach/dashboard/page.tsx`
- `src/app/coach/schedule/page.tsx`
- `src/app/coach/members/page.tsx`
- `src/app/coach/profile/page.tsx`

### 프론트 신규 생성 권장

- `src/components/coach/CoachStateGate.tsx`
- `src/components/coach/CoachStateScreen.tsx`
- `src/components/coach/SessionOperationsBoard.tsx`
- `src/components/coach/AttendanceOutcomeChip.tsx`

### 문서 동기화

- `.docs/planning/coach-app-benchmark-and-improvement-20260425.md`
- `.docs/sitemap/coach-app.md`
- `.docs/project-blueprint.md` (필요 시 Active Context만 업데이트)

---

## 10. 구현 순서 권장안

### Step 1. DB/RPC 먼저

이유:

- 프론트 구조를 바꾸기 전에 데이터 계약을 먼저 고정해야 함

작업:

1. `bookings` 확장
2. `session_coaches` 확장
3. 신규 RPC 작성
4. 권한 검증 테스트

### Step 2. 레이아웃 상태 분기

이유:

- 미연결 코치 상태를 먼저 닫아야 이후 화면 개발이 단순해짐

작업:

1. `CoachStateGate`
2. `CoachStateScreen`
3. `layout.tsx` 교체

### Step 3. Schedule 중심 구현

이유:

- 실질적인 운영 핵심은 Schedule/세션 보드이기 때문

작업:

1. `fn_get_coach_schedule` 연동
2. `SessionOperationsBoard` 구현
3. 출결 액션 버튼 반영

### Step 4. Dashboard 정리

이유:

- 세션 운영 진입 UX를 마지막에 연결하면 흐름이 깔끔해짐

작업:

1. `fn_get_my_coach_dashboard` 연동
2. 운영 위험 요약 표시
3. 다음 세션 CTA 정렬

### Step 5. Members/Profile 최소 정합성 정리

이유:

- P0의 핵심은 아니지만 상태/권한 혼선을 줄여야 함

---

## 11. 테스트 체크리스트

### 권한 테스트

- [ ] 미연결 코치 로그인 시 연결 요청 화면이 보인다
- [ ] 배정 없는 코치 로그인 시 배정 대기 화면이 보인다
- [ ] 다른 코치 세션 ID로 세션 보드 호출 시 거절된다

### 세션 운영 테스트

- [ ] 오늘 세션 목록이 Dashboard에 정상 표시된다
- [ ] Schedule에서 세션 클릭 시 운영 보드가 열린다
- [ ] 참석자 리스트에 booking status + attendance outcome이 보인다

### 출결 테스트

- [ ] 체크인 시 `checkins`가 생성되고 booking outcome이 `checked_in`으로 바뀐다
- [ ] no-show 처리 시 checkin 없이 booking outcome만 변경된다
- [ ] late_cancel / coach_excused 처리 시 이력이 저장된다
- [ ] 일괄 체크인이 동작한다

### 회귀 테스트

- [ ] 기존 WOD 수정 기능이 유지된다
- [ ] Profile 수정/정산 조회가 깨지지 않는다
- [ ] Members의 코칭 노트 CRUD가 유지된다

---

## 12. P0 완료 후 바로 이어질 P1 준비 항목

P0이 끝나면 바로 아래를 이어서 진행하는 것이 좋다.

1. `class_runbook_templates`
2. `session_runbooks`
3. `member_alert_flags`
4. `coach_followups`

이 순서가 적절한 이유는,
P0에서 이미 세션 운영 보드와 코치 상태 모델이 잡히기 때문이다.

즉 P1은 새로운 제품 방향을 만드는 단계가 아니라,  
P0 보드 위에 운영 품질 정보를 얹는 단계다.

---

## 13. 최종 권고

P0는 “큰 리디자인”처럼 보이지만 사실 핵심은 단순하다.

- **서버가 코치를 식별하게 만들고**
- **세션 단위 운영 보드를 만들고**
- **출결 상태를 운영 현실에 맞게 넓히는 것**

여기까지만 안정적으로 완료해도 BCL 코치앱은
현재의 “기능은 있지만 운영 흐름이 약한 상태”에서
**현장 수업을 안정적으로 운영할 수 있는 상태**로 올라간다.

---

## 14. Planning Log

- 2026-04-25: 상위 기획서 기반 P0 범위 구체화, DB/RPC/UI 변경 항목 및 파일별 실행 명세 작성
