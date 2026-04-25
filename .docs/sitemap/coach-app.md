# Coach Application Design Module (`/coach/*`)

이 문서는 코치 전용 앱의 화면 구조, 주요 기능 및 기술적 설계를 통합 관리하는 정본(SSOT) 기획서입니다.

---
> [!NOTE]
> 전체 서비스 구조 및 공통 라우팅 규칙은 [**Global Sitemap Index**](./README.md)를 참고하십시오.


## 1. 🏃 네비게이션 및 화면 구조 (Bottom Tab)

코치 앱은 수업 현장에서의 신속한 조작을 위해 직관적인 바텀 탭 구조를 가집니다.
- **Layout**: `src/app/coach/layout.tsx` (AuthGuard + **CoachStateGate** + CoachBottomNav)
- **BottomNav**: `src/components/layout/CoachBottomNav.tsx`
- **State Gateway**: `src/components/coach/CoachStateGate.tsx` — `fn_get_my_coach_context()`로 인증 → 연결 → 배정 상태를 판단해 운영 화면 진입을 제어합니다. `/coach/profile`만 미배정/휴직 코치도 접근 가능합니다.

### 1) Home (`/coach/dashboard`) ✅ 구현 완료 (P0 운영 안정화 완료)
- **구현 파일**: `src/app/coach/dashboard/page.tsx`
- **데이터 소스**: `fn_get_my_coach_dashboard()` (auth.uid() 기반 SECURITY DEFINER RPC).
- **오늘의 수업**: 당일 배정된 수업 목록과 미체크인/대기열 인원 카운트 표시.
- **운영 위험 요약 카드**: 60분 내 시작 / 시작 후 미체크인 / 대기열 합계를 즉시 노출.
- **다음 세션 CTA**: 진행 중 세션이 없을 때 가장 가까운 세션의 운영 보드로 바로 이동.
- **코치 공지**: 센터 관리자가 전송한 코치 전용 긴급 지시 사항 확인.

### 2) Schedule (`/coach/schedule`) ✅ 구현 완료 (P0 운영 안정화 완료)
- **구현 파일**: `src/app/coach/schedule/page.tsx`
- **데이터 소스**: 목록 `fn_get_coach_schedule(p_from, p_to)`, 상세 `fn_get_coach_session_board(p_session_id)`.
- **내 전체 일정**: 일간/주간 뷰 전환 가능. 세션 카드에 race 연동 배지, 체크인/예약/대기/노쇼/지각취소 카운트 노출.
- **세션 운영 보드** (`SessionOperationsBoard.tsx`): 시작 임박 알림, 7개 출결 통계 그리드, 일괄 출석/노쇼 액션, WOD 편집, 회원별 `checked_in / no_show / late_cancel / coach_excused` 처리, 대기열 보기.
- **출결 처리**: `fn_mark_session_attendance` (단건) + `fn_bulk_mark_session_attendance` (일괄, 부분 성공 응답).

### 3) Members (`/coach/members`) ✅ 구현 완료 (P0 운영 안정화 완료)
- **구현 파일**: `src/app/coach/members/page.tsx`
- **기본 스코프**: '담당 회원'(내 세션을 예약한 회원). '시설 전체'는 코칭 노트/출결 보조 목적으로만 사용.
- **회원 검색**: 이름/이메일 검색 + 활성/비활성 필터.
- **코칭 노트**: 회원의 부상 이력, 운동 특이사항 등을 기록하고 공유 (multi-note + type 필터).
- **히스토리**: 특정 회원의 출석 통계(총/이달/출석률) 분석.

### 4) Race (`/coach/race`) ✅ 구현 완료
- **구현 파일**: `src/app/coach/race/page.tsx`
- **기기 제어**: 로잉/와트바이크(PM5) 하드웨어 연결 모니터링 및 페어링.
- **경기 운영**: 실시간 리더보드 중계, 경기 시작/종료 제어 및 레인 자동 배정.
- **상세 설계**: [Race 시스템 기획서](../planning/race-system.md) 참조.

