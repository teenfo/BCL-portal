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

### 1) Home (`/coach/dashboard`) ✅ 구현 완료 (P0 운영 안정화 + P1-A 회원 경고 위젯 완료)
- **구현 파일**: `src/app/coach/dashboard/page.tsx` + `src/components/coach/dashboard/TodayAlertSummary.tsx`
- **데이터 소스**: `fn_get_my_coach_dashboard()` (auth.uid() 기반 SECURITY DEFINER RPC) + `member_alert_flags` 직접 쿼리(active 플래그 집계).
- **오늘의 수업**: 당일 배정된 수업 목록과 미체크인/대기열 인원 카운트 표시.
- **운영 위험 요약 카드**: 60분 내 시작 / 시작 후 미체크인 / 대기열 합계를 즉시 노출.
- **오늘의 회원 경고 위젯 (P1-A)**: 활성 `member_alert_flags`를 type별로 집계 — 체험/VIP 주의/만기 예정/복귀/부상. Critical 심각도가 있으면 빨간 테두리로 강조, 클릭 시 회원 목록으로 이동.
- **다음 세션 CTA**: 진행 중 세션이 없을 때 가장 가까운 세션의 운영 보드로 바로 이동.
- **미완료 후속 조치 위젯 (P2)**: `FollowupSummary.tsx` — `fn_get_my_followups(open)` 기반, 기한 초과 건 빨간 강조, 인라인 완료/해제 처리, 3건 초과 시 접기/펼치기.
- **코치 공지**: 센터 관리자가 전송한 코치 전용 긴급 지시 사항 확인.

### 2) Schedule (`/coach/schedule`) ✅ 구현 완료 (P0 운영 안정화 + P1-A 수업 표준화 완료)
- **구현 파일**: `src/app/coach/schedule/page.tsx`, `src/components/coach/SessionOperationsBoard.tsx` + P1-A 패널: `src/components/coach/wod/SessionWodPanel.tsx`, `src/components/coach/runbook/SessionRunbookPanel.tsx`
- **데이터 소스**: 목록 `fn_get_coach_schedule(p_from, p_to)`, 상세 `fn_get_coach_session_board(p_session_id)`.
- **내 전체 일정**: 일간/주간 뷰 전환 가능. 세션 카드에 race 연동 배지, 체크인/예약/대기/노쇼/지각취소 카운트 노출.
- **세션 운영 보드** (`SessionOperationsBoard.tsx`): 시작 임박 알림, 7개 출결 통계 그리드, 일괄 출석/노쇼 액션, 회원별 `checked_in / no_show / late_cancel / coach_excused` 처리, 대기열 보기.
- **세션 WOD 패널 (P1-A)**: `SessionWodPanel.tsx` — `fn_get_session_wod` 로드, benchmark/facility/shared 스코프 템플릿 선택, `fn_search_wod_movements`로 동작 검색, 포맷/time cap/movement line(custom_label fallback) 편집, Save Draft → `fn_upsert_session_wod` / Publish → `fn_publish_session_wod`. `fn_get_class_display_wod`로 전광판 미리보기.
- **세션 런시트 패널 (P1-A)**: `SessionRunbookPanel.tsx` — 6개 탭(warmup/movement_prep/scaling/cue/safety/finish_note), 시설별 템플릿 기본값 표시 + "오버라이드로 복사" 버튼, 탭별 override + dirty 추적. 저장은 `fn_upsert_session_runbook`.
- **출결 처리**: `fn_mark_session_attendance` (단건) + `fn_bulk_mark_session_attendance` (일괄, 부분 성공 응답).
- **Race 수업 시작 (P2)**: 운영 보드 빠른 액션에서 `fn_prepare_race_session(p_session_id)` 호출 → 세션 연동 race_event 재개 또는 생성 → `/coach/race/control?event_id=` 자동 진입.
- **후속 조치 생성 (P2)**: 운영 보드 빠른 액션에서 세션 참석자 대상 follow-up 생성 (`FollowupCreateModal`, session_id 자동 연결).

