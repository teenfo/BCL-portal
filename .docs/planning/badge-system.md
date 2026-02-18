# BCL Portal – 배지 시스템 고도화 기획서

> **Status**: Approved
> **Author**: Architect (Opus)
> **Created**: 2026-02-19
> **Last Updated**: 2026-02-19
> **Related**:
>   - `.docs/sitemap/user-app.md` (배지 화면 — 구현 완료 표시)
>   - `.docs/sitemap/admin/03-operations.md` (배지 관리 추가 대상)
>   - `.docs/planning/user-app-enhancement.md` (Badges 40% 완성도)

---

## 1. 개요 및 배경

### 1.1 목적

현재 **코드 하드코딩으로 관리되는 배지 시스템**을 **DB 기반 동적 배지 시스템**으로 전환하여, Admin이 코드 수정 없이 새로운 배지를 등록하고 달성 목표를 설정할 수 있도록 한다.

**핵심 목표**:
1. 배지 정의를 DB로 이관 → Admin CRUD
2. 달성 기록을 DB에 영속 저장 → 달성 시점/통계 보존
3. 달성 판정 자동화 → DB Trigger + pg_cron 하이브리드
4. User 배지 화면 리팩토링 → DB 조회 기반

### 1.2 현재 상태 (As-Is 요약)

| 항목 | 현재 상태 | 문제 |
|------|----------|------|
| 배지 정의 | `BADGE_DEFINITIONS` 상수 배열 (15개) | 코드 수정 + 배포 필요 |
| 달성 판정 | `getProgress()` switch/case | 하드코딩, 확장 불가 |
| 달성 기록 | 저장 안 됨 (매번 실시간 계산) | earnedDate가 항상 now() |
| 진행도 | checkins, session_feedback, members에서 매번 전체 SELECT | 비효율적 |
| Admin 관리 | 없음 | 배지 추가/수정/비활성화 불가 |
| DB 테이블 | badge 전용 테이블 없음 | — |

### 1.3 핵심 제약 조건

| 항목 | 내용 |
|------|------|
| 렌더링 | CSR Only |
| 데이터 접근 | Supabase anon key + RLS |
| UI 디자인 | User: Glassmorphism Dark, Admin: 기존 admin 디자인 시스템 |
| 네비게이션 | User: Quick Links에서 접근, Admin: Sidebar > Operations |
| 데이터 소유권 | 배지 정의는 Admin이 관리, User는 Read-only |

---

## 2. 현재 문제 진단 (As-Is)

### 2.1 코드 분석

```
현재 아키텍처 (전체가 page.tsx 346 LoC):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  badges/page.tsx
  ┌──────────────────────────────────────────────────────┐
  │                                                      │
  │  ① BADGE_DEFINITIONS (const 배열, 15개 하드코딩)       │
  │     ├── attendance: 6개 (first_checkin ~ centurion)  │
  │     ├── performance: 3개 (first_wod ~ wod_master)    │
  │     ├── community: 2개 (first_feedback, review_star) │
  │     └── milestone: 3개 (member_1m ~ member_1y)       │
  │                                                      │
  │  ② loadBadges()                                      │
  │     ├── Supabase에서 3개 테이블 조회 (Promise.all)     │
  │     │   ├── checkins.select('time')                  │
  │     │   ├── session_feedback.select('id,rating,comment')│
  │     │   └── members.select('created_at')             │
  │     │                                                │
  │     ├── 수동 통계 계산                                │
  │     │   ├── totalCheckins (전체 COUNT)                │
  │     │   ├── weekCheckins (7일 내)                     │
  │     │   ├── monthCheckins (이번 달)                   │
  │     │   ├── streak (연속 출석일 — 60일 루프)           │
  │     │   ├── totalWods (rating >= 4 필터 🚨 잘못됨)      │
  │     │   └── totalPRs (comment에 'PR' 포함 🚨 잘못됨)    │
  │     │                                                │
  │     └── getProgress() — switch/case로 매핑           │
  │                                                      │
  │  ③ UI 렌더링                                         │
  │     ├── 진행도 링형 차트 (SVG)                        │
  │     ├── 카테고리 필터 칩                              │
  │     ├── 3열 배지 그리드                               │
  │     └── 배지 상세 모달                                │
  └──────────────────────────────────────────────────────┘
```

### 2.2 발견된 버그

| # | 버그 | 코드 위치 | 설명 |
|---|------|-----------|------|
| B1 | **WOD 카운트 잘못됨** | line 71 | `session_feedback.rating >= 4`를 WOD로 간주 — 실제로는 피드백 평점이지 WOD 기록이 아님 |
| B2 | **PR 카운트 잘못됨** | line 72 | `comment.includes('PR')`로 PR 판정 — "PR" 단어가 우연히 포함되면 오판 |
| B3 | **earnedDate 부정확** | line 119 | 항상 `new Date().toISOString()` — 실제 달성 시점이 아닌 페이지 로딩 시점 |
| B4 | **streak 계산 비효율** | line 76~86 | 매번 전체 체크인을 가져와 60일 루프 — 체크인이 수천 건이면 성능 문제 |

### 2.3 카테고리별 배지 분석

