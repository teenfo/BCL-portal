# BCL Portal – 코치앱 통합 마스터 플랜

> **Status**: Approved
> **Author**: Codex (Product / Architect / Execution 통합 관점)
> **Created**: 2026-04-25
> **Last Updated**: 2026-04-25
> **Related**:
> - `.docs/project-blueprint.md`
> - `.docs/sitemap/coach-app.md`
> - `.docs/archive/planning/coach-app-benchmark-and-improvement-20260425.md`
> - `.docs/archive/planning/coach-app-p0-execution-20260425.md`
> - `.docs/archive/planning/coach-app-p1b-kpi-settlement-execution-20260425.md`
> - `.docs/archive/planning/coach-feature-enhancement.md`
> - `.docs/archive/planning/coach-account-architecture.md`
> - `.docs/archive/planning/race-system-improvement-20260425.md`
> - `src/app/coach/**/*`
> - `src/app/admin/operations/coaches/page.tsx`
> - `src/components/layout/CoachBottomNav.tsx`
> - `supabase/migrations/20260221000000_coach_feature_enhancement.sql`
> - `.docs/database/schema/001_initial_schema.sql`
> - `.docs/database/schema/002_rls_policies.sql`

---

## 1. 문서 목적

본 문서는 코치앱 관련 후속 기획을 분리 문서가 아닌 **하나의 실행 기준 문서**로 통합한 마스터 플랜이다.

이 문서의 역할은 다음과 같다.

1. 외부 벤치마크와 현재 BCL 코치앱 감사를 한 번에 이해할 수 있게 한다.
2. `Priority 22 ~ Priority 25` 전체 범위를 한 흐름으로 정리한다.
3. 각 우선순위별로 `문제`, `목표`, `범위`, `DB`, `RPC`, `화면`, `권한`, `수용 기준`, `테스트`를 바로 확인할 수 있게 한다.

이 문서가 승인되면, 코치앱 후속 개발의 SSOT는 이 문서로 본다.  
기존 분리 문서는 세부 검토 이력과 보조 참고 자료로 유지하되, 구현 우선순위 판단과 범위 관리는 본 문서를 우선한다.

---

## 2. 요약 결론

현재 BCL 코치앱은 `수업 중 운영` 기능은 이미 어느 정도 갖춰져 있다.

- `Dashboard`
- `Schedule`
- `Members`
- `Race`
- `Profile`
- `Race Control`

특히 `Race Control`은 시장의 일반적인 그룹운동 코치앱보다 강한 차별점이다.  
문제는 코치앱이 아직 `운영 OS`보다는 `기능 묶음`에 더 가깝다는 점이다.

현장 코치의 실제 업무는 아래 4단계로 이어진다.

1. 수업 전: 누가 오는지, 누가 위험한지, 누가 첫 방문인지 파악
2. 수업 중: 출결 확정, 런시트 수행, Race 또는 WOD 운영
3. 수업 후: 코칭 기록, 후속 액션, 재방문/재등록 리스크 관리
4. 월간: KPI, 리텐션 기여, 예상 정산, 확정 정산 조회

현재 BCL은 `2단계`는 상대적으로 강하지만 `1, 3, 4단계`가 약하다.  
따라서 후속 기획의 중심은 단순 기능 추가가 아니라 아래 전환에 있다.

- `기능형 코치앱` -> `세션 중심 운영 앱`
- `화면별 CRUD` -> `운영 흐름 중심 제품`
- `클라이언트 신뢰형 권한` -> `서버 권한 기반 제품`
- `Race 단일 강점` -> `수업 운영 + 퍼포먼스 + 후속 관리 통합`

---

## 3. 벤치마크 요약

### 3.1 비교 대상

| 카테고리 | 제품 | 평가 포인트 |
|---|---|---|
| Functional Fitness | `Wodify` | 체크인, 회원 프로필, 코치 노트, 현장 운영 동선 |
| Functional Fitness | `SugarWOD` | WOD 라이브러리, 클래스 런시트, 수업 표준화 |
| Functional Fitness | `PushPress` | PR/Benchmark, Screen Mode, 현장 정보 패널 |
| Boutique Franchise | `F45` | 예약-대기-챌린지-리더보드-운동 후 리포트 연결 |
| Korea Team Training | `팀버핏`, `버핏그라운드` | 주간 스케줄, 미출결, 만기회원, 재등록, 예상 급여 등 실무 지표 |

### 3.2 핵심 인사이트

| 제품 | 강점 | BCL 시사점 |
|---|---|---|
| `Wodify` | 체크인과 회원 맥락이 한 화면에서 닫힘 | 세션 직전 판단 정보가 Session Board로 모여야 함 |
| `SugarWOD` | warm-up, scaling, cue 등 런시트 표준화 | 코치 개인 편차를 줄이는 클래스 템플릿 필요 |
| `PushPress` | Screen 기반 참석 모드, PR, trial/birthday 노출 | 참석자 명단이 아니라 운영 정보 패널이 필요 |
| `F45` | 챌린지, 퍼포먼스, 운동 후 리포트 연결 | Race를 일반 수업 퍼포먼스와 연결해야 함 |
| `팀버핏/버핏그라운드` | 미출결, 만기 예정, 재등록, 예상 급여 요구가 강함 | 코치 KPI, 재등록 리스크, 예상 정산은 실무 핵심 기능임 |

### 3.3 벤치마크로부터 확정되는 제품 방향