#### 4-1) Race Control (`/coach/race/control`) ✅ 구현 완료
- **구현 파일**: `src/app/coach/race/control/page.tsx`
- **Device Type**: Mobile/Tablet (코치 패드)
- **레이스 룸 설정**: 기기 종류 필터, 목표 거리(커스텀), 개인전/팀전 포맷 선택.
- **레인 배정**: 출석 기반 자동 배정 + QR 자율 배정 보조.
- **실시간 제어**: 카운트다운(5초 윈도우) → GO → 종료/리셋.
- **BLE 연결 상태**: Python 서버 연동, 기기별 연결/단절 모니터링.
- **팀 관리**: 팀 생성, 레인-팀 매핑, 팀별 컬러 설정.

### 5) Profile (`/coach/profile`) ✅ 구현 완료 (P0 운영 안정화 완료)
- **구현 파일**: `src/app/coach/profile/page.tsx`
- **코치 상태 배지**: `useCoachRuntimeContext()`로 활동 중/배정 대기/휴직/미연결을 명확히 표시. 미연결·미배정·휴직 상태에서는 운영 통계와 운영 메뉴(일정/회원/Race) 링크를 숨겨 잘못된 진입을 차단.
- **코치 정보**: 본인의 전문 분야, 바이오 수정 및 월간 수업 성과 통계 (활동 중일 때만 노출).
- **급여/수당 조회**:
  - 월간 담당 수업 수 및 수당 계산
  - 수업당 수당 단가 확인
  - 급여 명세서 조회 (월별)
  - 년간 수입 통계
- **시스템 설정**: 알림 수신 설정 및 개인 보안 강화.

---

## 2. 🛠️ 기술 아키텍처 및 UI 원칙

### 기술 스택
- **Architecture**: Next.js CSR 기반의 필드 운영 특화 인터페이스.
- **Data Layer**: Supabase 실시간 쿼리를 통한 실시간 예약/이벤트 동기화.
- **Security**: 코치 역할(Role) 사용자만 접근 가능한 하드 권한 가드 적용.

### Priority 22 P0 RPC 인터페이스 (auth.uid() 기반)
모든 RPC는 `SECURITY DEFINER`로 정의되며 서버에서 `auth.uid() → coaches.user_id → session_coaches.coach_id` 경로로 권한을 직접 검증합니다. 응답은 공통 envelope `{ success, status, data, error }` 형식입니다.
- `fn_get_my_coach_context()` — 인증/연결/배정/휴직 상태 판정.
- `fn_get_my_coach_dashboard()` — 오늘 수업 + 운영 위험(미체크인/대기열/시작 임박) 요약.
- `fn_get_coach_schedule(p_from, p_to)` — 기간 내 본인 배정 세션 목록 + race 연동/카운트.
- `fn_get_coach_session_board(p_session_id)` — 세션 운영 보드(헤더/공동코치/출석자/요약).
- `fn_mark_session_attendance(p_session_id, p_member_id, p_action)` — 단일 출결 처리.
- `fn_bulk_mark_session_attendance(p_session_id, p_payload)` — 다건 일괄 처리(부분 성공 응답).

### 출결 상태 기계 (`bookings.attendance_outcome`)
`pending` → 코치 액션으로 `checked_in / no_show / late_cancel / coach_excused` 또는 키오스크 자율 출석으로 `checked_in / walk_in`. 코치 액션 시 `attendance_marked_by`, `attendance_marked_at` 기록.

### `session_coaches` 확장
`assignment_role` (`lead`/`assistant`) + `display_order` 컬럼을 통해 보드 헤더에서 공동 코치를 시각적으로 구분합니다. 기존 `role` 컬럼은 마이그레이션으로 백필되었습니다.

---

## 🚀 3. 코치 온보딩 및 사용 가이드 (Coach Guide)
- **계정 연결**: 로그인은 가능하나 `coaches` 데이터와 연결되지 않은 경우 운영 화면 진입이 차단되고 안내 화면(`CoachStateScreen`)이 노출됩니다. `/coach/profile`만 접근 가능합니다.
- **수업 시작**: '홈' 화면에서 첫 수업 명단과 '코칭 노트'의 특이사항을 미리 확인하세요.
- **회원 관리**: 수업 후 피드백이나 주의사항은 '회원 케어' 메뉴에서 즉시 기록하세요.
- **레이스 조율**: 경기 전 'Race' 탭에서 모든 기기의 연결 상태가 녹색인지 확인 후 시작 버튼을 누르세요.
- **급여 확인**: '프로필' → '급여 조회'에서 이번 달 수업 수와 예상 수당을 확인하세요.
