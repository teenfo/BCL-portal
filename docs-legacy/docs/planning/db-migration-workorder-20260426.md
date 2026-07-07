# DB Migration Work Order — 2026-04-26

> **출처**: DB 감사 보고서 (`brain/d06697d4.../db-audit-report-20260426.md`)
> **Supabase Project ID**: `meklaisrcpecuwwwakhv`
> **담당**: 💎 Senior Dev
> **우선순위**: P0 → P1 → P2 순서로 적용

---

## 작업 개요

감사 결과 누락된 테이블 4개, 컬럼 다수, RPC 9개를 적용합니다.
**각 Phase를 순서대로 적용할 것** (의존성 있음).

---

## Phase 1 — members/sessions/bookings 컬럼 + 예약 RPC (P0)

**로컬 파일**: `supabase/migrations/20260219165300_user_app_enhancement_phase1.sql`

### 적용 SQL

```sql
-- 1. members 컬럼 추가
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS preferences    JSONB    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS birthday       DATE,
  ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(50),
  ADD COLUMN IF NOT EXISTS avatar_url     TEXT;

COMMENT ON COLUMN public.members.preferences IS '사용자 앱 설정 (dark_mode, language, weekly_goal 등)';
COMMENT ON COLUMN public.members.birthday IS '생년월일';
COMMENT ON COLUMN public.members.emergency_contact IS '긴급 연락처';
COMMENT ON COLUMN public.members.avatar_url IS '프로필 사진 URL (Supabase Storage)';

-- 2. sessions 컬럼 추가
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS wod_description TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled'
      CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.sessions.wod_description IS 'WOD 내용 기술';
COMMENT ON COLUMN public.sessions.status IS '수업 상태 머신';
COMMENT ON COLUMN public.sessions.facility_id IS '수업 진행 지점';

-- 3. bookings 컬럼 추가
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_type TEXT NOT NULL DEFAULT 'credit'
      CHECK (booking_type IN ('credit','free','guest'));

COMMENT ON COLUMN public.bookings.booking_type IS '예약 유형: credit(크레딧), free(무료), guest(게스트)';

-- 4. coaches 컬럼 추가 (정산 계산에 필요)
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS base_salary      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_allowance INTEGER DEFAULT 0;

COMMENT ON COLUMN public.coaches.base_salary IS '월 기본급 (원)';
COMMENT ON COLUMN public.coaches.session_allowance IS '수업당 수당 (원)';

-- 5. fn_book_with_credit RPC
CREATE OR REPLACE FUNCTION public.fn_book_with_credit(
    p_session_id UUID,
    p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_membership   RECORD;
    v_booking_id   UUID;
    v_session      RECORD;
    v_current_cnt  INT;
BEGIN
    SELECT id, capacity INTO v_session FROM sessions WHERE id = p_session_id;
    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'session_not_found');
    END IF;

    SELECT COUNT(*) INTO v_current_cnt FROM bookings
    WHERE session_id = p_session_id AND status IN ('confirmed','attended');

    IF v_session.capacity IS NOT NULL AND v_current_cnt >= v_session.capacity THEN
        INSERT INTO bookings(session_id, user_id, status)
        VALUES (p_session_id, p_user_id, 'waitlist')
        RETURNING id INTO v_booking_id;
        RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id, 'status', 'waitlist', 'credits_used', 0);
    END IF;

    SELECT id, remaining_credits INTO v_membership FROM memberships
    WHERE user_id = p_user_id AND status = 'active'
      AND remaining_credits IS NOT NULL AND remaining_credits > 0
    ORDER BY end_date ASC LIMIT 1 FOR UPDATE;

    IF v_membership IS NOT NULL THEN
        UPDATE memberships SET remaining_credits = remaining_credits - 1, updated_at = now()
        WHERE id = v_membership.id;
    END IF;

    INSERT INTO bookings(session_id, user_id, status)
    VALUES (p_session_id, p_user_id, 'confirmed')
    RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object(
        'success', true, 'booking_id', v_booking_id, 'status', 'confirmed',
        'credits_used', CASE WHEN v_membership IS NOT NULL THEN 1 ELSE 0 END,
        'remaining_credits', COALESCE(v_membership.remaining_credits - 1, -1)
    );
EXCEPTION
    WHEN unique_violation THEN RETURN jsonb_build_object('success', false, 'error', 'already_booked');
    WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 6. fn_cancel_booking_with_credit RPC
CREATE OR REPLACE FUNCTION public.fn_cancel_booking_with_credit(
    p_booking_id UUID,
    p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_booking RECORD;
BEGIN
    SELECT id, session_id, status INTO v_booking FROM bookings
    WHERE id = p_booking_id AND user_id = p_user_id FOR UPDATE;

    IF v_booking IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
    IF v_booking.status = 'cancelled' THEN RETURN jsonb_build_object('success', false, 'error', 'already_cancelled'); END IF;

    UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = p_booking_id;

    UPDATE memberships SET remaining_credits = remaining_credits + 1, updated_at = now()
    WHERE user_id = p_user_id AND status = 'active' AND remaining_credits IS NOT NULL;

    RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_book_with_credit(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cancel_booking_with_credit(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_book_with_credit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cancel_booking_with_credit(UUID, UUID) TO authenticated;
```