1. 코치앱은 단순 예약 조회 앱이 아니라 `세션 운영 허브`여야 한다.
2. 수업 품질은 코치 개인 역량이 아니라 `런시트와 템플릿`으로 표준화되어야 한다.
3. 회원 리스트는 단순 명단이 아니라 `현장 판단 패널`이어야 한다.
4. 정산은 Coach 앱에서도 중요하지만, `운영 권한`은 Admin에 남기고 Coach는 `조회 전용`으로 설계해야 한다.
5. Race는 분리된 특수 기능이 아니라 `수업 운영 -> 결과 기록 -> 퍼포먼스 이력`의 일부가 되어야 한다.

---

## 4. 현재 BCL 코치앱 감사 결과

### 4.1 현재 강점

- `Schedule`에서 세션 단위 흐름이 이미 존재한다.
- `Members`에서 코칭 노트와 출석 통계를 일부 다룬다.
- `Profile`에서 월별 정산 조회가 가능하다.
- `Race Control`이 실시간 제어 수준까지 구현돼 있다.

### 4.2 현재 구조 리스크

| 구분 | 현재 문제 | 영향 |
|---|---|---|
| 권한 | 일부 RPC가 `p_user_id`, `p_coach_user_id` 등 클라이언트 전달 식별자에 의존 | 권한 경계가 서버 기준으로 닫히지 않음 |
| 회원 범위 | 문서, RLS, UI의 회원 가시 범위가 일관되지 않음 | 코치가 누구까지 볼 수 있는지 판단이 흔들림 |
| Race IA | `/coach/race`와 `/coach/race/control`이 분리 | 수업 운영 동선이 끊김 |
| 상태머신 | `미연결/미배정 코치`가 제품 상태가 아니라 배너 수준 | 빈 화면, 조용한 실패, 운영 혼선 발생 |
| 운영 흐름 | 수업 전/후/월간 맥락이 약함 | 코치앱이 현장 운영 도구로 완성되지 못함 |

### 4.3 현재 부족한 기능 축

1. 세션 전 운영 정보 요약
2. 운영 가능한 출결 상태 체계
3. 수업 표준화용 런시트
4. 회원 컨텍스트 플래그
5. 재등록/리텐션/KPI
6. 예상 정산
7. Screen Mode
8. 일반 수업 퍼포먼스 기록
9. 수업 후 follow-up
10. Race 재통합

---

## 5. 제품 북극성

코치앱의 최종 방향은 아래 한 문장으로 정리한다.

> **BCL 코치앱은 코치가 하루의 수업을 준비하고, 운영하고, 기록하고, 후속 관리하고, 월간 성과를 확인하는 운영 OS가 되어야 한다.**

이를 위해 제품 원칙을 다음처럼 고정한다.

### 5.1 설계 원칙

1. **세션 중심**
   - 코치의 핵심 작업 단위는 페이지가 아니라 `세션`이다.
2. **서버 권한 우선**
   - 코치 식별과 가시 범위는 항상 `auth.uid()` 기준이다.
3. **운영 상태 분리**
   - `checkins`는 사실 기록, `attendance_outcome`은 운영 판정 상태로 분리한다.
4. **런시트 표준화**
   - 수업 품질은 템플릿으로 관리한다.
5. **민감 정보 최소 공개**
   - Screen Mode와 Coach 내부 화면의 정보 범위는 명확히 분리한다.
6. **Admin / Coach 책임 분리**
   - Admin은 운영/회계, Coach는 조회/수행 역할을 가진다.
7. **Race 통합**
   - Race는 코치앱의 별도 섬이 아니라 퍼포먼스 시스템의 일부다.

---

## 6. 목표 정보구조와 상태 모델

### 6.1 코치앱 핵심 탭 역할

| 탭 | 목표 역할 |
|---|---|
| `Dashboard` | 오늘 운영 위험, KPI, 후속 액션, 곧 시작할 세션 요약 |
| `Schedule` | 세션 운영 허브와 런시트 진입 |
| `Members` | 회원 프로필, 플래그, 출석 패턴, 코칭 노트, follow-up |
| `Race` | Live / History / Devices 허브, 세션 기반 Race 진입 |
| `Profile` | 코치 상태, KPI, 예상 정산, 확정 정산, 개인 메타 |

### 6.2 코치 상태머신

| 상태 | 의미 | 허용 범위 |
|---|---|---|
| `unlinked` | `auth.users`는 있으나 coach 연결 없음 | 안내 화면만 노출 |
| `linked_unassigned` | coach 레코드는 있으나 활성 세션/배정 부족 | 제한 모드 + 안내 |
| `linked_active` | 정상 운영 가능한 코치 | 전체 Coach 앱 기능 |
| `on_leave` | 재직 중이나 현재 휴면/휴직 상태 | 조회 제한 + 안내 |

### 6.3 회원 가시 범위 원칙

1. 기본 스코프는 `내 수업 회원`이다.
2. `시설 전체 검색`은 정책상 허용된 필드만 제한적으로 노출한다.
3. 민감 정보는 세션 참여 맥락 또는 명시 권한이 있을 때만 노출한다.

### 6.4 Admin / Coach 정산 책임 분리

| 기능 | Admin | Coach |
|---|---|---|
| 단가 설정 | 가능 | 불가 |
| 월 정산 실행 | 가능 | 불가 |
| 정산 상태 변경 | 가능 | 불가 |
| CSV 다운로드 | 가능 | 불가 |
| 본인 예상 정산 조회 | 참고 가능 | 가능 |
| 본인 확정 정산 조회 | 가능 | 가능 |
| 계산식 보기 | 가능 | 가능 |

정산 원칙은 아래처럼 고정한다.

- `coach_settlements` = 확정 정산 스냅샷
- Coach의 `예상 정산` = 별도 Basis Layer 집계 결과
- Coach 화면 = read-only
- Admin 화면 = 운영/회계 처리

---

## 7. 통합 로드맵 개요

