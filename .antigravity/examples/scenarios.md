# Antigravity Multi-Agent Development Scenarios

이 문서는 Antigravity 협업 체계가 실제 기능 개발 및 유지보수 과정에서 어떻게 작동하는지에 대한 구체적인 시나리오를 설명합니다.

**에이전트**: Architect (Opus), Senior Dev (Opus), Developer (Sonnet), UI Developer (Gemini), Specialist (Gemini)

---

## 시나리오 1: 멤버십 구매 기능 개발 (Finance/App)

복잡한 트랜잭션과 보안이 중요한 결제 프로세스에서의 협업 사례입니다.

### 1단계: Architect (Opus 4.6 Thinking) - Architecture Review
- **Task**: 멤버십 구매 흐름 설계
- **Context**: 
  - `.docs/sitemap/user-app.md` (Section 6)
  - `.docs/database/schema/001_initial_schema.sql`
  - `.docs/security/README.md`
- **Deliverables**:
  - API 엔드포인트 설계
  - DB 스키마 정합성 검증
  - 결제 연동 아키텍처 제안
  - 보안 고려사항 문서화

### 2단계: UI Developer (Gemini 3 Flash) + Senior Dev (Opus 4.6 Thinking) - Implementation
- **UI Developer Task**: 멤버십 구매 UI 구현
  - `/apps/purchase` 페이지 (UI)
  - 폼 레이아웃 및 인터랙션
  - 반응형 디자인
- **Senior Dev Task**: 결제 비즈니스 로직 구현
  - API Route `/api/memberships/purchase` (Logic)
  - 폼 검증 (Zod) 및 에러 핸들링
  - 트랜잭션 관리

### 3단계: Developer (Sonnet 4.6) - Testing & Verification
- **Task**: 멤버십 구매 기능 테스트 및 검증
- **Actions**:
  - 통합 테스트 코드 작성
  - 결제 데이터가 클라이언트에 노출되지 않는가?
  - RLS 정책이 올바른가?
  - 모든 에러 케이스를 처리했는가?
  - 데이터베이스 트랜잭션의 원자성이 보장되는가?
  - 사용성 검토 및 문서 작성

### 4단계: Architect (Opus 4.6 Thinking) - Final Review
- **Task**: 구현 결과물의 최종 검토 및 승인
- **Verification**:
  - 아키텍처 일관성 확인
  - 보안 정책 준수 확인
  - 배포 승인

---

## 시나리오 2: 클래스 타이머 개발 (Real-time/IoT)

실시간 동기화와 퍼포먼스가 중요한 프론트엔드 특화 기능에서의 협업 사례입니다.

### 1단계: Architect (Opus 4.6 Thinking) - Requirements
- **Task**: 실시간 타이머 성능 요구사항 정의
- **Deliverables**:
  - 성능 목표 (60fps, <100ms latency)
  - 실시간 아키텍처 설계

### 2단계: UI Developer (Gemini 3 Flash) + Specialist (Gemini 3 Flash) - Implementation
- **UI Developer Task**: 타이머 UI 컴포넌트 구현
  - 다양한 모드(WOD, EMOM, AMRAP 등) UI
  - 부드러운 애니메이션 및 시각 효과
  - 대형 화면 최적화
- **Specialist Task**: 실시간 로직 구현
  - Supabase Realtime을 통한 실시간 싱크 연동
  - 코치 앱에서의 원격 제어 기능
  - 연결 재시도 및 에러 핸들링

### 3단계: Developer (Sonnet 4.6) - Performance Testing
- **Task**: 타이머 성능 벤치마크 및 검증
- **Actions**:
  - Lighthouse 측정
  - FPS 벤치마크
  - 실시간 구독 해제 검증 (메모리 누수 방지)
  - 연결 유실 시 에러 핸들링 검증
  - 원격 제어 보안 검증

### 4단계: Architect (Opus 4.6 Thinking) - Verification
- **Task**: 최종 성능 목표 달성 확인 및 승인

---

## 시나리오 3: 관리자 대시보드 리뉴얼 (Standard Feature)

일반적인 CRUD 기능의 UI 리뉴얼 사례입니다.

### 1단계: Architect (Opus 4.6 Thinking) - Guide
- **Task**: 대시보드 리뉴얼 가이드 제공
- **Actions**: Stitch 디자인 검토, 기존 패턴 확인

### 2단계: UI Developer (Gemini 3 Flash) - UI Implementation
- **Task**: 대시보드 UI 구현
- **Actions**: 
  - Stitch 디자인 참조
  - Glassmorphism 카드 레이아웃
  - 반응형 차트 구현

### 3단계: Developer (Sonnet 4.6) - API + Testing
- **Task**: 대시보드 데이터 API 및 테스트
- **Actions**:
  - API 엔드포인트 구현
  - 데이터 집계 로직
  - 통합 테스트 작성
  - UI/UX 사용성 검증

---

**Last Updated**: 2026-02-18  
**Version**: 3.0