### apply_migration 호출
```javascript
mcp_supabase-mcp-server_apply_migration({
  project_id: "meklaisrcpecuwwwakhv",
  name: "user_app_enhancement_phase1_patch",
  query: "/* 위 SQL */"
})
```

---

## Phase 2 — coaching_notes / coach_settlements 테이블 + 코치 RPC (P0)

**로컬 파일**: `supabase/migrations/20260221000000_coach_feature_enhancement.sql`

> ⚠️ Phase 1 (`coaches.base_salary`, `coaches.session_allowance`) 먼저 적용 필수

### 적용 SQL

```sql
-- 1. coaching_notes 테이블
CREATE TABLE IF NOT EXISTS public.coaching_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    note_type TEXT NOT NULL DEFAULT 'general'
        CHECK (note_type IN ('general','injury','progress','caution')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_notes_coach ON public.coaching_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_coaching_notes_member ON public.coaching_notes(member_id);
CREATE INDEX IF NOT EXISTS idx_coaching_notes_created ON public.coaching_notes(created_at DESC);

ALTER TABLE public.coaching_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can manage own notes" ON public.coaching_notes
    FOR ALL TO authenticated
    USING (coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid()))
    WITH CHECK (coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid()));

CREATE POLICY "Admin full access to coaching_notes" ON public.coaching_notes
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. coach_settlements 테이블
CREATE TABLE IF NOT EXISTS public.coach_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL,
    base_salary INTEGER NOT NULL DEFAULT 0,
    session_count INTEGER NOT NULL DEFAULT 0,
    session_allowance INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','confirmed','paid')),
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (coach_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_coach_settlements_month ON public.coach_settlements(year_month DESC);
CREATE INDEX IF NOT EXISTS idx_coach_settlements_coach ON public.coach_settlements(coach_id);

ALTER TABLE public.coach_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can view own settlements" ON public.coach_settlements
    FOR SELECT TO authenticated
    USING (coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid()));

CREATE POLICY "Admin full access to settlements" ON public.coach_settlements
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. fn_get_coach_dashboard (레거시 — 하위 호환)
CREATE OR REPLACE FUNCTION public.fn_get_coach_dashboard(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_coach_id UUID; v_today DATE := CURRENT_DATE; v_result JSONB;
BEGIN
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = p_user_id AND status = 'active';
    IF v_coach_id IS NULL THEN RETURN jsonb_build_object('error', 'coach_not_found'); END IF;
    SELECT jsonb_build_object(
        'coach_id', v_coach_id,
        'today_sessions', (
            SELECT COALESCE(jsonb_agg(t ORDER BY t->>'start_time'), '[]') FROM (
                SELECT jsonb_build_object('id',s.id,'title',s.title,'start_time',s.start_time,
                    'booked_count',(SELECT COUNT(*) FROM public.bookings b WHERE b.session_id=s.id AND b.status='confirmed'),
                    'checkin_count',(SELECT COUNT(*) FROM public.checkins c WHERE c.session_id=s.id AND c.checkin_time::date=v_today)
                ) AS t FROM public.sessions s JOIN public.session_coaches sc ON sc.session_id=s.id
                WHERE sc.coach_id=v_coach_id AND s.session_date=v_today) sub),
        'week_sessions', (SELECT COUNT(DISTINCT s.id) FROM public.sessions s
            JOIN public.session_coaches sc ON sc.session_id=s.id WHERE sc.coach_id=v_coach_id
            AND s.session_date BETWEEN date_trunc('week',v_today)::date AND (date_trunc('week',v_today)+interval'6 days')::date)
    ) INTO v_result;
    RETURN v_result;
END;
$$;

-- 4. fn_get_session_attendees
CREATE OR REPLACE FUNCTION public.fn_get_session_attendees(p_session_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN (SELECT COALESCE(jsonb_agg(t), '[]') FROM (
        SELECT b.id AS booking_id, b.member_id, m.name AS member_name, m.avatar_url,
               b.status AS booking_status,
               (c.id IS NOT NULL) AS checked_in, c.checkin_time
        FROM public.bookings b JOIN public.members m ON m.id=b.member_id
        LEFT JOIN public.checkins c ON c.session_id=b.session_id AND c.member_id=b.member_id
        WHERE b.session_id=p_session_id AND b.status IN ('confirmed','waitlist')
        ORDER BY b.status, m.name) t);
END;
$$;

-- 5. fn_coach_mark_attendance (레거시 — fn_mark_session_attendance로 대체됨)
CREATE OR REPLACE FUNCTION public.fn_coach_mark_attendance(
    p_session_id UUID, p_member_id UUID, p_coach_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_coach_id UUID; v_existing UUID;
BEGIN
    SELECT id INTO v_coach_id FROM public.coaches WHERE user_id = p_coach_user_id;
    IF v_coach_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','not_a_coach'); END IF;
    SELECT id INTO v_existing FROM public.checkins WHERE session_id=p_session_id AND member_id=p_member_id;
    IF v_existing IS NOT NULL THEN RETURN jsonb_build_object('success',false,'error','already_checked_in'); END IF;
    INSERT INTO public.checkins(member_id,session_id,checkin_method,checkin_time)
    VALUES(p_member_id,p_session_id,'manual_coach',now());
    RETURN jsonb_build_object('success',true);
END;
$$;

-- 6. fn_get_coach_performance_stats
CREATE OR REPLACE FUNCTION public.fn_get_coach_performance_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN (SELECT COALESCE(jsonb_agg(t), '[]') FROM (
        SELECT c.id, c.name, c.email, c.specialties, c.status,
            (SELECT COUNT(*) FROM public.session_coaches sc WHERE sc.coach_id=c.id) AS total_sessions,
            COALESCE((SELECT ROUND(AVG(sf.rating)::numeric,1) FROM public.session_feedback sf WHERE sf.coach_id=c.id),0) AS avg_rating,
            (SELECT COUNT(DISTINCT b.member_id) FROM public.bookings b
             JOIN public.session_coaches sc ON sc.session_id=b.session_id
             WHERE sc.coach_id=c.id AND b.status='confirmed') AS total_members
        FROM public.coaches c WHERE c.status='active' ORDER BY avg_rating DESC, total_sessions DESC) t);
END;
$$;

-- 7. fn_calculate_monthly_settlement
CREATE OR REPLACE FUNCTION public.fn_calculate_monthly_settlement(
    p_year_month TEXT, p_admin_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_start_date DATE; v_end_date DATE;
    v_coach RECORD; v_session_count INTEGER; v_total INTEGER;
BEGIN
    v_start_date := (p_year_month || '-01')::DATE;
    v_end_date   := (v_start_date + interval '1 month' - interval '1 day')::DATE;
    FOR v_coach IN SELECT id, base_salary, session_allowance FROM public.coaches WHERE status='active' LOOP
        SELECT COUNT(DISTINCT sc.session_id) INTO v_session_count
        FROM public.session_coaches sc JOIN public.sessions s ON s.id=sc.session_id
        WHERE sc.coach_id=v_coach.id AND s.session_date BETWEEN v_start_date AND v_end_date;
        v_total := COALESCE(v_coach.base_salary,0) + (v_session_count * COALESCE(v_coach.session_allowance,0));
        INSERT INTO public.coach_settlements(coach_id,year_month,base_salary,session_count,session_allowance,total_amount,status)
        VALUES(v_coach.id,p_year_month,COALESCE(v_coach.base_salary,0),v_session_count,COALESCE(v_coach.session_allowance,0),v_total,'pending')
        ON CONFLICT(coach_id,year_month) DO UPDATE SET
            base_salary=EXCLUDED.base_salary, session_count=EXCLUDED.session_count,
            session_allowance=EXCLUDED.session_allowance, total_amount=EXCLUDED.total_amount;
    END LOOP;
    RETURN jsonb_build_object('success',true,'year_month',p_year_month);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_coach_dashboard(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_get_session_attendees(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_coach_mark_attendance(UUID,UUID,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_get_coach_performance_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_calculate_monthly_settlement(TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_coach_dashboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_session_attendees(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_coach_mark_attendance(UUID,UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_coach_performance_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_calculate_monthly_settlement(TEXT,UUID) TO authenticated;
```

