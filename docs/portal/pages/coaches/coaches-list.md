# 코치 목록 (Coaches List)

## 1. 개요
- **경로**: `/admin/coaches`
- **아이콘**: `fa-user-tie`
- **설명**: 센터에 소속된 전체 코치진을 조회하고 관리하는 화면입니다.

## 2. 주요 기능
- 코치 검색 및 상태(재직, 휴직 등) 필터링
- 코치 신규 등록 및 프로필 연동
- 코치별 고용 조건 및 기본 정보 요약

## 3. UI 컴포넌트
- 코치 프로필 카드 리스트
- 필터 사이드바
- 코치 상세 보기 링크

## 4. Database Requirements (DB Schema)

### 주요 테이블: `users` (Role=coach)
코치 데이터는 `users` 테이블에서 `group`이 `coach`인 회원들입니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `username` | VARCHAR | 코치 성함 |
| `phone` | VARCHAR | 연락처 |
| `active` | TINYINT | 소속 상태 (1: 재직, 0: 퇴사/휴직) |

### 추가 테이블: `coach_details`
코치 특화 상세 정보(경력, 급여 조건 등)를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `user_id` | INT | 사용자 ID (users.id FK) |
| `specialties` | TEXT | 전문 분야 (JSON 형식) |
| `base_salary` | DECIMAL | 기본급 |
| `commission_rate` | FLOAT | 수업료 수수료율 |
