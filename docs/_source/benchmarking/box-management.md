# [벤치마킹 원자료] 박스/짐 운영 관리 솔루션 (Wodify/PushPress/ZenPlanner/Mindbody/Glofox/TeamUp)

> 리서치 에이전트 보고 원문 (2026-07-07). 종합은 16-benchmark-gap-analysis.md 참조.

## P1 — 재구축 포함 권장

### 1. 예약 정책 엔진 (Booking Window / 취소 마감 / 주간 상한) — P1
- 제공: Glofox·TeamUp·Mindbody 등 사실상 전 솔루션 표준. 클래스·멤버십 유형별 "며칠 전부터 예약 가능 / N시간 전까지만 취소(이후 late cancel) / 주간 예약 상한 / 동시 예약 상한"을 관리자가 설정 → 예약 RPC가 자동 집행
- 현황: **부분/약함** — 03 §3.2에 "시각 기준 규정만 적용" 문구만 있고 규정의 저장 위치·설정 화면이 스키마·화면 어디에도 없음. fn_book/cancel_with_credit 명세에도 윈도우 검증 부재
- 권고: system_config 또는 sessions/membership_plans 레벨 정책 필드 + RPC 검증. 미도입 시 취소 규정 클라이언트 하드코딩 부채 재생산

### 2. 노쇼·지각취소 자동 페널티 집행 — P1
- 제공: TeamUp(Penalty System 자동 부과), Glofox(fee 자동 부과+24h 면제 리뷰), Wodify
- 현황: 부분 — attendance_outcome으로 "판정"만 있고 결과(크레딧 몰수, N회 누적 시 예약 제한)가 미정의
- 권고: "no_show 시 크레딧 미복구 + 월 N회 초과 시 D일 예약 제한" 정책 테이블+트리거. 자동 요금 부과는 자동결제 부재로 P2

### 3. 전자 동의서·웨이버 서명 — P1
- 제공: Zen Planner(카테고리별 웨이버+전자서명 온보딩 내장), Wodify(digital contracts), PushPress
- 현황: **없음** — facilities 약관 "열람"만. 서명 수집·보관·버전 관리 부재
- 권고: member_agreements(member_id, doc_version, signed_at, signature) 1테이블 + pending-approval 앞 서명 단계 + 미서명 필터. 부상 위험 큰 박스에서 법적 리스크 직결

### 4. 회원 셀프서비스 홀딩 신청 — P1(경량)
- 제공: TeamUp/Glofox/Mindbody — 회원 앱 홀딩 신청 → 정책 내 자동 승인 or 승인 큐
- 현황: 부분 — 홀딩 로직 완비(max_pauses, 종료일 이월)이나 Admin 전용. 회원은 전화/티켓 경유
- 권고: User profile 멤버십에 "홀딩 신청" 시트 + 승인 큐. 서버 로직 기존재라 저비용·티켓 수작업 즉감

## P2 — Phase 후순위

### 5. 리드·체험 퍼널 CRM (Lead→Trial→Member) — P2
- 제공: PushPress Grow(리드 캡처→자동 너처링→파이프라인), Zen Planner, Wodify CRM
- 현황: 없음 — 우리 CRM은 기존 회원 대상. 비회원 리드 엔터티·체험 신청·전환 추적 전무
- 권고: 최소형(leads 테이블+체험 신청 폼+파이프라인) Phase 3 후보

### 6. 정기 자동결제(빌링키)+dunning — P2
- 제공: Wodify/Stripe, Zen Planner, TeamUp — 해외 솔루션 수익 모델 근간
- 현황: 없음(의도적 배제 — 결제 불변식 "자동결제/빌링키 금지"). 만기 D-7 리마인더가 유일
- 권고: 현 배제는 타당(Fail-to-NOT-charge). Toss live 안정화 후 Toss 빌링 도입을 별도 Phase로 로드맵 명기, dunning 한 묶음 설계

### 7. At-Risk 리텐션 자동 감지·아웃리치 — P2
- 제공: Wodify Retain(자동 플래그→직원 태스크→접촉 추적), Mindbody Clients At Risk
- 현황: 부분 — 장기 미출석 리스트→Compose 딥링크로 발견까지만. 접촉 태스크/추적 없음
- 권고: 규칙 기반 경량 — notification_rules "N일 미출석" 트리거 + coach_followups에 retention 유형 확장(기존 자산 재활용)

