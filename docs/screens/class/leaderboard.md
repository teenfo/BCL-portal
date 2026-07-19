# class/leaderboard — 리더보드 · WOD 화이트보드 (TV)

> 라우트: `/class/leaderboard` · 상태 🟡
> 상위 설계: 05-class-portal §5.3 · 구현: `src/features/class-leaderboard/`

## ① 목적
TV 화면에 시설 스코프 랭킹(이름 + 기록)을 표시한다. `?session` 파라미터가 있으면 일일 WOD 화이트보드 모드로 분기한다. anon 공개 표면(Display-Safe).

## ② 핵심 기능
- **리더보드 모드**(`Leaderboard`): 스코프 탭(week/month/all) 이름 + 기록 랭킹. 생체 지표 제외.
- **WOD 화이트보드 모드**(`WodBoard`, `?session`): 게시된 WOD + 참가자 점수 랭킹. Rx+ → Rx → Scaled 정렬 + rx 배지. 개인 메모 미포함.

## ③ 데이터 소스
- anon 화이트리스트 RPC:
  - `fn_get_class_leaderboard(...)` — 이름·기록·PR/승수 랭킹(누적거리/기록 스코프)
  - `fn_get_class_wod_board(...)` — daily_wod 스코프(published WOD + 참가자 점수), Display-Safe
- rpc() 헬퍼 경유 · Display-Safe는 RPC 내부 강제.

## ④ 상태·권한 규칙
- **anon 공개 표면**: 이름·기록·PR/승수만 노출 — 부상/메모/생체·정산 절대 비노출.
- rAF/DOM 직접 조작(Class 성능 계약). 로드 실패 시 표면화(무한 스피너 금지).
- 표준 토큰(`--bcl-*`)만 · tv 밀도.

## ⑤ 수용 시나리오
1. `/class/leaderboard` → week 스코프 이름+기록 랭킹.
2. 탭 month/all → 스코프 전환.
3. `/class/leaderboard?session=<id>` → WOD 화이트보드(Rx+→Rx→Scaled 정렬).
4. anon 접근 — 로그인 없이 표시, 민감정보 없음.
