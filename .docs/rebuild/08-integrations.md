# 08. 외부 연동 설계 — 결제(Toss) · 알림 · 외부 채널

> 근거: `_source/backend-inventory.md`(EF/cron/Toss), `_source/nonfunctional-history.md`(결제·알림 불변식),
> `.docs/archive/planning/payment-system.md`(승인 기획 v1.0.0), `supabase/functions/*`, `supabase/migrations/20260218*`
> 표기: ✅ 운영 · 🟡 코드완료(검증 대기) · 🧪 mock/시뮬레이션 · ⏳ 미구현(신규 설계) · 🔄 to-be 변경

---

## 1. 결제 — Toss Payments

### 1.1 현재 상태(as-is) 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| DB 스키마(`transactions` 확장, `pg_settings`, `refunds`) | ✅ | `20260218230000_payment_system_phase1.sql` — 단 `transactions.id`는 text(→ to-be UUID화, 07 문서) |
| `/apps/purchase` 결제위젯(`@tosspayments/payment-widget-sdk`) | 🧪 | `payment_mode` 기본 `simulation`, 실결제 미가동 |
| Edge Function 4종(confirm/cancel/webhook/sync) | ⏳ | **기획 승인만 완료, 배포 실체 없음** — 재구축에서 정식 구현 |
| Admin PG 설정 UI(`/admin/setup/system` → to-be `settings` 탭) | ✅ | 키 입력/모드 토글 존재 |
| 환불 로직(서버 계산·2단계) | ⏳ | refunds 테이블만 존재 |

### 1.2 🚨 결제 불변 안전 원칙 (전 Phase 예외 없음 — 위반 = 릴리즈 차단)

> 결제는 "실패해도 괜찮지만, 잘못 결제되면 절대 안 되는" 시스템이다.

**절대 금지 5칙**

| # | 규칙 | 설명 |
|---|------|------|
| ❌-1 | 자동 결제 금지 | 사용자의 명시적 액션 없이 결제가 실행되는 코드 경로 자체가 존재 금지 |
| ❌-2 | 백그라운드 과금 금지 | cron/트리거/Webhook 어디에서도 금액 차감 로직 금지 |
| ❌-3 | 자동 재시도 금지 | `/confirm` 실패 시 자동 재시도 없음 — 사용자가 직접 재시도 |
| ❌-4 | 빌링키(정기결제) 미사용 | 필요 시 별도 기획으로만 — 본 설계 범위 외. 로드맵: **Toss live 안정화 후 Toss 빌링+dunning을 별도 Phase로 재검토(CMS 계좌 자동이체 포함 여부 함께 결정)** (G-20, 16 문서 — 10-gaps-and-debt P2 등재) |
| ❌-5 | 클라이언트 금액 불신뢰 | 프론트 전달 금액 승인 금지 — 서버에서 `membership_plans.price`와 반드시 비교 |

**Fail-Safe 설계 원칙**

| 원칙 | 적용 |
|------|------|
| **Fail-to-NOT-charge** | 불확실하면 "결제 안 됨" 방향으로 실패. 이중 결제 < 결제 실패 |
| **멱등성** | 동일 `orderId` 중복 승인은 Toss 자체 거부 + EF에서 DB 중복 체크 이중 방어 |
| **Race Condition 방지** | `transactions.order_id UNIQUE` 제약 + `SELECT ... FOR UPDATE`로 동시 요청 직렬화 |
| **타임아웃=실패** | Toss API 10초 무응답 → 실패 처리, 이후 상태는 Webhook/폴링으로 보정 |
| **금액 서버 검증** | confirm-payment EF에서 요청 금액 ≠ DB `membership_plans.price` → 즉시 거부 |

**사용자 확인 플로우 (최소 3단계)**
① 플랜 선택 후 [결제하기] → ② 확인 다이얼로그(금액·플랜·기간 재확인) → ③ Toss 결제위젯 인증 → 인증 완료 시에만 ④ EF 승인 호출 → ⑤ 결과 표시.
①~③ 중 어느 단계도 생략하는 코드 경로 금지.

**환불 안전 규칙 (관리자 2단계)**

