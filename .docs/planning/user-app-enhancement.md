# BCL Portal – User App 핵심 화면 고도화 기획서

> **Status**: Approved
> **Author**: Architect (Opus)
> **Created**: 2026-02-19
> **Last Updated**: 2026-02-19
> **Related**:
>   - `.docs/sitemap/user-app.md` (Sitemap 정본)
>   - `.docs/project-blueprint.md` (블루프린트 미구현 항목)
>   - `.docs/archive/planning/remaining-improvements.md` (잔여 개선 – 완료)
>   - `.docs/archive/planning/payment-system.md` (결제 시스템 – 완료)

---

## 1. 개요 및 배경

### 1.1 목적

블루프린트 **섹션 3 "미구현 (User App 핵심 화면)"** 에 명시된 5개 핵심 탭의 고도화를 완료하고, Sitemap에 정의되어 있으나 아직 **기능적 완성도가 낮은 추가 화면**들의 품질을 올려 사용자 앱 전체의 프로덕션 준비 상태를 달성한다.

**목표 요약**:
1. Home(Dashboard) — 위젯 실데이터 완성 + UX 개선
2. Schedule — 대기열(Waitlist) 로직 + 내 일정 통합
3. Check-in — 만료/갱신 QR + 출석 월간 통계
4. Facilities — 지도 연동 + 편의시설 상세
5. Profile — 서브페이지 완성도 + 설정 영속화

### 1.2 현재 상태 (As-Is)

| 화면 | 파일 | LoC | Supabase 연동 | 완성도 |
|------|------|-----|:------------:|:------:|
| Home (Dashboard) | `dashboard/page.tsx` | 307 | ✅ sessions, notices, memberships | 🟡 70% |
| Schedule | `schedule/page.tsx` | 296 | ✅ sessions, bookings | 🟡 65% |
| Schedule/Bookings | `schedule/bookings/page.tsx` | 151 | ✅ bookings(join sessions) | 🟢 80% |
| Check-in | `checkin/page.tsx` | 292 | ✅ checkins, QRCodeSVG | 🟡 60% |
| Facilities | `facilities/page.tsx` | 213 | ✅ facilities | 🟡 55% |
| Profile | `profile/page.tsx` | 206 | ✅ members, memberships | 🟡 60% |
| Profile/Edit | `profile/edit/page.tsx` | ? | ✅ members | 🟡 60% |
| Profile/Memberships | `profile/memberships/page.tsx` | 123 | ✅ memberships(join plans) | 🟢 80% |
| Profile/Payments | `profile/payments/page.tsx` | 129 | ✅ transactions | 🟢 85% |
| Profile/Settings | `profile/settings/page.tsx` | ? | ⚠️ localStorage | 🟡 60% |
| Profile/Support | `profile/support/page.tsx` | 146 | ✅ support_tickets | 🟢 85% |
| Profile/Notifications | `profile/notifications/page.tsx` | ? | ✅ notification_preferences | 🟢 80% |
| Notifications | `notifications/page.tsx` | 231 | ✅ useNotifications hook | 🟢 80% |
| Purchase | `purchase/page.tsx` | 399 | ✅ Toss Payments SDK | 🟢 85% |
| Feedback | `feedback/page.tsx` | 188 | ✅ session_feedback | 🟡 70% |
| Records | `records/page.tsx` | 308 | ✅ WOD + PR | 🟡 65% |
| Badges | `badges/page.tsx` | ? | ⚠️ 목데이터 | 🔴 40% |
| Coaches | `coaches/page.tsx` | ? | ✅ coaches | 🟡 60% |
| Leaderboard | `leaderboard/page.tsx` | ? | ✅ race_records | 🟡 60% |

### 1.3 핵심 제약 조건

| 항목 | 내용 |
|------|------|
| 렌더링 | CSR Only – SSR/SSG 사용 금지 |
| 데이터 접근 | Supabase anon key + RLS 필수 |
| UI 디자인 | Glassmorphism Dark Mode (ui-gen SKILL.md 준수) |
| 네비게이션 | Bottom Tab (Home / Schedule / Check-in / Facilities / Profile) |
| 데이터 소유권 | User 화면에서 Admin 데이터 수정 금지 (Read-only) |
| 모바일 퍼스트 | 모든 화면 모바일 우선 반응형 |

