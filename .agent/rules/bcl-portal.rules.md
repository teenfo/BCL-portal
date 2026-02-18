---
trigger: always_on
---

# BCL Portal Agent Rules v1.0
(CSR / Next.js / Cloudflare / Supabase)

이 문서는 BCL Portal 프로젝트에서 **Agent(AI/자동화/보조 개발자)**가
반드시 따라야 하는 작업 규칙을 정의한다.
사람에게 설명하기 위한 문서가 아니라, **행동 제약 규칙**이다.

---

## 0) 프로젝트 절대 전제
- 이 프로젝트는 **CSR 기반**이다.
- SSR은 기본 사용하지 않는다.
- Frontend: **Next.js**
- Hosting: **Ubuntu 24.04 자체 서버 (Docker)**
- Backend DB/Auth: **Supabase**
- 모든 커밋이 완료 되면 github의 action 확인 하고 에러 사항이 있다면 다시 수정 하여 커밋 한다.
- 커밋 코멘트는 자동으로 생성 한다
---

## 1) 리포지토리 & 경로 규칙 (절대)
- 작업 대상 리포: **BCL-Portal**
- 기준 루트: 프로젝트 루트
- 화면 구조:
  - 사용자: `apps/*`
  - 관리자: `admin/*`
- Agent는 다음 행위를 하면 안 된다:
  - 다른 리포(BCL-Repo 등)에 파일 생성
  - 임의의 루트 구조 변경
  - `apps`와 `admin`을 혼합한 라우트 생성
 

---

## 2) Sitemap = Single Source of Truth (SSOT)
- 정본 Sitemap 파일:
  - `.docs/sitemap/README.md` (전체 지도)
  - `.docs/sitemap/**/*.md` (모듈별 상세 디자인)
- Agent 규칙:
  - 새로운 화면/라우트/메뉴는 **반드시 sitemap을 먼저 수정**
  - sitemap에 없는 기능을 코드로 생성하면 안 된다
  - **Admin sitemap**: 업무 그룹별 세분화된 구조(`.docs/sitemap/admin/`)를 준수

---

## 3) 라우팅 규칙
- 사용자 영역:
  - URL Prefix: `/apps/*`
  - 폴더: `apps/*`
- 관리자 영역:
  - URL Prefix: `/admin/*`
  - 폴더: `admin/*`

### 인증(Auth)
- 사용자 Auth:
  - `/apps/auth/login`
  - `/apps/auth/callback`
- 관리자 Auth:
  - `/admin/auth/login`
  - `/admin/auth/callback`
- 로그아웃:
  - `/auth/logout`

Agent는 Auth 라우트를 sitemap 없이 추가하면 안 된다.

---

## 4) 렌더링 & 데이터 접근 규칙
- 모든 화면은 **CSR(Client Side Rendering)** 기준
- 서버 렌더링 전제 코드 작성 금지
- 데이터 접근 원칙:
  - Client -> Supabase SDK -> DB
  - Server/Worker는 다음 경우에만 사용:
    - Webhook 수신
    - 외부 API Secret 처리
    - Background Job 트리거

---

## 5) Supabase 사용 규칙 (중요)
- Client에서는 반드시:
  - `anon key`
  - **RLS 활성화된 테이블만 접근**
- Agent는 다음을 하면 안 된다:
  - Service Role Key를 클라이언트 코드에 사용
  - RLS 없는 테이블 접근 전제 설계

### 권한 처리
- UI 권한 제어는 UX 목적
- **최종 보안은 RLS**
- role / facility / tenant 기준 접근 통제 필수

---

## 6) Admin ↔ User 데이터 연계 규칙
- User(apps)에서 표시되는 정보 중:
  - 지점/시설
  - 공지
  - 코치 정보
- 위 데이터는 **Admin에서 관리한 데이터의 Read-only View**이다.
- Agent는:
  - User 화면에서 Admin 데이터의 수정 기능을 만들면 안 된다.

---

