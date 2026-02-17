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
- **UI/UX 디자인**: StitchMCP bcl-portal 프로젝트 (Project ID: `432557053076320380`) 참조
  - Dark Mode 기본, Lexend 폰트, 8px Roundness
  - Primary Color: #ff6a00
  - Glassmorphism 스타일 (`.agent/skills/ui-gen/SKILL.md`)


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
- [x] **Authentication 시스템 완료** (2026-02-17) ✨
  - [x] Auth Context (전역 인증 관리)
  - [x] AuthGuard (라우트 보호)
  - [x] Login Page (Glassmorphism, 에러 처리)
  - [x] Signup Page (Multi-step: 3단계)
  - [x] Reset Password Page
  - [x] Email Verification Page
  - [x] OAuth Callback Handler
  - [x] Supabase Auth 연동 테스트 완료
- [ ] 사용자 앱: 핵심 화면 (예정)
  - [ ] Home (대시보드)
  - [ ] Schedule (수업 일정)
  - [ ] Check-in (QR 체크인)
  - [ ] Facilities (지점 정보)
  - [ ] Profile (프로필 관리)
- [x] **관리자: 핵심 기능 구현 (완료)** ✨
  - [x] **전체 사이드바 및 라우팅 구조 정리** (Sitemap 준수)
  - [x] Dashboard (실시간 KPI, 최근 거래, 라이브 체크인 피드)
  - [x] Members (회원 목록, 상세 페이지)
  - [x] Plans (요금제 CRUD)
  - [x] **User & Finance 그룹**:
    - [x] Memberships (멤버십 관리, 홀딩/재개, 크레딧 조정)
    - [x] Check-in Logs (날짜별 로그, 방식별 통계, 수동 체크인)
    - [x] Transactions (기간/상태/카테고리 필터, KPI 요약)
  - [x] **Operations 그룹**:
    - [x] Schedule (수업 관리)
    - [x] Coaches (코치 CRUD, 전문분야 태그)
    - [x] Reservations (예약 관리)
    - [x] Race (이벤트/기기/기록 3탭 - Mock 데이터)
    - [x] Infrastructure (QR 코드, 키오스크 제어)
    - [x] Roles (역할 목록 + 권한 매트릭스)
  - [x] **CRM 그룹**:
    - [x] Content (공지사항 CRUD, 카테고리/우선순위, 게시 토글)
    - [x] Notifications (발송 통계, 타입 필터, 벌크 발송)
    - [x] Support (티켓 분할 뷰, 상태 변경)
    - [x] Feedback (평점 KPI, 카테고리 필터, 별점 카드)
  - [x] **Infrastructure (Setup) 그룹**:
    - [x] Branch Setup (지점 CRUD)
    - [x] System Link (외부 서비스 설정, 연결 테스트)
    - [x] Audit Logs (심각도 필터, 액션 색상 코딩)
  - [x] **Insights 그룹**:
    - [x] Attendance Report (일별 트렌드, 시간대별 분포, 체크인 방식 비율)
    - [x] Revenue Report (월별 매출/환불 차트, 카테고리 비율, 성장률)
    - [x] Coach Performance (랭킹, 평점/세션/리텐션, 전문분야 분포)

### Phase 3: 특화 모듈 및 고도화
- [x] 클래스 포털: 실시간 WOD 보드 및 타이머
- [ ] 레이스 시스템: PM5 기기 데이터 연동 및 리더보드 (UI 구현 완료, DB 연동 대기)
- [x] **알림 시스템: 통합 알림 센터 및 자동화** (2026-02-17 완료) ✨
  - [x] DB 스키마 확장 (notifications, notification_rules, push_subscriptions, notification_preferences)
  - [x] User App: 알림 센터 + 알림 설정 (카테고리별 수신 on/off)
  - [x] Admin: 3탭 구조 (History, Rules, Compose) + KPI 대시보드
  - [x] PWA 설정 (manifest.json, Service Worker) – iOS Push 지원
  - [x] 자동 알림 규칙 (pg_cron + DB Trigger):
    - 수업 1시간 전 리마인더 (매 10분)
    - 예약 취소 시 대기열 즉시 알림 (트리거)
    - 멤버십 만료 D-7/3/1 (매일 오전 9시)
    - 체크인 완료 격려 (트리거)
  - [x] 채널 지원: In-App (Realtime), Web Push, 카카오/SMS (Edge Function)
  - [x] Edge Functions 배포: send-push-notification, send-external-notification


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

