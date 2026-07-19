# apps/purchase — 요금제 구매 · 결제 결과

> 라우트: `/apps/purchase` · `/apps/purchase/success` · `/apps/purchase/fail` (비탭, StackHeader) · 상태 🟡
> 상위 설계: 03-user-app §3.6 · 08-integrations §1 (결제 불변식) · 구현: `src/features/member-purchase/`

## ① 목적
회원이 활성 요금제를 골라 결제하고, Toss 리다이렉트 규약(success/fail)으로 승인 결과를 확인한다.
결제 불변식 **Fail-to-NOT-charge**의 클라이언트 표면 — 금액은 서버가 확정·재대조하며, 클라이언트가 보낸 금액은 신뢰 근거가 아니다.

## ② 핵심 기능
- **요금제 목록**: `is_active=true` 요금제를 가격 오름차순 카드로. `plan_kind` 배지(정기권/일일권/체험권) + `type`(횟수/기간) + 할인가 취소선.
- **3단계 BottomSheet**: (1) 상품 요약·금액 → (2) 환불 규정 동의(체크 필수) → (3) 결제 진행 동의(체크 필수) → `결제하기`.
- **주문 생성**: `결제하기`가 `fn_create_payment_order(p_plan_id)`를 호출 → 서버가 `membership_plans.price`로 주문 금액을 확정하고 `order_id`+`amount` 반환 → `/apps/purchase/success?orderId=&amount=`로 이동.
  - 라이브: 이 지점에서 Toss 결제위젯을 열고 `successUrl`에 `paymentKey`가 붙어 리다이렉트. 시뮬레이션: 위젯 없이 승인 라우트로 이동(서버가 확정금액 재대조).
- **success**: `orderId` 있으면 `confirm-payment` Edge Function 호출로 승인 확정(서버가 주문 확정금액 재대조 → 성공 시 멤버십 활성화). `orderId` 없이 직접 진입 시 일반 완료 화면.
- **fail**: `message`/`code` 쿼리 표기 + "금액 미청구" 안내 + 처음부터 재시도(자동 재시도 금지).

## ③ 데이터 소스
- 테이블: `membership_plans`(조회, RLS) · `transactions`/`memberships`(서버 확정, 클라이언트 직접 쓰기 없음)
- RPC: `fn_create_payment_order(p_plan_id uuid)` — 주문 생성·금액 확정(orderId UNIQUE, 서버 가격 재조회)
- Edge Function: `confirm-payment`(승인 확정, `fn_confirm_payment_order` service_role 위임) · `cancel-payment`(환불, 관리자 전용 — 여기선 미사용)

## ④ 상태·권한 규칙
- 로딩/에러/빈 목록 3상태 표면화(Skeleton·EmptyState onRetry) — 무한 스피너 금지.
- 결제 진행 중(`paying`) 버튼 loading + 재진입 차단. 승인 실패 시 `confirming→error` 전이, 금액 미청구 문구 필수.
- 자동결제·빌링키 저장·재시도 없음(계약). 최종 금액 판정은 서버 단독.
- UI는 표준 컴포넌트(Card/Button/Badge/Checkbox/BottomSheet)와 `--bcl-*` 토큰만 사용.

## ⑤ 수용 시나리오
1. member 계정 로그인 → `/apps/purchase` → 활성 요금제 카드가 가격순으로 표시된다.
2. 요금제 선택 → 3단계 시트에서 두 동의 체크 없이는 다음/결제 버튼이 비활성.
3. `결제하기` → success 라우트로 이동, "결제가 완료되었습니다 · 멤버십이 활성화되었습니다" 표시.
4. success에서 승인 실패를 유도(잘못된 orderId) → "결제가 완료되지 않았습니다 + 금액 미청구 + 다시 시도" 표시.
5. `/apps/purchase/fail?message=...&code=...` 직접 진입 → 사유·코드 표기, 재시도 시 `/apps/purchase` 처음부터.
