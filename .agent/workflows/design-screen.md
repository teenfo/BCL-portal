---
description: Stitch MCP를 이용한 화면 디자인 생성 워크플로우입니다.
---

# Design Screen with Stitch MCP Workflow

화면 또는 기능 추가 시, Sitemap 갱신 후 Stitch MCP를 이용하여 디자인을 먼저 생성하고, 이를 기준으로 UI/UX 개발을 진행하는 표준 워크플로우입니다.

---

## 🤖 멀티에이전트 배분

| 단계 | 담당 에이전트 | 모델 | 핵심 역할 |
|:-----|:------------|:-----|:---------|
| 1. Sitemap 갱신 | **Architect** | Opus 4.6 (Thinking) | 화면 구조 설계, 영향 분석 |
| 2. 기존 프롬프트 참조 | **UI Developer** | Gemini 3 Flash | 컨텍스트 최대 로드, 패턴 파악 |
| 3. 프롬프트 작성 | **UI Developer** | Gemini 3 Flash | 일관성 있는 프롬프트 작성 |
| 4. Stitch 화면 생성 | **UI Developer** | Gemini 3 Flash | MCP 도구 실행 |
| 5. Screen ID 매핑 | **UI Developer** | Gemini 3 Flash | Sitemap 추적성 확보 |
| 6. 디자인 검토 | **Architect** | Opus 4.6 (Thinking) | 일관성 검증, 승인 |
| 7. 프롬프트 저장 | **UI Developer** | Gemini 3 Flash | 재사용 가능한 형태로 보관 |
| 8. UI 구현 | **UI Developer** | Gemini 3 Flash | 디자인 기반 코드 구현 |

---

## 🎯 목적
- **디자인 일관성**: 모든 화면이 동일한 디자인 시스템을 따르도록 보장
- **효율성**: 코드 작성 전 디자인을 확정하여 재작업 최소화
- **협업**: 디자인-개발 간 명확한 커뮤니케이션 기준 제공

---

## 📋 사전 준비

### Stitch MCP 프로젝트 정보
- **Project ID**: `432557053076320380`
- **Project Name**: BCL Portal
- **Design Theme**:
  - Color Mode: Dark (기본)
  - Font: Lexend
  - Roundness: 8px
  - Primary Color: #ff6a00
  - Saturation: 2

---

## 🔄 단계별 절차

### 1️⃣ Sitemap 갱신 (필수)
**담당**: 🏛️ **Architect (Opus 4.6 Thinking)**

**목적**: 새로운 화면/기능을 기획 문서에 먼저 정의

**Architect가 수행할 것**:
- `.docs/sitemap/README.md` 및 해당 모듈 파일 수정
- 화면 경로, 메뉴명, 주요 기능, 데이터 요구사항 정의
- **기존 아키텍처와의 충돌 여부 분석** (Thinking 모드 활용)
- **기본 기능(로그인, 화면 표시, 링크 이동)에 미치는 영향 분석**

**확인**:
- [ ] 라우트 경로 정의됨 (예: `/apps/schedule` 또는 `/admin/members`)
- [ ] 화면 목적 및 주요 기능 명시됨
- [ ] 데이터 요구사항 정의됨
- [ ] 기본 기능 영향 없음 확인됨

> ⚠️ **중요**: 이 단계가 완료되기 전에는 다음 단계로 진행하지 않습니다.

---

### 2️⃣ 기존 디자인 프롬프트 참조
**담당**: 🎨 **UI Developer (Gemini 3 Flash)**

**목적**: 디자인 일관성을 유지하기 위해 기존 화면의 생성 프롬프트 참조

**UI Developer가 수행할 것 (Gemini 컨텍스트 최대 활용)**:
1. `.docs/stitch-prompts/README.md`에서 유사한 영역의 화면 찾기
   - 사용자 화면(`apps/*`) vs 관리자 화면(`admin/*`)
   - 유사한 기능/레이아웃 (리스트, 상세, 폼 등)

2. 해당 화면의 프롬프트 파일 **전체** 읽기 (Gemini 대형 컨텍스트 활용)
   - `.docs/stitch-prompts/apps/*.md` 또는
   - `.docs/stitch-prompts/admin/*.md`

3. 공통 요소 파악:
   - 디자인 톤앤매너
   - 레이아웃 패턴
   - 컴포넌트 스타일
   - 인터랙션 패턴

**확인**:
- [ ] 동일 영역(apps/admin)의 기존 프롬프트 확인
- [ ] 공통 디자인 요소 추출

---

### 3️⃣ Stitch 화면 생성 프롬프트 작성
**담당**: 🎨 **UI Developer (Gemini 3 Flash)**

**목적**: 일관된 디자인의 화면을 생성하기 위한 프롬프트 작성

