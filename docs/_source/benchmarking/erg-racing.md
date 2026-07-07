# [벤치마킹 원자료] 인도어 로잉/에르고 레이스 시스템 (ErgRace/Time-Team/EXR/RowPro/Kinomap/Zwift)

> 리서치 에이전트 보고 원문 (2026-07-07). 종합은 16-benchmark-gap-analysis.md 참조.
> 출처 신뢰도: ●높음=검색 직접 확인 / ◐중간=부분 확인+지식 보강

## P1 — 강력 권고

### 1. 온트랙 페이스보트 / 버추얼 페이서 — P1
- 제공: Time-Team(기록 보유자 pace boat), ErgRace Chase Race(가속 페이서 추격, 2024), RowPro(페이스보트 3척+페이스 변경 20회 프로그래밍), EXR(PR 고스트), Zwift HoloReplay ●
- 동작: 가상 레인 1개가 목표 페이스(클럽 기록/회원 PR/코치 지정 스플릿)로 전진 — "이기고 있는지" 즉시 인지
- 현황: 부분 — 미니맵 1D 고스트 도트만(§5b.5). 트랙 위 가상 카트·페이스 소스 선택 없음
- 권고: simulator.py 가상 레인 + member_benchmark_results(PR 소스) + R-3 실거리 렌더 재사용 → Broadcast `virtual_lane` 플래그 1개로 파이프라인 오염 없이 저비용. 소인원 수업(2~3명) 재미 급상승

## P2 — 권고

### 2. 핸디캡/에이지·성별 그레이딩 스타트 — P2
- 제공: ErgRace 핸디캡 레이스 ◐, 마스터스 에이지 핸디캡 공식(예: (나이-27)²×0.02s/1000m) ●
- 현황: 없음 — 전 모드 동일 목표·동시 출발
- 권고: lane_assignments[].handicap_m 또는 start_delay_s + Portal 오프셋 계산(Python 무변경). 연령·수준 혼합 박스 수업에 실효성 높음

### 3. 기록 기반 시딩 + 예선→결승 진출 로직 — P2
- 제공: Time-Team Regatta Management(엔트리→시드 드로우→히트 승자 진출→결승) ●
- 현황: 부분 — 히트 분할→통합 랭킹(best)만, 자동 배정 가나다순, 기록순 결승 재편성 없음
- 권고: parent_event_id 시리즈에 heat_role(heat/final) + "이전 히트 기록순 재편성" 버튼. 시딩 소스=member_benchmark_results

### 4. 공식 결과 워크플로 — 승인·정정·PDF/인증서 — P2
- 제공: Time-Team(umpire 승인 후 공식 게시), ErgRace(PDF 결과+복수 레이스 병합), WR Virtual Sprints(인증서) ●
- 현황: **없음** — stop 시 자동 적재가 곧 최종. 오배정·DNF 정정, provisional/official 상태, 출력물 전무. 오배정 확정 시 벤치마크 이력(§6.2) 오염 위험
- 권고: race_records.status(provisional/official) + Coach 정정 UI(멱등 UPSERT라 재적재 안전) + PDF/이미지 카드 export

### 5. 드래그팩터 기록·기기 공정성 검증 — P2
- 제공: WR/Concept2 공식 검증 프로토콜(드래그팩터·PM5 verification code) ●
- 현황: 없음 — 구독 특성·race_records·JSONL 어디에도 DF 부재
- 권고: JSONL _meta.json + race_records.drag_factor 컬럼 — 파서 1개 확장. PR 공식 기록 신뢰성 근거

### 6. 참가자 1인칭 레이서 화면(자기 레인 포커스 모바일) — P2
- 제공: ErgRace Online 앱(참가자별 화면), RowPro(16인 각자 화면), EXR ●
- 현황: 부분 — §7.4 백로그 1줄만. 화면 명세·라우트 없음
- 권고: Broadcast anon 구독(§3.1) + 자기 시리얼 필터로 구현 가능. PM5 모니터는 순위 미표시라 체감 가치 큼

## P3 — 검토

### 7. Elimination(서바이벌)/Chase 포맷 — P3 (ErgRace 2024 ●) — 상태머신 무변경 증분 모드, P1·P2 후
### 8. 칼로리 목표·인터벌 레이스 — P3 — target_calories는 저비용 우선 후보(크로스핏 문법 적합), 인터벌은 상태머신 확장 커서 후순위
### 9. 원격 스펙테이터 라이브 트래커/방송 오버레이 — P3 — /class/race/view?overlay=1(투명 배경)+공개 토큰 링크 증분. 이벤트 마케팅 자산
### 10. 지점 간(멀티사이트) 원격 대항전 — P3 (ErgRace Online·Homerace ●) — §7.3은 격리만, 연결 개념 부재. 두 Python 브릿지가 같은 event_id 발행 모델을 §7.4 로드맵에 명시 가치
### 11. 스트릭트 스타트(공식 절차: Sit Ready–Attention–Row + false start 재출발) 옵션 — P3 — R-4 완화를 기본 유지, 이벤트 단위 start_mode(casual/strict) 플래그만 예약
### 12. 회원용 레이스 리플레이 — P3 (EXR·Kinomap·RowPro ●) — Replay 경로 기존재로 낮은 증분. JSONL Storage 아카이빙(§7.4)을 전제 조건으로 승격 필요

## 요약 매트릭스
| # | 기능 | 현황 | 권고 |
|---|---|---|---|
| 1 | 온트랙 페이스보트/버추얼 페이서 | 부분(도트만) | **P1** |
| 2 | 핸디캡/에이지 그레이딩 | 없음 | P2 |
| 3 | 시딩+예선→결승 진출 | 부분 | P2 |
| 4 | 공식 결과 워크플로·인증서 | 없음 | P2 |
| 5 | 드래그팩터 기록·검증 | 없음 | P2 |
| 6 | 참가자 1인칭 화면 | 부분(백로그) | P2 |
| 7 | Elimination/Chase | 없음 | P3 |
| 8 | 칼로리 목표·인터벌 | 부분 | P3 |
| 9 | 원격 관전/방송 오버레이 | 부분 | P3 |
| 10 | 지점 간 대항전 | 없음 | P3 |
| 11 | 스트릭트 스타트 옵션 | 부분 | P3 |
| 12 | 회원 리플레이 | 부분(dev 전용) | P3 |

총평: 실시간 파이프라인·연출·수업 운영은 벤치마크 동급 이상. 갭은 **"이벤트/대회 레이어"(핸디캡·시딩·진출·공식결과·검증)와 "가상 경쟁자"(페이스보트)** 축에 집중. #1·#4는 기존 자산(시뮬레이터·멱등 적재) 재사용으로 저비용.

출처: concept2.com(venue-race-application/ergrace-online/blog 2건), time-team.nl(indoor visualisation/regatta management/homerace), worldrowing.com(hybrid indoor), rules.worldrowing.com(ROI 29), exrgame.com, digitalrowing.com(RowPro/pace boat studio), support.kinomap.com(Shared mode), zwift.com(racing-faq), zwiftinsider.com(RoboPacers), c2forum(에이지 핸디캡), indoorrowing.co.nz(racing rules), log.concept2.com(인증서)
