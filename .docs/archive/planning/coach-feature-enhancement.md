# BCL Portal – 코치 기능 고도화 기획서

> **Status**: Approved
> **Author**: Agent (Architect 관점)
> **Created**: 2026-02-21
> **Last Updated**: 2026-02-21
> **Related**:
> - `.docs/sitemap/coach-app.md` (코치 앱 SSOT)
> - `.docs/archive/planning/coach-account-architecture.md` (기존 코치 계정 아키텍처 기획서 — 완료)
> - `.docs/database-reference.md` (DB 참조)
> - `src/app/coach/**/*` (코치 앱 5개 화면)
> - `src/app/admin/operations/coaches/page.tsx` (Admin 코치 관리)
> - `src/app/apps/coaches/page.tsx` (회원용 코치 목록)

---

## 1. 개요 및 배경

### 1.1 목적
코치 기능은 Coach App(5화면), Admin 코치 관리(3탭), User App 코치 목록 화면으로 구성된다.
기존 **Priority 6(코치 계정 아키텍처 강화)**에서 계정 연결 문제가 해결되었으나,
실제 운영에 필요한 **핵심 비즈니스 기능**들이 다수 미구현 상태이다.

이 기획서는 코치 기능 전반을 재점검하여, 구현된 사항과 부족한 점을 진단하고,
**프로덕션 수준의 코치 경험(Coach Experience)**을 달성하기 위한 개선 방안을 제시한다.

### 1.2 현재 상태 (As-Is) — 요약

| 영역 | 화면 수 | 구현율 | 주요 이슈 |
|------|---------|--------|-----------|
| Coach App | 5/5 | ~55% | UI 골격만 존재, 비즈니스 로직 부족 |
| Admin 코치 관리 | 3탭 | ~70% | 성과 분석 Mock 데이터, 정산 미연결 |
| User App 코치 목록 | 1 | ~40% | 프로필 이미지 미표시, bio 미표시, 상세 부실 |

### 1.3 핵심 제약 조건
| 항목 | 내용 |
|---|---|
| CSR 기반 | 서버 렌더링 금지 |
| RLS 필수 | 모든 새 테이블/쿼리에 RLS 적용 |
| 기존 인프라 활용 | coaches, session_coaches, sessions, members 등 기존 테이블 우선 활용 |
| 코치 계정 연결 전제 | Priority 6 완료됨 — `coaches.user_id`와 `auth.users` 연결 가능 |

---

## 2. 현재 문제 진단 (As-Is)

### 2.1 Coach App — 화면별 상세 진단

#### 2.1.1 Dashboard (`/coach/dashboard`) — 완성도 60%

**✅ 구현된 기능:**
- 시간대별 인사(Good morning/afternoon/evening)
- 오늘 수업 목록 (session_coaches → sessions JOIN)
- Quick Stats 3종 (오늘 수업 수, 체크인 수, 총 정원)
- 코치 공지 최근 3건
- 현재 진행중 세션 "LIVE NOW" 표시
- 스켈레톤 로딩 / Empty State

**❌ 부족한 기능:**
| # | 미구현 항목 | 영향도 | 설명 |
|---|-----------|--------|------|
| D1 | 수업별 **실제 예약 인원** 미표시 | 높음 | `bookings` 테이블에서 예약 카운트를 가져오지 않아, 정원만 표시되고 실제 몇 명이 예약했는지 알 수 없음 |
| D2 | 수업별 **출석 현황** 미표시 | 높음 | 현재 세션의 체크인 완료 인원 vs 예약 인원 미표시 |
| D3 | **주간 통계** 미구현 | 중간 | 이번 주 수업 수, 총 지도 회원 수 등 트렌드 정보 없음 |
| D4 | **오늘 체크인 수**가 전체 시설 기준 | 낮음 | 코치 본인의 수업 체크인이 아닌, 시설 전체 체크인 수를 보여줌 |
| D5 | 코치 전용 공지 필터 없음 | 낮음 | `notices.category`로 코치 전용 공지를 필터링하지 않음 |

#### 2.1.2 Schedule (`/coach/schedule`) — 완성도 65%

**✅ 구현된 기능:**
- 일간/주간 뷰 전환
- 날짜 탐색 (좌우 화살표)
- 수업 카드 (제목, 시간, 정원)
- WOD 설명 표시 (wod_description)
- 스켈레톤 / Empty State

