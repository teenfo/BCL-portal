# BCL Portal – 결제 시스템 아키텍처 기획서

> **Status**: Approved (기획 승인 — 개발 대기)  
> **Author**: Architect (Opus)  
> **Created**: 2026-02-18  
> **Last Updated**: 2026-02-18  
> **Related**: `.docs/sitemap/admin/02-finance.md`, `.docs/database-reference.md`

---

## 1. 개요

### 1.1 목적
BCL Portal에 **Toss Payments** 기반의 온라인 결제를 연동하여, 
회원이 앱에서 멤버십을 직접 구매하고, 관리자가 결제/환불/정산을 통합 관리할 수 있도록 한다.

### 1.2 현재 상태 (As-Is)
| 항목 | 상태 | 비고 |
|------|------|------|
| 사용자 앱 구매 화면 (`/apps/purchase`) | ✅ UI 존재 | 결제 버튼 클릭 시 DB에 pending 직접 insert (PG 미연동) |
| Admin 결제 내역 (`/admin/transactions`) | ✅ UI 존재 | 테이블 조회/필터 동작, 상태 변경 불가 |
| Admin 매출 리포트 (`/admin/insights/finance`) | ✅ UI 존재 | DB 기반 차트 표시, PG 매출 미연동 |
| DB `transactions` 테이블 | ✅ 존재 | `pg_transaction_id` 컬럼 있으나 미사용 |
| DB `memberships` 테이블 | ✅ 존재 | 결제 연동 없이 직접 생성 |
| 환불 로직 | ❌ 없음 | — |
| PG 연동 | ❌ 없음 | — |

### 1.3 핵심 제약 조건
| 항목 | 내용 |
|------|------|
| **PG사** | Toss Payments (결제위젯 v2) |
| **API 키** | Toss 공식 테스트 키로 개발 → 라이브 키는 **Admin 설정 화면에서 입력** 방식 |
| **서버 환경** | CSR 기반 Next.js + Supabase Edge Functions (서버 시크릿 처리) |
| **POS 연동** | Toss POS Open API로 매출 내역 조회 가능 (별도 API 키 필요) |
| **스코프** | 기본 기능에 충실 — 과도한 확장 방지 |

---

## 2. POS 매출 연동 가능성 조사 결과

### 2.1 Toss POS Open API
Toss POS는 **POS Open API**를 통해 외부 시스템에서 매출 데이터를 조회할 수 있습니다.

| 기능 | API | 설명 |
|------|-----|------|
| 매장 정보 조회 | `GET /merchants` | 매장명, 사업자등록번호 조회 |
| 주문 내역 조회 | `GET /orders` | 주문 상태, 항목, 결제 상태, 할인/가격 정보 |
| 결제 상세 조회 | `GET /payments` | 카드/현금/간편결제 상세, 승인번호, 취소 내역 |

### 2.2 연동 가능 여부 판단

```
✅ Toss POS Open API로 포스기 매출 조회 가능
├── 서버 간(Server-to-Server) 연동 방식
├── 주문/결제 데이터를 기간별로 조회 가능
├── Webhook으로 실시간 이벤트 수신도 가능
└── ⚠️ 별도 API 인증 키 필요 (Toss POS 가맹점 계약 후 발급)
```

### 2.3 권장 전략
- **Phase 1**: 온라인 결제(Toss Payments)를 먼저 구축
- **Phase 2(향후)**: Toss POS Open API로 오프라인 매출 동기화 추가
- 두 데이터 소스를 `transactions` 테이블에서 `source` 컬럼으로 구분 (`online` / `pos` / `manual`)

---

## 3. 🚨 결제 안전 원칙 (불변 규칙)

> **이 섹션의 모든 규칙은 어떤 상황에서도 예외 없이 준수해야 합니다.**
> 결제 기능은 "실패해도 괜찮지만, 잘못 결제되면 절대 안 되는" 시스템입니다.

### 3.1 절대 금지 사항

