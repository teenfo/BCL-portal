# BCL-Portal 기본 설치 패키지 & 설정 세트 v0.1
(CI4 SSR + Shield + Tailwind CDN + Color Tokens)

> 목적: 이 문서는 “룰”이 아니라, BCL-Portal(서브모듈 `portal/`)을 구동하기 위한 **기본 설치 패키지(의존성) + 필수 설정 세트**를 한 곳에 정리한다.

---

## 0) 작업 기준(리포/경로)
- 개발/배포 대상: **BCL-Portal 리포**
- 모든 경로는 **`portal/` 서브모듈 기준**
- 상위 리포(BCL-Repo)에는 파일 생성/수정 금지

---

## 1) 런타임/서버 요구사항(기본)
- PHP: (CI4가 요구하는 버전 범위 내)
- DB: MariaDB
- 웹서버: Apache/Nginx (rewrite 설정 필요)
- PHP 확장(권장/일반):
  - mbstring
  - intl
  - json
  - curl
  - openssl
  - mysqli (또는 pdo_mysql)
- 권한:
  - `portal/writable/` 디렉터리 쓰기 가능해야 함

---

## 2) 기본 설치 패키지(의존성) 구성
### 2.1 PHP(Composer) 의존성
- CodeIgniter 4 (framework)
- CodeIgniter Shield (auth)

#### 호스팅 제약(Composer 사용 불가) 대응
- 개발/빌드 환경에서 Composer로 설치 후,
- 배포 시 `vendor/` 포함하여 업로드(또는 빌드 아티팩트로 패키징)한다.
- 운영 서버에서는 composer install을 수행하지 않는 것을 전제로 한다.

### 2.2 프론트(UI) 의존성
- **Tailwind CDN** 사용(빌드/NPM 불필요)
- 폰트/아이콘:
  - Google Fonts (Lexend)
  - Material Symbols (필요 시)
- (Admin) 레이아웃은 SSR View로 제공하며 SPA 프레임워크는 사용하지 않는다.

---

## 3) 기본 환경설정(.env) 세트
### 3.1 DB 설정(현재 프로젝트 기준)
- database: `bcl_db`
- user: `bcl_user`
- password: `bcl0000`

### 3.2 환경 변수 최소 세트(예시)
- 아래 키들은 프로젝트 상황에 맞게 조정한다.
- 핵심: baseURL / DB / environment
- 예)
  - `CI_ENVIRONMENT = development | production`
  - `app.baseURL = https://your-domain/`
  - `database.default.hostname = localhost`
  - `database.default.database = bcl_db`
  - `database.default.username = bcl_user`
  - `database.default.password = bcl0000`
  - `database.default.DBDriver = MySQLi`

---

## 4) 인증(Shield) 기본 세팅
- 목표: `/admin/*`는 인증 없이 접근 불가
- 권장 Role:
  - `admin`, `manager`, `coach`, `staff`
- 권장 정책:
  - “메뉴 접근 권한”과 “쓰기 권한(create/update/delete)”을 분리
- 운영 시 주의:
  - 초기 admin 계정 생성 방식(Seeder 또는 최초 설치 스크립트)을 명확히 정한다.

---

## 5) Migration/Seeder 기본 세트(권장)
### 5.1 Migration 원칙
- 스키마 변경은 항상 Migration으로만 반영한다.
- 위치: `portal/app/Database/Migrations/*`

### 5.2 Seeder 원칙
- 초기/기본 데이터는 Seeder로 재현 가능해야 한다.
- 위치: `portal/app/Database/Seeds/*`
- 권장 Seeder 분리:
  - 운영 초기값: Roles/Permissions/Settings (중복 실행 안전)
  - 개발 샘플: DevSampleSeeder (운영 적용 금지)

### 5.3 기본으로 준비하면 좋은 Seeder
- RolesSeeder: admin/manager/coach/staff 생성
- PermissionsSeeder(선택): 권한 매트릭스 사용 시
- AdminBootstrapSeeder: 초기 admin 계정 1개 생성(운영 정책에 맞게)
- FacilitySettingsSeeder(선택): 지점/시설 기본값

---

## 6) UI 기본 세팅(컬러 SYSTEM + Tailwind CDN)
### 6.1 컬러 시스템 정본 파일
- `portal/assets/theme/colors.css`
- `portal/assets/theme/tailwind-config.js`
- `portal/docs/ui/color-system.md`

### 6.2 HTML(View) 포함 순서(권장)
```html
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script src="/assets/theme/tailwind-config.js"></script>
<link rel="stylesheet" href="/assets/theme/colors.css" />
```
### 6.3 색상 적용 규칙
- 직접 색상 클래스/임의 HEX 금지
- semantic token만 사용:
  - `bg-bg`, `bg-surface`, `bg-surface2`
  - `text-fg`, `text-muted`, `text-subtle`
  - `border-border`
  - `bg-primary`, `text-primary`, `bg-primarySoft`
  - 상태 토큰: `text-success`, `bg-successSoft`, `text-danger`, `bg-dangerSoft`, `text-warning`, `bg-warningSoft`
- Dark Mode:
  - `<html class="dark">` 토글
  - 다크 톤은 Iron Pulse 샘플(딥 슬레이트 배경 + 블루슬레이트 카드 + 오렌지 포인트) 유지

---

## 7) Admin 레이아웃(SSR) 기본 세트
- 레이아웃/partial 위치(고정):
  - `portal/app/Views/admin/layout.php`
  - `portal/app/Views/admin/partials/_sidebar.php`
  - `portal/app/Views/admin/partials/_topbar.php`
  - `portal/app/Views/admin/partials/_footer.php`
- 페이지 규칙:
  - 모든 admin page는 `extend('admin/layout')`
  - 출력은 기본 `esc()` 적용

---

## 8) Admin 메뉴/라우팅 정본(Sitemap)
- 정본 파일(권장): `portal/docs/admin-portal-sitemap.md`
- 현재 최신 메뉴는 캔버스 “BCL Admin 포털 메뉴 구성 v0.4” 기준
- 규칙:
  - 사이드바/라우트/컨트롤러/뷰는 sitemap 기준으로 동기화

---

## 9) 배포 체크리스트(요약)
- [ ] `portal/writable/` 권한 확인
- [ ] `.env`(또는 서버 환경변수) 설정 반영
- [ ] DB 연결 확인
- [ ] Migration 실행(필요 시)
- [ ] Seeder 실행(운영 초기값)
- [ ] `/admin/*` 인증 차단 확인(Shield)
- [ ] 컬러 시스템 파일(`colors.css`, `tailwind-config.js`) 배포 포함 확인
- [ ] rewrite 설정 확인(서버별)

---

## 10) 다음 문서(권장)
- `portal/docs/setup/portal-basic-setup.md` (전체 개요)
- `portal/docs/ui/color-system.md` (UI 토큰 상세)
- `portal/docs/rules/ci4-development-rules.md` (개발 규칙/룰)
