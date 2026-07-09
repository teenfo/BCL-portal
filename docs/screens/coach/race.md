# coach/race — Race 허브 (Live · 기록 · 장비)

> 라우트: `/coach/race` (컨트롤 룸 `/coach/race/control`은 별도) · 상태 🟡
> 상위 설계: 04-coach-app §3.4 · 15-race-system(정본) · 구현: `src/features/coach-race/`

## ① 목적
코치가 진행/예정 레이스를 관리하고, 완료 이벤트의 이벤트별 리더보드와 PM5 기기 상태를 확인한다.
BLE·파이프라인·연출·상태머신 상세는 15-race-system이 정본 — 이 화면은 코치 UX 계약만.

## ② 핵심 기능 (3탭, 세그먼트 Tabs)
- **Live**: `fn_list_coach_race_events(p_scope:'live')`. 이벤트별 lobby_status/race_format/세션연동/기록수 배지 + `컨트롤 룸`(→ `/coach/race/control?event_id=`)·`종료` 버튼.
- **새 레이스**: Modal에서 이름·포맷(개인/팀/그룹/릴레이)·종목(로잉/스키에르그/바이크에르그)·목표거리·제한시간 → `fn_create_coach_race_event(p_payload)`(세션 비연동 단독). 생성 후 컨트롤 룸으로 이동. 표준 진입은 세션 보드의 "Race 수업 시작".
- **기록(History)**: `fn_list_coach_race_events(p_scope:'history')`. 카드 클릭 시 인라인으로 `fn_get_race_event_result(p_event_id)` 결과(순위·이름/레인·거리·시간·PR) 전개.
- **장비(Devices)**: `fn_list_pm5_devices({})` — 시리얼·상태 배지 조회 전용. 등록/삭제는 Admin 전용(`/admin/race` 참조).

## ③ 데이터 소스
- RPC: `fn_list_coach_race_events(p_scope)` · `fn_create_coach_race_event(p_payload)` · `fn_finish_race_event(p_event_id)` · `fn_get_race_event_result(p_event_id)` · `fn_list_pm5_devices(p_facility_id?)`
- 테이블(간접): `race_events` · `race_records` · `pm5_devices`

## ④ 상태·권한 규칙
- 코치 역할 진입. RPC는 내부에서 `auth.uid()` 검증(코치 식별자 클라이언트 전달 금지) + envelope `{success,data,error}`.
- 각 탭 로딩/에러/빈 3상태(Skeleton·EmptyState onRetry). 종료 후 Live·History refetch.
- 장비 탭은 상태 확인만 — 등록/삭제 UI 없음(코치 권한 밖).
- 표준 컴포넌트(Tabs/Card/Badge/Button/Modal/Select/Input) + `--bcl-*` 토큰만.

## ⑤ 수용 시나리오
1. coach 로그인 → `/coach/race` → Live 탭에 진행/예정 이벤트(없으면 안내 EmptyState).
2. `새 레이스` → 이름·포맷·종목 입력·생성 → 컨트롤 룸으로 이동, Live에 신규 이벤트.
3. 이벤트 `종료` → Live에서 사라지고 기록 탭으로 이동.
4. 기록 탭 카드 클릭 → 이벤트별 리더보드(순위·거리·시간·PR) 인라인 전개.
5. 장비 탭 → 등록된 PM5 시리얼·상태 배지 목록. 등록/삭제 버튼 없음(Admin 전용 안내).
