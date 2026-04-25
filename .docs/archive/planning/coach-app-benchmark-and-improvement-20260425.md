# BCL Portal – 코치앱 벤치마크 기반 고도화 기획서

> **Status**: Approved  
> **Author**: Codex (Product/Architect 관점)  
> **Created**: 2026-04-25  
> **Last Updated**: 2026-04-25  
> **Superseded By**: `.docs/archive/planning/coach-app-master-plan-20260425.md`
> **Related**:
> - `.docs/project-blueprint.md`
> - `.docs/sitemap/coach-app.md`
> - `.docs/archive/planning/coach-app-p0-execution-20260425.md`
> - `.docs/archive/planning/coach-app-p1b-kpi-settlement-execution-20260425.md`
> - `.docs/archive/planning/coach-feature-enhancement.md`
> - `.docs/archive/planning/coach-account-architecture.md`
> - `.docs/archive/planning/race-system-improvement-20260425.md`
> - `src/app/coach/**/*`
> - `src/components/layout/CoachBottomNav.tsx`
> - `supabase/migrations/20260221000000_coach_feature_enhancement.sql`
> - `supabase/migrations/20260217203700_create_race_system.sql`
> - `supabase/migrations/20260221084721_race_system_enhancement.sql`

---

## 1. 문서 목적

이 문서는 현재 개발된 BCL 코치앱을 단순 기능 목록이 아니라, 실제 현장 운영 도구 관점에서 재평가하고
`CrossFit 생태계(Wodify / SugarWOD / PushPress)`, `F45`, `팀버핏/버핏그라운드` 등 그룹 운동 운영앱과 비교하여
부족한 점과 보완 방향을 구체적으로 정의하는 기획 문서다.

이번 문서의 핵심 목표는 아래 3가지다.

1. **현재 구현 상태를 냉정하게 점검**한다.
2. **시장 벤치마크에서 검증된 운영 기능**을 선별해 BCL에 맞게 재설계한다.
3. **화면, DB, RPC, 권한, 단계별 구현 순서**까지 포함한 실행 가능한 개선안으로 정리한다.

---

## 2. 배경 및 문제 정의

현재 BCL 코치앱은 아래 기능을 이미 갖추고 있다.

- `Dashboard`: 오늘 수업, 간단한 통계
- `Schedule`: 코치 일정, 세션 상세, 수동 출석 체크, WOD 수정
- `Members`: 회원 검색, 코칭 노트 저장/삭제, 출석 통계
- `Race`: 이벤트 목록 및 결과 조회
- `Race Control`: 실시간 Race 운영 및 PM5/레인 제어
- `Profile`: 코치 프로필 수정, 월별 정산 조회

즉, **수업 중 운영 기능**은 이미 어느 정도 구축되어 있다.  
반면 현장 코치의 실제 업무는 단순히 수업 중 출석을 체크하는 것에서 끝나지 않는다.

실제 운영 흐름은 아래 4단계다.

1. **수업 전**
   - 오늘 누가 오는가
   - 누가 첫 방문자인가
   - 누가 부상/주의 대상인가
   - 누가 만기 예정인가
   - 대기자/노쇼 위험은 누구인가
2. **수업 중**
   - 출석 상태를 어떻게 빠르게 확정할 것인가
   - WOD/런시트를 어떻게 전달할 것인가
   - Race나 리더보드 같은 현장 제어를 어떻게 자연스럽게 연결할 것인가
3. **수업 후**
   - 어떤 회원에게 후속 피드백이 필요한가
   - 어떤 회원이 재등록 위험군인가
   - 어떤 성과를 기록해야 하는가
4. **월간 운영**
   - 코치 본인의 성과는 어떤가
   - 재등록/유지율 기여는 어떤가
   - 예상 정산액과 실제 정산액은 어떤가

현재 BCL은 2번은 비교적 강하지만, **1번/3번/4번이 약하다.**  
벤치마크 결과에서도 경쟁력 있는 코치앱들은 단순 CRUD보다 이 전체 운영 흐름을 더 잘 묶고 있다.

---

## 3. 범위

### 3.1 이번 기획의 범위

- 코치앱 5개 핵심 탭의 정보구조 및 역할 재정의
- 코치 현장 운영에 필요한 신규 기능 정의
- Race 기능의 코치 운영 흐름 재통합
- 권한/RLS/RPC 설계 보강
- 필요한 DB 스키마/뷰/RPC 설계 제안
- 우선순위별 구현 단계 제안

### 3.2 이번 기획의 비범위

- PM5 BLE 프로토콜 자체 상세 설계
- Admin 전면 리디자인
- User App 전체 IA 개편
- 결제 시스템 재설계
- 멀티지점 조직/본사 운영 체계 재설계

단, 코치앱 기능 구현을 위해 **Admin 또는 Class 포털에 최소 연동이 필요한 지점**은 본 문서에서 함께 명시한다.

---

## 4. 벤치마크 요약

### 4.1 벤치마크 대상 선정 원칙

코치앱은 업종 특성상 단일 제품보다, 실제 현장에서 널리 쓰이는 운영 조합을 기준으로 보는 것이 정확하다.

| 분류 | 대상 | 선정 이유 |
|---|---|---|
| CrossFit/Functional Fitness | `Wodify`, `SugarWOD`, `PushPress` | 실제 박스/기능성 그룹 운동 운영의 대표 툴 |
| Boutique Franchise | `F45` | 표준화된 수업 운영과 멤버 앱 생태계가 강함 |
| 한국형 팀트레이닝 | `팀버핏`, `버핏그라운드` | 한국 코치 현장 니즈와 운영 흐름이 유사함 |

### 4.2 벤치마크 핵심 인사이트

| 제품 | 강점 | BCL에 주는 시사점 |
|---|---|---|
| `Wodify` | 체크인, 멤버 프로필, 결과 기록, 코치 노트, 현장 운영이 짧은 동선으로 연결됨 | 코치가 수업 직전/직후 필요한 맥락을 한 화면에서 처리해야 함 |
| `SugarWOD` | WOD 라이브러리, 프로그래밍 캘린더, warm-up, scaling, class outline 등 수업 표준화가 강함 | BCL도 코치 개인 역량에만 의존하지 말고 클래스 템플릿이 필요함 |
| `PushPress` | benchmark/PR, leaderboard, Screens attendance mode, trial/birthday 등 현장 정보 표시가 강함 | 참석자 리스트는 단순 명단이 아니라 운영 정보 패널이어야 함 |
| `F45` | 예약, 대기, 챌린지, 리더보드, 바디 데이터, post-workout 리포트가 한 경험으로 연결됨 | Race는 강점이지만 일반 수업 퍼포먼스와 이어져야 함 |
| `팀버핏/버핏그라운드` | 주간 스케줄, 멤버 리스트, 후기/인증샷, 미출결 관리, 만기/재등록/예상 급여 등 한국형 운영 지표 요구가 강함 | BCL도 코치 KPI, 재등록 리스크, 예상 정산 등 실무형 지표가 필요함 |

