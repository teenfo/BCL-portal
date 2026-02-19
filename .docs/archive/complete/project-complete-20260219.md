# BCL Portal 완료 작업 히스토리 - 2026-02-19

## 2026-02-19 16:46 세션 작업 내역

### Admin 락커 관리 UI 개선
> 파일: `src/app/admin/operations/lockers/page.tsx`

- [x] 락커 번호 배지 크기 확대 (`min-w-[44px] min-h-[36px]`) 및 `whitespace-nowrap` 적용
- [x] 회원 이름 클릭 시 회원 상세 페이지로 이동 (`useRouter` + `router.push`)
- [x] 만료 임박/만료 배지를 종료일 열에서 액션 열로 이동
- [x] 락커 번호 배지 색상 상태 반영 (임박: amber, 만료: red, 사용중: blue)
- [x] KPI 카드 클릭 필터링 기능 구현 (TOTAL/OCCUPIED/AVAILABLE/EXPIRING/EXPIRED/BROKEN)
- [x] KPI 카드를 컴팩트 한줄 flex 레이아웃으로 변경
- [x] 필터 버튼 제거 및 KPI 카드로 통합
- [x] 검색 박스를 KPI 카드 옆으로 이동 (한줄 배치)
- [x] 크기/금액 열 통합 (size 아래에 fee 표시)
- [x] 12컬럼 그리드 복원 및 시작일/종료일 동일 사이즈(col-span-2) 적용
- [x] KPI 카드 숫자 색상을 인라인 스타일로 변경 (Tailwind 클래스 미적용 이슈 해결)
- [x] BROKEN 카드 노란색(#FBBF24), EXPIRED 카드 붉은색(#F87171) 적용
- [x] 빌드 검증 통과

---

## 2026-02-19 17:00 세션 작업 내역

### Priority 12: User App 핵심 화면 고도화 (Phase 1~3)
> `/develop` 워크플로우 실행

#### Phase 1: DB 확장 + RPC 함수 (💎 Senior Dev)
> 마이그레이션: `supabase/migrations/20260219165300_user_app_enhancement_phase1.sql`

- [x] `members` 테이블 컬럼 추가: preferences(JSONB), phone, birthday, emergency_contact, avatar_url
- [x] `facilities` 테이블 컬럼 추가: latitude, longitude, photos(TEXT[])
- [x] `fn_book_with_credit` RPC 생성 — 예약 + 크레딧 차감 + 정원 초과 시 자동 Waitlist
- [x] `fn_cancel_booking_with_credit` RPC 생성 — 예약 취소 + 크레딧 환원
- [x] RLS 검증: 기존 members/facilities 정책으로 신규 컬럼 커버 확인

#### Phase 2: 공통 컴포넌트 표준화 (🎨 UI Developer)
> 경로: `src/components/apps/` (6개 컴포넌트 + index.ts barrel export)

- [x] `AppSkeleton.tsx` — card/list/stat/text 4가지 변형 스켈레톤
- [x] `AppEmptyState.tsx` — 아이콘 + 메시지 + CTA 버튼
- [x] `AppErrorState.tsx` — 에러 아이콘 + 메시지 + 재시도 버튼
- [x] `StatCard.tsx` — 아이콘 + 숫자 + 라벨 미니 카드 (accent 지원)
- [x] `MonthCalendar.tsx` — 월간 출석 캘린더 (attendance-calendar CSS 활용)
- [x] `SessionDetailModal.tsx` — 수업 상세 바텀시트 모달 (WOD, 정원, 코치 정보)
- [x] `skeletonPulse` CSS 키프레임 apps.css에 추가

#### Phase 3: Home (Dashboard) 고도화 (🎨 UI Developer)
> 파일: `src/app/apps/dashboard/page.tsx` (전면 리팩토링)

- [x] **Today's Status 위젯 신규** — 4칸 StatCard 그리드 (체크인 여부, 주간 수업 진행, 연속 출석일, 미읽음 알림)
- [x] **병렬 데이터 로딩** — 순차 fetch → `Promise.all` 8개 동시 쿼리 (~3x 빠른 로딩)
- [x] **다음 수업 쿼리 수정** — `start_time > now` → `session_date = today AND start_time > now`
- [x] **연속 출석일 계산** — 최근 30일 체크인 조회 → 날짜 역순 연속 카운트
- [x] **공통 컴포넌트 적용** — AppSkeleton (card/stat/list), AppErrorState, StatCard 통합
- [x] 빌드 검증 통과

---

## 2026-02-19 23:30 세션 작업 내역

### Priority 13: 배지 시스템 고도화 (전 Phase 완료)
> `/develop` 워크플로우 실행 — v0.2.0

#### Phase 1: DB 스키마 + RPC + Trigger (💎 Senior Dev)
> 마이그레이션: `create_badge_system`

- [x] `badge_definitions` 테이블 생성 (name, description, icon, category, metric_type, threshold, is_active, sort_order)
- [x] `badge_awards` 테이블 생성 (member_id, badge_id, earned_at, progress_snapshot, UNIQUE 제약)
- [x] `handle_updated_at()` 함수 생성 (기존 미존재 확인 후 생성)
- [x] RLS 정책 8개 (badge_definitions: select_active/select_admin/insert_admin/update_admin/delete_admin, badge_awards: select_own/select_admin/insert_system)
- [x] `fn_calculate_badge_progress` — 10 metric_type (total_checkins, week/month_checkins, streak_days, total_feedbacks, member_days, total_bookings, total_race_participations, total_prs, total_purchases)
- [x] `fn_evaluate_badges` — 미달성 배지 자동 수여
- [x] `fn_get_my_badges` — 단일 RPC로 모든 배지 + 진행도 + 달성 여부 조회
- [x] Trigger 4개: trg_check_badges_on_checkin, trg_check_badges_on_feedback, trg_check_badges_on_race, trg_check_badges_on_purchase
- [x] 초기 데이터 21개 배지 INSERT (attendance 6 + performance 5 + community 2 + milestone 5 → 18, 실제 19행 확인)
- [x] 실제 스키마 조정: checkin_time (time→checkin_time), payment_status (status→payment_status), rank 컬럼 미존재로 total_race_wins 제거

#### Phase 2: Admin 배지 관리 화면 (🎨 UI Developer)
> 파일: `src/app/admin/operations/badges/page.tsx`

- [x] CRUD 화면 — KPI 카드(Total/Active/Awards/카테고리별), 검색, 필터링
- [x] AdminModal 기반 배지 생성/수정 폼 (이름, 아이콘, 설명, 카테고리, metric_type, threshold, sort_order, is_active)
- [x] 활성/비활성 토글, 수여 회원 수 표시
- [x] AdminSidebar에 Badges 메뉴 추가 (IconBadge SVG)
- [x] 기존 Admin 패턴 완전 준수 (AdminPageHeader, glass-card, admin-search-input, admin-action-btn)

#### Phase 3: User 배지 화면 리팩토링 (💻 Developer)
> 파일: `src/app/apps/badges/page.tsx` (전면 리팩토링)

- [x] 하드코딩 BADGE_DEFINITIONS 15개 제거
- [x] 수동 통계 계산 로직 제거 (totalCheckins, weekCheckins, streak, totalWods, totalPRs 등)
- [x] `fn_get_my_badges` 단일 RPC 호출로 전환
- [x] 기존 UI 완벽 유지 (Progress Overview, Category Filter, Badge Grid, Detail Modal)
- [x] 실제 earned_at 날짜 표시 추가 (기존: 항상 now(), 신규: DB 저장 값)
- [x] Bug Fix 4건: (B1) WOD 카운트=session_feedback.rating≥4, (B2) PR 카운트=comment에 'PR' 포함, (B3) 연속출석 클라이언트 계산, (B4) earnedDate 부정확

#### Phase 4: 문서 동기화 (🏛️ Architect)
- [x] version.ts 갱신 (0.1.0 → 0.2.0)
- [x] package.json 갱신 (0.1.0 → 0.2.0)
- [x] CHANGELOG 추가 (10개 변경사항)
- [x] project-blueprint.md 갱신 (Priority 13 완료 처리, Known Issues 해결)
- [x] 빌드 검증 통과

---

## 2026-02-19 24:00 세션 작업 내역

### Priority 15: 성능 최적화 (전 Phase 완료)
> `/develop` 워크플로우 실행 — v0.3.0

#### Phase 1: 이미지 최적화 (🎨 UI Developer)
- [x] `next.config.mjs`: `images.unoptimized: true` 제거 → `remotePatterns` 설정 (Supabase Storage)
- [x] `apps/profile/page.tsx`: 프로필 아바타 `<img>` → `next/image` Image 전환
- [x] `admin/setup/branch/page.tsx`: 지도 이미지 `<img>` → `next/image` Image (fill) 전환
- [x] `admin/insights/feedback/page.tsx`: 회원 프로필 `<img>` → `next/image` Image 전환

#### Phase 2: 코드 스플리팅 (💻 Developer)
- [x] `apps/checkin/page.tsx`: QRCodeSVG를 `next/dynamic` + `ssr: false`로 동적 임포트
- [x] `@faker-js/faker` → devDependencies로 이동 (프로덕션 번들에서 제외)
- [x] `dotenv` → devDependencies로 이동 (seed 스크립트 전용)

#### Phase 3: Supabase 쿼리 최적화 (💎 Senior Dev)
> 마이그레이션: `add_performance_indexes`

- [x] DB 인덱스 15개 추가:
  - `checkins`: member_id, checkin_time DESC, facility_id
  - `bookings`: member_id+status, session_id+status
  - `sessions`: session_date+status, facility_id
  - `memberships`: member_id+status, end_date
  - `notifications`: user_id+is_read, created_at DESC
  - `members`: user_id
  - `transactions`: member_id, created_at DESC
  - `lockers`: facility_id+status