**❌ 부족한 기능:**
| # | 미구현 항목 | 영향도 | 설명 |
|---|-----------|--------|------|
| S1 | **예약 회원 명단** 미표시 | 높음 | 수업 카드 클릭 시 예약 회원 리스트를 볼 수 없음 (bookings JOIN members 필요) |
| S2 | **출석 체크** 기능 없음 | 높음 | 코치가 수업 현장에서 회원 출석을 직접 체크하는 기능 없음 (checkins INSERT) |
| S3 | 수업별 **WOD 편집** 불가 | 중간 | 코치가 당일 WOD를 직접 수정할 수 없음 (sessions.wod_description UPDATE 필요) |
| S4 | **수업 상세 모달** 없음 | 중간 | 수업 카드 클릭 시 상세 정보(장소, 난이도 등) 확인 불가 |
| S5 | **월간 뷰** 없음 | 낮음 | 전체 달 단위의 스케줄 개요를 볼 수 없음 |

#### 2.1.3 Members (`/coach/members`) — 완성도 35%

**✅ 구현된 기능:**
- 전체 회원 목록 (이름 순 정렬)
- 이름/이메일 검색
- 회원 카드 (이니셜 아바타, 이름, 이메일, 상태)
- 카드 클릭 시 상세 펼치기 (연락처, 가입일)
- 코칭 노트 텍스트 영역 (UI만 존재)

**❌ 부족한 기능:**
| # | 미구현 항목 | 영향도 | 설명 |
|---|-----------|--------|------|
| M1 | **코칭 노트 저장** 미구현 | 최고 | `coachingNote` state만 있고 DB 저장 로직 없음. 입력해도 리렌더링 시 소실 |
| M2 | **coaching_notes 테이블** 없음 | 최고 | DB에 코칭 노트 전용 테이블이 없음. 설계 필요 |
| M3 | 회원 **출결 통계** 미표시 | 높음 | 특정 회원의 최근 출석률, 총 수업 참여 횟수 등 미표시 |
| M4 | 코치 **담당 회원**만 필터링 안됨 | 중간 | 코치가 담당(배정된 수업에 출석한) 회원만 보는 필터 없음, 전체 회원을 모두 표시 |
| M5 | 회원 **부상/특이사항 이력** 없음 | 중간 | 시간별 노트 이력 조회 불가 (단일 텍스트만 존재) |
| M6 | 회원 **멤버십 정보** 미표시 | 낮음 | 회원의 현재 멤버십 상태(잔여 크레딧 등)를 코치가 볼 수 없음 |

#### 2.1.4 Race (`/coach/race`) — 완성도 50%

**✅ 구현된 기능:**
- Race 이벤트 목록 (최근 20건)
- 이벤트 상태 표시 (예정/진행중/완료)
- 이벤트 상세 → 기록 목록 (순위별)
- 시간 포맷팅 (mm:ss.d)
- PR 배지 표시

**❌ 부족한 기능:**
| # | 미구현 항목 | 영향도 | 설명 |
|---|-----------|--------|------|
| R1 | **이벤트 생성** 기능 없음 | 높음 | 코치가 새 Race 이벤트를 만들 수 없음 (Admin에서만 가능) |
| R2 | **기록 입력** 기능 없음 | 높음 | 경기 결과를 코치가 직접 입력할 수 없음 |
| R3 | **PM5 기기 연결** 미구현 | 높음 | 하드웨어 연동이 완전 미구현 (별도 기획: `race-system.md`) |
| R4 | **실시간 리더보드** 없음 | 중간 | 실시간 경기 중계 기능 없음 |
| R5 | 경기 **시작/종료 제어** 없음 | 중간 | 이벤트 상태 변경(active → completed) 불가 |

> ⚠️ Race 기능은 별도 기획서(`race-system.md`)에서 PM5 하드웨어 통합과 함께 다룰 예정.
> 이 기획서에서는 **소프트웨어 레벨의 Race 관리 개선**에 집중한다.

#### 2.1.5 Profile (`/coach/profile`) — 완성도 50%

**✅ 구현된 기능:**
- 코치 기본 정보 표시 (이름, 이메일, 전문분야 태그)
- 이번 달/총 수업 통계
- Bio 표시
- 메뉴 링크 (일정, 회원, Race, 알림, 보안)
- 로그아웃

**❌ 부족한 기능:**
| # | 미구현 항목 | 영향도 | 설명 |
|---|-----------|--------|------|
| P1 | **프로필 편집** 불가 | 높음 | 코치가 자신의 bio, 전문분야, 연락처를 수정할 수 없음 (coaches UPDATE RLS 있음) |
| P2 | **프로필 이미지 표시/업로드** 없음 | 높음 | 이니셜만 표시, profile_image_url 미사용 |
| P3 | **급여/수당 조회** 미구현 | 높음 | Sitemap에 명시되어 있으나, Coach App에 급여 조회 화면 없음 |
| P4 | **알림 설정** 미구현 | 중간 | 메뉴에 "알림 설정" 링크가 `#`으로 되어 있음 (비활성) |
| P5 | **보안 설정** 미구현 | 중간 | 메뉴에 "보안 설정" 링크가 `#`으로 되어 있음 (비활성) |
| P6 | 월별 **수업 통계 차트** 없음 | 낮음 | 숫자만 있고 시각적 트렌드 없음 |

