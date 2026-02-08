# BCL Portal Sitemap v0.6 (CSR / Next.js)
(Antigravity SSOT 문서)

> 목표: CSR 기반으로 **사용자 화면(apps)** + **관리자 화면(admin)**을 동시에 설계한다.
>
> - 사용자 기능: `apps` 폴더
> - 관리자 기능: `admin` 폴더
> - 관리자 Sitemap은 기존(v0.4)을 **그대로 유지**한다.

---

## 0) 폴더/라우팅 규칙

- **User(Apps)**: `apps/*` → URL Prefix: `/apps/*`
  - 예: `/apps/dashboard`, `/apps/schedule`
- **Coach**: `coach/*` → URL Prefix: `/coach/*`
  - 예: `/coach/dashboard`, `/coach/schedule`
- **Admin**: `admin/*` → URL Prefix: `/admin/*`
- **Class Portal**: `class/*` → URL Prefix: `/class/*`
  - 예: `/class/live`, `/class/timer`

- **인증(Auth) 라우팅**
  - 사용자: `/apps/auth/*`
    - `/apps/auth/login`
    - `/apps/auth/signup` (선택)
    - `/apps/auth/callback`
    - `/apps/auth/reset-password` (선택)
  - 관리자: `/admin/auth/*`
    - `/admin/auth/login`
    - `/admin/auth/callback`
  - 코치: `/coach/auth/*`
    - `/coach/auth/login`
    - `/coach/auth/callback`
  - 클래스 포털: `/class/auth/*`
    - `/class/auth/login`
    - `/class/auth/callback`
  - 공통 로그아웃(권장): `/auth/logout` (앱/관리자/코치/클래스에서 동일 처리)

---

## 1) User (apps) Sitemap (MVP 우선)

### A) User Navigation (권장: Bottom Tab)
- **Home** → `/apps/dashboard`
- **Schedule** → `/apps/schedule`
- **Check-in** → `/apps/checkin`
- **Facilities** → `/apps/facilities`
- **Profile** → `/apps/profile`

> 보조 진입(내부 메뉴/더보기): Notifications, Membership/Billing, Support

---

### 1) 홈/대시보드
- **홈** (`/apps/dashboard`)
  - 오늘 예약/체크인 상태, 공지 요약, 결제/만료 상태

### 2) 지점·시설 안내
- **지점/시설** (`/apps/facilities`)
  - 지점 목록/검색, 운영시간, 주소/연락처, 편의시설, 공지
  - **데이터 소스:** Admin의 **지점/시설 정보**(`/admin/settings/facility`)에 등록된 내용을 노출(읽기 전용)
- **지점 상세** (`/apps/facilities/:facilityId`)
  - 지도/길찾기 링크, 운영 정책 요약, 제공 프로그램/클래스 안내

### 3) 스케줄/예약
- **스케줄** (`/apps/schedule`)
  - 수업/세션 캘린더, 필터(코치/강도/시간)
- **세션 상세** (`/apps/schedule/:sessionId`)
  - 세부 정보, 남은 자리, 코치 정보
- **예약하기** (`/apps/bookings/new/:sessionId`)
- **내 예약** (`/apps/bookings`)
  - 예약/대기/취소 내역
- **예약 상세** (`/apps/bookings/:bookingId`)

### 4) 체크인
- **체크인** (`/apps/checkin`)
  - QR/바코드 표시(시설에서 스캔), 체크인 상태
- **체크인 기록** (`/apps/checkin/history`)

### 5) 멤버십/결제
- **멤버십** (`/apps/membership`)
  - 현재 플랜, 만료일, 이용권/크레딧
- **플랜/구매** (`/apps/membership/plans`)
- **결제 내역** (`/apps/billing/payments`)
- **환불/정산 안내** (`/apps/billing/help`)
  - 사용자 관점 FAQ/정책 링크

### 6) 알림/공지
- **알림함** (`/apps/notifications`)
- **공지사항** (`/apps/notices`)
- **공지 상세** (`/apps/notices/:noticeId`)

### 7) 프로필/설정
- **내 프로필** (`/apps/profile`)
  - 기본정보, 프로필 이미지
