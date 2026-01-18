# Project Configuration (CodeIgniter 4)

이 문서는 BCL Admin 포털의 주요 설정 및 라우팅 규칙을 설명합니다.

## 1. 환경 설정 (.env)
포털의 기본 환경 파일(`.env`)은 아래와 같이 설정되어야 합니다.

- **baseURL**: `http://localhost:8001/` (시뮬레이터 서버 포트 고려)
- **indexPage**: `''` (index.php 제거를 통한 클린 URL 사용)

```ini
app.baseURL = 'http://localhost:8001/'
app.indexPage = ''
```

## 2. 라우팅 설정 (app/Config/Routes.php)

### 2.1 관리자 그룹 (Admin Group)
관리자 관련 모든 기능은 `/admin` 프리픽스를 사용하며, 별도의 네임스페이스(`App\Controllers\Admin`)에서 관리됩니다.

```php
$routes->group('admin', ['namespace' => 'App\Controllers\Admin'], function ($routes) {
    $routes->get('/', 'DashboardController::index');
    $routes->get('dashboard', 'DashboardController::index');
    // ... 기타 모듈 라우트
});
```

## 3. 유틸리티

### 3.1 활성 메뉴 매칭 (is_active)
사이드바의 메뉴 활성화 상태를 판단하기 위해 `admin/partials/_sidebar.php`에 정의된 `is_active($path)` 함수를 사용합니다.

- **규칙**: 현재 URI가 지정된 경로와 정확히 일치하거나, 해당 경로로 시작하고 바로 다음에 슬래시(`/`)가 오는 경우 'active' 반환.
- **예외**: `/admin` 경로는 `/admin/dashboard`와도 매칭됨.

## 4. UI 프레임워크 통합
- **SB Admin 2**: 메인 관리자 테마 및 Bootstrap 4 기반 UI 제공.
- **Tailwind CSS**: 세부 스타일링 및 반응형 유틸리티 클래스 제공.
- **충돌 방지**: Tailwind의 `.collapse` (visibility: collapse)와 Bootstrap의 `.collapse` (display: none/block) 충돌을 해결하기 위해 `.collapse.show { visibility: visible !important; }` 스타일을 `layout.php`에 적용함.
