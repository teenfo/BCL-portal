# 16. 벤치마킹 갭 분석 — 유사 솔루션 대비 누락 기능 최종 검수

> 재구축 설계 최종 검수(2026-07-07). 4개 카테고리 병렬 리서치로 경쟁/유사 솔루션의 기능을 조사해
> rebuild 설계 세트(01~15, 07-data-model, sql/)와 전수 대조한 종합 결과.
> **원자료(카테고리별 상세·출처)**: `_source/benchmarking/{box-management, wod-performance, erg-racing, kr-market}.md`

## 0. 조사 범위와 방법

| 카테고리 | 벤치마크 대상 | 원자료 |
|---|---|---|
| 박스/짐 운영 | Wodify, PushPress, Zen Planner, Mindbody, Glofox, TeamUp | box-management.md |
| WOD·퍼포먼스 | SugarWOD, BTWB, Wodify Perform, TrainHeroic, PushPress Train | wod-performance.md |
| 에르고 레이스 | Concept2 ErgRace(+Online), Time-Team(+Homerace), EXR, RowPro, Kinomap, Zwift | erg-racing.md |
| 국내 시장 | 다짐매니저, 바디코디, 포인티, 어시스트핏, 모두싸인, 효성CMS + 공정위/국세청 규정 | kr-market.md |

각 리서치는 우리 설계 문서를 먼저 정독한 뒤 웹 조사(공식 features/help 페이지 우선)로 대조 —
"이미 갖춘 기능"은 배제하고 **없거나 약한 기능만** 보고. 본 문서는 4건을 중복 제거·종합한 최종 판정이다.

**총평**: 운영 내부 도구(WOD 스튜디오·코치 OS·정산·RBAC·Race 실시간 파이프라인)는 벤치마크 대비 **동급 이상**.
갭은 4개 축에 집중된다 —
① **일상 기록 루프**(매일의 WOD 점수 로깅과 그 위의 리더보드/소셜),
② **정책의 저장소와 집행**(예약 윈도우·노쇼 페널티·환불 산정),
③ **회원 획득·수납 경계**(드롭인/체험, 현금영수증, 웨이버),
④ **Race 대회 레이어**(페이스보트·핸디캡·공식 결과).

---

## 1. P1 — 재구축 범위 반영 권고 (스키마 확정 전 필수 검토 10건)

> 판정 기준: (a) 경쟁 전 솔루션 공통의 중핵 기능이거나 (b) 법규·현장 운영 직결이면서 (c) 기존 설계 자산에 소폭 추가로 흡수 가능.

