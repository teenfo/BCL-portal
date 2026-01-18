# 플랜 관리 (Membership Plans)

## 1. 개요
- **경로**: `/admin/memberships/plans`
- **아이콘**: `fa-id-card`
- **설명**: 판매 중인 멤버십 이용권 종류와 가격 정보를 설정하는 화면입니다.

## 2. 주요 기능
- 이용권 신규 등록 및 기존 상품 수정
- 이용권 가격, 유효기간, 횟수 설정
- 상품 게시 여부(On/Off) 제어

## 3. UI 컴포넌트
- 이용권 카드 리스트
- 상품 등록/수정 모달 또는 페이지
- 가격 정책 입력 폼

## 4. Database Requirements (DB Schema)

### 주요 테이블: `membership_plans`
판매 상품인 멤버십 플랜 정보를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `name` | VARCHAR | 플랜 이름 |
| `price` | DECIMAL | 가격 |
| `period_days` | INT | 유효 기간 (일 단위) |
| `total_count` | INT | 사용 가능 횟수 (회차제 플랜용) |
| `plan_type` | ENUM | 유형 (Term, Count, Period) |
| `is_published` | TINYINT | 게시 여부 |

### 연관 테이블
- `users`: 회원이 현재 보유 중인 플랜 데이터와 연결