```
현재 15개 배지:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📂 attendance (출석) — 6개
  ├── first_checkin   : 첫 체크인 (threshold: 1)
  ├── week_warrior    : 주간 5회 (threshold: 5)
  ├── month_master    : 월간 20회 (threshold: 20)
  ├── streak_7        : 7일 연속 (threshold: 7)
  ├── streak_30       : 30일 연속 (threshold: 30)
  └── centurion       : 100회 출석 (threshold: 100)

  📂 performance (성과) — 3개
  ├── first_wod       : 첫 WOD (threshold: 1) 🚨 측정 로직 잘못됨
  ├── pr_hunter       : PR 5회 (threshold: 5)  🚨 측정 로직 잘못됨
  └── wod_master      : WOD 50회 (threshold: 50) 🚨 측정 로직 잘못됨

  📂 community (커뮤니티) — 2개
  ├── first_feedback  : 첫 피드백 (threshold: 1)
  └── review_star     : 피드백 10개 (threshold: 10)

  📂 milestone (마일스톤) — 3개
  ├── member_1m       : 1개월 회원 (threshold: 30일)
  ├── member_6m       : 6개월 회원 (threshold: 180일)
  └── member_1y       : 1년 회원 (threshold: 365일)
```

---

## 3. 개선 설계 (To-Be)

### 3.1 새로운 아키텍처

```
To-Be 아키텍처:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [Admin 관리]                      [Database]                    [User 앱]
  /admin/operations/badges                                       /apps/badges
  ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
  │ 배지 등록/수정/삭제    │───→│ badge_definitions    │←───│ 배지 목록 표시        │
  │ ├── 이름, 아이콘       │    │ ├── name, icon      │    │ ├── 카테고리 필터      │
  │ ├── 카테고리 선택       │    │ ├── category        │    │ ├── 진행도 프로그레스   │
  │ ├── metric_type 선택   │    │ ├── metric_type     │    │ └── 달성 모달         │
  │ ├── threshold 설정     │    │ ├── threshold       │    └──────────────────────┘
  │ └── 활성/비활성 토글    │    │ └── is_active       │             ↑
  └──────────────────────┘    └──────────────────────┘             │
                                                                   │
                              ┌──────────────────────┐             │
                              │ badge_awards         │─────────────┘
                              │ ├── member_id        │  (달성 기록)
                              │ ├── badge_id         │
                              │ ├── earned_at        │
                              │ └── progress_snapshot │
                              └──────────────────────┘
                                     ↑          ↑
                              ┌──────┘          └──────┐
                         [DB Trigger]           [pg_cron]
                         (이벤트 기반)           (시간 기반)
                         ├── 체크인 시           ├── 매일 09:00
                         ├── 피드백 작성 시       │   가입 경과일
                         └── 기록 등록 시         │   계산
                                                 └── 배지 수여

  📊 진행도 계산 전략 (11개 metric_type):
  ┌──────────────────────────────────────────────────────────────────┐
  │ metric_type → 계산 함수 매핑 (DB Function)                        │
  │                                                                  │
  │ ── 출석 관련 ──                                                   │
  │ 'total_checkins'            → COUNT(*) FROM checkins             │
  │ 'week_checkins'             → COUNT(*) WHERE last 7 days         │
  │ 'month_checkins'            → COUNT(*) WHERE this month          │
  │ 'streak_days'               → fn_calculate_streak()              │
  │                                                                  │
  │ ── 성과 관련 ──                                                   │
  │ 'total_feedbacks'           → COUNT(*) FROM session_feedback      │
  │ 'total_prs'                 → COUNT(*) FROM race_records.is_pr    │
  │ 'total_race_participations' → COUNT(*) FROM race_records          │
  │ 'total_race_wins'           → COUNT(*) FROM race_records.rank=1   │
  │                                                                  │
  │ ── 활동 관련 ──                                                   │
  │ 'total_bookings'            → COUNT(*) FROM bookings confirmed   │
  │ 'total_purchases'           → COUNT(*) FROM transactions completed│
  │                                                                  │
  │ ── 시간 관련 ──                                                   │
  │ 'member_days'               → EXTRACT(DAY FROM now()-created_at) │
  └──────────────────────────────────────────────────────────────────┘
```

### 3.2 설계 원칙

1. **DB 중심 설계** — 배지 정의/달성은 모두 DB에서 관리
2. **metric_type 패턴** — 새로운 측정 기준 추가 시 DB 함수만 추가 (프론트 변경 최소)
3. **이벤트 기반 + 배치 하이브리드** — 실시간성이 필요한 것은 Trigger, 시간 기반은 pg_cron
4. **기존 코드 패턴 유지** — User 화면의 Glassmorphism, Admin의 기존 테이블/필터 패턴

### 3.3 데이터 흐름 상세

```
[체크인 발생]
     │
     ▼
  checkins INSERT
     │
     ▼ (AFTER INSERT TRIGGER)
  fn_check_badges_on_checkin()
     │
     ├─── 해당 member_id의 badge_definitions WHERE metric_type IN
     │    ('total_checkins', 'week_checkins', 'month_checkins', 'streak_days')
     │    AND is_active = true
     │    AND NOT EXISTS (badge_awards WHERE member_id AND badge_id)
     │
     ├─── 각 배지별 현재 progress 계산
     │
     ├─── progress >= threshold ?
     │    ├── YES → badge_awards INSERT (earned_at = now())
     │    └── NO → pass
     │
     └─── (선택) 달성 시 알림 INSERT → notifications 테이블
```