#### 2-1) Circuit Console (`/coach/schedule/rotation`) 🆕
- **구현 파일**: `src/app/coach/schedule/rotation/page.tsx`
- **Device Type**: Mobile/Tablet (코칭 패드용 세로/가로 대응)
- **목적**: 코치용 서킷 로테이션 제어기 — 실시간 팀 편성 및 전광판 원격 제어 HUD 리모컨.
- **주요 기능**:
  - 당일 체크인된 회원 목록을 기반으로 4인 1조 6개 팀 원터치 자동/수동 빌딩.
  - HTML5 Drag and Drop API를 통한 드래그 팀-스테이션(1~6번) 직관적 배정.
  - 리모컨 제어 패널: `START`, `PAUSE`, `RESET` 버튼 및 강제 `ROTATE`(스테이션 순환) 제어.
  - 상태 데이터 실시간 직렬화 및 Supabase Broadcast 채널 전파.

### 3) Members (`/coach/members`) ✅ 구현 완료 (P0 운영 안정화 + P1-A 회원 컨텍스트 완료)
- **구현 파일**: `src/app/coach/members/page.tsx` + Admin 회원 상세에 통합된 `src/components/members/MemberContextPanel.tsx`
- **기본 스코프**: '담당 회원'(내 세션을 예약한 회원). '시설 전체'는 코칭 노트/출결 보조 목적으로만 사용.
- **회원 검색**: 이름/이메일 검색 + 활성/비활성 필터.
- **코칭 노트**: 회원의 부상 이력, 운동 특이사항 등을 기록하고 공유 (multi-note + type 필터).
- **회원 컨텍스트 패널 (P1-A)**: `fn_get_member_context_panel`로 활성 alert flags(체험/부상/만기 예정/복귀/VIP 주의), 멤버십 만기 D-day 배지(<7d 빨강/<30d 노랑), 출석 통계(총/30일/마지막), 최근 코칭 노트 3건을 묶어서 노출. `fn_upsert_member_alert_flag`로 플래그 추가/해소. (Admin `/admin/members/[id]`에 우선 통합; Coach Members 상세 통합은 후속 단계)
- **히스토리**: 특정 회원의 출석 통계(총/이달/출석률) 분석.
- **후속 조치 타임라인 (P2)**: `MemberFollowupTimeline.tsx` — 회원별 follow-up 이력(진행 중/전체 필터), 생성/완료/해제/재오픈.
- **퍼포먼스 프로필 (P2)**: `MemberPerformanceProfile.tsx` — `fn_get_member_performance_profile`로 벤치마크 베스트(time=MIN/그 외 MAX) + 최근 기록 + Race 이력 + PR 카운트 통합 표시. 코치는 상세에서 벤치마크 기록 즉시 입력(`fn_record_member_benchmark_result`, PR 자동 판정).

### 4) Race (`/coach/race`) ✅ 구현 완료 (P2 허브 재정의 완료)
- **구현 파일**: `src/app/coach/race/page.tsx`
- **허브 구조 (P2)**: `Live / History / Devices` 3탭 허브로 재정의.
  - **Live**: 진행/예정 이벤트 카드 (lobby_status 배지, 세션 연동 표시) + Control Room 바로가기 + 세션 미연동 이벤트 수동 생성.
  - **History**: 완료 이벤트 목록 → 기록 리더보드 조회 + 수동 기록 추가.
  - **Devices**: `pm5_devices` 상태 보드 (online/offline/maintenance, BLE 명칭·모드).
- **표준 진입 경로**: 수업 연동 레이스는 Schedule → 세션 운영 보드 → "Race 수업 시작"(`fn_prepare_race_session`)이 표준. 허브의 수동 생성은 세션 미연동 이벤트 전용.
- **상세 설계**: [Race 시스템 기획서](../archive/planning/race-system.md) 참조.

