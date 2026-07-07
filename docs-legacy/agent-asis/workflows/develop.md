---
description: 블루프린트의 Priority 항목을 선택하여 배정된 전체 Phase를 일괄 개발하는 표준 실행 워크플로우입니다. (add-page, sync-docs, update-context 포함)
---

# Development Execution Workflow (/develop)

이 워크플로우는 프로젝트의 기능을 구현하고, 품질을 검토하며, 문서와 컨텍스트를 최신화하여 커밋까지 완료하는 **E2E 개발 실행 절차**입니다. 
블루프린트의 Priority 단위 개발 뿐만 아니라 단발성 페이지 추가(/add-page), 문서 동기화(/sync-docs), 컨텍스트 갱신(/update-context)의 모든 세부 로직을 포함합니다.

---

## 🤖 관점별 역할 & CLI 호출

| 관점 | CLI Role | 권장 모델 | 핵심 역할 |
|:---|:---|:---|:---|
| 🏛️ **Architect** | `--role=architect` | Gemini 3 Pro | 작업 선택, 설계 검토, 아키텍처 일관성 확인 및 최종 승인 |
| 💎 **Senior Dev** | `--role=senior` | Claude Opus 4.6 | DB 스키마 설계, RLS 보안 정책 구현, 복잡한 비즈니스 로직 |
| 🎨 **UI Developer** | `--role=ui-dev` | Gemini 3 Pro | 디자인 시스템 준수, 프리미엄 UI(Glassmorphism) 구현 |
| 💻 **Developer** | `--role=dev` | Claude Sonnet 4.6 | API 연동, 일반 로직 구현, 빌드 검증, 문서/컨텍스트 동기화 |
| ⚡ **Specialist** | `--role=specialist` | Gemini 3 Flash | 실시간 엔드포인트 연동, 코드-문서 단순 대조 |

> 💡 전체 역할 목록 확인: `npm run agent -- --list`

---

## 🎯 실행 방식: 오케스트레이터 패턴

현재 세션의 Agent(나)가 **오케스트레이터** 역할을 수행한다.
각 단계에서 적절한 역할의 에이전트를 `npm run agent` CLI로 호출하여 작업을 위임한다.

```
[ 오케스트레이터 (현재 세션) ]
    ├── Step 1 → npm run agent -- --role=architect --task="..."
    ├── Step 2 → npm run agent -- --role=dev --task="..."
    ├── Step 3 → npm run agent -- --role=senior --task="..." (DB Phase)
    │          → npm run agent -- --role=ui-dev --task="..." (UI Phase)
    │          → npm run agent -- --role=dev --task="..."    (API Phase)
    ├── Step 4 → npm run agent -- --role=dev --task="..."
    ├── Step 5 → npm run agent -- --role=dev --task="..."
    └── Step 6 → npm run agent -- --role=architect --task="..."
```

---

## 🚀 실행 모드

| 모드 | 대상 | 추천 실행 방법 |
|:---|:---|:---|
| **Priority 개발** | 블루프린트에 등록된 대규모 Priority | 모든 Step을 순서대로 수행 |
| **페이지 추가** | 단발성 신규 화면 (/add-page) | 아래 [부록: Mini-Workflow] 참고하여 전체 Step 수행 |
| **수정/버그픽스** | 이미 구현된 코드의 수정 | Step 2, 3(일부), 4, 5, 6 수행 |

---

## 단계별 절차

### 1️⃣ 작업 선택 & 분석
**관점**: 🏛️ **Architect**

```bash
npm run agent -- --role=architect --task="project-blueprint.md를 읽고 [Priority XX] 개발 대상을 분석해줘. 기획서 위치, Phase 구성, 의존성을 정리하고 블루프린트 상태를 (개발 진행 중)으로 변경해줘"
```

// turbo
1. `.docs/project-blueprint.md`를 읽고 개발 대상을 확정한다.
2. 기획서(`.docs/planning/*.md`)를 읽어 요구사항과 Phase 구성을 파악한다.
3. 블루프린트 상태를 `(개발 대기)` → `(개발 진행 중)`으로 변경한다.

