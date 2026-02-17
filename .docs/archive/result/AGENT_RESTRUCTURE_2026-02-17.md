# Agent 역할 재정의 (2026-02-17)

BCL Portal 프로젝트의 agent 역할이 재구성되었습니다.

## 🔄 주요 변경사항

### UI 개발 담당 변경
**Before** ❌:
- Developer (Sonnet 4.5): UI + API 통합 개발

**After** ✅:
- **UI Developer (Gemini 3.0 Flash)**: 모든 UI/UX 개발
- **Developer (Sonnet 4.5)**: Backend API + 비즈니스 로직

---

## 👥 새로운 Agent 구성

### 1. **Architect** (Opus 4.6 Thinking)
- **역할**: System Architect
- **담당**: 최종 설계 검증, 아키텍처 결정, 시스템 조율
- **Stitch**: ✅ 접근 가능

### 2. **Senior Developer** (Opus 4.5 Thinking)
- **역할**: Senior Backend Developer
- **담당**: 복잡한 비즈니스 로직, 결제/재무, 보안 구현
- **모듈**: `/admin/finance`, critical business logic

### 3. **Developer** (Sonnet 4.5 Thinking) 🔄 변경
- **역할**: Backend Developer
- **담당**: API 개발, 비즈니스 로직, 데이터 통합, 서버 로직
- **모듈**: `/api/routes`, backend services
- **Stitch**: ❌ (UI 담당 아님)

### 4. **UI Developer** (Gemini 3.0 Flash) ⭐ 신규
- **역할**: UI/UX Frontend Developer
- **담당**: **모든 UI 개발** (User, Admin, Coach, Display, Kiosk)
- **모듈**: `/apps`, `/admin/*`, `/coach`, `/class`, `/kiosk`
- **Stitch**: ✅ Primary 접근 (Design System `95b2195d8ffb4e99af97d0da938f24ff`)
- **문서**: `.antigravity/agents/ui-developer.md`

### 5. **Specialist** (Gemini 3.0 Flash)
- **역할**: Performance Specialist
- **담당**: 실시간 최적화, WebSocket, 카메라/하드웨어 통합
- **협업**: UI Developer와 함께 작업 (`/class`, `/kiosk`)

### 6. **QA** (GPT OSS)
- **역할**: QA Engineer
- **담당**: 테스트 작성, 품질 검증, 문서화
- **Stitch**: ✅ 디자인 검증용

---

## 📊 모듈별 담당자 변경

| 모듈 | Before | After |
|------|--------|-------|
| **User App** (`/apps`) | Sonnet 4.5 | **Gemini 3.0 (UI)** + Sonnet (Backend) |
| **Admin Portal** (`/admin/*`) | Sonnet 4.5 | **Gemini 3.0 (UI)** + Sonnet (Backend) |
| **Admin Finance** | Opus 4.5 | **Gemini 3.0 (UI)** + Opus 4.5 (Backend) |
| **Coach App** (`/coach`) | Sonnet 4.5 | **Gemini 3.0 (UI)** + Sonnet (Backend) |
| **Class Display** (`/class`) | Gemini 3.0 | **Gemini 3.0 (UI + 성능)** |
| **Kiosk** (`/kiosk`) | Gemini 3.0 | **Gemini 3.0 (UI + 하드웨어)** |
| **API Routes** | Sonnet 4.5 | **Sonnet 4.5 (Backend)** |
| **Database** | Opus 4.5 | **Opus 4.5 (스키마)** |

---

## 🎯 변경 이유

### 1. **Gemini 3.0 Flash의 UI 개발 강점**
- ✅ 빠른 응답 속도 → 빠른 UI 개발
- ✅ 비용 효율적 → 반복적인 UI 작업에 최적
- ✅ 실시간 인터랙션 강점 → 애니메이션, UX
- ✅ 이미 Stitch 접근 권한 보유

### 2. **명확한 역할 분리**
- **UI Developer (Gemini)**: 프론트엔드 전담
- **Developer (Sonnet)**: 백엔드/로직 전담
- **협업 포인트**: API contract, TypeScript types

### 3. **일관성 향상**
- 하나의 agent(Gemini)가 모든 UI 담당
- 디자인 시스템 일관성 유지
- Glassmorphism 스타일 통일

---

## 🚀 새로운 워크플로우

### UI 기능 개발 (`feature-ui`)
1. **Architect**: 디자인 검토
2. **UI Developer (Gemini)**: UI 구현
3. **QA**: 테스트
4. **Architect**: 최종 승인

### 통합 기능 개발 (`feature-standard`)
1. **Architect**: 설계
2. **Developer (Sonnet)**: Backend API 개발
3. **UI Developer (Gemini)**: Frontend 개발
4. **QA**: 통합 테스트
5. **Architect**: 최종 검토

### 실시간 기능 개발 (`feature-realtime`)
1. **Architect**: 설계
2. **UI Developer (Gemini)**: UI 구현
3. **Specialist (Gemini)**: 성능 최적화
4. **QA**: 테스트
5. **Architect**: 승인

---

## 📝 업데이트된 문서

### Config Files
- ✅ `.antigravity/config.json` - Agent 정의 업데이트
- ✅ `.antigravity/module-assignments.json` - 모듈별 담당자 재할당

### Agent Guides
- ✅ `.antigravity/agents/ui-developer.md` - 신규 생성
- ✅ `.antigravity/agents/developer.md` - Backend 포커스로 업데이트
- ⚠️ `.antigravity/agents/specialist.md` - 검토 필요

### Workflows
- ✅ `feature-ui` - 신규 워크플로우 추가
- ✅ `bugfix-ui` - 신규 워크플로우 추가
- ✅ `feature-realtime` - Gemini 협업 구조로 수정

---

## 💡 영향

### 긍정적 영향 ✅
1. **빠른 UI 개발**: Gemini의 빠른 응답
2. **비용 절감**: UI 작업에 Gemini 활용
3. **일관성 향상**: 단일 agent의 UI 담당
4. **명확한 책임**: UI vs Backend 명확히 분리

### 주의사항 ⚠️
1. **Gemini 한계 인지**: 복잡한 로직은 Sonnet/Opus로
2. **API Contract 중요**: UI-Backend 인터페이스 명확히
3. **코드 리뷰 강화**: Architect의 검토 필수

---

**변경일**: 2026-02-17  
**승인자**: Project Lead  
**적용 범위**: 즉시 적용
