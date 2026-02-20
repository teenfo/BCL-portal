---
description: 새로운 화면(Route)을 추가할 때 따르는 표준 워크플로우입니다.
---

# New Page Addition Workflow

이 워크플로우는 프로젝트의 규칙(Sitemap SSOT)을 준수하며 새로운 기능을 안전하게 추가하는 절차를 정의합니다.

> 📌 **`/develop`와의 관계**: 이 워크플로우는 `/develop`의 **간소화 버전**입니다.
> - **블루프린트에 Priority로 등록된 대규모 기능** → `/develop` 사용
> - **단발성 페이지 추가 또는 기존 Priority 내 세부 페이지 추가** → `/add-page` 사용
> - `/add-page`는 `/develop`의 Phase 실행 가이드를 1페이지 단위로 축약한 것입니다.

---

## 🤖 관점별 역할 및 권장 모델

### 1️⃣ Sitemap 수정
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High — 1M 컨텍스트로 전체 구조 파악)

- `.docs/sitemap/README.md` 및 해당 모듈 파일(`.docs/sitemap/**/*.md`)을 열어 새로운 메뉴/라우트의 위치와 상세 기능을 정의합니다.
- **수행할 것**:
  - 기존 아키텍처와의 충돌 여부 분석
  - 기본 기능(로그인, 화면 표시, 링크 이동)에 미치는 영향 분석
  - 라우트 경로, 권한 정책, 데이터 요구사항 정의

> ⚠️ **이 단계가 완료되기 전에는 코드를 작성하지 않습니다.**

---

### 2️⃣ Database 설계 (필요 시)
**관점**: 💎 **Senior Dev** (권장: Claude Opus 4.6 — 최고 정밀도로 보안/DB 설계)

- 새로운 데이터가 필요한 경우 `db-migration` 스킬을 사용하여 마이그레이션 SQL을 작성하고 적용합니다.
- **수행할 것**:
  - 테이블 스키마 설계 (미래 확장성 고려)
  - RLS 정책 설계 및 구현
  - 인덱스 전략 수립
  - Architect 관점 검토 후 적용

---

### 3️⃣ Stitch 디자인 생성
**관점**: 🎨 **UI Developer** (권장: Gemini 3 Pro Low — 1M 컨텍스트로 기존 프롬프트 전체 로드)

- `/design-screen` 워크플로우를 따라 Stitch MCP로 화면 디자인을 먼저 생성합니다.
- **수행할 것**:
  - `.docs/stitch-prompts/` 기존 프롬프트 참조 (컨텍스트 최대 로드)
  - Stitch 화면 생성 (`mcp_StitchMCP_generate_screen_from_text`)
  - Screen ID → Sitemap 매핑
  - 프롬프트 저장 (`.docs/stitch-prompts/`)

> ⚠️ **디자인 없이 UI 코드를 작성하지 않습니다.**

---

### 4️⃣ Page UI 구현
**관점**: 🎨 **UI Developer** (권장: Gemini 3 Pro Low)

- 사용자(`apps/*`) 또는 관리자(`admin/*`) 경로에 `page.tsx`를 생성합니다.
- **수행할 것**:
  - 구현 전 기존 동일 영역 페이지 코드 전체 로드 (컨텍스트 활용)
  - `ui-gen` 스킬의 Glassmorphism 가이드 준수
  - 글로벌 CSS 클래스 사용 (`admin-filter-btn`, `admin-search-input`, `admin-action-btn`)
  - CSS 변수 사용 (하드코딩 금지)
  - 구현 후 자체 검증 체크리스트 확인

---

### 5️⃣ API 구현
**관점**: 💻 **Developer** (권장: Claude Sonnet 4.6 — 빠른 코딩 + 정확도 균형)

- 필요한 API 라우트 및 비즈니스 로직을 구현합니다.
- **수행할 것**:
  - Next.js API Routes 구현
  - Zod 입력 검증
  - Supabase 쿼리 최적화
  - 에러 핸들링 표준화

---

### 6️⃣ 레이아웃/네비게이션 연결
**관점**: 🎨 **UI Developer** (권장: Gemini 3 Pro Low)

- `layout.tsx`의 네비게이션 배열에 새 페이지를 추가하여 사용자가 진입할 수 있게 합니다.
- **수행할 것**:
  - Bottom Tab (apps) 또는 Sidebar (admin) 메뉴 추가
  - 링크 경로 정확성 확인
  - 아이콘 및 레이블 추가

---

### 7️⃣ 리뷰 & QA
**관점**: 💻 **Developer** (권장: Claude Sonnet 4.6)

- 구현된 기능의 품질을 검증합니다.
- **수행할 것**:
  - **UI 코드 품질 검증**:
    - 글로벌 CSS 클래스 준수 여부
    - TypeScript `any` 타입 사용 여부
    - 하드코딩 색상/간격 여부
  - **기본 기능 회귀 테스트**:
    - 로그인/로그아웃 정상 동작
    - 새 페이지 정상 렌더링
    - 모든 내비게이션 링크 정상 동작
    - 인증 상태별 접근 제어 정상
  - 단위/통합 테스트 작성
  - 기획 문서(Sitemap) 최종 갱신 (코드와 문서 동기화)

---

### 8️⃣ 최종 승인 및 커밋
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High) → `commit-bot` 스킬

- **수행할 것**:
  - 아키텍처 일관성 확인
  - 보안 정책 준수 확인
  - 기본 기능 영향 없음 최종 확인
  - 배포 승인
- 승인 후 `commit-bot` 스킬을 사용하여 변경 사항을 커밋합니다.

---

## ✅ 전체 체크리스트

### 🏛️ Architect 관점 (권장: Gemini 3 Pro High)
- [ ] Sitemap에 화면 정의됨
- [ ] 기존 아키텍처와 충돌 없음
- [ ] 기본 기능 영향 분석 완료
- [ ] 최종 승인 완료

### 💎 Senior Dev 관점 (권장: Claude Opus 4.6)
- [ ] DB 스키마 설계 완료 (필요시)
- [ ] RLS 정책 구현 완료 (필요시)
- [ ] 마이그레이션 적용 완료 (필요시)

### 🎨 UI Developer 관점 (권장: Gemini 3 Pro Low)
- [ ] Stitch 디자인 생성 완료
- [ ] Screen ID Sitemap 매핑 완료
- [ ] 프롬프트 저장 완료
- [ ] 글로벌 CSS 클래스 사용 확인
- [ ] CSS 변수 사용 확인 (하드코딩 없음)
- [ ] 자체 검증 체크리스트 통과
- [ ] 네비게이션 연결 완료

### 💻 Developer 관점 (권장: Claude Sonnet 4.6)
- [ ] API 구현 완료
- [ ] UI 코드 품질 검증 완료
- [ ] 기본 기능 회귀 테스트 통과
- [ ] 테스트 코드 작성 완료
- [ ] Sitemap 문서 동기화 완료