---

### 2️⃣ 개발 환경 확인
**관점**: 💻 **Developer**

```bash
npm run agent -- --role=dev --task="npm run build 실행하여 빌드 상태 확인하고, git status로 작업 디렉토리 깨끗한지 확인해줘"
```

// turbo
1. **빌드 검증**: `npm run build`를 실행하여 초기 상태를 확인한다.
2. **Git 상태**: `git status`로 작업 디렉토리가 깨끗한지 확인한다.

---

### 3️⃣ 개발 실행 (Phase별 관점 적용)
**관점**: **Phase별 담당 관점**

> 🚨 **Priority의 모든 Phase를 순차적으로 개발한다. 각 Phase마다 적절한 역할의 에이전트를 호출한다.**

---

#### 3-A. DB Phase (💎 Senior Dev) — DB 변경이 있는 경우 필수

> ⚠️ DB Phase는 반드시 `db-migration` 스킬의 전체 절차를 따른다.
> 스킬 위치: `.agent/skills/db-migration/SKILL.md`

```bash
npm run agent -- --role=senior --task="
[Priority XX] DB Phase:
기획서 .docs/planning/[기획서].md의 DB 변경 사항을 분석하고
.agent/skills/db-migration/SKILL.md 절차를 따라 실행해줘.
마이그레이션 SQL 작성 → apply_migration 적용 → 보안 어드바이저 확인 → database-reference.md 갱신까지 완료해줘.
"
```

**Agent가 수행해야 할 DB Phase 세부 절차:**

**① 현황 분석**
- 기획서에서 필요한 테이블/컬럼/RPC 목록 추출
- `database-reference.md` 및 `list_tables`로 현재 DB 상태 확인
- 이미 존재하는 항목 vs 신규 생성 항목 분류

**② 마이그레이션 문서 작성** (`.docs/database/migrations/`에 작업 지시서 생성)
```
.docs/database/migrations/
└── YYYYMMDD_priority{N}_phase{M}_{description}.md
```
문서에 포함할 내용:
- 생성/수정할 테이블·컬럼 목록
- RLS 정책 설계 (역할별 접근 범위)
- 인덱스 전략
- 완성된 마이그레이션 SQL 전문
- apply_migration 호출 정보 (`migration_name`)

**③ SQL 검토 체크리스트** (적용 전 자체 검토)
- [ ] 모든 새 테이블에 `ENABLE ROW LEVEL SECURITY` 선언
- [ ] `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` 포함
- [ ] `created_at`, `updated_at` TIMESTAMPTZ 포함
- [ ] 외래 키 `ON DELETE` 정책 명확 (CASCADE / SET NULL / RESTRICT)
- [ ] 필요 컬럼에 인덱스 선언 (`CREATE INDEX IF NOT EXISTS`)
- [ ] RPC 함수에 `SET search_path = public` 선언
- [ ] RPC 함수에 `REVOKE ALL FROM PUBLIC` + `GRANT TO authenticated` 선언
- [ ] 데이터 삭제/DROP 포함 시 사용자 확인 완료

**④ 마이그레이션 적용**
```javascript
mcp_supabase-mcp-server_apply_migration({
  project_id: "{PROJECT_ID}",
  name: "{migration_name}",  // snake_case, 의미있는 이름
  query: "{SQL}"
})
```
> ⚠️ DDL 변경은 반드시 `apply_migration` 사용. `execute_sql`은 조회/DML 전용.

**⑤ 적용 검증**
```javascript
// 1. 마이그레이션 이력 확인
mcp_supabase-mcp-server_list_migrations({ project_id: "{PROJECT_ID}" })

// 2. 보안 어드바이저 확인 (RLS 누락 감지)
mcp_supabase-mcp-server_get_advisors({ project_id: "{PROJECT_ID}", type: "security" })

// 3. 테이블/컬럼 존재 확인 (execute_sql로 검증)
// SELECT column_name FROM information_schema.columns WHERE table_name = '...'
```