### 4.3 벤치마크 결론

강한 코치앱은 단순히 기능이 많은 앱이 아니다.  
다음 질문에 빠르게 답하게 해주는 앱이다.

- 지금 시작할 수업에서 **누구를 주의해야 하는가**
- 수업이 끝난 뒤 **누구에게 바로 후속 액션이 필요한가**
- 이번 달에 **내가 어떤 운영 성과를 만들고 있는가**

BCL은 이미 `Race Control`이라는 강한 차별점을 갖고 있으므로,
방향은 “경쟁앱을 따라가는 것”이 아니라 **Race를 포함한 코치 운영 OS**로 올라가는 것이 맞다.

---

## 5. 현재 BCL 코치앱 점검 (As-Is Audit)

### 5.1 현재 구현 강점

| 영역 | 현재 상태 | 평가 |
|---|---|---|
| `Dashboard` | 오늘 수업과 기초 통계 제공 | 기본 허브 역할은 가능 |
| `Schedule` | 세션 상세, 참석자 조회, 수동 출석, WOD 수정 가능 | 수업 중 운영의 핵심 골격은 갖춤 |
| `Members` | 회원 검색, 코칭 노트 CRUD, 회원별 출석 통계 제공 | 케어 기능의 출발점은 있음 |
| `Profile` | 프로필 수정, 월별 정산 조회 가능 | 코치 개인 정보/정산 기능은 이미 시작됨 |
| `Race Control` | Race 설정, 팀전/개인전, 레인 제어, 실시간 상태 관리 | 시장 대비 차별화 포인트가 큼 |

### 5.1.1 현재 구현 근거 파일

| 기능 | 확인 파일 |
|---|---|
| 코치 대시보드 집계 호출 | `src/app/coach/dashboard/page.tsx` |
| 스케줄/세션 상세/참석자/출석 처리 | `src/app/coach/schedule/page.tsx` |
| 회원 검색 및 코칭 노트 CRUD | `src/app/coach/members/page.tsx` |
| 프로필 수정 및 정산 조회 | `src/app/coach/profile/page.tsx` |
| Race 이벤트/기록 조회 | `src/app/coach/race/page.tsx` |
| Race 실시간 운영 | `src/app/coach/race/control/page.tsx` |
| 코치 바텀 네비게이션 | `src/components/layout/CoachBottomNav.tsx` |
| 코치 기능용 DB/RPC | `supabase/migrations/20260221000000_coach_feature_enhancement.sql` |
| Race 기본 스키마 | `supabase/migrations/20260217203700_create_race_system.sql` |
| Race 확장 스키마 | `supabase/migrations/20260221084721_race_system_enhancement.sql` |
| 코치/예약 관련 RLS | `.docs/database/schema/002_rls_policies.sql` |

### 5.2 구조적 리스크

#### 5.2.1 권한 설계가 아직 서버 기준으로 완전히 닫혀 있지 않음

현재 일부 RPC는 클라이언트가 전달한 `user_id` 또는 `coach_user_id`에 의존한다.

- `fn_get_coach_dashboard(p_user_id UUID)`
- `fn_coach_mark_attendance(... p_coach_user_id UUID)`

이 구조는 다음 문제가 있다.

- 권한 검증의 책임이 서버의 `auth.uid()`가 아니라 클라이언트 입력에 일부 의존함
- 함수별 보안 설계가 일관되지 않음
- 향후 bulk action, no-show 처리, waitlist 승급 등 민감 작업을 확장할 때 취약해짐

#### 5.2.2 회원 가시 범위가 문서/정책/UI 사이에서 일치하지 않음

현재 세 가지가 충돌한다.

| 구분 | 현재 상태 |
|---|---|
| SSOT 문서 | 코치가 “시설 내 전체 회원 통합 검색” 가능하다고 서술 |
| RLS 정책 | 코치는 본인 수업과 연결된 회원/예약 정보 중심으로 제한 |
| UI 구현 | `Members` 화면은 사실상 전체 회원 조회 성격으로 동작 |

이 문제는 단순 문구 수정이 아니라 **코치가 누구를 어느 수준까지 볼 수 있는가**에 대한 제품 결정이 먼저 필요하다.

#### 5.2.3 Race 정보구조가 분리되어 있음

현재 바텀탭은 `/coach/race`로 이동하지만, 실질적인 현장 운영은 `/coach/race/control`에서 이뤄진다.

그 결과:

- Race 탭이 “기록 조회 화면”인지 “운영 허브”인지 불명확함
- 수업 일정에서 Race로 진입하는 흐름이 끊김
- 현장 코치 입장에서는 운영 시작 동선이 길어짐

#### 5.2.4 “미연결 코치” 상태가 제품 상태머신으로 설계되어 있지 않음

현재는 레이아웃 상단 경고 배너 수준이다.  
하지만 실제로는 아래 두 상태가 완전히 다르다.

1. 로그인은 됐지만 `coaches.user_id` 연결이 없는 상태
2. 코치 권한은 있으나 아직 수업/지점/역할 배정이 없는 상태

둘은 보여줘야 하는 화면과 CTA가 달라야 한다.

#### 5.2.5 문서와 구현의 불일치

기존 완료/미완료 문서와 현재 코드 상태 사이에 차이가 있어,
“무엇이 현재 설계 기준인가”를 판단하기 어렵다.

이 문서는 그 불일치를 줄이기 위한 **현 시점 기준 정리 문서** 역할도 겸한다.

### 5.3 운영 관점에서의 기능 부족

#### 5.3.1 수업 전 운영이 약함

현재 코치는 수업 직전 아래 정보를 한 번에 볼 수 없다.

- 첫 방문자 / 체험권 / Trial 여부
- 부상/주의 플래그
- 멤버십 만기 임박
- 장기 미출석 후 복귀
- 대기자 / 노쇼 위험
- 오늘 필요한 런시트, 워밍업, 스케일링 포인트

#### 5.3.2 출결 상태머신이 약함

현재는 사실상 아래 정도만 다룬다.

- 예약
- 체크인
- waitlisted

하지만 실제 운영에는 아래 상태가 필요하다.

- checked_in
- no_show
- late_cancel
- coach_excused
- walk_in
- waitlist_promoted

#### 5.3.3 수업 표준화 도구가 없음