| # | 기능 | 출처 | 현황 | 반영 포인트 (스키마/문서) |
|---|---|---|---|---|
| G-1 | **일일 WOD 점수 로깅(디지털 화이트보드)** | 5개 WOD 솔루션 전부의 중핵 | **구조적 공백** — 벤치마크만 기록 가능, 평일 WOD는 기록 불가 | `session_wod_results`(session_wod_id, member_id, score, score_type, rx_status, note) 신설 + 기록 RPC 2종 + 퍼포먼스 허브·Class 리더보드 연동. 04_wod/09_rpc, 03·04·05 문서 |
| G-2 | **RX/Scaled 구분 + 계층 리더보드** | Wodify(Rx+→Rx→Scaled 정렬), SugarWOD | 없음 | G-1 테이블 + `member_benchmark_results.rx_status` 1컬럼. 박스 문화 표준 어휘 |
| G-3 | **WOD Prep(예정 WOD에 내 과거 기록 매칭)** | BTWB, SugarWOD | 부분(공개 미리보기만) | 회원용 RPC 1종(세션 WOD 응답에 본인 베스트 조인). 03 문서 §3.2 |
| G-4 | **예약 정책 엔진(예약 윈도우/취소 마감/주간 상한)** | Glofox·TeamUp 등 전 솔루션 표준 | 부분/약함 — "규정 적용" 문구만, 저장소·설정 화면·RPC 검증 없음 | `facilities.booking_policy` JSONB(또는 system_config) + `fn_book/cancel_with_credit` 검증 단계 + Admin settings 탭. 미반영 시 클라이언트 하드코딩 부채 재생산 |
| G-5 | **노쇼·지각취소 페널티 자동 집행** | TeamUp Penalty, Glofox | 부분 — 판정(attendance_outcome)만 있고 결과 없음 | 정책(크레딧 몰수/월 N회 초과 시 D일 예약 제한) + 집행 트리거. G-4와 같은 정책 JSONB |
| G-6 | **전자 동의서·웨이버 서명** | Zen Planner, Wodify, 모두싸인(국내) | 없음 — 약관 "열람"만 | `member_agreements`(member_id, doc_type, doc_version, signed_at, signature) + 가입 승인 전 서명 단계 + 미서명 필터. 부상 위험 업종 법적 리스크 + 환불 분쟁 방어 |
| G-7 | **드롭인·체험권 상품(비회원/게스트)** | 박스 표준 문화, 바디코디 키오스크 일일권 | 없음 — plans 2종뿐, **키오스크가 NO_MEMBERSHIP 거부라 드롭인 체크인 자체 불가** | `membership_plans.plan_kind`에 drop_in/trial 추가 + 키오스크 분기 + 게스트 처리 흐름. 06 문서 §4.2 |
| G-8 | **환불 위약금 법규 정합(공정위 10% 상한)** ⚠️ | 공정위 산정기준·소비자분쟁해결기준 | **위험 기본값** — 08 §1.6 "1/2 경과 전 20%, 후 환불 불가"는 분쟁 실무와 충돌 | 기본 산식을 `결제금액 − 이용일수 해당액 − min(위약금, 총액×10%)`로 교정. refund_policy JSONB 구조는 유지. **설계 결함 교정 성격** |
| G-9 | **현금영수증 발급 관리** | 국세청 의무발행 업종(미발급 시 20% 가산세) | 없음 — 현장 현금/이체 매출 무방비 | `transactions`에 cash_receipt_status/approval_no + 미발급 경고 리포트 + Toss 현금영수증 API(08 문서) |
| G-10 | **Race 온트랙 페이스보트/버추얼 페이서** | Time-Team, ErgRace Chase, RowPro, EXR, Zwift | 부분 — 미니맵 1D 도트만 | Broadcast `virtual_lane` 플래그 + 페이스 소스 선택(회원 PR/클럽 기록/코치 지정). 기존 시뮬레이터·R-3 렌더 재사용으로 저비용. 15 문서 §4b·5b |

**공수 특성**: G-1~G-3(일일 기록 축)이 가장 큰 덩어리(테이블 1+RPC 3+화면 연동). 나머지는 각각 컬럼 1~2개+JSONB 정책+RPC 검증 수준.
G-8은 기능 추가가 아니라 **기존 설계의 교정**이므로 무조건 반영 권고.

## 2. P2 — 차기 Phase 로드맵 등재 권고 (16건, 중복 통합)