| # | 규칙 | 설명 |
|---|------|------|
| ❌-1 | **자동 결제 금지** | 사용자의 명시적 액션 없이 결제가 실행되는 코드 경로가 존재해서는 안 됨 |
| ❌-2 | **백그라운드 과금 금지** | 크론잡, 트리거, Webhook 등에서 사용자 동의 없이 금액을 차감하는 로직 금지 |
| ❌-3 | **자동 재시도 금지** | 결제 승인(`/confirm`) API 호출이 실패했을 때 자동 재시도하지 않음. 사용자가 직접 다시 시도 |
| ❌-4 | **빌링키(자동결제) 미사용** | Toss 빌링키/정기결제 기능을 사용하지 않음 (향후 필요 시 별도 기획) |
| ❌-5 | **클라이언트 금액 신뢰 금지** | 프론트에서 전달한 금액을 그대로 승인하지 않음. 서버에서 DB 가격과 반드시 비교 |

### 3.2 필수 확인 단계 (User Confirmation Flow)

```
┌──────────────────────────────────────────────────────────────┐
│  사용자 결제 흐름 - 최소 3단계 확인                            │
│                                                              │
│  ① 플랜 선택 후 [결제하기] 버튼 클릭                          │
│       ↓                                                      │
│  ② 결제 확인 다이얼로그 (금액, 플랜명, 기간 재확인)           │
│     "₩199,000 / 3개월 프리미엄을 결제하시겠습니까?"           │
│     [취소]  [결제 진행]                                       │
│       ↓ [결제 진행] 클릭 시에만                               │
│  ③ Toss 결제위젯 (카드 선택 → 비밀번호/인증)                 │
│       ↓ Toss 인증 완료 시에만                                │
│  ④ Edge Function → Toss 승인 API 호출                       │
│       ↓                                                      │
│  ⑤ 결과 표시 (성공/실패)                                     │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Fail-Safe 설계 원칙

| 원칙 | 적용 |
|------|------|
| **Fail-to-NOT-charge** | 불확실한 상황에서는 결제를 하지 않는 방향으로 실패. 이중 결제보다 결제 안 됨이 나음 |
| **멱등성 (Idempotency)** | 동일한 `orderId`로 중복 승인 요청 시 Toss API가 거부 (Toss 자체 보호). Edge Function에서도 DB로 중복 체크 |
| **Race Condition 방지** | `orderId` UNIQUE 제약 + `SELECT ... FOR UPDATE`로 동시 요청 차단 |
| **타임아웃 = 실패 처리** | Toss API 응답이 10초 내에 없으면 실패로 간주. 이후 상태는 Webhook으로 보정 |
| **금액 서버사이드 검증** | `confirm-payment` EF에서 `membership_plans.price`와 요청 금액 불일치 시 즉시 거부 |

### 3.4 환불 안전 규칙

| # | 규칙 |
|---|------|
| 🔒-1 | 환불은 **관리자만** 실행 가능 (admin role 검증) |
| 🔒-2 | 환불 요청 시 **확인 다이얼로그** 필수 ("환불 금액: ₩OO, 위약금: ₩OO를 확인하셨습니까?") |
| 🔒-3 | 환불 금액은 **서버에서 계산** (클라이언트 입력값 불신) |
| 🔒-4 | 동일 거래에 대한 **중복 환불 방지** (refunds 테이블 상태 체크) |
| 🔒-5 | 환불 처리 후 **audit_logs에 기록** (누가, 언제, 얼마를 환불했는지) |

### 3.5 Edge Function 검증 체크리스트

`confirm-payment` Edge Function은 승인 전 다음을 **모두** 통과해야 합니다:

```
✅ 체크리스트 (하나라도 실패하면 승인 거부)
├── 1. JWT 유효성 (인증된 사용자인가?)
├── 2. orderId가 DB에 존재하고 status='pending'인가?
├── 3. 요청 금액 === DB의 membership_plans.price 인가?
├── 4. 동일 orderId로 이미 승인된 건이 없는가? (중복 방지)
├── 5. pg_settings가 활성화 상태인가?
├── 6. resolvePaymentMode()로 결정된 모드에 맞는 키를 사용하는가?
└── 7. 모든 검증 통과 후에만 Toss /confirm API 호출
```

### 3.6 개발 규칙 (Agent 준수 사항)

| 규칙 | 설명 |
|------|------|
| **결제 코드 변경 시 반드시 리뷰** | 결제 관련 파일 수정은 단독 커밋, 변경 사유 기록 |
| **테스트 없이 배포 금지** | 시뮬레이션 모드에서 전체 플로우 검증 후에만 운영 배포 |
| **에러 발생 시 안전한 방향** | catch 블록에서는 결제를 진행하지 않고 에러를 반환 |
| **console.log에 Secret Key 금지** | 로그에 API 키, 카드 정보 등 민감 정보 노출 금지 |
| **하드코딩 금액 금지** | 금액은 반드시 DB에서 조회. 코드에 금액 값을 직접 적지 않음 |

---

## 4. 시스템 아키텍처

### 4.1 전체 흐름도

```
┌──────────────────────────────────────────────────────────────┐
│  사용자 앱 (/apps/purchase)                                  │
│  ┌─────────────┐    ┌──────────────────────┐                │
│  │ 플랜 선택    │───▶│ Toss 결제위젯 호출    │                │
│  └─────────────┘    └──────────┬───────────┘                │
│                                │ 결제 인증 완료              │
│                                ▼                             │
│  ┌─────────────────────────────────┐                         │
│  │ /apps/purchase/success          │                         │
│  │ (paymentKey, orderId, amount)   │                         │
│  └────────────────┬────────────────┘                         │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    ▼ Edge Function 호출
┌───────────────────────────────────────────────────────────────┐
│  Supabase Edge Function: confirm-payment                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1. Toss API /v1/payments/confirm POST 호출              │  │
│  │    (Secret Key는 DB/Vault에서 로드)                     │  │
│  │ 2. 성공 → transactions INSERT (pg_transaction_id 포함)  │  │
│  │ 3. 성공 → memberships INSERT (start_date, end_date)     │  │
│  │ 4. 실패 → transactions INSERT (status='failed')        │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘

                    │ 결과 반환
                    ▼