- **보안/계정** (`/apps/profile/security`)
  - 비밀번호 변경, 기기/세션 관리
- **환경설정** (`/apps/settings`)
  - 다크모드, 알림 수신 설정

### 8) 고객지원
- **문의/지원** (`/apps/support`)
- **문의 상세** (`/apps/support/:ticketId`)

### 3) 코치 앱 (Coach App) Sitemap

#### A) Coach Navigation (권장: Bottom Tab)
- **Home** → `/coach/dashboard`
- **My Schedule** → `/coach/schedule`
- **Member Care** → `/coach/members`
- **Race** → `/coach/race`
- **Profile** → `/coach/profile`

#### 1) 홈/대시보드
- **내 대시보드** (`/coach/dashboard`)
  - 오늘 내 수업 리스트, 금일 출석 현황 요약, 센터 공지사항

#### 2) 스케줄 관리
- **내 수업 일정** (`/coach/schedule`)
  - 배정된 수업 캘린더, 세션별 예약 인원 확인, 출결 체크 전용 화면 진입
- **출결 처리** (`/coach/attendance/:sessionId`)
  - 실시간 리스트 기반 출석/결석/지각 태깅

#### 3) 회원 케어
- **회원 상담/노트** (`/coach/members`)
  - 담당 회원 리스트, 회원별 건강기록/피드백(코칭노트) 작성
- **회원 상세** (`/coach/members/:memberId`)
  - 과거 운동 이력, 특이사항(부상 등) 공유

#### 4) 레이스 제어 (Race Integration)
- **레이스 대시보드** (`/coach/race`)
  - PM5 기기 연결 상태 확인, 레인 배정, 레이스 시작/중단 제어
- **실시간 리더보드** (`/coach/race/live`)
  - 대형 스크린용 실시간 레이스 중계 화면

---

## 4) Admin Sitemap (기존 유지: v0.4)

### A) Admin Navigation (권장: Sidebar)
- Sidebar는 **Sitemap과 1:1 매핑**
- Group/Collapse 지원(2~3 depth)
- 권한(Role) 기반 메뉴 노출은 선택(최종 권한은 서버/RLS)

---

### 1) 대시보드
- **대시보드** (`/admin/dashboard`)
  - icon: `fa-tachometer-alt`

### 2) 회원관리
- **회원관리** (그룹)
  - **회원 목록** (`/admin/members`)
    - icon: `fa-users`
  - **회원 프로필** (`/admin/members/:memberId`)
    - icon: `fa-user`
  - **출결·체크인 로그** (`/admin/attendance`)
    - icon: `fa-clipboard-check`
  - **멤버십·결제** (서브메뉴)
    - **플랜 관리** (`/admin/billing/plans`)
      - icon: `fa-id-card`
    - **결제 내역** (`/admin/billing/payments`)
      - icon: `fa-receipt`
    - **환불·정산** (`/admin/billing/settlements`)
      - icon: `fa-money-check-alt`
  - **권한·그룹** (`/admin/access-control`)
    - icon: `fa-user-shield`

### 3) 시설·세션 운영
- **시설·세션 운영** (그룹)
  - **세션·수업 스케줄** (`/admin/sessions/schedule`)
    - icon: `fa-calendar-alt`
  - **예약·대기열 관리** (`/admin/reservations`)
    - icon: `fa-list-ol`
  - **체크인 현황** (`/admin/checkin/live`)
    - icon: `fa-door-open`
  - **체크인 QR** (`/admin/checkin/qr`)
    - icon: `fa-qrcode`
  - **코치 배정·교체** (`/admin/sessions/assignments`)
    - icon: `fa-user-check`
  - **코치 프로필 관리** (서브메뉴)
    - **코치 목록** (`/admin/coaches`)
      - icon: `fa-chalkboard-teacher`
    - **코치 프로필** (`/admin/coaches/:coachId`)
      - icon: `fa-address-card`
    - **자격·인증 관리** (`/admin/coaches/certifications`)
      - icon: `fa-certificate`

