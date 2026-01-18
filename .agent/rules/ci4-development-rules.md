---
trigger: always_on
---

# CI4 개발 규칙 Rule (BCL-Portal / SSR Only) v1.1
(v1.1: Migration/Seeder 생성·운영 규칙 추가)

## 0) 작업 범위(절대 규칙)
- 작업 대상: **BCL-Portal 리포의 `portal/` 서브모듈**
- 모든 생성/수정 파일은 **무조건 `portal/` 아래**에서만 수행한다.
- 상위 리포(BCL-Repo)에는 파일을 생성하지 않는다.

---

## 1) 아키텍처 규칙
- **SSR only**: SPA/프론트 프레임워크(React/Vue/Svelte) 도입 금지
- CI4 표준 구조 준수:
  - Controller: 요청 처리/권한/검증/응답
  - Model: DB 접근/쿼리/엔티티 규칙
  - View: 렌더링만(비즈니스 로직 금지)
- 공통 레이아웃 사용:
  - `portal/app/Views/admin/layout.php` + partials (`_sidebar`, `_topbar`, `_footer`)
  - 모든 admin view는 `extend('admin/layout')` 사용

---

## 2) 문서 정본(SSOT) 규칙
- Admin 메뉴/라우팅 정본:
  - `portal/docs/admin-portal-sitemap.md` 를 정본으로 사용
  - 사이드바/라우트/컨트롤러/뷰는 **항상 sitemap 기준으로 생성/수정**
- UI 컬러 시스템 정본:
  - `portal/assets/theme/colors.css`
  - `portal/assets/theme/tailwind-config.js`
  - `portal/docs/ui/color-system.md`
  - **직접 컬러 클래스/임의 HEX 금지**, semantic token class만 사용

---

## 3) 라우팅 규칙
- Admin prefix 고정: `/admin/*`
- Routes는 `/admin` 그룹으로 구성하고 Shield auth 필터 적용
- 라우트 네이밍/구조:
  - list: `/admin/{resource}`
  - create: `/admin/{resource}/create`
  - store:  POST `/admin/{resource}`
  - show: `/admin/{resource}/{id}`
  - edit: `/admin/{resource}/{id}/edit`
  - update: POST/PUT `/admin/{resource}/{id}`
  - delete: POST/DELETE `/admin/{resource}/{id}`
- 파라미터:
  - sitemap의 `:id`/`{id}`는 CI4 라우트 `(:segment)`로 매핑

---

## 4) 인증/권한 규칙 (Shield)
- `/admin/*`는 인증 없이 접근 불가
- 최소 Role 권장: `admin`, `manager`, `coach`, `staff`
- 컨트롤러에서 권한 체크 원칙:
  - “메뉴 접근”과 “쓰기 작업(create/update/delete)”는 별도 체크
- 사이드바 메뉴 노출은 권한 기반으로 제어 가능(선택)하되,
  **서버 권한 체크가 최종 방어선**

---

## 5) 데이터/DB 규칙
- DB: MariaDB (`bcl_db`, `bcl_user`, `bcl0000`)
- 스키마 변경은 항상 **Migration**으로 수행
- 대량 목록은 필수:
  - 검색/필터/정렬(whitelist)/페이지네이션
- 삭제는 soft delete 우선(정책이 필요하면 문서화)

---

## 6) Migration 생성·운영 규칙 (필수)
### 6.1 생성 원칙
- DB 스키마 변경(테이블/컬럼/인덱스/제약/seed용 초기 데이터 구조 포함)은 **반드시 Migration**으로 처리한다.
- 수동 SQL로 서버에 직접 반영 금지(운영/검증 환경 불일치 방지).

### 6.2 파일 생성(표준 명령)
- Migration 생성:
  - `php spark make:migration CreateUsersTable`
  - `php spark make:migration AddStatusToMembers`
- 생성 위치:
  - `portal/app/Database/Migrations/*`

### 6.3 작성 규칙
- `up()`은 변경 적용, `down()`은 **원복 가능**하게 작성한다.
- 컬럼 변경/삭제는 주의(데이터 손실 가능). 필요 시 “확장 Migration(추가 컬럼) → 데이터 마이그레이션 → 제거 Migration” 단계로 분리.
- 인덱스/유니크/외래키는 명시적으로 정의한다.
- 가능한 경우 트랜잭션 기반으로 안전하게 처리한다(DB 지원 범위 내).

