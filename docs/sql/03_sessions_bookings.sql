-- ============================================================================
-- BCL Portal 재구축 DDL — 03_sessions_bookings.sql
-- ----------------------------------------------------------------------------
-- 목적   : sessions 도메인 — sessions / session_coaches / bookings / checkins /
--          session_rotation_states
-- 의존   : 00, 01 (facilities/members/coaches), 02 (memberships)
-- 변경   : (to-be) sessions.wod_description 제거(session_wods로 완전 이관),
--          bookings.status ↔ attendance_outcome 역할 분리 정규화
--          (status=예약 상태 3종 / attendance_outcome=출결 판정 6종, no_show를
--           status에서 제거·waitlist/waitlisted 표기 waitlisted로 통일),
--          bookings.credit_used/membership_id로 크레딧 환원 정합성 확보
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. sessions — 수업
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id      UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL,
    description      TEXT,
    session_type     VARCHAR(10) NOT NULL DEFAULT 'group'
                     CHECK (session_type IN ('group','personal')),
                     -- ⏳ G-19 확장형 컬럼만: personal(1:1 PT) 예약 스키마 여지 확보 — 현 Phase 구현 없음
    class_type       VARCHAR(40),                          -- 런시트 템플릿 매칭 키 (wod/strength/beginner...)
    session_date     DATE NOT NULL,
    start_time       TIME NOT NULL,
    end_time         TIME NOT NULL,
    capacity         INT NOT NULL DEFAULT 15 CHECK (capacity > 0),
    intensity_level  VARCHAR(15) CHECK (intensity_level IN ('beginner','intermediate','advanced') OR intensity_level IS NULL),
    status           VARCHAR(15) NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 쿼리 패턴: (a) 시설·날짜 캘린더, (b) 코치 KPI 월 집계(date,status), (c) 리마인더 크론(오늘+시간창)
CREATE INDEX IF NOT EXISTS idx_sessions_facility_date ON public.sessions(facility_id, session_date, start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_date_status   ON public.sessions(session_date, status);

COMMENT ON TABLE  public.sessions IS 'sessions: 수업 일정. 🔄 wod_description 제거 — WOD 본문은 session_wods가 유일한 소스';
COMMENT ON COLUMN public.sessions.class_type IS 'class_runbook_templates.class_type과 매칭되는 수업 유형 키';
COMMENT ON COLUMN public.sessions.session_type IS 'group(기본)/personal(1:1 PT — G-19 확장 여지, 현 Phase 예약만·구현 없음)';

-- 기존 배포분 증분 (멱등)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_type VARCHAR(10) NOT NULL DEFAULT 'group'
    CHECK (session_type IN ('group','personal'));

-- ----------------------------------------------------------------------------
-- 2. session_coaches — 수업-코치 배정
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_coaches (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    coach_id         UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    assignment_role  VARCHAR(10) NOT NULL DEFAULT 'lead'
                     CHECK (assignment_role IN ('lead','assistant')),
    display_order    INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, coach_id)
);

-- 쿼리 패턴: 코치 스케줄/KPI가 coach_id → session 역방향 조회 (UNIQUE가 session_id 선두 커버)
CREATE INDEX IF NOT EXISTS idx_session_coaches_coach ON public.session_coaches(coach_id, session_id);

COMMENT ON TABLE public.session_coaches IS 'sessions: 코치 배정. assignment_role lead/assistant (구 primary/assistant 표기 통일)';

-- ----------------------------------------------------------------------------
-- 3. bookings — 예약 (상태머신 정규화의 핵심)
--    status            = 예약 수명주기   : confirmed / waitlisted / cancelled
--    attendance_outcome = 운영 출결 판정 : pending / checked_in / no_show /
--                                          late_cancel / coach_excused / walk_in
--    (as-is의 status='no_show', 'waitlist' 혼용 제거 — 판정은 outcome에만 기록)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id             UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    member_id              UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    membership_id          UUID REFERENCES public.memberships(id) ON DELETE SET NULL,  -- 크레딧 차감 원천
    status                 VARCHAR(10) NOT NULL DEFAULT 'confirmed'
                           CHECK (status IN ('confirmed','waitlisted','cancelled')),
    booking_type           VARCHAR(10) NOT NULL DEFAULT 'regular'
                           CHECK (booking_type IN ('regular','trial','makeup')),
    credit_used            BOOLEAN NOT NULL DEFAULT false,   -- 이 예약이 크레딧 1회를 차감했는가 (환원 정합성)
    attendance_outcome     VARCHAR(15) NOT NULL DEFAULT 'pending'
                           CHECK (attendance_outcome IN ('pending','checked_in','no_show',
                                                         'late_cancel','coach_excused','walk_in')),
    attendance_marked_at   TIMESTAMPTZ,
    attendance_marked_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    waitlist_promoted_at   TIMESTAMPTZ,
    cancel_reason          TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, member_id)
);