**⑥ 문서 갱신** (DB Phase 완료 전 필수)
- `database-reference.md`: 새 테이블·컬럼·RPC 항목 반영
- 작성한 마이그레이션 문서(`.docs/database/migrations/*.md`) 최종 확인

---

#### 3-B. UI Phase (🎨 UI Dev)

> ⚠️ DB Phase가 선행된 경우, UI Phase는 DB 적용 완료 후 진행한다.

```bash
npm run agent -- --role=ui-dev --task="[Priority XX] UI Phase 개발: 기획서 .docs/planning/[기획서].md를 참고하여 화면 구현해줘. ui-gen 가이드와 글로벌 CSS 클래스를 준수해줘"
```
- `/design-screen` 워크플로우(Stitch) 선행, `ui-gen` 가이드 준수, 글로벌 CSS 클래스 사용.

#### 3-C. API/Logic Phase (💻 Dev)
```bash
npm run agent -- --role=dev --task="[Priority XX] API Phase 개발: 기획서 .docs/planning/[기획서].md를 참고하여 API 연동, 비즈니스 로직 구현해줘. Zod 검증, TypeScript strict 타입 준수해줘"
```
- Zod 검증, Supabase 쿼리 최적화, TypeScript strict 타입 준수.

#### 3-D. Navigation (🎨 UI Dev)
```bash
npm run agent -- --role=ui-dev --task="[Priority XX] Navigation 연결: layout.tsx에 새 화면 링크 추가하고 사이드바/모바일 탭바 연동해줘"
```
- `layout.tsx` 링크 연결, 사이드바/모바일 탭바 연동.

---

### 4️⃣ 검증 (셀프 체크)
**관점**: 💻 **Developer**

```bash
npm run agent -- --role=dev --task="빌드 검증(npm run build), 회귀 테스트(로그인/화면표시/링크이동), 코드 품질(any 타입, 하드코딩 색상, 글로벌 CSS) 확인해줘"
```

// turbo
1. **빌드 재검증**: `npm run build` 에러/경고 확인.
2. **회귀 테스트**: 로그인, 화면 표시, 링크 이동 등 기본 기능 정상 여부 확인.
3. **코드 품질**: `any` 타입 지양, 하드코딩 색상 제거, 글로벌 CSS 클래스 준수 확인.

---

### 5️⃣ 문서 동기화 + 버전 갱신 (Sync Docs)
**관점**: 💻 **Developer**

```bash
npm run agent -- --role=dev --task="[Priority XX] 완료된 구현 기준으로 문서 동기화해줘. Sitemap 갱신, 블루프린트 Phase 체크, 버전(version.ts/package.json) 갱신해줘"
```

구현된 실제 코드를 바탕으로 문서를 최신화한다.

1. **Sitemap 갱신** (`.docs/sitemap/**/*.md`):
   - 실제 사용된 UI 텍스트, 데이터 필드, API 엔드포인트 수동 업데이트/대조.
   - Screen ID 매핑 확인.
2. **블루프린트 갱신**: 완료된 Phase 체크(`[x]`), Priority 상태 `✅ (완료)` 이동.
3. **버전 갱신** (`src/lib/version.ts`, `package.json`):
   - Priority 완료 시 **MINOR +1**, 단순 수정 시 **PATCH +1**.
   - `BUILD_DATE`를 오늘 날짜로 업데이트.

---

### 6️⃣ 컨텍스트 기록 & 최종 커밋 (Update Context & Commit)
**관점**: 🏛️ **Architect** + 💻 **Developer**

```bash
# Architect: 컨텍스트 갱신 & 최종 검토
npm run agent -- --role=architect --task="[Priority XX] 완료. project-blueprint.md의 Current Focus와 Next Steps 갱신하고, 완료 항목을 archive/complete/project-complete-YYYYMMDD.md로 이동해줘. 전체 일관성과 보안 정책 검토해줘"

# Developer: 커밋 실행
npm run agent -- --role=dev --task="commit-bot 스킬을 사용하여 현재 변경사항을 커밋해줘"
```

