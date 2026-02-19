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