- **Current Focus**: **Admin Portal Phase 2 완료 - 모든 페이지 DB 연동 완료** 🎯
- **Recent Accomplishments**:
  - [x] **Phase 1: Critical 이슈 해결 완료** (2026-02-17) ✨
    - [x] DB 스키마 검증 및 외래 키 수정 (`checkins_member_id_fkey` 리네이밍)
    - [x] RLS 정책 추가 (memberships, bookings, checkins, transactions)
    - [x] Memberships 쿼리 수정 (8건 데이터 정상 표시)
    - [x] Check-in Logs 쿼리 수정 (3건 데이터 정상 표시)
    - [x] Transactions 쿼리 수정 (6건 데이터 정상 표시)
    - [x] Reservations 쿼리 수정 (6건 데이터 정상 표시)
    - [x] Members 검색 기능 확인 (이미 구현됨)
    - [x] Members 신규 등록 기능 확인 (이미 구현됨)
  - [x] **Phase 2: Mock 데이터 페이지 실제 DB 연동 완료** (2026-02-17 22:30) ✨
    - [x] Race 페이지 DB 연동 (5개 이벤트, 5개 기기, 7개 기록)
    - [x] Support Tickets DB 연동 (이미 완료)
    - [x] Feedback DB 연동 (8건 피드백, KPI 카드)
    - [x] Roles DB 연동 (4개 역할, 권한 매트릭스)
    - [x] Audit Logs DB 연동 (8건 로그, TypeScript 타입 수정)
    - [x] System Link 검증 (환경변수 기반 정적 페이지)
    - [x] Lockers 데이터 시딩 (20개 락커)
    - [x] Notifications 검증 (DB 연동 완료, 데이터 없음)
    - [x] Infrastructure 검증 (5개 지점 DB 연동, 키오스크 Mock)
  - [x] **AdminModal 컴포넌트 확장** (2026-02-17)
    - [x] `isOpen`, `size`, `footer` props 추가
    - [x] 하위 호환성 유지 (`show` prop 지원)
  - [x] **브라우저 검증 완료** (2026-02-17 22:30)
    - [x] 9개 페이지 스크린샷 확인 (Feedback, Audit, Race, Roles, Lockers, System, Notifications, Infrastructure)
    - [x] 모든 페이지 정상 작동 확인
- **Next Steps**:
  - [ ] **Phase 3: 보안 및 최종 검증 (1일)** 🟢 READY
    - [ ] RLS 정책 세분화 (역할 기반 Admin/Coach/Member)
    - [ ] 모든 테이블 RLS 정책 검토
    - [ ] 테스트 계정 생성 (Admin, Coach, Member)
    - [ ] 시나리오 테스트 (CRUD, 권한 검증)
    - [ ] 에러 핸들링 개선 (Toast 알림, 에러 바운더리)
    - [ ] 전체 24개 페이지 통합 테스트
  - [ ] **User App Core 화면 개발** (Week 2-3) - Admin 완료 후 착수
    - [ ] Home (Dashboard, 회원권 정보, 다음 예약)
    - [ ] Schedule (수업 캘린더, 예약 버튼)
    - [ ] Check-in (QR 코드 생성, 출석 기록)
    - [ ] Facilities (지점 정보, 운영시간, 지도)
    - [ ] Profile (개인정보 수정, 이용권 관리)
    - [ ] Bottom Tab Navigation 구현

### Known Issues
- ✅ **JOIN 쿼리 400 에러** (RESOLVED): Memberships, Checkins, Transactions, Reservations 페이지 데이터 로딩 실패
  - 해결: 외래 키 컬럼명 수정 및 RLS 정책 추가 (Phase 1 완료)
- ✅ **Members 검색 기능** (RESOLVED): 이미 구현되어 있었음
- ✅ **Mock 데이터 페이지** (RESOLVED): 9개 페이지 모두 DB 연동 완료 (Phase 2 완료)

### 참고 문서
- **Admin 개발 통합 계획**: `.docs/ADMIN_DEVELOPMENT_PLAN.md` 🆕
- **감사 보고서**: `.docs/admin-production-readiness-audit.md` 🆕
- **다음 단계**: `.docs/TODO_NEXT_STEPS.md`

---

## 6. 세션 종료 체크리스트
- [x] 변경 사항 커밋 및 푸시
- [x] 이 문서 업데이트 (Current Focus, Recent Accomplishments)
- [x] 다음 작업자를 위한 간단한 인수인계 메모 작성
- [x] Admin 개발 통합 작업 계획 수립 🆕
- [ ] Phase 1 Critical 이슈 해결 시작

