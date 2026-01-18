---
trigger: always_on
---

# BCL CI4 Admin Layout 생성 규칙 (SB Admin 2, SSR)

## 목적
- CodeIgniter 4(SSR) 기반의 BCL Admin 포털 공통 레이아웃(SB Admin 2)을 빠르게 스캐폴딩한다.
- npm/composer 설치가 제한된 환경을 고려해 **CDN 기반**으로만 구성한다.

## 적용 범위
- 사용자가 “관리자 레이아웃 생성”, “SB Admin 2 레이아웃 만들기”, “Admin layout scaffold”를 요청하면 이 규칙을 따른다.
- 대상은 `/admin/*` SSR 화면이며, CI4 Shield 인증은 추후 연결 가능하도록 **레이아웃/구조만 먼저** 만든다.

## 생성해야 하는 파일(최소)
1) `app/Views/admin/layout.php`
- SB Admin 2 레이아웃 뼈대
- 필수 포함:
  - `<?= $this->include('admin/partials/_sidebar') ?>`
  - `<?= $this->include('admin/partials/_topbar') ?>`
  - `<?= $this->include('admin/partials/_footer') ?>`
  - `<?= $this->renderSection('styles') ?>`, `<?= $this->renderSection('content') ?>`, `<?= $this->renderSection('scripts') ?>`
- CSS/JS는 CDN만 사용(bootstrap4 기반 SB Admin 2)
- **모바일 대응**:
  - 768px 미만에서 사이드바는 **Overlay Drawer** 형태로 동작.
  - 하단 네비게이션 바 포함.
  - 푸터는 항상 콘텐츠 최하단 혹은 화면 하단에 위치 (`min-h-screen`, `flex-col`, `mt-auto` 활용).

2) `app/Views/admin/partials/_sidebar.php`
- SB Admin 2 사이드바
- `docs/admin-portal-sitemap-and-context.md`의 sitemap(slug/icon)을 기준으로 메뉴 구성
- 현재 경로에 따라 active 처리(URI path prefix 비교)
- 그룹 메뉴는 collapse(2~3 depth) 지원

3) `app/Views/admin/partials/_topbar.php`
- 사용자 표시(예: `$currentUserName ?? '관리자'`)
- 페이지 타이틀(예: `$pageTitle ?? ''`)
- 로그아웃 링크는 일단 `/logout`로 연결(실제 라우트는 추후 조정)

4) `app/Views/admin/partials/_footer.php`
- 단순 푸터(연도 표시)

5) `app/Views/admin/dashboard/index.php`
- 레이아웃 extend + 대시보드 기본 카드 4개(값은 `-` placeholder)

6) (선택) `app/Views/admin/_readme_layout.md`
- 레이아웃 구성 설명(변수: `$title`, `$pageTitle`, `$currentUserName`)

## 코딩 규칙
- 모든 링크는 `base_url('/admin/...')` 사용
- PHP view에서 XSS 방지를 위해 출력은 `esc()` 사용
- UI는 “동작 가능한 최소 스켈레톤”만: 더미 데이터/임시 이미지 사용 가능

## 완료 조건(Definition of Done)
- 위 파일들이 생성되어야 하며,
- `admin/dashboard/index.php`가 `admin/layout`을 extend 했을 때 깨지지 않고 렌더링되어야 한다.