┌───────────────────────────────────────────────────────────────┐
│  사용자 앱: 결제 결과 표시                                    │
│  ├── 성공 → 🎉 구매 완료 + 멤버십 즉시 활성화                │
│  └── 실패 → 😔 다시 시도 안내                                │
└───────────────────────────────────────────────────────────────┘
```

### 4.2 환불 흐름

```
┌──────────────────────────────────────────────────────────────┐
│  Admin (/admin/transactions)                                 │
│  ┌────────────────────────┐                                  │
│  │ 환불 버튼 클릭          │                                  │
│  │  → 환불 사유 입력       │                                  │
│  │  → 부분/전액 선택       │                                  │
│  │  → 위약금 자동 계산     │                                  │
│  └───────────┬────────────┘                                  │
└──────────────┼───────────────────────────────────────────────┘
               │
               ▼ Edge Function 호출
┌──────────────────────────────────────────────────────────────┐
│  Supabase Edge Function: cancel-payment                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1. Toss API /v1/payments/{paymentKey}/cancel POST       │  │
│  │ 2. 성공 → transactions UPDATE (status='refunded')       │  │
│  │ 3. 성공 → memberships UPDATE (status='cancelled')       │  │
│  │ 4. 알림 발송 (notifications INSERT)                     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Webhook 수신 (결제 상태 변경 알림)

```
Toss Payments Server
        │
        │ POST (결제 상태 변경 이벤트)
        ▼
┌──────────────────────────────────────────────────────────────┐
│  Supabase Edge Function: toss-webhook                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1. 서명 검증 (Webhook Secret)                           │  │
│  │ 2. 이벤트 타입별 처리                                   │  │
│  │    ├── PAYMENT_STATUS_CHANGED → transactions 상태 갱신  │  │
│  │    ├── PAYOUT_STATUS_CHANGED  → 정산 상태 갱신          │  │
│  │    └── 기타 → 로그 기록                                  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. 데이터베이스 스키마 변경

### 5.1 `transactions` 테이블 확장

현재 `transactions` 테이블에 다음 컬럼을 **추가**합니다:

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `user_id` | uuid | FK → auth.users (결제한 사용자) |
| `facility_id` | uuid | FK → facilities (지점) |
| `plan_id` | uuid | FK → membership_plans (구매한 플랜) |
| `order_id` | text | Toss orderId (고유 주문번호) |
| `payment_key` | text | Toss paymentKey (결제 고유 키) |
| `source` | text | 결제 출처: `online`, `pos`, `manual` (기본: `manual`) |
| `toss_status` | text | Toss 원본 상태: READY, IN_PROGRESS, DONE, CANCELED 등 |
| `cancel_reason` | text | 취소/환불 사유 |
| `cancel_amount` | numeric | 환불 금액 (부분 환불 시) |
| `cancelled_at` | timestamptz | 취소 처리 시점 |
| `receipt_url` | text | 영수증 URL |
| `toss_raw_data` | jsonb | Toss API 원본 응답 (디버깅용) |

### 5.2 `pg_settings` 테이블 신규 생성

관리자가 Admin 설정 화면에서 PG 연동 정보를 입력할 수 있도록 합니다.

```sql
CREATE TABLE public.pg_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES public.facilities(id),
  provider text NOT NULL DEFAULT 'toss',          -- PG사 구분 (확장성)
  
  -- 테스트 키 (시뮬레이션 모드용)
  test_client_key text DEFAULT 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm',
  test_secret_key_encrypted text,                 -- 기본 테스트 키 암호화 저장
  
  -- 라이브 키 (운영 모드용)
  live_client_key text,                           -- Toss Live Client Key
  live_secret_key_encrypted text,                 -- Toss Live Secret Key (암호화)
  
  -- 공통
  webhook_secret_encrypted text,                  -- Webhook 서명 검증 키
  pos_api_key_encrypted text,                     -- Toss POS API Key (향후)
  
  -- 결제 모드: 'simulation' | 'live'
  payment_mode text DEFAULT 'simulation',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

