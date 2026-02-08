# Portal Security & Authentication

## 개요
본 프로젝트는 Supabase Auth와 커스텀 `AuthGuard`를 결합하여 수준 높은 보안 체계를 유지한다. 모든 접근은 CSR 기반의 세션 검증을 통과해야 한다.

## 1. 로그인 체계
- **관리자 (`/admin/auth/login`)**: 시설 운영 및 관리를 위한 전용 로그인 인터페이스.
- **코치 (`/coach/auth/login`)**: 수업 관리 및 멤버 케어를 위한 인터페이스.
- **사용자 (`/apps/auth/login`)**: 회원들의 수업 예약 및 프로필 관리를 위한 인터페이스.
- **클래스 포털 (`/class/auth/login`)**: 현장 수업 현황 및 WOD 확인을 위한 인터페이스.

## 2. 경로 보안 (Route Protection)
- **`AuthGuard` 컴포넌트**: 모든 내부 경로(`/admin/*`, `/apps/*`, `/coach/*`, `/class/*`)의 루트 레이아웃에서 세션 유효성을 체크한다.
- **역할 기반 접근 제어 (RBAC)**: 
  - `AuthGuard`는 `requiredRole` 프롭을 통해 특정 역할을 요구하며, 권한이 없는 경우 역할에 해당하는 로그인 페이지로 리다이렉트한다.
  - 사용자의 역할 정보는 Supabase Auth의 `user_metadata.role` 필드를 기준으로 검증한다.

## 3. 로그아웃 (Logout Flow)
- **통합 로그아웃 (`/auth/logout`)**: 모든 포털에서 공통으로 사용하며, `from` 쿼리 파라미터를 통해 사용자가 속해있던 서비스의 로그인 화면으로 정확히 복귀시킨다.
- **상태 초기화**: `window.location.href`를 통한 강제 새로고침 방식을 채택하여 클라이언트 사이드의 모든 스테일(Stale) 세션 데이터를 완벽히 제거한다.

## 4. 보안 주의사항
- **API Key**: 클라이언트에서는 절대 `service_role` 키를 사용하지 않으며, 오직 `anon` 키만을 사용하여 RLS(Row Level Security) 정책에 따라 데이터에 접근한다.
- **데이터 격리**: 모든 API 조회 및 수정은 Supabase RLS 정책을 통해 Facility ID 및 Member ID 단위로 격리되어 수행된다.