---

### 2.2 Admin 코치 관리 — 탭별 진단

#### 2.2.1 Management 탭 — 완성도 85%
**✅ 잘 구현된 점:**
- 회원 검색 → 코치 승격 (promote_to_coach RPC)
- 코치 삭제 → 회원 복원 (demote_from_coach RPC)
- 코치 카드 UI (이미지, 상태, 연결 배지, 전문분야)
- 이미지 업로드/삭제
- 미연결 코치 경고 배너
- 필터(전체/활동중/비활성/휴직) + 검색

**❌ 부족한 점:**
| # | 미구현 항목 | 영향도 |
|---|-----------|--------|
| AM1 | 코치 **수업 배정 현황** 미표시 | 중간 |
| AM2 | 코치별 **담당 회원 수** 미표시 | 낮음 |

#### 2.2.2 Performance 탭 — 완성도 30%
**❌ 심각한 문제:**
| # | 문제 | 영향도 | 설명 |
|---|------|--------|------|
| AP1 | **성과 데이터가 Mock/Random** | 최고 | `Math.random()`으로 생성한 가짜 데이터 사용 (L378~382) |
| AP2 | 코치 없을 때 **하드코딩 더미 데이터** 사용 | 높음 | 코치가 0명이면 5명의 가짜 코치 데이터 표시 (L385~391) |
| AP3 | **실제 DB 쿼리** 미연결 | 높음 | session_feedback, session_coaches 등과 JOIN하지 않음 |
| AP4 | Retention 데이터 **계산 로직** 없음 | 중간 | 회원 잔존율을 랜덤 숫자로 대체 |

#### 2.2.3 Settlements(정산) 탭 — 완성도 25%
**❌ 심각한 문제:**
| # | 문제 | 영향도 | 설명 |
|---|------|--------|------|
| AS1 | KPI "전월 정산 완료/미정산 건수" **하드코딩** | 높음 | 문자열 '12명', '2건' 고정값 |
| AS2 | 실제 **정산 로직** 미구현 | 최고 | `base_salary + session_allowance × 수업수` 계산 없음 |
| AS3 | **월별 정산 이력 테이블** 없음 | 높음 | DB에 정산 이력 테이블 미존재 |
| AS4 | "정산 내역 다운로드" / "월 정산 실행" **비활성** | 중간 | 버튼만 있고 동작하지 않음 |

---

### 2.3 User App — 코치 목록 (`/apps/coaches`) — 완성도 40%

**✅ 구현된 기능:**
- Active 코치 목록 (이름순)
- 코치 카드 (이니셜, 이름, 전문분야 태그)
- 카드 클릭 → 상세 바텀시트 모달
- 경력 년수 계산

**❌ 부족한 기능:**
| # | 미구현 항목 | 영향도 | 설명 |
|---|-----------|--------|------|
| UC1 | **프로필 이미지** 미표시 | 높음 | `profile_image_url`을 사용하지 않고 이니셜만 표시 |
| UC2 | 코치 **소개(bio)** 미표시 | 높음 | 모달에 bio 정보가 전혀 없음 |
| UC3 | **수업 정보** 연계 없음 | 중간 | 이 코치의 수업 목록을 볼 수 없음 |
| UC4 | 코치 **평점** 미표시 | 중간 | session_feedback 기반 평균 평점 미표시 |
| UC5 | `specialty` 필드명 불일치 | 낮음 | coaches 테이블은 `specialties` (배열)인데 코드는 `specialty` (문자열)로 조회 |

---

### 2.4 공통 인프라 문제