현재 WOD 텍스트 수정은 가능하지만, 코치 운영 표준화를 위한 구조화된 항목이 없다.

- warm-up
- movement prep
- scaling
- cue
- safety note
- equipment setup
- finish note

#### 5.3.4 수업 후 후속 관리가 약함

현재 `Members`의 코칭 노트는 존재하지만, 아래 운영 흐름이 없다.

- 누가 follow-up 대상인지 자동 추림
- 누가 재등록 위험인지 표시
- 누가 오늘 PR/Benchmark를 갱신했는지 기록
- 누가 통증 호소/이탈 신호를 보였는지 태깅

#### 5.3.5 코치 KPI와 경제성 대시보드가 부족함

정산 조회는 있지만, 운영 지표로는 부족하다.

- 이번 달 수업 수
- 예상 정산액
- 출석률
- 담당 회원 재등록률
- 만기 예정 회원 수
- 장기 미출석 회원 수
- 코치별 유지율 기여

---

## 6. 제품 방향 (To-Be)

### 6.1 목표 정의

BCL 코치앱은 아래 방향으로 재정의한다.

> **수업 배정 조회 앱이 아니라, Race를 포함한 현장 운영형 코치 OS**

### 6.2 핵심 운영 흐름

#### 6.2.1 수업 전

- 오늘 세션별 위험 신호 확인
- Trial/주의회원/만기예정/대기자 파악
- 클래스 런시트 준비
- Race 연동 수업이면 장비 준비 상태 확인

#### 6.2.2 수업 중

- 출석을 빠르게 확정
- 필요한 경우 대기자 승급
- WOD/런시트/레인 배정을 운영
- Screen Mode 또는 Race Mode로 확장

#### 6.2.3 수업 후

- 후속 케어 대상자 기록
- PR/Benchmark/부상 메모 저장
- 미출석자/이탈 위험군 추적

#### 6.2.4 월간 운영

- 내 클래스 운영 성과 확인
- 재등록 기여도 확인
- 예상 정산/확정 정산 비교
- 운영 상의 누락 영역 파악

### 6.3 제품 원칙

1. **모든 코치 액션은 “세션 단위”로 시작할 수 있어야 한다.**
2. **민감 권한은 반드시 `auth.uid()` 기반 서버 검증으로 닫아야 한다.**
3. **코치의 회원 조회는 “무제한 열람”이 아니라 역할 기반으로 설계한다.**
4. **Race는 독립 섬이 아니라 수업 운영 흐름에 연결되어야 한다.**
5. **단순 기록보다 후속 액션과 운영 KPI가 더 중요하다.**

---

## 7. 핵심 개선안

## 7.1 P0-1. 세션 운영 보드 (Session Operations Board)

### 목적

수업 직전과 수업 중에 코치가 필요한 정보를 하나의 패널에서 확인하고 바로 액션할 수 있도록 한다.

### 진입 경로

- `Dashboard`의 오늘 수업 카드에서 진입
- `Schedule`의 세션 카드에서 진입
- `Race`가 연결된 세션이면 운영 보드에서 바로 Race 시작

### 구성 정보

| 영역 | 상세 내용 |
|---|---|
| 세션 헤더 | 수업명, 시간, 장소, 담당 코치, lead/assistant 구분, 정원 |
| 출결 현황 | 예약, 체크인, 대기, no-show, late cancel 수 |
| 운영 알림 | Trial, 첫 방문, 장기 미출석 복귀, 부상/주의 플래그, 만기 예정 |
| 클래스 런시트 | warm-up, prep, scaling, cue, finish note |
| 현장 액션 | 일괄 체크인, no-show 처리, waitlist 승급, 메모 저장, Race 생성 |
| 후속 작업 | follow-up 필요 회원, 오늘 PR/부상/주의 기록 대상 |

### 필수 액션

- `개별 체크인`
- `일괄 체크인`
- `no_show / late_cancel / coach_excused` 마킹
- `waitlist -> confirmed` 승급
- `세션 메모` 저장
- `Race 수업이면 Race Control로 진입`

### 상세 규칙

1. 수업 시작 전 30분부터 “운영 시작” 상태로 강조한다.
2. 수업 시작 후 10분이 지나도 체크인되지 않은 확정 예약자는 `미도착 위험`으로 표시한다.
3. `no_show` 또는 `late_cancel`은 코치가 명시적으로 마킹할 수 있어야 한다.
4. 코치가 `waitlist 승급`을 실행하면 예약 상태와 푸시/알림 규칙이 함께 동작해야 한다.
5. 세션 운영 보드 데이터는 다중 쿼리가 아니라 하나의 집계 RPC로 반환하는 것이 바람직하다.

### 수용 기준

- 코치는 세션 화면 하나에서 출결/주의회원/런시트/후속 액션을 처리할 수 있다.
- 세션별 운영 상태는 새로고침 없이 재진입해도 유지된다.
- Race 수업은 같은 맥락에서 시작 가능하다.

---

## 7.2 P0-2. 권한 모델 재정의 및 RPC 보안 하드닝

### 목적

현재 코치 기능을 “보이는 UI” 기준이 아니라 “서버 권한” 기준으로 닫힌 구조로 만든다.

### 권장 정책

#### A. 연결된 코치 (권장 운영 상태)

- 본인에게 배정된 세션의 운영 데이터 조회/수정 가능
- 본인 세션과 연관된 회원의 상세 운영 정보 접근 가능
- 시설 내 전체 회원 검색은 가능하되, 범위를 계층화함

#### B. 미연결 코치

- 코치앱 접근은 허용하되, 운영 화면은 잠금
- 전용 온보딩/연결 요청 화면 표시
- “관리자에게 연결 요청” CTA 제공

#### C. 배정 없는 코치

- 프로필/공지/기본 정보는 조회 가능
- 세션 운영 보드는 없음
- “배정 대기 중” 상태를 표시

### 회원 가시 범위 권장안

현장 운영성과 보안을 동시에 만족시키기 위해 아래 2단계 정책을 권장한다.

| 데이터 수준 | 접근 허용 대상 |
|---|---|
| 시설 전체 기본 디렉토리 | 이름, 프로필, 멤버십 상태, 기본 태그 정도만 검색 허용 |
| 민감 운영 상세 | 본인 수업 참여 이력 또는 현재 배정 세션과 관계가 있는 회원만 허용 |

이 방식은 SSOT의 “전체 회원 검색”과 실제 보안 요구를 동시에 만족시키는 절충안이다.

### RPC 설계 원칙

