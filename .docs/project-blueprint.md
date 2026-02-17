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

- **Current Focus**: **Admin Portal 전체 기능 구현 완료 → User App Core 화면 개발 준비**
- **Recent Accomplishments**:
  - [x] **Admin Portal 전체 기능 구현 완료** (2026-02-17 13:35)
    - [x] **User & Finance 그룹** (3개 페이지): Memberships, Check-in Logs, Transactions
    - [x] **Operations 그룹** (6개 페이지): Schedule, Coaches, Reservations, Race, Infrastructure, Roles
    - [x] **CRM 그룹** (4개 페이지): Content, Notifications, Support, Feedback
    - [x] **Infrastructure/Setup 그룹** (3개 페이지): Branch Setup, System Link, Audit Logs
    - [x] **Insights 그룹** (3개 페이지): Attendance Report, Revenue Report, Coach Performance
    - [x] **Dashboard 강화**: 실제 Supabase 데이터 연동, 라이브 체크인 피드, Quick Action 링크
    - **총 구현**: 18개 Admin 페이지 (Placeholder → Full Implementation)
    - **데이터 연동**: 11개 페이지 Supabase 실시간 연동, 7개 페이지 Mock 데이터 기반
    - **빌드 검증**: ✅ 에러 없음 (36개 라우트 정상 컴파일)
  - [x] **Authentication 시스템 완전 구현** (2026-02-17)
  - [x] **Database Schema 구현 완료** (2026-02-17)
  - [x] **프로젝트 문서 아카이빙** (2026-02-17)
- **Next Steps**:
  - [ ] **User App Core 화면 개발** (Week 2-3) 🎯 NEXT
    - [ ] Home (Dashboard, 회원권 정보, 다음 예약)
    - [ ] Schedule (수업 캘린더, 예약 버튼)
    - [ ] Check-in (QR 코드 생성, 출석 기록)
    - [ ] Facilities (지점 정보, 운영시간, 지도)
    - [ ] Profile (개인정보 수정, 이용권 관리)
    - [ ] Bottom Tab Navigation 구현
  - [ ] Admin 고도화
    - [ ] Race 페이지 DB 테이블 생성 및 실제 데이터 연동
    - [ ] Audit Logs 실제 DB 연동 (audit_logs 테이블 필요)
    - [ ] Feedback 실제 DB 연동 (session_feedback 테이블 필요)
    - [ ] Roles 실제 DB 연동 (roles/permissions 테이블 필요)
  - [ ] RLS 정책 Supabase 적용
  - [ ] 테스트 계정 생성 및 실제 로그인 테스트
  - [ ] 성능 최적화 가이드 (Week 4+)

### Known Issues
- Race 페이지: 관련 DB 테이블 미생성 (Mock 데이터 사용 중)
- Audit Logs, Feedback, Roles: Mock 데이터 기반 (추가 DB 테이블 필요)
- QR 체크인 라이브러리 연동 대기 중 (User App 공유 사항)

---

## 6. 세션 종료 체크리스트
- [x] 변경 사항 커밋 및 푸시
- [x] 이 문서 업데이트 (Current Focus, Recent Accomplishments)
- [x] 다음 작업자를 위한 간단한 인수인계 메모 작성
- [ ] 실제 DB 스키마와 문서 동기화 검증
