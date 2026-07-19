# coach/schedule — 일정 · 세션 운영 보드 (중앙 탭)

> 라우트: `/coach/schedule` (중앙 강조 탭) · 하위 `/coach/schedule/rotation`(§로테이션) · 상태 🟡
> 상위 설계: 04-coach-app §3.2 · 구현: `src/features/coach-schedule/`

## ① 목적
코치가 일간/주간 일정을 보고, 세션 카드에서 세션 운영 보드로 1탭 직행해 출결·WOD·런시트·서킷을 진행한다.

## ② 핵심 기능
- **뷰**: 일간 | 주간. 세션 카드 → `?session_id=` 딥링크로 세션 운영 보드 전면 전환.
- **자동 보드 오픈**: 당일 뷰 최초 진입 시 `in_progress` 세션이 있으면 보드 자동 오픈(1탭 직행 계약).
- **세션 보드**(`SessionBoard`): 출석 패널(AttendancePanel, `fn_mark_attendance`) · WOD 패널(WodPanel) · 런시트(RunbookPanel) · 화이트보드(WhiteboardPanel) · 서킷 콘솔(CircuitConsole, 로테이션 제어) · 빠른 작업(QuickActions).
- **세션 보드 상세**: `fn_get_coach_session_board`(로스터/체크인/미체크).

## ③ 로테이션 (`/coach/schedule/rotation`)
- 스테이션 서킷 코치 리모컨 — 세션 로테이션 상태 제어(`fn_upsert_session_rotation_state` / `fn_get_session_rotation_state`). Class rotation-hud(TV)와 실시간 연동.

## ④ 데이터 소스
- RPC: `fn_get_coach_schedule(p_from, p_to)`(기간 세션) · `fn_get_coach_session_board(p_session_id)` · `fn_mark_attendance` · 세션 WOD/런시트(`fn_get_session_wod`·`fn_get_session_runbook` 등) · 로테이션(`fn_upsert_session_rotation_state`·`fn_get_session_rotation_state`)
- 코치 식별자 클라이언트 미전달 — RPC 내부 스코프.

## ⑤ 상태·권한 규칙
- 진입 가드 `coach/layout`. 세션 보드/출결은 코치 담당 세션 스코프.
- **Display-Safe**: 코치 운영 표면 — 부상 플래그는 코치 열람 허용, 정산/재무 비노출.
- 자동 보드 오픈은 ref 가드 + 네비게이션만(리렌더 부작용 없음). 로딩/에러 표면화 + 재시도.
- 표준 컴포넌트(Tabs/Card/Badge/Button/EmptyState) + `--bcl-*` 토큰만.

## ⑥ 수용 시나리오
1. coach → `/coach/schedule`(일간) → 진행 중 세션 있으면 보드 자동 오픈.
2. 세션 카드 → `?session_id=` → 보드 전면 전환.
3. 출석 패널 → checked_in/no_show 판정 → `fn_mark_attendance` 반영.
4. 서킷 콘솔 시작 → `/coach/schedule/rotation` 제어 → TV rotation-hud 동기.