| Priority | 단계 | 핵심 목표 | 선행 조건 |
|---|---|---|---|
| `22` | `P0` | 권한 하드닝, 세션 운영 보드, 출결 상태 확장, 코치 상태 게이트 | 없음 |
| `23` | `P1-A` | 클래스 런시트, 템플릿, 회원 컨텍스트 플래그 | Priority 22 권장 완료 |
| `24` | `P1-B` | KPI, 리텐션, 예상 정산, Screen Mode | Priority 22 완료 권장 |
| `25` | `P2` | 퍼포먼스 일반화, follow-up, Race 재통합 | Priority 22 완료 권장 |

이 네 단계는 분리된 기능 추가가 아니라 같은 제품 방향의 순차 확장이다.

---

## 8. Priority 22 – P0 운영 안정화

### 8.1 목표

이번 단계의 목적은 코치앱을 “더 많은 기능이 있는 앱”으로 만드는 것이 아니라,  
**오늘 수업 운영이 꼬이지 않는 앱**으로 만드는 것이다.

핵심 목표는 아래 4가지다.

1. 서버 권한 기준으로 코치 컨텍스트 재정의
2. `Session Operations Board` 도입
3. 운영 가능한 출결 상태 체계 도입
4. 미연결/미배정 코치를 제품 상태로 분리

### 8.2 포함 범위

- `auth.uid()` 기반 코치 컨텍스트 RPC
- `Dashboard`, `Schedule`의 P0 리팩터링
- 세션 운영 보드 1차 구현
- 출결 상태 확장
- `CoachStateGate`, `CoachStateScreen`
- `Members` 기본 스코프 정렬
- `Profile` 상태 배지/안내

### 8.3 제외 범위

- 클래스 템플릿
- 신규 member alert table
- KPI/예상 정산
- Screen Mode
- Benchmark / PR / Habit
- follow-up
- Race 통합 구조 개편
- 정산 실행 / 정산 상태 변경 / CSV

### 8.4 데이터 모델 변경

#### `bookings` 확장

추가 권장 컬럼:

- `attendance_outcome`
- `attendance_marked_at`
- `attendance_marked_by`
- `waitlist_promoted_at`
- `cancel_reason`

의미는 다음처럼 분리한다.

- `checkins`: 실제 출석 이벤트 증거
- `bookings.attendance_outcome`: 운영 판정 상태

권장 outcome 집합:

- `checked_in`
- `pending`
- `waitlist`
- `no_show`
- `late_cancel`
- `coach_excused`

#### `session_coaches` 확장

추가 권장 컬럼:

- `assignment_role`
- `display_order`

### 8.5 P0 RPC 계약

신규 RPC 6종을 기준선으로 삼는다.

1. `fn_get_my_coach_context()`
2. `fn_get_my_coach_dashboard()`
3. `fn_get_coach_schedule(p_from DATE, p_to DATE)`
4. `fn_get_coach_session_board(p_session_id UUID)`
5. `fn_mark_session_attendance(p_session_id UUID, p_member_id UUID, p_action TEXT)`
6. `fn_bulk_mark_session_attendance(p_session_id UUID, p_payload JSONB)`

핵심 원칙:

- 서버에서 `auth.uid()`로 coach를 찾는다.
- 클라이언트는 `coach_id`, `user_id`를 권한 식별용으로 넘기지 않는다.
- 세션 Board RPC는 “이 세션이 이 코치에게 허용되는가”를 먼저 검증해야 한다.

### 8.6 화면 설계

#### `layout.tsx`

- `CoachStateGate`로 전체 진입을 감싼다.
- `unlinked`, `linked_unassigned`, `on_leave`는 전용 상태 화면으로 분기한다.

#### `Dashboard`

- 오늘 세션 수
- `곧 시작`
- `unchecked confirmed`
- `waitlist`
- 오늘 위험 회원 요약

#### `Schedule`

- 세션 리스트는 모두 `fn_get_coach_schedule()` 기반
- 세션 클릭 시 `SessionOperationsBoard` open

#### `Session Operations Board`

반드시 포함할 블록:

1. 세션 헤더
2. 운영 요약
3. 참석자 리스트
4. 빠른 액션 바

세션 헤더 필드:

- 클래스명
- 시간
- 담당 코치
- 예약/출석/대기 상태 요약
- WOD 존재 여부

운영 요약 필드:

- `confirmed but unchecked`
- `waitlist`
- `trial`
- `주의회원`
- `만기 예정`

빠른 액션:

- 개별 체크인
- 개별 `no_show`
- 개별 `late_cancel`
- 개별 `coach_excused`
- 일괄 출결 처리

#### `Members`

- 기본 정렬은 `내 수업 회원`
- 전체 검색은 정책에 맞는 최소 필드로 제한

#### `Profile`

- 코치 상태 배지
- 상태별 안내 문구
- 기존 확정 정산 조회 유지

### 8.7 구현 순서

1. DB 컬럼 추가와 RLS 보강
2. 신규 RPC 도입
3. `CoachStateGate`와 공통 컴포넌트 구현
4. Schedule + Session Board 연결
5. Dashboard / Members / Profile 정리
6. 회귀 테스트

### 8.8 P0 수용 기준

1. 코치앱 핵심 권한 RPC가 클라이언트 식별자에 의존하지 않는다.
2. 코치는 Dashboard에서 세션으로 진입해 출결을 끝낼 수 있다.
3. `checked_in`, `waitlist`, `no_show`, `late_cancel`, `coach_excused`를 처리할 수 있다.
4. 미연결 코치는 빈 화면이 아니라 제품 상태 화면을 본다.

### 8.9 P0 테스트 체크리스트