> **보안 규칙**: 
> - `secret_key_encrypted`, `webhook_secret_encrypted`, `pos_api_key_encrypted`는 
>   Supabase Vault 또는 pgcrypto로 암호화 저장
> - Client 코드에서는 절대 Secret Key에 접근 불가
> - RLS: 관리자(admin role)만 읽기/쓰기 가능

### 5.3 `refunds` 테이블 (환불 이력 별도 관리)

```sql
CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text REFERENCES public.transactions(id),
  amount numeric NOT NULL,
  reason text NOT NULL,
  penalty_amount numeric DEFAULT 0,               -- 위약금
  refund_method text,                              -- '원결제수단', '계좌이체' 등
  status text DEFAULT 'pending',                   -- pending, approved, completed, rejected
  processed_by uuid,                               -- 처리한 관리자
  toss_cancel_key text,                            -- Toss 취소 키
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
```

---

## 6. 결제 모드 및 API 키 관리 전략

### 6.1 결제 모드 결정 로직 (이중 안전장치)

Admin 설정에서 **운영/시뮬레이션** 모드를 선택할 수 있되,
서버 환경(`NEXT_PUBLIC_SUPABASE_ENV`)이 `dev`이면 **강제로 시뮬레이션**으로 동작합니다.

```
┌──────────────────────────────────────────────────────────────┐
│  결제 모드 결정 매트릭스                                      │
│                                                              │
│  서버 환경 (env)  ×  Admin 설정 (payment_mode)  =  실제 동작  │
│  ─────────────────────────────────────────────────────────── │
│  dev              ×  simulation                 =  🟡 시뮬   │
│  dev              ×  live                       =  🟡 시뮬   │  ← 강제 차단
│  prod             ×  simulation                 =  🟡 시뮬   │
│  prod             ×  live                       =  🟢 운영   │  ← 유일한 실거래
└──────────────────────────────────────────────────────────────┘
```

**코드 레벨 구현** (Edge Function 내):
```typescript
function resolvePaymentMode(pgSettings: PgSettings): 'simulation' | 'live' {
  const serverEnv = Deno.env.get('SUPABASE_ENV') || 'dev';
  
  // 개발 서버에서는 무조건 시뮬레이션
  if (serverEnv !== 'prod') return 'simulation';
  
  // 운영 서버에서만 Admin 설정 존중
  return pgSettings.payment_mode === 'live' ? 'live' : 'simulation';
}

function getApiKeys(pgSettings: PgSettings, mode: 'simulation' | 'live') {
  if (mode === 'simulation') {
    return {
      clientKey: pgSettings.test_client_key,
      secretKey: decrypt(pgSettings.test_secret_key_encrypted),
    };
  }
  return {
    clientKey: pgSettings.live_client_key,
    secretKey: decrypt(pgSettings.live_secret_key_encrypted),
  };
}
```

### 6.2 Admin 설정 UI