| # | 규칙 |
|---|------|
| 🔒-1 | 환불 실행은 admin 전용 (EF 내 role 검증) |
| 🔒-2 | 확인 다이얼로그 필수: "환불 ₩OO / 위약금 ₩OO 확인" — **1단계(요청·계산 미리보기) → 2단계(확정 실행)** 분리 |
| 🔒-3 | 환불 금액은 서버 계산(`fn_calculate_refund`) — 클라이언트 입력값 불신 |
| 🔒-4 | 중복 환불 방지: `refunds` 상태 체크(pending/approved/completed/rejected) |
| 🔒-5 | 처리 후 `audit_logs` 기록(누가/언제/얼마/사유) 필수 |

**개발 규칙**: 결제 코드 변경=단독 커밋+리뷰 필수 / 시뮬레이션 전체 플로우 검증 없이 배포 금지 / catch 블록에서 결제 진행 금지 / 로그에 Secret Key·카드정보 금지 / 금액 하드코딩 금지(반드시 DB 조회).

### 1.3 Edge Function 4종 계약 ⏳ (재구축 Phase 5 구현 — +⑤ `issue-cash-receipt` ⏳는 §1.8)

공통: Deno(Supabase Edge Functions), Secret Key는 `pg_settings` 암호화 컬럼(pgp_sym)에서만 로드, 클라이언트 노출 절대 금지. 응답 envelope `{success, data, error}`.

#### ① `confirm-payment` — 결제 승인 (JWT: 사용자 인증 필수)

```
POST /functions/v1/confirm-payment
요청: { paymentKey: string, orderId: string, amount: number }
```

승인 전 7단계 검증 — **하나라도 실패 시 승인 거부(Toss 호출 자체 금지)**:
1. JWT 유효성(인증 사용자인가)
2. `orderId`가 DB에 존재하고 `status='pending'`인가 (`SELECT ... FOR UPDATE`)
3. 요청 `amount` === `membership_plans.price`인가
4. 동일 `orderId` 기승인 건 없는가(멱등)
5. `pg_settings.is_active = true`인가
6. `resolvePaymentMode()` 결정 모드에 맞는 키 세트인가
7. 전부 통과 후에만 Toss `POST /v1/payments/confirm` 호출(타임아웃 10s)

성공: `transactions` UPDATE(status='done', payment_key, toss_status, receipt_url, toss_raw_data — **`toss_raw_data.mode`에 simulation/live 기록**) → `memberships` INSERT(start/end_date, remaining_credits) → `notifications` INSERT(결제 완료).
실패: `transactions` status='failed' 기록 후 에러 반환. **재시도·보정 결제 없음.**

#### ② `cancel-payment` — 환불 실행 (JWT: admin 인증 필수)

```
POST /functions/v1/cancel-payment
요청: { transactionId: uuid, refundId: uuid, confirm: true }   // refunds.status='approved' 건만
```

흐름: admin role 검증 → `refunds` 상태 검증(approved만, 중복 차단) → 환불액 서버 재계산 대조 → Toss `POST /v1/payments/{paymentKey}/cancel` → 성공 시 `transactions` UPDATE(status='refunded', cancel_*) + `memberships` UPDATE(status='cancelled') + `refunds` completed + `audit_logs` + `notifications` INSERT.

#### ③ `toss-webhook` — 상태 변경 수신 (JWT 없음, **서명 검증 필수**)

```
POST /functions/v1/toss-webhook   (Toss → Supabase)
```

1. `webhook_secret_encrypted`로 서명(Signature) 검증 — 실패 시 401, 본문 무처리
2. 이벤트 분기: `PAYMENT_STATUS_CHANGED` → `transactions.toss_status` 동기화 / `PAYOUT_STATUS_CHANGED` → 정산 상태 갱신 / 기타 → `notification_logs` 성격의 수신 로그만
3. **Webhook은 상태 보정 전용 — 여기서 과금·멤버십 생성 금지(❌-2)**. 수신 실패 대비 `/v1/payments/{paymentKey}` 폴링 보완 경로 유지

#### ④ `sync-pg-settings` — PG 키 암복호화 저장 (JWT: admin 인증 필수)

```
POST /functions/v1/sync-pg-settings
요청: { mode_keys: { test|live: { client_key, secret_key } }, webhook_secret?, payment_mode? }
```

Secret 계열은 EF 내부에서 pgp_sym 암호화 후 `pg_settings` 저장. 조회 응답에는 client_key와 마스킹된 secret(`****` + 끝 4자리)만 반환. [연결 테스트] 버튼 = 해당 모드 키로 Toss 조회 API 1회 핑.

### 1.4 결제 모드 이중 안전장치 — `min(Admin 설정, 서버 환경)`