1. **Active Context 갱신**: `.docs/project-blueprint.md`의 `Current Focus`와 `Next Steps`를 갱신한다.
2. **History 기록**: 블루프린트에서 완료된 항목을 `.docs/archive/complete/project-complete-YYYYMMDD.md`로 이동한다.
3. **최종 확인**: Architect가 전체 일관성과 보안 정책 준수를 검토한다.
4. **커밋 실행**: `commit-bot` 스킬을 사용하여 커밋한다.

---

## 📌 부록: Mini-Workflow (단발성 페이지 추가)

Priority에 등록되지 않은 작은 페이지를 추가할 때는 다음 최단 경로를 따른다:

```bash
# 1. Sitemap 선행
npm run agent -- --role=architect --task="[화면명] 화면을 .docs/sitemap/에 정의해줘"

# 2. DB & Design (필요시)
npm run agent -- --role=senior --task="[화면명] 관련 테이블/마이그레이션 생성해줘"

# 3. E2E 구현
npm run agent -- --role=dev --task="[화면명] UI 구현 → API 연동 → 네비게이션 연결 한 번에 진행해줘"

# 4~6. 마무리 (검증 → 동기화 → 커밋)
npm run agent -- --role=dev --task="빌드 검증, 문서 동기화, 버전 갱신 후 커밋해줘"
```

1. **Sitemap 선행**: `.docs/sitemap/`에 화면과 기능을 먼저 정의한다 (Architect).
2. **DB & Design**: 필요 시 마이그레이션 실행 및 Stitch 디자인 생성.
3. **E2E 구현**: UI 구현 → API 연동 → 네비게이션 연결을 한 번에 진행.
4. **마무리**: Step 4(검증) → Step 5(동기화) → Step 6(커밋) 절차를 동일하게 수행.

---

## ✅ 완료 체크리스트

### 🏛️ Architect 관점
- [ ] 개발 범위 및 의존성 분석 완료
- [ ] 최종 아키텍처 및 보안 정책 승인
- [ ] 컨텍스트 갱신 및 커밋 승인

### 💎 Senior Dev 관점 (DB Phase 있는 경우)
- [ ] 마이그레이션 문서 `.docs/database/migrations/YYYYMMDD_*.md` 작성 완료
- [ ] `apply_migration` 적용 성공 확인 (`list_migrations`)
- [ ] 보안 어드바이저 신규 경고 없음 (`get_advisors`)
- [ ] `database-reference.md` 갱신 완료
- [ ] 모든 새 테이블 RLS 활성화 확인
- [ ] RPC 함수 `search_path` 설정 확인

### 💻 Developer 관점
- [ ] `npm run build` 에러 없음
- [ ] Sitemap, Blueprint, History 문서 동기화 완료
- [ ] `src/lib/version.ts` 및 `package.json` 버전 갱신 완료

### 🎨 UI Developer 관점
- [ ] Stitch 디자인 시스템 반영 완료
- [ ] 글로벌 CSS 클래스 및 Glassmorphism 가이드 준수

---

## 🔗 관련 문서
- `/plan-to-blueprint` — 기획 완료 후 블루프린트 등록 (선행)
- `.agent/skills/db-migration/SKILL.md` — **DB 마이그레이션 전체 절차** (3-A 단계 필수 참조)
- `.agent/skills/commit-bot/SKILL.md` — 커밋 자동화
- `.agent/skills/ui-gen/SKILL.md` — UI 표준 가이드
- `.agent/scripts/bcl-cli.mjs` — 멀티에이전트 CLI 래퍼
- `.docs/database-reference.md` — DB 스키마 빠른 참조
- `.docs/database/migrations/` — 마이그레이션 작업 지시서 보관 위치