- linked/unlinked/on_leave 상태 분기 확인
- 자기 세션이 아닌 세션 Board 접근 차단
- 개별 출결, 일괄 출결 정상 처리
- waitlist 상태 표시
- 기존 WOD 수정 기능 회귀
- 코칭 노트 회귀
- Profile 정산 조회 회귀

---

## 9. Priority 23 – P1-A 수업 표준화 및 회원 컨텍스트

### 9.1 목표

P0 이후에도 코치는 여전히 “오늘 수업을 어떻게 운영할지”를 머릿속으로 해결해야 한다.  
P1-A의 목표는 수업 준비와 현장 판단을 시스템화하는 것이다.

핵심 목표:

1. 클래스 런시트 템플릿 도입
2. 세션별 런시트 오버라이드 지원
3. Coach/Admin/Class Display가 공유하는 공통 WOD 자산 도입
4. 회원 컨텍스트 플래그 체계 도입

### 9.2 포함 범위

- `class_runbook_templates`
- `session_runbooks`
- `movement_library`
- `wod_templates`
- `wod_template_movements`
- `session_wods`
- `member_alert_flags`
- Schedule / Session Board 런시트 편집
- Admin Schedule / Coach Schedule 공통 WOD 편집기
- `/class/wod` 공개 화면의 공통 데이터 소스 전환
- Member 컨텍스트 패널
- Dashboard 오늘 경고 요약

### 9.3 WOD 기능 재평가

현재 WOD 기능은 아래 이유로 재설계가 필요하다.

1. `Admin`과 `Coach`가 같은 개념을 다루지만 둘 다 `sessions.wod_description` 자유 텍스트를 직접 수정하는 수준에 머물러 있다.
2. `/class/wod`는 별도 `wods` 테이블을 읽는 구조라 세션 운영 WOD와 전광판 WOD가 공유 자산이 아니다.
3. WOD가 문자열이라 `포맷`, `time cap`, `rounds`, `movement line`, `RX/scale`, `coach note`, `display note`를 구조적으로 재사용할 수 없다.
4. `.docs/planning/wod_exercise_list.md`에 이미 235+ 운동과 벤치마크 조합이 정리돼 있지만, 현재는 입력 보조나 라이브러리로 활용되지 않는다.

따라서 P1-A에서는 WOD를 `세션에 붙는 텍스트`가 아니라 아래 구조로 재정의한다.

- `공통 운동 라이브러리`
- `재사용 가능한 WOD 템플릿`
- `세션별 WOD 스냅샷`
- `Admin/Coach 공통 편집 흐름`
- `Class Display 공통 출력 흐름`

### 9.4 데이터 모델

#### 신규 테이블: `class_runbook_templates`

권장 필드:

- `id`
- `gym_id`
- `class_type_id` 또는 동등 식별자
- `name`
- `warmup`
- `movement_prep`
- `scaling_options`
- `coach_cues`
- `safety_notes`
- `finish_notes`
- `is_default`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

추가 권장 필드:

- `default_wod_template_id`

#### 신규 테이블: `session_runbooks`

권장 필드:

- `id`
- `session_id`
- `template_id`
- `warmup_override`
- `movement_prep_override`
- `scaling_override`
- `cue_override`
- `safety_override`
- `finish_note_override`
- `published_at`
- `updated_by`

추가 권장 필드:

- `session_wod_id`

#### 신규 테이블: `movement_library`

목적:

- WOD 편집 시 검색 가능한 공통 운동 사전
- `wod_exercise_list.md`를 초기 seed 데이터로 활용

권장 필드:

- `id`
- `slug`
- `name_ko`
- `name_en`
- `category`
- `equipment`
- `difficulty_level`
- `primary_muscles`
- `coaching_points`
- `source_tag`
- `is_active`
- `created_at`
- `updated_at`

#### 신규 테이블: `wod_templates`

목적:

- Admin/Head Coach가 재사용 가능한 WOD를 템플릿으로 저장
- named benchmark, daily class, skill day, conditioning block을 같은 체계로 관리

권장 필드:

- `id`
- `gym_id`
- `template_kind`
- `title`
- `format_type`
- `time_cap_minutes`
- `rounds`
- `description`
- `public_notes`
- `coach_notes`
- `is_shared`
- `is_benchmark`
- `created_by`
- `updated_by`
- `published_at`
- `created_at`
- `updated_at`

권장 `template_kind`:

- `daily`
- `benchmark`
- `skill`
- `strength`
- `conditioning`

#### 신규 테이블: `wod_template_movements`

목적:

- WOD 템플릿 안의 movement line을 순서대로 저장

권장 필드:

- `id`
- `wod_template_id`
- `sort_order`
- `movement_id`
- `custom_label`
- `target_value`
- `target_unit`
- `distance_meters`
- `duration_seconds`
- `load_male_rx`
- `load_female_rx`
- `rx_notes`
- `scaling_notes`

#### 신규 테이블: `session_wods`

목적:

- 세션별로 실제 게시되는 WOD 스냅샷 저장
- 템플릿을 수정해도 과거/당일 세션 WOD는 불변 유지

권장 필드:

- `id`
- `session_id`
- `template_id`
- `publish_state`
- `source_version`
- `title_override`
- `format_override`
- `time_cap_override`
- `description_override`
- `movements_snapshot`
- `coach_notes`
- `class_display_notes`
- `edited_by`
- `published_by`
- `published_at`
- `updated_at`

권장 `publish_state`:

- `draft`
- `published`
- `archived`

#### 신규 테이블: `member_alert_flags`

권장 필드:

- `id`
- `member_id`
- `flag_type`
- `severity`
- `starts_at`
- `ends_at`
- `note`
- `created_by`
- `resolved_by`
- `resolved_at`