```
최종 모드 = min(Admin payment_mode, 서버 env)

서버 env   Admin 설정      최종 모드        사용 키
DEV        simulation     🟡 시뮬레이션    test_gck / test_gsk
DEV        live           🟡 시뮬레이션    test_gck / test_gsk   ← 강제 차단
PROD       simulation     🟡 시뮬레이션    test_gck / test_gsk
PROD       live           🟢 운영(실거래)  live_gck / live_gsk   ← 유일한 실거래 조합
```

- 판정은 **EF 내부 `resolvePaymentMode()` 단일 함수**에서만 수행(클라이언트 판정 금지)
- UI 상태 배지 필수: `🟡 시뮬레이션 (DEV)` / `⚠️ 시뮬레이션 강제 (DEV 환경)` / `🟢 운영 (실거래)`
- 모든 거래에 `toss_raw_data.mode` 기록 → 매출 리포트에서 시뮬레이션 제외 필터 제공

### 1.5 simulation → live 전환 절차 (체크리스트)

전환은 아래 순서를 전부 통과한 뒤에만 수행한다. 하나라도 미충족 시 전환 금지.

1. [ ] **시뮬레이션 전 플로우 통과**: 테스트 키로 구매→승인→멤버십 생성→환불(부분/전액)→Webhook 수신까지 1.7 테스트 시나리오 전건 성공
2. [ ] Toss 가맹점 계약 완료, **라이브 키(live_gck/live_gsk) + Webhook Secret 발급**
3. [ ] Toss 개발자센터에 Webhook URL 등록: `https://<supabase-project>.functions.supabase.co/toss-webhook`
4. [ ] Admin 설정에서 라이브 키 입력 → `sync-pg-settings` 저장 → [연결 테스트] 성공
5. [ ] 서버 환경 변수 `SUPABASE_ENV=prod`(운영 Supabase 프로젝트) 확인 — staging은 영구 DEV 고정
6. [ ] `payment_mode='live'` 전환 → UI 배지 `🟢 운영` 확인
7. [ ] **소액 실결제 1건 + 즉시 전액 환불 1건** 리허설(관리자 카드) — transactions/refunds/audit_logs/알림 4종 기록 대조
8. [ ] 롤백 경로 확인: 문제 발생 시 Admin 토글 1회로 simulation 복귀(배포 불필요) — 이것이 라이브 사고의 1차 차단기

### 1.6 위약금·환불 규정 (공정위 10% 상한형 — 서버 단일 계산) 🔄 ⚠️교정 (G-8, 16 문서)

```
환불금 = 결제금액 − 이용일수 해당액 − min(위약금, 결제금액 × 10%)
이용일수 해당액 = (결제금액 ÷ 총 이용일수) × 이용 일수
위약금 = 결제금액 × 위약금률(플랜 정책) — 단 공제액은 결제금액의 10%가 절대 상한
이용 시작 전 해지 = 위약금 0 (전액 환불)
```

- **법규 근거**: 공정위 **위약금 산정기준**·**소비자분쟁해결기준** — 체육시설업 중도해지 위약금은
  **총 계약대금의 10% 이내** + 이용일수 해당액 공제. 소비자원 조정에서 10% 초과 공제는 반복적으로 부당 판정.