---

## 4. 데이터베이스 변경

### 4.1 신규 테이블

```sql
-- ==========================================
-- 1. 배지 정의 테이블
-- ==========================================
CREATE TABLE public.badge_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    icon            TEXT NOT NULL DEFAULT '🏅',        -- emoji 또는 이미지 URL
    category        TEXT NOT NULL DEFAULT 'milestone'
                    CHECK (category IN ('attendance', 'performance', 'community', 'milestone')),
    metric_type     TEXT NOT NULL
                    CHECK (metric_type IN (
                        'total_checkins', 'week_checkins', 'month_checkins',
                        'streak_days',
                        'total_feedbacks',
                        'total_prs', 'total_race_participations', 'total_race_wins',
                        'member_days',
                        'total_bookings', 'total_purchases'
                    )),
    threshold       INTEGER NOT NULL DEFAULT 1 CHECK (threshold > 0),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.badge_definitions IS '배지 정의 — Admin이 관리하는 배지 목록';
COMMENT ON COLUMN public.badge_definitions.metric_type IS '진행도 측정 기준 (어떤 데이터를 카운트할지)';
COMMENT ON COLUMN public.badge_definitions.threshold IS '달성 목표 수치 (progress >= threshold → 배지 수여)';

-- 정렬 인덱스
CREATE INDEX idx_badge_definitions_category ON public.badge_definitions (category, sort_order);
CREATE INDEX idx_badge_definitions_active ON public.badge_definitions (is_active) WHERE is_active = true;

-- ==========================================
-- 2. 배지 수여 기록 테이블
-- ==========================================
CREATE TABLE public.badge_awards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id       UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    badge_id        UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
    earned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    progress_snapshot INTEGER NOT NULL DEFAULT 0,     -- 달성 시점의 실제 수치
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_badge_awards_member_badge UNIQUE (member_id, badge_id)
);

COMMENT ON TABLE public.badge_awards IS '배지 수여 기록 — 회원이 달성한 배지 히스토리';

-- 인덱스
CREATE INDEX idx_badge_awards_member ON public.badge_awards (member_id);
CREATE INDEX idx_badge_awards_badge ON public.badge_awards (badge_id);

-- updated_at 트리거 (badge_definitions)
CREATE TRIGGER set_badge_definitions_updated_at
    BEFORE UPDATE ON public.badge_definitions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
```

### 4.2 초기 데이터 (기존 하드코딩 → DB 마이그레이션)

```sql
-- 기존 15개 + 신규 8개 = 총 23개 배지를 DB로 마이그레이션
INSERT INTO public.badge_definitions (name, description, icon, category, metric_type, threshold, sort_order) VALUES
-- attendance (출석) — 6개
('첫 발걸음', '첫 체크인을 완료하세요', '🎯', 'attendance', 'total_checkins', 1, 10),
('주간 전사', '일주일에 5회 출석', '⚡', 'attendance', 'week_checkins', 5, 20),
('월간 마스터', '한 달에 20회 출석', '🔥', 'attendance', 'month_checkins', 20, 30),
('7일 연속', '7일 연속 출석', '💫', 'attendance', 'streak_days', 7, 40),
('30일 연속', '30일 연속 출석', '🌟', 'attendance', 'streak_days', 30, 50),
('100회 출석', '총 100회 출석 달성', '💯', 'attendance', 'total_checkins', 100, 60),
-- performance (성과) — 7개 (기존 buggy 3개 수정 + 신규 4개)
('첫 레이스', '첫 레이스에 참가하세요', '🚣', 'performance', 'total_race_participations', 1, 110),
('레이스 10회', '레이스 10회 참가', '🏁', 'performance', 'total_race_participations', 10, 115),
('첫 우승', '레이스에서 첫 1위 달성', '🥇', 'performance', 'total_race_wins', 1, 120),
('챔피언', '레이스 우승 5회', '🏆', 'performance', 'total_race_wins', 5, 125),
('PR 헌터', 'PR 5회 달성', '💪', 'performance', 'total_prs', 5, 130),
('PR 마스터', 'PR 20회 달성', '🔱', 'performance', 'total_prs', 20, 135),
('50회 예약', '수업 50회 예약 확정', '📅', 'performance', 'total_bookings', 50, 140),
-- community (커뮤니티) — 2개
('첫 피드백', '첫 수업 피드백 작성', '📝', 'community', 'total_feedbacks', 1, 210),
('리뷰 스타', '피드백 10개 작성', '⭐', 'community', 'total_feedbacks', 10, 220),
-- milestone (마일스톤) — 8개 (기존 3개 + 신규 5개)
('1개월 회원', '가입 후 1개월', '🎖️', 'milestone', 'member_days', 30, 310),
('6개월 회원', '가입 후 6개월', '🏅', 'milestone', 'member_days', 180, 320),
('1년 회원', '가입 후 1년', '👑', 'milestone', 'member_days', 365, 330),
('첫 결제', '첫 멤버십 결제 완료', '💳', 'milestone', 'total_purchases', 1, 340),
('VIP 회원', '멤버십 5회 갱신', '💎', 'milestone', 'total_purchases', 5, 350);
```