```
┌─────────────────────────────────────────────────────┐
│  Admin > 설정 > PG 결제 연동                         │
│  ┌─────────────────────────────────────────────────┐│
│  │ PG사: Toss Payments                              ││
│  │                                                  ││
│  │ ┌ 결제 모드 ──────────────────────────────────┐  ││
│  │ │  ○ 시뮬레이션 (테스트 키 사용, 실결제 없음)  │  ││
│  │ │  ● 운영 (라이브 키 사용, 실결제 발생)        │  ││
│  │ │                                              │  ││
│  │ │  ⚠️ 현재 서버: DEV 환경                      │  ││
│  │ │  → 운영 모드 선택 시에도 시뮬레이션으로 동작  │  ││
│  │ └──────────────────────────────────────────────┘  ││
│  │                                                  ││
│  │ ── 시뮬레이션 키 ─────────────────────────────── ││
│  │ Client Key: [test_gck_docs_Ovk5rk...] 📋        ││
│  │ Secret Key: [*********************** ] 🔒        ││
│  │                                                  ││
│  │ ── 운영 키 (라이브) ──────────────────────────── ││
│  │ Client Key: [________________] 📋                ││
│  │ Secret Key: [________________] 🔒                ││
│  │ Webhook Secret: [____________] 🔒                ││
│  │                                                  ││
│  │ 상태: 🟡 시뮬레이션 모드 (DEV 환경)              ││
│  │                                                  ││
│  │ [연결 테스트]  [저장]                             ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### 6.3 키 저장 흐름

```
Admin UI → Edge Function(sync-pg-settings) → pg_settings(encrypted)
                                                        │
confirm-payment EF ←── resolvePaymentMode() ←──────────┘
                   ←── getApiKeys() ←──────────────────┘
```

1. Admin이 테스트/라이브 키를 각각 입력 → Edge Function에서 암호화 저장
2. 결제 시 `resolvePaymentMode()`로 실제 동작 모드 결정
3. 모드에 따라 `getApiKeys()`로 적절한 키 세트 선택
4. **Client 코드에서는 Secret Key를 절대 노출하지 않음**

---

## 7. 기존 기능 연계 맵

| 기존 기능 | 연계 방식 | 변경 사항 |
|-----------|-----------|-----------|
| `/apps/purchase` (플랜 구매) | Toss 결제위젯 호출 → `confirm-payment` EF 호출 | 현재 직접 INSERT → EF 통한 PG 승인 후 INSERT |
| `/admin/transactions` (결제 내역) | `pg_transaction_id`로 Toss 상태 조회 가능 | 환불 버튼 + 상태 동기화 추가 |
| `/admin/insights/finance` (매출 리포트) | transactions 테이블 기반 집계 유지 | `source` 컬럼으로 온라인/POS/수동 구분 |
| `/admin/memberships` (멤버십 관리) | 결제 완료 시 자동 생성 | transaction_id FK 연결 |
| 알림 시스템 | 결제 성공/환불 시 자동 알림 발송 | `notifications` INSERT 트리거 연동 |
| `/admin/setup/system` (시스템 설정) | PG 설정 탭 추가 | `pg_settings` CRUD UI |

---

## 8. 위약금 계산 로직 (환불 정책)

### 8.1 기본 규칙 (체육시설법 기준)

```
환불금 = 결제금액 - 이용금액 - 위약금

이용금액 = (일일 이용단가) × (이용 일수)
일일 이용단가 = 결제금액 ÷ 총 이용일수

위약금 = 결제금액 × 위약금률

위약금률:
  - 이용 시작 전: 0% (전액 환불)
  - 이용 시작 후 1/3 경과 전: 결제금액의 10%
  - 이용 시작 후 1/2 경과 전: 결제금액의 20%
  - 이용 시작 후 1/2 경과 후: 환불 불가 (or 센터 재량)