```
┌────────────────────────────────────────────────────────────────────┐
│  As-Is 데이터 흐름                                                  │
│                                                                    │
│  coaches 테이블                                                     │
│    ├── id, user_id, name, email, phone                             │
│    ├── specialties (TEXT[]), bio, profile_image_url                 │
│    ├── status, linked_at, linked_by                                │
│    └── base_salary, session_allowance ← Admin UI에만 사용           │
│                                                                    │
│  ❌ coaching_notes 테이블 없음                                      │
│  ❌ 코치 정산 이력 테이블 없음                                       │
│  ❌ 코치 수업별 출석체크 RPC 없음                                    │
│  ❌ 성과 집계 RPC/View 없음                                         │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. 개선 설계 (To-Be)

### 3.1 핵심 설계 원칙
- **기존 테이블 최대 활용**: coaches, session_coaches, sessions, bookings, checkins, session_feedback 기존 테이블 우선 사용
- **신규 테이블 최소화**: coaching_notes, coach_settlements 2개만 신규 생성
- **RPC 함수**: 복잡한 집계는 DB 함수로 처리 (클라이언트 다중 쿼리 방지)
- **Coach App UI**: User App 공통 컴포넌트(AppSkeleton, AppEmptyState 등) 재사용

### 3.2 개선된 흐름

```
┌────────────────────────────────────────────────────────────────────┐
│  To-Be 데이터 흐름                                                  │
│                                                                    │
│  [Coach Dashboard]                                                  │
│    fn_get_coach_dashboard(coach_user_id) RPC 호출                   │
│    → 오늘 수업, 예약/출석 인원, 주간 통계, 코치 공지 한번에 반환     │
│                                                                    │
│  [Coach Schedule → 수업 상세]                                       │
│    fn_get_session_attendees(session_id) RPC 호출                   │
│    → 예약 회원 명단 + 출석 여부 반환                                 │
│                                                                    │
│  [Coach Schedule → 출석 체크]                                       │
│    fn_coach_mark_attendance(session_id, member_id) RPC 호출        │
│    → checkins INSERT (수동 체크인)                                   │
│                                                                    │
│  [Coach Members → 코칭 노트]                                       │
│    coaching_notes 테이블 CRUD                                       │
│    → 코치별 회원별 시간순 노트 이력 관리                             │
│                                                                    │
│  [Coach Profile → 수정]                                             │
│    coaches UPDATE (bio, specialties, phone, profile_image_url)     │
│    → 기존 RLS "Coach can update own profile fields" 활용            │
│                                                                    │
│  [Admin Performance → 실 데이터]                                    │
│    fn_get_coach_performance_stats() RPC 호출                        │
│    → session_coaches + session_feedback + bookings JOIN 집계        │
│                                                                    │
│  [Admin Settlements → 실 데이터]                                    │
│    coach_settlements 테이블 + fn_calculate_monthly_settlement RPC   │
│    → base_salary + (session_count × session_allowance) 계산         │
│                                                                    │
│  [User App Coaches → 프로필 강화]                                   │
│    coaches.profile_image_url, bio, specialties 정상 표시            │
│    + session_feedback 기반 평균 평점 표시                            │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. 데이터베이스 변경

### 4.1 마이그레이션 SQL