1. 모든 코치 RPC는 `auth.uid()`로 코치 컨텍스트를 찾는다.
2. 클라이언트가 `coach_id`, `user_id`, `coach_user_id`를 전달하지 않는다.
3. 세션 수정 액션은 반드시 해당 세션에 배정된 코치인지 서버에서 검증한다.
4. bulk action은 요청 payload 전체를 서버에서 검증한다.
5. 미연결 코치 상태는 빈 배열이 아니라 명시적 상태코드로 반환한다.

### 교체 대상 함수

| 현재 함수 | 문제 | 교체 방향 |
|---|---|---|
| `fn_get_coach_dashboard(p_user_id)` | 클라이언트 전달 user_id 의존 | `fn_get_my_coach_dashboard()` |
| `fn_get_session_attendees(p_session_id)` | 세션 소유 검증 범위가 약함 | `fn_get_coach_session_board(p_session_id)` |
| `fn_coach_mark_attendance(..., p_coach_user_id)` | 클라이언트 전달 coach_user_id 의존 | `fn_mark_session_attendance(p_session_id, p_member_id, p_action)` |

### 수용 기준

- 클라이언트는 코치 식별자를 직접 전달하지 않는다.
- 권한 없는 세션에 대한 요청은 서버에서 거절된다.
- 미연결 코치는 전용 상태 화면을 본다.

---

## 7.3 P1-1. 클래스 런시트 / 템플릿 시스템

### 목적

코치 개인의 기억과 경험에만 의존하지 않고, 수업 운영 품질을 시스템으로 표준화한다.

### 필요한 구조

#### 템플릿 레벨

- 종목/프로그램별 기본 템플릿
- 예: `Endurance Row`, `Strength+Metcon`, `Intro Class`, `Race Prep`

#### 세션 레벨

- 특정 날짜/세션에서 템플릿을 불러오고 수정
- 예: 오늘 수업만 warm-up 또는 scaling 수정

### 구조화 항목

- session goal
- warm-up
- movement prep
- equipment setup
- scaling rules
- coaching cues
- safety cautions
- whiteboard note
- finish note

### UI 요구사항

- `Schedule > 세션 운영 보드` 내 편집 가능
- 최근 사용 템플릿 재사용 가능
- 복사/붙여넣기보다 구조화 필드 우선
- 모바일에서도 수정 가능한 입력 밀도 필요

### 기대 효과

- 코치별 수업 품질 편차 감소
- 신입 코치 온보딩 속도 개선
- Race 수업과 일반 수업 모두 표준 운영 가능

### 수용 기준

- 코치는 신규 세션에 템플릿을 적용하고 일부만 수정할 수 있다.
- 다음 수업 준비 시간이 단축된다.

---

## 7.4 P1-2. 회원 컨텍스트/플래그 시스템

### 목적

코치가 회원 이름만 보는 것이 아니라 “운영상 주의해야 할 맥락”을 즉시 파악하게 한다.

### 필요한 플래그 유형

| 분류 | 예시 |
|---|---|
| 방문 상태 | first_timer, trial, returning_after_absence |
| 건강/주의 | injury, mobility_limit, medical_caution |
| 운영/관계 | renewal_due, vip, needs_followup |
| 수업 맥락 | race_participant, benchmark_day, recently_no_show |

### 표시 위치

- 세션 운영 보드 참석자 리스트
- `Members` 검색 결과 카드
- `Dashboard`의 오늘 경고 요약

### 입력/관리 원칙

- `영구 플래그`와 `일회성 메모`를 분리한다.
- 영구 플래그는 별도 테이블에서 활성 상태 관리
- 일회성 메모는 `coaching_notes`에 기록

### 수용 기준

- 코치는 수업 시작 전 주의 대상을 빠르게 식별할 수 있다.
- 플래그와 메모의 역할이 섞이지 않는다.

---

## 7.5 P1-3. 리텐션 / 예상 정산 / 코치 KPI 대시보드

### 목적

코치가 자신의 운영 결과를 월간 관점에서 확인하고 행동할 수 있게 한다.

### 필요한 KPI

| 구분 | 지표 |
|---|---|
| 수업 운영 | 이번 달 수업 수, 출석률, 정원 대비 충원률 |
| 회원 유지 | 만기 예정 회원 수, 장기 미출석 회원 수, 재등록 완료 수 |
| 코치 케어 | follow-up 대상 수, follow-up 완료율 |
| 경제성 | 예상 정산액, 확정 정산액, 회당 평균 수당 |
| 품질 | 평균 피드백 점수, PR/Benchmark 기록 수 |

### 표시 위치

- `Profile` 상단 KPI 카드
- `Dashboard` 요약 위젯
- Admin Performance와 동일한 계산식을 재사용하되, 코치용은 본인 기준으로 제한

### 핵심 규칙

1. 예상 정산액은 실시간 계산값으로 보여주고, 확정 정산은 `coach_settlements` 기준으로 구분한다.
2. 재등록률은 코치 개인의 절대 성과로 단정하지 않고, “코치 관여 회원군 기준”으로 계산한다.
3. KPI는 설명 가능한 계산식이어야 하며 랜덤/하드코딩 값을 금지한다.

### 수용 기준

- 코치는 이번 달 운영 성과와 경제성을 한 눈에 이해할 수 있다.
- Admin/Coach 화면의 KPI 정의가 일치한다.

### 7.5.1 Admin / Coach 정산 책임 분리

정산 기능은 Admin과 Coach가 **같은 데이터 기반을 공유**하되, **권한과 화면 목적은 분리**해야 한다.

#### 공통 데이터 소스

- `coaches.base_salary`
- `coaches.session_allowance`
- `coach_settlements`
- `fn_calculate_monthly_settlement`
- 향후 `예상 정산` 집계용 view/RPC

#### 역할 분리 원칙

| 구분 | Admin | Coach |
|---|---|---|
| 기준 단가 설정 | 가능 | 불가 |
| 월 정산 실행 | 가능 | 불가 |
| 정산 상태 변경 (`pending/confirmed/paid`) | 가능 | 불가 |
| 전체 코치 월별 정산 조회 | 가능 | 불가 |
| CSV/운영용 다운로드 | 가능 | 불가 |
| 본인 확정 정산 이력 조회 | 가능 | 가능 |
| 본인 예상 정산 조회 | 참고 가능 | 가능 |
| 계산식 설명 보기 | 가능 | 가능 |

#### 제품 관점 해석

- `Admin Settlements`는 **정산 운영 화면**이다.
- `Coach Profile/KPI`는 **정산 조회 화면**이다.

즉, Admin은 돈을 **산출/확정/지급 관리**하고, Coach는 본인의 금액을 **열람/이해**하는 구조가 맞다.

#### 핵심 규칙

