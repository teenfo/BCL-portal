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
  - [x] `src/middleware.ts` 활성화 (2026-02-18)
  - [x] 서버 측 세션 토큰 갱신 + 비인증 사용자 차단
  - [x] PUBLIC_PATHS 기반 공개/비공개 경로 관리

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
- [x] **키오스크 체크인 시스템** (2026-02-18 완료) ✨
  - [x] Admin Infrastructure: 키오스크 기기 DB 연동 (CRUD, Heartbeat, 원격 메시지)
  - [x] Stitch MCP 디자인: 3화면 (Idle, Scan, Success) 생성
  - [x] Kiosk Idle Screen (`/kiosk`) - 대기 화면, 터치 인터페이스
  - [x] Kiosk QR Scan (`/kiosk/scan`) - 카메라 QR 스캔 + 수동 입력
  - [x] Kiosk Success (`/kiosk/success`) - 체크인 완료 + 회원 정보
  - [x] DB 연동: kiosk_devices, qr_codes, check_ins, members, reservations, memberships
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

- **Current Focus**: **빌드 환경 복원 + 인증 흐름 검증** 🎯
- **Project Path**: `~/dev/Antigravity/BCL-Repo/portal` (2026-02-18 이전 완료)
- **Recent Accomplishments**:
  - [x] **프로젝트 경로 이전 완료** (2026-02-18 15:40) ✨
    - `~/Antigravity/BCL-Repo` → `~/dev/Antigravity/BCL-Repo`
    - `sudo xattr -rd com.apple.provenance` 실행 완료
    - `npm install` 성공 (361 packages)
    - ⚠️ 빌드 시 `node_modules` EPERM 에러 잔존 — 터미널 Full Disk Access 권한 필요
  - [x] **인증 흐름 전면 개선** (2026-02-18) ✨
    - `src/middleware.ts` 생성 — Next.js 미들웨어 활성화
    - `src/lib/supabase/middleware.ts` — PUBLIC_PATHS 기반 경로 관리
    - `src/contexts/AuthContext.tsx` — Race condition 제거
    - `src/components/AuthGuard.tsx` — authorized 상태 명시적 관리
    - `src/app/apps/layout.tsx` — AuthGuard 추가
    - `src/app/auth/login/page.tsx` — role 기반 리다이렉트
    - `src/app/auth/callback/page.tsx` — 프로필 재시도 3회, 에러 처리 강화
    - 모든 인증 관련 `router.push` → `router.replace` (히스토리 오염 방지)
  - [x] **키오스크 체크인 시스템** (2026-02-18) ✨
  - [x] **Phase 2: Mock 데이터 → 실제 DB 연동 완료** (2026-02-17) ✨
  - [x] **Phase 1: Critical 이슈 해결 완료** (2026-02-17) ✨

- **Next Steps**:
  - [ ] **🚨 빌드 환경 복원 (즉시 필요)** 🔴
    - 터미널에 **전체 디스크 접근 권한** 부여 필요
    - 시스템 설정 → 개인정보 보호 및 보안 → 전체 디스크 접근 권한 → Terminal.app 추가
    - 터미널 재시작 후 `sudo xattr -rd com.apple.provenance ~/dev/Antigravity/BCL-Repo` 재실행
    - `rm -rf node_modules && npm install` 후 `npm run build` 검증
  - [ ] **인증 흐름 검증 (빌드 복원 후 즉시)**
    - [ ] 서버 실행 후 로그인 → 대시보드 진입 정상 동작 확인
    - [ ] 미인증 상태에서 `/admin/*`, `/apps/*` 직접 접근 시 로그인 리다이렉트 확인
    - [ ] OAuth(카카오) 로그인 → 콜백 → role 기반 리다이렉트 확인
    - [ ] 로그아웃 → 보호 경로 접근 차단 확인
  - [ ] **Phase 3: 보안 및 최종 검증** 🟢 READY
    - [ ] RLS 정책 세분화 (역할 기반 Admin/Coach/Member)
    - [ ] 모든 테이블 RLS 정책 검토
    - [ ] 테스트 계정 생성 (Admin, Coach, Member)
    - [ ] 시나리오 테스트 (CRUD, 권한 검증)
    - [ ] 에러 핸들링 개선 (Toast 알림, 에러 바운더리)
    - [ ] 전체 24개 페이지 통합 테스트
  - [ ] **User App Core 화면 개발** (Week 2-3) - Admin 완료 후 착수

### Known Issues
- ✅ **인증 흐름 불안정** (RESOLVED): 5가지 핵심 문제 수정 완료
- ⚠️ **macOS provenance 잔존** (ACTIVE): 터미널 Full Disk Access 권한 부여 후 해결 예정
- ⚠️ **@supabase/auth-js 타입 미완성** (WORKAROUND): `supabase.auth as any` 캐스팅 우회 중
- ✅ **JOIN 쿼리 400 에러** (RESOLVED)
- ✅ **Mock 데이터 페이지** (RESOLVED)

### 참고 문서
- **Admin 개발 통합 계획**: `.docs/ADMIN_DEVELOPMENT_PLAN.md`
- **감사 보고서**: `.docs/admin-production-readiness-audit.md`
- **다음 단계**: `.docs/TODO_NEXT_STEPS.md`

---

## 6. 세션 종료 체크리스트
- [x] 변경 사항 기록 완료 (이 문서)
- [x] 다음 작업자를 위한 인수인계 메모 작성
- [x] 프로젝트 경로 이전 (`~/Antigravity/BCL-Repo` → `~/dev/Antigravity/BCL-Repo`)
- [x] `npm install` 완료
- [ ] 터미널 Full Disk Access 권한 부여 + 빌드 검증
- [ ] `git push origin main`

