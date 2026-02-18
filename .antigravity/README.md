# Antigravity Multi-Agent Development System v3.0

BCL Portal은 **3종 AI 모델 기반 5명의 전문 에이전트**가 협업하여 개발하는 통합 플랫폼입니다.

---

## 🤖 사용 가능 모델

| 모델 | 특성 | Config ID |
|:-----|:-----|:----------|
| **Claude Opus 4.6 (Thinking)** | 최고 수준의 추론력, 깊은 사고, 복잡한 문제 해결 | `claude-opus-4.6-thinking` |
| **Claude Sonnet 4.6** | 균형잡힌 속도와 품질, 코드 생성·분석·테스트 | `claude-sonnet-4.6` |
| **Gemini 3 Flash** | 초고속 응답, 실시간 처리, UI/프론트엔드 특화 | `gemini-3-flash` |

---

## 🎨 UI/UX 디자인 참조 (StitchMCP)

BCL Portal의 모든 UI 개발은 **StitchMCP의 bcl-portal 프로젝트**를 참조합니다.

### 프로젝트 정보
- **Project ID**: `432557053076320380`
- **Project Name**: BCL Portal
- **Design Theme**:
  - **Color Mode**: Dark (기본)
  - **Font**: Lexend
  - **Roundness**: 8px (ROUND_EIGHT)
  - **Custom Color**: #ff6a00 (Primary accent)
  - **Saturation**: 2

### 에이전트별 활용
| 에이전트 | 활용 목적 |
|:---------|:----------|
| **Architect** | 디자인 시스템 아키텍처 설계, UI 패턴 일관성 검증 |
| **UI Developer** | UI 컴포넌트 구현 시 디자인 참조, 레이아웃 구현 |
| **Specialist** | 인터랙티브 UI, 애니메이션, 전환 효과 참조 |
| **Developer** | 디자인 일관성 검증, 사용성 테스트 (QA 포함) |

### 참조 원칙
1. **컨셉 중심**: Pixel-perfect 구현이 아닌 디자인 컨셉과 레이아웃 중심
2. **Glassmorphism 적용**: Stitch 디자인 + `.agent/skills/ui-gen/SKILL.md` 가이드 결합
3. **반응형 우선**: Stitch는 고정 크기지만, 실제 구현은 반응형 필수
4. **성능 최적화**: 60fps, Lighthouse > 90 목표 유지

---

## 🤖 에이전트 팀 구성

### 1. **Architect** (Claude Opus 4.6 Thinking) 🏛️
- **역할**: System Architect & Final Decision Maker
- **전문 영역**: 전체 시스템 설계, 아키텍처 검증, 최종 승인
- **책임**:
  - 시스템 아키텍처 설계 및 검증
  - 모든 Critical/High 복잡도 작업 최종 검토
  - 기술 스택 결정 및 ADR 작성
  - 프로덕션 배포 승인
- **상세**: [agents/architect.md](./agents/architect.md)

---

### 2. **Senior Developer** (Claude Opus 4.6 Thinking) 💎
- **역할**: Senior Developer & Business Logic Expert
- **전문 영역**: 복잡한 비즈니스 로직, 결제/재무, 보안 구현
- **책임**:
  - 결제 시스템 구현 (PG 연동, 환불, 정산)
  - 멤버십 관리 로직
  - RLS 정책 상세 구현
  - 트랜잭션 관리
- **상세**: [agents/senior-developer.md](./agents/senior-developer.md)

---

### 3. **Developer** (Claude Sonnet 4.6) 💻
- **역할**: Full-Stack Developer & QA Engineer
- **전문 영역**: 일반 개발, API 구현, 테스트, 품질 검증, 문서화
- **책임**:
  - 백엔드 API (Next.js API Routes) 작성
  - Supabase 클라이언트 연동 및 데이터 통합
  - 단위/통합/E2E 테스트 작성 및 검증
  - 품질 검증, 버그 리포트, 사용성 검토
  - API 문서 및 사용자 가이드 작성
- **상세**: [agents/developer.md](./agents/developer.md)

---

### 4. **UI Developer** (Gemini 3 Flash) 🎨
- **역할**: UI/UX Frontend Developer
- **전문 영역**: 모든 화면의 UI/UX 개발, 프론트엔드 컴포넌트
- **책임**:
  - 사용자 앱 / 관리자 / 코치 / 디스플레이 / 키오스크 UI 개발
  - React/Next.js 컴포넌트 개발
  - Glassmorphism 스타일, 반응형 레이아웃
  - UX 마이크로 인터랙션 및 애니메이션
- **상세**: [agents/ui-developer.md](./agents/ui-developer.md)

---

### 5. **Specialist** (Gemini 3 Flash) ⚡
- **역할**: Performance Specialist & Real-time Expert
- **전문 영역**: 실시간 기능, 성능 최적화, 카메라/QR, 애니메이션
- **책임**:
  - Supabase Realtime 구독 구현
  - React 성능 최적화
  - 카메라/QR 코드 스캔
  - WOD 타이머, 키오스크 시스템