```sql
-- ============================================================
-- 1. coaching_notes 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coaching_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    note_type TEXT NOT NULL DEFAULT 'general'
        CHECK (note_type IN ('general', 'injury', 'progress', 'caution')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coaching_notes_coach ON public.coaching_notes(coach_id);
CREATE INDEX idx_coaching_notes_member ON public.coaching_notes(member_id);
CREATE INDEX idx_coaching_notes_created ON public.coaching_notes(created_at DESC);

COMMENT ON TABLE public.coaching_notes IS '코치별 회원 코칭 노트 이력';

-- ============================================================
-- 2. coach_settlements 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coach_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL,  -- '2026-02' 형식
    base_salary INTEGER NOT NULL DEFAULT 0,
    session_count INTEGER NOT NULL DEFAULT 0,
    session_allowance INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'paid')),
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (coach_id, year_month)
);

CREATE INDEX idx_coach_settlements_month ON public.coach_settlements(year_month DESC);
CREATE INDEX idx_coach_settlements_coach ON public.coach_settlements(coach_id);

COMMENT ON TABLE public.coach_settlements IS '코치 월별 정산 이력';

-- ============================================================
-- 3. RPC: 코치 대시보드 집계
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_coach_dashboard(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_coach_id UUID;
    v_today DATE := CURRENT_DATE;
    v_result JSON;
BEGIN
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = p_user_id AND status = 'active';
    IF v_coach_id IS NULL THEN
        RETURN json_build_object('error', 'coach_not_found');
    END IF;

    SELECT json_build_object(
        'coach_id', v_coach_id,
        'today_sessions', (
            SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
                SELECT s.id, s.title, s.start_time, s.end_time, s.capacity, s.session_date,
                    s.wod_description,
                    (SELECT COUNT(*) FROM public.bookings b WHERE b.session_id = s.id AND b.status = 'confirmed') AS booked_count,
                    (SELECT COUNT(*) FROM public.checkins c WHERE c.session_id = s.id AND c.checkin_time::date = v_today) AS checkin_count
                FROM public.sessions s
                JOIN public.session_coaches sc ON sc.session_id = s.id
                WHERE sc.coach_id = v_coach_id AND s.session_date = v_today
                ORDER BY s.start_time
            ) t
        ),
        'today_total_bookings', (
            SELECT COUNT(*) FROM public.bookings b
            JOIN public.sessions s ON s.id = b.session_id
            JOIN public.session_coaches sc ON sc.session_id = s.id
            WHERE sc.coach_id = v_coach_id AND s.session_date = v_today AND b.status = 'confirmed'
        ),
        'today_total_checkins', (
            SELECT COUNT(*) FROM public.checkins c
            JOIN public.sessions s ON s.id = c.session_id
            JOIN public.session_coaches sc ON sc.session_id = s.id
            WHERE sc.coach_id = v_coach_id AND c.checkin_time::date = v_today
        ),
        'week_sessions', (
            SELECT COUNT(DISTINCT s.id) FROM public.sessions s
            JOIN public.session_coaches sc ON sc.session_id = s.id
            WHERE sc.coach_id = v_coach_id
              AND s.session_date >= date_trunc('week', v_today)::date
              AND s.session_date <= (date_trunc('week', v_today) + interval '6 days')::date
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. RPC: 수업 참석자 + 출석 상태 조회
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_session_attendees(p_session_id UUID)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
            SELECT
                b.id AS booking_id,
                b.member_id,
                m.name AS member_name,
                m.avatar_url,
                b.status AS booking_status,
                CASE WHEN c.id IS NOT NULL THEN true ELSE false END AS checked_in,
                c.checkin_time
            FROM public.bookings b
            JOIN public.members m ON m.id = b.member_id
            LEFT JOIN public.checkins c ON c.session_id = b.session_id AND c.member_id = b.member_id
            WHERE b.session_id = p_session_id
              AND b.status IN ('confirmed', 'waitlisted')
            ORDER BY b.status, m.name
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. RPC: 코치 출석 체크 (수동)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_coach_mark_attendance(
    p_session_id UUID,
    p_member_id UUID,
    p_coach_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_coach_id UUID;
    v_existing UUID;
BEGIN
    -- 코치 확인
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = p_coach_user_id;
    IF v_coach_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_a_coach');
    END IF;

    -- 중복 체크인 확인
    SELECT id INTO v_existing FROM public.checkins
    WHERE session_id = p_session_id AND member_id = p_member_id;
    IF v_existing IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'already_checked_in');
    END IF;

    -- 체크인 INSERT
    INSERT INTO public.checkins (member_id, session_id, checkin_method, checkin_time)
    VALUES (p_member_id, p_session_id, 'manual_coach', now());

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. RPC: 코치 성과 통계 (Admin용)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_coach_performance_stats()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
            SELECT
                c.id,
                c.name,
                c.email,
                c.specialties,
                c.status,
                (SELECT COUNT(*) FROM public.session_coaches sc WHERE sc.coach_id = c.id) AS total_sessions,
                COALESCE((SELECT ROUND(AVG(sf.rating)::numeric, 1) FROM public.session_feedback sf WHERE sf.coach_id = c.id), 0) AS avg_rating,
                (SELECT COUNT(DISTINCT b.member_id) FROM public.bookings b
                 JOIN public.session_coaches sc ON sc.session_id = b.session_id
                 WHERE sc.coach_id = c.id AND b.status = 'confirmed') AS total_members
            FROM public.coaches c
            WHERE c.status = 'active'
            ORDER BY avg_rating DESC, total_sessions DESC
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. RPC: 월별 정산 계산
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_calculate_monthly_settlement(
    p_year_month TEXT,  -- '2026-02'
    p_admin_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_coach RECORD;
    v_session_count INTEGER;
    v_total INTEGER;
BEGIN
    v_start_date := (p_year_month || '-01')::DATE;
    v_end_date := (v_start_date + interval '1 month' - interval '1 day')::DATE;

    FOR v_coach IN SELECT id, base_salary, session_allowance FROM public.coaches WHERE status = 'active'
    LOOP
        SELECT COUNT(DISTINCT sc.session_id) INTO v_session_count
        FROM public.session_coaches sc
        JOIN public.sessions s ON s.id = sc.session_id
        WHERE sc.coach_id = v_coach.id
          AND s.session_date >= v_start_date
          AND s.session_date <= v_end_date;

        v_total := COALESCE(v_coach.base_salary, 0) + (v_session_count * COALESCE(v_coach.session_allowance, 0));

        INSERT INTO public.coach_settlements (coach_id, year_month, base_salary, session_count, session_allowance, total_amount, status)
        VALUES (v_coach.id, p_year_month, COALESCE(v_coach.base_salary, 0), v_session_count, COALESCE(v_coach.session_allowance, 0), v_total, 'pending')
        ON CONFLICT (coach_id, year_month) DO UPDATE SET
            base_salary = EXCLUDED.base_salary,
            session_count = EXCLUDED.session_count,
            session_allowance = EXCLUDED.session_allowance,
            total_amount = EXCLUDED.total_amount;
    END LOOP;

    RETURN json_build_object('success', true, 'year_month', p_year_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 RLS 정책

```sql
-- coaching_notes RLS
ALTER TABLE public.coaching_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can manage own notes" ON public.coaching_notes
    FOR ALL TO authenticated
    USING (coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid()))
    WITH CHECK (coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid()));

CREATE POLICY "Admin full access to coaching_notes" ON public.coaching_notes
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- coach_settlements RLS
ALTER TABLE public.coach_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can view own settlements" ON public.coach_settlements
    FOR SELECT TO authenticated
    USING (coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid()));

