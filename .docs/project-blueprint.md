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
- [ ] 클래스 포털: 실시간 WOD 보드 및 타이머 ⚠️ **미완성** — `/class/leaderboard`만 존재(Mock), WOD/Timer/Live 미구현
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

- **Current Focus**: **멀티 에이전트 작업 준비 — 감사 보고서 기반 미완성 모듈 구현** 🎯
- **Project Path**: `/Users/kimchoho/dev/workspace/BCL-portal` (2026-02-18 경로 확정)
- **Build Status**: ✅ `npm run build` 정상 완료 (2026-02-18 17:00 확인)
- **Dev Server**: ✅ `npm run dev` 정상 구동 (http://localhost:3000)

---

### Recent Accomplishments
  - [x] **빌드 권한 문제 영구 해결** (2026-02-18 17:00) ✨
    - `package.json` `postinstall` 스크립트 추가: `xattr -cr . 2>/dev/null || true`
    - 글로벌 Git 훅 설정: `~/.git-hooks/post-checkout`, `post-merge` (자동 속성 제거)
    - `npm config set script-shell /bin/bash` + `~/.npmrc` `ignore-scripts=false` 설정
    - `npm install`, `npm run build`, `npm run dev` 모두 EPERM 없이 정상 동작 확인
  - [x] **구현 완성도 감사 완료** (2026-02-18 15:17) ✨ — `.docs/audit/` 참조
    - Gemini 감사: User App 100%+, Admin 핵심 완료, 문서-코드 정합성 권고
    - GPT 감사: 전체 SSOT 대비 **64%** 완성도, 착수 모듈 기준 **82%**
  - [x] **인증 흐름 전면 개선** (2026-02-18) ✨
  - [x] **키오스크 체크인 시스템 UI 구현** (2026-02-18) ✨
  - [x] **Phase 2: Mock 데이터 → 실제 DB 연동 완료** (2026-02-17) ✨

---

### 감사 보고서 핵심 발견사항 (`.docs/audit/`)

#### 🔴 Critical — ~~즉시 구현 필요~~ ✅ 전부 해결
| 항목 | 현황 | 상태 |
|---|---|---|
| ~~**Coach 앱 미구현**~~ | `src/app/coach/*` 5/5 화면 구현 완료 | ✅ RESOLVED |
| ~~**Class 포털 핵심 화면 미구현**~~ | `/class/wod`, `/class/timer`, `/class/live`, `/class/leaderboard` 4/4 구현 | ✅ RESOLVED |
| ~~**키오스크 QR 스캔 실동작 불가**~~ | `html5-qrcode` 라이브러리 연동 완료 | ✅ RESOLVED |
| ~~**키오스크 DB 스키마 불일치**~~ | 컬럼명 통일 (`checkin_time`, `checkin_method`, `facility_id`) | ✅ RESOLVED |

#### 🟠 High — ~~우선 처리 권장~~ ✅ 전부 해결
| 항목 | 현황 | 상태 |
|---|---|---|
| ~~**`/auth/logout` 라우트 미구현**~~ | `src/app/auth/logout/page.tsx` 구현 완료 | ✅ RESOLVED |
| ~~**Coach 리다이렉트 불일치**~~ | AuthGuard에서 `/coach/dashboard`로 수정 | ✅ RESOLVED |
| ~~**프로필 로그아웃 경로 오류**~~ | `/auth/login`으로 변경 | ✅ RESOLVED |
| ~~**블루프린트 클래스 포털 완료 표시 오류**~~ | 4/4 화면 실제 구현 완료 | ✅ RESOLVED |

#### 🟡 Medium — 순차 처리
| 항목 | 현황 | 상태 |
|---|---|---|
| **User Check-in QR 비표준 렌더링** | 토큰 격자 UI (실 스캐너 호환 미보장) | ⚠️ 향후 개선 |
| ~~**Schedule 필터 로직 미반영**~~ | 코치별/난이도 실제 쿼리 필터링 구현 | ✅ RESOLVED |
| **Purchase 결제 플로우 단순화** | PG 없이 즉시 멤버십 활성화 | ⚠️ PG 연동 시 해결 |
| ~~**Profile Settings 영속화 없음**~~ | `profiles.notification_settings` JSONB 영속화 | ✅ RESOLVED |
| **대시보드 위젯 일부 TODO** | 알림/코치/지원 지표 `0` 또는 `-` 반환 | ⚠️ 향후 개선 |
| **루트 랜딩 페이지 미구현** | 초기화 문구만 표시 | ⚠️ 향후 개선 |
| ~~**초과 구현 화면 문서 미반영**~~ | `/badges`, `/coaches`, `/leaderboard` Sitemap 반영 완료 | ✅ RESOLVED |

---

### Next Steps (멀티 에이전트 작업 대상)

> 📌 **에이전트 배분 표기 규칙**: 각 항목 끝에 담당 에이전트를 명시합니다.
> - 🏛️ **Architect (Opus)** — 설계, 구조 결정, 최종 승인
> - 💎 **Senior Dev (Opus)** — 복잡한 비즈니스 로직, 결제, 보안, DB 스키마
> - 💻 **Developer (Sonnet)** — API, 일반 로직, 테스트/QA, 버그 수정
> - 🎨 **UI Developer (Gemini)** — 화면 UI/UX, 컴포넌트 구현
> - ⚡ **Specialist (Gemini)** — 실시간 기능, 성능 최적화, 카메라/QR

#### 🔴 Priority 1: Critical 수정 ✅ 완료
  - [x] **키오스크 QR 스캔 실구현** — `html5-qrcode` 라이브러리 연동 완성 → ⚡ **Specialist (Gemini)**
  - [x] **키오스크 DB 스키마 정합성** — `checkin_time`, `checkin_method`, `facility_id` 컬럼명 통일 → 💻 **Developer (Sonnet)**
  - [x] **`/auth/logout` 라우트 구현** → 💻 **Developer (Sonnet)**
  - [x] **프로필 로그아웃 경로 수정** (`/apps/auth/login` → `/auth/login`) → 💻 **Developer (Sonnet)**
  - [x] **Coach 리다이렉트 수정** (AuthGuard + Login) → 💻 **Developer (Sonnet)**

#### 🟠 Priority 2: Coach 앱 구현 ✅ 완료
  - [x] Sitemap 갱신 (coach-app.md 구현 상태 반영) → 🏛️ **Architect**
  - [x] `src/app/coach/layout.tsx` — AuthGuard + CoachBottomNav → 🎨 **UI Developer**
  - [x] `src/components/layout/CoachBottomNav.tsx` → 🎨 **UI Developer**
  - [x] `src/app/coach/dashboard/page.tsx` — 오늘 수업/통계/공지 → 🎨 **UI Developer**
  - [x] `src/app/coach/schedule/page.tsx` — 일간/주간 일정 조회 → 🎨 **UI Developer**
  - [x] `src/app/coach/members/page.tsx` — 회원 검색/코칭 노트 → 🎨 **UI Developer**
  - [x] `src/app/coach/race/page.tsx` — 레이스 이벤트/기록 관리 → 🎨 **UI Developer**
  - [x] `src/app/coach/profile/page.tsx` — 코치 프로필/통계 → 🎨 **UI Developer**
  - [ ] Coach 앱 브라우저 통합 테스트 → 💻 **Developer (Sonnet)**

#### 🟠 Priority 3: Class 포털 완성 ✅ 완료
  - [x] `/class/wod` UI 구현 (WOD 게시판, 운동 목록, Time Cap) → 🎨 **UI Developer**
  - [x] `/class/timer` 실시간 타이머 구현 (Countdown/CountUp/EMOM/Tabata + 오디오 비프) → ⚡ **Specialist**
  - [x] `/class/live` 라이브 허브 구현 (세션 감지, 참가자 그리드) → 🎨 **UI Developer**
  - [x] `/class/leaderboard` Mock → 실 DB 연동 (race_events/race_records) → 💻 **Developer**
  - [ ] Class 포털 성능 최적화 (60fps) → ⚡ **Specialist** *(향후 개선)*

#### 🟡 Priority 4: User App 품질 개선 ✅ 완료
  - [x] Schedule 필터 실제 쿼리 연동 (코치별/난이도 필터, session_date 사용) → 💻 **Developer**
  - [x] Profile Settings DB 영속화 (profiles.notification_settings JSONB 사용) → 💻 **Developer**
  - [x] Weekly Progress 실 DB 연동 (bookings 기반 주간 통계) → 💻 **Developer**
  - [ ] Check-in QR 표준 라이브러리 교체 (qrcode.react) → ⚡ **Specialist** *(향후 개선)*

#### 📄 Priority 5: 문서 동기화 ✅ 완료
  - [x] `/badges`, `/coaches`, `/leaderboard` 사용자 앱 Sitemap 반영 → 🏛️ **Architect**
  - [x] Class 포털 Sitemap 구현 상태 반영 (4/4 화면 완료) → 🏛️ **Architect**

---

### Known Issues
- ✅ **빌드 권한 문제 (EPERM)** (RESOLVED 2026-02-18): `postinstall` + 글로벌 Git 훅으로 영구 해결
- ✅ **인증 흐름 불안정** (RESOLVED): 5가지 핵심 문제 수정 완료
- ✅ **JOIN 쿼리 400 에러** (RESOLVED)
- ✅ **Mock 데이터 페이지** (RESOLVED)
- ✅ **Coach 앱 미구현** (RESOLVED 2026-02-18): 5/5 화면 구현 완료
- ✅ **키오스크 QR 실동작 불가** (RESOLVED 2026-02-18): html5-qrcode 라이브러리 연동 완료
- ✅ **키오스크 DB 스키마 불일치** (RESOLVED 2026-02-18): 컬럼명 통일
- ✅ **Class 포털 미완성** (RESOLVED 2026-02-18): 4/4 화면 구현 + Leaderboard DB 연동
- ⚠️ **@supabase/auth-js 타입 미완성** (WORKAROUND): `supabase.auth as any` 캐스팅 우회 중

### 참고 문서
- **구현 완성도 감사 (Gemini)**: `.docs/audit/gemini/20260218151644_implementation_audit.md`
- **구현 완성도 감사 (GPT)**: `.docs/audit/gpt/IMPLEMENTATION_COMPLETENESS_AUDIT_2026-02-18_15-17-30.md`
- **Sitemap SSOT**: `.docs/sitemap/README.md`
- **DB 스키마 참조**: `.docs/database-reference.md`

---

## 6. 세션 종료 체크리스트
- [x] 변경 사항 기록 완료 (이 문서)
- [x] 다음 작업자를 위한 인수인계 메모 작성
- [x] 빌드 권한 문제 영구 해결 (`postinstall` + 글로벌 Git 훅)
- [x] `npm install`, `npm run build` 정상 동작 확인
- [x] 멀티 에이전트 작업 완료 (P1~P5 전체 완료)

