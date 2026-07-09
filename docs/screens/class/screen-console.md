# class/screen-console — 통합 스크린 콘솔 (TV)

> 라우트: `/class/screen-console` (`/class` → 여기로 리다이렉트, facility 쿼리 보존) · 상태 🟡
> 상위 설계: 05-class-portal §3·§4·§6 · 구현: `src/features/class-console/`, `src/features/class-broadcast/`, `src/features/class-common/`

## ① 목적
TV 대형 스크린에서 wod/live/timer/screen 4모드를 단일 앱으로 크로스페이드 전환하며, 코치 리모컨의 Realtime 명령으로 원격 제어된다. anon 공개 표면(Display-Safe).

## ② 핵심 기능
- **4모드**: `wod`(오늘의 WOD 화이트보드) · `live`(현재/다음 세션 보드) · `timer`(AMRAP/EMOM 등 인터벌 타이머) · `screen`(기본 대기/PR 하이라이트).
- **Realtime 명령 수신**(`useConsoleChannel`): `set_mode` · `timer`(적용+timer 모드 전환, 미마운트 시 버퍼) · `refresh` · `identify`(5초 식별 오버레이).
- **공통 셸**: 시계·상태 배지(StatusStrip) · consoleId/facility 컨텍스트 · 미설정 시 SetupNotice.

## ③ 데이터 소스
- anon 화이트리스트 RPC 3종(rpc() 헬퍼, Display-Safe는 RPC 내부 강제):
  - `fn_get_class_display_wod(p_facility_id)` — 게시된 WOD + movements_snapshot + class_display_notes
  - `fn_get_class_live_board(p_facility_id)` — server_time + current/next 세션(체크인 이름 포함)
  - `fn_get_class_screen_prs(p_facility_id, p_days)` — 최근 PR(benchmark/race)
- 명령 채널: Supabase Realtime broadcast(class-broadcast).

## ④ 상태·권한 규칙
- **anon 공개 표면**: 인증 없이 facility 스코프 조회 — 부상/메모/정산/전화 등 민감정보 절대 비노출.
- 렌더는 rAF + DOM 직접 조작(React 리렌더 우회) — Class/Race 성능 계약.
- 콘솔 미설정(facility/consoleId 없음) → SetupNotice(무한 스피너 금지).
- 표준 토큰(`--bcl-*`)만 · tv 밀도 프로파일.

## ⑤ 수용 시나리오
1. `/class?facility=<id>` → `/class/screen-console?facility=<id>`(screen 모드 시작).
2. 코치 리모컨 `set_mode=wod` → WOD 화이트보드로 크로스페이드.
3. `timer` 명령(AMRAP 12:00) → timer 모드 전환 + 카운트다운 시작.
4. `identify` → 5초 식별 오버레이 후 자동 해제.
5. anon 접근 — 로그인 없이 표시, 민감정보 없음.