- ⚠️ **구 기본값 폐기(설계 결함 교정)**: 종전의 경과율 기반 기본 산식("1/3 경과 전 10% / **1/2 경과 전 20% /
  1/2 경과 후 환불 불가**")은 분쟁 실무와 충돌(패소·시정 리스크) — to-be에서 사용 금지, 어떤 코드 경로에도 남기지 않는다.
- 구현: DB 함수 `fn_calculate_refund(p_transaction_id, p_membership_id)` → `{refund_amount, penalty_amount, used_days, total_days, penalty_rate}` 반환 — **10% 상한 캡은 함수 내부에서 무조건 적용**
- Admin 환불 모달은 이 함수 결과를 **미리보기로만** 표시 — 확정 시 EF가 동일 함수로 재계산 대조
- 플랜별 예외 정책은 `membership_plans.refund_policy`(JSONB)로 오버라이드 가능(없으면 법정 기본) —
  단 **10% 상한 초과 설정 금지**: `fn_calculate_refund`가 오버라이드 값에도 `min(위약금, 결제금액×10%)`를
  강제 적용하고, Admin 플랜 설정 UI는 상한 초과 위약금률 입력을 저장 단계에서 차단(계약 §6b)

### 1.7 결제 수용 시나리오 (Phase 5 게이트)

정상: 시뮬 결제 성공 / 라이브 결제 성공(PROD 한정) / 환불(전액·부분, 위약금 차감 정확성 — **10% 상한 캡 포함**) / 모드 전환 즉시 반영.
예외: DEV에서 live 선택→시뮬 강제+경고 배지 / 금액 위변조→EF 거부 / 동일 orderId 재요청→거부 / Toss 타임아웃→실패 처리 후 Webhook 보정 / 기환불 건 재환불→차단 / 라이브 키 미입력+live 모드→결제 차단+설정 안내.

### 1.8 현금영수증 발급 관리 ⏳ (G-9, 16 문서)

> 헬스장은 국세청 현금영수증 **의무발행 업종** — 건당 **10만원 이상 현금성 거래(현금/계좌이체)**는 소비자 요청이
> 없어도 **거래일로부터 5일 내** 자진 발급 의무, **미발급 시 거래액의 20% 가산세**. as-is는 수동 결제
> 등록(source=manual — 현장 현금/이체 매출)에 현금영수증 개념이 전무 — 세무 리스크 무방비 상태의 교정.

**스키마** — `transactions` +컬럼 2 (계약 §2 finance, `sql/02_membership_finance.sql`):

| 컬럼 | 값/규칙 |
|------|---------|
| `cash_receipt_status` | `not_required`(카드 등 비대상) / `pending`(발급 대기 — **10만원 이상 현금성 거래의 기본값**) / `issued` / `failed` / `cancelled`(환불 취소 완료) |
| `cash_receipt_approval_no` | 국세청 승인번호 — `issued` 시 기록(리포트·세무 대사 키) |

**Toss 현금영수증 API 경로**

| 용도 | 경로 | 비고 |
|------|------|------|
| 발급 | `POST /v1/cash-receipts` | 금액·소득공제/지출증빙 구분·식별번호(휴대폰/사업자번호) → 승인번호(approvalNumber) 저장 |
| 발급 취소 | `POST /v1/cash-receipts/{receiptKey}/cancel` | 환불 시 연동 — `cancel-payment` EF가 현금성 거래 환불 시 함께 처리 |
| 조회 | `GET /v1/cash-receipts` | 발급 상태 대사(월 마감 리포트) |

- 온라인 Toss 결제(가상계좌·계좌이체)는 confirm 요청의 `cashReceipt` 옵션으로 Toss가 자동 발급 —
  **별도 발급 플로우가 필요한 것은 수동 등록 거래(현금/이체)뿐**.
- Secret Key 로드·암호화 규약은 §1.3 공통(pg_settings pgp_sym)과 동일.

**수동(현금/계좌이체) 결제 등록 시 발급 플로우** ⏳

1. Admin payments에서 수동 거래 등록(source=manual, method=cash|transfer) → 10만원 이상이면
   `cash_receipt_status='pending'` 자동 세팅 + 발급 입력 필드 노출(식별번호, 소득공제/지출증빙 구분)
2. [현금영수증 발급] → EF ⑤ `issue-cash-receipt`(JWT: admin 전용 — §1.3 공통 규약 준수) → Toss API 발급
   → `issued` + `cash_receipt_approval_no` 저장 + `audit_logs` 기록
3. 실패 시 `failed` + 사유 표기 — 수동 재시도만(자동 재시도 없음, ❌-3 준용)
4. **미발급 경고 리포트**: `pending` 상태로 거래일 D+3 경과 건을 Admin payments 리포트 탭·대시보드에
   경고 배지 노출(**D+5 = 법정 발급 기한** — 20% 가산세 방어선)
5. 환불 시: 발급 완료 건은 현금영수증 **취소**를 환불 2단계 플로우(🔒 규칙)에 포함 — 취소 누락 검증 후 `cancelled` 전이

---

## 2. 알림 시스템

### 2.1 채널 우선순위 (불변)

| 순위 | 채널 | 상태 | 원칙 |
|------|------|------|------|
| 1 | **In-app + Supabase Realtime** | ✅ | **100% 보장 경로** — 모든 알림은 반드시 `notifications` INSERT(인앱 도달). 다른 채널은 전부 부가 |
| 2 | **Web Push (PWA)** | ✅ | VAPID 기반 `send-push-notification` EF 실동작. 구독자에 한해 발송, 실패해도 인앱은 이미 도달 |
| 3 | **카카오 알림톡 / SMS** | 🧪 | 유료 채널 — 중요 알림(멤버십 만기 등)만. mock 상태, 실연동은 2.4 절차 |

설계 귀결: 발송 로직은 채널 실패에 관대하게(로그만 남기고 진행), **인앱 INSERT 실패만 에러로 취급**한다.

### 2.2 자동 알림 규칙 — pg_cron 2종 + 트리거 2종

> ⚠️ as-is 결함: **pg_cron 등록 0건**(함수만 정의됨), `fn_send_membership_expiry_reminders`는 문서만 존재.
> 🔄 재구축에서는 cron 등록을 **DDL(`sql/06_notification.sql`)에 포함해 마이그레이션으로 정식 등록**한다 — 수동 등록 금지.

**시간 기반 = pg_cron 2종**

| 잡 이름 | 함수 | 스케줄 | 내용 | 상태 |
|---------|------|--------|------|------|
| `class_reminders_hourly` | `fn_send_class_reminders()` | `*/10 * * * *` (10분 간격) | 시작 60±5분 전 confirmed 예약자에게 수업 리마인더. 세션당 2시간 내 중복 발송 방지(metadata.session_id 대조) | 🟡 함수 승계 / 🔄 cron 등록 신규 |
| `membership_expiry_daily` | `fn_send_membership_expiry_reminders()` | `0 10 * * *` (매일 10:00 KST) | 만기 D-7/D-3/D-1 회원에게 만기 알림(category=`membership_expiry` → 외부 채널 후보). 일자별 1회 발송 멱등 | ⏳ 함수 신규 설계 |

등록 DDL 규약: `SELECT cron.schedule('잡이름', '크론식', $$SELECT public.fn_...()$$)` + 재적용 시 `cron.unschedule` 선행(멱등). 배포 검증 쿼리 `SELECT * FROM cron.job;` 결과 2건이 Phase 5 완료 기준에 포함.

**이벤트 기반 = 트리거 2종**

| 트리거 | 대상 | 동작 | 상태 |
|--------|------|------|------|
| `trg_notify_waitlist_on_vacancy` | `bookings` AFTER UPDATE OF status | confirmed→cancelled 시 해당 세션 대기열 **상위 3명**에게 빈자리 알림(선착순 예약 유도 — 자동 승격 아님) | ✅ 승계 |
| `trg_notifications_side_effects` | `notifications` AFTER INSERT | 수신 설정 조회 → push 구독 전건에 `send-push-notification` 호출(pg_net) → 중요 카테고리+외부 채널 동의 시 `send-external-notification` 호출 | ✅ 승계 / 🔄 EF URL·키를 `request.headers` 파생이 아닌 **Vault/DB 설정(`system_config`)에서 로드**하도록 수정(cron 컨텍스트에서 headers 부재로 실패하는 as-is 결함 해소) |

### 2.3 Edge Function 2종 계약

#### ① `send-push-notification` ✅ (실동작 그대로 승계)

```
POST /functions/v1/send-push-notification
요청: { subscription: {endpoint, keys:{p256dh, auth}}, notification: {title, body, icon?, data?, tag?} }
환경: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
```

- web-push(npm) + VAPID. 404/410(구독 만료) 응답 시 `push_subscriptions.is_active=false` 처리 🔄(신규 — as-is는 dead 구독 잔존)
- 발송 결과를 `notification_logs`에 기록(status: sent/failed)

#### ② `send-external-notification` 🧪 → 실연동

```
POST /functions/v1/send-external-notification
요청: { channel: 'kakao'|'sms', phone: string, templateCode?: string, message: string, params?: {} }
환경: KAKAO_API_KEY / SMS_API_KEY / SMS_SENDER
```

현재 로그 출력 후 성공 응답(mock). 구조(요청 스키마·분기·에러 응답)는 그대로 승계하고 fetch 블록만 실 API로 교체한다.

### 2.4 외부 채널 실연동 절차 (🧪→실가동 체크리스트)

**SMS (알리고 또는 네이버 클라우드 SENS — 택1)**
1. [ ] 발신번호 사전 등록(통신사 인증 — 사업자등록증·통신서비스 이용증명원)
2. [ ] API 키 발급: 알리고(userid+key) 또는 SENS(accessKey/secretKey/serviceId)
3. [ ] Supabase EF Secrets 등록: `supabase secrets set SMS_API_KEY=... SMS_SENDER=...`
4. [ ] `send-external-notification`의 SMS fetch 블록을 실 엔드포인트로 교체 + `notification_logs` 실패 기록
5. [ ] 관리자 본인 번호로 실발송 1건 검증 → 요금 과금 확인

**카카오 알림톡 (비즈메시지 — 대행사 경유 필수)**
1. [ ] 카카오톡 채널 개설 + 비즈니스 인증
2. [ ] 공식 딜러사(알리고·NHN·인포뱅크 등) 계약 → 발신프로필 키 발급
3. [ ] **알림톡 템플릿 사전 심사**(수업 리마인더/만기 안내/결제 완료 등 카테고리별) — 승인 템플릿 코드만 발송 가능, `templateCode` 파라미터와 매핑표 관리
4. [ ] `KAKAO_API_KEY` Secrets 등록 + fetch 블록 교체 (알림톡 실패 시 SMS 대체발송 옵션 설정)
5. [ ] 실발송 검증 + 단가표를 운영 문서에 기록

공통: 유료 채널이므로 **발송 대상 조건(중요 카테고리 + 사용자 opt-in)을 트리거에서 이중 확인**, 월 발송량 카운트를 `notification_logs` 집계로 Admin 대시보드 노출.

### 2.5 `notification_preferences` 정책

| 컬럼 | 기본값 | 정책 |
|------|--------|------|
| `push_enabled` | true | 행 부재 = 전부 기본값으로 간주(발송 허용) — 트리거에서 NOT FOUND 시 기본값 처리 |
| `kakao_enabled` / `sms_enabled` | **false** | 유료 채널은 **opt-in** — 명시 동의 없이는 발송 금지 |
| `email_enabled` | false | v1 범위 외(예약 컬럼) |
| `quiet_hours_start/end` | NULL | 🔄 설정 시 해당 시간대 push/외부 채널 보류(인앱은 항상 기록). 긴급(type='urgent')은 예외 |
| 카테고리 on/off | on | class_reminder / waitlist_vacancy / membership_expiry / payment / notice 단위 토글 |

RLS: 본인 행만 SELECT/UPSERT(`user_id = auth.uid()`). UI 진입점: User 앱 profile 설정 시트.

---

## 3. 외부 연동 총괄 표

| 서비스 | 용도 | 키/시크릿 | 보관 위치 | 상태 |
|--------|------|-----------|-----------|------|
| **Supabase** | DB/Auth/Realtime/Storage/EF | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 빌드 ARG(공개 가능) | ✅ |
| **Supabase Service Role** | race-service·EF 서버 권한 | `SUPABASE_SERVICE_ROLE_KEY` | 서버 `.env.local`·EF Secrets 전용(클라이언트 번들 0건 게이트) | ✅ |
| **Toss Payments** | 온라인 결제/환불/Webhook | `test/live_gck·gsk`, `webhook_secret` | `pg_settings` 암호화 컬럼(pgp_sym) — env 아님 | 🧪 simulation |
| Toss POS Open API | 오프라인 매출 동기화 | `pos_api_key_encrypted` | `pg_settings` | ⏳ 후순위(Phase 후속) |
| **Web Push (VAPID)** | PWA 푸시 | `VAPID_PUBLIC/PRIVATE_KEY`, `VAPID_SUBJECT` | EF Secrets (+public키는 클라이언트) | ✅ |
| **SMS (알리고/SENS)** | 만기 등 중요 알림 | `SMS_API_KEY`, `SMS_SENDER` | EF Secrets | 🧪 mock |
| **카카오 비즈메시지** | 알림톡 | `KAKAO_API_KEY`(발신프로필) | EF Secrets | 🧪 mock |
| **GitHub Actions** | CI/CD | `SSH_HOST/USERNAME/PRIVATE_KEY/PORT` 등 | GitHub Secrets | ✅ (규약: 11 문서 §5) |
| pg_net | DB→EF HTTP 호출 | (확장) | 마이그레이션 | ✅ |
| pg_cron | 시간 기반 알림 | (확장) | 🔄 DDL 정식 등록 | ⏳→Phase 5 |

**연동 의존 순서**: Supabase(전 Phase) → VAPID(Phase 5) → pg_cron 등록(Phase 5) → Toss live·카카오/SMS(cutover 이후 운영 단계에서 전환 가능 — 시뮬레이션/mock 상태로도 서비스 개시 가능하도록 설계).