CREATE POLICY "Admin full access to settlements" ON public.coach_settlements
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

## 5. UI 변경 상세

### 5.1 Coach Dashboard 개선 레이아웃

```
┌─────────────────────────────────┐
│  Good morning,                  │
│  Coach 박코치                    │
├─────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐     │
│ │  3   │ │ 12/15│ │  8/12│     │
│ │수업  │ │예약  │ │출석  │     │  ← 개선: 예약/출석 인원
│ └──────┘ └──────┘ └──────┘     │
├─────────────────────────────────┤
│ 🔴 LIVE NOW                     │
│ Morning CrossFit                │
│ 09:00~10:00 · 15/20명 · ✅ 12명│  ← 개선: 예약/출석 인원
│ [출석 명단 보기 →]              │  ← 신규: 수업 상세
├─────────────────────────────────┤
│ 오늘 수업 (전체 보기 →)         │
│ ┌───────────────────────────┐   │
│ │ Afternoon WOD             │   │
│ │ 14:00~15:00 · 12/20 · 8명│   │  ← 개선: 예약/출석 표시
│ └───────────────────────────┘   │
├─────────────────────────────────┤
│ 📢 공지사항                     │
│ ...                             │
└─────────────────────────────────┘
```

### 5.2 Coach Schedule — 수업 상세 모달

```
┌─────────────────────────────────┐
│ ──── Morning CrossFit           │
│ 09:00~10:00 · 정원 20명         │
│                                 │
│ WOD:                            │
│ ┌─────────────────────────────┐ │
│ │ For Time:                   │ │  ← 편집 가능 (textarea)
│ │ 21-15-9 Thruster/Pull-up   │ │
│ └─────────────────────────────┘ │
│                                 │
│ 예약 회원 (15/20) · 출석 12/15  │
│ ┌─────────────────────────────┐ │
│ │ ✅ 김철수    09:02          │ │  ← 출석 완료
│ │ ⬜ 박영희    미출석  [체크]  │ │  ← 출석 체크 버튼
│ │ ✅ 이민수    09:05          │ │
│ │ ⏳ 홍길동    대기열          │ │  ← waitlisted
│ └─────────────────────────────┘ │
│                                 │
│         [닫기]                   │
└─────────────────────────────────┘
```

### 5.3 Coach Members — 코칭 노트 개선

```
┌─────────────────────────────────┐
│ 김철수 회원 상세                 │
├─────────────────────────────────┤
│ 연락처: 010-1234-5678           │
│ 가입일: 2025.06.15              │
│ 멤버십: 무제한 (잔여 ∞)         │  ← 신규
│ 출석률: 이달 12/18 (67%)        │  ← 신규
├─────────────────────────────────┤
│ 코칭 노트 (3건)                 │
│ ┌─────────────────────────────┐ │
│ │ 🔴 부상  02/20              │ │  ← 타입별 색상
│ │ 왼쪽 어깨 통증 - 프레스 제외 │ │
│ ├─────────────────────────────┤ │
│ │ 🟢 진행  02/15              │ │
│ │ 스쿼트 100kg PR 달성        │ │
│ ├─────────────────────────────┤ │
│ │ ⚪ 일반  02/10              │ │
│ │ 유연성 운동 추가 권장        │ │
│ └─────────────────────────────┘ │
│                                 │
│ 새 노트 추가                    │
│ [타입: 일반 ▾] [____내용____]   │
│ [저장]                          │
└─────────────────────────────────┘
```

---

## 6. 영향 범위 분석

| 파일/모듈 | 변경 내용 | 변경 필요 여부 |
|----------|----------|-------------|
| `src/app/coach/dashboard/page.tsx` | RPC 호출로 전환, 예약/출석 인원 표시 | ✅ 수정 |
| `src/app/coach/schedule/page.tsx` | 수업 상세 모달 추가, 출석체크 기능 | ✅ 수정 |
| `src/app/coach/members/page.tsx` | coaching_notes CRUD, 출결 통계, 필터 | ✅ 대폭 수정 |
| `src/app/coach/profile/page.tsx` | 프로필 편집, 이미지 업로드, 급여 조회 | ✅ 대폭 수정 |
| `src/app/coach/race/page.tsx` | 이벤트 생성, 기록 입력, 상태 변경 | ✅ 수정 (소프트웨어 레벨) |
| `src/app/admin/operations/coaches/page.tsx` (Performance) | Mock 데이터 → 실 DB 쿼리 | ✅ 수정 |
| `src/app/admin/operations/coaches/page.tsx` (Settlements) | 정산 로직 연동, 월 정산 실행 | ✅ 수정 |
| `src/app/apps/coaches/page.tsx` | profile_image_url, bio, specialties 표시 | ✅ 수정 |
| `supabase/migrations/` | coaching_notes, coach_settlements 테이블 + RPC 6개 | ✅ 신규 |
| `.docs/database-reference.md` | 신규 테이블, RPC 목록 추가 | ✅ 갱신 |
| `.docs/sitemap/coach-app.md` | 기능 상세 업데이트 | ✅ 갱신 |

