# BCL Admin 포털 Sitemap + CI4 생성 컨텍스트 (v0.4)

> 목적
> - 운영 전체(Admin) 포털의 **사이드바 메뉴/라우팅(sitemap)**을 확정한다.
> - 이 sitemap을 기반으로 **CodeIgniter 4(SSR) 프로젝트에서 컨트롤러/라우트/뷰/모델**을 생성할 수 있는 컨텍스트를 제공한다.

---

## 0) 전제(기술/구조)
- Backend: **CodeIgniter 4**
- Rendering: **SSR(서버사이드 렌더링)**
- Auth: **CI4 Shield** (로그인/권한)
- Admin UI: **SB Admin 2** (사이드바/레이아웃)
- URL Prefix: 모든 관리자 화면은 `/admin/*`
- 접근제어: `/admin/*`는 인증 필요 + 역할(Role) 필요(예: `admin`, `manager`, `coach` 등)

### 권장 디렉터리 컨벤션
- Controllers
  - `app/Controllers/Admin/DashboardController.php`
  - `app/Controllers/Admin/MembersController.php`
  - `app/Controllers/Admin/SessionsController.php`
  - `app/Controllers/Admin/ContentController.php`
  - `app/Controllers/Admin/ReportsController.php`
  - `app/Controllers/Admin/NotificationsController.php`
  - `app/Controllers/Admin/IntegrationsController.php`
  - `app/Controllers/Admin/SettingsController.php`
  - `app/Controllers/Admin/MaintenanceController.php`
- Views
  - `app/Views/admin/layout.php` (SB Admin 2 공통 레이아웃)
  - `app/Views/admin/partials/_sidebar.php`
  - `app/Views/admin/partials/_topbar.php`
  - `app/Views/admin/{module}/{page}.php`
- Routes
  - `app/Config/Routes.php`에서 `/admin` 그룹 라우팅 구성

---

## 1) Sitemap (SB Admin 2 Sidebar용)

### 0) Public (비로그인)
- **랜딩 페이지** (`/`) [📄Docs](pages/public/landing.md)
  - Purpose: 서비스 소개 및 로그인 진입점

### 0-1) TopBar (User Menu)
- **Profile** (`/admin/members/{currentUserId}`)
  - icon: `fa-user`
  - desc: 내 프로필 바로가기
- **Settings** (`#!`)
  - icon: `fa-cogs`
  - desc: 개인 설정 (TBD)
- **Logout** (`#logoutModal`)
  - icon: `fa-sign-out-alt`

### 1) 대시보드
- **HOME** (`/`) [📄Docs](pages/public/landing.md)
- **대시보드** (`/admin/dashboard`) [📄Docs](pages/dashboard/dashboard.md)
  - icon: `fa-tachometer-alt`


### 2) 회원관리
- (그룹) **회원관리**
  - **회원 목록** (`/admin/members`) [📄Docs](pages/members/members-list.md)
    - icon: `fa-users`
  - **회원 프로필** (`/admin/members/{memberId}`) [📄Docs](pages/members/member-profile.md)
    - icon: `fa-user`
  - **출결·체크인 로그** (`/admin/attendance`) [📄Docs](pages/members/attendance-log.md)
    - icon: `fa-clipboard-check`
  - (그룹) **멤버십·결제**
    - **플랜 관리** (`/admin/memberships/plans`) [📄Docs](pages/memberships-billing/plans.md)
      - icon: `fa-id-card`
    - **결제 내역** (`/admin/billing/payments`) [📄Docs](pages/memberships-billing/payments.md)
      - icon: `fa-credit-card`
    - **환불·정산** (`/admin/billing/settlements`) [📄Docs](pages/memberships-billing/settlements.md)
      - icon: `fa-receipt`
  - **권한·그룹** (`/admin/roles`) [📄Docs](pages/members/roles.md)
    - icon: `fa-user-shield`

### 3) 시설·세션 운영
- (그룹) **시설·세션 운영**
  - **세션·수업 스케줄** (`/admin/sessions/schedule`) [📄Docs](pages/sessions/schedule.md)
    - icon: `fa-calendar-alt`
  - **예약·대기열 관리** (`/admin/sessions/bookings`) [📄Docs](pages/sessions/bookings.md)
    - icon: `fa-list-ul`
  - **체크인 현황(실시간)** (`/admin/sessions/checkins`) [📄Docs](pages/sessions/checkins.md)
    - icon: `fa-door-open`
  - **코치 배정·교체** (`/admin/sessions/assignments`) [📄Docs](pages/sessions/assignments.md)
    - icon: `fa-random`
  - (그룹) **코치 프로필 관리**
    - **코치 목록** (`/admin/coaches`) [📄Docs](pages/coaches/coaches-list.md)
      - icon: `fa-user-tie`
    - **코치 프로필** (`/admin/coaches/{coachId}`) [📄Docs](pages/coaches/coach-profile.md)
      - icon: `fa-address-card`

