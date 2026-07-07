# [벤치마킹 원자료] WOD 프로그래밍·퍼포먼스 트래킹 (SugarWOD/BTWB/Wodify/TrainHeroic/PushPress)

> 리서치 에이전트 보고 원문 (2026-07-07). 종합은 16-benchmark-gap-analysis.md 참조.

## P1 — 핵심 결손

### 1. 일일 WOD 점수 로깅 (디지털 화이트보드) — P1
- 제공: SugarWOD Whiteboard, Wodify Perform, BTWB, PushPress Train — 5개 솔루션 전부의 중핵
- 동작: 코치 발행 "오늘의 WOD"에 회원이 결과(시간/라운드+렙/중량) 기록 → 세션/날짜 단위 화이트보드에 전원 결과 → 일일 리더보드·소셜 피드. 기록→비교→반응 리텐션 루프의 시작점
- 현황: **없음(구조적 공백)**. member_benchmark_results는 benchmark_definitions에만 FK. session_wods에 대한 회원 점수 테이블·RPC 부재 — 벤치마크가 아닌 평일 WOD는 기록 불가
- 권고: session_wod_results(session_wod_id, member_id, score, score_type, rx_status, note) 신설 + 퍼포먼스 허브·Class 리더보드 연동

### 2. RX / Scaled 구분 + 계층 리더보드 — P1
- 제공: Wodify Perform(Rx+→Rx→Scaled 정렬), SugarWOD(rx/scaled/modified), BTWB
- 현황: 없음. wod_template_movements에 ♂♀ RX load는 있으나 회원 기록 측에 rx/scaled 개념 전무
- 권고: 기록 스키마 rx_status(rx_plus/rx/scaled) 1컬럼 — 박스 문화 표준 어휘, 부재 시 신뢰 하락

### 3. WOD Prep — 예정 WOD에 내 과거 기록 자동 매칭 — P1~P2
- 제공: BTWB(과거 결과 자동 로드), SugarWOD(WOD PREP: 과거 PR+영상), TrainHeroic
- 현황: 부분 — 세션 상세 WOD 미리보기(fn_get_class_display_wod)는 공개 표시 전용, 내 기록 크로스매칭 없음
- 권고: 회원용 RPC 1개(fn_get_session_wod 응답에 본인 벤치마크 베스트 조인)

## P2 — 리텐션 관점 취약

### 4. 소셜 리액션(피스트범프·코멘트) — P2
- 제공: SugarWOD(fist bumps+comments 대표 기능), Wodify(likes), PushPress(그룹 피드)
- 현황: 없음. record_reactions(record_ref, member_id, type) + 알림 룰 1종이면 도입 가능(notifications 인프라 기존재)

### 5. 1RM 추정·%1RM 자동 계산 — P2
- 제공: BTWB(e1RM 자동 추정+%1RM 분해), Wodify(1RM 이력), TrainHeroic("3x5 @80%" 개인 환산)
- 현황: 없음. metric_type=weight 실측 베스트만 저장. %1RM 처방 개념 없음
- 권고: 1단계 추정 1RM 표시+퍼센트 표 → 2단계 처방 연동

### 6. 출석 대비 기록률 코치 인사이트 — P2
- 제공: SugarWOD(participation 모니터링), PushPress(Compliance Report), Wodify(at-risk 식별)
- 현황: 없음. 코치 KPI는 수업수·출석률·평점뿐, checkins↔기록 크로스 지표 부재. coach_followups와 시너지 가능
- 권고: 1번 도입 전제로 KPI 지표 1개+대시보드 위젯

### 7. 동작 데모 영상 — P2
- 제공: SugarWOD(동작 영상+일일 브리핑), TrainHeroic(전 동작 데모), PushPress
- 현황: 없음. movement_library에 미디어 필드 부재
- 권고: movement_library.demo_video_url + WOD 뷰어 재생 버튼(링크 방식 저비용)

### 8. 마일스톤 자동 감지·축하 — P2
- 제공: Wodify(100번째 수업·기념일 daily brief+자동 축하), PushPress(PR Confetti)
- 현황: 부분 — 배지⏳가 회원 보상은 커버 가능하나 코치 대시보드 "오늘의 축하" 브리핑·자동 축하 알림 룰 미설계
- 권고: 배지 스키마에 마일스톤 타입 포함 + 코치 대시보드 축하 위젯(위험 위젯과 균형)

## P3 — 장기 로드맵

### 9. 종합 피트니스 레벨·약점 분석 — P3 (BTWB Fitness Level 1-100, 8카테고리 레이더)
- 현황: 없음. movement_categories가 토대. 단순화 버전(카테고리별 분포 레이더)부터 검토

### 10. 기간 한정 챌린지·커스텀 리더보드 — P3 (SugarWOD 인트라뮤럴/오픈 팀전)
- 현황: 부분 — race_events/race_teams는 PM5 전용, 일반 WOD 챌린지 재사용 불가. 배지·랭킹 위 challenges 도메인

### 11. 프로그래밍 트랙/레벨 구독 — P3 (SugarWOD fitness/performance/competitor)
- 현황: 없음(세션당 단일 session_wods). 단일 박스 규모 과설계 위험 — track 차원 추가로 확장 가능 구조만 유지

### 12. 레디니스/습관 트래킹 — P3 (TrainHeroic Readiness Survey, PushPress Habit)
- 현황: 부분 — 사후 별점만. member_alert_flags·후속조치와 연결 시 차별화

## 요약
| # | 기능 | 현황 | 권고 |
|---|---|---|---|
| 1 | 일일 WOD 점수 로깅(화이트보드) | 없음 | **P1** |
| 2 | RX/Scaled 구분+계층 리더보드 | 없음 | **P1** |
| 3 | WOD Prep(과거 기록 매칭) | 부분 | **P1~P2** |
| 4 | 소셜 리액션 | 없음 | P2 |
| 5 | 1RM 추정·%1RM | 없음 | P2 |
| 6 | 출석 대비 기록률 인사이트 | 없음 | P2 |
| 7 | 동작 데모 영상 | 없음 | P2 |
| 8 | 마일스톤 축하·브리핑 | 부분 | P2 |
| 9 | 피트니스 레벨 분석 | 없음 | P3 |
| 10 | 챌린지·커스텀 리더보드 | 부분 | P3 |
| 11 | 프로그래밍 트랙 | 없음 | P3 |
| 12 | 레디니스/습관 | 부분 | P3 |

핵심 결론: 퍼포먼스 도메인이 "벤치마크 중심"으로 설계돼 경쟁 제품 중심축인 **매일의 WOD 결과 로깅+소셜/리더보드**가 구조적으로 부재. session_wods(발행)↔기록 사이를 잇는 일일 기록 테이블 1개가 최우선 보강 지점(Class 리더보드·배지·코치 KPI 연쇄).

출처: sugarwod.com/coach-features·athlete-features, support.btwb.com(Fitness Level), wodify.com/products/performance-tracking·perform, help.wodify.com(PR), trainheroic.com/coach, support.trainheroic.com(세션 로깅), pushpress.com/products/train, help.pushpress.com(Habit), SugarWOD Open 가이드 PDF — 전 항목 벤더 공식 사이트/헬프센터 기반