---

## 7. 보안 고려사항

| 위협 | 대응 |
|------|------|
| 다른 코치의 노트 조회/수정 | RLS: coaching_notes는 본인 coach_id만 접근 |
| 코치가 아닌 사용자의 출석 체크 | RPC: fn_coach_mark_attendance 내부에서 코치 권한 확인 |
| 타 코치 정산 정보 열람 | RLS: coach_settlements는 본인 것만 SELECT |
| 코치 프로필 수정 범위 제한 | 기존 RLS "Coach can update own profile fields" 유지, user_id/status 변경 불가 |

---

## 8. 구현 단계 및 관점 배분

### Phase 1: DB 인프라 (coaching_notes + settlements + RPC 6개) → 💎 Senior Dev
| # | 작업 | 예상 소요 |
|---|------|----------|
| 1-1 | coaching_notes 테이블 생성 + RLS | 15분 |
| 1-2 | coach_settlements 테이블 생성 + RLS | 15분 |
| 1-3 | fn_get_coach_dashboard RPC | 20분 |
| 1-4 | fn_get_session_attendees RPC | 10분 |
| 1-5 | fn_coach_mark_attendance RPC | 10분 |
| 1-6 | fn_get_coach_performance_stats RPC | 15분 |
| 1-7 | fn_calculate_monthly_settlement RPC | 15분 |
| 1-8 | database-reference.md 갱신 | 10분 |

### Phase 2: Coach Dashboard + Schedule 고도화 → 🎨 UI Developer
| # | 작업 | 예상 소요 |
|---|------|----------|
| 2-1 | Dashboard RPC 전환 + 예약/출석 인원 표시 | 30분 |
| 2-2 | Schedule 수업 상세 모달 (예약 회원 명단) | 30분 |
| 2-3 | Schedule 출석체크 기능 | 20분 |
| 2-4 | Schedule WOD 편집 기능 | 15분 |

### Phase 3: Coach Members 코칭 노트 시스템 → 💻 Developer
| # | 작업 | 예상 소요 |
|---|------|----------|
| 3-1 | coaching_notes CRUD 구현 (생성, 목록, 삭제) | 30분 |
| 3-2 | 노트 타입별 필터 + UI | 15분 |
| 3-3 | 회원 출결 통계 표시 (checkins 집계) | 15분 |
| 3-4 | 담당 회원 필터 옵션 | 10분 |

### Phase 4: Coach Profile 고도화 → 🎨 UI Developer
| # | 작업 | 예상 소요 |
|---|------|----------|
| 4-1 | 프로필 편집 모드 (bio, specialties, phone 수정) | 25분 |
| 4-2 | 프로필 이미지 표시 + 업로드 | 20분 |
| 4-3 | 급여 조회 섹션 (coach_settlements 조회) | 20분 |
| 4-4 | 수업 통계 강화 (월별 추이) | 15분 |

### Phase 5: Admin Performance + Settlements 실 데이터 → 💻 Developer
| # | 작업 | 예상 소요 |
|---|------|----------|
| 5-1 | Performance 탭 Mock → 실 DB 교체 (fn_get_coach_performance_stats) | 20분 |
| 5-2 | Settlements 탭 정산 계산 연동 (fn_calculate_monthly_settlement) | 25분 |
| 5-3 | 정산 상태 변경 (pending → confirmed → paid) | 15분 |
| 5-4 | 정산 다운로드 (CSV) | 15분 |

### Phase 6: User App 코치 목록 + Coach Race 개선 → 🎨 UI Developer
| # | 작업 | 예상 소요 |
|---|------|----------|
| 6-1 | User App 코치 목록: profile_image_url, bio, specialties 정상 표시 | 15분 |
| 6-2 | User App 코치 상세: 평균 평점, 수업 목록 | 20분 |
| 6-3 | Coach Race: 이벤트 생성/상태 변경 UI | 20분 |
| 6-4 | Coach Race: 기록 입력 UI | 15분 |

### Phase 7: 문서 동기화 → 🏛️ Architect
| # | 작업 | 예상 소요 |
|---|------|----------|
| 7-1 | sitemap/coach-app.md 갱신 | 10분 |
| 7-2 | database-reference.md 최종 갱신 | 10분 |
| 7-3 | project-blueprint.md 갱신 | 5분 |

---

## 9. 블루프린트 등록용 체크리스트