### 4) 콘텐츠·게시판
- (그룹) **콘텐츠·게시판**
  - **공지사항** (`/admin/content/notices`) [📄Docs](pages/content/notices.md)
    - icon: `fa-bullhorn`
  - **운영 공지/배너** (`/admin/content/banners`) [📄Docs](pages/content/banners.md)
    - icon: `fa-image`
  - **게시글 관리** (`/admin/content/posts`) [📄Docs](pages/content/posts.md)
    - icon: `fa-edit`
  - **댓글/신고 관리** (`/admin/content/moderation`) [📄Docs](pages/content/moderation.md)
    - icon: `fa-flag`

### 5) 보고서·분석
- (그룹) **보고서·분석**
  - **출석 리포트** (`/admin/reports/attendance`) [📄Docs](pages/reports/attendance.md)
    - icon: `fa-chart-bar`
  - **세션 운영 리포트** (`/admin/reports/sessions`) [📄Docs](pages/reports/sessions.md)
    - icon: `fa-chart-line`
  - **매출·정산 리포트** (`/admin/reports/revenue`) [📄Docs](pages/reports/revenue.md)
    - icon: `fa-coins`
  - **코치 성과 리포트** (`/admin/reports/coaches`) [📄Docs](pages/reports/coaches.md)
    - icon: `fa-award`

### 6) 알림·메시지
- (그룹) **알림·메시지**
  - **템플릿 관리(푸시/문자/이메일)** (`/admin/notifications/templates`) [📄Docs](pages/notifications/templates.md)
    - icon: `fa-envelope-open-text`
  - **발송 로그** (`/admin/notifications/logs`) [📄Docs](pages/notifications/logs.md)
    - icon: `fa-history`
  - **자동 발송 규칙** (`/admin/notifications/rules`) [📄Docs](pages/notifications/rules.md)
    - icon: `fa-cogs`

### 7) 통합·연동
- (그룹) **통합·연동**
  - **결제 연동 설정** (`/admin/integrations/payments`) [📄Docs](pages/integrations/payments.md)
    - icon: `fa-plug`
  - **외부 시스템 연동(웹훅/API 키)** (`/admin/integrations/api`) [📄Docs](pages/integrations/api.md)
    - icon: `fa-key`
  - **데이터 내보내기/가져오기(CSV)** (`/admin/integrations/data`) [📄Docs](pages/integrations/data.md)
    - icon: `fa-file-csv`

### 8) 설정
- (그룹) **설정**
  - **지점/시설 정보** (`/admin/settings/facility`) [📄Docs](pages/settings/facility.md)
    - icon: `fa-store`
  - **운영 정책(취소/환불/노쇼)** (`/admin/settings/policies`) [📄Docs](pages/settings/policies.md)
    - icon: `fa-gavel`
  - **멤버십 상품 정책** (`/admin/settings/memberships`) [📄Docs](pages/settings/memberships.md)
    - icon: `fa-tags`
  - **권한 정책/역할 관리** (`/admin/settings/access`) [📄Docs](pages/settings/access.md)
    - icon: `fa-lock`

### 9) 유지보수·로그
- (그룹) **유지보수·로그**
  - **관리자 액션 로그** (`/admin/maintenance/audit`) [📄Docs](pages/maintenance/audit.md)
    - icon: `fa-user-clock`
  - **에러 로그** (`/admin/maintenance/errors`) [📄Docs](pages/maintenance/errors.md)
    - icon: `fa-bug`
  - **공지/점검 이력** (`/admin/maintenance/maintenance`) [📄Docs](pages/maintenance/maintenance.md)
    - icon: `fa-tools`
  - **인증 UI 가이드** [📄Docs](pages/maintenance/auth-ui.md)
    - icon: `fa-user-lock`
  - **레이아웃 & 상단바** [📄Docs](ui/admin-layout.md)
    - icon: `fa-window-maximize`

---

## 2) CI4 코드 생성 컨텍스트 (라우트/컨트롤러/뷰 스캐폴딩)

### 2.1 라우팅(권장)
- `/admin` 그룹을 만들고, 그룹 전체에 인증 필터 적용
- 예: `auth` + 역할 필터(커스텀)로 관리자 접근 제한