1. `coach_settlements`는 **확정 정산 스냅샷**으로 사용한다.
2. Coach 화면의 `예상 정산`은 `coach_settlements`를 직접 쓰지 않고, 서버 집계(view/RPC)로 계산한다.
3. Coach는 단가(`base_salary`, `session_allowance`)를 수정할 수 없다.
4. Coach는 `월 정산 실행`, `상태 변경`, `CSV 다운로드`를 수행할 수 없다.
5. Admin/Coach가 보는 계산식은 다를 수 있어도, **서버 계산 원천은 반드시 동일**해야 한다.

#### 권장 UI 문구 분리

- Admin: `월 정산 실행`, `정산 상태 변경`, `CSV 다운로드`
- Coach: `예상 정산`, `확정 정산`, `정산 계산식`, `지급 상태`

#### 비목표

아래는 Coach 앱에 넣지 않는 것이 맞다.

- 전체 코치 정산 비교
- 타 코치 정산 열람
- 지급 승인/확정 처리
- 운영용 CSV 출력

---

## 7.6 P1-4. Screen Mode / Class Board

### 목적

코치 개인 모바일 화면과 별개로, 현장 수업 보드나 태블릿 화면에서 실시간 운영 정보를 표시한다.

### 활용 시나리오

- 수업 시작 직전 출석 현황을 큰 화면으로 확인
- Trial 회원/축하 정보/오늘 WOD를 공개 보드에 표시
- Race 또는 Benchmark 수업에서 리더보드/레인 상태 표시

### 표시 요소

- 클래스명, 시간, 담당 코치
- checked-in / reserved / waitlisted 수
- 오늘 WOD 또는 런시트 요약
- 축하 정보: birthday, anniversary, PR 등
- Race 수업이면 리더보드 또는 장비 상태

### 주의사항

- 공개 보드에는 민감한 건강 정보나 연락처를 노출하지 않는다.
- injury 상세나 재등록 위험 같은 민감 플래그는 코치앱 전용으로 유지한다.

### 수용 기준

- 세션 운영 보드와 Screen Mode가 같은 데이터 소스를 사용한다.
- 공개 가능한 정보와 비공개 정보가 분리된다.

---

## 7.7 P2-1. 퍼포먼스 시스템 일반화

### 목적

현재 Race에 편중된 성과 기록을 일반 클래스 운영까지 확장한다.

### 필요한 기능

- benchmark 정의
- 회원별 benchmark 결과 저장
- PR 추적
- challenge / habit tracking
- assessment cycle
- body composition / baseline 연동 여지 확보

### Race와의 관계

Race 기록은 계속 유지하되, 아래 구조로 일반화한다.

- Race = 고강도/실시간 성과 이벤트
- Benchmark = 클래스 기반 반복 측정 항목
- PR = 회원 개인 기록

즉, Race는 퍼포먼스 시스템의 하위 전문 모듈로 둔다.

### 수용 기준

- 코치는 Race가 아닌 일반 수업에서도 성과를 기록할 수 있다.
- 회원 케어 기록과 퍼포먼스 기록이 분리되면서도 함께 조회 가능하다.

---

## 7.8 P2-2. 후속 액션 / 메시징 / 클래스 후 관리

### 목적

수업 종료 후 필요한 후속 행동을 빠뜨리지 않도록 한다.

### 필요한 기능

- follow-up task 생성
- 사유 분류: 부상, 동기 저하, 장기 미출석, 만기 예정, Trial 후속 상담
- 다음 액션 날짜 설정
- 완료 여부 표시
- 향후 알림/메시징 연동 가능 구조 확보

### 권장 1차 구현 범위

메시징 인프라를 먼저 붙이기보다,
우선 `코치 내부 태스크 관리`부터 도입하는 것이 적절하다.

1차:

- follow-up 대상 생성
- due date 관리
- 완료 체크
- Dashboard/Member 상세에 노출

2차:

- 알림/푸시/메시지 템플릿 연동

### 수용 기준

- 코치는 수업 종료 직후 회원별 후속 조치를 기록할 수 있다.
- 후속 조치는 다음 날 Dashboard에서 다시 확인할 수 있다.

---

## 7.9 P2-3. Race 운영 흐름 재통합

### 목적

Race를 별도 섬이 아니라 코치 운영 흐름 안으로 재배치한다.

### 권장 정보구조

#### 현재

- `/coach/race`: 이벤트/기록 조회 중심
- `/coach/race/control`: 실시간 운영

#### 개선

- `/coach/race`: Race 운영 허브
  - `Live`
  - `History`
  - `Devices`
- `/coach/race/control`: 내부 상세 운영 경로 또는 `Live`의 세부 모드로 사용

### 세션 연동 방식

- 세션 운영 보드에서 “Race 수업 시작” 버튼으로 진입
- `session_id`와 연결된 Race 이벤트를 생성/재개
- 종료 후 Race 결과를 회원 성과 이력에 연결

### 수용 기준

- 코치는 Schedule 또는 Dashboard에서 자연스럽게 Race를 시작한다.
- Race 종료 후 결과가 회원 성과 데이터와 분리되지 않는다.

---

## 8. 화면별 상세 설계

## 8.1 Dashboard v2

### 역할

오늘의 운영 우선순위를 보여주는 메인 허브

### 핵심 구성

1. `Today Overview`
   - 오늘 세션 수
   - 총 예약/체크인
   - 경고 대상 수
   - follow-up 대상 수
2. `Start Next Session`
   - 가장 가까운 다음 수업 CTA
   - 바로 세션 운영 보드 진입
3. `Alerts`
   - Trial
   - 만기 예정
   - 장기 미출석 복귀
   - 미완료 follow-up
4. `Coach KPI Snapshot`
   - 이번 달 수업 수
   - 예상 정산
   - 재등록 대상 수

### 제거/축소 대상

- 단순 숫자 카드만 있는 현재 형태
- 세션 운영과 무관한 정보 우선 배치

---

## 8.2 Schedule v2

### 역할

코치의 실제 작업 시작점

### 핵심 변화

- 세션 클릭 시 단순 상세 모달이 아니라 `세션 운영 보드`로 확장
- 일간/주간 뷰는 유지
- 수업 카드에 경고/상태 뱃지 추가

### 세션 카드에 노출할 최소 정보

- 시간 / 수업명 / 장소
- 예약 / 체크인 / 대기
- Trial 수
- 주의 플래그 수
- Race 연결 여부

---

## 8.3 Members v2

### 역할

회원 전체 디렉토리 + 운영 상세 프로필

### 권장 구조

- 기본 탭: `내 수업 회원`
- 보조 탭: `시설 전체 검색`