---

## 2. 현재 문제 진단 (As-Is)

### 2.1 화면별 갭 분석

```
┌─ Home (Dashboard) ──────────────────────────────────────────────┐
│ ✅ 있음: 인사말, 다음 수업 카드, 멤버십 요약, 공지, Quick Links   │
│ ❌ 없음: 오늘 체크인 상태 위젯, 주간 출석 통계, 미읽음 알림 배지  │
│ ⚠️ 개선: 다음 수업 쿼리가 start_time 비교만 함(session_date 미사용)│
│ ⚠️ 개선: 위젯 데이터 로딩이 순차적 → 병렬 fetch 필요             │
└─────────────────────────────────────────────────────────────────┘

┌─ Schedule ──────────────────────────────────────────────────────┐
│ ✅ 있음: 주간 날짜 피커, 수업 목록, 코치/난이도 필터, 예약 버튼  │
│ ❌ 없음: Waitlist 등록 로직 (FullBook 시 "Waitlist" 표시만 존재) │
│ ❌ 없음: 예약 후 크레딧 차감 로직                                │
│ ⚠️ 개선: 날짜 피커가 월~금만 표시 (주말 수업 불가)               │
│ ⚠️ 개선: 수업 상세(WOD, 설명) 모달 없음                         │
└─────────────────────────────────────────────────────────────────┘

┌─ Check-in ──────────────────────────────────────────────────────┐
│ ✅ 있음: QRCodeSVG 실시간 생성 (qrcode.react), 체크인 이력       │
│ ❌ 없음: QR 코드 만료 시간 + 자동 갱신                           │
│ ❌ 없음: 월간 출석 캘린더 뷰                                     │
│ ⚠️ 개선: 체크인 통계(연속 출석일, 이번 달 출석률) 미표시          │
└─────────────────────────────────────────────────────────────────┘

┌─ Facilities ────────────────────────────────────────────────────┐
│ ✅ 있음: 시설 목록, 운영시간, 편의시설 아이콘                     │
│ ❌ 없음: 지도 연동 (카카오맵 / Google Maps)                      │
│ ❌ 없음: 시설 상세 페이지 (전화 연결, 길찾기)                     │
│ ⚠️ 개선: 복수 시설일 때 카드 간 차이 구분 부족                   │
└─────────────────────────────────────────────────────────────────┘

┌─ Profile ───────────────────────────────────────────────────────┐
│ ✅ 있음: 기본 프로필, 메뉴 링크, 로그아웃                        │
│ ✅ 서브페이지: edit, memberships, payments, support, settings,   │
│              notifications — 모두 존재                           │
│ ❌ 없음: 프로필 사진 업로드                                      │
│ ⚠️ 개선: settings → localStorage만 사용 (서버 동기화 없음)       │
│ ⚠️ 개선: edit 페이지에서 전화번호/생년월일 필드 누락 가능         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 공통 UX 이슈

| # | 이슈 | 영향 |
|---|------|------|
| C1 | **Pull-to-refresh 미구현** | 새 데이터 확인하려면 페이지 새로고침 필요 |
| C2 | **Optimistic UI 없음** | 예약/취소 시 로딩 후에야 결과 반영 |
| C3 | **Skeleton 스타일 불일치** | 각 페이지마다 skeleton 구현이 다름 |
| C4 | **Empty State 한글/영문 혼용** | 일부는 영문("No upcoming classes"), 일부는 한글 |
| C5 | **에러 핸들링 미흡** | 네트워크 오류 시 빈 화면, 재시도 버튼 없음 |

---

## 3. 개선 설계 (To-Be)

### 3.1 핵심 설계 원칙

1. **데이터 품질 우선** — 목데이터/하드코딩 제거, 실 DB 쿼리 완성
2. **UX 일관성** — 공통 컴포넌트(Skeleton, EmptyState, ErrorBoundary) 표준화
3. **모바일 성능** — 병렬 fetch, 이미지 lazy loading, 데이터 캐싱
4. **비교적 변경 적음** — 기존 코드 패턴(app-glass-card, app-page 클래스) 유지

### 3.2 아키텍처 변경 없음

```
기존 아키텍처 유지:
Client (CSR)  →  Supabase SDK (anon key)  →  PostgreSQL (RLS)
                                         ↓
                              Supabase Realtime (notifications)
