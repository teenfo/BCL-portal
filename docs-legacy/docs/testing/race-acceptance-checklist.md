# Race 시스템 운영 수용 기준 (Acceptance Checklist)

> **목적**: Race 시스템의 코드 구현과 실제 운영 가능성을 분리해서 검증하기 위한 기준선.
> **대상 모듈**: Python BLE 서버 (`race/`), `useRaceRealtime`, `useRaceAnimator`, `/coach/race/*`, `/class/race/*`
> **기준 기획서**: `.docs/archive/planning/race-system.md`
> **PM 이슈 근거**: `.docs/archive/audit/audit-pm-gap-analysis-20260419.md` §3.5
> **마지막 갱신일**: 2026-04-25

---

## 0. 검증 등급 정의

| 등급 | 의미 | 비고 |
|------|------|------|
| **L1 — 시뮬레이터** | `race/simulator.py` JSONL Replay만으로 검증 | 하드웨어 없이 가능 |
| **L2 — 단일 장비** | 1대 PM5 + 단일 동글로 검증 | 로컬 개발 환경 |
| **L3 — 다중 장비** | 4대 이상 PM5 + 다중 동글 분산 | 매장 1곳 현장 |
| **L4 — 정원 운영** | 8~20레인 동시 운영 + 다중 클라이언트 시청 | 출시 전 최종 |

각 항목 옆에 **요구 등급**을 표기합니다. 출시 전 모든 항목이 최소 요구 등급에서 PASS여야 합니다.

---

## 1. BLE 스캔 / 연결

| # | 항목 | 요구 등급 | 검증 방법 | 결과 |
|---|------|:---------:|----------|------|
| 1-1 | Web Bluetooth로 PM5 시리얼 스캔 → DB 등록 | L2 | Admin 기기 등록 모달에서 PM5 선택 후 `pm5_devices` INSERT 확인 | ⬜ |
| 1-2 | Mac/iOS 환경에서 시리얼 파싱 (UUID fallback) | L2 | Mac Safari + iOS Chrome에서 모달 동작 확인 | ⬜ |
| 1-3 | Python 서버가 등록된 기기 명단으로 BLE 연결 | L2 | `POST /race/devices/connect` → 성공 응답 + 로그 | ⬜ |
| 1-4 | 다중 동글 분산 연결 (8대 이상) | L3 | 동글 2개 이상 연결 후 8대 동시 연결 시 throttle 미발생 | ⬜ |
| 1-5 | 정원 20레인 동시 연결 안정성 | L4 | `pm5_manager` 로그에서 connection drop 0건 / 1분 | ⬜ |
| 1-6 | 미등록 기기 스캔 결과에서 제외 | L2 | DB에 이미 있는 시리얼은 모달 셀렉트박스에 표시되지 않음 | ⬜ |

---

## 2. 레이스 운영 (Setup → Lobby → Countdown → Racing → Finished)

| # | 항목 | 요구 등급 | 검증 방법 | 결과 |
|---|------|:---------:|----------|------|
| 2-1 | Coach가 `/coach/race/control`에서 이벤트 생성 + 포맷/거리 설정 | L1 | `race_events` INSERT + `lobby_status='setup'` | ⬜ |
| 2-2 | 레인 자동 배정 (출석 기반) | L2 | 출석 회원 수 ≥ 레인 수 시 자동 배정 / 부족 시 빈 레인 처리 | ⬜ |
| 2-3 | QR 자율 배정 (회원이 키오스크/모바일에서 레인 선택) | L3 | QR 스캔 → `race_live_state.member_id` 업데이트 확인 | ⬜ |
| 2-4 | Lobby 상태에서 참가자 아바타가 Starting Pen에 표시 | L1 | `/class/race/run` 화면에서 대기 모드 렌더링 확인 | ⬜ |
| 2-5 | 카운트다운 5초 동안 Early Start 데이터 무시 | L2 | Python 로그에 `READY 상태 데이터 skip` 메시지 확인 | ⬜ |
| 2-6 | GO 신호 후 거리 0m부터 정확히 시작 | L2 | 첫 broadcast의 `d=0.x` 확인 (사전 진행분 미반영) | ⬜ |
| 2-7 | 레이스 종료 시 `race_live_state` row 삭제 | L2 | 종료 후 `SELECT count(*) FROM race_live_state WHERE event_id=...` → 0 | ⬜ |
| 2-8 | 코치 `[레이스 룸 종료]` 시 BLE 연결 일괄 해제 | L3 | Python 로그 + PM5 LED 상태 확인 | ⬜ |