### 4) 콘텐츠·게시판
- **콘텐츠·게시판** (그룹)
  - **공지사항** (`/admin/content/notices`)
    - icon: `fa-bullhorn`
  - **운영 공지/배너** (`/admin/content/banners`)
    - icon: `fa-flag`
  - **게시글 관리** (`/admin/content/posts`)
    - icon: `fa-edit`
  - **댓글/신고 관리** (`/admin/content/moderation`)
    - icon: `fa-shield-alt`

### 5) 보고서·분석
- **보고서·분석** (그룹)
  - **출석 리포트** (`/admin/reports/attendance`)
    - icon: `fa-chart-line`
  - **세션 운영 리포트** (`/admin/reports/sessions`)
    - icon: `fa-chart-bar`
  - **매출·정산 리포트** (`/admin/reports/revenue`)
    - icon: `fa-coins`
  - **코치 성과 리포트** (`/admin/reports/coaches`)
    - icon: `fa-award`

### 6) 알림·메시지
- **알림·메시지** (그룹)
  - **템플릿 관리** (`/admin/notifications/templates`)
    - icon: `fa-envelope-open-text`
  - **발송 로그** (`/admin/notifications/logs`)
    - icon: `fa-history`
  - **자동 발송 규칙** (`/admin/notifications/rules`)
    - icon: `fa-magic`

### 7) 통합·연동
- **통합·연동** (그룹)
  - **결제 연동 설정** (`/admin/integrations/payments`)
    - icon: `fa-credit-card`
  - **외부 시스템 연동** (`/admin/integrations/webhooks`)
    - icon: `fa-plug`
  - **데이터 내보내기/가져오기** (`/admin/integrations/import-export`)
    - icon: `fa-file-export`

### 8) 설정
- **설정** (그룹)
  - **지점/시설 정보** (`/admin/settings/facility`)
    - icon: `fa-building`
  - **운영 정책** (`/admin/settings/policies`)
    - icon: `fa-sliders-h`
  - **멤버십 상품 정책** (`/admin/settings/memberships`)
    - icon: `fa-tags`
  - **권한 정책/역할 관리** (`/admin/settings/roles`)
    - icon: `fa-key`

### 9) 유지보수·로그
- **유지보수·로그** (그룹)
    - **관리자 액션 로그** (`/admin/audit/actions`)
      - icon: `fa-user-clock`
    - **에러 로그** (`/admin/audit/errors`)
      - icon: `fa-bug`
    - **공지/점검 이력** (`/admin/audit/maintenance`)
      - icon: `fa-tools`

### 10) 고객 지원
- **문의/요청 관리** (`/admin/support`)
    - icon: `fa-headset`


---

## 5) Kiosk Sitemap

### A) Kiosk Navigation
- **Idle Screen** → `/kiosk`
- **QR Scan** → `/kiosk/scan`
- **Success Feedback** → `/kiosk/success`

---

## 6) Class Portal Sitemap

### A) Class Navigation (권장: Sidebar or Top Bar)
- **Live Now** → `/class/live`
- **WOD Board** → `/class/wod`
- **Workout Timer** → `/class/timer`
- **Leaderboard** → `/class/leaderboard`

### 1) 라이브 허브
- **라이브 화면** (`/class/live`)
  - 현재 세션 정보, 체크인 명단, WOD 요약

### 2) WOD 보드
- **WOD 상세** (`/class/wod`)
  - 대형 화면용 WOD 구성 상세, 동작 가이드

### 3) 타이머
- **워크아웃 타이머** (`/class/timer`)
  - AMRAP, EMOM, Tabata 등 모드 선택 및 실행 화면

### 4) 리더보드
- **실시간 순위** (`/class/leaderboard`)
  - 세션 참여자들의 기록 실시간 현황

---

## 3) 사용자 기능 평가 및 반영 요약
- **추가(필수/MVP):** 지점/시설 안내, 체크인(QR/Camera Sync), 내 예약/예약 상세, 결제 내역, 공지/알림함, 고객지원(문의)
- **보류(선택/추후):** 커뮤니티/게시판(운영 정책 확정 후), 코치 소개(필요 시)