| # | 기능 | 출처 | 비고 |
|---|---|---|---|
| G-11 | 소셜 리액션(피스트범프·코멘트) | SugarWOD 대표 기능 | reactions 테이블+알림 룰 1종. G-1 후속 |
| G-12 | 1RM 추정(e1RM)·%1RM 환산 | BTWB, TrainHeroic | 1단계 표시만이라도. 처방 연동은 2단계 |
| G-13 | 출석 대비 기록률 코치 인사이트 | SugarWOD, PushPress | G-1 전제. 코치 KPI 지표 1개+위젯 |
| G-14 | 동작 데모 영상 | SugarWOD, TrainHeroic | `movement_library.demo_video_url` 링크 방식 |
| G-15 | 마일스톤 자동 축하 + 라이프사이클 자동 메시지 (온보딩/생일/재등록 유도/장기 미출석) | Wodify, PushPress Grow, 다짐매니저 18종 | notification_rules trigger_type 어휘 확장만으로 흡수(first_checkin, checkin_count, days_inactive, signup_welcome, birthday, renewal_lapsed) |
| G-16 | At-Risk 리텐션 자동 감지·아웃리치 태스크 | Wodify Retain, Mindbody | 규칙 기반 경량 — coach_followups에 retention 유형 확장 |
| G-17 | 셀프서비스 홀딩 신청 | TeamUp, Glofox | 서버 로직 기존재 — User 앱 시트+승인 큐만. **P1 승격 후보**(저비용·티켓 수작업 즉감) |
| G-18 | 리드·체험 퍼널 CRM(비회원 리드→상담→전환) | PushPress Grow, 바디코디(네이버 플레이스) | 성장기 진입 시 최우선. 최소형 leads 파이프라인 |
| G-19 | 1:1 PT 어포인트먼트·세션권·커미션 | Mindbody, 포인티 | **BCL이 PT 상품 판매 시 P1 승격** — 스키마에 sessions.session_type 확장 여지만 확보 |
| G-20 | 정기 자동결제(Toss 빌링/CMS 이체)+dunning | 전 해외 솔루션, 효성CMS | 현 배제(Fail-to-NOT-charge)는 타당 — Toss live 안정화 후 별도 Phase로 로드맵 명기 |
| G-21 | 미수금(부분 수납) 관리 | 다짐매니저·바디코디 공통 | 멤버십 1:결제 N 매핑 + 미수 대시보드 |
| G-22 | Race 핸디캡/에이지 그레이딩 스타트 | ErgRace, 마스터스 표준 | lane_assignments[].handicap_m 필드 — Python 무변경 |
| G-23 | Race 시딩+예선→결승 진출 로직 | Time-Team Regatta | parent_event_id에 heat_role + 기록순 재편성 버튼 |
| G-24 | Race 공식 결과 워크플로(정정·provisional/official·PDF/인증서) | Time-Team, ErgRace | 오배정 확정 시 벤치마크 이력 오염 방지 — race_records.status |
| G-25 | Race 드래그팩터 기록·검증 | WR/Concept2 프로토콜 | race_records.drag_factor + JSONL _meta. PR 공식성 근거 |
| G-26 | Race 참가자 1인칭 화면(자기 레인 모바일) | ErgRace Online, RowPro | Broadcast anon 구독+시리얼 필터로 구현 가능 |

## 3. P3 — 인지만 (도입 비권장 또는 장기)

WOD: 피트니스 레벨·약점 레이더(BTWB) / 챌린지·커스텀 리더보드(오픈 인트라뮤럴) / 프로그래밍 트랙 다중화 / 레디니스·습관 트래킹.
운영: 리테일 POS·재고 / 24/7 도어 액세스(무인 운영 결정 시 재검토 — fn_kiosk_checkin 응답에 개방 신호 확장점만 문서화) / 가족 계정(키즈 클래스 시 P2) / 회원 정기 자동 예약(크레딧·노쇼 정책과 충돌, 부적합 판정) / 마케팅 드립·평판 스위트 / 네이버 플레이스 연동 / 락커 요금 상품화(경량이라 P2 승격 여지).
Race: Elimination/Chase 포맷 / 칼로리 목표(저비용 우선 후보)·인터벌 레이스 / 원격 관전·방송 오버레이(?overlay=1) / 지점 간 원격 대항전(다지점 확장 시) / 스트릭트 스타트 옵션(start_mode 플래그만 예약) / 회원용 리플레이(JSONL Storage 아카이빙 전제).

## 3.5 구현 반영 현황 (재검수 2026-07-09)

> §1~2는 설계 마감(2026-07-07) 시점의 벤치마킹 판정이다. 이후 P1 권고가 스키마·RPC·화면으로 반영된 상태를 아래에 재대조한다.
> 판정: ✅ 반영(스키마+RPC+화면 배선) · 🟡 스키마/RPC 반영, 화면 배선 부분 · ⏳ 미착수. 근거는 마이그레이션/소스 경로 병기.