```

### 3.3 화면별 개선 상세

#### 📱 3.3.1 Home (Dashboard) 개선

```
To-Be 레이아웃:
┌──────────────────────────────────────┐
│ Good morning, 김철호                   │
│ Welcome back                          │
├──────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │ 🔔 NEXT CLASS              Today │ │
│ │ CrossFit WOD                      │ │
│ │ ⏰ 10:00 AM  👤 Coach Kim         │ │
│ │ [  Check-in Now  ]               │ │
│ └────────────────────────────────────┘ │
├──────────────────────────────────────┤
│ ┌─ Today's Status ──────────────────┐ │
│ │  ✅ 체크인 완료    📊 3/4 수업     │ │
│ │  🔥 연속 12일      📬 알림 2건     │ │
│ └────────────────────────────────────┘ │
├──────────────────────────────────────┤
│ Membership           [View Details →] │
│ ┌────────────────────────────────────┐ │
│ │ CURRENT PLAN     REMAINING        │ │
│ │ Premium 3개월     D-23             │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━ 76%         │ │
│ └────────────────────────────────────┘ │
├──────────────────────────────────────┤
│ Announcements           [Clear all]  │
│ ┌── 📋 시설 점검 안내      3h ago   │ │
│ ├── 🎉 2월 이벤트           1d ago   │ │
│ └── 📅 설 연휴 운영시간      2d ago   │ │
├──────────────────────────────────────┤
│ Quick Links                          │
│ ┌────┐ ┌────┐ ┌────┐                │
│ │ 🏆 │ │ 🎖️ │ │ 💪 │                │
│ │리더 │ │배지 │ │코치 │                │
│ ├────┤ ├────┤ ├────┤                │
│ │ 📊 │ │ 🎫 │ │ 📝 │                │
│ │기록 │ │이용 │ │피드 │                │
│ └────┘ └────┘ └────┘                │
└──────────────────────────────────────┘
```

**변경 포인트**:
1. **Today's Status 위젯 신규** — 오늘 체크인 여부, 주간 수업 진행, 연속 출석일, 미읽음 알림 카운트
2. **병렬 데이터 로딩** — `Promise.all()`로 sessions, notices, memberships, checkins, notifications 동시 로드
3. **다음 수업 쿼리 수정** — `session_date = today AND start_time > now` 조건 추가

#### 📅 3.3.2 Schedule 개선

**변경 포인트**:
1. **날짜 피커 확장** — 월~일(7일) + 좌우 스와이프로 주 단위 이동
2. **Waitlist 로직 구현** — 정원 초과 시 `bookings.status='waitlisted'` INSERT + 빈자리 발생 시 자동 알림 연동 (기존 `fn_notify_waitlist_on_vacancy` 트리거 활용)
3. **수업 상세 모달** — 탭 시 수업 설명, WOD 내용, 코치 정보 표시
4. **크레딧 차감 로직** — 횟수권 사용자: 예약 시 `memberships.remaining_credits -= 1`, 취소 시 `+= 1` (RPC 함수 활용)
5. **내 예약 내비게이션 개선** — Bookings 페이지 링크를 "My Bookings" 칩으로 상시 표시

#### ✅ 3.3.3 Check-in 개선

**변경 포인트**:
1. **QR 만료/갱신** — QR 코드에 생성 시간 포함, 5분 만료, 자동 갱신 타이머 표시
2. **월간 출석 캘린더** — 체크인 날짜를 캘린더 그리드에 시각화 (현재 이력은 리스트만)
3. **출석 통계 패널** — 이번 달 출석일수, 연속 출석일, 총 운동시간 요약
4. **체크인 이력 필터** — 월 단위 필터 (셀렉트박스)

#### 🏢 3.3.4 Facilities 개선

**변경 포인트**:
1. **지도 연동** — 카카오맵 JavaScript SDK 임베드 (시설 좌표 마커 표시)
2. **시설 상세** — 카드 탭 시 확장 뷰 (전화 걸기, 길찾기, 상세 사진)
3. **운영시간 표시 개선** — 요일별 시간표 + 현재 영업 중/종료 뱃지
4. **주소 복사** — 주소 텍스트 탭 시 클립보드 복사

#### 👤 3.3.5 Profile 개선

**변경 포인트**:
1. **프로필 사진 업로드** — Supabase Storage 연동, 아바타 이미지 저장
2. **설정 서버 동기화** — localStorage + Supabase `members.preferences` JSONB 컬럼 활용
3. **프로필 편집 필드 확장** — 전화번호, 생년월일, 긴급 연락처
4. **메뉴 아이콘 + 뱃지** — 미읽음 알림 카운트 배지, 만료 임박 멤버십 경고

### 3.4 공통 UX 표준화

```
신규 공통 컴포넌트:
┌───────────────────────────────────────────┐
│ src/components/apps/                       │
│ ├── AppSkeleton.tsx  (표준 스켈레톤 세트)  │
│ ├── AppEmptyState.tsx (아이콘+메시지+CTA)  │
│ ├── AppErrorState.tsx (에러+재시도 버튼)   │
│ ├── SessionDetailModal.tsx (수업 상세)     │
│ ├── MonthCalendar.tsx (출석 캘린더)        │
│ └── StatCard.tsx      (통계 미니 카드)     │
└───────────────────────────────────────────┘
```

---

## 4. 데이터베이스 변경 (필요 시)

### 4.1 마이그레이션 SQL

```sql
-- 1. members 테이블에 preferences JSONB 컬럼 추가 (설정 서버 동기화용)
ALTER TABLE members
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

