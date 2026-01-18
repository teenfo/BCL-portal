---
trigger: always_on
---

# BCL-Portal 개발 필수 Rules (Agent용) v1.0

## 0) 리포/경로 규칙 (절대)
- 작업 대상은 **BCL-Portal 리포의 `portal/` 서브모듈**이다.
- 코드/문서/자산 생성·수정은 **항상 `portal/` 아래**에서만 한다.
- 상위 리포(BCL-Repo)에는 새 파일을 만들지 않는다.
- 기본 경로 프리픽스: `portal/`

---

## 1) 기술 스택 고정 (필수)
- Backend: **CodeIgniter 4**
- Rendering: **SSR only** (SPA/프론트 프레임워크 도입 금지)
- Auth: **CI4 Shield**
- UI: **Tailwind CDN + Semantic Color Tokens**
- DB: MariaDB
  - database: `bcl_db`
  - user: `bcl_user`
  - password: `bcl0000`

---

## 2) 문서 정본(SSOT) 규칙 (필수)
### 2.1 Sitemap 정본
- 정본 파일: `portal/docs/admin-portal-sitemap.md`
- 사이드바/라우트/컨트롤러/뷰 스캐폴딩은 **항상 이 파일을 기준으로 생성**
- 불일치 발생 시: **sitemap이 정답**이며 코드/사이드바를 sitemap에 맞춰 수정

### 2.2 컬러 시스템 정본 (Light + Dark)
- 정본 파일:
  - `portal/assets/theme/colors.css`
  - `portal/assets/theme/tailwind-config.js`
  - `portal/docs/ui/color-system.md`
- UI에서 금지:
  - `bg-white`, `text-gray-*`, `border-gray-*` 등 직접 컬러 클래스 남발
  - 임의 HEX/rgba를 view에 직접 작성
- UI에서 허용:
  - `bg-bg`, `bg-surface`, `bg-surface2`, `text-fg`, `text-muted`, `border-border`
  - `bg-primary`, `text-primary`, `bg-primarySoft`, 상태 토큰(success/danger/warning)

### 2.3 페이지 생성 정본
- 정본 파일:
  - 'docs/pages/*' 
  - sitemap 에 링크된 문서를 참조 하여 기능을 생성 변경 한다.
  - 모든 페이지에 대한 작업이 이루어 질 때는 문서의 정본을 먼저 수정을 한다.
  - 수정 된 내용이 현재 문서에 해당 하는 내용이 없다면 신규 문서를 생성하여 기록 한다.

---

## 3) 라우팅/보안 규칙 (필수)
- Admin Prefix: **`/admin/*`**
- Routes 구성:
  - `/admin` route group 생성
  - **Shield 인증 필터** 적용 (미인증 접근 차단)
  - 역할(Role) 기반 접근 제어 기본 적용: 최소 `admin`, `manager`, `coach`
- 파라미터 규칙:
  - sitemap의 `{id}` → CI4 라우트에서 `(:segment)` 로 매핑

---

## 4) 디렉터리/구조 규칙 (필수)
### 4.1 View 구조(고정)
- `portal/app/Views/admin/layout.php`
- `portal/app/Views/admin/partials/_sidebar.php`
- `portal/app/Views/admin/partials/_topbar.php`
- `portal/app/Views/admin/partials/_footer.php`
- 각 페이지: `portal/app/Views/admin/{module}/{page}.php`

### 4.2 Controller 구조(권장/표준)
- Namespace: `App\Controllers\Admin`
- 컨트롤러는 메뉴 그룹 단위로 분리(예: Dashboard, Members, Sessions, Content, Reports…)

### 4.3 View 작성 규칙
- 모든 페이지는 레이아웃 확장:
  - `extend('admin/layout')`
- 모든 출력은 XSS 방지:
  - `esc()` 기본 사용
- 색상/테마는 토큰 기반 클래스만 사용(컬러 시스템 Rule 준수)

---

## 5) UI/UX 규칙 (필수)
- Tailwind CDN 사용(plugins: forms, container-queries)
- 공통 패턴(반드시 준수):
  - Page Root: `bg-bg min-h-screen text-fg`
  - Card: `bg-surface border border-border rounded-2xl shadow-card`
  - Input/Search: `bg-surface2 border border-border rounded-2xl text-fg placeholder:text-subtle`
  - Primary CTA/FAB: `bg-primary text-onPrimary`
- 다크모드:
  - `<html class="dark">` 토글 방식
  - Dark 톤은 **Iron Pulse 샘플**(딥 슬레이트 bg + 블루슬레이트 카드 + 오렌지 포인트) 유지

---

## 6) CRUD/리스트 정책 (필수)
- 목록 페이지 기본 기능은 “기본 제공”이 원칙:
  - 검색 / 필터 / 정렬 / 페이지네이션
- 입력 검증:
  - 서버사이드 Validation 우선(CI4 Validation)
- 보안:
  - POST 요청 CSRF 적용(프로젝트 기본 정책 따름)
- 삭제:
  - 원칙적으로 soft delete 우선(필요 시 정책 문서화)

---

## 7) 감사(Audit)·로그 규칙 (필수)
- 관리자 행동 기록:
  - 생성/수정/삭제/권한 변경 등은 Audit 로그에 남긴다.
- 에러 처리:
  - 사용자 화면에는 친화적 메시지
  - 상세 에러는 에러 로그에 저장

---

## 8) 개발 진행 순서 규칙 (필수)
- “문서 → 스캐폴드 → CRUD → 권한/정책” 순서
- 메뉴/라우팅 변경 시:
  1) `portal/docs/admin-portal-sitemap.md` 먼저 수정
  2) 사이드바/라우트/컨트롤러/뷰를 재생성 또는 동기화

---

## 9) Definition of Done (DoD)
- sitemap에 정의된 모든 slug는 404 없이 접근 가능
- `/admin/*`는 인증/권한 없이 접근 불가
- 모든 admin 화면은 공통 레이아웃 + 사이드바 + 컬러 토큰 시스템이 적용됨
- 핵심 목록 화면(회원/세션/콘텐츠)은 검색·필터·페이지네이션 “뼈대”까지 존재