---

## 3. 실시간 데이터 파이프라인 (Realtime / Reconnect)

| # | 항목 | 요구 등급 | 검증 방법 | 결과 |
|---|------|:---------:|----------|------|
| 3-1 | Broadcast 0.3초 주기 도달 | L2 | 클라이언트 콘솔에서 메시지 timestamp 간격 측정 | ⬜ |
| 3-2 | LERP 보간으로 끊김 없는 애니메이션 | L1 | 시뮬레이터 2Hz 입력 → 60fps 부드러운 이동 | ⬜ |
| 3-3 | `race_live_state` 5초 간격 스냅샷 UPSERT | L2 | DB에서 `last_updated_at` 갱신 주기 확인 | ⬜ |
| 3-4 | 클라이언트 재접속 시 현재 거리부터 점프 복원 | L2 | 화면 새로고침 → `useRaceRealtime`이 스냅샷 거리 적용 | ⬜ |
| 3-5 | 네트워크 1초 지연 시 Mock 전진 + `[Reconnecting]` 배지 | L1 | DevTools throttle "Slow 3G"로 검증 | ⬜ |
| 3-6 | 기기 완전 단절 시 Grayscale + IDLE 애니메이션 | L2 | PM5 전원 OFF → 해당 레인 흑백 처리 | ⬜ |
| 3-7 | PM5 자연 sleep (2~4분) 시 `[Offline]` 처리 | L3 | 레이스 종료 후 5분 대기 → Python 로그에 disconnected | ⬜ |
| 3-8 | 다중 클라이언트(코치 패드 + Class TV + Admin)가 동일 데이터 표시 | L3 | 3개 화면 동시 시청 → 거리/순위 동기화 확인 | ⬜ |

---

## 4. 레코딩 (JSONL) 및 결과 적재

| # | 항목 | 요구 등급 | 검증 방법 | 결과 |
|---|------|:---------:|----------|------|
| 4-1 | `race/recordings/{event_id}/{serial}.jsonl` 파일 생성 | L2 | `ls race/recordings/` 확인 | ⬜ |
| 4-2 | JSONL 한 줄 스키마 준수 (`ts,d,p,spm,hr,cal,max_w`) | L2 | `tail -n 1 *.jsonl | jq` 파싱 확인 | ⬜ |
| 4-3 | 레이스 종료 시 `race_recordings` 메타 INSERT | L2 | `SELECT * FROM race_recordings WHERE event_id=...` | ⬜ |
| 4-4 | 요약 추출 후 `race_records` INSERT (max_watts/avg_hr 등) | L2 | 종료 후 records row 존재 + 값 sanity check | ⬜ |
| 4-5 | PR 판정 (`is_pr` 플래그) | L2 | 같은 회원의 이전 best와 비교 후 갱신 케이스에서 true | ⬜ |
| 4-6 | 결과 리더보드 화면(`/class/race/result`) 표시 | L1 | 다각도(Distance, Max Watts, HR, Cal) 정렬 동작 | ⬜ |
| 4-7 | JSONL 파일 30일 자동 삭제 | L4 | cron/스케줄러 동작 확인 (운영 후 1개월 시점) | ⬜ |

---

## 5. 종료 / 정리 (Cleanup)