```

### 8.2 DB 함수 (서버사이드 계산)

```sql
-- Edge Function 또는 DB 함수에서 호출
SELECT calculate_refund(
  p_transaction_id := 'txn-123',
  p_membership_id := 'mem-456'
);
-- 반환: { refund_amount, penalty_amount, used_days, total_days, penalty_rate }
```

---

## 9. 화면 변경 요약

### 9.1 사용자 앱

| 화면 | 변경 내용 |
|------|-----------|
| `/apps/purchase` | Toss 결제위젯 연동 (PG 설정 없으면 기존 방식 유지) |
| `/apps/purchase/success` | 🆕 결제 성공 콜백 페이지 |
| `/apps/purchase/fail` | 🆕 결제 실패 페이지 |
| `/apps/profile/payments` | 결제 이력에 영수증 링크 추가 |

### 9.2 관리자

| 화면 | 변경 내용 |
|------|-----------|
| `/admin/transactions` | 환불 버튼, Toss 상태 배지, 상세 모달 |
| `/admin/insights/finance` | `source` 기반 온라인/POS/수동 필터 |
| `/admin/setup/system` | PG 설정 탭 추가 (API 키 입력/테스트) |

---

## 10. Edge Functions 목록

| 함수명 | 역할 | JWT 검증 |
|--------|------|----------|
| `confirm-payment` | Toss 결제 승인 + DB INSERT | ✅ (사용자 인증) |
| `cancel-payment` | Toss 결제 취소 + 환불 처리 | ✅ (관리자 인증) |
| `toss-webhook` | Toss Webhook 이벤트 수신 | ❌ (서명 검증) |
| `sync-pg-settings` | PG 설정 암호화 저장/조회 | ✅ (관리자 인증) |

---

## 11. 구현 단계 및 에이전트 배분

### Phase 1: 결제 인프라 (DB + Edge Functions)
> **담당**: 💎 **Senior Dev (Opus)** | **공수**: 5일

| # | 작업 | 상세 |
|---|------|------|
| 1-1 | `transactions` 테이블 확장 | 결제 관련 컬럼 추가 (payment_key, order_id, source, toss_status 등) |
| 1-2 | `pg_settings` 테이블 생성 | 시뮬레이션/라이브 키 분리 저장, payment_mode 컬럼 |
| 1-3 | `refunds` 테이블 생성 | 환불 이력 관리, 위약금 기록 |
| 1-4 | RLS 정책 설정 | pg_settings: admin만, transactions/refunds: 본인+admin |
| 1-5 | `confirm-payment` EF | 7단계 검증 체크리스트 포함, Toss 승인 API |
| 1-6 | `cancel-payment` EF | 관리자 인증, 서버사이드 환불금 계산 |
| 1-7 | `toss-webhook` EF | 서명 검증, 이벤트별 분기 처리 |
| 1-8 | `sync-pg-settings` EF | API 키 암복호화 처리 |

### Phase 2: 사용자 결제 화면
> **담당**: 🎨 **UI Developer (Gemini)** + 💻 **Developer (Sonnet)** | **공수**: 3.5일

| # | 작업 | 상세 |
|---|------|------|
| 2-1 | `/apps/purchase` 결제위젯 통합 | Toss 결제위젯 SDK 연동, 3단계 확인 플로우 구현 |
| 2-2 | `/apps/purchase/success` 페이지 | 결제 성공 콜백, confirm-payment EF 호출 |
| 2-3 | `/apps/purchase/fail` 페이지 | 결제 실패/취소 안내, 재시도 버튼 |
| 2-4 | 결제 성공 시 알림 연동 | notifications INSERT 트리거 연동 |
| 2-5 | `/apps/profile/payments` 개선 | 영수증 링크, 시뮬레이션 배지 추가 |

### Phase 3: 관리자 환불 & 매출 관리
> **담당**: 🎨 **UI Developer (Gemini)** + 💎 **Senior Dev (Opus)** | **공수**: 3.5일

| # | 작업 | 상세 |
|---|------|------|
| 3-1 | Admin PG 설정 UI | `/admin/setup/system` 탭 추가, 모드 토글, 키 입력 |
| 3-2 | Admin 환불 모달 | 위약금 자동 계산, 2단계 확인 다이얼로그 |
| 3-3 | Admin 거래 상세 모달 | Toss 상태 배지, source 표시, 시뮬레이션 태그 |
| 3-4 | 매출 리포트 필터 | source 기반 온라인/POS/수동, 시뮬레이션 제외 옵션 |

### Phase 4 (향후): POS 매출 연동
> **담당**: 💎 **Senior Dev (Opus)** | **공수**: 4일

| # | 작업 | 상세 |
|---|------|------|
| 4-1 | Toss POS API 연동 EF | POS Open API 인증, 매출 데이터 조회 |
| 4-2 | POS 매출 동기화 크론 | pg_cron으로 주기적 동기화, 중복 방지 |
| 4-3 | 매출 리포트 POS 통합 | source='pos' 데이터 표시 |

### Phase 5: 문서 동기화
> **담당**: 🏛️ **Architect (Opus)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 5-1 | sitemap 갱신 | 결제 관련 라우트/기능 반영 |
| 5-2 | database-reference 갱신 | pg_settings, refunds 테이블 추가 |
| 5-3 | blueprint 반영 | 완료 상태 갱신 |

---

## 12. 블루프린트 등록용 체크리스트

```markdown
- [ ] Phase 1: 결제 인프라 (DB + Edge Functions) → 💎 **Senior Dev (Opus)**
  - [ ] transactions 테이블 확장 마이그레이션
  - [ ] pg_settings + refunds 테이블 생성 + RLS
  - [ ] confirm-payment Edge Function (7단계 검증)
  - [ ] cancel-payment Edge Function (관리자 전용)
  - [ ] toss-webhook Edge Function (서명 검증)
  - [ ] sync-pg-settings Edge Function (암복호화)