### 상세 화면에서 보여줄 항목

- 기본 프로필
- 활성 플래그
- 최근 코칭 노트
- 최근 출석 패턴
- 최근 Benchmark/PR
- follow-up 이력
- 멤버십 상태 요약

### 원칙

- 상세 운영 정보는 권한 범위 내에서만 노출
- 코칭 노트와 경고 플래그를 명확히 분리

---

## 8.4 Race v2

### 역할

실시간 운영 허브 + 기록 이력

### 권장 탭 구조

- `Live`: 현재/예정 레이스 운영
- `History`: 지난 Race 결과 조회
- `Devices`: 장비 상태, 연결, 페어링

### 비고

현재 `/coach/race`가 수행하는 조회 기능은 `History` 탭으로 이동 가능하다.

---

## 8.5 Profile v2

### 역할

개인 정보 화면이 아니라 “코치 월간 운영 요약 화면”

### 핵심 구성

- 프로필 정보
- 이번 달 KPI
- 예상 정산 vs 확정 정산
- 최근 평가/피드백 요약
- 운영 누락 항목

### 추가 권장 항목

- 코치 역할 상태: linked / assigned / on_leave
- 정산 계산식 보기
- 담당 회원군 변화 추이

---

## 8.6 영향 범위

### 코치앱 직접 영향

- `Dashboard`: 요약 카드 중심 -> 운영 허브 중심으로 재배치
- `Schedule`: 상세 모달 중심 -> 세션 운영 보드 중심으로 전환
- `Members`: 단순 검색/노트 -> 케어 프로필/플래그/follow-up 중심으로 확장
- `Race`: 이력 중심 -> Live 운영 허브 중심으로 재구성
- `Profile`: 프로필 편집 중심 -> KPI/정산/운영 요약 중심으로 재배치

### Admin 연동 영향

- `Admin Coaches`: linked/unlinked/assigned 상태를 더 명확히 관리해야 함
- `Admin Performance`: 코치 KPI 계산식과 동일한 정의를 공유해야 함
- `Admin Settlements`: 예상 정산과 확정 정산 계산식의 정합성 확보 필요

### Class 포털 연동 영향

- Screen Mode 데이터 소스를 코치 세션 운영 보드와 공유해야 함
- 공개 보드와 비공개 운영 정보 분리를 고려해야 함

### DB / 권한 영향

- coach 관련 RPC 전면 재검토 필요
- `bookings`, `session_coaches` 확장 필요
- 신규 테이블 도입 시 RLS와 audit 로그 정책 동시 설계 필요

---

## 9. 데이터 모델 설계

### 9.1 기존 테이블 재사용

아래 테이블은 계속 중심축으로 사용한다.

- `coaches`
- `session_coaches`
- `sessions`
- `bookings`
- `checkins`
- `members`
- `coaching_notes`
- `coach_settlements`
- `race_events`
- `race_records`
- `race_live_state`
- `race_teams`
- `pm5_devices`

### 9.2 확장/신규 설계 제안

#### 9.2.1 `bookings` 확장

목적: 예약 상태와 출결 결과를 분리해서 기록하기 위함

권장 추가 컬럼:

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `attendance_outcome` | TEXT | `pending`, `checked_in`, `no_show`, `late_cancel`, `coach_excused`, `walk_in` |
| `attendance_marked_at` | TIMESTAMPTZ | 결과 확정 시각 |
| `attendance_marked_by` | UUID | 처리한 사용자 |
| `waitlist_promoted_at` | TIMESTAMPTZ | 대기 승급 시각 |
| `cancel_reason` | TEXT | 취소/변경 사유 |

#### 9.2.2 `session_coaches` 확장

목적: lead/assistant 코치 구분

권장 추가 컬럼:

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `assignment_role` | TEXT | `lead`, `assistant` |
| `display_order` | INT | 표시 순서 |

#### 9.2.3 `member_alert_flags` 신규

목적: 영구성 또는 반영구성 주의 플래그 관리

권장 컬럼:

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID | PK |
| `member_id` | UUID | 회원 |
| `flag_type` | TEXT | `injury`, `trial`, `renewal_due`, `needs_followup` 등 |
| `severity` | TEXT | `low`, `medium`, `high` |
| `label` | TEXT | UI 표시용 이름 |
| `description` | TEXT | 상세 설명 |
| `is_active` | BOOLEAN | 활성 여부 |
| `starts_at` | TIMESTAMPTZ | 시작 시각 |
| `expires_at` | TIMESTAMPTZ | 만료 시각 |
| `created_by` | UUID | 생성 사용자 |
| `resolved_by` | UUID | 해제 사용자 |
| `resolved_at` | TIMESTAMPTZ | 해제 시각 |

#### 9.2.4 `class_runbook_templates` 신규

목적: 클래스 운영 템플릿 저장

권장 컬럼:

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID | PK |
| `facility_id` | UUID | 지점 |
| `title` | TEXT | 템플릿명 |
| `program_type` | TEXT | 프로그램 구분 |
| `warmup` | JSONB | 워밍업 구조 |
| `movement_prep` | JSONB | 사전 준비 |
| `scaling_rules` | JSONB | 스케일 규칙 |
| `coaching_cues` | JSONB | 코칭 포인트 |
| `equipment_setup` | JSONB | 장비 세팅 |
| `safety_notes` | JSONB | 안전 메모 |
| `finish_notes` | JSONB | 마무리 안내 |
| `is_active` | BOOLEAN | 사용 여부 |

#### 9.2.5 `session_runbooks` 신규

목적: 특정 세션에 연결된 실제 운영안 저장

권장 컬럼:

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID | PK |
| `session_id` | UUID | 세션 |
| `template_id` | UUID | 원본 템플릿 |
| `goal_summary` | TEXT | 오늘 목표 |
| `warmup` | JSONB | 실제 적용 워밍업 |
| `scaling_rules` | JSONB | 실제 스케일 |
| `coach_notes` | JSONB | 큐/주의점 |
| `whiteboard_notes` | TEXT | 화이트보드 메모 |
| `race_config_snapshot` | JSONB | Race 수업이면 연결 스냅샷 |
| `updated_by` | UUID | 마지막 수정 사용자 |

#### 9.2.6 `coach_followups` 신규

목적: 수업 후 후속 관리 태스크 기록

권장 컬럼:

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | UUID | PK |
| `member_id` | UUID | 회원 |
| `session_id` | UUID | 관련 세션 |
| `coach_id` | UUID | 담당 코치 |
| `reason_type` | TEXT | `injury`, `renewal`, `trial`, `absence`, `motivation` 등 |
| `title` | TEXT | 한 줄 요약 |
| `details` | TEXT | 상세 메모 |
| `due_date` | DATE | 후속 예정일 |
| `status` | TEXT | `open`, `done`, `dismissed` |
| `completed_at` | TIMESTAMPTZ | 완료 시각 |

