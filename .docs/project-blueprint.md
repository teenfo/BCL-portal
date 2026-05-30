# BCL Portal Project Blueprint

이 문서는 BCL Portal 프로젝트의 **현재 활성 컨텍스트**와 **미구현 항목**만을 관리하는 통합 문서입니다.
완료된 작업은 `.docs/project-complete-YYYYMMDD.md` 파일에 날짜별로 기록됩니다.

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

---

## 3. 구현 상태 요약

> 상세 완료 내역: `.docs/project-complete-20260218.md`

| 영역 | 상태 | 비고 |
|------|------|------|
| Phase 1: 파운데이션 | ✅ 완료 | Auth, Middleware, 환경 |
| Phase 2: Admin 전체 | ✅ 완료 | 사이드바, 6대 그룹 20+ 화면 |
| Phase 2: Auth 시스템 | ✅ 완료 | Login, Signup, Reset, OAuth |
| Phase 3: 키오스크 | ✅ 완료 | QR 스캔, DB 연동 |
| Phase 3: 알림 시스템 | ✅ 완료 | PWA Push, 자동 규칙 |
| Coach 앱 | ✅ 완료 | 5/5 화면, 코칭노트/출석체크/정산 |
| Class 포털 | ✅ 완료 | 4/4 화면, DB 연동, 2.5D Race |
| User App 품질 개선 | ✅ 완료 | 필터, Settings 영속화 |
| Known Issues 정비 | ✅ 완료 | as any 제거, member_id 혼용 해결 (v0.5.0) |
| 코치 기능 고도화 | ✅ 완료 | 7 Phase 완료 (v0.6.0) |
| Race 시스템 전체 구현 | ✅ 완료 | BLE+시뮬레이터+2.5D+결과적재 (v0.7.0) |
| Priority 22: 코치앱 P0 운영 안정화 | ✅ 코드 완료 | 마이그레이션+RPC 6종+상태 게이트+세션 운영 보드 + 빌드 통과 (수용 시나리오 검증 예정) |
| Priority 23: 코치앱 P1-A 수업 표준화 + 회원 컨텍스트 | ✅ 코드 완료 | DB 마이그레이션(7테이블+14 RPC)+세션 WOD/Runbook 패널+Admin WOD Templates+/class/wod 표준 소스 전환+회원 컨텍스트 패널+오늘의 경고 위젯 + 빌드 통과 |


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
  - **완료 히스토리**: `.docs/project-complete-*.md`

## 5. 현재 작업 컨텍스트 (Active Context)
> **Agent Note**: 작업 세션 종료 시, 다음 작업자를 위해 현재 상태를 이곳에 기록하십시오.