#### 권장 라우트 목록(요약)
- GET `/admin/dashboard`
- GET `/admin/members`
- GET `/admin/members/{id}`
- GET `/admin/attendance`
- GET `/admin/memberships/plans`
- GET `/admin/billing/payments`
- GET `/admin/billing/settlements`
- GET `/admin/roles`
- GET `/admin/sessions/schedule`
- GET `/admin/sessions/bookings`
- GET `/admin/sessions/checkins`
- GET `/admin/sessions/assignments`
- GET `/admin/coaches`
- GET `/admin/coaches/{id}`
- GET `/admin/content/notices`
- GET `/admin/content/banners`
- GET `/admin/content/posts`
- GET `/admin/content/moderation`
- GET `/admin/reports/attendance`
- GET `/admin/reports/sessions`
- GET `/admin/reports/revenue`
- GET `/admin/reports/coaches`
- GET `/admin/notifications/templates`
- GET `/admin/notifications/logs`
- GET `/admin/notifications/rules`
- GET `/admin/integrations/payments`
- GET `/admin/integrations/api`
- GET `/admin/integrations/data`
- GET `/admin/settings/facility`
- GET `/admin/settings/policies`
- GET `/admin/settings/memberships`
- GET `/admin/settings/access`
- GET `/admin/maintenance/audit`
- GET `/admin/maintenance/errors`
- GET `/admin/maintenance/maintenance`

> CRUD는 화면 확정 후 확장:
> - 목록: GET
> - 생성 폼: GET /create
> - 생성 처리: POST
> - 수정 폼: GET /{id}/edit
> - 수정 처리: POST/PUT
> - 삭제: POST/DELETE

### 2.2 컨트롤러 설계(권장)
- 각 메뉴 그룹을 Controller로 매핑하고, 기본은 `index()` (목록/요약 페이지)
- 상세는 `show($id)` 또는 별도 메서드
- 모든 Admin 컨트롤러는 공통 BaseAdminController(선택) 상속:
  - 레이아웃/사이드바 데이터 주입
  - 공통 breadcrumb 처리
  - 권한 체크 헬퍼

#### Controller ↔ View 매핑 예시
- DashboardController::index() → `admin/dashboard/index.php`
- MembersController::index() → `admin/members/index.php`
- MembersController::show($id) → `admin/members/show.php`
- SessionsController::schedule() → `admin/sessions/schedule.php`
- CoachesController::index() → `admin/coaches/index.php`
- CoachesController::show($id) → `admin/coaches/show.php`

### 2.3 SB Admin 2 레이아웃(권장)
- `admin/layout.php`에서 다음 구조를 고정:
  - Sidebar: `admin/partials/_sidebar.php`
  - Topbar: `admin/partials/_topbar.php`
  - Content: `renderSection('content')`
- Sidebar 메뉴는 위 Sitemap을 그대로 반영하고, 현재 URL에 따라 active 처리

### 2.4 권한(Shield) 최소 정책(권장)
- Role 예시:
  - `admin` : 전체 접근
  - `manager` : 운영/회원/세션/리포트
  - `coach` : 세션/코치 프로필 일부, 리포트 일부
- 화면 단위 권한은 추후 Policy로 확장:
  - 예: `can('members.read')`, `can('billing.write')`

### 2.5 데이터 모델(초안, 상세는 추후)
- members: 회원 기본
- attendance_logs: 체크인/출결 로그
- memberships / plans: 멤버십 상품
- payments / settlements: 결제/정산
- coaches: 코치 프로필(소개/전문분야/자격/이미지)
- sessions / bookings: 세션/예약/대기열
- content_posts / notices / banners: 콘텐츠
- notification_templates / notification_logs / notification_rules: 알림
- audit_logs / error_logs / maintenance_logs: 유지보수/로그

---

## 3) “코드 생성”을 위한 작업 지시(요약 프롬프트)
아래는 코드 생성기(또는 개발자)에게 그대로 줄 수 있는 지시문:

- CI4에서 `/admin` 라우트 그룹 생성, 인증 필터 적용
- Admin 공통 레이아웃(SB Admin 2) 구성: layout + sidebar + topbar
- Sitemap에 정의된 slug별로 Controller 메서드/View 파일을 우선 “빈 화면(스캐폴드)”로 생성
- Sidebar는 sitemap 기반으로 2~3 depth를 지원하고, active 상태 처리
- Shield 기반 Role 체크를 Controller(BaseAdminController)에서 공통 처리

---

## 4) 변경 이력
- v0.4: 레이스/키오스크/장비·센서/번역·다국어 메뉴 제거 반영 + SB Admin 2용 slug/icon 확정