- **상세**: [agents/specialist.md](./agents/specialist.md)

---

## 📋 모듈별 담당자

### Critical Modules (복잡도: Critical)
| 모듈 | UI | Backend/Logic | Reviewer | 이유 |
|:-----|:---|:-------------|:---------|:-----|
| `/admin/finance` | **UI Developer** (Gemini) | **Senior Dev** (Opus) | Architect | 결제/재무 - 보안 최우선 |
| `/database` | - | **Senior Dev** (Opus) | Architect | 스키마 설계 - 아키텍처 중요 |

### High Complexity Modules (복잡도: High)
| 모듈 | UI | Backend/Logic | Reviewer | 이유 |
|:-----|:---|:-------------|:---------|:-----|
| `/admin/operations` | **UI Developer** (Gemini) | Developer (Sonnet) | Architect | 레이스 시스템 포함 |
| `/class` | **UI Developer** (Gemini) | **Specialist** (Gemini) | Architect | 실시간 타이머 - 성능 중요 |
| `/kiosk` | **UI Developer** (Gemini) | **Specialist** (Gemini) | Architect | QR 스캔 - 빠른 응답 필요 |

### Medium Complexity Modules (복잡도: Medium)
| 모듈 | UI | Backend/Logic | Reviewer |
|:-----|:---|:-------------|:---------|
| `/admin/insights` | **UI Developer** (Gemini) | Developer (Sonnet) | Architect |
| `/admin/crm` | **UI Developer** (Gemini) | Developer (Sonnet) | Senior Dev |
| `/apps` | **UI Developer** (Gemini) | Developer (Sonnet) | Architect |
| `/coach` | **UI Developer** (Gemini) | Developer (Sonnet) | Senior Dev |
| `/api/routes` | - | Developer (Sonnet) | Senior Dev |

**상세**: [module-assignments.json](./module-assignments.json)

---

## 🔄 워크플로우

**모든 기능 개발은 Stitch MCP 디자인 단계를 포함합니다.**

### Critical Feature (결제, 보안, 재무)
```
Architect (설계) → Stitch Design → Senior Dev (구현) → Developer (테스트) → Architect (승인)
```

### Standard Feature (일반 CRUD, UI)
```
Architect (가이드) → Stitch Design → UI Dev (UI) + Developer (API) → Developer (테스트) → Architect (리뷰)
```

### Real-time Feature (클래스, 키오스크)
```
Architect (요구사항) → Stitch Design → UI Dev (UI) + Specialist (실시간) → Developer (벤치마크) → Architect (검증)
```

### Bug Fix (Critical)
```
Architect (분석) → Senior Dev/Developer (수정) → Developer (검증) → Architect (승인)
```

### Bug Fix (Standard)
```
Developer (분석 & 수정 & 검증)
```

### Bug Fix (UI)
```
UI Developer (분석 & 수정) → Developer (검증)
```

### Performance Optimization
```
Specialist (최적화) → Developer (벤치마크) → Architect (검증)
```

**Stitch Design 단계**:
1. Sitemap 갱신
2. 기존 프롬프트 참조 (`.docs/stitch-prompts/`)
3. Stitch 화면 생성
4. Screen ID 매핑
5. 프롬프트 저장
6. Architect 디자인 승인

**상세**: 
- [workflows/feature-workflow.md](./workflows/feature-workflow.md) - Stitch MCP 통합 워크플로우
- [config.json](./config.json) - 에이전트 설정

**디자인 워크플로우**: `../.agent/workflows/design-screen.md`

---

## 💬 커뮤니케이션 프로토콜

### Architect로 에스컬레이션 (필수)
- 데이터베이스 스키마 대규모 변경
- 보안 정책 변경
- 새로운 아키텍처 패턴 도입
- 시스템 전반에 영향 주는 기술 결정
- 프로덕션 배포 최종 승인

### Senior Developer로 에스컬레이션 (필수)
- 결제/재무 시스템 개발
- 복잡한 비즈니스 로직 구현
- RLS 정책 상세 구현
- 트랜잭션 처리 로직

### Specialist 협업 (필수)
- 실시간 기능 필요 (Supabase Realtime)
- 카메라/QR 코드 기능
- 성능 60fps 요구사항
- 인터랙티브 애니메이션

### Developer QA 참여 (필수)
- 모든 새로운 기능 개발 후 테스트
- 버그 수정 후 검증
- 릴리즈 전 최종 테스트
- 사용성 검토 및 문서화

**상세**: [communication-protocol.md](./communication-protocol.md)

---

## ⏱️ 응답 시간 기준

| 우선순위 | Architect | Senior Dev | Developer | UI Developer | Specialist |
|:---------|:----------|:-----------|:----------|:-------------|:-----------|
| **Critical** | 30분 | 1시간 | 1시간 | 2시간 | 2시간 |
| **High** | 2시간 | 4시간 | 2시간 | 4시간 | 4시간 |
| **Medium** | 4시간 | 1일 | 4시간 | 1일 | 1일 |
| **Low** | 1일 | 2일 | 1일 | 2일 | 2일 |