- **Current Focus**: **Priority 26 운동 라이브러리 관리 화면 완료 → 다음 작업 대기**
- **Project Path**: `/Users/kimchoho/dev/workspace/BCL-portal`
- **Build Status**: ✅ `npm run build` 통과 (Compiled successfully)
- **Dev Server**: ✅ `npm run dev` 정상 구동 (http://localhost:3000)
- **Last Action** (2026-05-30): Priority 26 전체 Phase 완료
  - 🗄️ **DB**: `movement_categories` 테이블 신규 생성, 기존 8개 카테고리 이관, `movement_library`에 thumbnail_url+video_url 컬럼 추가, RLS 정책(admin+coach), `fn_list_movement_library` RPC 생성
  - 🎨 **UI**: `/admin/operations/movement-library` 마스터-디테일 페이지 구현 (Glassmorphism, 글로벌 CSS 클래스 준수)
  - 🔗 **메뉴**: AdminSidebar에 Movement Library 메뉴 추가 (IconDumbbell SVG), useAdminPermissions + AdminPermissionGuard 경로 등록
  - 📋 **문서**: sitemap 03-operations.md Section 9 추가, blueprint Priority 26 완료 처리


---

### Next Steps (미구현 작업)

> 📌 **에이전트 배분 표기 규칙**: 각 항목 끝에 담당 에이전트를 명시합니다.
> - 🏛️ **Architect (Opus)** — 설계, 구조 결정, 최종 승인
> - 💎 **Senior Dev (Opus)** — 복잡한 비즈니스 로직, 결제, 보안, DB 스키마
> - 💻 **Developer (Sonnet)** — API, 일반 로직, 테스트/QA, 버그 수정
> - 🎨 **UI Developer (Gemini)** — 화면 UI/UX, 컴포넌트 구현
> - ⚡ **Specialist (Gemini)** — 실시간 기능, 성능 최적화, 카메라/QR

#### ✅ Priority 6: 코치 계정 아키텍처 강화 (완료)
  > 기획서: `.docs/archive/planning/coach-account-architecture.md` | 상세: `.docs/archive/complete/project-complete-20260218.md`

#### ✅ Priority 7: 알림 시스템 종합 구축 (완료)
  > 기획서: `.docs/archive/planning/notification-system.md` | 상세: `.docs/archive/complete/project-complete-20260218.md`

#### ✅ Priority 8: Admin 미구현 상세 기능 완성 (완료)
  > 기획서: `.docs/archive/planning/admin-unimplemented-features.md` | 상세: `.docs/archive/complete/project-complete-20260218.md`

#### ✅ Priority 9: 결제 시스템 아키텍처 (완료)
  > 기획서: `.docs/archive/planning/payment-system.md` | 상세: `.docs/archive/complete/project-complete-20260218.md`

#### ✅ Priority 10: 루트 랜딩 페이지 구현 (완료)
  > 기획서: `.docs/archive/planning/landing-page.md` | 상세: `.docs/archive/complete/project-complete-20260218.md`

#### ✅ Priority 11: 잔여 개선 항목 통합 (완료)
  > **기획서**: `.docs/archive/planning/remaining-improvements.md`
  > **결과**: QR 표준 라이브러리 교체 완료, Class 포털 rAF 기반 성능 최적화, 대시보드 위젯 쿼리 바인딩 보강, Coach 앱 통합 검증 완료

  - [x] Phase 1: QR 표준 라이브러리 교체 → ⚡ **Specialist (Gemini)** ✅
    - [x] `qrcode.react` 패키지 설치 (이미 설치됨 확인)
    - [x] Check-in QR 렌더링 교체 (QRCodeSVG) — ISO/IEC 18004 규격
    - [x] 키오스크 스캔 연동 검증
    - [x] 빌드 검증
  - [x] Phase 2: Class 포털 성능 최적화 → ⚡ **Specialist (Gemini)** ✅
    - [x] Timer `requestAnimationFrame` 전환 + DOM 직접 갱신
    - [x] Live 인라인 스타일 정적화 + React.memo
    - [x] Leaderboard/WOD `rAF + ref` 시계 최적화
    - [x] 빌드 검증
  - [x] Phase 3: 대시보드 위젯 실 데이터 완성 → 💻 **Developer (Sonnet)** ✅
    - [x] widget-registry 쿼리 키 감사
    - [x] schedule/notifications/coaches/memberships 쿼리 바인딩 보강
    - [x] Empty State / Error 처리 (기존 구현 확인)
    - [x] 빌드 검증
  - [x] Phase 4: Coach 앱 브라우저 통합 테스트 → 💻 **Developer (Sonnet)** ✅
    - [x] Coach 전 5개 화면 통합 테스트 (dashboard, schedule, members, race, profile)
    - [x] 발견 버그: 없음 (모든 화면 정상)
  - [x] Phase 5: 문서 동기화 → 🏛️ **Architect (Opus)** ✅
    - [x] sitemap/blueprint/complete 갱신

  > ※ **PM5/Race 시스템**: 기획서 승인 완료 → Priority 19로 등록됨 (`.docs/archive/planning/race-system.md`)

#### ✅ Priority 12: User App 핵심 화면 고도화 (완료)
  > **기획서**: `.docs/archive/planning/user-app-enhancement.md`
  > **문제**: 5대 핵심 탭(Home, Schedule, Check-in, Facilities, Profile)의 완성도가 55~70% 수준이며, Waitlist/크레딧 차감/QR 만료 갱신/지도 연동/프로필 사진 등 핵심 기능 미구현
  > **방안**: DB 확장(members/facilities 컬럼 추가 + 크레딧 RPC) → 공통 컴포넌트 표준화 → 5대 탭 순차 고도화 → 문서 동기화

  - [x] Phase 1: DB 확장 + RPC 함수 → 💎 **Senior Dev (Opus)** ✅
    - [x] members 컬럼 추가 (preferences, phone, birthday, emergency_contact, avatar_url)
    - [x] facilities 컬럼 추가 (latitude, longitude, photos)
    - [x] fn_book_with_credit / fn_cancel_booking_with_credit RPC 생성 (Waitlist 자동 분기 포함)
    - [x] RLS/보안 검증 (기존 정책으로 커버 확인)
    > 마이그레이션: `supabase/migrations/20260219165300_user_app_enhancement_phase1.sql`
  - [x] Phase 2: 공통 컴포넌트 표준화 → 🎨 **UI Developer (Gemini)** ✅
    - [x] AppSkeleton (card/list/stat/text 4가지 변형) ✅
    - [x] AppEmptyState (아이콘 + 메시지 + CTA 버튼) ✅
    - [x] AppErrorState (에러 메시지 + 재시도 버튼) ✅
    - [x] StatCard (숫자 + 라벨 + 아이콘 미니 카드) ✅
    - [x] MonthCalendar (출석 월간 캘린더 그리드) ✅
    - [x] SessionDetailModal (수업 상세 바텀시트 모달) ✅
    > 경로: `src/components/apps/` (6개 컴포넌트 + barrel export)
  - [x] Phase 3: Home (Dashboard) 고도화 → 🎨 **UI Developer (Gemini)** ✅
    - [x] Today's Status 위젯 (체크인, 주간 진행, 연속 출석일, 미읽음 알림) ✅
    - [x] 병렬 데이터 로딩 (Promise.all 8개 쿼리 동시 실행) ✅
    - [x] 다음 수업 쿼리 수정 (session_date=today + start_time>now) ✅
    - [x] 공통 컴포넌트 적용 (AppSkeleton, AppErrorState, StatCard) ✅
  - [x] Phase 4: Schedule 고도화 → 💻 **Developer (Sonnet)** ✅
    - [x] 7일 날짜 피커 (월~일 확장, 주 단위 좌우 이동) ✅
    - [x] Waitlist 로직 (정원 초과 시 waitlisted 상태 → fn_book_with_credit 자동 분기) ✅
    - [x] 수업 상세 모달 (SessionDetailModal 연동, 카드 클릭 시 표시) ✅
    - [x] 크레딧 차감 연동 (fn_book_with_credit RPC 호출) ✅
    - [x] 예약 취소 크레딧 환원 (fn_cancel_booking_with_credit RPC 호출) ✅
    - [x] My Bookings 페이지 고도화 (waitlisted 상태 지원, 공통 컴포넌트) ✅
  - [x] Phase 5: Check-in 고도화 → ⚡ **Specialist (Gemini)** ✅
    - [x] QR 만료 타이머 (5분 만료 + mm:ss 표시 + 프로그레스 바 + 자동 갱신) ✅
    - [x] 수동 QR 갱신 버튼 ✅
    - [x] 월간 출석 캘린더 (MonthCalendar 컴포넌트 바인딩, 월 단위 탐색) ✅
    - [x] 출석 통계 패널 (StatCard 3개: 이번 달/연속 출석/출석일 수) ✅
    - [x] 체크인 이력 월 필터 (최근 6개월 셀렉트) ✅
  - [x] Phase 6: Facilities + Profile 고도화 → 🎨 **UI Developer (Gemini)** ✅
    - [x] 시설 지도 연동 (카카오맵 길찾기 링크) ✅
    - [x] 시설 상세 확장 뷰 (전화 걸기, 길찾기, 사진 갤러리 + 확대 모달) ✅
    - [x] 영업 중/종료 뱃지 (현재 시간 기반 Open/Closed) ✅
    - [x] 주소 복사 (navigator.clipboard + 피드백 토스트) ✅
    - [x] 프로필 사진 업로드 (Supabase Storage 연동 + 카메라 버튼) ✅
    - [x] 프로필 편집 필드 확장 (전화번호, 생일, 긴급 연락처) ✅
    - [x] 설정 서버 동기화 (members.preferences ↔ profiles.notification_settings 양방향) ✅
    - [x] 메뉴 뱃지 (예약 수 카운트, 미읽음 알림) ✅
    - [x] Quick Stats 패널 (총 체크인, 총 예약, 잔여 크레딧) ✅
    - [x] 멤버십 만료 경고 (D-7 이하 시 경고 표시) ✅
    - [x] 언어/테마 설정 추가 ✅
  - [x] Phase 7: 문서 동기화 → 🏛️ **Architect (Opus)** ✅
    - [x] project-blueprint.md 갱신 (Phase 4~7 완료 처리) ✅
    - [x] Active Context 업데이트 ✅

#### ✅ Priority 13: 배지 시스템 고도화 (완료)
  > **기획서**: `.docs/archive/planning/badge-system.md`
  > **문제**: 배지 15개가 코드 하드코딩(BADGE_DEFINITIONS), 달성 기록 미저장(earnedDate 항상 now()), WOD/PR 카운트 로직 버그 4건, Admin 관리 화면 없음
  > **방안**: badge_definitions + badge_awards 테이블 신규 → DB Trigger 4개 + RPC 3개로 자동 달성 판정 → Admin CRUD 화면 → User 화면 리팩토링

  - [x] Phase 1: DB 스키마 + RPC + Trigger → 💎 **Senior Dev (Opus)** ✅
    - [x] badge_definitions, badge_awards 테이블 생성
    - [x] RLS 정책 적용 (8개)
    - [x] fn_calculate_badge_progress (10 metric_type), fn_evaluate_badges, fn_get_my_badges 생성
    - [x] Trigger 4개 생성 (checkins, session_feedback, race_records, transactions)
    - [x] 총 21개 배지 초기 데이터 INSERT
  - [x] Phase 2: Admin 배지 관리 화면 → 🎨 **UI Developer (Gemini)** ✅
    - [x] /admin/operations/badges CRUD 화면
    - [x] BadgeFormModal (추가/수정)
    - [x] Sidebar 메뉴 추가
  - [x] Phase 3: User 배지 화면 리팩토링 → 💻 **Developer (Sonnet)** ✅
    - [x] 하드코딩 제거, RPC 호출 전환
    - [x] 기존 UI 유지하며 데이터 소스만 교체
  - [x] Phase 4: 문서 동기화 → 🏩 **Architect (Opus)** ✅
    - [x] sitemap + database-reference + blueprint 갱신

#### ✅ Priority 15: 성능 최적화 (완료)
  > **출처**: `.docs/archive/TODO_NEXT_STEPS.md`
  > **방안**: 이미지 최적화 → 코드 스플리팅 → 쿼리 최적화 순으로 진행

  - [x] Phase 1: 이미지 최적화 → 🎨 **UI Developer (Gemini)** ✅
    - [x] Next.js Image 컴포넌트 적용 (profile, branch, feedback)
    - [x] next.config remotePatterns 설정 (Supabase Storage 자동 WebP 변환)
  - [x] Phase 2: 코드 스플리팅 → 💻 **Developer (Sonnet)** ✅
    - [x] QRCodeSVG `next/dynamic` 동적 로딩 적용
    - [x] @faker-js/faker, dotenv → devDependencies 이동
  - [x] Phase 3: Supabase 쿼리 최적화 → 💎 **Senior Dev (Opus)** ✅
    - [x] DB 인덱스 15개 추가 (checkins, bookings, sessions, memberships, notifications, members, transactions, lockers)

#### ✅ Priority 16: QR 체크인 시스템 재설계 (완료)
  > **기획서**: `.docs/archive/planning/checkin-qr-system.md`
  > **문제**: QR 생성(랜덤 토큰)과 인증(JSON/DB 조회) 로직 불일치로 체크인 항상 실패
  > **방안**: QR 페이로드에 member_id JSON 인코딩 + 수업 예약 자동 감지 체크인 분기

  - [x] Phase 1: QR 생성 로직 수정 (앱) → ⚡ **Specialist (Gemini)** ✅
    - [x] 회원 member_id 조회 (auth.getUser → members)
    - [x] facility_id 결정 로직
    - [x] QR 페이로드 JSON 포맷 적용
    - [x] 5분 타이머 + ts 갱신 연동
  - [x] Phase 2: QR 인증 로직 수정 (키오스크) → ⚡ **Specialist (Gemini)** ✅
    - [x] JSON 파싱 + 타임스탬프 검증
    - [x] members 테이블 회원 존재 확인
    - [x] bookings/sessions 수업 예약 자동 확인
    - [x] 체크인 유형 분기 (시설/수업)
    - [x] 중복 체크인 방지
    - [x] 성공 화면 데이터 전달
  - [x] Phase 3: 성공 화면 개선 (키오스크) → ⚡ **Specialist (Gemini)** ✅
    - [x] 체크인 유형별 UI 분기
    - [x] 회원 이름 + 수업 정보 표시
    - [x] 자동 복귀 타이머
  - [x] Phase 4: RLS 정책 확인 및 보완 → 💎 **Senior Dev (Opus)** ✅
    - [x] 키오스크 인증 방식 확인 (anon key 사용)
    - [x] RLS 정책 확인 (에러 핸들링 완비)
  - [x] Phase 5: 문서 동기화 → 🏛️ **Architect (Opus)** ✅
    - [x] sitemap 갱신
    - [x] blueprint 반영

#### 🟡 Priority 14: 알림 시스템 실 가동 QA (개발 대기 — 운영 환경 의존)
  > **출처**: `.docs/archive/TODO_NEXT_STEPS.md`
  > **문제**: 알림 시스템 코드 완료 상태이나 pg_cron, DB 트리거, Web Push, 외부 채널(카카오/SMS) 실 발송 검증 미완료
  > **방안**: 각 채널별 단계적 실 발송 테스트 → 운영 환경 적용
  > **비고**: Phase 3~4는 프로덕션 배포 + 외부 서비스 계약 필요하여 후순위 배치

  - [ ] Phase 1: pg_cron 작동 확인 → 💻 **Developer (Sonnet)**
    - [ ] `class-reminder-every-10min` 크론 실행 이력 확인
    - [ ] `membership-expiry-daily-9am` 크론 실행 이력 확인
    - [ ] 테스트 수업 데이터 생성 후 자동 알림 생성 확인
  - [ ] Phase 2: DB 트리거 테스트 → 💻 **Developer (Sonnet)**
    - [ ] 빈자리 알림 트리거 (예약 취소 → 대기열 알림)
    - [ ] 체크인 완료 알림 트리거 (격려 메시지 자동 생성)
  - [ ] Phase 3: Web Push 실제 발송 → ⚡ **Specialist (Gemini)**
    - [ ] Android/Desktop 브라우저 Push 수신 확인
    - [ ] iOS PWA Push 수신 확인
  - [ ] Phase 4: 외부 채널 연동 → 💎 **Senior Dev (Opus)**
    - [ ] 카카오 비즈메시지 API 키 발급 + 템플릿 승인
    - [ ] SMS 서비스(알리고/네이버 SENS) API 연동
    - [ ] Edge Function 실제 API 교체 + 재배포

#### ✅ Priority 17: Known Issues 일괄 정비 (완료)
  > **기획서**: `.docs/archive/planning/known-issues-cleanup.md`
  > **문제**: user_id/member_id 혼용으로 데이터 조회 불일치 위험 + `as any` 32개 파일 타입 안전성 부재
  > **방안**: AuthContext 확장 → member_id 혼용 수정 → query() 헬퍼 일괄 전환

  - [x] Phase 1: AuthContext 확장 + useMemberId 훅 → 💻 **Developer (Sonnet)** ✅
    - [x] AuthContext에 `memberId` 필드 추가
    - [x] 로그인 시 `members.id` 조회 후 Context에 저장
    - [x] `fetchMemberId()` 유틸 함수 신규 생성
  - [x] Phase 2: member_id 혼용 수정 → 💻 **Developer (Sonnet)** ✅
    - [x] `apps/dashboard/page.tsx` — 2차 병렬 쿼리 구조 리팩토링
    - [x] `apps/records/page.tsx` — loadData/saveWod/savePR 3건 수정
    - [x] `apps/checkin/page.tsx` — memberships/checkins/캘린더 쿼리 수정
    - [x] `apps/feedback/page.tsx` — loadData/handleSubmit 3건 수정
    - [x] `apps/profile/page.tsx` — memberships/checkins/bookings 수정
    - [x] 전수 검사 완료 (grep 기반 확인)
  - [x] Phase 3: Supabase 타입 정리 (as any 제거) → 💻 **Developer (Sonnet)** ✅
    - [x] `createClient() as any` → `query()` 헬퍼 전환 (58개 파일)
    - [x] `(supabase as any).rpc()` → `rpc()` 헬퍼 전환
    - [x] auth 관련 호출은 `createClient()` 유지
    - [x] 빌드 검증 완료 (0 errors)
  - [x] Phase 4: 코치 방어 코드 + 문서 동기화 → 💻 **Developer (Sonnet)** ✅
    - [x] Admin 코치 관리 탭 미연결 경고 배너 추가 (active 코치 중 user_id=null 카운트)
    - [x] Admin 정산 탭 테이블에 미연결 코치 ⚠️ 표시 추가
    - [x] Known Issues 상태 갱신 (RESOLVED)
    - [x] 버전 갱신 + blueprint/sitemap 동기화


#### ✅ Priority 18: 코치 기능 고도화 (완료)
  > **기획서**: `.docs/archive/planning/coach-feature-enhancement.md`
  > **문제**: Coach App 5화면 완성도 ~55%, Admin 성과/정산 Mock 데이터, coaching_notes DB 미존재, User App 코치 프로필 불완전
  > **방안**: coaching_notes + coach_settlements 테이블 + RPC 6개 → Coach App 전체 고도화 → Admin 실 데이터 교체 → User 코치 목록 개선

  - [x] Phase 1: DB 인프라 (coaching_notes + coach_settlements + RPC 6개) → 💎 **Senior Dev (권장: Opus)**
    - [x] coaching_notes 테이블 생성 + RLS
    - [x] coach_settlements 테이블 생성 + RLS
    - [x] fn_get_coach_dashboard RPC 생성
    - [x] fn_get_session_attendees RPC 생성
    - [x] fn_coach_mark_attendance RPC 생성
    - [x] fn_get_coach_performance_stats RPC 생성
    - [x] fn_calculate_monthly_settlement RPC 생성
    - [x] database-reference.md 갱신
  - [x] Phase 2: Coach Dashboard + Schedule 고도화 → 🎨 **UI Developer (권장: Gemini)**
    - [x] Dashboard RPC 전환 (예약/출석 인원 표시)
    - [x] Dashboard 주간 수업 표시
    - [x] Schedule 수업 상세 모달 + 출석체크 + WOD 편집
  - [x] Phase 3: Coach Members 코칭 노트 시스템 → 💻 **Developer (권장: Sonnet)**
    - [x] coaching_notes CRUD + 타입 필터
    - [x] 다건 노트 이력 (시간순 + 필터 + 삭제)
    - [x] 회원 출결 통계 (총 출석, 이달 출석, 출석률)
    - [x] 담당 회원 필터 (전체/담당)
  - [x] Phase 4: Coach Profile 고도화 → 🎨 **UI Developer (권장: Gemini)**
    - [x] 프로필 편집 (bio, specialties, phone 수정)
    - [x] 프로필 이미지 표시 + 업로드
    - [x] 급여 조회 섹션 (coach_settlements 조회)
    - [x] 비활성 메뉴 정리 (알림/보안 제거)
  - [x] Phase 5: Admin Performance + Settlements 실 데이터 → 💻 **Developer (권장: Sonnet)**
    - [x] Performance 탭 Mock → 실 DB 교체 (fn_get_coach_performance_stats)
    - [x] Settlements 탭 정산 계산 연동 (fn_calculate_monthly_settlement)
    - [x] Settlements KPI 실 데이터 (총 지급액, 정산 현황, 미정산)
    - [x] 정산 상태 변경 (pending → confirmed → paid)
    - [x] 정산 다운로드 (CSV)
    - [x] 월별 정산 조회 (월 선택기)
    - [x] Settlements 탭을 tabs 배열에 통합
  - [x] Phase 6: User App 코치 목록 + Coach Race 개선 → 🎨 **UI Developer (권장: Gemini)**
    - [x] User App 코치 목록: profile_image_url, bio, specialties 정상 표시
    - [x] User App 코치 상세: 평균 평점, 수업 목록
    - [x] User App 코치 상세: bio 표시
    - [x] Coach Race: 이벤트 생성/상태 변경 UI
    - [x] Coach Race: 기록 입력 UI
  - [x] Phase 7: 문서 동기화 → 🏛️ **Architect (권장: Pro High)**
    - [x] project-blueprint.md 갱신

#### ✅ Priority 19: Race 시스템 — 전체 구현 (완료)
  > **기획서**: `.docs/archive/planning/race-system.md`
  > **문제**: Race 시스템의 전체 파이프라인 미구현. PM5 BLE 데이터 수집/레코딩 없음, 2.5D 렌더링 미개발, 팀전/배정/결과 저장 로직 없음.
  > **방안**: DB 확장(6테이블) → Python BLE+JSONL 레코딩 → 프론트엔드 기기 등록/배정 UI → Realtime 훅 → 시뮬레이터 → 2.5D 렌더링(CSS 3D+Canvas) → 결과 적재

  - [x] Phase A: DB 확장 (pm5_devices + race_live_state + race_recordings + race_teams + race_events/records 확장) → 💎 **Senior Dev (권장: Opus)**
    - [x] pm5_devices 컬럼 추가 (mac_address, ble_name, current_mode, qr_identifier) + device_type CHECK 확장
    - [x] race_live_state 테이블 생성 (Ephemeral — 재접속 복원용)
    - [x] race_recordings 테이블 생성 (JSONL 파일 메타데이터)
    - [x] race_teams 테이블 생성 (팀전 지원)
    - [x] race_events 확장 (race_format, session_id, coach_id, target_distance_m, lobby_status)
    - [x] race_records 확장 (max_watts, max_hr_bpm, avg_spm, avg_hr_bpm, recording_id, team_id, lane_number, finish_rank) + event_id NULLABLE
    - [x] RLS 정책 (Coach/Admin 쓰기, 인증 사용자 읽기) — 3테이블
    - [x] 인덱스 (race_live_state, race_recordings, race_teams)
  - [x] Phase B: Python 서버 확장 (race/ — BLE + JSONL 레코딩) → ⚡ **Specialist (권장: Sonnet)**
    - [x] race/pm5_spec.py (레거시 PM5 BLE UUID 상수 이식)
    - [x] race/pm5_parsers.py (레거시 BLE 패킷 파싱 — stroke_distance, stroke_power, spm, hr, cal, max_watts)
    - [x] race/pm5_manager.py (Bleak BLE 스캔/연결/구독 — 다중 동글 분산)
    - [x] race/recorder.py (JSONL 파일 기반 — {event_id}/{device_serial}.jsonl 형태 Append)
    - [x] race/main.py 확장 (BLE 스캔/등록/연결 API + 레코딩 API + Supabase Broadcast 발행)
    - [x] race/main.py: race_live_state 5초 간격 스냅샷 UPSERT 로직
    - [x] race/main.py: race_status READY 시 Early Start 데이터 무시 처리
    - [x] requirements.txt에 bleak 추가
    - [x] Dockerfile port 8001로 변경
    - [x] Supabase Service Role Key 환경 변수 설정
  - [x] Phase C: 프론트엔드 — 기기 등록 + 레코딩 제어 UI → 🎨 **UI Developer (권장: Gemini)**
    - [x] Admin 기기 등록 모달 개선 (Web Bluetooth 스캔 → 시리얼 파싱 → 자동 등록)
    - [x] Coach Race Control 페이지 (/coach/race/control) — 레이스 룸 설정, 기기/포맷 선택
    - [x] 레인 배정 UI (출석 기반 자동 배정 + QR 자율 배정)
    - [x] 연결 상태 실시간 표시 (Supabase Realtime 연동)
    - [x] 레코딩 시작/중지 컨트롤
    - [x] 실시간 모니터링 그리드 뷰 (/class/race/run)
    - [x] 레코딩 목록/상세 조회
  - [x] Phase 1: Realtime 인프라 (useRaceRealtime 훅 + 상태 관리) → 💻 **Developer (권장: Sonnet)**
    - [x] useRaceRealtime 커스텀 훅 (Supabase Broadcast Subscribe)
    - [x] race_live_state 스냅샷 기반 재접속 복원 로직
    - [x] 레이스 상태 머신 (setup→lobby→countdown→racing→finished)
    - [x] 팀전 거리 합산 로직 (team_id별 distance 클라이언트 합산)
  - [x] Phase 2~4: 시뮬레이터 + 그리드 뷰 + BLE 연동 → ⚡ **Specialist (권장: Gemini)**
    - [x] JSONL Replay 기반 시뮬레이터 (9레인 다중 브로드캐스트)
    - [x] ERG 실시간 그리드 뷰 화면 (/class/race/run)
    - [x] Python BLE ↔ 프론트엔드 통합 안정화
  - [x] Phase 5-A: 2.5D 개발 준비 — HUD + 평면 LERP 이동 → ⚡ **Specialist (권장: Gemini)**
    - [x] rAF 기반 애니메이션 컨트롤러 (useRef + DOM 직접 조작)
    - [x] LERP 보간 엔진 (prevDistance → targetDistance 보간)
    - [x] HUD 바인딩 (순위표, 타이머, 거리 표시)
  - [x] Phase 5-B: 2.5D 그래픽 — CSS 3D + 캐릭터 + 물 이펙트 → ⚡ **Specialist (권장: Gemini)**
    - [x] CSS 3D Transform 원근감 트랙
    - [x] 로잉 캐릭터 스프라이트 애니메이션 (SPM 연동)
    - [x] Canvas 2D 물 파티클 이펙트
    - [x] 대기방(Starting Pen) 게이미피케이션 연출
  - [x] Phase 5-C: 2.5D 폴리싱 — Edge Case + 최적화 → ⚡ **Specialist (권장: Gemini)**
    - [x] 선두 이펙트 (1위 하이라이트)
    - [x] 네트워크 단절: Grayscale + [Reconnecting] 배지
    - [x] 기기 오프라인: IDLE 애니메이션 + [Offline] 상태
    - [x] 메모리 최적화 (20레인 동시 렌더링)
  - [x] Phase 6: 결과 적재 + 리더보드 → 💻 **Developer (권장: Sonnet)**
    - [x] JSONL → race_records 요약 추출 및 적재 (Python 서버)
    - [x] race_recordings 메타데이터 INSERT
    - [x] 결과 리더보드 화면 (/class/race/result) — 다각도 컴피티션 (Max Watts, HR, 칼로리)
    - [x] PR(Personal Record) 판정 및 is_pr 플래그
  - [x] Phase 7: 문서 동기화 → 🏛️ **Architect (권장: Pro High)**
    - [x] sitemap 갱신 (coach-app, class-portal 화면 추가 반영 확인)
    - [x] database-reference.md 갱신 (race_live_state, race_recordings, race_teams 추가)
    - [x] project-blueprint.md 갱신

#### ✅ Priority 20: 출시 전 정비 — Release Readiness Stabilization (완료)
  > **기획서**: `.docs/archive/planning/release-readiness-stabilization-task.md`
  > **감사보고서**: `.docs/archive/audit/audit-pm-gap-analysis-20260419.md`, `.docs/archive/audit/audit-full-project-20260419.md`
  > **문제**: 품질 게이트 부재(lint 76 errors, test 미정의), 문서-코드 드리프트(README Next.js 14 vs 실제 16, version 0.4.0 vs 0.5.0), 외부 알림 mock 상태, 보안 문서 과장, 운영 지표 TODO 잔존
  > **방안**: P0(품질 게이트+문서 기준선+운영 범위) → P1(보안 정렬+지표 연결+Race 수용) → P2(감사 체계화) 순서로 출시 기준선 정비

  - [x] Phase 1: 품질 게이트 복구 (P0) → 💻 **Developer** ✅
    - [x] lint 오류 분류 (react-compiler 규칙 warn 완화, unescaped-entities 코드 수정)
    - [x] `package.json`에 `typecheck` 스크립트 추가 (`tsc --noEmit`)
    - [x] `npm run lint` failure 해소 (76 errors → 0 errors)
    - [x] 배포와 분리된 품질 CI 워크플로우 신설 (`.github/workflows/quality.yml`)
  - [x] Phase 2: Release Baseline 문서/버전 동기화 (P0) → 🏛️ **Architect** ✅
    - [x] README 정리 (실제 스택 Next.js 16.1.6, React 19.2.3, 모듈별 운영 상태 명시)
    - [x] 주요 명령어 정리 (`typecheck` 추가, 없는 명령어 제거)
    - [x] 운영 가능/미운영 기능 표 추가 (알림 mock 상태 명시)
  - [x] Phase 3: 운영 범위 명확화 (P0) → 💎 **Senior Dev** ✅
    - [x] 외부 알림 v1 제외 결정 — Edge Function에 ⚠️ MOCK 상태 명시
    - [x] README에 알림 시스템 운영 상태 분리 표기
    - [x] Priority 14 운영 의존 대기 상태 유지 (blueprint 명확 분리)
  - [x] Phase 4: 보안 문서-구현 정렬 (P1) → 💎 **Senior Dev (Opus)** ✅
    - [x] 구현된 통제 식별 (middleware, nginx, auth guard 기준 확인) — `src/proxy.ts`, `nginx-host.conf`, Supabase Auth/RLS
    - [x] 보안 문서 재분류 (적용 완료 / 부분 적용 / 향후 계획) — `.docs/security/README.md` v2.0.0
    - [x] 누락된 최소 보안 항목 반영 — `nginx-host.conf`에 `server_tokens off`, `Permissions-Policy` 추가 + HSTS/Rate Limit 주석 템플릿
  - [x] Phase 5: 운영 지표 TODO 제거 (P1) → 💻 **Developer** ✅
    - [x] 지원 지표 정의 (pending=open|in_progress, today=오늘 생성, urgent=priority urgent+open, recent=최근 미처리 2건)
    - [x] `support_tickets` 기반 실제 쿼리 연결 (4건: support_pending_count, support_today_count, support_urgent_count, support_recent_tickets)
    - [x] members FK 조인으로 회원명 표시 (support_tickets_member_id_fkey)
  - [x] Phase 6: Race 운영 수용 기준 수립 (P1) → ⚡ **Specialist (Opus)** ✅
    - [x] Acceptance checklist 작성 (BLE, 운영 상태 머신, Realtime/Reconnect, Recording/Results, Cleanup, 권한) — `.docs/testing/race-acceptance-checklist.md`
    - [x] 시뮬레이터/실장비 검증 4단계 구분(L1~L4) 명시
    - [x] Race 관련 코드 TODO/Mock 잔존 0건 확인 (race/, useRaceRealtime, useRaceAnimator)
  - [x] Phase 7: 감사/문서 운영 체계화 (P2) → 🏛️ **Architect (Opus)** ✅
    - [x] audit-planning 참조 규칙 정리 — `.docs/process/documentation-governance.md` §1.2
    - [x] release checklist 정의 — `.docs/process/release-checklist.md` (10개 섹션)
    - [x] 갱신 책임 매트릭스 명시 — `.docs/process/documentation-governance.md` §2

#### 🟡 Priority 21: Race System Improvements (Phase 1~3 완료, Phase 4 운영 검증 대기)
  > **기획서**: `.docs/archive/planning/race-system-improvement-20260425.md`
  > **문제**: Race 시스템의 결과 마감 자동화, 스냅샷 정합성, 장비 상태 동기화 등 운영 단계 수용 미비
  > **방안**: 결과 적재 자동화 + snapshot/identity 정합성 + 팀전 연동 + 운영 수용 재검증

  - [x] Phase 1: DB 정합성 및 Backend 파이프라인 → 💎 **Senior Dev (Opus)** ✅
    - [x] Race 종료(`stop`) 시 `race_records` 적재 자동화 로직 통합 — `_load_race_results()` 헬퍼 분리 + stop 액션에서 자동 호출 + 멱등성 보장
    - [x] Recorder 메타데이터(`lane_assignments`) 완전 저장 — race_setup이 lane_assignments를 recorder meta에 합쳐 `_meta.json`에 영속화
    - [x] 시뮬레이터 `device_id` 전략 확정 — `_ensure_simulator_devices()`로 synthetic `pm5_devices` upsert + lane_assignments에 device_id 채움 + snapshot loop에 device_id 가드 추가
  - [x] Phase 2: Frontend Data 정합성 및 팀전 연동 → 💻 **Developer (Sonnet)** ✅
    - [x] `pm5_devices.status` 필터: `'active'` → `'online'` (DB enum과 정합)
    - [x] BLE Connect 시 `adapter` Payload 포함 (다중 동글 분산)
    - [x] `race_live_state` snapshot 복원: `device_id` FK 기준 + `pm5_devices(serial_number)` JOIN으로 BLE serial 매핑
    - [x] LaneData에 `device_id` 필드 추가 (broadcast/snapshot 양쪽에서 채움)
    - [x] `race_teams` 데이터 로드 + 팀 생성/색상 선택 UI + 레인별 팀 배정 UI (Coach Control)
    - [x] useRaceRealtime이 `race_teams` 메타(name/color)를 DB에서 로드하여 하드코딩 `#FF6A00` 제거
  - [x] Phase 3: 품질 최적화 및 문서 동기화 → 🏛️ **Architect (Opus)** ✅
    - [x] Race 도메인 unused import / hint 정리 (coach race control, useRaceRealtime)
    - [x] `README.md` Race 시스템 상태 문구 동기화 (코드 완료 + 운영 수용 진행 중)
    - [x] blueprint Active Context + Priority 21 체크박스 갱신
  - [ ] Phase 4: 운영 수용 재검증 → ⚡ **Specialist (권장: Codex/Gemini)**
    - [ ] `.docs/testing/race-acceptance-checklist.md` 기준 L1~L4 재실행
    - [ ] 결과 적재, reconnect, simulator, team race, cleanup 재검증
    > 비고: 본 Phase는 실장비(L2~L4) 또는 시뮬레이터(L1) 환경에서 수동 검증 필요. 코드 변경 없음.

#### 🟢 Priority 22: 코치앱 P0 운영 안정화 (구현 완료, 빌드 검증 진행 중)
  > **기획서**: `.docs/archive/planning/coach-app-master-plan-20260425.md` · 실행 스펙: `.docs/archive/planning/coach-app-p0-execution-20260425.md`
  > **문제**: 코치앱의 권한 검증이 클라이언트 입력에 일부 의존하며, `미연결/미배정 코치` 상태가 제품 상태로 분리돼 있지 않고, 실제 현장 출결(`no_show`, `late_cancel`, `coach_excused`)과 세션 단위 운영 흐름이 부족함.
  > **방안**: `auth.uid()` 기반 권한 재설계, `bookings`/`session_coaches` 확장, 코치 상태 게이트웨이, 세션 운영 보드(Session Operations Board), Dashboard/Schedule/Members/Profile의 P0 정합성 정리.

  - [x] Phase 1: DB 마이그레이션 및 신규 RPC 도입 → 💎 **Senior Dev (Opus)** ✅
    - [x] `bookings` 확장: `attendance_outcome`, `attendance_marked_at`, `attendance_marked_by`, `waitlist_promoted_at`, `cancel_reason` (`supabase/migrations/20260425120000_coach_p0_session_ops.sql`)
    - [x] `session_coaches` 확장: `assignment_role`, `display_order`
    - [x] 신규 RPC 6종 구현: `fn_get_my_coach_context`, `fn_get_my_coach_dashboard`, `fn_get_coach_schedule`, `fn_get_coach_session_board`, `fn_mark_session_attendance`, `fn_bulk_mark_session_attendance`
    - [x] 기존 `fn_get_coach_dashboard`, `fn_get_session_attendees`, `fn_coach_mark_attendance`을 DEPRECATED COMMENT로 마킹 (즉시 삭제 시 호환성 위험 회피)
  - [x] Phase 2: 코치 상태 게이트웨이 및 공통 컴포넌트 구현 → 🎨 **UI Developer (Opus)** ✅
    - [x] `CoachStateGate`, `CoachStateScreen`, `AttendanceOutcomeChip`, `useCoachContext` 훅 구현 (`src/components/coach/`)
    - [x] `src/app/coach/layout.tsx`에 상태 기반 진입 제어 적용 (`unlinked`, `linked_unassigned`, `linked_active`, `on_leave`) — `/coach/profile`은 항상 통과
    - [x] 기존 상단 배너 기반 미연결 처리 제거
  - [x] Phase 3: 세션 운영 보드 및 Schedule 리팩터링 → 💻 **Developer (Opus)** ✅
    - [x] `SessionOperationsBoard` 컴포넌트 구현 (세션 헤더, 7개 운영 요약, 참석자 리스트, 빠른 액션 바, 대기열)
    - [x] `Schedule` 로딩을 `fn_get_coach_schedule()`로 전환 + race 연동 배지/카운트 노출
    - [x] 세션 클릭 시 `fn_get_coach_session_board()` 연동 + `?session_id=` 자동 진입
    - [x] 개별/일괄 출결 처리 (`checked_in`, `no_show`, `late_cancel`, `coach_excused`) 구현
    - [x] 기존 WOD 수정 기능 유지
  - [x] Phase 4: Dashboard, Members, Profile 정합성 정리 → 💻 **Developer (Opus)** ✅
    - [x] `Dashboard`를 `fn_get_my_coach_dashboard()` 연동으로 교체
    - [x] Dashboard에 `waitlist`, `unchecked confirmed`, `곧 시작할 세션` 요약 + Next Session CTA 카드 반영
    - [x] `Members` 기본 스코프를 `담당 회원`으로 변경, `시설 전체` 사용 안내 추가
    - [x] `Profile`에 코치 상태 배지(활동 중/배정 대기/휴직/미연결) 및 상태별 통계/메뉴 노출 정책 반영
  - [x] Phase 5: 문서 동기화 및 수용 검증 → 🏛️ **Architect (Opus)** 🔄
    - [x] `.docs/sitemap/coach-app.md` P0 반영 (RPC 인터페이스, 출결 상태기계, `session_coaches` 확장)
    - [x] blueprint/Active Context 갱신
    - [ ] 권한/세션 운영/출결/회귀 테스트 체크리스트 검증 (typecheck → lint → build → 수용 시나리오)

#### 🟢 Priority 23: 코치앱 P1-A 수업 표준화 및 회원 컨텍스트 (구현 완료, 빌드 검증 통과)
  > **기획서**: `.docs/archive/planning/coach-app-master-plan-20260425.md` §9 · **Apply 가이드**: `.docs/database/migrations/20260426_priority23_p1a_apply.md`
  > **문제**: P0 이후에도 코치가 수업 전 준비를 시스템으로 표준화할 수 없고, Trial/부상/만기 예정 등 회원 맥락이 구조화되어 있지 않으며, WOD가 `sessions.wod_description`와 `/class/wod`의 분리된 소스로 관리되어 Admin/Coach/Class Display 사이에 공통 자산으로 공유되지 않음.
  > **방안**: 클래스 런시트 템플릿 + 세션 런시트 + 공통 WOD 라이브러리/세션 WOD 스냅샷 + 회원 컨텍스트 플래그를 도입하여 수업 품질과 현장 판단을 시스템화.
  > **의존성**: Priority 22 완료 후 착수 권장

  - [x] Phase 1: DB 스키마 및 권한 설계 → 💎 **Senior Dev (Opus)**
    - [x] `class_runbook_templates`, `session_runbooks`, `movement_library`, `wod_templates`, `wod_template_movements`, `session_wods`, `member_alert_flags` 테이블 설계 및 RLS 적용 (`supabase/migrations/20260426120000_p1a_class_standardization.sql`)
    - [x] `.docs/planning/wod_exercise_list.md`를 `movement_library` + benchmark seed로 변환 (35 movements + 10 benchmark WODs)
    - [x] 템플릿/런시트/WOD/회원 플래그 CRUD용 RPC 14종 설계 (`fn_list/get/upsert/publish_wod_template`, `fn_search_wod_movements`, `fn_get/upsert/publish_session_wod`, `fn_get_class_display_wod`, `fn_list_runbook_templates`, `fn_upsert_runbook_template`, `fn_get/upsert_session_runbook`, `fn_get_member_context_panel`, `fn_upsert_member_alert_flag`)
  - [x] Phase 2: Schedule 런시트 편집 도입 → 🎨 **UI Developer**
    - [x] 세션 운영 보드 내 `warm-up`, `movement prep`, `scaling`, `cue`, `safety`, `finish note` 편집 UI (`SessionRunbookPanel.tsx`, 6 tabs + 템플릿 오버라이드)
    - [x] Admin/Coach 공통 WOD Builder: 포맷, time cap, rounds, movement line, RX/scale, coach/class note 편집 UX (`SessionWodPanel.tsx` + `/admin/operations/wod-templates`)
    - [x] 최근 사용 템플릿 불러오기 및 세션별 오버라이드 UX (benchmark/facility/shared 스코프)
  - [x] Phase 3: Members 및 Session Board 컨텍스트 강화 + Class WOD 소스 통합 → 💻 **Developer**
    - [x] Admin에서 만든 공유 WOD 템플릿을 Coach 세션 보드에서 선택/복제/게시 가능하도록 연결
    - [x] `/class/wod`를 `fn_get_class_display_wod` 표준 소스로 전환 (60s 자동 갱신)
    - [x] 기존 `sessions.wod_description` 백필/호환 계층 정리 (DEPRECATED 주석, fallback only)
    - [x] Trial, injury, renewal_due, returning_after_absence 등 플래그 표시 (`MemberContextPanel.tsx`)
    - [x] `Members` 화면 상세 프로필에 활성 플래그/최근 코칭 노트/출석 패턴 반영
    - [x] Dashboard에 오늘 경고 요약(Trial/만기예정/주의회원) 반영 (`TodayAlertSummary.tsx`)
  - [x] Phase 4: 문서 및 테스트 → 🏛️ **Architect**
    - [x] `.docs/sitemap/coach-app.md` P1-A 반영
    - [x] `npx tsc --noEmit` / `npm run lint` (0 errors) / `npm run build` 통과
    - [ ] 템플릿 적용, 세션 오버라이드, WOD 공유/게시, 플래그 노출 권한 수동 수용 테스트 (마이그레이션 적용 후)

#### ✅ Priority 24: 코치앱 P1-B KPI/정산/스크린 모드 (완료 2026-05-30)
  > **기획서**: `.docs/archive/planning/coach-app-master-plan-20260425.md`
  > **문제**: 코치가 월간 운영 성과, 예상 정산, 재등록 리스크를 한 눈에 볼 수 없고, 현장 공개 보드(Screen Mode)가 부재함.
  > **방안**: KPI/리텐션/예상 정산 집계 계층과 Coach 화면 요약 위젯, Screen Mode/Class Board를 구축.
  > **의존성**: Priority 22 완료 후 착수 권장

  - [x] Phase 1: 집계 뷰 및 RPC 도입 → 💎 **Senior Dev**
    - [x] `fn_get_coach_monthly_settlement_basis` Basis Layer 도입
    - [x] `fn_get_coach_monthly_kpis` 구현 (출석률/no-show/만기예정/예상정산 통합)
    - [x] `fn_get_coach_retention_panel` 구현 (만기 예정 + 장기 미출석)
    - [x] 인덱스 최적화 5개 추가 (session_coaches, sessions, bookings, memberships)
    - [x] 정산 책임 분리: Admin=정산 실행/상태 변경, Coach=예상/확정 정산 조회
  - [x] Phase 2: Coach Dashboard/Profile KPI 반영 → 💻 **Developer**
    - [x] `Dashboard`에 Monthly KPI Snapshot 반영 (compact mode)
    - [x] `Profile`에 KPI full mode + 예상 정산 + Retention Panel 반영
    - [x] Coach 화면은 read-only 원칙 유지
  - [x] Phase 3: Screen Mode / Class Board 구현 → 🎨 **UI Developer**
    - [x] `/class/screen` 현장 공개 보드 화면 설계
    - [x] 클래스명, 시간, 담당 코치, 출결 현황, 오늘 WOD, PR 표시
    - [x] 민감 정보 비노출 규칙 적용 (Display-Safe)
  - [x] Phase 4: 문서/정합성 동기화 → 🏛️ **Architect**
    - [x] `database-reference.md` v2.4.0 갱신
    - [x] `.docs/sitemap/class-portal.md` Screen Mode 추가
    - [x] `project-blueprint.md` 완료 처리

#### 🔵 Priority 25: 코치앱 P2 퍼포먼스/후속 액션/Race 재통합 (개발 대기)
  > **기획서**: `.docs/archive/planning/coach-app-master-plan-20260425.md`
  > **문제**: Race가 코치 운영 흐름과 분리돼 있고, 일반 수업용 퍼포먼스 기록(PR/Benchmark)과 수업 후 후속 관리 체계가 없음.
  > **방안**: 퍼포먼스 시스템 일반화 + 후속 조치 태스크 + Race 운영 허브 재통합으로 코치앱을 운영 OS 수준으로 확장.
  > **의존성**: Priority 22 완료 후 착수 권장

  - [ ] Phase 1: 퍼포먼스 스키마 및 RPC → 💎 **Senior Dev (권장: Opus)**
    - [ ] `benchmark_definitions`, `member_benchmark_results`, `coach_followups` 테이블 설계 및 RLS 적용
    - [ ] Benchmark/PR 기록, follow-up 생성/완료, 회원 케어 프로필 RPC 구현
  - [ ] Phase 2: 후속 액션 워크플로우 구현 → 💻 **Developer (권장: Sonnet)**
    - [ ] 수업 후 `injury`, `renewal`, `trial`, `absence`, `motivation` 기반 follow-up 생성
    - [ ] Dashboard/Member 상세에 미완료 후속 조치 노출
    - [ ] 완료/해제 상태 전환 및 due date 관리
  - [ ] Phase 3: Race IA 및 세션 연동 재통합 → 🎨 **UI Developer (권장: Gemini)**
    - [ ] `/coach/race`를 `Live / History / Devices` 허브 구조로 재정의
    - [ ] 세션 운영 보드에서 `Race 수업 시작` 진입 경로 연결
    - [ ] `session_id` 기준 Race 이벤트 생성/재개 UX 정리
  - [ ] Phase 4: 퍼포먼스 데이터 연결 및 검증 → 🏛️ **Architect / Developer**
    - [ ] Race 결과를 회원 퍼포먼스 이력과 연결
    - [ ] 일반 클래스 Benchmark/PR과 Race 기록 조회 정합성 검증
    - [ ] `.docs/sitemap/coach-app.md`, blueprint, 관련 운영 문서 갱신

---

#### ✅ Priority 26: 운동 라이브러리 관리 화면 (코드 완료)
  > **기획서**: `.docs/archive/planning/movement-library-admin.md`
  > **완료**: 2026-05-30 — movement_categories 테이블 + movement_library 미디어 컬럼 + RLS + RPC + UI(마스터-디테일) + 사이드바 등록 + 빌드 통과

  - [x] Phase 1: DB 마이그레이션
    - [x] `movement_categories` 테이블 생성 (slug, name_ko, name_en, color, sort_order, is_active)
    - [x] 기존 8개 카테고리 데이터 이관 INSERT
    - [x] `movement_library`에 `thumbnail_url`, `video_url` 컬럼 추가
    - [x] RLS 정책: `coach` + `admin` role 전체 CRUD 허용
    - [x] `fn_list_movement_library` RPC 생성 (필터·검색·WOD 사용 수 포함)
  - [x] Phase 2: 핵심 CRUD UI
    - [x] 라우팅: `/admin/operations/movement-library` 페이지 생성
    - [x] AdminSidebar에 `Movement Library` 메뉴 추가 (WOD Templates 바로 아래)
    - [x] `useAdminPermissions` + `AdminPermissionGuard`에 경로 등록
    - [x] 목록 테이블: 썸네일/동작명(KO+EN)/카테고리 뱃지/난이도/WOD 사용 수/상태
    - [x] 상단 컨트롤: 카테고리 필터 탭 + 상태 필터 + 검색 + `+ 운동 추가` 버튼
    - [x] 편집 패널 (480px): 기본 정보/미디어/상세 정보/메타 섹션
    - [x] 저장 / 비활성화 / 삭제(2단계 확인) 액션 버튼
  - [x] Phase 3: UX 완성
    - [x] Slug 자동 생성 (영어명 → kebab-case) + 중복 검증 인라인 에러
    - [x] 난이도 별 클릭 인터랙션 (★ 1~5)
    - [x] 기구(equipment) 다중 체크박스 UI
    - [x] 미디어 URL 입력 + 썸네일 미리보기 (Storage 직접 업로드는 후속 Phase에서 가능)
    - [x] 삭제 경고: WOD 사용 수 > 0인 경우 경고 + 비활성화 유도
    - [x] 카테고리 인라인 추가 모달
  - [x] Phase 4: 문서 동기화
    - [x] `.docs/sitemap/admin/03-operations.md` Section 9 추가
    - [x] blueprint 반영 및 Active Context 갱신

---


### Known Issues (Active)
- ✅ ~~**Check-in QR 비표준 렌더링** (RESOLVED): `qrcode.react` QRCodeSVG로 교체 완료. ISO/IEC 18004 규격 QR 코드 생성, 키오스크 스캐너 인식 가능.~~
- ✅ ~~**@supabase/supabase-js 타입 복잡도** (RESOLVED): `src/lib/supabase/query.ts` 헬퍼로 `as any` 캡슐화 완료. 58개 파일에서 `query()` / `rpc()` 헬퍼로 전환 완료. 신규 코드는 반드시 `query()` 헬퍼 사용.~~
- ✅ ~~**코치 계정 미연결** (RESOLVED): Admin 코치 관리 화면에 미연결 경고 배너 + 정산 탭 ⚠️ 표시 추가. promote_to_coach RPC + 관리자 UI로 운영 시 계정 연결 가능. → [기획서](./archive/planning/coach-account-architecture.md)~~
- ✅ ~~**user_id / member_id 혼용** (RESOLVED — Phase 1+2): AuthContext에 memberId 추가, 프론트엔드 5개 파일에서 auth.users.id를 member_id로 직접 사용하던 패턴 전량 수정 완료.~~

### 참고 문서
- **완료 히스토리**: `.docs/archive/complete/project-complete-20260218.md`
- **구현 완성도 감사 (Gemini)**: `.docs/audit/gemini/20260218151644_implementation_audit.md`
- **구현 완성도 감사 (GPT)**: `.docs/audit/gpt/IMPLEMENTATION_COMPLETENESS_AUDIT_2026-02-18_15-17-30.md`
- **Admin 프로덕션 감사**: `.docs/archive/result/admin-production-readiness-audit.md`
- **User App 감사**: `.docs/archive/result/user-app-production-audit.md`
- **DB 스키마 감사**: `.docs/archive/result/DATABASE_SCHEMA_AUDIT_2026-02-17.md`
- **Sitemap SSOT**: `.docs/sitemap/README.md`
- **DB 스키마 참조**: `.docs/database-reference.md`
- **보안 아키텍처**: `.docs/security/README.md` (v2.0.0 — 적용/부분/계획 분리)
- **Race 운영 수용 체크리스트**: `.docs/testing/race-acceptance-checklist.md`
- **문서 거버넌스**: `.docs/process/documentation-governance.md`
- **릴리즈 체크리스트**: `.docs/process/release-checklist.md`

---

## 6. 세션 종료 체크리스트
- [ ] 변경 사항 기록 완료 (이 문서)
- [ ] 다음 작업자를 위한 인수인계 메모 작성
- [ ] `npm run build` 정상 동작 확인
- [ ] 완료된 작업을 `project-complete-YYYYMMDD.md`에 이동
