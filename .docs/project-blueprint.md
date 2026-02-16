# BCL Portal Project Blueprint

이 문서는 BCL Portal 프로젝트의 전반적인 맥락, 목표 및 체크리스트를 관리하는 통합 문서입니다.

---

## 1. 프로젝트 개요 (Core Context)
- **목표**: 오프라인 피트니스 지점의 운영을 디지털화하고 사용자 경험을 혁신하는 통합 플랫폼.
- **핵심 모듈**:
  - `apps`: 회원용 모바일 웹 앱 (예약, 체크인, 결제)
  - `admin`: 운영진용 관리 도구 (회원 관리, 정산, 스케줄링)
  - `coach`: 코치 전용 앱 (수업 관리, 회원 케어)
  - `class`: 센터 내 대형 스크린용 실시간 포털
- **기술 스택**: Next.js (CSR), Supabase (Auth/DB), Ubuntu 24.04 자체 서버 (Docker), Vanilla CSS.

## 2. 개발 원칙 및 규칙
- **Rendering**: 모든 화면은 **CSR(Client Side Rendering)** 기준. 서버 컴포넌트 사용을 지양함.
- **Data Access**: Client -> Supabase SDK -> DB (RLS 필수).
- **Navigation**:
  - 사용자/코치: Bottom Tab (모바일 우선)
  - 관리자: Sidebar (데스크탑 우선)
- **UX Mapping**:
  - Admin (RO Data) -> User (View): 지점 정보, 공지사항, 코치 프로필 등의 데이터는 관리자에서 관리하고 사용자 앱에서는 읽기 전용으로 제공함.
- **SSOT**: 모든 화면 설계의 기준은 `.docs/sitemap/` 내의 기획 문서를 따름.

## 3. 구현 체크리스트 (Current Status)

### Phase 1: 파운데이션 (완료)
- [x] 프로젝트 구조 및 환경 설정 (Next.js + Tailwind/CSS)
- [x] Supabase Auth 연동 (로그인/로그아웃)
- [x] 권한 기반 미들웨어(Middleware) 설정

### Phase 2: 핵심 기능 구현 (진행 중)
- [x] 관리자: 회원 목록 및 상세 조회
- [x] 관리자: 수업 스케줄링 및 예약 관리
- [x] 관리자: 매출 리포트 및 정산 대시보드
- [x] 사용자/코치: 대시보드 및 일정 확인
- [ ] 사용자: 이용권 구매 및 결제 연동 (준비 중)

### Phase 3: 특화 모듈 및 고도화 (예정)
- [x] 클래스 포털: 실시간 WOD 보드 및 타이머
- [ ] 레이스 시스템: PM5 기기 데이터 연동 및 리더보드
- [ ] 알림 센터: 카카오 알림톡 및 푸시 알림 자동화

---

## 4. 커뮤니케이션 가이드
- **에이전트 역할**: Antigravity는 기획 문서와 소스 코드의 동기화를 최우선으로 함.
- **문서 위치**:
  - 기획: `.docs/sitemap/`
  - 기술 가이드: `.docs/**/*.md`
  - 데이터베이스: `.docs/database/`
  - 보안: `.docs/security/`
  - 테스트: `.docs/testing/`
  - 에이전트 규칙: `.agent/`

## 5. 현재 작업 컨텍스트 (Active Context)
> **Agent Note**: 작업 세션 종료 시, 다음 작업자를 위해 현재 상태를 이곳에 기록하십시오.

- **Current Focus**: 프로젝트 문서 개선 및 구조화 (Week 1 완료)
- **Recent Accomplishments**:
  - [x] 프로젝트 전체 분석 보고서 작성 (`PROJECT_ANALYSIS_REPORT.md`)
  - [x] 데이터베이스 문서 구조화 완료
    - [x] `database/README.md` - 전체 아키텍처 개요
    - [x] `database/schema/001_initial_schema.sql` - 초기 스키마
    - [x] `database/migrations/versioning-strategy.md` - 마이그레이션 전략
    - [x] `database/rls-policies/README.md` - RLS 정책 가이드
  - [x] 보안 문서 확장 (`security/README.md`)
  - [x] 테스트 전략 문서 작성 (`testing/README.md`)
  - [x] `database-reference.md` v2.0 업데이트
- **Next Steps**:
  - [ ] 테스트 전략 구체화 (Week 2-3)
    - [ ] `testing/unit-testing.md`
    - [ ] `testing/integration-testing.md`
    - [ ] `testing/e2e-testing.md`
    - [ ] `testing/ci-cd-pipeline.md`
  - [ ] 보안 정책 상세화 (Week 2)
    - [ ] `security/authentication.md`
    - [ ] `security/authorization.md`
    - [ ] `security/data-protection.md`
  - [ ] 성능 최적화 가이드 (Week 4+)
  - [ ] 실제 DB 스키마와 문서 동기화 검증