| # | 항목 | 요구 등급 | 검증 방법 | 결과 |
|---|------|:---------:|----------|------|
| 5-1 | 레이스 종료 후 `race_live_state` 0건 | L2 | DB 쿼리로 확인 | ⬜ |
| 5-2 | Python 메모리 누수 없음 (10회 연속 레이스) | L3 | `ps aux` RSS 메모리 변화 추적 | ⬜ |
| 5-3 | BLE 연결 누수 없음 (`BleakClient` 모두 해제) | L3 | Python 로그에서 disconnect 카운트 == connect 카운트 | ⬜ |
| 5-4 | Recorder 핸들 close (파일 lock 해제) | L2 | 파일을 다른 프로세스에서 읽기 가능한지 확인 | ⬜ |
| 5-5 | 비정상 종료(Ctrl+C) 시에도 진행중 데이터 flush | L2 | SIGINT 후 마지막 라인 확인 | ⬜ |

---

## 6. 권한 / 보안

| # | 항목 | 요구 등급 | 검증 방법 | 결과 |
|---|------|:---------:|----------|------|
| 6-1 | Service Role Key가 브라우저 번들에 포함되지 않음 | L1 | `npm run build` 후 `.next/static/` grep | ⬜ |
| 6-2 | Python 서버 CORS가 localhost / 내부망만 허용 | L2 | `race/main.py` CORS 설정 검토 | ⬜ |
| 6-3 | Race 관련 RLS 정책 (Coach/Admin 쓰기, 인증 사용자 읽기) | L1 | RLS 정책 SELECT/INSERT 시뮬레이션 | ⬜ |
| 6-4 | `race_recordings` 파일 경로 노출 시 권한 분리 | L2 | 비코치 계정에서 SELECT 시도 → 거부 | ⬜ |

---

## 7. 검증 환경 매트릭스

| 등급 | 환경 | 장비 | 도구 |
|------|------|------|------|
| L1 | 개발자 PC | 없음 | `race/simulator.py` (JSONL Replay) |
| L2 | 개발자 PC + Coach 데모 PC | PM5 1대, USB BLE 동글 1개 | Python 서버 직접 실행 |
| L3 | 매장 현장 | PM5 4~8대, 동글 2개 | Python 서버 + 매장 Wi-Fi |
| L4 | 매장 현장 (출시 전) | PM5 8~20대, 동글 2~3개 | Python 서버 + Class TV + 다중 클라이언트 |

---

## 8. 검증 실행 기록 (Run Log)

각 회차의 검증 결과를 아래 표에 누적 기록합니다.

| 회차 | 일자 | 등급 | 담당 | PASS 항목 | FAIL 항목 | 비고 |
|------|------|------|------|-----------|-----------|------|
| #1 | TBD | L1 | TBD | - | - | 시뮬레이터 1차 |
| #2 | TBD | L2 | TBD | - | - | 단일 장비 |
| #3 | TBD | L3 | TBD | - | - | 다중 장비 |
| #4 | TBD | L4 | TBD | - | - | 출시 전 정원 운영 |

---

## 9. Acceptance 판정 기준

다음 조건을 모두 만족해야 Race 시스템을 **운영 수용 완료**로 판정합니다.

1. L1 항목 100% PASS
2. L2 항목 100% PASS
3. L3 항목 90% 이상 PASS (장비 가용성 한계 인정)
4. L4 항목 1회 이상 통합 검증 완료 (정원 운영 시뮬레이션)
5. 본 체크리스트의 결과 기록이 최소 1회 이상 누적

> 단순 코드 빌드 통과만으로 운영 수용 완료로 판단하지 않습니다.

---

## 관련 문서

- [Race 기획서](../archive/planning/race-system.md)
- [Python BLE 서버](../../race/)
- [`useRaceRealtime` 훅](../../src/hooks/useRaceRealtime.ts)
- [`useRaceAnimator` 훅](../../src/hooks/useRaceAnimator.ts)
- [PM Gap Analysis 2026-04-19](../archive/audit/audit-pm-gap-analysis-20260419.md)
- [Release Readiness 정비 기획서](../archive/planning/release-readiness-stabilization-task.md)
