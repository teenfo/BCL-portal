# 결제 내역 (Payments)

## 1. 개요
- **경로**: `/admin/billing/payments`
- **아이콘**: `fa-credit-card`
- **설명**: 발생한 모든 결제 트랜잭션을 조회하고 관리하는 화면입니다.

## 2. 주요 기능
- 결제 수단별/상태별(성공, 대기, 취소) 필터링
- 영수증 보기 및 결제 취소 요청
- 일별 매출 합계 요약

## 3. UI 컴포넌트
- 결제 트랜잭션 테이블
- 상태 구분 배지
- 매출 요약 차트 (간이용)

## 4. Database Requirements (DB Schema)

### 주요 테이블: `payments`
모든 결제 거래 데이터를 기록합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `user_id` | INT | 결제한 회원 ID (users.id FK) |
| `plan_id` | INT | 구매한 플랜 ID (membership_plans.id FK) |
| `amount` | DECIMAL | 실 결제 금액 |
| `method` | VARCHAR | 결제 수단 (Card, Transfer, Cash) |
| `status` | VARCHAR | 상태 (Success, Pending, Failed, Cancelled) |
| `transaction_id` | VARCHAR | 외부 PG사 거래 번호 |
| `created_at` | DATETIME | 결제 일시 |

### 연관 테이블
- `users`: 결제 회원 정보 조회
- `membership_plans`: 구매 품목 정보 조회