### 4.3 RLS 정책

```sql
-- ==========================================
-- badge_definitions RLS
-- ==========================================
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자가 활성 배지 조회 가능
CREATE POLICY "badge_definitions_select_active"
    ON public.badge_definitions FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Admin만 전체 조회 (비활성 포함)
CREATE POLICY "badge_definitions_select_admin"
    ON public.badge_definitions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.user_id = auth.uid()
            AND members.role IN ('admin', 'super_admin')
        )
    );

-- Admin만 INSERT/UPDATE/DELETE
CREATE POLICY "badge_definitions_insert_admin"
    ON public.badge_definitions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.user_id = auth.uid()
            AND members.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "badge_definitions_update_admin"
    ON public.badge_definitions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.user_id = auth.uid()
            AND members.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "badge_definitions_delete_admin"
    ON public.badge_definitions FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.user_id = auth.uid()
            AND members.role IN ('admin', 'super_admin')
        )
    );

-- ==========================================
-- badge_awards RLS
-- ==========================================
ALTER TABLE public.badge_awards ENABLE ROW LEVEL SECURITY;

-- 본인 달성 기록만 조회
CREATE POLICY "badge_awards_select_own"
    ON public.badge_awards FOR SELECT
    TO authenticated
    USING (
        member_id IN (
            SELECT id FROM public.members WHERE user_id = auth.uid()
        )
    );

-- Admin은 전체 조회 (통계 대시보드용)
CREATE POLICY "badge_awards_select_admin"
    ON public.badge_awards FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.user_id = auth.uid()
            AND members.role IN ('admin', 'super_admin')
        )
    );

-- INSERT는 시스템만 (SECURITY DEFINER 함수에서)
-- 사용자가 직접 INSERT 금지
CREATE POLICY "badge_awards_insert_system"
    ON public.badge_awards FOR INSERT
    TO authenticated
    WITH CHECK (false);  -- 일반 사용자 INSERT 차단, DB 함수(SECURITY DEFINER)에서만 가능
```

### 4.4 달성 판정 DB 함수

