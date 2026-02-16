# Antigravity Multi-Agent Development Scenarios

이 문서는 Antigravity 협업 체계가 실제 기능 개발 및 유지보수 과정에서 어떻게 작동하는지에 대한 구체적인 시나리오를 설명합니다.

---

## 시나리오 1: 멤버십 구매 기능 개발 (Finance/App)

복잡한 트랜잭션과 보안이 중요한 결제 프로세스에서의 협업 사례입니다.

### 1단계: Opus (Architecture Review)
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

### 2단계: Sonnet (Implementation)
- **Task**: 멤버십 구매 UI 및 API 구현
- **Context**:
  - Opus가 작성한 아키텍처 문서
  - `.docs/sitemap/user-app.md`
  - `src/types/membership.ts`
- **Deliverables**:
  - `/apps/purchase` 페이지 (UI)
  - API Route `/api/memberships/purchase` (Logic)
  - 폼 검증 (Zod) 및 에러 핸들링
  - 통합 테스트 코드

### 3단계: Opus (Code Review)
- **Task**: 구현 결과물의 최종 검토
- **Context**:
  - Sonnet의 작성 코드
  - 보안 체크리스트
- **Verification**:
  - 결제 데이터가 클라이언트에 노출되지 않는가?
  - RLS(Row Level Security) 정책이 올바른가?
  - 모든 에러 케이스를 처리했는가?
  - 데이터베이스 트랜잭션의 원자성이 보장되는가?

---

## 시나리오 2: 클래스 타이머 개발 (Real-time/IoT)

실시간 동기화와 퍼포먼스가 중요한 프론트엔드 특화 기능에서의 협업 사례입니다.

### 1단계: Gemini (Implementation)
- **Task**: 실시간 동기화 타이머 구현
- **Context**:
  - `.docs/sitemap/class-portal.md`
  - `src/app/class/timer/**/*`
- **Deliverables**:
  - 다양한 모드(WOD, EMOM, AMRAP 등)를 지원하는 타이머 컴포넌트
  - Supabase Realtime을 통한 실시간 싱크 연동
  - 코치 앱에서의 원격 제어 기능
  - 부드러운 애니메이션 및 시각 효과

### 2단계: Opus (Code Review)
- **Task**: 타이머 구현 결과물 검토
- **Context**:
  - Gemini의 작성 코드
- **Verification**:
  - 실시간 구독(Subscription) 해제가 올바른가? (메모리 누수 방지)
  - 대형 화면에서의 전반적인 성능 이슈
  - 연결 유실 시의 에러 핸들링 전략
  - 원격 제어 명령에 대한 보안 검증