| # | 기능 | 현 상태 | 근거 |
|---|---|---|---|
| G-1 | 일일 WOD 점수 로깅 | ✅ | `session_wod_results`(20260708004000) + `fn_record_session_wod_result`/`fn_get_session_wod_whiteboard`(009000/080000) + UI(member-performance `RecordsTab`·`WodRecordSheet`, coach-schedule `WhiteboardPanel`) |
| G-2 | RX/Scaled 계층 리더보드 | ✅ | `fn_get_session_wod_whiteboard` Rx+→Rx→Scaled 계층 정렬 |
| G-4 | 예약 정책 엔진 | 🟡 | `facilities.booking_policy` JSONB(20260708001000: booking_open_days/cancel_deadline_hours/weekly_booking_cap) 단일 소스. 집행은 `fn_book_with_credit`·`fn_cancel_booking_with_credit` 내부. Admin settings 편집 UI 확인 필요 |
| G-5 | 노쇼·지각취소 페널티 | 🟡 | `booking_policy.noshow_penalty`(credit_forfeit/monthly_threshold/restrict_days) JSONB 저장. 자동 집행 트리거 배선은 확인 필요 |
| G-6 | 전자 동의서·웨이버 서명 | 🟡 | `member_agreements`(20260708001000: terms/privacy/refund_policy/health_waiver). 가입 승인 전 서명 단계 UI 배선 확인 필요 |
| G-7 | 드롭인·체험권 상품 | 🟡 | `membership_plans.plan_kind`(standard/drop_in/trial) + 샘플 시드(20260709040000) + 키오스크 plan_kind 인식 체크인. **비회원(게스트) 온보딩 흐름은 진행 중**(kiosk provisioning/guest-checkin in-flight) |
| G-8 | 환불 위약금 10% 상한 | ✅ | `fn_calculate_refund`(009000, 10% 캡) + 결제 구매 3단계(member-purchase) + 관리자 환불 2단계(payments/RefundModal, `fn_request_refund`/`fn_process_refund`, 20260709030000) |
| G-9 | 현금영수증 발급 관리 | 🟡 | `transactions.cash_receipt_status`(20260708002000: not_required/pending/issued/failed) 컬럼. 미발급 경고 리포트·Toss 현금영수증 API 배선은 ⏳ |
| G-10 | Race 페이스보트/버추얼 페이서 | ⏳ | `virtual_lane`/페이서 미구현 — race pacer + broadcast publisher는 진행 중(다른 에이전트) |

**추가 반영(§1~2 미등재)**: PM5 기기 관리(`fn_admin_upsert_pm5_device`/`fn_admin_delete_pm5_device`/`fn_list_pm5_devices`, 20260709060000 — admin/coach race 장비 UI) · 회원 아바타 업로드(`avatars` Storage 버킷, 20260709050000) · 셀프 홀딩 관련 서버측 조정은 admin `fn_admin_adjust_membership`(hold/resume, 20260708040000)로 존재하나 **회원 셀프서비스 홀딩(G-17)은 여전히 ⏳**.

**여전히 열림(P1)**: G-4/G-5 집행·설정 UI 검증 · G-6 서명 단계 UI · G-7 게스트 온보딩 · G-9 발급 리포트/API · G-10 페이서.
**P2/P3**: §2·§3 로드맵 유지(G-11~G-26 미착수 — 10-gaps-and-debt.md 로드맵 참조).

## 4. 검수 결론

1. **설계 결함 1건**: G-8(환불 위약금 기본값)은 법규 리스크로 반영 여부 판단 대상이 아닌 **교정 대상**.
2. **구조적 공백 1건**: G-1(일일 WOD 기록)은 경쟁 제품군의 중심축이 통째로 빠진 유일한 항목 — 리더보드·배지·코치 KPI가 전부 이 위에 얹히므로 스키마 확정 전 결정 필요.
3. 나머지 P1 8건은 기존 테이블·RPC에 컬럼/정책 JSONB/검증 단계 추가 수준으로, **지금 반영하는 비용 ≪ 운영 후 소급 비용**.
4. P2는 10-gaps-and-debt.md 로드맵과 병합해 Phase 배치, P3는 스키마 확장 여지(컬럼 예약·CHECK 확장형)만 확인하고 종결.

**반영 절차(승인 시)**: contract.md 4차 보정(테이블 2·컬럼 6·RPC 3·정책 JSONB 2) → 07-data-model·sql 증분 → 해당 앱 문서(02/03/04/05/06/08/15) 섹션 갱신 → 교차검수에 포함.