-- 쿼리 패턴: (a) 세션 보드(session_id,status), (b) 내 예약 목록(member_id,created),
--            (c) KPI no_show 집계(outcome 부분), (d) waitlist 승급 조회
CREATE INDEX IF NOT EXISTS idx_bookings_session_status  ON public.bookings(session_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_member_created  ON public.bookings(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_outcome         ON public.bookings(attendance_outcome)
    WHERE attendance_outcome <> 'pending';
CREATE INDEX IF NOT EXISTS idx_bookings_waitlist_queue  ON public.bookings(session_id, created_at)
    WHERE status = 'waitlisted';

COMMENT ON TABLE  public.bookings IS 'sessions: 예약. status(예약 수명주기 3종)와 attendance_outcome(출결 판정 6종)의 역할 분리 — 계약 §2 상태머신 정규화';
COMMENT ON COLUMN public.bookings.credit_used IS 'fn_book_with_credit이 크레딧을 차감했는지 기록 — 취소 시 환원 여부의 유일한 근거';
COMMENT ON COLUMN public.bookings.attendance_outcome IS 'pending/checked_in/no_show/late_cancel/coach_excused/walk_in — fn_mark_attendance 전용 갱신';

-- ----------------------------------------------------------------------------
-- 4. checkins — 체크인 로그 (append-only 사실 기록)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    member_id       UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    session_id      UUID REFERENCES public.sessions(id) ON DELETE SET NULL,   -- 자유 출입(수업 외)은 NULL
    facility_id     UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
    checkin_time    TIMESTAMPTZ NOT NULL DEFAULT now(),
    checkin_method  VARCHAR(15) NOT NULL DEFAULT 'qr'
                    CHECK (checkin_method IN ('qr','kiosk','manual','manual_coach')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 쿼리 패턴: (a) 세션·회원 중복체크(존재검사), (b) 회원 최근 출석, (c) 일자별 출석 리포트
CREATE UNIQUE INDEX IF NOT EXISTS uq_checkins_session_member ON public.checkins(session_id, member_id)
    WHERE session_id IS NOT NULL;                                              -- 세션당 1회 체크인 보장
CREATE INDEX IF NOT EXISTS idx_checkins_member_time ON public.checkins(member_id, checkin_time DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_facility_time ON public.checkins(facility_id, checkin_time DESC);

COMMENT ON TABLE  public.checkins IS 'sessions: 체크인 사실 로그(불변). 출결 "판정"은 bookings.attendance_outcome, "사실"은 checkins — 이중 기록 규칙';
COMMENT ON COLUMN public.checkins.checkin_method IS 'qr(앱 QR)/kiosk(키오스크)/manual(Admin)/manual_coach(코치 세션보드)';

-- ----------------------------------------------------------------------------
-- 5. session_rotation_states — 스테이션 서킷 순환 상태 (TV HUD 실시간 소스)
--    ⚠️ SELECT anon 공개는 의도된 설계 — /class/rotation-hud는 미인증 TV 경로
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_rotation_states (
    session_id                 UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
    facility_id                UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    current_round              INT NOT NULL DEFAULT 1,
    total_rounds               INT NOT NULL DEFAULT 6,
    seconds_per_round          INT NOT NULL DEFAULT 300,
    is_running                 BOOLEAN NOT NULL DEFAULT false,
    timer_started_at           TIMESTAMPTZ,
    paused_remaining_seconds   INT,
    team_assignments           JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{station, member_ids[]},...]
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.session_rotation_states IS 'sessions: 서킷 순환 타이머 상태. anon SELECT 공개(TV HUD 의도적 예외 — 계약 명시), 쓰기는 배정 코치/admin';

DROP TRIGGER IF EXISTS trg_rotation_states_updated_at ON public.session_rotation_states;
CREATE TRIGGER trg_rotation_states_updated_at BEFORE UPDATE ON public.session_rotation_states
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. session_feedback — 수업 피드백 (계약 보정: sessions 도메인 정식 등재)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    member_id       UUID REFERENCES public.members(id) ON DELETE SET NULL,
    coach_id        UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    admin_response  TEXT,
    responded_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    responded_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, member_id)
);

-- 쿼리 패턴: (a) 피드백 관리 목록(최근순), (b) 코치별 평점 집계
CREATE INDEX IF NOT EXISTS idx_session_feedback_created ON public.session_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_feedback_coach_rating ON public.session_feedback(coach_id, rating);

COMMENT ON TABLE public.session_feedback IS 'sessions: 수업 피드백(rating 1-5). 회원 본인 작성, admin 응답(admin_response). Admin 피드백 1화면(분석+응대 탭)의 단일 소스';

DROP TRIGGER IF EXISTS trg_session_feedback_updated_at ON public.session_feedback;
CREATE TRIGGER trg_session_feedback_updated_at BEFORE UPDATE ON public.session_feedback
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 7. updated_at 트리거
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_sessions_updated_at ON public.sessions;
CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 8. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.sessions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_coaches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_rotation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_feedback        ENABLE ROW LEVEL SECURITY;

-- sessions: 인증 읽기(스케줄 화면) / admin 쓰기 (수업 개설·변경은 Admin 전용)
DROP POLICY IF EXISTS "sessions read" ON public.sessions;
CREATE POLICY "sessions read" ON public.sessions
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sessions admin manage" ON public.sessions;
CREATE POLICY "sessions admin manage" ON public.sessions
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- session_coaches: 인증 읽기 / admin 쓰기
DROP POLICY IF EXISTS "session_coaches read" ON public.session_coaches;
CREATE POLICY "session_coaches read" ON public.session_coaches
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "session_coaches admin manage" ON public.session_coaches;
CREATE POLICY "session_coaches admin manage" ON public.session_coaches
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- bookings: 본인 읽기 + staff 읽기 / 쓰기는 RPC(fn_book_with_credit 등)와 admin만
DROP POLICY IF EXISTS "bookings own read" ON public.bookings;
CREATE POLICY "bookings own read" ON public.bookings
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.members m
                   WHERE m.id = bookings.member_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "bookings staff read" ON public.bookings;
CREATE POLICY "bookings staff read" ON public.bookings
    FOR SELECT TO authenticated USING (public.is_admin_or_coach());
DROP POLICY IF EXISTS "bookings admin manage" ON public.bookings;
CREATE POLICY "bookings admin manage" ON public.bookings
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
-- 주의: member의 직접 INSERT/UPDATE 정책 없음 — 예약/취소는 SECURITY DEFINER RPC 경유
--       (정원·크레딧 검증 우회 차단), 출결 갱신도 fn_mark_attendance 경유.

-- checkins: 본인 읽기 + staff 읽기 / INSERT는 RPC·서버 경유, admin 관리
DROP POLICY IF EXISTS "checkins own read" ON public.checkins;
CREATE POLICY "checkins own read" ON public.checkins
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.members m
                   WHERE m.id = checkins.member_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "checkins staff read" ON public.checkins;
CREATE POLICY "checkins staff read" ON public.checkins
    FOR SELECT TO authenticated USING (public.is_admin_or_coach());
DROP POLICY IF EXISTS "checkins admin manage" ON public.checkins;
CREATE POLICY "checkins admin manage" ON public.checkins
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- session_rotation_states: 【예외】 SELECT는 anon 포함 전체 공개 (TV HUD),
--                          쓰기는 admin + 배정 코치만
DROP POLICY IF EXISTS "rotation_states public read" ON public.session_rotation_states;
CREATE POLICY "rotation_states public read" ON public.session_rotation_states
    FOR SELECT USING (true);                       -- TO 미지정 = anon 포함 (의도적)
DROP POLICY IF EXISTS "rotation_states admin manage" ON public.session_rotation_states;
CREATE POLICY "rotation_states admin manage" ON public.session_rotation_states
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "rotation_states assigned coach manage" ON public.session_rotation_states;
CREATE POLICY "rotation_states assigned coach manage" ON public.session_rotation_states
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.session_coaches sc
                   JOIN public.coaches c ON c.id = sc.coach_id
                   WHERE sc.session_id = session_rotation_states.session_id
                     AND c.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.session_coaches sc
                        JOIN public.coaches c ON c.id = sc.coach_id
                        WHERE sc.session_id = session_rotation_states.session_id
                          AND c.user_id = auth.uid()));

-- session_feedback: 본인 INSERT/read + staff 읽기 + admin 응답 UPDATE/관리
DROP POLICY IF EXISTS "session_feedback own read" ON public.session_feedback;
CREATE POLICY "session_feedback own read" ON public.session_feedback
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.members m
                   WHERE m.id = session_feedback.member_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "session_feedback own insert" ON public.session_feedback;
CREATE POLICY "session_feedback own insert" ON public.session_feedback
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.members m
                        WHERE m.id = session_feedback.member_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "session_feedback staff read" ON public.session_feedback;
CREATE POLICY "session_feedback staff read" ON public.session_feedback
    FOR SELECT TO authenticated USING (public.is_admin_or_coach());
DROP POLICY IF EXISTS "session_feedback admin manage" ON public.session_feedback;
CREATE POLICY "session_feedback admin manage" ON public.session_feedback
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- 03_sessions_bookings.sql 끝 — 다음: 04_wod_runbook.sql
-- ============================================================================