**프롬프트 구조**:
```markdown
## 화면 정보
- 화면명: [화면 이름]
- 경로: [라우트 경로]
- Device Type: [MOBILE/DESKTOP/TABLET]
- 목적: [화면의 주요 목적]

## 디자인 테마 (고정)
- Color Mode: DARK
- Font: Lexend
- Roundness: 8px (ROUND_EIGHT)
- Primary Color: #ff6a00
- Saturation: 2

## 레이아웃 및 주요 기능
[기존 프롬프트의 패턴을 참조하여 작성]
- 네비게이션: [Bottom Tab / Sidebar]
- 주요 섹션:
  1. [섹션 1 설명]
  2. [섹션 2 설명]
  ...

## 디자인 세부사항
- [컴포넌트별 상세 디자인 설명]
- [인터랙션 및 애니메이션 요구사항]
- [데이터 표시 방식]

## 일관성 유지 요소 (기존 화면 참조)
- [기존 화면과 공통으로 유지해야 할 디자인 요소]
```

**확인**:
- [ ] 디자인 테마 정보 포함
- [ ] 기존 화면과의 일관성 고려
- [ ] 주요 기능 및 레이아웃 명시

---

### 4️⃣ Stitch MCP로 화면 생성
**담당**: 🎨 **UI Developer (Gemini 3 Flash)**

**목적**: 프롬프트를 사용하여 실제 디자인 생성

**작업**:
```javascript
// 화면 생성
const result = await mcp_StitchMCP_generate_screen_from_text({
  projectId: "432557053076320380",
  prompt: "[3단계에서 작성한 프롬프트]",
  deviceType: "MOBILE" // 또는 DESKTOP, TABLET
});

// 생성된 Screen ID 저장
const screenId = result.screen_id;
```

**확인**:
- [ ] 화면 생성 성공
- [ ] Screen ID 획득

---

### 5️⃣ Sitemap에 Screen ID 매핑
**담당**: 🎨 **UI Developer (Gemini 3 Flash)**

**목적**: 화면 기획과 디자인을 연결하여 추적 가능하게 함

**작업**:
- Sitemap 문서에 Screen ID 추가

**예시**:
```markdown
## 사용자 - 예약 화면

### 기본 정보
- **경로**: `/apps/reservations`
- **Stitch Screen ID**: `abc123def456...`
- **Device Type**: Mobile
- **생성일**: 2026-02-18

### 기능 설명
...
```

**확인**:
- [ ] Sitemap에 Screen ID 기록됨
- [ ] 화면 정보와 디자인이 연결됨

---

### 6️⃣ 디자인 검토 및 승인
**담당**: 🏛️ **Architect (Opus 4.6 Thinking)**

**목적**: 생성된 디자인이 요구사항과 아키텍처를 충족하는지 확인

**Architect가 수행할 것**:
- 디자인이 Sitemap 요구사항 충족하는지 확인
- 기존 화면과의 일관성 유지 확인
- 디자인 시스템 (Glassmorphism, BCL Orange, Lexend) 준수 확인
- 필요시 수정 요청

```javascript
// 생성된 화면 확인
const screen = await mcp_StitchMCP_get_screen({
  projectId: "432557053076320380",
  screenId: "[5단계의 Screen ID]",
  name: "projects/432557053076320380/screens/[screenId]"
});

// 필요시 수정 (UI Developer가 수행)
const editResult = await mcp_StitchMCP_edit_screens({
  projectId: "432557053076320380",
  selectedScreenIds: ["[screenId]"],
  prompt: "[수정 요청 프롬프트]"
});
```

**확인**:
- [ ] 디자인이 Sitemap 요구사항 충족
- [ ] 기존 화면과의 일관성 유지
- [ ] Architect 승인 완료

---

### 7️⃣ 생성 프롬프트 저장
**담당**: 🎨 **UI Developer (Gemini 3 Flash)**

**목적**: 향후 유사 화면 생성 시 참조할 수 있도록 프롬프트 보관

**작업**:
- `.docs/stitch-prompts/` 디렉토리에 프롬프트 저장
  - 사용자 화면: `.docs/stitch-prompts/apps/[화면명].md`
  - 관리자 화면: `.docs/stitch-prompts/admin/[화면명].md`

**파일 내용**:
```markdown
# [화면명] Stitch 생성 프롬프트

## 메타데이터
- **Screen ID**: [생성된 Screen ID]
- **생성일**: [날짜]
- **Device Type**: [MOBILE/DESKTOP/TABLET]
- **경로**: [라우트 경로]

## 생성 프롬프트
[3단계에서 작성한 완전한 프롬프트]

## 생성 결과
- **상태**: 성공
- **수정 횟수**: [횟수]
- **최종 확정일**: [날짜]
```

**확인**:
- [ ] 프롬프트 파일 생성됨
- [ ] Screen ID 및 메타데이터 포함
- [ ] 재사용 가능한 형태로 저장됨

---

### 8️⃣ UI/UX 개발 진행
**담당**: 🎨 **UI Developer (Gemini 3 Flash)**  
**검증**: 💻 **Developer (Sonnet 4.6)**

