# 환불·정산 (Refunds & Settlements)

## 1. 개요
- **경로**: `/admin/billing/settlements`
- **아이콘**: `fa-receipt`
- **설명**: 환불 처리 내역과 주기적인 매출 정산 통계를 관리하는 화면입니다.

## 2. 주요 기능
- 환불 승인/반려 프로세스 관리
- 정산 대상 기간 설정 및 정산 레포트 생성
- 환불 사유 통계 분석

## 3. UI 컴포넌트
- 환불 요청 목록
- 정산 현황 타일
- 월간 정산 보고서 링크

## 4. Database Requirements (DB Schema)

### 주요 테이블: `refunds`
환불 요청 및 처리 내역을 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `payment_id` | INT | 원본 결제 ID (payments.id FK) |
| `amount` | DECIMAL | 환불 금액 |
| `reason` | TEXT | 환불 사유 |
| `status` | VARCHAR | 상태 (Requested, Approved, Rejected) |
| `processed_by` | INT | 처리 관리자 ID |
| `created_at` | DATETIME | 요청 일시 |

### 통계용 연관 테이블
- `payments`: 정산 분석을 위한 기초 데이터
