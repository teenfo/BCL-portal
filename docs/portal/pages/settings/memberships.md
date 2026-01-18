# 멤버십 상품 정책 (Membership Policies)

## 1. 개요
- **경로**: `/admin/settings/memberships`
- **아이콘**: `fa-tags`
- **설명**: 이용권 일시 중지(Hold) 가능 횟수, 양도 규정 등 멤버십 상품 전반에 적용되는 공통 규칙을 관리합니다.

## 2. 주요 기능
- 이용권 최대 정지 기간 및 횟수 제한 설정
- 회원 간 권리 양도 가능 여부 및 수수료 설정
- 신규 회원 가입 혜택(쿠폰 등) 자동 적용 규칙

## 3. UI 컴포넌트
- 글로벌 멤버십 규칙 설정 폼
- 가입 혜택 트리거 설정 그룹
- 정책 요약 뷰

## 4. Database Requirements (DB Schema)

### 주요 테이블: `membership_global_policies`
이용권 정지, 양도 등 공통 멤버십 정책을 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `policy_key` | VARCHAR | 정책 키 (예: MAX_HOLD_DAYS, TRANSFER_FEE) |
| `policy_value` | VARCHAR | 정책 값 |
| `is_active` | TINYINT | 적용 여부 |

### 연관 이력: `membership_hold_logs`
회원의 이용권 정지(Hold) 이력을 관리합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | PK |
| `user_id` | INT | 회원 FK |
| `start_date` | DATE | 정지 시작일 |
| `end_date` | DATE | 정지 종료일 |
| `reason` | TEXT | 정지 사유 |