#### 9.2.7 `benchmark_definitions` / `member_benchmark_results` 신규

목적: 일반 수업용 퍼포먼스 시스템 도입

`benchmark_definitions`

- 이름
- 종목
- 기록 방식
- 기준 단위
- 활성 여부

`member_benchmark_results`

- member_id
- benchmark_id
- session_id
- result_value
- unit
- is_pr
- recorded_by
- recorded_at

### 9.3 뷰/집계 계층 권장

신규 테이블만 늘리기보다, 아래 집계는 뷰 또는 RPC로 관리하는 것이 적절하다.

- `vw_coach_monthly_kpis`
- `vw_member_retention_signals`
- `vw_session_operation_summary`
- `vw_member_care_profile`

---

## 10. RPC / API 설계 제안

### 10.1 신규/교체 RPC 제안

| 함수명 | 목적 |
|---|---|
| `fn_get_my_coach_context()` | linked 상태, coach_id, 배정 상태, 지점 정보 반환 |
| `fn_get_my_coach_dashboard()` | Dashboard 요약 데이터 반환 |
| `fn_get_coach_schedule(p_from, p_to)` | 기간별 코치 일정 반환 |
| `fn_get_coach_session_board(p_session_id)` | 세션 운영 보드 전체 데이터 반환 |
| `fn_mark_session_attendance(p_session_id, p_member_id, p_action)` | 개별 출결 처리 |
| `fn_bulk_mark_session_attendance(p_session_id, p_payload JSONB)` | 일괄 출결 처리 |
| `fn_promote_waitlist_member(p_session_id, p_member_id)` | 대기 승급 |
| `fn_upsert_session_runbook(p_session_id, p_payload JSONB)` | 런시트 저장 |
| `fn_get_member_care_profile(p_member_id)` | 회원 케어 상세 |
| `fn_upsert_member_alert_flag(...)` | 주의 플래그 생성/수정 |
| `fn_create_coach_followup(...)` | 후속 조치 생성 |
| `fn_complete_coach_followup(p_followup_id)` | 후속 조치 완료 |
| `fn_get_coach_monthly_kpis(p_month)` | 월간 KPI 반환 |
| `fn_get_coach_retention_panel(p_month)` | 재등록 위험군/만기 예정 반환 |
| `fn_create_race_event_from_session(p_session_id, p_payload)` | 세션 기반 Race 생성 |

### 10.2 보안 규칙

1. 모든 함수는 `SECURITY DEFINER`를 쓰더라도 내부에서 `auth.uid()`를 기준으로 권한 확인한다.
2. 세션 액션 함수는 반드시 `session_coaches` 매핑을 확인한다.
3. 회원 상세 함수는 가시 범위 정책에 맞는지 추가 검증한다.
4. bulk action은 부분 성공/부분 실패 결과를 명시적으로 반환한다.
5. 클라이언트에 권한 분기 로직을 중복 구현하지 않는다.

### 10.3 응답 형태 권장

각 함수는 아래 구조를 따르는 것이 좋다.

```json
{
  "success": true,
  "status": "ok",
  "data": {},
  "meta": {},
  "error": null
}
```

미연결 코치 예시:

```json
{
  "success": true,
  "status": "unlinked_coach",
  "data": {
    "linked": false,
    "has_assignments": false
  },
  "error": null
}
```

---

## 11. 권한 및 상태머신 설계

### 11.1 코치 상태 정의

| 상태 | 정의 | 표시 화면 |
|---|---|---|
| `unlinked` | 로그인 계정은 있으나 `coaches.user_id` 연결 없음 | 연결 요청 화면 |
| `linked_unassigned` | 연결은 됐지만 활성 배정 없음 | 배정 대기 화면 |
| `linked_active` | 활성 코치이며 세션 운영 가능 | 일반 코치앱 |
| `on_leave` | 휴직/비활성 상태 | 제한된 보기 |

### 11.2 출결 상태 정의

| 상태 | 설명 |
|---|---|
| `pending` | 예약은 있으나 아직 결과 미확정 |
| `checked_in` | 출석 완료 |
| `no_show` | 무단 미참석 |
| `late_cancel` | 정책 기준 이후 취소 |
| `coach_excused` | 코치/센터 판단으로 예외 처리 |
| `walk_in` | 예약 없이 현장 참여 |

### 11.3 후속 조치 상태 정의

| 상태 | 설명 |
|---|---|
| `open` | 처리 전 |
| `done` | 완료 |
| `dismissed` | 더 이상 필요 없음 |

---

## 12. 구현 우선순위 및 단계

### Phase 1. 권한/세션 운영 기반 정리 (`P0`)

목표:

- 코치 컨텍스트 RPC 정리
- 세션 운영 보드 구축
- 출결 상태 확장
- 미연결/미배정 상태 화면 분리

산출물:

- `fn_get_my_coach_context`
- `fn_get_coach_session_board`
- `fn_mark_session_attendance`
- `bookings` 확장
- `Dashboard`, `Schedule` 1차 개편

### Phase 2. 런시트/회원 컨텍스트 (`P1`)

목표:

- 클래스 템플릿
- 세션 런시트
- 주의 플래그
- Member 상세 케어 프로필

산출물:

- `class_runbook_templates`
- `session_runbooks`
- `member_alert_flags`
- `Members` 고도화

### Phase 3. KPI/리텐션/정산 (`P1`)

목표:

- 월간 KPI
- 재등록 위험 패널
- 예상 정산 vs 확정 정산

산출물:

- `vw_coach_monthly_kpis`
- `vw_member_retention_signals`
- `Profile`/`Dashboard` KPI 확장

### Phase 4. Screen Mode / Race 재통합 (`P1~P2`)

목표:

- 공개 보드
- Race 허브 재구성
- 세션 기반 Race 진입

산출물:

- `/coach/race` IA 개편
- Screen Mode 화면
- 세션 운영 보드 -> Race 연결

### Phase 5. 퍼포먼스/후속조치 (`P2`)

목표:

- Benchmark/PR
- follow-up task
- 수업 후 운영 루프 완성

산출물:

- `benchmark_definitions`
- `member_benchmark_results`
- `coach_followups`

### Phase 6. 문서/테스트/운영 정합성 마감

목표:

- SSOT/Blueprint 동기화
- 테스트 케이스 확정
- Admin 및 Class 포털 연동 검증

---