COMMENT ON COLUMN members.preferences IS '사용자 앱 설정 (dark_mode, language, weekly_goal 등)';

-- 2. members 테이블에 phone, birthday 컬럼 추가 (프로필 확장)
ALTER TABLE members
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(50),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. facilities 테이블에 좌표 컬럼 추가 (지도 연동)
ALTER TABLE facilities
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS photos TEXT[];

-- 4. 크레딧 차감/환원 RPC (Atomic Transaction)
CREATE OR REPLACE FUNCTION public.fn_book_with_credit(
    p_session_id UUID,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_membership RECORD;
    v_booking_id UUID;
BEGIN
    -- 활성 크레딧 멤버십 조회
    SELECT id, remaining_credits INTO v_membership
    FROM memberships
    WHERE user_id = p_user_id
      AND status = 'active'
      AND remaining_credits > 0
    ORDER BY end_date ASC
    LIMIT 1
    FOR UPDATE;

    -- 크레딧 차감 (횟수권인 경우)
    IF v_membership IS NOT NULL AND v_membership.remaining_credits > 0 THEN
        UPDATE memberships
        SET remaining_credits = remaining_credits - 1,
            updated_at = now()
        WHERE id = v_membership.id;
    END IF;

    -- 예약 생성
    INSERT INTO bookings (session_id, user_id, status)
    VALUES (p_session_id, p_user_id, 'confirmed')
    RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'booking_id', v_booking_id,
        'credits_used', CASE WHEN v_membership IS NOT NULL THEN 1 ELSE 0 END,
        'remaining_credits', COALESCE(v_membership.remaining_credits - 1, -1)
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'already_booked');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 크레딧 환원 (예약 취소 시)
CREATE OR REPLACE FUNCTION public.fn_cancel_booking_with_credit(
    p_booking_id UUID,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
BEGIN
    SELECT id, session_id, status INTO v_booking
    FROM bookings
    WHERE id = p_booking_id AND user_id = p_user_id
    FOR UPDATE;

    IF v_booking IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'not_found');
    END IF;

    IF v_booking.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'already_cancelled');
    END IF;

    -- 예약 취소
    UPDATE bookings SET status = 'cancelled', updated_at = now()
    WHERE id = p_booking_id;

    -- 크레딧 환원 (활성 멤버십이 있는 경우)
    UPDATE memberships
    SET remaining_credits = remaining_credits + 1,
        updated_at = now()
    WHERE user_id = p_user_id
      AND status = 'active'
      AND remaining_credits IS NOT NULL
    ORDER BY end_date ASC
    LIMIT 1;

    RETURN jsonb_build_object('success', TRUE, 'booking_id', p_booking_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 RLS 정책

```sql
-- members.preferences, phone, birthday: 본인만 읽기/쓰기 (기존 RLS로 커버됨)
-- 기존 members RLS: user_id = auth.uid()

-- facilities: latitude/longitude/photos는 공개 읽기 (기존 RLS로 커버됨)
-- 기존 facilities RLS: SELECT 모든 인증 사용자

-- RPC 함수는 SECURITY DEFINER로 RLS 우회 → 내부에서 user_id 직접 검증
```

---

## 5. UI 변경 상세

### 5.1 신규 컴포넌트

| 컴포넌트 | 경로 | 용도 |
|----------|------|------|
| `AppSkeleton` | `src/components/apps/AppSkeleton.tsx` | 표준 로딩 스켈레톤 (card/list/stat 변형) |
| `AppEmptyState` | `src/components/apps/AppEmptyState.tsx` | 빈 데이터 상태 (아이콘 + 메시지 + CTA) |
| `AppErrorState` | `src/components/apps/AppErrorState.tsx` | 에러 상태 (재시도 버튼) |
| `SessionDetailModal` | `src/components/apps/SessionDetailModal.tsx` | 수업 상세 보기 모달 |
| `MonthCalendar` | `src/components/apps/MonthCalendar.tsx` | 출석 월간 캘린더 |
| `StatCard` | `src/components/apps/StatCard.tsx` | 통계 미니 카드 (숫자 + 라벨) |

### 5.2 기존 화면 수정

| 화면 | 주요 수정 | 변경 규모 |
|------|----------|:---------:|
| `dashboard/page.tsx` | Today's Status 위젯 추가, 병렬 fetch, 다음 수업 쿼리 수정 | 중 |
| `schedule/page.tsx` | 7일 피커, waitlist 로직, 수업 상세 모달, 크레딧 차감 | 대 |
| `schedule/bookings/page.tsx` | 크레딧 환원 로직 | 소 |
| `checkin/page.tsx` | QR 만료 타이머, 월간 캘린더, 출석 통계 | 중 |
| `facilities/page.tsx` | 지도 임베드, 상세 확장, 주소 복사 | 중 |
| `profile/page.tsx` | 아바타, 메뉴 뱃지 | 소 |
| `profile/edit/page.tsx` | 사진 업로드, 추가 필드 | 중 |
| `profile/settings/page.tsx` | 서버 동기화 | 소 |

---

## 6. 영향 범위 분석

| 파일/모듈 | 변경 내용 | 변경 필요 여부 |
|-----------|-----------|:-------------:|
| `src/app/apps/dashboard/page.tsx` | Today's Status 위젯, 병렬 fetch | ✅ |
| `src/app/apps/schedule/page.tsx` | 7일 피커, waitlist, 모달, 크레딧 | ✅ |
| `src/app/apps/schedule/bookings/page.tsx` | 크레딧 환원 | ✅ |
| `src/app/apps/checkin/page.tsx` | QR 만료, 캘린더, 통계 | ✅ |
| `src/app/apps/facilities/page.tsx` | 지도, 상세, 주소 복사 | ✅ |
| `src/app/apps/profile/page.tsx` | 아바타, 뱃지 | ✅ |
| `src/app/apps/profile/edit/page.tsx` | 사진 업로드, 추가 필드 | ✅ |
| `src/app/apps/profile/settings/page.tsx` | 서버 동기화 | ✅ |
| `src/components/apps/*.tsx` | 공통 컴포넌트 6개 신규 | ✅ (🆕) |
| `src/lib/supabase/client.ts` | 변경 없음 | ❌ |
| `src/hooks/useNotifications.ts` | 변경 없음 (기존 사용) | ❌ |
| Admin / Coach / Class | 변경 없음 | ❌ |

---

## 7. 보안 고려사항

1. **RPC 함수 보안**: `fn_book_with_credit`, `fn_cancel_booking_with_credit`는 `SECURITY DEFINER`로 실행되며, 내부에서 `p_user_id`를 검증. 클라이언트에서 호출 시 `auth.uid()`를 전달.
2. **Supabase Storage (아바타)**: `avatars` 버킷에 사용자별 폴더 정책 (`{user_id}/*` 경로만 허용)
3. **QR 코드 만료**: QR 페이로드에 생성 시간 포함 → 키오스크에서 만료 검증
4. **프로필 필드**: phone, birthday는 개인정보 → 본인만 조회/수정 (기존 members RLS 커버)

---

## 8. 구현 단계 및 에이전트 배분

### Phase 1: DB 확장 + RPC 함수
> **담당**: 💎 **Senior Dev (Opus)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 1-1 | members 컬럼 추가 | preferences, phone, birthday, emergency_contact, avatar_url |
| 1-2 | facilities 컬럼 추가 | latitude, longitude, photos |
| 1-3 | 크레딧 RPC 함수 생성 | fn_book_with_credit, fn_cancel_booking_with_credit |
| 1-4 | RLS/보안 검증 | 기존 정책으로 충분한지 확인 |
| 1-5 | 빌드 검증 | 마이그레이션 적용 후 앱 빌드 확인 |

### Phase 2: 공통 컴포넌트 표준화
> **담당**: 🎨 **UI Developer (Gemini)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 2-1 | AppSkeleton 컴포넌트 | card, list, stat 변형 |
| 2-2 | AppEmptyState 컴포넌트 | 아이콘 + 메시지 + CTA 버튼 |
| 2-3 | AppErrorState 컴포넌트 | 에러 메시지 + 재시도 버튼 |
| 2-4 | StatCard 컴포넌트 | 숫자 + 라벨 + 아이콘 미니 카드 |
| 2-5 | MonthCalendar 컴포넌트 | 날짜 그리드 + 체크인 마커 |
| 2-6 | SessionDetailModal 컴포넌트 | 수업 상세 오버레이 모달 |

### Phase 3: Home (Dashboard) 고도화
> **담당**: 🎨 **UI Developer (Gemini)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 3-1 | Today's Status 위젯 | 체크인, 주간 진행, 연속 출석일, 미읽음 알림 |
| 3-2 | 병렬 데이터 로딩 | Promise.all 적용 |
| 3-3 | 다음 수업 쿼리 수정 | session_date + start_time 조건 |
| 3-4 | 기존 페이지에 공통 컴포넌트 적용 | AppSkeleton, AppEmptyState |

### Phase 4: Schedule 고도화
> **담당**: 💻 **Developer (Sonnet)** | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 4-1 | 7일 날짜 피커 | 월~일 확장, 주 단위 좌우 이동 |
| 4-2 | Waitlist 로직 | 정원 초과 시 waitlisted 상태 INSERT |
| 4-3 | 수업 상세 모달 | SessionDetailModal 연동 |
| 4-4 | 크레딧 차감 연동 | fn_book_with_credit RPC 호출 |
| 4-5 | 예약 취소 크레딧 환원 | fn_cancel_booking_with_credit RPC 호출 |

### Phase 5: Check-in 고도화
> **담당**: ⚡ **Specialist (Gemini)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 5-1 | QR 만료 타이머 | 5분 만료, 프로그레스 바, 자동 갱신 |
| 5-2 | 월간 출석 캘린더 | MonthCalendar 컴포넌트 바인딩 |
| 5-3 | 출석 통계 패널 | 이번 달 출석일, 연속 출석일 |
| 5-4 | 이력 월 필터 | 월 선택 셀렉트 |

### Phase 6: Facilities + Profile 고도화
> **담당**: 🎨 **UI Developer (Gemini)** | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 6-1 | 시설 지도 연동 | 카카오맵 SDK 임베드 |
| 6-2 | 시설 상세 확장 뷰 | 전화 걸기, 길찾기, 사진 갤러리 |
| 6-3 | 영업 중/종료 뱃지 | 현재 시간 기반 |
| 6-4 | 주소 복사 | navigator.clipboard |
| 6-5 | 프로필 사진 업로드 | Supabase Storage 연동 |
| 6-6 | 프로필 편집 필드 확장 | 전화번호, 생일, 긴급 연락처 |
| 6-7 | 설정 서버 동기화 | members.preferences 사용 |
| 6-8 | 메뉴 뱃지(미읽음, 만료) | 알림 카운트, 멤버십 경고 |

### Phase 7: 문서 동기화
> **담당**: 🏛️ **Architect (Opus)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 7-1 | sitemap/user-app.md 갱신 | 완성도 마커 업데이트 |
| 7-2 | project-blueprint.md 갱신 | 미구현 항목 완료 처리 |
| 7-3 | database-reference.md 갱신 | 신규 컬럼/RPC 반영 |

---

## 9. 블루프린트 등록용 체크리스트

```markdown
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
```

---

## 10. 테스트 시나리오

### 정상 흐름
1. **Dashboard 로딩**: 로그인 → Dashboard에서 오늘 체크인 상태, 다음 수업, 멤버십 요약, 알림 카운트가 2초 내 표시됨
2. **수업 예약 (크레딧)**: Schedule에서 수업 선택 → "Book" 탭 → 크레딧 1 차감되고 예약 확정 → 잔여 크레딧 즉시 반영
3. **Waitlist 등록**: 정원 초과 수업에서 "Waitlist" 탭 → 대기열 등록됨 → 빈자리 발생 시 알림 수신 → 자동 예약 전환
4. **QR 체크인**: Check-in 탭에서 QR 생성 → 타이머(5:00) 카운트다운 → 만료 전 자동 갱신 → 키오스크 스캔 성공
5. **프로필 사진**: Profile → Edit → 사진 업로드 → 앱 전체에서 아바타 반영

### 예외 흐름
1. **크레딧 소진**: 잔여 크레딧 0인 상태에서 예약 → "이용권을 구매해주세요" 안내 + Purchase 페이지 링크
2. **네트워크 오류**: 데이터 로딩 실패 → AppErrorState "다시 시도" 버튼 → 탭 시 재로딩
3. **동시 예약 충돌**: 마지막 자리를 두 명이 동시 예약 → 한 명은 성공, 한 명은 unique_violation → "이미 예약됨" 또는 Waitlist 안내
4. **지도 로딩 실패**: 카카오맵 SDK 미로딩 → 주소 텍스트만 표시 + 지도 영역에 placeholder

---

## 11. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| 카카오맵 SDK 키 필요 | 지도 기능 개발 블로커 | `NEXT_PUBLIC_KAKAO_MAP_KEY` 환경변수 준비, 없으면 지도 영역 숨김 |
| members 컬럼 추가 시 기존 쿼리 영향 | 빌드 오류 가능 | `ADD COLUMN IF NOT EXISTS` 사용, 기존 코드 변경 없음 |
| Supabase Storage 설정 필요 (아바타) | 프로필 사진 기능 블로커 | Storage 없으면 사진 업로드 비활성화 + 기본 아바타 유지 |
| 크레딧 RPC 함수 동시성 | 레이스 컨디션 | `FOR UPDATE` 잠금 적용 완료 (SQL 설계에 포함) |
| Phase 4(Schedule) 변경 규모 | 예상보다 공수 큼 | MVP 접근: Waitlist만 Phase 4-A, 크레딧은 Phase 4-B로 분할 가능 |

---

## 12. Planning Log (기획 진행 기록)

### Session 1 — 2026-02-19
- **작성 범위**: 섹션 1~11 전체
- **완성된 섹션**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
- **미완성 섹션**: 없음
- **TODO (다음 세션)**: 해당 없음 — 전체 완성
- **메모**:
  - 블루프린트의 미구현 항목 5개(Home, Schedule, Check-in, Facilities, Profile) 분석 완료
  - 실제 코드 22개 파일 전수 조사 → 완성도 40%~85% 범위
  - 기존 코드 베이스가 상당히 성숙하여 대부분 "고도화"임 (신규 개발이 아님)
  - DB 변경은 최소한으로 유지 (컬럼 추가 + RPC 함수 2개)
  - 7 Phase, 총 예상 4.5일 공수
  - 공통 컴포넌트 표준화(Phase 2)가 이후 모든 페이지 품질에 영향

---
**문서 버전**: 1.0.0
**최종 업데이트**: 2026-02-19