### apply_migration 호출
```javascript
mcp_supabase-mcp-server_apply_migration({
  project_id: "meklaisrcpecuwwwakhv",
  name: "coach_feature_enhancement_patch",
  query: "/* 위 SQL */"
})
```

---

## Phase 3 — badge_definitions / badge_awards 테이블 + 배지 RPC (P1)

> ⚠️ 로컬 SQL 파일 없음 — 아래 SQL을 새로 적용

### 적용 SQL

```sql
-- 1. badge_definitions
CREATE TABLE IF NOT EXISTS public.badge_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT '🏅',
    category TEXT NOT NULL DEFAULT 'achievement'
        CHECK (category IN ('achievement','attendance','performance','special')),
    metric_type TEXT NOT NULL,
    threshold_value NUMERIC NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read badges" ON public.badge_definitions
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin full access to badge_definitions" ON public.badge_definitions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. badge_awards
CREATE TABLE IF NOT EXISTS public.badge_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (member_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_badge_awards_member ON public.badge_awards(member_id);
CREATE INDEX IF NOT EXISTS idx_badge_awards_badge ON public.badge_awards(badge_id);

ALTER TABLE public.badge_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read own badges" ON public.badge_awards
    FOR SELECT TO authenticated USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Admin full access to badge_awards" ON public.badge_awards
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. fn_get_my_badges
CREATE OR REPLACE FUNCTION public.fn_get_my_badges()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_member_id UUID;
BEGIN
    SELECT id INTO v_member_id FROM public.members WHERE user_id = auth.uid() LIMIT 1;
    IF v_member_id IS NULL THEN RETURN '[]'::jsonb; END IF;
    RETURN (SELECT COALESCE(jsonb_agg(t ORDER BY t->>'awarded_at' DESC), '[]') FROM (
        SELECT bd.name, bd.display_name, bd.description, bd.icon, bd.category,
               ba.awarded_at
        FROM public.badge_awards ba
        JOIN public.badge_definitions bd ON bd.id = ba.badge_id
        WHERE ba.member_id = v_member_id) t);
END;
$$;

-- 4. fn_calculate_badge_progress
CREATE OR REPLACE FUNCTION public.fn_calculate_badge_progress()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_member_id UUID;
    v_checkin_count INT;
    v_race_count INT;
BEGIN
    SELECT id INTO v_member_id FROM public.members WHERE user_id = auth.uid() LIMIT 1;
    IF v_member_id IS NULL THEN RETURN jsonb_build_object('error','member_not_found'); END IF;
    SELECT COUNT(*) INTO v_checkin_count FROM public.checkins WHERE member_id = v_member_id;
    SELECT COUNT(*) INTO v_race_count FROM public.race_records WHERE member_id = v_member_id;
    RETURN jsonb_build_object(
        'member_id', v_member_id,
        'total_checkins', v_checkin_count,
        'total_races', v_race_count
    );
END;
$$;

-- 5. fn_evaluate_badges
CREATE OR REPLACE FUNCTION public.fn_evaluate_badges()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_member_id UUID;
    v_progress JSONB;
    v_badge RECORD;
    v_metric_val NUMERIC;
    v_awarded_count INT := 0;
BEGIN
    SELECT id INTO v_member_id FROM public.members WHERE user_id = auth.uid() LIMIT 1;
    IF v_member_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','member_not_found'); END IF;

    v_progress := public.fn_calculate_badge_progress();

    FOR v_badge IN SELECT * FROM public.badge_definitions WHERE is_active = true LOOP
        v_metric_val := CASE v_badge.metric_type
            WHEN 'total_checkins' THEN (v_progress->>'total_checkins')::NUMERIC
            WHEN 'total_races'    THEN (v_progress->>'total_races')::NUMERIC
            ELSE 0
        END;
        IF v_metric_val >= v_badge.threshold_value THEN
            INSERT INTO public.badge_awards(member_id, badge_id)
            VALUES(v_member_id, v_badge.id)
            ON CONFLICT(member_id, badge_id) DO NOTHING;
            IF FOUND THEN v_awarded_count := v_awarded_count + 1; END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success',true,'newly_awarded',v_awarded_count);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_my_badges() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_calculate_badge_progress() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_evaluate_badges() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_my_badges() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_calculate_badge_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_evaluate_badges() TO authenticated;
```

