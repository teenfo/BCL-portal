# 권한·그룹 (Roles & Groups)

## 1. 개요
- **경로**: `/admin/roles`
- **아이콘**: `fa-user-shield`
- **설명**: 관리자 계정의 역할(Role)과 해당 역할별 접근 권한을 설정하는 화면입니다.

## 2. 주요 기능
- 그룹별(Admin, Manager, Coach 등) 권한 매트릭스 설정
- 특정 관리자 계정의 그룹 소속 관리
- 사이드바 메뉴별 노출 여부 제어

## 3. UI 컴포넌트
- 그룹 리스트 테이블
- 권한 체크박스 매트릭스
- 접근 제어 토글 리스트

## 4. Database Requirements (DB Schema)

### 주요 테이블 (CI4 Shield 기본 테이블)

#### `auth_groups_users`
회원에게 할당된 그룹 정보를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `user_id` | INT | 사용자 고유 식별자 (FK) |
| `group` | VARCHAR | 할당된 그룹명 (admin, developer, user 등) |

#### `auth_permissions_users`
회원 개별적으로 부여된 세부 권한을 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `user_id` | INT | 사용자 고유 식별자 (FK) |
| `permission` | VARCHAR | 부여된 권한명 (admin.access, users.create 등) |

### 설정 정보 (Shield Config)
그룹 정의와 그룹별 기본 권한은 `app/Config/AuthGroups.php` 파일에 코드로 정의됩니다.
