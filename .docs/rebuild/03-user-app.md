# 03. User 앱 (회원 모바일) — 재구축 설계

> **대상**: `/apps/*` (role=`member`) · 모바일 하단탭 앱
> **근거 스냅샷**: `_source/screens-inventory.md` §2, `_source/backend-inventory.md`, `_source/nonfunctional-history.md`
> **표준 계약**: `_source/contract.md` — 테이블·RPC 명칭, User 탭 5종 IA(§5), 상태 표기(§1)를 그대로 따른다.
> **상태 표기**: ✅ 운영 중 · 🟡 코드완료(검증 대기) · 🧪 mock/시뮬레이션 · ⏳ 미구현(신규 설계) · 🔄 to-be에서 변경/통합

---

## 1. 개요 · 설계 원칙

| 항목 | 내용 |
|---|---|
| 성격 | 회원용 모바일 앱(PWA). 하단탭 5개 + 비탭 스택 화면 최소화 |
| 진입 가드 | `profiles.role='member'` AND `profiles.approval_status='approved'` (pending/rejected는 `/auth/pending-approval`·`/auth/rejected`로 — 01-auth 참조). ⏳ 가입 승인 전 웨이버(전자 동의서) 서명 단계 포함 — `fn_sign_agreement`→`member_agreements` 적재, 플로우 본문은 01-auth (G-6, 16 문서) |
| 데이터 접근 | `query()`/`rpc()` 헬퍼 강제. 비즈니스 데이터는 **member_id 기준**(auth user_id 직접 사용 금지) — `auth.uid()→members.user_id` 매핑은 RPC/RLS 내부에서만 수행 |
| RPC 규약 | SECURITY DEFINER + envelope `{success, data, error}` 1종. 클라이언트가 member_id를 전달하지 않는다(서버가 `auth.uid()`로 판정) |
| 디자인 | `--bcl-*` 토큰 단일 세트, `data-density=mobile`, 표준 컴포넌트(BottomSheet 92vh, Toast, EmptyState, Skeleton) — 12-design-system 준수 |
| 알림 | In-App + Realtime 토스트(1차 100%) > Web Push(PWA) > 카카오/SMS — 08-integrations 참조 |

---

## 2. as-is → to-be 메뉴 대조표

### 2.1 as-is 전수 (page.tsx 22개 = 하단탭 5 + 추가 화면군 10)

하단탭 5: `dashboard / schedule / checkin / facilities / profile`
추가 화면군 10: index, schedule/bookings, notifications, purchase(+success/fail), feedback, records, badges, coaches, leaderboard, profile 하위 6종

### 2.2 대조표 (as-is 22 라우트 → to-be 하단탭 5 + 비탭 3)