### apply_migration 호출
```javascript
mcp_supabase-mcp-server_apply_migration({
  project_id: "meklaisrcpecuwwwakhv",
  name: "badge_system_patch",
  query: "/* 위 SQL */"
})
```

---

## Phase 4 — 보안 패치 (P2)

기존 함수 8종에 `SET search_path = public` 추가 (`sync_profile_email`, `promote_to_coach`, `demote_from_coach`, `fn_send_class_reminders`, `fn_notify_waitlist_on_vacancy`, `fn_handle_notification_side_effects`, `save_pg_settings`, `get_decrypted_pg_settings`)

> 각 함수의 `CREATE OR REPLACE` 재정의 시 `SET search_path = public` 추가

### apply_migration 호출
```javascript
mcp_supabase-mcp-server_apply_migration({
  project_id: "meklaisrcpecuwwwakhv",
  name: "security_search_path_patch",
  query: "/* 각 함수 재정의 SQL */"
})
```

---

## 완료 후 체크리스트

```javascript
// 1. 마이그레이션 적용 확인
mcp_supabase-mcp-server_list_migrations({ project_id: "meklaisrcpecuwwwakhv" })

// 2. 보안 어드바이저 재확인
mcp_supabase-mcp-server_get_advisors({ project_id: "meklaisrcpecuwwwakhv", type: "security" })

// 3. 타입 재생성
mcp_supabase-mcp-server_generate_typescript_types({ project_id: "meklaisrcpecuwwwakhv" })
```

## database-reference.md 갱신 항목
- `coaching_notes`, `coach_settlements` 테이블 추가
- `badge_definitions`, `badge_awards` 테이블 추가
- `members` 컬럼 갱신 (preferences, avatar_url, birthday, emergency_contact)
- `sessions` 컬럼 갱신 (wod_description, status, facility_id)
- `bookings` 컬럼 갱신 (booking_type)
- `coaches` 컬럼 갱신 (base_salary, session_allowance)
- RPC 함수 9종 추가

---

**문서 버전**: 1.0.0  
**작성일**: 2026-04-26  
**참고 감사 보고서**: `brain/.../db-audit-report-20260426.md`