```sql
-- ==========================================
-- 진행도 계산 함수
-- ==========================================
CREATE OR REPLACE FUNCTION public.fn_calculate_badge_progress(
    p_member_id UUID,
    p_metric_type TEXT
) RETURNS INTEGER AS $$
DECLARE
    v_progress INTEGER := 0;
    v_user_id UUID;
BEGIN
    -- member_id → user_id 조회
    SELECT user_id INTO v_user_id
    FROM public.members WHERE id = p_member_id;

    CASE p_metric_type
        WHEN 'total_checkins' THEN
            SELECT COUNT(*) INTO v_progress
            FROM public.checkins WHERE member_id = p_member_id;

        WHEN 'week_checkins' THEN
            SELECT COUNT(*) INTO v_progress
            FROM public.checkins
            WHERE member_id = p_member_id
              AND time >= (now() - interval '7 days');

        WHEN 'month_checkins' THEN
            SELECT COUNT(*) INTO v_progress
            FROM public.checkins
            WHERE member_id = p_member_id
              AND EXTRACT(MONTH FROM time) = EXTRACT(MONTH FROM now())
              AND EXTRACT(YEAR FROM time) = EXTRACT(YEAR FROM now());

        WHEN 'streak_days' THEN
            -- 연속 출석일 계산
            WITH daily AS (
                SELECT DISTINCT DATE(time) AS d
                FROM public.checkins
                WHERE member_id = p_member_id
                ORDER BY d DESC
            ),
            numbered AS (
                SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d DESC))::int AS grp
                FROM daily
            )
            SELECT COUNT(*) INTO v_progress
            FROM numbered
            WHERE grp = (SELECT grp FROM numbered WHERE d = CURRENT_DATE OR d = CURRENT_DATE - 1 LIMIT 1)
            LIMIT 1;

            IF v_progress IS NULL THEN v_progress := 0; END IF;

        WHEN 'total_feedbacks' THEN
            SELECT COUNT(*) INTO v_progress
            FROM public.session_feedback WHERE member_id = p_member_id;

        WHEN 'member_days' THEN
            SELECT EXTRACT(DAY FROM (now() - created_at))::INTEGER INTO v_progress
            FROM public.members WHERE id = p_member_id;

        WHEN 'total_bookings' THEN
            SELECT COUNT(*) INTO v_progress
            FROM public.bookings
            WHERE member_id = p_member_id AND status = 'confirmed';

        WHEN 'total_race_participations' THEN
            SELECT COUNT(*) INTO v_progress
            FROM public.race_records WHERE member_id = p_member_id;

        WHEN 'total_race_wins' THEN
            SELECT COUNT(*) INTO v_progress
            FROM public.race_records
            WHERE member_id = p_member_id AND rank = 1;

        WHEN 'total_prs' THEN
            SELECT COUNT(*) INTO v_progress
            FROM public.race_records
            WHERE member_id = p_member_id AND is_pr = true;

        WHEN 'total_purchases' THEN
            SELECT COUNT(*) INTO v_progress
            FROM public.transactions
            WHERE member_id = p_member_id AND status = 'completed';

        ELSE
            v_progress := 0;
    END CASE;

    RETURN COALESCE(v_progress, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==========================================
-- 배지 수여 판정 함수
-- ==========================================
CREATE OR REPLACE FUNCTION public.fn_evaluate_badges(
    p_member_id UUID,
    p_metric_types TEXT[] DEFAULT NULL
) RETURNS SETOF public.badge_awards AS $$
DECLARE
    v_badge RECORD;
    v_progress INTEGER;
    v_award public.badge_awards;
BEGIN
    FOR v_badge IN
        SELECT id, metric_type, threshold
        FROM public.badge_definitions
        WHERE is_active = true
          AND (p_metric_types IS NULL OR metric_type = ANY(p_metric_types))
          AND NOT EXISTS (
              SELECT 1 FROM public.badge_awards
              WHERE badge_id = badge_definitions.id
                AND member_id = p_member_id
          )
    LOOP
        v_progress := public.fn_calculate_badge_progress(p_member_id, v_badge.metric_type);

        IF v_progress >= v_badge.threshold THEN
            INSERT INTO public.badge_awards (member_id, badge_id, progress_snapshot)
            VALUES (p_member_id, v_badge.id, v_progress)
            RETURNING * INTO v_award;

            RETURN NEXT v_award;
        END IF;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 체크인 트리거 (이벤트 기반 배지 판정)
-- ==========================================
CREATE OR REPLACE FUNCTION public.fn_check_badges_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
    -- 체크인 관련 metric_type만 검사
    PERFORM public.fn_evaluate_badges(
        NEW.member_id,
        ARRAY['total_checkins', 'week_checkins', 'month_checkins', 'streak_days']
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_badges_on_checkin
    AFTER INSERT ON public.checkins
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_check_badges_on_checkin();

-- ==========================================
-- 피드백 트리거
-- ==========================================
CREATE OR REPLACE FUNCTION public.fn_check_badges_on_feedback()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.fn_evaluate_badges(
        NEW.member_id,
        ARRAY['total_feedbacks']
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_badges_on_feedback
    AFTER INSERT ON public.session_feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_check_badges_on_feedback();

-- ==========================================
-- 레이스 기록 트리거
-- ==========================================
CREATE OR REPLACE FUNCTION public.fn_check_badges_on_race()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.fn_evaluate_badges(
        NEW.member_id,
        ARRAY['total_race_participations', 'total_race_wins', 'total_prs']
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_badges_on_race
    AFTER INSERT ON public.race_records
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_check_badges_on_race();

-- ==========================================
-- 결제 완료 트리거
-- ==========================================
CREATE OR REPLACE FUNCTION public.fn_check_badges_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
    -- 결제 완료(status='completed')일 때만
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        PERFORM public.fn_evaluate_badges(
            NEW.member_id,
            ARRAY['total_purchases']
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_badges_on_purchase
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_check_badges_on_purchase();

-- ==========================================
-- pg_cron: 시간 기반 배지 (매일 09:00 KST)
-- ==========================================
-- member_days (가입 경과일) 배지 판정
-- SELECT cron.schedule(
--     'evaluate_milestone_badges',
--     '0 0 * * *',  -- 매일 UTC 00:00 = KST 09:00
--     $$
--     SELECT public.fn_evaluate_badges(
--         m.id,
--         ARRAY['member_days']
--     )
--     FROM public.members m
--     WHERE m.status = 'active';
--     $$
-- );
```

### 4.5 User 진행도 조회 RPC

```sql
-- ==========================================
-- User가 자신의 배지 목록 + 진행도를 한 번에 조회
-- ==========================================
CREATE OR REPLACE FUNCTION public.fn_get_my_badges(
    p_user_id UUID
) RETURNS TABLE (
    badge_id UUID,
    name TEXT,
    description TEXT,
    icon TEXT,
    category TEXT,
    metric_type TEXT,
    threshold INTEGER,
    sort_order INTEGER,
    earned BOOLEAN,
    earned_at TIMESTAMPTZ,
    progress INTEGER
) AS $$
DECLARE
    v_member_id UUID;
BEGIN
    SELECT id INTO v_member_id
    FROM public.members WHERE user_id = p_user_id;

    IF v_member_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        bd.id AS badge_id,
        bd.name,
        bd.description,
        bd.icon,
        bd.category,
        bd.metric_type,
        bd.threshold,
        bd.sort_order,
        (ba.id IS NOT NULL) AS earned,
        ba.earned_at,
        CASE
            WHEN ba.id IS NOT NULL THEN ba.progress_snapshot
            ELSE public.fn_calculate_badge_progress(v_member_id, bd.metric_type)
        END AS progress
    FROM public.badge_definitions bd
    LEFT JOIN public.badge_awards ba ON ba.badge_id = bd.id AND ba.member_id = v_member_id
    WHERE bd.is_active = true
    ORDER BY bd.category, bd.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## 5. UI 변경 상세

### 5.1 User 배지 화면 리팩토링

기존 `badges/page.tsx`의 UI 레이아웃은 유지하되, **데이터 소스만 DB로 전환**합니다.

```
배지 화면 (변경 전 vs 변경 후):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  변경 전 (loadBadges):
  ┌────────────────────────────────────┐
  │ 1. checkins SELECT ALL            │ ← 전체 데이터
  │ 2. session_feedback SELECT ALL    │ ← 전체 데이터
  │ 3. members SELECT created_at      │
  │ 4. JS에서 progress 계산           │ ← 클라이언트 부하
  │ 5. BADGE_DEFINITIONS.map(...)     │ ← 하드코딩
  └────────────────────────────────────┘

  변경 후 (loadBadges):
  ┌────────────────────────────────────┐
  │ 1. supabase.rpc('fn_get_my_badges')│ ← 단일 RPC 호출
  │ 2. UI 렌더링                       │
  └────────────────────────────────────┘
