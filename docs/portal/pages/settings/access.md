# 권한 정책/역할 관리 (Access Policy)

## 1. 개요
- **경로**: `/admin/settings/access`
- **아이콘**: `fa-lock`
- **설명**: 시스템 보안 정책(로그인 시도 제한, 비밀번호 변경 주기) 및 관리자 역할별 상세 권한 매핑을 총괄적으로 관리합니다.

## 2. 주요 기능
- 보안 정책 (2FA 강제 여부, IP 접속 제한 등) 설정
- 관리자 그룹(Role)의 추가/삭제 및 그룹별 핵심 권한 할당
- 개인별 추가 권한(특수 권한) 부여 로직

## 3. UI 컴포넌트
- 보안 설정 토글 리스
- 역할별 권한 매트릭스 (상세 모드)
- 로그인 보안 설정 위젯

## 4. Database Requirements (DB Schema)

### 주요 테이블 (CI4 Shield 기본 + 확장)

#### `auth_groups_users` / `auth_permissions_users`
회원 및 관리자의 역할과 세부 권한을 정의합니다. (Roles 화면 설명 참조)

#### `security_policies` (Custom)
시스템 전체 보안 설정을 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | PK |
| `policy_name` | VARCHAR | 보안 정책 명칭 (예: IP_WHITELIST, PASSWORD_EXPIRY_DAYS) |
| `policy_value` | TEXT | 정책 값 |
| `is_enabled` | TINYINT | 활성화 상태 |

#### `auth_logins` (Shield 기본)
로그인 시도 및 성공 이력을 기록하여 무단 접근 시도를 모니터링합니다.
