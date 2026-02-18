---
description: 개발된 내용이 정상적으로 개발 되었는지 검사하고 감사 보고서를 생성하는 워크플로우입니다.
---

# Audit Workflow (`/audit`)

이 워크플로우는 개발된 기능이나 시스템이 기획 문서, UI 원칙, 보안 정책 및 기술 표준을 준수하는지 종합적으로 검사하고, 그 결과를 `.docs/audit/` 폴더에 보고서로 기록하는 **품질 보증(QA) 및 감사 절차**입니다.

## 🤖 에이전트별 역할 및 책임 (Roles & Responsibilities)

감사 프로세스는 전문 영역별로 다음과 같은 에이전트들이 책임을 분담합니다.

### 🏛️ Architect (Opus 4.6 Thinking)
*   **비즈니스 정합성**: 구현된 기능이 기획서(`.docs/planning/`)의 요구사항을 100% 충족하는지 검증합니다.
*   **구조적 완전성**: Sitemap과 실제 구현된 라우팅 구조의 일치 여부를 확인합니다.
*   **이슈 관리**: 감사 보고서 내용을 바탕으로 결함 사항을 블루프린트에 등록하고 후속 작업을 할당합니다.

### 🎨 UI Developer (Gemini 3 Pro)
*   **디자인 가이드 준수**: Glassmorphism 테마 및 색상 변수 사용 여부를 정밀 분석합니다.
*   **Admin 표준 검사**: 관리자 페이지에서 약속된 글로벌 CSS 클래스(`.admin-filter-btn` 등)를 누락 없이 사용했는지 확인합니다.
*   **UX 디테일**: 로딩 상태(Skeleton), Empty State, 반응형 레이아웃의 완성도를 검사합니다.

### 💎 Senior Dev (Opus 4.6 Thinking)
*   **보안 아키텍처**: Supabase RLS 정책의 안전성과 API 권한 제어 로직을 심층 검토합니다.
*   **데이터 모델**: 마이그레이션 파일과 `database-reference.md`의 동기화 상태를 확인합니다.
*   **기술 부채 식별**: 코드의 재사용성, 성능 병목, 확장성 측면에서의 개선 포인트를 도출합니다.

### 💻 Developer (Sonnet 4.6)
*   **기술적 무결성**: `npm run build` 성공 여부와 TypeScript 타입 시스템(`any` 사용 금지)을 검증합니다.
*   **보고서 종합**: 모든 에이전트의 피드백을 수집하여 `.docs/audit/`에 공식 보고서를 생성합니다.
*   **문서 동기화**: 프로젝트 블루프린트와 Sitemap의 최신화 상태를 최종 확인합니다.

---

## 단계별 절차

### 1️⃣ 감사 대상 지정 및 분석
**담당**: 🏛️ **Architect**

감사할 대상(특정 Priority, 라우트, 또는 시스템 전체)을 선정하고 관련 문서를 수집합니다. **상세 요구사항은 기획서(Planning Doc)를 최상위 기준으로 삼습니다.**

1. **관련 문서 로드 (Source of Truth)**:
   - **[Primary]** 대상 기능의 기획서 (`.docs/archive/planning/*.md` 또는 `.docs/planning/*.md`): 전체 페이즈 정의, 아키텍처, 상세 요구사항 확인
   - **[Secondary]** `.docs/sitemap/**/*.md`: UI 구조 및 라우팅 설계 일치 여부
   - **[Tracking]** `.docs/project-blueprint.md`: 현재 진행률 및 Priority 항목 확인
2. **코드 분석**:
   - 구현된 소스 코드 트리 확인
   - `/apps` 또는 `/admin` 등 영역별 코드 파악

---

### 2️⃣ 영역별 심층 검사

#### 🔍 기획 및 기능 준수 (Architect)
- [ ] **기획서(Planning Doc)**의 Phase별 마일스톤 및 요구사항이 실제로 구현되었는가?
- [ ] Sitemap의 구조와 실제 라우팅이 일치하는가?
- [ ] 비즈니스 로직의 예외 상황 처리(Edge cases)가 기획서의 설계대로 반영되었는가?

#### 🎨 UI/UX 디자인 준수 (UI Developer)
- [ ] `.agent/skills/ui-gen/SKILL.md`의 **Glassmorphism 가이드**를 준수했는가?
- [ ] Admin 페이지의 경우 **글로벌 CSS 클래스**(`.admin-filter-btn` 등)를 사용했는가?
- [ ] 색상, 패딩, 폰트 크기가 하드코딩되지 않고 CSS 변수를 사용했는가?
- [ ] 모바일(apps) / 데스크탑(admin) 반응형 레이아웃이 적절한가?

#### 🛡️ 데이터베이스 및 보안 (Senior Dev)
- [ ] 새로운 테이블에 대한 **RLS(Row Level Security)** 정책이 안전하게 설정되었는가?
- [ ] `database-reference.md`에 변경 사항이 적절히 반영되었는가?
- [ ] Client Side에서 `service_role` 키를 사용하는 위험한 코드가 없는가?
- [ ] 모든 API 호출에 적절한 권한 검증이 포함되어 있는가?

#### 💻 코드 품질 (Developer)
- [ ] `npm run build`가 에러 없이 통과되는가?
- [ ] TypeScript `any` 타입을 사용하지 않았는가?
- [ ] 컴포넌트가 적절히 분리되어 재사용 가능한가?
- [ ] 로그나 디버깅 코드가 제거되었는가?

---

### 3️⃣ 감사 보고서 생성
**담당**: 💻 **Developer**

검사 결과를 바탕으로 보고서를 작성하여 `.docs/audit/` 폴더에 저장합니다.

1. **파일 명명 규칙**: `.docs/audit/audit-report-YYYYMMDD-HHMM.md`
2. **보고서 포함 내용**:
   - **Audit Summary**: 전체 합격/불합격/보완필요 상태
   - **Compliance Score**: 각 영역별 점수 (1-5)
   - **High-Risk Issues**: 즉시 수정이 필요한 보안/기능 결함
   - **UI/UX Feedback**: 디자인 개선 및 표준 준수 제언
   - **Technical Debt**: 리팩토링이 필요한 부분
   - **Recommendations**: 향후 개선 방향

---

### 4️⃣ 조치 사항 등록
**담당**: 🏛️ **Architect**

보고서에서 발견된 결함이나 보완 사항을 추적 가능하도록 등록합니다.

1. **Blueprint 업데이트**: 발견된 이슈를 `Known Issues` 또는 새로운 `Priority`로 등록
2. **수정 작업 할당**: 수정이 즉시 필요한 경우 다음 Phase로 할당

---

## ✅ 감사 체크리스트 (Audit Points)

| 구분 | 체크 항목 | 비고 |
|:---|:---|:---|
| **기획** | 기능 누락 없음, Sitemap 일치 | |
| **UI** | Glassmorphism, Admin Global Classes | ui-gen skill 참조 |
| **보안** | RLS 설정, Key 노출 없음 | security docs 참조 |
| **품질** | No `any`, Build OK, Zod Validation | |
| **문서** | Blueprint/Sitemap/DB-Ref 동기화 | |

---

## 🔗 관련 문서
- `/develop` — 개발 실행 워크플로우
- `/sync-docs` — 문서 동기화 워크플로우
- `.agent/skills/ui-gen/SKILL.md` — UI 표준 가이드
- `.docs/database-reference.md` — DB 스키마 참조