```

**코드 변경 핵심**:
```typescript
// Before (346 LoC):
const BADGE_DEFINITIONS = [...]; // 하드코딩
const [checkinRes, feedbackRes, memberRes] = await Promise.all([...]);
// 수동 계산...

// After (~200 LoC):
const { data: badges } = await supabase.rpc('fn_get_my_badges', {
    p_user_id: user.id
});
setBadges(badges || []);
```

### 5.2 Admin 배지 관리 화면

```
Admin 배지 관리 화면 레이아웃:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /admin/operations/badges
  ┌──────────────────────────────────────────────┐
  │ 배지 관리                    [+ 배지 추가]    │
  ├──────────────────────────────────────────────┤
  │ [전체] [출석] [성과] [커뮤니티] [마일스톤]      │
  │ 🔍 배지 이름 검색                              │
  ├──────────────────────────────────────────────┤
  │ ┌──────────────────────────────────────────┐ │
  │ │ Icon │ 이름       │ 카테고리  │ 측정기준   │ │
  │ │ 목표 │ 달성 회원수 │ 상태     │ 액션      │ │
  │ ├──────┼────────────┼─────────┼───────────┤ │
  │ │ 🎯   │ 첫 발걸음   │ 출석    │ 전체체크인  │ │
  │ │ 1회  │ 142명      │ ✅ 활성  │ ✏️ 🗑️     │ │
  │ ├──────┼────────────┼─────────┼───────────┤ │
  │ │ ⚡   │ 주간 전사   │ 출석    │ 주간체크인  │ │
  │ │ 5회  │ 89명       │ ✅ 활성  │ ✏️ 🗑️     │ │
  │ ├──────┼────────────┼─────────┼───────────┤ │
  │ │ 🔥   │ 월간 마스터  │ 출석   │ 월간체크인  │ │
  │ │ 20회 │ 34명       │ ✅ 활성  │ ✏️ 🗑️     │ │
  │ └──────┴────────────┴─────────┴───────────┘ │
  └──────────────────────────────────────────────┘

  배지 추가 모달:
  ┌──────────────────────────────────────────────┐
  │ 🏅 새 배지 등록                               │
  ├──────────────────────────────────────────────┤
  │ 🔤 배지 이름:    [              ]             │
  │ 📝 설명:        [              ]             │
  │ 😀 아이콘:       [🏅] (이모지 선택)           │
  │                                              │
  │ 📂 카테고리:     [출석 ▾]                     │
  │ 📊 측정 기준:    [전체 체크인 횟수 ▾]          │
  │ 🎯 달성 목표:    [     ] 회/일                │
  │ 📌 정렬 순서:    [     ]                      │
  │                                              │
  │        [취소]            [저장]               │
  └──────────────────────────────────────────────┘

  측정 기준 드롭다운 옵션 (11개):
  ┌──────────────────────────────┐
  │ ── 출석 ──                   │
  │ 전체 체크인 횟수              │ → total_checkins
  │ 주간 체크인 횟수              │ → week_checkins
  │ 월간 체크인 횟수              │ → month_checkins
  │ 연속 출석 일수               │ → streak_days
  │ ── 성과 ──                   │
  │ 피드백 작성 횟수              │ → total_feedbacks
  │ 레이스 참가 횟수              │ → total_race_participations
  │ 레이스 우승 횟수              │ → total_race_wins
  │ PR 달성 횟수                 │ → total_prs
  │ ── 활동 ──                   │
  │ 확정 예약 횟수               │ → total_bookings
  │ 결제 완료 횟수               │ → total_purchases
  │ ── 시간 ──                   │
  │ 가입 후 경과일               │ → member_days
  └──────────────────────────────┘