### 6.4 실행 규칙(환경)
- 로컬/사전운영/운영은 **같은 Migration**을 사용한다.
- 실행:
  - 전체: `php spark migrate`
  - 롤백: `php spark migrate:rollback`
  - 최신으로 복구: `php spark migrate`
- 운영에서는 롤백 정책(가능/불가 범위)을 문서화하고, 위험 Migration은 별도 승인 절차(권장).

---

## 7) Seeder 생성·운영 규칙 (필수)
### 7.1 목적
- 개발/테스트/초기 구동에 필요한 **기본 데이터(roles, permissions, 기본 설정, 샘플 플랜 등)**를 표준 방식으로 제공한다.

### 7.2 파일 생성(표준 명령)
- Seeder 생성:
  - `php spark make:seeder RolesSeeder`
  - `php spark make:seeder DevSampleSeeder`
- 생성 위치:
  - `portal/app/Database/Seeds/*`

### 7.3 작성 규칙(중요)
- Seeder는 **idempotent(여러 번 실행해도 중복/오염이 최소)** 해야 한다.
  - 예: upsert/존재여부 체크 후 insert
- 운영 데이터에 영향을 주는 “샘플/더미” Seeder는 분리한다:
  - `DevSampleSeeder`(개발 전용) / `ProdBootstrapSeeder`(운영 초기값)
- 민감정보(API Key 등) Seeder에 하드코딩 금지(환경변수/관리자 입력으로 처리).

### 7.4 실행 규칙
- 실행:
  - 단일: `php spark db:seed RolesSeeder`
  - 전체(마스터 Seeder): `php spark db:seed DatabaseSeeder`
- 권장 패턴:
  - `DatabaseSeeder`를 만들고, 내부에서 필요한 Seeder를 순서대로 호출한다.
- “운영 초기값” 적용은 배포 절차에 포함하되, 실행 기록을 남긴다(권장).

---

## 8) 입력 검증/보안 규칙
- 서버사이드 Validation 우선(CI4 Validation)
- 정렬 키/정렬 방향은 **whitelist**로 검증(임의 컬럼 정렬 금지)
- 모든 POST는 CSRF 정책 준수(프로젝트 설정에 따라 적용)
- 모든 출력은 `esc()`로 XSS 방지
- 파일 업로드는 허용 확장자/용량/저장경로 고정 + 서버측 검증

---

## 9) View(UI) 규칙 (Tailwind + Tokens)
- Tailwind는 CDN 사용(plugins: forms, container-queries)
- 공통 패턴:
  - Page root: `bg-bg min-h-screen text-fg`
  - Card: `bg-surface border border-border rounded-2xl shadow-card`
  - Input: `bg-surface2 border border-border rounded-2xl text-fg placeholder:text-subtle`
  - Primary CTA: `bg-primary text-onPrimary`
- 다크모드:
  - `<html class="dark">` 토글 방식
  - Dark 톤은 “Iron Pulse” 샘플 톤 유지

---

## 10) 로깅/감사(Audit) 규칙
- 관리자 행동(생성/수정/삭제/권한 변경)은 Audit 로그 남김
- 에러는 사용자 메시지(친화적) + 내부 로그(상세) 분리
- 운영 화면에 stack trace 노출 금지

---

## 11) 코딩 컨벤션
- Controller 메서드는 짧게(요청→검증→서비스/모델→응답)
- 공통 처리(권한/검증/flash/redirect)는 helper 또는 BaseController로 표준화
- 상수/설정은 config 또는 env로 관리(하드코딩 금지)

---

## 12) Definition of Done (DoD)
- sitemap의 모든 slug는 404 없이 접근 가능
- `/admin/*`는 인증/권한 없이 접근 불가
- 모든 admin 화면은 공통 레이아웃 + 컬러 토큰 시스템이 적용됨
- 핵심 리스트 화면은 검색/필터/정렬/페이지네이션 동작
- 스키마 변경은 Migration으로만 반영되며, 초기 데이터는 Seeder로 재현 가능