| # | as-is 라우트 | as-is 상태 | to-be 배치 | 근거 |
|---|---|---|---|---|
| 1 | `/apps` (인덱스) | ✅ | 🔄 `/apps` → home 리다이렉트 | 인덱스 단독 화면 불필요 |
| 2 | `/apps/dashboard` | ✅ | 🔄 **탭1 home** (`/apps/home`) | 명칭만 표준화(admin dashboard와 구분), 기능 승계 |
| 3 | `/apps/schedule` | ✅ | **탭2 schedule** 유지 | 핵심 사용 동선(예약) — 단독 탭 유지 |
| 4 | `/apps/schedule/bookings` | ✅ | 🔄 schedule 내 "내 예약" 탭 | 동일 도메인(세션 목록 vs 내 예약)의 화면 분리 불필요 — 탭 전환으로 통합 |
| 5 | `/apps/checkin` | ✅ | **탭3 checkin** 유지 | QR 체크인은 매장 진입 시 즉시성 필요 — 단독 탭 유지 |
| 6 | `/apps/facilities` | ✅ | 🔄 폐지 → home 지점 카드 + profile 시트 "지점 정보" 항목 | 정적 정보(주소/운영시간/지도)에 하단탭 1개는 과투자. 조회 빈도 낮음 |
| 7 | `/apps/records` | ✅ | 🔄 **탭4 performance §내 기록** | 기록·랭킹·배지는 모두 "내 성과" 단일 관심사 — 3화면 분산으로 발견성 저하. 허브 1탭 3섹션으로 통합 |
| 8 | `/apps/leaderboard` | ✅ | 🔄 **탭4 performance §랭킹** | 상동 |
| 9 | `/apps/badges` | ✅(UI)/⏳(데이터) | 🔄 **탭4 performance §배지** | 상동. 배지 테이블은 마이그레이션 부재 → 07에서 정식 설계 |
| 10 | `/apps/coaches` | ✅ | 🔄 폐지 → 세션 상세(schedule)·home 코치 카드로 흡수 | 코치 소개는 "이 수업 누가 하나"의 맥락 정보 — 독립 목록 화면보다 세션 맥락 노출이 유효 |
| 11 | `/apps/profile` | ✅ | 🔄 **탭5 profile — 단일 설정 시트** | 하위 페이지 이동 없이 시트 내 섹션 전환(§3.5) |
| 12 | `/apps/profile/edit` | ✅ | 🔄 profile 시트 §내 정보 | 5개 하위 라우트가 각각 풀 페이지 — 네비게이션 깊이 3 → 1로 축소 |
| 13 | `/apps/profile/memberships` | ✅ | 🔄 profile 시트 §멤버십 | 상동 |
| 14 | `/apps/profile/payments` | ✅ | 🔄 profile 시트 §결제 내역 | 상동 |
| 15 | `/apps/profile/settings` | ✅ | 🔄 profile 시트 §앱 설정 | 상동 |
| 16 | `/apps/profile/support` | ✅ | 🔄 profile 시트 §지원(문의/FAQ) | 상동 |
| 17 | `/apps/profile/notifications` | ✅ | 🔄 profile 시트 §알림 설정 | 상동 (수신 히스토리 #18과 역할 분리: 여기는 "설정") |
| 18 | `/apps/notifications` | ✅ | 유지(비탭 스택) — home 상단 벨 진입 | 히스토리는 탭 자격은 없으나 독립 화면 필요(무한 스크롤) |
| 19 | `/apps/purchase` | 🧪(Toss simulation) | 유지(비탭 스택) — profile 시트·home 만료 배너에서 진입 | 결제는 저빈도·고위험 플로우 — 탭 비승격, 진입점만 명확화 |
| 20 | `/apps/purchase/success` | 🧪 | 유지(purchase 하위) | Toss 리다이렉트 규약상 라우트 필수 |
| 21 | `/apps/purchase/fail` | 🧪 | 유지(purchase 하위) | 상동 |
| 22 | `/apps/feedback` | ✅ | 유지(비탭 스택) — 수업 종료 알림·home 카드에서 진입 | 이벤트 트리거형 화면(수업 후) — 탭 비승격 |

### 2.3 to-be IA 확정 (contract §5)

```
/apps (하단탭 5)
├── home          오늘 요약·D-Day·공지·알림 벨
├── schedule      [수업 목록 | 내 예약] — 예약/Waitlist/취소
├── checkin       동적 QR(5분) + 출석 캘린더
├── performance 🔄 [내 기록 | 랭킹 | 배지] 허브
└── profile 🔄     단일 설정 시트 (+purchase/feedback 진입)
비탭 스택: /apps/notifications, /apps/purchase(+success/fail), /apps/feedback
```

**통폐합 효과**: 라우트 22 → 10(탭 5 + 인덱스 1 + 스택 4), 하단탭의 정보 성격 균질화(전부 "행동" 탭 — 정적 정보 탭 제거).

---

## 3. 화면 상세

### 3.1 탭1 — home (`/apps/home`) 🔄

| 항목 | 내용 |
|---|---|
| 목적 | 오늘 하루의 내 운동 상태를 10초 내 파악, 다음 행동(예약/체크인/결제) 유도 |
| 핵심 기능 | ① 오늘 예약·체크인 상태 카드(다음 수업 CTA→schedule 상세) ② 멤버십 D-Day/잔여 크레딧 배지(만료 임박 시 purchase 진입 배너) ③ 공지 슬라이드(notices/banners) ④ 상단 알림 벨(미읽음 뱃지)→`/apps/notifications` ⑤ 지점 정보 카드(운영시간·주소 — as-is facilities 탭 흡수) ⑥ 최근 PR 하이라이트(performance 진입 유도) |
| 데이터 | `bookings`(오늘, member_id), `checkins`(오늘), `sessions`, `memberships`(+`membership_plans`), `notices`, `banners`, `notifications`(미읽음 count), `member_benchmark_results`(최근 is_pr) |
| 상태·권한 | RLS: 본인 member_id 행만. 멤버십 없음 → EmptyState + purchase CTA |
| 현재 상태 | ✅ (as-is dashboard 승계) / 지점 카드·PR 하이라이트는 🔄 재배치 |

### 3.2 탭2 — schedule (`/apps/schedule`)

| 항목 | 내용 |
|---|---|
| 목적 | 주간 수업 탐색 → 예약/대기 → 내 예약 관리를 한 화면에서 완결 |
| 핵심 기능 | ① 주간 캘린더 + 세션 목록(코치/정원/잔여 — 코치 카드 as-is coaches 흡수) ② 세션 상세 BottomSheet: WOD 미리보기(`fn_get_class_display_wod` 결과 요약)·서킷 뷰어·코치 소개 + ⏳ **WOD Prep**: `fn_get_my_wod_prep(p_session_id)` — 예정 WOD의 동일 벤치마크·동작에 대한 **본인 과거 베스트 병기**(오늘 목표 페이스 참고) (G-3, 16 문서) ③ 예약/Waitlist 등록 ④ "내 예약" 탭: 확정/대기/지난 예약, 취소 ⑤ 대기→확정 승격 시 Realtime 토스트 ⑥ ⏳ **예약 제한 상태 배너**: 노쇼 페널티로 예약 제한 중이면 제한 사유·해제 예정일 표시(예약 버튼 비활성 + 사유 안내) (G-5, 16 문서) |
| 데이터 | `sessions`, `session_coaches`(+`coaches`), `bookings`, `session_wods`, `facilities`🔄(booking_policy — 규칙 안내문 표시용 조회) — RPC: **`fn_book_with_credit`**🔄, **`fn_cancel_booking_with_credit`**🔄(booking_policy 검증 단계 포함), `fn_get_class_display_wod`, `fn_get_my_wod_prep`⏳(G-3) |
| 상태·권한 | bookings.status 상태머신(confirmed/waitlisted/cancelled)은 서버(RPC)만 전이. attendance_outcome은 회원 read-only(코치 판정 영역). 예약 오픈 일수·취소 마감 등 규칙 안내문은 `facilities.booking_policy` 값을 표시할 뿐 **클라이언트에 규칙 하드코딩 금지**(계약 §6b) |
| 현재 상태 | ✅ (bookings 통합은 🔄) / ⏳ WOD Prep(G-3)·예약 제한 배너(G-5) / 🔄 예약·취소 규칙의 booking_policy 서버 집행 전환(G-4·G-5, 16 문서) |

**예약·Waitlist·크레딧 흐름 (불변 규칙 — 서버 단일 경로)**

```
[예약] fn_book_with_credit(p_session_id)
  1. auth.uid() → members 매핑 (클라이언트 member_id 전달 금지)
  2. 🔄 facilities.booking_policy 검증 (G-4·G-5, 16 문서):
     - 예약 윈도우(예약 오픈 일수 이내인가) / 주간 예약 상한 초과 여부
     - 노쇼 페널티 예약 제한 중 여부 — 위반 시 사유 코드 포함 error 반환(클라이언트는 표시만)
  3. 활성 membership FOR UPDATE 잠금 → remaining_credits ≥ 1 검증
  4. 세션 정원 확인:
     - 잔여 있음 → bookings INSERT(status=confirmed) + 크레딧 1 차감
     - 만석    → bookings INSERT(status=waitlisted) — 크레딧 차감 없음(승격 시점 차감)
  5. envelope 반환 {success, data:{status, remaining_credits}, error}

[취소] fn_cancel_booking_with_credit(p_booking_id)
  1. 본인 예약 검증 + 🔄 booking_policy 취소 마감 시간 검증 (G-4·G-5, 16 문서):
     - 마감 전 취소 → status=cancelled + confirmed였다면 크레딧 복구
     - 마감 후 취소 → 지각취소(late_cancel) 처리 — 크레딧 복구 여부는 booking_policy 규칙이 판정
  2. 빈자리 발생 → 트리거 fn_notify_waitlist_on_vacancy: 대기 상위 3명에게 알림
     (승격은 선착 확정 — fn_book_with_credit 재호출 경로, waitlist_promoted_at 기록)
  3. 노쇼/지각취소 페널티(크레딧 몰수·월 N회 초과 시 D일 예약 제한)는 booking_policy 규칙으로
     서버가 자동 집행 — 출결 판정(attendance_outcome) 자체는 코치·Admin 영역
```

※ 🔄 예약·취소 규칙(윈도우/마감/상한/페널티)의 **단일 소스는 `facilities.booking_policy` JSONB**이며 집행은 위 두 RPC 내부에서만 수행한다 — 화면은 규칙 값을 안내문으로 표시할 뿐 하드코딩하지 않는다 (G-4·G-5, 16 문서. 정책 편집 UI는 02-admin §3.14)

### 3.3 탭3 — checkin (`/apps/checkin`)

| 항목 | 내용 |
|---|---|
| 목적 | 매장 진입 시 3초 내 QR 제시, 내 출석 이력 확인 |
| 핵심 기능 | ① **동적 QR 생성**: 페이로드 `{mid, fid, ts, v}` — 발급 후 **5분 만료**, 만료 30초 전 자동 재발급 + 카운트다운 링 표시 ② 화면 최대 밝기 요청 ③ 월간 출석 캘린더 + 통계(주간 횟수/연속 출석) ④ 체크인 성공 시 Realtime 수신 → 성공 토스트(수업/시설 구분 표기) |
| 데이터 | 발급: `members`(mid)+`facilities`(fid) — 클라이언트 생성(서명 없음, 만료·서버검증으로 완화). 이력: `checkins`(month range, session_id 유무로 수업/시설 구분) |
| 상태·권한 | 검증·INSERT는 전적으로 Kiosk 측(**06-kiosk §4 프로토콜이 SSOT**) — 이 화면은 발급/조회만. 5분 중복 방지·±30분 예약 분기도 서버(키오스크 RPC) 판정 |
| 현재 상태 | ✅ |

### 3.4 탭4 — performance 허브 (`/apps/performance`) 🔄 **[3화면 → 1탭 3섹션 통합]**

| 항목 | 내용 |
|---|---|
| 목적 | 기록·랭킹·배지를 "내 성과"라는 단일 서사로 묶어 리텐션 루프(기록→비교→보상) 형성 — ⏳ 일일 WOD 기록(§1b)이 이 루프의 매일의 입력점 (G-1, 16 문서) |
| 구성 | 상단 세그먼트 탭 3개: **내 기록 / 랭킹 / 배지** (딥링크 `?tab=records|leaderboard|badges` — 기존 3라우트 301 매핑). 내 기록 탭 최상단에 「오늘의 WOD 기록」 카드(§1b ⏳) |

**§1 내 기록** (as-is `/apps/records` 승계)

| 항목 | 내용 |
|---|---|
| 기능 | 벤치마크 WOD 기록 목록(For Time/AMRAP/Weight/Distance/Calories), PR 뱃지·추이 스파크라인, 자가 기록 입력(BottomSheet — 🔄 rx_status 선택 포함), 레이스 기록 카드(순위/파워/페이스) |
| 데이터 | **`member_benchmark_results`**🔄(+rx_status — G-2)(+`benchmark_definitions` — metric_type: time=낮을수록 우수), **`race_records`**(result_time/avg_watts/finish_rank/is_pr) — RPC: `fn_get_member_performance_profile`🔄(+일일 WOD 기록 타임라인 포함), `fn_list_benchmark_definitions`, `fn_record_member_benchmark_result`🔄(+rx_status. 자가 입력 — 서버가 auth.uid()→본인 검증, advisory lock으로 PR 판정 동시성 보장) |
| 상태 | ✅ (records) / race_records 연동 표시는 🟡 / rx_status 컬럼·타임라인 통합은 🔄 (G-2, 16 문서) |

**§1b 오늘의 WOD 기록 + 화이트보드 ⏳ (신규 — G-1·G-2, 16 문서)**

| 항목 | 내용 |
|---|---|
| 기능 | ① **오늘의 WOD 기록 입력**: 오늘 체크인·예약한 세션의 게시 WOD(`session_wods`)에 내 점수 기록 — `score_type`별 입력 폼(time=mm:ss / rounds+reps / weight / distance / calories), **rx_status 선택(rx_plus/rx/scaled)** + 스케일 내용 메모. 세션당 1회, 본인 수정 허용 ② **화이트보드 뷰**: 같은 세션 참가자 전원의 결과를 **Rx+ → Rx → Scaled 계층 정렬**(계층 내 score 순)로 표시 — 박스 화이트보드 문화의 디지털화. 내 행 고정 표시, 미기록 참가자는 이름만(기록 유도) |
| 데이터 | **`session_wod_results`**⏳(session_wod_id, member_id, score, score_type, rx_status, note) — RPC: `fn_record_session_wod_result`⏳(본인 기록 — 서버가 auth.uid()→본인 검증), `fn_get_session_wod_whiteboard(p_session_id)`⏳(전원 결과 계층 정렬) |
| 진입점 | performance §내 기록 최상단 카드(오늘 세션 자동 감지), 체크인 성공 토스트 딥링크, 수업 종료 알림 |
| 상태·권한 | 본인 체크인/예약 세션만 기록 가능(서버 검증). 화이트보드 노출 범위는 동일 세션 참가자 — 랭킹 익명 설정(`members.preferences`) 존중 |
| 상태 | ⏳ — 벤치마크만 기록 가능하던 **구조적 공백** 해소(테이블·RPC 신설 선행, 07-data-model·04_wod sql). Class 리더보드·배지 판정·코치 KPI가 이 데이터 위에 연동 (G-1·G-2, 16 문서) |

**§2 랭킹** (as-is `/apps/leaderboard` 승계)

| 항목 | 내용 |
|---|---|
| 기능 | 벤치마크별 시설 내 리더보드(상위 N + 내 순위 고정 행), 기간 필터(전체/이번 달), 레이스 이벤트별 순위 |
| 데이터 | `member_benchmark_results` 집계(benchmark_definition별, 시설 스코프), `race_records`(finish_rank) — 노출 범위: 동일 facility 회원 한정, 표시명은 `members.name`(비공개 설정 시 profile 시트에서 익명 처리 — `members.preferences`) |
| 상태 | ✅ |

**§3 배지** (as-is `/apps/badges` 승계)

| 항목 | 내용 |
|---|---|
| 기능 | 획득/미획득 배지 그리드(진행률), 획득 시 축하 모달(Realtime 알림 연동), 배지 상세(획득 조건·일시) |
| 데이터 | **`badge_definitions`** ⏳ / **`badge_awards`** ⏳ — RPC: `fn_get_my_badges` ⏳, 판정은 `fn_evaluate_badges`(체크인/PR 트리거 경유) ⏳ |
| 상태 | ⏳ — **as-is는 UI만 존재, 테이블·RPC 마이그레이션 부재**(backend-inventory §H). 07-data-model에서 정식 스키마 신설이 선행 조건 |

### 3.5 탭5 — profile (`/apps/profile`) 🔄 **[하위 5라우트 → 단일 설정 시트]**

| 항목 | 내용 |
|---|---|
| 목적 | 계정·멤버십·결제·설정을 페이지 이동 없이 시트 섹션 전환으로 완결 |
| 구성 | 상단: 아바타/이름/멤버십 요약 카드. 아래 **아코디언·BottomSheet 섹션**(기존 하위 라우트 5종 + 알림 설정 흡수): |

| 시트 섹션 | as-is 라우트 | 기능 | 데이터 |
|---|---|---|---|
| 내 정보 | `/profile/edit` | 이름/연락처/생일/비상연락/아바타 수정 | `members`, `profiles`(email), Storage(avatar) |
| 멤버십 | `/profile/memberships` | 현재 플랜/기간/잔여 크레딧/홀딩 이력, **재구매 CTA → `/apps/purchase`** | `memberships`, `membership_plans`, `membership_history` |
| 결제 내역 | `/profile/payments` | 거래 목록/영수증/환불 상태(read-only — 환불 신청은 지원 문의 경유) | `transactions` 🔄(id UUID), `refunds` |
| 알림 설정 | `/profile/notifications` | 카테고리별 on/off, quiet hours, Push 구독 토글 | `notification_preferences`, `push_subscriptions` |
| 앱 설정 | `/profile/settings` | 테마(dark/light), 랭킹 익명 표시, 언어 | `members.preferences` |
| 지원 | `/profile/support` | 문의 티켓 작성/조회, FAQ | `support_tickets`, `faqs` |
| 지점 정보 | (`/apps/facilities` 흡수) | 주소/지도/운영시간/약관·환불규정 열람 | `facilities` |
| — | — | **수업 피드백 바로가기** → `/apps/feedback` / 로그아웃 | — |

| 상태·권한 | RLS 본인 행만. 이메일/비밀번호 변경은 01-auth 플로우 재사용 |
|---|---|
| 현재 상태 | ✅(하위 라우트 전부 구현) → 시트 통합은 🔄 |

### 3.6 비탭 — purchase (`/apps/purchase`, `+/success`, `+/fail`)

| 항목 | 내용 |
|---|---|
| 목적 | 요금제 선택 → Toss 결제 → 멤버십 자동 활성화 |
| 진입점 | profile §멤버십 재구매 CTA, home 만료 임박 배너 |
| 핵심 기능 | ① 요금제 카드(`membership_plans` — 기간제/횟수권, 가격/혜택) ② Toss 결제창 호출 ③ success: 서버 승인 확인 후 멤버십 활성화 안내 ④ fail: 사유 표기 + 재시도(**재결제는 처음부터 — 자동 재시도 금지**) |
| 데이터 | `membership_plans`, `transactions` 🔄(orderId UNIQUE), `memberships`(승인 성공 시 서버가 생성), `pg_settings`(payment_mode) |
| **결제 불변식 (요약 — 전문은 08-integrations)** | · 클라이언트 금액 절대 불신뢰 — 서버가 `membership_plans.price`와 대조 후 승인 · orderId UNIQUE + FOR UPDATE(중복 승인 차단) · Fail-to-NOT-charge(모호하면 미과금) · 자동결제/재시도/빌링키 금지 · 결제 전 3단계 확인 · 금액 상한 = min(Admin 설정, env) 이중장치 · 환불은 회원 화면에 없음(Admin 2단계 승인 + 서버 계산 + audit_logs) |
| 현재 상태 | 🧪 — `pg_settings.payment_mode` 기본 simulation, Toss 실결제 미가동. 스키마·플로우는 완비 → 재구축 시 live 전환 게이트는 08-integrations·11-cutover 참조 |

### 3.7 비탭 — feedback (`/apps/feedback`)

| 항목 | 내용 |
|---|---|
| 목적 | 수업 직후 별점/리뷰 수집(코치·Admin 품질 지표의 원천) |
| 진입점 | 수업 종료 후 알림(Realtime/Push) 딥링크, home "지난 수업 평가" 카드, profile 시트 바로가기 |
| 핵심 기능 | ① 미평가 세션 목록(체크인 완료분) ② 별점 1~5 + 텍스트 ③ 제출 내역·Admin 답변 열람 |
| 데이터 | `session_feedback`(rating, admin_response), `checkins`(평가 대상 판정), `sessions` |
| 상태·권한 | 본인 체크인 세션만 작성 가능, 세션당 1회(UNIQUE) |
| 현재 상태 | ✅ |

### 3.8 비탭 — notifications (`/apps/notifications`)

| 항목 | 내용 |
|---|---|
| 목적 | 알림 히스토리 열람 + 인앱 실시간 수신 |
| 핵심 기능 | ① 히스토리 무한 스크롤(카테고리 필터, 읽음 처리) ② action_url 딥링크(예: 대기 승격→schedule) ③ **전역 Realtime 구독**(앱 레이아웃 레벨): `notifications` INSERT → 토스트 표시 — 이 구독은 특정 화면이 아닌 앱 셸에 상주 |
| 데이터 | `notifications`(category/type/channel/action_url/is_read), Realtime channel(member 스코프) |
| 채널 우선순위 | In-App+Realtime(1차, 100% 보장) → Web Push(PWA, `push_subscriptions`) → 카카오/SMS(유료, Edge Function) |
| 현재 상태 | In-App/Realtime ✅ · Web Push 🟡(P14 실수신 QA 잔여) · 카카오/SMS 🧪(EF mock) |

---

## 4. 크로스커팅 규칙

1. **상태 게이트**: 멤버십 없음/만료 상태에서도 앱 진입 허용(열람 가능) — 예약·체크인 시도 시 purchase 유도 시트. 무한 스피너 금지, 에러 표면화(contract §7).
2. **낙관적 UI 금지 구간**: 예약/취소/결제는 서버 envelope 확인 후 상태 반영(크레딧 표시 불일치 방지).
3. **오프라인**: checkin 탭은 마지막 발급 QR을 만료 시각과 함께 캐시 표시(만료 지나면 재연결 요구) — 검증은 어차피 키오스크 서버측.
4. **라우트 이관**: 폐지 라우트(records/leaderboard/badges/coaches/facilities/profile 하위)는 to-be 위치로 redirect 매핑(알림 딥링크·북마크 호환).

## 5. 수용 시나리오 (재구축 완료 기준)

1. 로그인→home: 오늘 예약·D-Day·미읽음 뱃지 정상 표시
2. schedule: 만석 세션 Waitlist 등록 → 타 회원 취소 → 알림 수신 → 승격 확정 시 크레딧 차감 1회만 발생
3. checkin: QR 발급 → 5분 경과 → 자동 재발급 → 키오스크 스캔 → Realtime 성공 토스트(수업 체크인 표기)
4. performance: 벤치마크 자가 기록 → PR 뱃지 → 랭킹 반영 → (배지 스키마 적용 후) 배지 자동 지급 모달
5. profile 시트: 5개 섹션 전환에 페이지 내비게이션 0회, 알림 설정 변경 즉시 반영
6. purchase(simulation): 요금제 선택→3단계 확인→success→멤버십 활성 / fail 경로에서 과금 0건 검증
7. ⏳ 오늘의 WOD 기록(G-1·G-2): 체크인 세션 WOD에 score_type별 점수 + rx_status 기록 → 화이트보드에 Rx+→Rx→Scaled 계층 정렬 반영 → 내 기록 타임라인·Class 리더보드 연동
8. 🔄 예약 정책 집행(G-4·G-5): booking_policy의 취소 마감 이후 취소 시도 → 서버가 지각취소 판정(크레딧 복구 규칙 정책 적용), 노쇼 페널티 제한 중 예약 시도 → 사유 코드 반환·제한 배너 표시 — 클라이언트 하드코딩 규칙 0건
