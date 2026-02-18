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

- **Current Focus**: **랜딩 페이지 기획 완료 → 블루프린트 등록 대기** 📝
- **Project Path**: `/Users/kimchoho/dev/workspace/BCL-portal` (2026-02-18 경로 확정)
- **Build Status**: ✅ `npm run build` 정상 완료 (2026-02-18 17:00 확인)
- **Dev Server**: ✅ `npm run dev` 정상 구동 (http://localhost:3000)
- **Last Action**: 랜딩 페이지 기획서 작성 완료 — `.docs/planning/landing-page.md` (Status: Approved) (2026-02-18 22:00)

---

### Next Steps (미구현 작업)

> 📌 **에이전트 배분 표기 규칙**: 각 항목 끝에 담당 에이전트를 명시합니다.
> - 🏛️ **Architect (Opus)** — 설계, 구조 결정, 최종 승인
> - 💎 **Senior Dev (Opus)** — 복잡한 비즈니스 로직, 결제, 보안, DB 스키마
> - 💻 **Developer (Sonnet)** — API, 일반 로직, 테스트/QA, 버그 수정
> - 🎨 **UI Developer (Gemini)** — 화면 UI/UX, 컴포넌트 구현
> - ⚡ **Specialist (Gemini)** — 실시간 기능, 성능 최적화, 카메라/QR

#### ✅ Priority 6: 코치 계정 아키텍처 강화 (완료)
  > **기획서**: `.docs/archive/planning/coach-account-architecture.md`
  > **문제**: 코치가 Admin에서 콘텐츠로만 등록되어 Auth 계정 없이 Coach App 로그인 불가
  > **방안**: 기존 가입 회원을 코치로 승격 (수동 연결 방식)

  - [x] Phase 1: DB 스키마 변경 → 💎 **Senior Dev (Opus)**
    - [x] coaches 테이블 확장 마이그레이션 (user_id, phone, specialties, bio, profile_image_url, linked_at, linked_by, UNIQUE)
    - [x] promote_to_coach / demote_from_coach DB 함수 생성
    - [x] RLS 정책 보강 (coach_update_own_record 추가)
    - [x] database-reference.md 갱신
  - [x] Phase 2: Admin 코치 관리 UI 변경 → 🎨 **UI Developer (Gemini)**
    - [x] 회원 검색 컴포넌트 구현 (profiles 테이블 검색, 디바운스 적용)
    - [x] 코치 등록 모달 레이아웃 변경 (Step 1: 회원 선택 + Step 2: 코치 정보)
    - [x] 코치 카드 계정 연결 상태 배지 추가 (🔗 연결됨 / ⚠️ 미연결)
    - [x] 코치 편집 모달 수정 (연결된 회원 읽기 전용)
  - [x] Phase 3: Admin 저장/삭제 로직 변경 → 💻 **Developer (Sonnet)**
    - [x] saveCoach() 리팩토링 (회원 선택 기반 + promote RPC 호출)
    - [x] deleteCoach() 역할 복원 추가 (demote RPC 호출)
    - [x] 레거시 미연결 코치(user_id=NULL) 호환 처리
  - [x] Phase 4: Coach App 예외 처리 → 💻 **Developer (Sonnet)**
    - [x] 미연결 코치 안내 메시지 (Coach Layout - CoachUnlinkedBanner)
    - [ ] 5개 화면 통합 테스트 (수동 확인 필요)
  - [x] Phase 5: 문서 동기화 → 🏛️ **Architect (Opus)**
    - [x] database-reference.md 갱신
    - [x] blueprint 반영

#### ✅ Priority 7: 알림 시스템 종합 구축 (완료) ✨
  > **기획서**: `.docs/archive/planning/notification-system.md`
  > **문제**: 회원에게 수업 리마인더, 빈자리 알림, 멤버십 만료 경고 등 실시간 알림 수단이 없음
  > **방안**: In-App 알림 (Supabase Realtime) → Web Push (PWA) → 외부 채널 (카카오) 3단계 구축

  - [x] Phase 1: In-App 알림 인프라 (완료) ✨
  - [x] Phase 2: 자동 알림 규칙 엔진 (완료) ✨
  - [x] Phase 3: Web Push (PWA) 통합 (완료) ✨
  - [x] Phase 4: 외부 채널 연동 (완료) ✨
  - [x] Phase 5: 문서 동기화 (완료) ✨
    - [x] notifications/push_subscriptions/notification_preferences DB 스키마 검증
    - [x] sitemap 갱신 (사용자 앱/관리자 알림 센터 구현 반영)
    - [x] database-reference.md 갱신 (알림 시스템 테이블 5개 + 자동화 트리거 4개 반영 완료)
    - [x] blueprint 반영

#### 🔵 Priority 8: Admin 미구현 상세 기능 완성 (진행 중 — Tier 1+2 완료)
  > **기획서**: `.docs/archive/planning/admin-unimplemented-features.md`
  > **문제**: Admin 내 23개 화면 중 다수의 상세 기능이 UI만 존재하거나 로직이 미비함 (완성도 63% → ~80%)
  > **방안**: Tier 1(비즈니스 핵심)부터 Tier 3(고도화)까지 4개 스프린트로 나누어 기능 완성

  - [x] Phase 1: Tier 1 비즈니스 핵심 ✅ → 💎 **Senior Dev** + 💻 **Dev** + 🎨 **UI**
    - [x] T1-1: 환불 프로세스 (위약금 계산 + 승인)
    - [x] T1-2: 회원 정보 수정 (이름/연락처/상태)
    - [x] T1-3: 멤버십 홀딩 처리 (pause_count, 기간 차감)
    - [x] T1-4: 지점 운영시간 설정 (요일별 오픈/마감, 휴무 토글)
    - [x] T1-5: 예약 세션별 명단 + 노쇼 통제
    - [x] T1-6: CS 티켓 답변 기능
  - [x] Phase 2: Tier 2 운영 효율 (대부분 완료) ✅ → 💻 **Developer (Sonnet)** + 🎨 **UI**
    - [x] T2-1: 출석 데이터 CSV 다운로드
    - [x] T2-2: 결제 데이터 CSV 다운로드
    - [x] T2-3: 알림 규칙 생성/수정 모달
    - [x] T2-4: 피드백 필터(코치/수업/날짜) + 검색
    - [x] T2-5: 멤버십 연장 커스텀 일수 (T1-3에서 구현)
    - [x] T2-8: 예약 검색 기능 (T1-5에서 구현)
    - [x] T2-9: 알림 KPI 대시보드 (기존 구현 확인)
    - [x] T2-10: 감사 로그 날짜 범위 필터
    - [ ] T2-6: 요금제 정책 설정 (DB 스키마 변경 필요) → 💎 **Senior Dev**
    - [ ] T2-7: 역할별 사용자 배정 UI → 🎨 **UI Dev**
  - [ ] Phase 3: Tier 3 고도화 (시스템연동, 히트맵, DnD 캘린더 등) → ⚡ **Specialist (Gemini)** + 🎨 **UI** + 💻 **Dev**
    - [ ] t3-1 ~ t3-12 상세 기능 구현
  - [ ] Phase 4: 문서 동기화 및 최종 검증 → 🏛️ **Architect (Opus)**
    - [ ] sitemap 갱신 및 blueprint 반영

#### 🟠 Priority 9: 결제 시스템 아키텍처 (개발 대기) 💳
  > **기획서**: `.docs/archive/planning/payment-system.md`
  > **문제**: 현재 결제가 DB 직접 INSERT로만 처리되며, 실제 PG 연동/환불/정산 기능이 없음
  > **방안**: Toss Payments 결제위젯 연동 + 이중 안전장치 (Admin 모드 토글 + DEV 환경 강제 시뮬레이션)

  - [ ] Phase 1: 결제 인프라 (DB + Edge Functions) → 💎 **Senior Dev (Opus)**
    - [ ] transactions 테이블 확장 마이그레이션
    - [ ] pg_settings + refunds 테이블 생성 + RLS
    - [ ] confirm-payment Edge Function (7단계 검증)
    - [ ] cancel-payment Edge Function (관리자 전용)
    - [ ] toss-webhook Edge Function (서명 검증)
    - [ ] sync-pg-settings Edge Function (암복호화)
  - [ ] Phase 2: 사용자 결제 화면 → 🎨 **UI Dev (Gemini)** + 💻 **Developer (Sonnet)**
    - [ ] /apps/purchase Toss 결제위젯 통합 (3단계 확인 플로우)
    - [ ] /apps/purchase/success, /apps/purchase/fail 페이지
    - [ ] 결제 성공 시 알림 연동
    - [ ] /apps/profile/payments 영수증 링크
  - [ ] Phase 3: 관리자 환불 & 매출 관리 → 🎨 **UI Dev** + 💎 **Senior Dev**
    - [ ] Admin PG 설정 UI (모드 토글 + 키 입력)
    - [ ] Admin 환불 모달 (위약금 계산, 2단계 확인)
    - [ ] Admin 거래 상세 모달 (Toss 상태 표시)
    - [ ] 매출 리포트 source 필터
  - [ ] Phase 4 (향후): POS 매출 연동 → 💎 **Senior Dev**
    - [ ] Toss POS API 연동 EF
    - [ ] POS 매출 동기화 크론
    - [ ] 매출 리포트 POS 통합
  - [ ] Phase 5: 문서 동기화 → 🏛️ **Architect (Opus)**
    - [ ] sitemap/database-reference/blueprint 갱신

#### 🟡 잔여 개선 항목 (향후)
  - [ ] Class 포털 성능 최적화 (60fps) → ⚡ **Specialist**
  - [ ] Check-in QR 표준 라이브러리 교체 (qrcode.react) → ⚡ **Specialist**
  - [ ] User Check-in QR 비표준 렌더링 개선 → ⚡ **Specialist**
  - [ ] 루트 랜딩 페이지 구현 → 🎨 **UI Developer** (기획서: `.docs/planning/landing-page.md` ✅ Approved)
  - [ ] 대시보드 위젯 실 데이터 완성 → 💻 **Developer**
  - [ ] 레이스 시스템 PM5 기기 데이터 연동 → ⚡ **Specialist**
  - [ ] Coach 앱 브라우저 통합 테스트 → 💻 **Developer**

---

### Known Issues (Active)
- ⚠️ **@supabase/auth-js 타입 미완성** (WORKAROUND): `supabase.auth as any` 캐스팅 우회 중
- 🔴 **코치 계정 미연결** (ACTIVE): coaches.user_id=NULL → Coach App 로그인 불가 → [기획서](./archive/planning/coach-account-architecture.md)

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