```

### 5.3 컴포넌트 구조

| 컴포넌트 | 경로 | 용도 |
|----------|------|------|
| `BadgesPage` (수정) | `src/app/apps/badges/page.tsx` | User 배지 목록 — RPC 기반 리팩토링 |
| `AdminBadgesPage` (신규) | `src/app/admin/operations/badges/page.tsx` | Admin 배지 CRUD |
| `BadgeFormModal` (신규) | `src/components/admin/BadgeFormModal.tsx` | 배지 추가/수정 모달 |

---

## 6. 영향 범위 분석

| 파일/모듈 | 변경 내용 | 변경 필요 여부 |
|-----------|-----------|:-------------:|
| `src/app/apps/badges/page.tsx` | 리팩토링: 하드코딩 제거, RPC 호출으로 전환 | ✅ (대폭 수정) |
| `src/app/admin/operations/badges/page.tsx` | 신규: Admin 배지 관리 화면 | ✅ (🆕) |
| `src/components/admin/BadgeFormModal.tsx` | 신규: 배지 추가/수정 모달 | ✅ (🆕) |
| DB: `badge_definitions` | 신규 테이블 | ✅ (🆕) |
| DB: `badge_awards` | 신규 테이블 | ✅ (🆕) |
| DB: RPC 함수 3개 | fn_calculate_badge_progress, fn_evaluate_badges, fn_get_my_badges | ✅ (🆕) |
| DB: Trigger 4개 | checkins, session_feedback, race_records, transactions | ✅ (🆕) |
| `.docs/sitemap/user-app.md` | 배지 화면 설명 갱신 | ✅ |
| `.docs/sitemap/admin/03-operations.md` | 배지 관리 항목 추가 | ✅ |
| `.docs/database-reference.md` | badge_definitions, badge_awards 추가 | ✅ |
| Admin Sidebar 메뉴 | Operations 그룹에 "배지 관리" 항목 추가 | ✅ |
| 기존 Admin 페이지 | 변경 없음 | ❌ |
| 기존 User 페이지 (배지 외) | 변경 없음 | ❌ |
| 기존 RLS/Trigger | 변경 없음 | ❌ |

---

## 7. 보안 고려사항

| # | 항목 | 대책 |
|---|------|------|
| 1 | **배지 조작 방지** | `badge_awards` INSERT는 DB 함수(SECURITY DEFINER)에서만 가능. RLS로 사용자 직접 INSERT 차단 (`WITH CHECK (false)`) |
| 2 | **Admin 권한 제한** | `badge_definitions` CUD는 `members.role IN ('admin', 'super_admin')` 검증 |
| 3 | **데이터 노출** | 비활성 배지(`is_active=false`)는 일반 사용자에게 미노출. Admin만 전체 조회 |
| 4 | **RPC 함수 보안** | `fn_get_my_badges`는 `p_user_id`를 받지만 내부에서 member 검증. SECURITY DEFINER로 RLS 우회 |
| 5 | **Trigger 부하** | 체크인/피드백 INSERT 시에만 트리거 → 이미 획득한 배지는 NOT EXISTS로 스킵하여 부하 최소화 |

---

## 8. 구현 단계 및 에이전트 배분

### Phase 1: DB 스키마 + RPC + Trigger
> **담당**: 💎 **Senior Dev (Opus)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 1-1 | 테이블 생성 마이그레이션 | `badge_definitions`, `badge_awards` |
| 1-2 | RLS 정책 적용 | 8개 정책 (definitions: 5, awards: 3) |
| 1-3 | RPC 함수 생성 | `fn_calculate_badge_progress` (11 metric), `fn_evaluate_badges`, `fn_get_my_badges` |
| 1-4 | Trigger 생성 | checkins, session_feedback, race_records, transactions (4개) |
| 1-5 | 초기 데이터 INSERT | 총 23개 배지 정의 (기존 15개 재구성 + 신규 8개) |
| 1-6 | pg_cron 설정 | milestone 배지 (매일 09:00 KST) |

### Phase 2: Admin 배지 관리 화면
> **담당**: 🎨 **UI Developer (Gemini)** | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 2-1 | Admin 페이지 생성 | `/admin/operations/badges/page.tsx` — 배지 목록 테이블 |
| 2-2 | BadgeFormModal 생성 | 배지 추가/수정 모달 (카테고리, metric_type 드롭다운) |
| 2-3 | 삭제 확인 다이얼로그 | 배지 삭제 시 "달성한 회원이 N명 있습니다" 경고 |
| 2-4 | 활성/비활성 토글 | 배지 목록에서 인라인 토글 |
| 2-5 | 달성 통계 표시 | 각 배지별 달성 회원 수 COUNT 표시 |
| 2-6 | Sidebar 메뉴 추가 | Operations 그룹에 "배지" 항목 추가 |

### Phase 3: User 배지 화면 리팩토링
> **담당**: 💻 **Developer (Sonnet)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 3-1 | 하드코딩 제거 | `BADGE_DEFINITIONS` 상수 삭제 |
| 3-2 | RPC 호출 전환 | `loadBadges()` → `supabase.rpc('fn_get_my_badges')` |
| 3-3 | 달성 시 알림 | 새 배지 달성 시 축하 토스트 (기존 earned_at 비교) |
| 3-4 | UI 유지 | 기존 그리드/모달 UI는 변경 없이 데이터 바인딩만 교체 |
| 3-5 | 빌드 검증 | 기존 배지 화면과 기능 동일 여부 확인 |

### Phase 4: 문서 동기화
> **담당**: 🏛️ **Architect (Opus)** | **공수**: 0.25일

| # | 작업 | 상세 |
|---|------|------|
| 4-1 | sitemap/user-app.md | 배지 화면 설명 업데이트 (DB 기반) |
| 4-2 | sitemap/admin/03-operations.md | 배지 관리 항목 추가 |
| 4-3 | database-reference.md | badge_definitions, badge_awards, RPC 함수 추가 |
| 4-4 | project-blueprint.md | 구현 상태 갱신 |

---

## 9. 블루프린트 등록용 체크리스트

```markdown
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
```

---

## 10. 테스트 시나리오

### 정상 흐름
1. **Admin 배지 등록**: Admin → 배지 관리 → "+ 배지 추가" → 이름: "200회 출석", 카테고리: 출석, 측정: 전체 체크인, 목표: 200 → 저장 → 목록에 표시
2. **User 배지 조회**: User → 배지 탭 → DB에서 활성 배지 23개 조회 → 진행도 표시 → 달성된 배지에 ✅ 표시
3. **체크인 자동 달성**: 회원이 체크인 → Trigger 발동 → `fn_evaluate_badges` → threshold 충족 → `badge_awards` INSERT → 다음 배지 화면 진입 시 즉시 반영
4. **레이스 자동 달성**: 레이스 결과 기록 → `trg_check_badges_on_race` → 참가/우승/PR 배지 자동 수여
5. **결제 자동 달성**: 멤버십 결제 완료(status=completed) → `trg_check_badges_on_purchase` → "첫 결제"/"VIP" 배지 수여
6. **마일스톤 자동**: 가입 30일 경과 → pg_cron 배치 → "1개월 회원" 배지 자동 수여
7. **배지 비활성화**: Admin → 배지 토글 OFF → User에게 미노출 (기존 달성 기록은 보존)

### 예외 흐름
1. **중복 수여 방지**: 이미 달성한 배지 → Trigger가 NOT EXISTS로 스킵 → INSERT 시도 없음
2. **배지 삭제 시**: Admin이 배지 삭제 → `badge_awards` CASCADE 삭제 → 경고 확인 필수
3. **미인증 접근**: 비로그인 상태에서 배지 페이지 → "로그인이 필요합니다" Empty State
4. **race_records 미존재 시**: Trigger 설치 실패 → 마이그레이션에서 IF EXISTS 체크 후 스킵

---

## 11. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| streak 계산 성능 | 대량 체크인 시 CTE 쿼리 부하 | CURRENT_DATE 기준 최근 90일만 조회하도록 WHERE 제한 |
| Trigger 부하 (4개) | 체크인/피드백/레이스/결제마다 배지 판정 실행 | NOT EXISTS로 이미 달성 배지 스킵 + 미달성 배지만 계산 |
| pg_cron 미활성화 | milestone 배지 미수여 | User가 배지 화면 진입 시에도 fn_evaluate_badges 호출 (fallback) |
| race_records 테이블 의존 | Race 시스템 미구현 시 Trigger 설치 실패 | 마이그레이션에서 `IF EXISTS` 체크, 테이블 없으면 Trigger 스킵 |
| transactions.member_id 참조 | transactions 테이블 구조 확인 필요 | member_id FK 존재 확인 후 Trigger 설치 |
| 기존 배지 데이터 손실 | 마이그레이션 시 하드코딩→DB 전환 | 23개 배지로 재구성, 기존 earned 상태는 `fn_evaluate_badges` 한 번 실행으로 소급 수여 |
| handle_updated_at 함수 미존재 | 마이그레이션 실패 | 기존 프로젝트에 이미 존재하는지 확인 필요 (없으면 함께 생성) |

---

## 12. Planning Log (기획 진행 기록)

### Session 1 — 2026-02-19
- **작성 범위**: 섹션 1~11 전체
- **완성된 섹션**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
- **미완성 섹션**: 없음
- **TODO (다음 세션)**: 해당 없음 — 전체 완성
- **메모**:
  - 직전 대화에서 배지 시스템 As-Is 분석 완료 → 기획서에 반영
  - 기존 코드에서 4개 버그 발견 (WOD/PR 카운트 로직 오류, earnedDate, streak 비효율)
  - metric_type 패턴: 새로운 측정 유형 추가 시 DB 함수만 수정하면 됨
  - RLS 설계: badge_awards INSERT를 사용자에게 완전 차단 (SECURITY DEFINER 함수만 가능)
  - 4 Phase, 총 예상 2.25일 공수
  - performance 카테고리 배지의 metric_type: 현재 WOD/PR 전용 테이블이 없으므로 total_feedbacks 임시 사용 → 향후 확장 대상

### Session 2 — 2026-02-19 (metric_type 확장)
- **작성 범위**: metric_type 4개 추가에 따른 전체 섹션 동기화
- **변경 요약**:
  - metric_type 7개 → **11개** 확장
  - 추가: `total_race_participations`, `total_race_wins`, `total_prs`, `total_purchases`
  - 데이터 소스: `race_records` (참가/우승/PR), `transactions` (결제)
  - 초기 배지 15개 → **23개** 확장 (레이스 4개, PR 2개, 예약 1개, 결제 2개 추가)
  - Trigger 2개 → **4개** 확장 (race_records, transactions 추가)
  - performance 카테고리: total_feedbacks 임시 대체 제거 → 실제 metric 연결
- **메모**:
  - `race_records` 테이블이 DB에 존재 (is_pr, rank 컬럼 확인)
  - `transactions` 테이블이 DB에 존재 (member_id, status 컬럼 확인)
  - race_records Trigger는 Race 시스템 미구현 시 스킵 가능 (IF EXISTS 처리)

---
**문서 버전**: 1.1.0
**최종 업데이트**: 2026-02-19
