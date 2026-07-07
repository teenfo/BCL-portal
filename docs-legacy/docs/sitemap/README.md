# BCL Portal Global Sitemap (SSOT)

이 문서는 BCL Portal의 전체 서비스 구조와 라우팅 트리를 정의하는 최상위 지도입니다. 모든 개발 및 기획의 정본(Single Source of Truth)으로 활용됩니다.

---

## 🗺️ 애플리케이션 라우팅 트리

### 0. [공통 인증 시스템 (Authentication)](./auth-system.md) 🆕
- **URL Prefix**: `/auth/*`
- **Description**: 모든 애플리케이션의 공통 로그인, 회원가입, 비밀번호 재설정 등 인증 관련 화면.
- **Path**: `src/app/auth/*`

### 1. [관리자 포털 (Admin Portal)](./admin/README.md)
- **URL Prefix**: `/admin/*`
*   **Description**: 센터 운영, 회원 관리, 매출 통계 및 시스템 설정을 위한 데스크탑 최적화 관리 도구.
*   **Path**: `src/app/admin/*`

### 2. [회원용 앱 (User Application)](./user-app.md)
- **URL Prefix**: `/apps/*`
*   **Description**: 일반 회원을 위한 모바일 전용 앱. 수업 예약, QR 체크인, 멤버십 관리를 제공합니다.
*   **Path**: `src/app/apps/*`

### 3. [코치용 앱 (Coach Application)](./coach-app.md)
- **URL Prefix**: `/coach/*`
*   **Description**: 코치 전용 모바일 앱. 당일 수업 확인, 출석 체크, 회원 코칭 노트를 관리합니다.
*   **Path**: `src/app/coach/*`

### 4. [현장 클래스 포털 (Class Portal)](./class-portal.md)
- **URL Prefix**: `/class/*`
*   **Description**: 센터 내 대형 스크린(TV/모니터)용 인터페이스. 타이머, 리더보드, WOD 게시판을 노출합니다.
*   **Path**: `src/app/class/*`

### 5. [체크인 키오스크 (Kiosk Application)](./kiosk-app.md)
- **URL Prefix**: `/kiosk/*`
*   **Description**: 지점 입구 비치용 무인 체크인 단말기. 전면 카메라를 통한 QR 스캔 기능을 제공합니다.
*   **Path**: `src/app/kiosk/*`

---

## 🔐 공통 인증 및 접근 규칙 (Auth Rules)

1.  **사용자 인증**: 모든 앱은 Supabase Auth를 통해 로그인을 관리합니다.
2.  **권한 가드(AuthGuard)**:
    - `/admin`: `admin` role 필요.
    - `/coach`: `coach` role 필요.
    - `/apps`: `member` role 필요.
    - `/class`, `/kiosk`: 특정 공용 계정 또는 지점 계정으로 접속 권한 제한.
3.  **로그아웃**: 모든 앱의 공용 로그아웃 경로는 `/auth/logout`을 지향합니다.
