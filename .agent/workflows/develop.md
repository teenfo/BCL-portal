---
description: 블루프린트의 Priority 항목을 선택하여 배정된 전체 Phase를 일괄 개발하는 표준 실행 워크플로우입니다. (add-page, sync-docs, update-context 포함)
---

# Development Execution Workflow (/develop)

이 워크플로우는 프로젝트의 기능을 구현하고, 품질을 검토하며, 문서와 컨텍스트를 최신화하여 커밋까지 완료하는 **E2E 개발 실행 절차**입니다. 
블루프린트의 Priority 단위 개발 뿐만 아니라 단발성 페이지 추가(/add-page), 문서 동기화(/sync-docs), 컨텍스트 갱신(/update-context)의 모든 세부 로직을 포함합니다.

---

## 🤖 관점별 역할

| 관점 | 권장 모델 | 핵심 역할 |
|:---|:---|:---|
| 🏛️ **Architect** | Gemini 3 Pro (High) | 작업 선택, 설계 검토, 아키텍처 일관성 확인 및 최종 승인 |
| 💎 **Senior Dev** | Claude Opus 4.6 | DB 스키마 설계, RLS 보안 정책 구현, 복잡한 비즈니스 로직 |
| 🎨 **UI Developer** | Gemini 3 Pro (Low) | 디자인 시스템 준수, 프리미엄 UI(Glassmorphism) 구현 |
| 💻 **Developer** | Claude Sonnet 4.6 | API 연동, 일반 로직 구현, 빌드 검증, 문서/컨텍스트 동기화 |
| ⚡ **Specialist** | Gemini 3 Flash | 실시간 엔드포인트 연동, 코드-문서 단순 대조 |

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
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

// turbo
1. `.docs/project-blueprint.md`를 읽고 개발 대상을 확정한다.
2. 기획서(`.docs/archive/planning/*.md`)를 읽어 요구사항과 Phase 구성을 파악한다.
3. 블루프린트 상태를 `(개발 대기)` → `(개발 진행 중)`으로 변경한다.

---

### 2️⃣ 개발 환경 확인
**관점**: 💻 **Developer** (권장: Claude Sonnet 4.6)

// turbo
1. **빌드 검증**: `npm run build`를 실행하여 초기 상태를 확인한다.
2. **Git 상태**: `git status`로 작업 디렉토리가 깨끗한지 확인한다.

---

### 3️⃣ 개발 실행 (Phase별 관점 적용)
**관점**: **Phase별 담당 관점**

> 🚨 **Priority의 모든 Phase를 한 세션에서 연속 개발한다.**

- **DB Phase (💎 Senior)**: `db-migration` 스킬 활용, RLS 정책 구현, `database-reference.md` 갱신.
- **UI Phase (🎨 UI Dev)**: `/design-screen` 워크플로우(Stitch) 선행, `ui-gen` 가이드 준수, 글로벌 CSS 클래스 사용.
- **API/Logic Phase (💻 Dev)**: Zod 검증, Supabase 쿼리 최적화, TypeScript strict 타입 준수.
- **Navigation (🎨 UI Dev)**: `layout.tsx` 링크 연결, 사이드바/모바일 탭바 연동.

---

### 4️⃣ 검증 (셀프 체크)
**관점**: 💻 **Developer** (권장: Claude Sonnet 4.6)

// turbo
1. **빌드 재검증**: `npm run build` 에러/경고 확인.
2. **회귀 테스트**: 로그인, 화면 표시, 링크 이동 등 기본 기능 정상 여부 확인.
3. **코드 품질**: `any` 타입 지양, 하드코딩 색상 제거, 글로벌 CSS 클래스 준수 확인.

---

### 5️⃣ 문서 동기화 + 버전 갱신 (Sync Docs)
**관점**: 💻 **Developer** (권장: Claude Sonnet 4.6)

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
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High) + 💻 **Developer**

1. **Active Context 갱신**: `.docs/project-blueprint.md`의 `Current Focus`와 `Next Steps`를 갱신한다.
2. **History 기록**: 블루프린트에서 완료된 항목을 `.docs/archive/complete/project-complete-YYYYMMDD.md`로 이동한다.
3. **최종 확인**: Architect가 전체 일관성과 보안 정책 준수를 검토한다.
4. **커밋 실행**: `commit-bot` 스킬을 사용하여 커밋한다.

---

## 📌 부록: Mini-Workflow (단발성 페이지 추가)

Priority에 등록되지 않은 작은 페이지를 추가할 때는 다음 최단 경로를 따른다:

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
- `.agent/skills/commit-bot/SKILL.md` — 커밋 자동화
- `.agent/skills/ui-gen/SKILL.md` — UI 표준 가이드