#### 4-1) Race Control (`/coach/race/control`) ✅ 구현 완료
- **구현 파일**: `src/app/coach/race/control/page.tsx`
- **Device Type**: Mobile/Tablet (코치 패드)
- **레이스 룸 설정**: 기기 종류 필터, 목표 거리(커스텀), 개인전/팀전 포맷 선택.
- **레인 배정**: 출석 기반 자동 배정 + QR 자율 배정 보조.
- **실시간 제어**: 카운트다운(5초 윈도우) → GO → 종료/리셋.
- **BLE 연결 상태**: Python 서버 연동, 기기별 연결/단절 모니터링.
- **팀 관리**: 팀 생성, 레인-팀 매핑, 팀별 컬러 설정.
- **딥링크 (P2)**: `?event_id=` 쿼리 파라미터로 진입 시 해당 이벤트 자동 선택 (세션 보드 "Race 수업 시작" 연동).

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

### Priority 23 P1-A RPC 인터페이스 (수업 표준화 + 회원 컨텍스트)
공통 envelope `{ success, status, data, error }`. 권한은 `_p1a_assert_coach_or_admin` / `_p1a_assert_coach_can_edit_session` 헬퍼로 통일. 마이그레이션: `supabase/migrations/20260426120000_p1a_class_standardization.sql`. 타입: `src/types/p1a.ts`.
- **WOD 라이브러리/템플릿** — `fn_search_wod_movements`, `fn_list_wod_templates(p_scope, p_facility_id)`, `fn_get_wod_template`, `fn_upsert_wod_template`, `fn_publish_wod_template`.
- **세션 WOD** — `fn_get_session_wod`, `fn_upsert_session_wod`, `fn_publish_session_wod`, `fn_get_class_display_wod(p_session_id, p_session_date, p_facility_id)` ← `/class/wod` 표준 소스.
- **런시트** — `fn_list_runbook_templates(p_facility_id)`, `fn_upsert_runbook_template`, `fn_get_session_runbook`, `fn_upsert_session_runbook`.
- **회원 컨텍스트** — `fn_get_member_context_panel(p_member_id)` (active flags + membership 만기 + 출석 + 최근 노트 통합), `fn_upsert_member_alert_flag`(추가/해소).

### Priority 23 P1-A 신규/변경 화면
- **Admin Operations → WOD Templates** (`/admin/operations/wod-templates`) — 신규. benchmark/facility/shared 스코프별 WOD 템플릿 CRUD, movement search + custom add, draft/publish 워크플로우.
- **Class WOD Board** (`/class/wod`) — `fn_get_class_display_wod` 표준 소스로 전환. movement line + 부가 정보(target/distance/♂♀ RX) 렌더링, 60s 자동 갱신, `class_display_notes` 노출. 레거시 `wods` 테이블/`sessions.wod_description`은 DEPRECATED 주석만 부착하고 호환 fallback으로 유지.

### Priority 25 P2 RPC 인터페이스 (퍼포먼스 / 후속 조치 / Race 재통합)
공통 envelope `{ success, data, error }`. 마이그레이션: `supabase/migrations/20260705100000_p2_performance_followup.sql`. 타입: `src/types/p2.ts`.
- **벤치마크/퍼포먼스** — `fn_list_benchmark_definitions(p_include_inactive)`, `fn_record_member_benchmark_result(p_member_id, p_benchmark_id, p_result_value, ...)` (PR 자동 판정: time=낮을수록/그 외=높을수록), `fn_get_member_performance_profile(p_member_id)` (벤치마크 베스트 + 최근 기록 + Race 이력 통합).
- **후속 조치** — `fn_create_followup(p_payload)` (member_id/followup_type 필수, session_id/priority/due_date/note 선택), `fn_complete_followup(p_followup_id, p_status)` (completed/dismissed/open), `fn_get_my_followups(p_status, p_member_id, p_limit)` (priority > due_date 정렬, is_overdue 포함).
- **Race 재통합** — `fn_prepare_race_session(p_session_id)`: 배정 코치 검증 → 세션 연동 미종료 race_event 재개 또는 신규 생성(`rowing/scheduled/setup`), 반환된 event_id로 Control Room 딥링크 진입.

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
