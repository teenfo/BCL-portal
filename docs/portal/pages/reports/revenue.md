# 매출·정산 리포트 (Revenue Reports)

## 1. 개요
- **경로**: `/admin/reports/revenue`
- **아이콘**: `fa-coins`
- **설명**: 전체 매출 현황, 상품별 매출 비중, 환불 비율 등 자금 관련 리포트를 제공하는 화면입니다.

## 2. 주요 기능
- 월별 매출 추이 및 전년/전월 대비 성장률 분석
- 멤버십 플랜별 매출 기여도 분석
- 순매출 실적 및 환불 공제액 통계

## 3. UI 컴포넌트
- 매출 추이 스태킹 차트 (Stacked Area Chart)
- 상품별 매출 비중 파이 차트
- 기간별 매출 상세 표 (CSV 다운로드 포함)

## 4. Database Requirements (DB Schema)

### 기초 데이터 테이블
- **`payments`**: 모든 매출 데이터의 PK 및 금액 정보 (Status=Success 대상)
- **`refunds`**: 매출 차감액(환불) 정보
- **`membership_plans`**: 플랜별 매출 비중 분석용

### 연관 필드
- `payments.amount`: 결제 금액
- `payments.created_at`: 일자별 집계 기준
- `membership_plans.name`: 카테고리별 분류 기준