권장 `flag_type`:

- `trial`
- `injury`
- `renewal_due`
- `returning_after_absence`
- `vip_attention`

### 9.5 `wod_exercise_list.md` 활용 전략

`.docs/planning/wod_exercise_list.md`는 WOD 시스템의 seed 원천으로 사용한다.

활용 방식은 아래처럼 고정한다.

1. 운동 목록 표를 `movement_library` seed로 변환한다.
2. `이름있는 WOD 벤치마크 동작 조합` 섹션은 `wod_templates`의 benchmark seed로 변환한다.
3. `카테고리`, `난이도`, `장비`, `코칭포인트`는 검색/필터/추천/스케일링 보조에 사용한다.
4. markdown 수동 복붙이 아니라, 변환 스크립트 또는 seed JSON/SQL로 관리한다.

초기 import 시 최소 매핑 기준:

- `한국어명` -> `name_ko`
- `영어명` -> `name_en`
- `카테고리` -> `category`
- `필요 장비` -> `equipment`
- `난이도` -> `difficulty_level`
- `주요 근육군` -> `primary_muscles`
- `설명/코칭포인트` -> `coaching_points`

### 9.6 P1-A RPC 계약

권장 RPC:

1. `fn_list_runbook_templates(p_class_type_id UUID)`
2. `fn_upsert_runbook_template(...)`
3. `fn_get_session_runbook(p_session_id UUID)`
4. `fn_upsert_session_runbook(p_session_id UUID, p_payload JSONB)`
5. `fn_search_wod_movements(p_query TEXT, p_category TEXT DEFAULT NULL, p_equipment TEXT DEFAULT NULL)`
6. `fn_list_wod_templates(p_scope TEXT DEFAULT 'shared')`
7. `fn_upsert_wod_template(p_payload JSONB)`
8. `fn_get_session_wod(p_session_id UUID)`
9. `fn_upsert_session_wod(p_session_id UUID, p_payload JSONB)`
10. `fn_publish_session_wod(p_session_id UUID)`
11. `fn_get_class_display_wod(p_session_id UUID DEFAULT NULL, p_session_date DATE DEFAULT CURRENT_DATE)`
12. `fn_list_member_alert_flags(p_member_id UUID)`
13. `fn_upsert_member_alert_flag(p_member_id UUID, p_payload JSONB)`
14. `fn_get_member_context_panel(p_member_id UUID)`

### 9.7 화면 설계

#### `Schedule / Session Operations Board`

런시트 탭 구성:

- `Warm-up`
- `Movement Prep`
- `Scaling`
- `Coach Cue`
- `Safety`
- `Finish`

동작 원칙:

- 기본값은 템플릿에서 불러온다.
- 세션에서 오버라이드 가능하다.
- 최근 사용 템플릿을 빠르게 복사할 수 있다.

WOD 편집 원칙:

- 자유 텍스트 직접 입력은 `임시 설명` 보조 수단으로만 남긴다.
- 기본 편집은 `공유 WOD 선택 -> movement line 구성 -> 세션 스냅샷 저장` 흐름으로 전환한다.
- Coach는 세션에 연결된 WOD를 복제 후 세션 한정 오버라이드할 수 있지만, 공통 템플릿 자체를 임의로 덮어쓰지 않는다.

WOD Builder 구성:

- `포맷 선택` (`for_time`, `amrap`, `emom`, `tabata`, `chipper`, `strength`)
- `time cap / rounds`
- `movement search`
- `movement line 순서 편집`
- `RX 중량/반복/거리/칼로리`
- `Scaling 메모`
- `Coach note`
- `Class Display note`

#### `Admin Schedule`

Admin은 아래를 수행할 수 있어야 한다.

- 공유 WOD 템플릿 생성/수정
- 클래스 유형별 기본 WOD 템플릿 연결
- 세션에 WOD 템플릿 배정
- 세션 WOD publish 상태 관리

#### `Coach Schedule / Session Operations Board`

Coach는 아래를 수행할 수 있어야 한다.

- 공유 WOD 템플릿 검색
- 세션용 스냅샷 생성
- 세션 한정 movement line/메모 오버라이드
- publish된 WOD의 현장용 note 수정

#### `/class/wod`

클래스 전광판은 별도 `wods` 테이블이 아니라 `fn_get_class_display_wod()`를 통해
`session_wods.publish_state = 'published'`인 데이터를 읽는다.

즉:

- Admin/Coach가 작성한 WOD
- 코치 운영 보드에서 확인한 WOD
- 클래스 화면에 노출되는 WOD

이 3개가 하나의 원천을 공유해야 한다.

#### `Dashboard`

오늘 경고 요약:

- Trial 회원 수
- 주의회원 수
- 만기 예정 회원 수
- 장기 미복귀 회원 중 오늘 참석 예정 수

#### `Members`

상세 프로필에 추가:

- 활성 플래그
- 최근 코칭 노트
- 최근 출석 패턴
- 최근 세션 참여 클래스

### 9.8 마이그레이션 원칙

1. 기존 `sessions.wod_description`는 즉시 제거하지 않는다.
2. 초기 마이그레이션에서는 `sessions.wod_description`를 `session_wods.description_override` 또는 `movements_snapshot`의 free-text block으로 백필한다.
3. `/class/wod`가 새 소스로 완전히 전환되면 기존 `wods` 테이블 또는 동등 구조는 단계적으로 제거한다.
4. 전환 완료 전까지는 읽기 호환 레이어를 두어 Coach/Admin/Class 화면이 동시에 깨지지 않게 한다.

### 9.9 수용 기준

