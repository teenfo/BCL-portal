# 운영 정책 (Operating Policies)

## 1. 개요
- **경로**: `/admin/settings/policies`
- **아이콘**: `fa-gavel`
- **설명**: 수업 예약 취소 규정, 환불 위약금 산정 방식, 노쇼(No-show) 처리 기준 등 서비스 운영 규칙을 설정하는 화면입니다.

## 2. 주요 기능
- 수업 시작 전 몇 시간 전까지 취소 가능한지 설정
- 결제 후 기간 경과에 따른 환불 로직 정의
- 노쇼 시 페널티 (이용 횟수 차감 등) 규칙 설정

## 3. UI 컴포넌트
- 정책 항목별 설정 카드
- 숫자 입력 및 시간 선택기
- 정책 변경 이력(History) 로그

## 4. Database Requirements (DB Schema)

### 주요 테이블: `operating_policies`
각종 운영 규칙을 설정값으로 관리합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `policy_key` | VARCHAR | 정책 식별키 (PK, 예: CANCEL_TIME_LIMIT) |
| `policy_value` | TEXT | 설정값 (예: 6) |
| `unit` | VARCHAR | 단위 (Hours, Days, Count 등) |
| `description` | VARCHAR | 정책에 대한 설명 |
| `updated_at` | DATETIME | 최근 수정 일시 |

### 이력 테이블: `policy_histories`
정책 변경 내역을 로깅합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | PK |
| `policy_key` | VARCHAR | 변경된 정책 키 |
| `old_value` | TEXT | 이전 값 |
| `new_value` | TEXT | 변경된 값 |
| `changed_by` | INT | 변경 관리자 ID |
