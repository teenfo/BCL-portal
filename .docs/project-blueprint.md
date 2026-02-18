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
| Coach 앱 | ✅ 완료 | 5/5 화면 |
| Class 포털 | ✅ 완료 | 4/4 화면, DB 연동 |
| User App 품질 개선 | ✅ 완료 | 필터, Settings 영속화 |

### 미구현 (User App 핵심 화면)
- [ ] Home (대시보드) — 기본 UI 존재, 개선 필요
- [ ] Schedule (수업 일정) — 기본 구현 완료, 고도화 대기
- [ ] Check-in (QR 체크인) — QR 표준 라이브러리 교체 필요
- [ ] Facilities (지점 정보) — 기본 구현 완료
- [ ] Profile (프로필 관리) — 기본 구현 완료

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

- **Current Focus**: **Priority 12, 13 블루프린트 등록 완료 → `/develop` 대기**
- **Project Path**: `/Users/kimchoho/dev/workspace/BCL-portal`
- **Build Status**: ✅ `npm run build` 성공
- **Dev Server**: ✅ `npm run dev` 정상 구동 (http://localhost:3000)
- **Last Action**: `/plan-to-blueprint` 실행 — badge-system, user-app-enhancement 2건 등록 + 아카이브 이동

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

  > ※ **PM5/Race 시스템**: 별도 기획서 작성 중 (`.docs/planning/race-system.md`) → 등록 대기

#### 🟠 Priority 12: User App 핵심 화면 고도화 (개발 대기)
  > **기획서**: `.docs/archive/planning/user-app-enhancement.md`
  > **문제**: 5대 핵심 탭(Home, Schedule, Check-in, Facilities, Profile)의 완성도가 55~70% 수준이며, Waitlist/크레딧 차감/QR 만료 갱신/지도 연동/프로필 사진 등 핵심 기능 미구현
  > **방안**: DB 확장(members/facilities 컬럼 추가 + 크레딧 RPC) → 공통 컴포넌트 표준화 → 5대 탭 순차 고도화 → 문서 동기화

  - [ ] Phase 1: DB 확장 + RPC 함수 → 💎 **Senior Dev (Opus)**
    - [ ] members 컬럼 추가 (preferences, phone, birthday, avatar_url 등)
    - [ ] facilities 컬럼 추가 (latitude, longitude, photos)
    - [ ] fn_book_with_credit / fn_cancel_booking_with_credit RPC 생성
    - [ ] RLS/보안 검증
  - [ ] Phase 2: 공통 컴포넌트 표준화 → 🎨 **UI Developer (Gemini)**
    - [ ] AppSkeleton, AppEmptyState, AppErrorState 생성
    - [ ] StatCard, MonthCalendar, SessionDetailModal 생성
  - [ ] Phase 3: Home (Dashboard) 고도화 → 🎨 **UI Developer (Gemini)**
    - [ ] Today's Status 위젯 + 병렬 fetch + 쿼리 수정
  - [ ] Phase 4: Schedule 고도화 → 💻 **Developer (Sonnet)**
    - [ ] 7일 피커 + Waitlist + 수업 모달 + 크레딧 차감/환원
  - [ ] Phase 5: Check-in 고도화 → ⚡ **Specialist (Gemini)**
    - [ ] QR 만료 타이머 + 월간 캘린더 + 출석 통계
  - [ ] Phase 6: Facilities + Profile 고도화 → 🎨 **UI Developer (Gemini)**
    - [ ] 지도 연동 + 시설 상세 + 프로필 사진 + 설정 동기화
  - [ ] Phase 7: 문서 동기화 → 🏛️ **Architect (Opus)**
    - [ ] sitemap + blueprint + database-reference 갱신

#### 🟠 Priority 13: 배지 시스템 고도화 (개발 대기)
  > **기획서**: `.docs/archive/planning/badge-system.md`
  > **문제**: 배지 15개가 코드 하드코딩(BADGE_DEFINITIONS), 달성 기록 미저장(earnedDate 항상 now()), WOD/PR 카운트 로직 버그 4건, Admin 관리 화면 없음
  > **방안**: badge_definitions + badge_awards 테이블 신규 → DB Trigger 4개 + RPC 3개로 자동 달성 판정 → Admin CRUD 화면 → User 화면 리팩토링

  - [ ] Phase 1: DB 스키마 + RPC + Trigger → 💎 **Senior Dev (Opus)**
    - [ ] badge_definitions, badge_awards 테이블 생성
    - [ ] RLS 정책 적용 (8개)
    - [ ] fn_calculate_badge_progress (11 metric_type), fn_evaluate_badges, fn_get_my_badges 생성
    - [ ] Trigger 4개 생성 (checkins, session_feedback, race_records, transactions)
    - [ ] 총 23개 배지 초기 데이터 INSERT
  - [ ] Phase 2: Admin 배지 관리 화면 → 🎨 **UI Developer (Gemini)**
    - [ ] /admin/operations/badges CRUD 화면
    - [ ] BadgeFormModal (추가/수정)
    - [ ] Sidebar 메뉴 추가
  - [ ] Phase 3: User 배지 화면 리팩토링 → 💻 **Developer (Sonnet)**
    - [ ] 하드코딩 제거, RPC 호출 전환
    - [ ] 기존 UI 유지하며 데이터 소스만 교체
  - [ ] Phase 4: 문서 동기화 → 🏛️ **Architect (Opus)**
    - [ ] sitemap + database-reference + blueprint 갱신

---

### Known Issues (Active)
- ✅ ~~**Check-in QR 비표준 렌더링** (RESOLVED): `qrcode.react` QRCodeSVG로 교체 완료. ISO/IEC 18004 규격 QR 코드 생성, 키오스크 스캐너 인식 가능.~~
- ⚠️ **@supabase/supabase-js 타입 복잡도** (MITIGATED): `src/lib/supabase/query.ts` 헬퍼로 `as any` 캡슐화 완료. 신규 코드는 `query()` 헬퍼 사용 권장. 기존 40+ 파일의 `as any` 리팩토링은 향후 진행.
- 🟡 **코치 계정 미연결** (OPERATIONAL): coaches.user_id=NULL → 코드적 해결 완료 (Admin 코치 연결 UI + promote_to_coach RPC). 운영 단계에서 관리자가 수동 연결 필요. → [기획서](./archive/planning/coach-account-architecture.md)
- 🔴 **배지 시스템 하드코딩** (ACTIVE): `badges/page.tsx`의 BADGE_DEFINITIONS 상수 배열, earnedDate 부정확, WOD/PR 카운트 로직 오류 → [기획서](./archive/planning/badge-system.md)

### 참고 문서
- **완료 히스토리**: `.docs/archive/complete/project-complete-20260218.md`
- **구현 완성도 감사 (Gemini)**: `.docs/audit/gemini/20260218151644_implementation_audit.md`
- **구현 완성도 감사 (GPT)**: `.docs/audit/gpt/IMPLEMENTATION_COMPLETENESS_AUDIT_2026-02-18_15-17-30.md`
- **Sitemap SSOT**: `.docs/sitemap/README.md`
- **DB 스키마 참조**: `.docs/database-reference.md`

---

## 6. 세션 종료 체크리스트
- [ ] 변경 사항 기록 완료 (이 문서)
- [ ] 다음 작업자를 위한 인수인계 메모 작성
- [ ] `npm run build` 정상 동작 확인
- [ ] 완료된 작업을 `project-complete-YYYYMMDD.md`에 이동