1. 코치는 세션별 런시트를 저장하고 수정할 수 있다.
2. 기본 템플릿과 세션 오버라이드가 구분된다.
3. Admin에서 만든 WOD 템플릿을 Coach가 세션에 연결해 사용할 수 있다.
4. Coach의 세션 오버라이드는 원본 공유 템플릿을 오염시키지 않는다.
5. `/class/wod`가 Coach/Admin과 동일한 게시 WOD를 표시한다.
6. Trial / injury / renewal_due 등 플래그가 세션과 회원 화면에 노출된다.
7. 권한 없는 코치는 전체 회원 민감 플래그를 볼 수 없다.

### 9.10 테스트 체크리스트

- 템플릿 생성/수정/재사용
- 세션 런시트 오버라이드와 원본 유지
- Admin 생성 WOD -> Coach 연결 -> Class Display 노출 end-to-end 검증
- `wod_exercise_list` seed import 후 운동 검색/필터 검증
- 기존 `sessions.wod_description` 백필 및 회귀 검증
- 플래그 생성/종료/권한별 가시 범위
- Dashboard 경고 요약 집계 정확성

---

## 10. Priority 24 – P1-B KPI / 정산 / Screen Mode

### 10.1 목표

이 단계의 목적은 코치가 `이번 달 내가 어떻게 운영하고 있는지`를 이해하게 만드는 것이다.

핵심 목표:

1. KPI와 리텐션 신호를 구조화
2. 예상 정산과 확정 정산을 분리
3. Screen Mode를 통해 현장 공개 보드 도입

### 10.2 핵심 원칙

1. Admin과 Coach는 같은 계산 원천을 사용한다.
2. `coach_settlements`는 확정 정산 스냅샷이다.
3. Coach 화면은 read-only다.
4. 공개 스크린에는 민감 정보가 노출되지 않는다.

### 10.3 데이터/집계 구조

#### Basis Layer

정산과 KPI의 공통 원천 계층을 도입한다.

권장 핵심 함수:

- `fn_get_coach_monthly_settlement_basis(p_coach_id UUID, p_year_month TEXT)`
- `fn_get_coach_monthly_kpis(p_year_month TEXT)`
- `fn_get_coach_retention_panel(p_year_month TEXT)`

보조 view 또는 동등 RPC:

- `vw_coach_monthly_kpis`
- `vw_member_retention_signals`

#### Basis Layer 반환 권장 항목

- `coach_id`
- `year_month`
- `base_salary`
- `session_allowance`
- `payable_session_count`
- `cancelled_session_count`
- `completed_session_count`
- `expected_total_amount`
- `settlement_snapshot_exists`
- `settlement_snapshot_status`

#### Payable Session Count 규칙

권장 기준:

1. `session_coaches`로 해당 코치가 배정된 세션만 포함
2. 대상 월 내 세션만 포함
3. `sessions.status = 'cancelled'`는 제외
4. 동일 세션 중복 카운트 금지

### 10.4 예상 정산 공식

권장 공식:

`expected_total_amount = base_salary + (payable_session_count * session_allowance)`

원칙:

- 현재 월은 실시간 집계
- 과거 월은 기본적으로 `coach_settlements`를 신뢰

### 10.5 확정 정산 규칙

- 데이터 소스: `coach_settlements`
- 생성 주체: Admin
- 상태값: `pending`, `confirmed`, `paid`
- Coach는 읽기만 가능

### 10.6 KPI 구성

권장 KPI:

- 이번 달 수업 수
- payable session 수
- 출석률
- no-show 비율
- waitlist 전환 수
- 재등록 기여 회원 수
- 만기 예정 담당 회원 수
- 장기 미출석 담당 회원 수
- 예상 정산
- 최근 확정 정산

### 10.7 Screen Mode 설계

#### 목적

- 태블릿/TV에 공개할 운영 보드 제공

#### 표시 가능 항목

- 클래스명
- 시간
- 담당 코치
- 현재 참석 현황
- 오늘 WOD
- 공개 가능한 축하 정보
- 공개 가능한 PR/Benchmark 요약

#### 비노출 항목

- 부상 상세
- 내부 코칭 메모
- 재등록 위험
- 정산 정보
- 민감 플래그 note

### 10.8 화면 반영

#### `Dashboard`

- 오늘 운영 위험 + 월간 KPI Snapshot
- `unchecked confirmed`
- `renewal due`
- `long absence return`
- `expected settlement`

#### `Profile`

- 이번 달 KPI 카드
- 예상 정산 카드
- 확정 정산 이력
- 계산식 설명
- 상태 요약

#### `Screen Mode`

- Session Board와 동일한 데이터 소스를 사용하되 공개 필드만 projection

### 10.9 수용 기준

1. Admin과 Coach의 예상 정산 계산 기초 수치가 일치한다.
2. Coach는 본인 예상/확정 정산을 볼 수 있지만 실행/변경은 할 수 없다.
3. Screen Mode는 세션 운영 데이터와 같은 원천을 사용한다.
4. 공개 화면에 민감 정보가 노출되지 않는다.

### 10.10 테스트 체크리스트

- Admin 계산과 Coach 표시 금액 일치
- cancelled 세션 제외 검증
- snapshot 존재/부재 상태 표기
- read-only 보장
- Screen Mode 민감 정보 차단

---

## 11. Priority 25 – P2 퍼포먼스 / 후속 액션 / Race 재통합

### 11.1 목표

이 단계의 목적은 코치앱을 진짜 운영 OS 수준으로 끌어올리는 것이다.

핵심 목표:

1. 일반 수업 퍼포먼스 기록 체계 도입
2. 수업 후 follow-up 워크플로우 도입
3. Race를 세션 운영 흐름으로 재통합