---

## 📚 핵심 문서

### 에이전트 역할
- [agents/architect.md](./agents/architect.md) - Claude Opus 4.6 (Thinking)
- [agents/senior-developer.md](./agents/senior-developer.md) - Claude Opus 4.6 (Thinking)
- [agents/developer.md](./agents/developer.md) - Claude Sonnet 4.6
- [agents/ui-developer.md](./agents/ui-developer.md) - Gemini 3 Flash
- [agents/specialist.md](./agents/specialist.md) - Gemini 3 Flash

### 설정 파일
- [config.json](./config.json) - 에이전트 정의 및 워크플로우
- [module-assignments.json](./module-assignments.json) - 모듈별 담당자
- [communication-protocol.md](./communication-protocol.md) - 소통 규칙

### 운영 가이드
- [operations.md](./operations.md) - Daily standup, PR 프로세스
- [roadmap.md](./roadmap.md) - 12주 개발 로드맵
- [examples/scenarios.md](./examples/scenarios.md) - 협업 시나리오

### 프로젝트 문서
- **프로젝트 규칙**: `../.agent/rules/bcl-portal.rules.md`
- **UI 규칙**: `../.agent/rules/ui.rules.md`
- **프로젝트 블루프린트**: `../.docs/project-blueprint.md`
- **Sitemap**: `../.docs/sitemap/`
- **데이터베이스**: `../.docs/database/`

### ⚠️ 아카이브 폴더 (자동 참조 금지)
- **경로**: `../.docs/archive/**`
- **규칙**: Agent는 이 폴더를 자동으로 참조하지 않음
- **구조**:
  - `../.docs/archive/` - 초기 분석 리포트, 가이드, 기술 문서
  - `../.docs/archive/result/` - 개발 과정 결과물 (리뷰, 완료 리포트, 구현 계획)
- **참조 방법**: 사용자가 명시적으로 요청한 경우에만 참조
  - 예시: "result 폴더의 AUTH_COMPLETE.md에서 인증 구현 내역 확인해줘"
- **상세**: `../.docs/archive/README.md`, `../.docs/archive/result/README.md`

---

## 🎯 품질 기준

### Code Quality
- TypeScript: Strict mode, 0 컴파일 에러
- ESLint: 0 경고
- Test Coverage: Unit > 80%, Integration > 70%

### Performance
- Lighthouse Performance: > 90
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- 60 FPS (애니메이션)

### Security
- RLS 정책: 모든 테이블 필수
- Input Validation: 100% 커버
- Service Role Key: 클라이언트 노출 금지
- HTTPS Only

### Accessibility
- WCAG 2.1 AA 준수
- 키보드 네비게이션
- 스크린 리더 호환
- 색상 대비 충분

---

## 📊 성과 지표

### Architect (Opus 4.6 Thinking)
- Architecture Reviews: 모든 Critical/High
- Security Issues Caught: 100%
- Production Approval: 24시간 이내

### Senior Developer (Opus 4.6 Thinking)
- Complex Features: 주 1-2개
- Bug Fix (Critical): 4시간 이내
- Code Quality: 0 보안 취약점

### Developer (Sonnet 4.6)
- Standard Features: 주 3-5개
- Test Coverage: > 80%
- QA Verification: 모든 기능 검증
- Documentation: API/가이드 100% 완료

### UI Developer (Gemini 3 Flash)
- UI Features: 주 3-5 화면
- Design System 준수율: 100%
- Responsive: 모든 디바이스

### Specialist (Gemini 3 Flash)
- Real-time Features: 1일 이내
- Performance: Lighthouse > 90
- 60 FPS: 100% 달성

---

## 🚀 버전 히스토리

### v3.0 (2026-02-18)
- **GPT OSS (QA) 에이전트 제거**
- QA 역할 Developer (Sonnet 4.6)로 통합
- 모든 모델명 통일 (Claude Opus 4.6 Thinking, Claude Sonnet 4.6, Gemini 3 Flash)
- Developer 역할 재정의: Backend + QA 통합
- 5 에이전트 체계 (3개 모델 기반)
- 모듈 담당자 재배치 (UI/Backend 분리 명확화)

### v2.0 (2026-02-16)
- 5개 에이전트 체계로 확장
- Opus 4.6 Thinking (Architect) 추가
- Opus 4.6 Thinking (Senior Developer) 역할 세분화
- GPT OSS (QA) 추가
- 모듈별 복잡도 및 담당자 재배치

### v1.0 (2026-02-15)
- 3개 에이전트 체계 (Opus, Sonnet, Gemini)
- 기본 워크플로우 정의

---

**Last Updated**: 2026-02-18  
**Version**: 3.0  
**Team Size**: 5 AI Agents (3 Models)
