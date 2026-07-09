# coach/members — 담당 회원 케어

> 라우트: `/coach/members` (하단탭) · 상태 🟡
> 상위 설계: 04-coach-app §3.3 · 구현: `src/features/coach-members/`

## ① 목적
코치가 세션 밖에서 담당 회원을 케어한다 — 로스터에서 회원을 열어 컨텍스트·노트·후속조치·퍼포먼스를 관리한다.

## ② 핵심 기능
- **로스터**: `fn_get_coach_members(p_search)` — 코치 자기 세션 참가자/시설 스코프(Display-Safe, 정산 제외). 검색 + active_flags 기반 플래그 딥링크(`?flag=`) 클라이언트 필터.
- **회원 상세 패널**(4탭): 컨텍스트 · 노트 · 후속조치 · 퍼포먼스.
  - 플래그 추가/해소: `fn_upsert_member_alert_flag`.
  - 노트 작성/수정: `fn_upsert_member_note`(코치/admin, 상담로그와 통합 타임라인).
  - 후속조치: `fn_create_followup` / `fn_complete_followup` / `fn_get_my_followups`.
  - 벤치마크 입력: `fn_record_member_benchmark_result`(PR 서버 판정) · 정의 `fn_list_benchmark_definitions`.

## ③ 데이터 소스
- RPC: `fn_get_coach_members(p_search)` · `fn_get_member_context_panel(p_member_id)` · `fn_get_member_performance_profile(p_member_id)` · `fn_upsert_member_alert_flag` · `fn_upsert_member_note` · `fn_create_followup` · `fn_complete_followup` · `fn_get_my_followups` · `fn_record_member_benchmark_result` · `fn_list_benchmark_definitions`
- 회원 참조는 `member_id` 기준.

## ④ 상태·권한 규칙
- 진입 가드 `coach/layout`. 로스터/상세는 코치 스코프 RPC(DEFINER) — 클라이언트가 coach_id 미전달.
- **Display-Safe**: 정산/재무 제외. 코치 케어 컨텍스트(부상 플래그·노트)는 코치 권한 내 열람.
- 로딩/에러 표면화 + 재시도. 쓰기는 성공 토스트 후 refetch.
- 표준 컴포넌트(Card/Tabs/Badge/Button/BottomSheet/EmptyState) + `--bcl-*` 토큰만.

## ⑤ 수용 시나리오
1. coach → `/coach/members` → 담당 회원 로스터.
2. 검색 → 특정 회원 → 상세 패널 컨텍스트 탭.
3. 부상 플래그 추가(`fn_upsert_member_alert_flag`) → 로스터 배지 반영.
4. 퍼포먼스 탭 → 벤치마크 기록 입력 → PR 서버 판정 결과 표시.
5. `?flag=injury` 딥링크 → 해당 플래그 회원만 로스터 필터.