### 11.2 포함 범위

- Benchmark / PR 기록
- member performance profile
- `coach_followups`
- 후속 액션 생성/완료/기한 관리
- Race IA 재정의
- 세션 -> Race 시작 경로 연결

### 11.3 데이터 모델

#### 신규 테이블: `benchmark_definitions`

권장 필드:

- `id`
- `gym_id`
- `name`
- `metric_type`
- `unit`
- `description`
- `is_active`

#### 신규 테이블: `member_benchmark_results`

권장 필드:

- `id`
- `member_id`
- `benchmark_id`
- `session_id`
- `race_event_id`
- `result_value`
- `result_meta`
- `recorded_by`
- `recorded_at`

#### 신규 테이블: `coach_followups`

권장 필드:

- `id`
- `member_id`
- `session_id`
- `coach_id`
- `followup_type`
- `priority`
- `status`
- `due_date`
- `note`
- `created_at`
- `completed_at`

권장 `followup_type`:

- `injury`
- `trial_conversion`
- `renewal`
- `absence`
- `motivation`

### 11.4 P2 RPC 계약

권장 RPC:

1. `fn_list_benchmark_definitions()`
2. `fn_record_member_benchmark_result(...)`
3. `fn_get_member_performance_profile(p_member_id UUID)`
4. `fn_create_followup(p_payload JSONB)`
5. `fn_complete_followup(p_followup_id UUID)`
6. `fn_get_my_followups()`
7. `fn_prepare_race_session(p_session_id UUID)`

### 11.5 Race 재통합 원칙

`/coach/race`는 아래 구조의 허브로 재정의한다.

- `Live`
- `History`
- `Devices`

세션 운영 흐름은 다음처럼 정리한다.

1. `Schedule`에서 세션 선택
2. Session Board에서 `Race 수업 시작`
3. 필요 시 기존 live event 재개
4. 종료 후 결과를 세션/회원 퍼포먼스에 연결

### 11.6 follow-up 워크플로우

후속 액션 생성 트리거 예:

- trial 참석 후
- no-show 반복
- injury flag 세션 발생
- renewal_due 회원 상담 필요
- 장기 공백 후 복귀

노출 위치:

- `Dashboard`: 미완료 follow-up
- `Members`: 회원별 follow-up 타임라인
- `Session Board`: 세션 후 바로 생성

### 11.7 수용 기준

1. Race 결과 또는 일반 Benchmark 결과가 회원 퍼포먼스 이력에 남는다.
2. 코치는 세션 후 follow-up을 생성하고 완료 처리할 수 있다.
3. Race 진입이 세션 운영 흐름과 연결된다.

### 11.8 테스트 체크리스트

- Benchmark 생성/기록/조회
- Race 결과 -> 퍼포먼스 이력 연결
- follow-up 상태 전환
- due date 기반 정렬
- 세션 없는 직접 Race 접근 정책 확인

---

## 12. 공통 데이터 모델 로드맵

### 12.1 Phase별 테이블/컬럼 변경 요약

| 단계 | 변경 항목 |
|---|---|
| `P0` | `bookings` 확장, `session_coaches` 확장 |
| `P1-A` | `class_runbook_templates`, `session_runbooks`, `movement_library`, `wod_templates`, `wod_template_movements`, `session_wods`, `member_alert_flags` |
| `P1-B` | KPI/정산 Basis Layer, KPI/리텐션 view 또는 RPC |
| `P2` | `benchmark_definitions`, `member_benchmark_results`, `coach_followups` |

### 12.2 공통 RLS 원칙

1. 코치 컨텍스트는 항상 `auth.uid()` 기반으로 계산
2. 세션 접근은 `session_coaches` 또는 동등 매핑으로 검증
3. 회원 민감 정보는 세션/권한 맥락이 있어야 노출
4. Screen Mode projection은 민감 필드 제거 전용 소스를 사용

---

## 13. 공통 RPC 인벤토리

### 13.1 P0

- `fn_get_my_coach_context`
- `fn_get_my_coach_dashboard`
- `fn_get_coach_schedule`
- `fn_get_coach_session_board`
- `fn_mark_session_attendance`
- `fn_bulk_mark_session_attendance`

### 13.2 P1-A

- `fn_list_runbook_templates`
- `fn_upsert_runbook_template`
- `fn_get_session_runbook`
- `fn_upsert_session_runbook`
- `fn_search_wod_movements`
- `fn_list_wod_templates`
- `fn_upsert_wod_template`
- `fn_get_session_wod`
- `fn_upsert_session_wod`
- `fn_publish_session_wod`
- `fn_get_class_display_wod`
- `fn_list_member_alert_flags`
- `fn_upsert_member_alert_flag`
- `fn_get_member_context_panel`

### 13.3 P1-B

- `fn_get_coach_monthly_settlement_basis`
- `fn_get_coach_monthly_kpis`
- `fn_get_coach_retention_panel`

### 13.4 P2

- `fn_list_benchmark_definitions`
- `fn_record_member_benchmark_result`
- `fn_get_member_performance_profile`
- `fn_create_followup`
- `fn_complete_followup`
- `fn_get_my_followups`
- `fn_prepare_race_session`

---

## 14. 화면별 최종 목표상

### 14.1 Dashboard v2

- 오늘 세션 요약
- 곧 시작할 세션
- 위험 회원 요약
- 월간 KPI Snapshot
- 미완료 follow-up

### 14.2 Schedule v2

- 세션 리스트
- Session Operations Board
- 런시트
- 공유 WOD Builder / 세션 WOD 스냅샷
- Race 시작 진입점

### 14.3 Members v2

- 기본 회원 목록
- 플래그
- 코칭 노트
- 출석 패턴
- 퍼포먼스
- follow-up

