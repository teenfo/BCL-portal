---
trigger: always_on
---

# BCL CI4 Admin Routing & Controller Scaffold Rule (portal/ 기준)

## 저장 위치(중요)
- portal 서브모듈 기준으로 생성한다.
- 기준 경로(prefix): `portal/`
- Sitemap 정본 파일: `portal/docs/admin-portal-sitemap.md`

## 목적
- sitemap을 기준으로 CI4 Admin 라우트와 컨트롤러 메서드(빈 화면)를 최소 스캐폴딩한다.
- 모든 화면은 SSR view를 렌더링하고, 레이아웃은 `admin/layout`을 사용한다.

## 생성/수정 대상
1) `portal/app/Config/Routes.php` (또는 분리된 routes 파일을 쓰는 프로젝트 컨벤션이 있다면 그 방식)
- `/admin` 그룹 생성
- 그룹에 auth 필터 적용(Shield 기준, 실제 필터명은 프로젝트에 맞춤)
- sitemap의 slug별 GET 라우트를 등록

2) Controllers (Namespace: `App\Controllers\Admin`)
- 최소 컨트롤러 생성:
  - DashboardController
  - MembersController
  - SessionsController
  - CoachesController
  - ContentController
  - ReportsController
  - NotificationsController
  - IntegrationsController
  - SettingsController
  - MaintenanceController
- 각 컨트롤러 메서드는 해당 view를 render:
  - `$data = ['title'=>..., 'pageTitle'=>..., 'currentUserName'=>...]`
  - `return view('admin/{module}/{page}', $data);`

3) Views
- sitemap의 각 slug에 대응하는 최소 view 파일 생성(내용은 h1 + placeholder)

## 구현 규칙
- URI 파라미터 표기는 `{id}` 를 사용, CI4 라우트는 `(:segment)` 매핑
- “상세 화면”은 show 형태로 처리:
  - 예: `/admin/members/{memberId}` → MembersController::show($memberId)
- View는 반드시 `<?= $this->extend('admin/layout') ?>` 패턴 사용

## Definition of Done
- sitemap에 있는 모든 slug가 라우트로 접근 가능해야 한다(404 없음).
- 모든 페이지가 레이아웃/사이드바 포함 상태로 렌더링된다.