## 7) UI / Layout 규칙
### 사용자(apps)
- 네비게이션: **Bottom Tab**
  - Home / Schedule / Check-in / Facilities / Profile
- 모바일 퍼스트 설계

### 관리자(admin)
- 네비게이션: **Sidebar**
- Sitemap과 1:1 매핑
- 그룹/Collapse 구조 유지

---

## 8) Background Job / 자동화 규칙
- Cron/Batch 작업은:
  - Supabase pg_cron
  - Supabase Edge Functions
- CI 서버 크론, 장기 실행 서버 작업 전제 금지

---

## 9) 문서 우선순위
Agent가 판단에 사용할 문서 우선순위:
1. `.agent/rules/bcl-portal.rules.md` (이 문서)
2. `.agent/rules/ui.rules.md` (UI/UX 규칙)
3. `.docs/sitemap/README.md` (전체 지도)
4. `.docs/sitemap/**/*.md` (모듈별 상세 디자인)
5. `.docs/project-blueprint.md` (프로젝트 개요 및 현재 상태)
6. `.docs/database-reference.md` (DB 스키마 빠른 참조)
7. `.docs/design-security.md` (UI 원칙 및 보안)
8. `.docs/database/**/*` (DB 상세 - 스키마, RLS, 마이그레이션)
9. `.docs/security/**/*` (보안 상세)
10. `.docs/testing/**/*` (테스트 전략)

**제외 규칙:**
- ⛔ `.docs/archive/**/*` - Agent는 이 폴더를 **자동으로 참조하지 않음**
  - 필요시 사용자가 명시적으로 요청한 경우에만 참조
  - 아카이브 구조:
    - `.docs/archive/` - 초기 분석 리포트, 상세 가이드, 기술 문서
    - `.docs/archive/result/` - 개발 과정 결과물 (리뷰, 완료 리포트, 구현 계획)
    - `.docs/archive/project-complete-*.md` - 날짜별 완료 작업 히스토리
  - 예시: "archive의 project-complete-20260218.md에서 키오스크 작업 내역 확인해줘"

상위 문서와 충돌 시 **상위 문서가 항상 우선**이다.
---

## 10) UI/UX 디자인 생성 규칙 (Stitch MCP)
- 새로운 화면/기능 추가 시 **반드시 Stitch MCP를 사용하여 디자인을 먼저 생성**한다.
- 디자인 생성 프로세스:
  1. **Sitemap 갱신** (필수 선행)
  2. **기존 프롬프트 참조** (`.docs/stitch-prompts/`) - 동일 영역의 화면 패턴 파악
  3. **Stitch 화면 생성** (`mcp_StitchMCP_generate_screen_from_text`)
  4. **Sitemap에 Screen ID 매핑** (추적성 확보)
  5. **프롬프트 저장** (`.docs/stitch-prompts/apps/` 또는 `admin/`)
  6. **UI/UX 개발 진행** (생성된 디자인 기준)
- Agent는 다음을 하면 안 된다:
  - Sitemap 갱신 없이 Stitch 디자인 생성
  - 디자인 생성 없이 UI 코드 작성
  - 프롬프트를 저장하지 않고 화면 생성
  - 기존 프롬프트 패턴을 무시하고 새 프롬프트 작성
- **디자인 일관성 유지**:
  - 동일 영역(apps/admin)의 기존 프롬프트 반드시 참조
  - 공통 디자인 요소(테마, 네비게이션, 컴포넌트 스타일) 유지
- **워크플로우**: `.agent/workflows/design-screen.md` 참조

---

## 11) 문서-코드 동기화 규칙 (Sync)
- 모든 기능 개발 및 수정 시, 해당 기능의 기획 문서를 즉시 업데이트해야 한다.
- Agent는 작업 완료 보고 전, 소스 코드와 `.docs/sitemap/**/*.md` 문서 간의 정합성을 최종 확인한다.
- 불일치가 발견되면 코드를 수정하거나 기획 문서를 최신화하여 항상 동기화된 상태를 유지한다.