### 8. 드롭인·체험권 상품 + 비회원 온라인 구매 — P2
- 제공: Wodify(drop-in pass·판매 페이지), PushPress, Glofox
- 현황: 없음 — plans 2종(기간제/횟수권), 구매는 승인 회원 한정. 드롭인은 수동 처리만
- 권고: 재구축 시 plans에 plan_kind: drop_in 여지만 확보, 비회원 결제 플로우는 후속 Phase

### 9. 1:1 PT 어포인트먼트 예약 — P2
- 제공: Mindbody(클래스+어포인트먼트 이원), Wodify(PT 패키지), Zen Planner
- 현황: 없음 — sessions는 그룹 수업 단일. 코치 가용 슬롯·PT 상품·세션별 정산 부재
- 권고: sessions.session_type=personal + 코치 가용성 테이블 확장 여지만 스키마에 남기고 구현 후순위

### 10. 온보딩·마일스톤 자동 커뮤니케이션 — P2
- 제공: PushPress Grow(온보딩 워크플로), Wodify(첫 방문 환영/N회 축하/복귀 환영 자동)
- 현황: 부분 — notification_rules 기반은 있으나 트리거가 운영 이벤트뿐
- 권고: trigger_type 어휘 확장(first_checkin, checkin_count, days_inactive, signup_welcome)만으로 저비용 도입

## P3 — 과잉/비권장 (인지만)
- 11. 리테일 POS·재고(Mindbody) — 수동 등록으로 충분
- 12. 24/7 무인 도어 액세스(PushPress+Kisi) — 코치 상주형 모델에 불필요, 무인 운영 결정 시 QR·kiosk_devices 재활용
- 13. 가족/연결 계정(PushPress) — 성인 박스 수요 낮음, 키즈 클래스 시 P2 승격
- 14. 회원 정기 자동 예약(Glofox) — 크레딧 차감·노쇼 정책과 충돌, 우리 모델 부적합
- 15. 마케팅 드립·평판 스위트(Mindbody) — 단일 시설 과잉, 리퍼럴만 향후 P2 분리 검토

## 요약 매트릭스
| # | 기능 | 현황 | 권고 |
|---|---|---|---|
| 1 | 예약 정책 엔진 | 부분(문구만) | **P1** |
| 2 | 노쇼 자동 페널티 집행 | 부분(판정만) | **P1** |
| 3 | 전자 웨이버 서명 | 없음 | **P1** |
| 4 | 셀프서비스 홀딩 | 부분(Admin 전용) | **P1** |
| 5 | 리드·체험 퍼널 | 없음 | P2 |
| 6 | 자동결제+dunning | 없음(의도적) | P2 |
| 7 | At-risk 리텐션 자동화 | 부분 | P2 |
| 8 | 드롭인·체험권 판매 | 없음 | P2 |
| 9 | 1:1 PT 어포인트먼트 | 없음 | P2 |
| 10 | 라이프사이클 자동 메시지 | 부분 | P2 |
| 11~15 | POS/도어/가족/정기예약/마케팅 | — | P3 |

핵심 결론: 운영 내부 도구(WOD/퍼포먼스/정산/RBAC)는 경쟁 대비 깊으나 **(a) 예약·노쇼 정책의 저장소와 집행 (b) 회원 획득 퍼널 (c) 결제 자동화** 3축이 구조적 공백. P1 4건은 기존 테이블·RPC 소폭 추가로 흡수 가능 — 스키마 확정 전 반영 권장.

출처: wodify.com(payments/retain), pushpress.com(grow/24-7-access/core), zenplanner.com(product/waivers), support.glofox.com(booking windows/recurring), glofox.com(new fees), goteamup.com(penalty fees), mindbodyonline.com(marketing), athletechnews.com(mindbody AI) — 대부분 공식 페이지, 일부(Glofox 24h 면제, Retain 플래그 유지) 검색 요약 기반 중간 신뢰도