```
#### 🟠 Priority XX: 코치 기능 고도화 (NEW)
  > 기획서: `.docs/planning/coach-feature-enhancement.md`
  > **문제**: Coach App 5화면 완성도 ~55%, Admin 성과/정산 Mock 데이터, 코칭 노트 DB 미존재, User App 코치 프로필 불완전
  > **방안**: coaching_notes + coach_settlements 테이블 + RPC 6개 → Coach App 전체 고도화 → Admin 실 데이터 교체 → User 코치 목록 개선

  - [ ] Phase 1: DB 인프라 → 💎 **Senior Dev (Opus)**
    - [ ] coaching_notes + coach_settlements 테이블 생성
    - [ ] RPC 6개 (dashboard, attendees, attendance, performance, settlement) 생성
    - [ ] RLS 정책 적용
    - [ ] database-reference.md 갱신

  - [ ] Phase 2: Coach Dashboard + Schedule 고도화 → 🎨 **UI Developer (Gemini)**
    - [ ] Dashboard RPC 전환 (예약/출석 인원 표시)
    - [ ] Schedule 수업 상세 모달 + 출석체크 + WOD 편집

  - [ ] Phase 3: Coach Members 코칭 노트 시스템 → 💻 **Developer (Sonnet)**
    - [ ] coaching_notes CRUD + 타입 필터
    - [ ] 회원 출결 통계 + 담당 회원 필터

  - [ ] Phase 4: Coach Profile 고도화 → 🎨 **UI Developer (Gemini)**
    - [ ] 프로필 편집, 이미지 업로드, 급여 조회

  - [ ] Phase 5: Admin Performance + Settlements 실 데이터 → 💻 **Developer (Sonnet)**
    - [ ] Mock 데이터 → 실 DB 교체
    - [ ] 월 정산 실행, 상태 변경, CSV 다운로드

  - [ ] Phase 6: User App + Coach Race 개선 → 🎨 **UI Developer (Gemini)**
    - [ ] 코치 프로필 강화 (이미지, bio, 평점)
    - [ ] Race 이벤트 생성/기록 입력

  - [ ] Phase 7: 문서 동기화 → 🏛️ **Architect (Opus)**
    - [ ] sitemap + database-reference + blueprint 갱신
```

---

## 10. 테스트 시나리오

### 10.1 정상 흐름
| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| T1 | 코치 로그인 → Dashboard 진입 | 오늘 수업 목록 + 예약/출석 인원 정상 표시 |
| T2 | Schedule 수업 카드 클릭 → 상세 모달 | 예약 회원 명단 표시, 출석/미출석 구분 |
| T3 | 출석 체크 버튼 클릭 | 해당 회원 체크인 완료, 실시간 반영 |
| T4 | Members → 회원 선택 → 코칭 노트 작성 | coaching_notes에 저장, 리렌더링 후 유지 |
| T5 | Profile → 편집 → 저장 | coaches 테이블 업데이트, 즉시 반영 |
| T6 | Profile → 급여 조회 | 이번 달/전월 정산 내역 표시 |
| T7 | Admin → Performance 탭 | 실제 수업 수/평점/회원 수 표시 (Mock 아님) |
| T8 | Admin → Settlements → 월 정산 실행 | coach_settlements 레코드 생성, 금액 계산 정확 |

### 10.2 예외 흐름
| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| T9 | 미연결 코치가 Dashboard 접근 | "코치 계정이 연결되지 않았습니다" 배너 표시, 빈 데이터 |
| T10 | 이미 출석체크된 회원 재클릭 | "이미 체크인 되었습니다" 메시지 |
| T11 | 코칭 노트 빈 내용으로 저장 시도 | 유효성 검증 에러 |
| T12 | User App에서 코치 상세 → 프로필 이미지 없는 경우 | 이니셜 폴백 |

---

## 11. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| coaching_notes 데이터 급증 시 성능 | 중간 | 인덱스 적용 + 페이지네이션 (최근 50건 기본) |
| 정산 금액 계산 오차 | 높음 | DB 함수 내 정수 연산, 프론트엔드 계산 배제 |
| 코치 다수 동시 출석체크 시 중복 | 중간 | RPC 내 중복 체크 + UNIQUE 제약 (session_id + member_id) |
| Race 이벤트 생성 권한 범위 | 낮음 | 코치만 생성 가능하도록 RPC 내 권한 검증 |

---

## 12. Planning Log (기획 진행 기록)

### Session 1 — 2026-02-21
- **작성 범위**: 전체 초안 (섹션 1~11)
- **완성된 섹션**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
- **미완성 섹션**: 없음 (초안 레벨에서 전체 커버)
- **TODO**:
  - 사용자 리뷰 후 Race 기능 범위 확정 (race-system.md와 중복 범위 조정)
  - 급여/정산 비즈니스 요구사항 확인 (기본급/수당 외 추가 항목)
  - Stitch MCP 디자인 생성 (Coach App 주요 화면)
  - Approved 전환 후 `/plan-to-blueprint` 실행

---

**문서 버전**: 1.0.0
**최종 업데이트**: 2026-02-21