- [ ] Phase 2: 사용자 결제 화면 → 🎨 **UI Dev (Gemini)** + 💻 **Developer (Sonnet)**
  - [ ] /apps/purchase Toss 결제위젯 통합 (3단계 확인 플로우)
  - [ ] /apps/purchase/success, /apps/purchase/fail 페이지
  - [ ] 결제 성공 시 알림 연동
  - [ ] /apps/profile/payments 영수증 링크
- [ ] Phase 3: 관리자 환불 & 매출 관리 → 🎨 **UI Dev** + 💎 **Senior Dev**
  - [ ] Admin PG 설정 UI (모드 토글 + 키 입력)
  - [ ] Admin 환불 모달 (위약금 계산, 2단계 확인)
  - [ ] Admin 거래 상세 모달 (Toss 상태 표시)
  - [ ] 매출 리포트 source 필터
- [ ] Phase 4 (향후): POS 매출 연동 → 💎 **Senior Dev**
  - [ ] Toss POS API 연동 EF
  - [ ] POS 매출 동기화 크론
  - [ ] 매출 리포트 POS 통합
- [ ] Phase 5: 문서 동기화 → 🏛️ **Architect (Opus)**
  - [ ] sitemap/database-reference/blueprint 갱신
```

---

## 13. 테스트 시나리오

### 정상 흐름
1. **시뮬레이션 결제 성공**: 테스트 키로 결제위젯 → 승인 → transactions(status=done) + memberships 생성
2. **운영 결제 성공**: 라이브 키로 결제위젯 → 실승인 → 금액 차감 확인 (PROD 환경에서만)
3. **환불 성공**: Admin이 환불 → cancel-payment EF → Toss 취소 API → refunds 기록
4. **부분 환불**: 위약금 차감 후 잔액 환불 → 금액 정확성 확인
5. **PG 설정 변경**: 시뮬레이션 → 운영 모드 전환 → 라이브 키 자동 적용

### 예외 흐름
1. **DEV에서 운영 모드 시도**: 관리자가 운영 선택 → 시뮬레이션 강제 → 경고 배지 표시
2. **금액 위변조 시도**: 프론트에서 금액 조작 → confirm-payment EF에서 DB 가격 불일치 → 거부
3. **중복 결제 시도**: 동일 orderId로 재요청 → DB UNIQUE 제약 + Toss 멱등성 → 거부
4. **Toss API 타임아웃**: 10초 내 무응답 → 실패 처리 → Webhook으로 보정
5. **이미 환불된 건 재환불 시도**: refunds 테이블 상태 체크 → 중복 환불 차단
6. **라이브 키 미입력 상태에서 운영 모드**: 키 누락 감지 → 결제 차단 + 설정 안내

---

## 14. 보안 고려사항

| 항목 | 방안 |
|------|------|
| Secret Key 노출 방지 | Edge Function에서만 접근, Client 코드에 절대 포함 안 함 |
| API 키 저장 | pgcrypto 또는 Supabase Vault로 암호화 저장 |
| Webhook 위변조 방지 | `toss-webhook` EF에서 서명(Signature) 검증 |
| 결제 금액 위변조 방지 | `confirm-payment`에서 DB의 plan 가격과 요청 금액 비교 검증 |
| RLS | `pg_settings`: admin만 접근, `transactions`: 본인 거래만 조회 |
| 환불 권한 | 관리자만 `cancel-payment` 호출 가능 (admin role 검증) |
| 자동 결제 방지 | 사용자 명시적 확인 없이 /confirm 호출되는 코드 경로 금지 |
| 로그 보안 | console.log에 Secret Key, 카드번호 등 민감정보 출력 금지 |

---

## 15. 결제 모드 운영 정책

### 15.1 이중 안전장치 원칙

```
┌────────────────────────────────────────────────────────────────┐
│  최종 결제 모드 = min(Admin 설정, 서버 환경)                   │
│                                                                │
│  서버 환경    Admin 설정     최종 모드     사용 키              │
│  ──────────────────────────────────────────────────────────── │
│  DEV (개발)   시뮬레이션     🟡 시뮬레이션  test_gck / test_gsk │
│  DEV (개발)   운영           🟡 시뮬레이션  test_gck / test_gsk │ ← 강제 차단
│  PROD (운영)  시뮬레이션     🟡 시뮬레이션  test_gck / test_gsk │
│  PROD (운영)  운영           🟢 운영        live_gck / live_gsk │ ← 유일한 실거래
└────────────────────────────────────────────────────────────────┘
```

### 15.2 UI 상태 배지

| 상황 | 배지 | 컬러 |
|------|------|------|
| DEV + 시뮬레이션 | `🟡 시뮬레이션 (DEV)` | Yellow |
| DEV + 운영 설정 | `⚠️ 시뮬레이션 강제 (DEV 환경)` | Orange |
| PROD + 시뮬레이션 | `🟡 시뮬레이션` | Yellow |
| PROD + 운영 | `🟢 운영 (실거래)` | Green |

### 15.3 Toss 공식 테스트 키 (시뮬레이션용)

| 용도 | Client Key | Secret Key |
|------|------------|------------|
| 문서용 공용 키 | `test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm` | `test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6` |

### 15.4 transactions 모드 기록

모든 결제 건에 `toss_raw_data.mode` (`'simulation'` 또는 `'live'`)를 기록하여 실거래/시뮬레이션 구분.

---

## 16. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| 라이브 키 발급 지연 | 실거래 불가 | Toss 공식 테스트 키로 전체 플로우 검증 (가상 결제) |
| Secret Key 유출 | 결제 위변조 | Edge Function 전용 접근 + 암호화 저장 |
| Webhook 수신 실패 | 상태 불일치 | `/v1/payments/{key}` 폴링으로 보완 |
| POS 매출 중복 집계 | 매출 과다 표시 | `source` 컬럼 + `pg_transaction_id` UNIQUE로 중복 방지 |
| 환불 금액 오계산 | 사업 손실 | DB 함수로 서버사이드 계산, Admin 미리보기 제공 |
| 개발 중 실결제 사고 | 불필요한 과금 | DEV 환경 강제 시뮬레이션 + 3단계 사용자 확인 |

---

## 17. 참조

- **Toss Payments Docs**: https://docs.tosspayments.com/reference
- **Toss 결제위젯 연동 가이드**: https://docs.tosspayments.com/guides/v2/payment-widget/integration
- **Toss POS Open API**: https://docs.tossplace.com/docs/pos-open-api
- **기존 Sitemap**: `.docs/sitemap/admin/02-finance.md`
- **DB Reference**: `.docs/database-reference.md`

---

## 18. Planning Log (기획 진행 기록)

### Session 1 — 2026-02-18
- **작성 범위**: 전체 기획서 (섹션 1~17)
- **완성된 섹션**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
- **미완성 섹션**: 없음
- **TODO**: 없음 (기획 완료)
- **메모**:
  - 사용자와 대화를 통해 다음 핵심 결정 사항을 확정함:
    1. **Toss Payments 공식 테스트 키 활용** — 자체 Mock/시뮬레이션 로직 불필요
    2. **Admin 설정에서 운영/시뮬레이션 모드 토글** — payment_mode 컬럼으로 구분
    3. **DEV 환경 강제 시뮬레이션** — 서버가 개발 모드이면 운영 선택해도 시뮬레이션 강제
    4. **결제 안전 원칙 (Section 3)** — 자동 결제 금지, 3단계 사용자 확인, Fail-Safe 설계
    5. **POS 매출 연동 가능 확인** — Toss POS Open API로 조회 가능, Phase 4로 분리
  - Toss Payments API 키 네이밍: test_gck_*/test_gsk_* (테스트), live_gck_*/live_gsk_* (운영)
  - pg_settings 테이블에 시뮬레이션/라이브 키를 별도 컬럼으로 분리 저장

---
**문서 버전**: 1.0.0
**최종 업데이트**: 2026-02-18
