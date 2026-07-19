# admin/payments — 결제 거래 관제 · 환불 2단계

> 라우트: `/admin/payments` (진입 게이트 `payments.view`) · 상태 🟡
> 상위 설계: 02-admin §3.4 · 08-integrations §1.2·§1.6 · 구현: `src/features/payments/`

## ① 목적
관리자가 결제 거래를 관제하고, 환불을 **2단계(계산·미리보기 → 확정 실행)**로 집행한다.
환불 불변식: 금액은 서버가 산정(`fn_calculate_refund`, 위약금 10% 상한 강제)하고 클라이언트는 편집할 수 없다.

## ② 핵심 기능
- **탭 2종**: `거래`(transactions) · `환불 이력`(refunds).
- **거래 탭**: 상태·기간(7/30/90/전체) 필터. 회원·요금제·금액·상태·결제수단/모드(운영/시뮬 배지)·일시·order_id 표시. 기간은 서버 `gte`로 조회.
- **환불 버튼**: `status='completed'` + 멤버십 연결 + `payments.approve` 권한일 때만 노출.
- **RefundModal 2단계**:
  - STEP 1 (preview): `fn_calculate_refund`로 결제금액·이용분 공제(일수/횟수)·위약금(율 + 10% 캡)·환불금액을 **read-only** 표시 + 사유 입력(필수). 금액 클라이언트 편집 불가.
  - STEP 2 (confirm): "환불 ₩OO / 위약금 ₩OO / 사유" 명시적 재확인 → 실행. 두 단계 시각적 분리, 자동 실행 없음.
- **실행 경로**: (2a) `fn_request_refund`(서버 재계산·잠금 → `refunds` approved 생성) → (2b) `cancel-payment` Edge Function(`confirm:true`, `fn_process_refund` service_role: 거래 refunded + 멤버십 cancelled + audit).
- **환불 이력 탭**: 요청일시·환불금액·위약금·사유·상태·완료일시.

## ③ 데이터 소스
- 테이블(조회, admin RLS): `transactions`(+`members.name`, `membership_plans.name`) · `refunds`
- RPC: `fn_calculate_refund(p_transaction_id, p_membership_id)`(read-only 산정, 10% 캡) · `fn_request_refund(p_transaction_id, p_membership_id, p_reason)`(authenticated·approved 생성·중복 차단)
- Edge Function: `cancel-payment`(admin 인증 → `fn_process_refund(p_refund_id, p_toss_cancel_key, p_mode)` service_role 원자 확정)

## ④ 상태·권한 규칙
- 진입: `PermissionGate group="payments"`(=`payments.view`). 환불 실행: `payments.approve`(`can('payments','approve')`).
- 중복 환불 차단: 이미 approved/completed 환불이 있는 거래는 서버가 거부.
- **Display-Safe**: 부상/메모/정산 등 민감정보 비노출 — 거래 요약 필드만 표시.
- 조회는 `query()`(RLS), 쓰기는 계약 RPC/EF 경유만. 금액은 서버 단일 산정(클라이언트 불신).
- 표준 컴포넌트(Table/Tabs/Modal/Badge/Select) + `--bcl-*` 토큰만.

## ⑤ 수용 시나리오
1. admin(payments.view) 로그인 → `/admin/payments` → 최근 30일 거래가 최신순 표시.
2. 상태=완료·기간=90일 필터 → 해당 거래만. 완료 거래 행에 `환불` 버튼(approve 권한 시).
3. `환불` → STEP 1에서 서버 계산 금액 read-only + 위약금 10% 캡 표기, 사유 미입력 시 다음 비활성.
4. 사유 입력 → STEP 2 재확인 → `환불 실행` → 성공 토스트, 환불 이력 탭에 completed 반영.
5. 멤버십 미연결 거래는 환불 버튼 비활성 + "연결된 멤버십이 없어 환불할 수 없습니다".