### 14.4 Race v2

- `Live`
- `History`
- `Devices`
- 세션 기반 이벤트 연결

### 14.5 Profile v2

- 코치 상태
- KPI
- 예상 정산
- 확정 정산
- 개인 메타

### 14.6 WOD Shared System

- `Admin Schedule`: 공유 WOD 템플릿 생성/배정
- `Coach Schedule`: 세션 WOD 선택/오버라이드/게시
- `Class WOD Display`: 게시된 세션 WOD 출력
- `Movement Library`: `wod_exercise_list.md` 기반 운동 검색

---

## 15. 구현 순서 권고

권장 순서는 고정한다.

1. `Priority 22`
2. `Priority 23`
3. `Priority 24`
4. `Priority 25`

이 순서를 유지해야 하는 이유:

- P0 없이 P1/P2를 올리면 권한과 세션 운영이 흔들린다.
- 런시트와 회원 플래그가 먼저 있어야 KPI/리텐션 해석이 풍부해진다.
- KPI/정산을 먼저 만들더라도 follow-up과 퍼포먼스 데이터가 없으면 코치앱이 조회 도구에 머문다.
- Race 재통합은 세션 운영 허브가 자리 잡은 뒤에 해야 동선이 자연스럽다.

---

## 16. 문서 반영 정책

이 문서 기준으로 아래를 동기화한다.

1. `.docs/project-blueprint.md`
2. `.docs/sitemap/coach-app.md`
3. 구현 시점의 DB migration / RPC / UI 변경사항

기존 분리 문서는 유지하되 아래처럼 취급한다.

- `coach-app-benchmark-and-improvement-20260425.md`: 분석/배경 참고
- `coach-app-p0-execution-20260425.md`: P0 상세 실행 참고
- `coach-app-p1b-kpi-settlement-execution-20260425.md`: KPI/정산 상세 참고

단, 범위/우선순위/책임/수용 기준의 최종 판단은 본 문서를 따른다.

---

## 17. 리스크 및 선결 결정

### 17.1 즉시 결정이 필요한 항목

1. 코치의 회원 가시 범위
2. `late_cancel`과 `coach_excused`의 운영 정의
3. session payable count 산식의 예외 규칙
4. Screen Mode에 공개 가능한 회원 단위 정보 범위
5. Race 결과를 일반 Benchmark와 어느 수준까지 통합할지

### 17.2 예상 리스크

| 리스크 | 설명 | 대응 |
|---|---|---|
| 권한 누수 | 클라이언트 파라미터 신뢰가 남을 가능성 | RPC 전환 시 구형 함수 단계적 차단 |
| 집계 불일치 | Admin/Coach 정산 수치 차이 | Basis Layer 단일화 |
| 정보 과밀 | Session Board가 과도하게 무거워질 위험 | P0/P1/P2 단계별 공개 범위 통제 |
| Race 결합도 과다 | Race 재통합 시 기존 흐름 깨질 가능성 | `Live / History / Devices` 허브 구조 유지 |

---

## 18. 최종 권고

코치앱 후속 개발의 핵심은 기능 수를 늘리는 것이 아니라, 아래 네 문장을 제품으로 구현하는 것이다.

1. 코치는 오늘 수업 전에 누구를 봐야 하는지 알아야 한다.
2. 코치는 수업 중 출결과 운영을 한 화면에서 끝낼 수 있어야 한다.
3. 코치는 수업 후 후속 조치를 시스템으로 남겨야 한다.
4. 코치는 월간 성과와 정산을 신뢰 가능한 숫자로 확인해야 한다.

따라서 구현 기준은 다음처럼 고정한다.

- `Priority 22`: 운영 안정화와 권한 하드닝
- `Priority 23`: 수업 표준화와 회원 맥락
- `Priority 24`: KPI/정산/공개 보드
- `Priority 25`: 퍼포먼스/후속 액션/Race 재통합

이 순서를 지키면 BCL 코치앱은 `Race가 강한 앱`에서 `현장 운영 전체를 다루는 코치 운영 OS`로 올라갈 수 있다.

---

## 19. 벤치마크 참고 소스

- Wodify Coach View: `https://help.wodify.com/hc/en-us/articles/9966132457623-Navigate-and-Use-Coach-View`
- Wodify Mobile App: `https://www.wodify.com/products/mobile-app`
- Wodify CrossFit: `https://www.wodify.com/solutions/crossfit-functional-fitness`
- SugarWOD Coach Features: `https://www.sugarwod.com/coach-features/`
- PushPress Train: `https://www.pushpress.com/products/train`
- PushPress Screens: `https://help.pushpress.com/en/articles/9911658-screens-app-modes`
- F45 App: `https://f45training.com/id/get-the-app/`
- F45 LionHeart: `https://f45training.com/f45-lionheart/`
- 팀버핏 첫 방문 플로우: `https://teambutfit.com/first-timer/16`
- 팀버핏 강사용 앱: `https://apps.apple.com/us/app/%ED%8C%80%EB%B2%84%ED%95%8F-%EA%B0%95%EC%82%AC%EC%9A%A9/id6505026075?l=ko`
- 버핏그라운드 강사용 앱: `https://apps.apple.com/kr/app/%EB%B2%84%ED%95%8F%EA%B7%B8%EB%9D%BC%EC%9A%B4%EB%93%9C-%EA%B0%95%EC%82%AC%EC%9A%A9/id1604108250`

---

## 20. Planning Log

- `2026-04-25`: 벤치마크, P0 실행 명세, KPI/정산 실행 명세를 통합하여 코치앱 후속 개발의 단일 마스터 플랜으로 재정리.