## 13. 화면별 수용 기준

### Dashboard

- 오늘 수업 중 다음 액션이 필요한 세션이 우선 노출된다.
- Trial/만기/후속조치 경고가 요약된다.
- 다음 세션으로 1탭 진입 가능하다.

### Schedule

- 세션 클릭 시 운영 보드가 열린다.
- 출결/대기 승급/런시트 수정이 가능하다.
- Race 수업이면 운영 보드에서 Race로 이어진다.

### Members

- “내 수업 회원”과 “시설 전체 검색”이 역할에 맞게 분리된다.
- 회원별 플래그, 노트, 출석 패턴, follow-up 이력이 보인다.

### Race

- 메인 진입이 Live 운영 중심으로 바뀐다.
- 과거 기록은 History로 분리된다.

### Profile

- 프로필 편집보다 월간 KPI와 정산 요약이 더 중요한 영역으로 재배치된다.

---

## 14. 테스트 시나리오

### 시나리오 1. 연결된 코치의 오늘 첫 수업 준비

1. 코치가 `Dashboard`에 접속한다.
2. 다음 세션 카드에 Trial 1명, injury flag 1명, 만기 예정 2명이 표시된다.
3. 코치는 세션 운영 보드에 진입한다.
4. warm-up과 scaling을 확인한다.
5. Trial 회원의 메모를 확인하고 수업을 시작한다.

성공 기준:

- 코치는 Members 화면을 따로 뒤지지 않고도 핵심 운영 정보를 확보한다.

### 시나리오 2. 수업 중 출결 처리

1. 세션 운영 보드에서 8명 예약, 2명 대기 상태를 본다.
2. 6명을 개별/일괄 체크인 처리한다.
3. 1명은 late_cancel, 1명은 no_show로 처리한다.
4. 대기자 1명을 승급한다.

성공 기준:

- 출결 상태가 명확히 기록되고 집계가 즉시 반영된다.

### 시나리오 3. Race 수업 운영

1. 세션 운영 보드에서 “Race 시작”을 누른다.
2. 연결된 `session_id` 기준 Race 운영 허브로 이동한다.
3. Live 화면에서 레인/기기 상태를 확인한다.
4. 종료 후 결과가 회원 퍼포먼스 이력에 반영된다.

성공 기준:

- Schedule와 Race 사이 맥락 전환 비용이 낮다.

### 시나리오 4. 수업 후 후속 관리

1. 코치는 한 회원에게 `injury` follow-up을 생성한다.
2. 한 회원은 `renewal_due` 플래그를 확인하고 follow-up을 등록한다.
3. 다음날 Dashboard에서 미완료 follow-up을 본다.

성공 기준:

- 수업 후 기록이 사라지지 않고 다음 액션으로 이어진다.

### 시나리오 5. 미연결 코치 로그인

1. 코치 권한이 있는 사용자가 로그인하지만 `coaches.user_id` 연결이 없다.
2. 일반 Dashboard 대신 연결 요청 화면을 본다.

성공 기준:

- 빈 데이터 화면이 아니라 명시적 상태 화면이 노출된다.

---

## 15. 리스크 및 대응

| 리스크 | 설명 | 대응 |
|---|---|---|
| 권한 회귀 | 기존 코치 기능이 새 RPC 전환 과정에서 깨질 수 있음 | 함수 단위 교체보다 v2 병행 도입 후 전환 |
| RLS 복잡도 증가 | 회원 가시 범위가 섬세해질수록 정책이 복잡해짐 | 민감 상세는 RPC 경유, 기본 디렉토리는 단순 정책 유지 |
| 과도한 기능 확장 | 모든 개선을 한 번에 넣으면 속도가 느려짐 | P0/P1/P2로 분리, 운영 핵심부터 구현 |
| Race와 일반 수업 결합 난이도 | 데이터 모델이 분리되어 있어 연결 비용이 있음 | `session_id` 중심으로 느슨하게 연결 후 점진 통합 |
| KPI 신뢰도 저하 | 계산식이 불명확하면 현장 신뢰를 잃음 | 지표 정의서와 RPC 계산식 동시 문서화 |

---

## 16. 최종 권고안

이번 코치앱 개선의 핵심은 “기능을 더 많이 넣는 것”이 아니다.  
아래 4가지를 먼저 닫는 것이 우선이다.

1. **세션 운영 보드**
2. **권한/RPC 보안 하드닝**
3. **클래스 템플릿 + 회원 플래그**
4. **리텐션/KPI/정산 요약**

그 다음에 아래를 확장하는 것이 맞다.

5. **Screen Mode**
6. **Race 재통합**
7. **Benchmark/PR/후속 조치**

즉, 구현 우선순위는 아래와 같다.

| 우선순위 | 핵심 목표 |
|---|---|
| `P0` | 코치가 오늘 수업을 제대로 운영하게 만들기 |
| `P1` | 코치가 수업 품질과 회원 케어를 시스템으로 관리하게 만들기 |
| `P2` | 코치 운영 데이터를 성과/리텐션/퍼포먼스로 확장하기 |

---

## 17. 벤치마크 참고 소스

- Wodify Coach View: https://help.wodify.com/hc/en-us/articles/9966132457623-Navigate-and-Use-Coach-View
- Wodify Mobile App: https://www.wodify.com/products/mobile-app
- Wodify CrossFit Solution: https://www.wodify.com/solutions/crossfit-functional-fitness
- SugarWOD Coach Features: https://www.sugarwod.com/coach-features/
- PushPress Train: https://www.pushpress.com/products/train
- PushPress Screens App Modes: https://help.pushpress.com/en/articles/9911658-screens-app-modes
- F45 App: https://f45training.com/id/get-the-app/
- F45 One-App Rollout: https://f45training.com/article/its-finally-here-the-new-f45-training-app/
- F45 LionHeart: https://f45training.com/f45-lionheart/
- TeamButfit First-Timer Flow: https://teambutfit.com/first-timer/16
- TeamButfit Instructor App: https://apps.apple.com/us/app/%ED%8C%80%EB%B2%84%ED%95%8F-%EA%B0%95%EC%82%AC%EC%9A%A9/id6505026075?l=ko
- BuffitGround Instructor App: https://apps.apple.com/kr/app/%EB%B2%84%ED%95%8F%EA%B7%B8%EB%9D%BC%EC%9A%B4%EB%93%9C-%EA%B0%95%EC%82%AC%EC%9A%A9/id1604108250

---

## 18. Planning Log

- 2026-04-25: 코치앱 현 상태 점검, 외부 벤치마크 비교, P0/P1/P2 우선순위, 화면/DB/RPC 설계 초안 작성
