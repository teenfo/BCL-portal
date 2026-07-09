# kiosk/idle — 대기 화면 (입구 단말)

> 라우트: `/kiosk` (idle) · 스캔/결과는 `docs/screens/kiosk/scan.md` · 상태 🟡
> 상위 설계: 06-kiosk §3.1 · 구현: `src/app/kiosk/page.tsx`, `src/features/kiosk-shell/`

## ① 목적
입구 단말의 대기 화면 — 대형 시계/날짜와 지점 공지를 표시하고, 전면 터치로 체크인을 시작한다.

## ② 핵심 기능
- **대형 시계/날짜**: 1초 틱 로컬 시계.
- **지점 공지 슬라이드**: `fn_get_kiosk_notices` 기반 순환 표시.
- **"체크인 시작" 전면 터치** → `/kiosk/scan`.
- **네트워크/오프라인 배지**: online 상태 표시.
- **Heartbeat·원격명령**: KioskProvider(앱 셸)가 상시 발신/수신(`fn_kiosk_heartbeat`, `fn_kiosk_provision`).

## ③ 데이터 소스
- RPC: `fn_get_kiosk_notices(...)`(공지) · `fn_kiosk_heartbeat(...)`(셸) · `fn_kiosk_provision(...)`(기기 프로비저닝, 셸)
- 기기 컨텍스트: `kiosk-shell`(device.ts/provision.ts).

## ④ 상태·권한 규칙
- **anon/기기 토큰 표면**: 공개 표면 — Display-Safe(회원/민감정보 없음, 공지·시간만).
- 미프로비저닝 단말 → 설정 안내(무한 스피너 금지). 오프라인 시 배지 표시, 하트비트는 복구 시 재개.
- 표준 토큰(`--bcl-*`)만 · tv 밀도.

## ⑤ 수용 시나리오
1. `/kiosk` → 대형 시계 + 지점 공지 슬라이드.
2. 화면 터치 → `/kiosk/scan`.
3. 네트워크 끊김 → 오프라인 배지, 복구 시 하트비트 재개.
