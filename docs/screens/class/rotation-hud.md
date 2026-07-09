# class/rotation-hud — 스테이션 서킷 HUD (TV)

> 라우트: `/class/rotation-hud` · 상태 🟡
> 상위 설계: 05-class-portal §5.2 · 구현: `src/features/class-rotation/`

## ① 목적
TV 화면에 스테이션 서킷(예: 6분할) HUD를 표시한다 — 라운드·전환 카운트다운과 팀 배정을 코치 리모컨과 실시간 연동한다. anon 공개 표면(Display-Safe).

## ② 핵심 기능
- **분할 그리드**: 스테이션별 팀 배정 이름 + 현재 라운드 표시.
- **카운트다운**: 남은 시간은 `timer_started_at + seconds_per_round`에서 산출, 로컬 진행은 rAF. 전환(rotation) 시 다음 스테이션 이동 안내.
- **코치 연동**(`useRotationSync`): `/coach/schedule/rotation` 리모컨의 상태 변경을 Realtime로 수신 반영.

## ③ 데이터 소스
- RPC: `fn_get_session_rotation_state(p_session_id)`(로테이션 상태) — 코치 측 `fn_upsert_session_rotation_state`가 기록
- Realtime: 세션 로테이션 상태 채널.

## ④ 상태·권한 규칙
- **anon 공개 표면**: 팀 배정 이름만 — 회원 판정·메모·생체·정산 절대 비노출(Display-Safe).
- 타이머는 rAF + DOM 직접 조작(React 리렌더 우회). 서버 시각 기준 산출(로컬 드리프트 최소화).
- 미설정/미시작 상태 표면화(무한 스피너 금지). 표준 토큰(`--bcl-*`)만 · tv 밀도.

## ⑤ 수용 시나리오
1. `/class/rotation-hud` → 스테이션 분할 + 팀 배정 이름.
2. 코치 리모컨 시작 → 라운드 카운트다운 진행.
3. 전환 시점 → 다음 스테이션 이동 표시 + 라운드 증가.
4. anon 접근 — 이름 외 민감정보 없음.
