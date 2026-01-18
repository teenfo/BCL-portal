---
trigger: always_on
---

# BCL CI4 Admin Layout & Sidebar Rule (SB Admin 2, portal/ 기준)

## 저장 위치(중요)
- 이 규칙의 결과물은 **BCL-Portal 리포의 portal 서브모듈**에 생성한다.
- 기준 경로(prefix): `portal/`
- Sitemap 정본 파일: `portal/docs/admin-portal-sitemap.md`

## 목적
- CodeIgniter 4(SSR) 기반 BCL Admin 포털의 공통 레이아웃(SB Admin 2)과 사이드바를 스캐폴딩한다.
- npm/composer 제한 환경을 고려해 **CDN 기반**으로만 구성한다.

## 트리거
- 사용자가 아래 요청을 하면 이 규칙을 따른다:
  - “관리자 레이아웃 생성”
  - “SB Admin 2 레이아웃 만들기”
  - “Admin layout scaffold”
  - “사이드바 생성/업데이트”

## 선행 조건
- 반드시 `portal/docs/admin-portal-sitemap.md`를 정본으로 사용한다.
- 사이드바 메뉴는 sitemap과 **100% 일치**해야 한다(메뉴명/slug/icon/그룹 depth).

## 생성해야 하는 파일(필수)
1) `portal/app/Views/admin/layout.php`
- SB Admin 2 레이아웃 뼈대
- 필수 include:
  - `admin/partials/_sidebar`
  - `admin/partials/_topbar`
  - `admin/partials/_footer`
- 필수 섹션:
  - `renderSection('styles')`
  - `renderSection('content')`
  - `renderSection('scripts')`
- CSS/JS는 CDN만 사용(bootstrap 4 기반 SB Admin 2)

2) `portal/app/Views/admin/partials/_sidebar.php`
- SB Admin 2 sidebar accordion 구조
- sitemap 파일의 메뉴 트리를 그대로 반영한다.
- 메뉴는 2~3 depth(collapse) 지원
- 출력은 XSS 방지를 위해 링크 텍스트에 `esc()` 사용
- **모바일 드로어 (Drawer)**:
  - 768px 미만(md 미만) 시 어코디언 사이드바는 숨겨지고, 햄버거 메뉴로 트리거되는 오버레이 드로어로 전환됨.
  - 드로어 상단에는 로고와 닫기(`close`) 버튼이 포함되어야 함.
  - 사이드바 열림 시 `sidebarBackdrop`이 활성화되어 메인 콘텐츠를 어둡게 처리함.

3) `portal/app/Views/admin/partials/_topbar.php`
- Topbar 표시:
  - `$pageTitle` (없으면 빈 문자열)
  - `$currentUserName` (없으면 '관리자')
- 로그아웃 링크는 기본 `/logout` (추후 변경 가능)

4) `portal/app/Views/admin/partials/_footer.php`
- 연도 표시(`date('Y')`) 포함한 단순 footer

5) `portal/app/Views/admin/dashboard/index.php`
- 레이아웃 extend 샘플
- 대시보드 카드 4개(placeholder `-`)

## (권장) 생성 파일(옵션)
- `portal/app/Views/admin/_readme_layout.md`
  - 레이아웃 구성/전달 변수 설명($title, $pageTitle, $currentUserName)

## CDN 규칙(고정)
- Font Awesome(5.x) + SB Admin 2 CSS/JS는 CDN 사용
- jQuery + bootstrap bundle 포함
- (추후 로컬 배포 전환 가능하나, 초기 스캐폴딩은 CDN)

## Definition of Done
- 위 파일들이 portal/ 경로에 생성되어야 한다.
- `portal/app/Views/admin/dashboard/index.php`가 `admin/layout`을 extend 했을 때 오류 없이 렌더링되어야 한다.
- 사이드바 메뉴 구조가 `portal/docs/admin-portal-sitemap.md`와 완전히 동일해야 한다.