**목적**: 확정된 디자인을 기준으로 실제 코드 구현

**UI Developer가 수행할 것**:
1. 구현 전 기존 동일 영역 페이지 코드 **전체** 로드 (Gemini 컨텍스트 활용)
2. Stitch 디자인을 참조하여 React 컴포넌트 구현
3. `ui-gen` 스킬을 사용하여 Glassmorphism 스타일 적용
4. 글로벌 CSS 클래스 사용 (`admin-filter-btn`, `admin-search-input`, `admin-action-btn`)
5. 반응형 디자인 구현 (Stitch는 고정 크기지만 실제는 반응형)
6. **자체 검증 체크리스트 확인** (인라인 스타일, any 타입, 하드코딩 색상)

**Developer (Sonnet)가 검증할 것**:
- 글로벌 CSS 클래스 준수 여부
- TypeScript `any` 타입 사용 여부
- 하드코딩 색상/간격 여부
- 기본 기능 회귀 테스트 (로그인, 화면 표시, 링크 이동)

**확인**:
- [ ] 디자인 컨셉 준수
- [ ] Glassmorphism 스타일 적용
- [ ] 글로벌 CSS 클래스 사용 (인라인 스타일 없음)
- [ ] TypeScript `any` 타입 없음
- [ ] 반응형 디자인 구현
- [ ] Developer 품질 검증 통과
- [ ] 성능 최적화 (60fps, Lighthouse > 90)

---

## 🎨 프롬프트 작성 가이드

### 사용자 화면 (apps/*) 프롬프트 패턴
```
모바일 퍼스트 디자인으로, [화면명]을 생성해주세요.

**디자인 테마**:
- Dark Mode, Lexend 폰트, 8px Roundness
- Primary Color: #ff6a00
- Glassmorphism 스타일

**레이아웃**:
- 상단: [헤더 설명]
- 메인: [주요 콘텐츠 설명]
- 하단: Bottom Tab Navigation (Home, Schedule, Check-in, Facilities, Profile)

**주요 기능**:
1. [기능 1]
2. [기능 2]

**기존 화면과의 일관성**:
- [참조 화면명]의 [특정 패턴] 유지
```

### 관리자 화면 (admin/*) 프롬프트 패턴
```
Desktop 기반 관리자 화면으로, [화면명]을 생성해주세요.

**디자인 테마**:
- Dark Mode, Lexend 폰트, 8px Roundness
- Primary Color: #ff6a00
- Glassmorphism 스타일

**레이아웃**:
- 좌측: Sidebar Navigation (sitemap 구조 반영)
- 메인: [주요 콘텐츠 설명]
  - 필터/검색 영역
  - 데이터 테이블/차트
  - 액션 버튼

**주요 기능**:
1. [기능 1]
2. [기능 2]

**기존 화면과의 일관성**:
- [참조 화면명]의 [특정 패턴] 유지
```

---

## 📁 파일 구조

```
.docs/
├── sitemap/
│   ├── README.md (Screen ID 매핑 포함)
│   ├── apps/
│   │   └── *.md (각 화면에 Screen ID 포함)
│   └── admin/
│       └── *.md (각 화면에 Screen ID 포함)
└── stitch-prompts/
    ├── README.md (인덱스)
    ├── apps/
    │   ├── home.md
    │   ├── schedule.md
    │   └── ...
    └── admin/
        ├── dashboard.md
        ├── members.md
        └── ...
```

---

## ⚠️ 주의사항

### 필수 규칙
1. **Sitemap 우선 (Architect)**: 반드시 Architect가 Sitemap 갱신 후 디자인 생성
2. **기존 프롬프트 참조 (UI Developer)**: 일관성을 위해 동일 영역의 기존 프롬프트 참조
3. **프롬프트 저장 (UI Developer)**: 생성에 사용한 프롬프트는 반드시 저장
4. **Screen ID 매핑 (UI Developer)**: Sitemap에 Screen ID 기록 필수
5. **Architect 승인 (Architect)**: 디자인 확정 전 반드시 검토

### 디자인 원칙
- **컨셉 중심**: Pixel-perfect 아님, 디자인 컨셉과 패턴 중심
- **Glassmorphism**: Stitch + ui-gen 스킬 결합
- **반응형**: Stitch는 고정 크기지만 실제 구현은 반응형
- **성능**: 60fps, Lighthouse > 90 목표

---

## 🔗 관련 문서
- `.antigravity/agents/ui-developer.md` - UI Developer 역할 및 제약
- `.antigravity/agents/architect.md` - Architect 역할 및 설계 원칙
- `.agent/skills/ui-gen/SKILL.md` - Glassmorphism UI 스킬
- `.agent/workflows/add-page.md` - 페이지 추가 워크플로우
- `.docs/sitemap/README.md` - Sitemap SSOT
