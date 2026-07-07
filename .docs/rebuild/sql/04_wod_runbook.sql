-- ============================================================================
-- BCL Portal 재구축 DDL — 04_wod_runbook.sql
-- ----------------------------------------------------------------------------
-- 목적   : wod 도메인 — movement_categories / movement_library / wod_templates /
--          wod_template_movements / session_wods / class_runbook_templates /
--          session_runbooks / member_alert_flags
-- 의존   : 00, 01 (facilities/members), 03 (sessions)
-- 변경   : (to-be) 레거시 wods 테이블 폐지(생성하지 않음),
--          movement_library.category는 처음부터 movement_categories.slug FK
--          (as-is의 하드코딩 CHECK → FK 전환 이력 반영),
--          format_type에 station_circuit 포함(사후 ALTER 이력 흡수)
-- 시드   : movement_categories 8종 (운동 35종·벤치마크 WOD 10종 시드는
--          별도 seed 스크립트 — as-is p1a 마이그레이션 §F 재사용)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. movement_categories — 운동 카테고리 마스터
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movement_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(40) NOT NULL UNIQUE,
    name_ko     VARCHAR(60) NOT NULL,
    name_en     VARCHAR(60) NOT NULL,
    color       VARCHAR(9),                       -- 배지 색 (#rrggbb)
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.movement_categories IS 'wod: 운동 카테고리 마스터. movement_library.category의 FK 대상 (동적 카테고리)';

-- 시드: 카테고리 8종
INSERT INTO public.movement_categories (slug, name_ko, name_en, color, sort_order) VALUES
    ('weightlifting',   '바벨',      'Weightlifting',   '#f87171', 1),
    ('gymnastics',      '체조',      'Gymnastics',      '#4ade80', 2),
    ('monostructural',  '카디오',    'Cardio',          '#22d3ee', 3),
    ('dumbbell',        '덤벨',      'Dumbbell',        '#c084fc', 4),
    ('kettlebell',      '케틀벨',    'Kettlebell',      '#f472b6', 5),
    ('medball',         '메드볼',    'Medball',         '#fbbf24', 6),
    ('other_equipment', '기타 기구', 'Other Equipment', '#2dd4bf', 7),
    ('accessory',       '보조 운동', 'Accessory',       '#818cf8', 8)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. movement_library — 운동 사전 (전 시설 공유)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movement_library (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug              VARCHAR(100) NOT NULL UNIQUE,
    name_ko           VARCHAR(120) NOT NULL,
    name_en           VARCHAR(120) NOT NULL,
    category          VARCHAR(40) NOT NULL
                      REFERENCES public.movement_categories(slug)
                      ON UPDATE CASCADE ON DELETE RESTRICT,
    equipment         TEXT[] DEFAULT ARRAY[]::TEXT[],
    difficulty_level  INT NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    primary_muscles   TEXT[] DEFAULT ARRAY[]::TEXT[],
    coaching_points   TEXT,
    thumbnail_url     TEXT,                        -- Storage(movement-media)
    video_url         TEXT,                        -- YouTube 또는 Storage
    source_tag        VARCHAR(40) DEFAULT 'wod_exercise_list',
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 쿼리 패턴: 카테고리 필터 + 활성 목록 (검색은 ILIKE — 규모상 인덱스 불요)
CREATE INDEX IF NOT EXISTS idx_movement_library_category_active
    ON public.movement_library(category, is_active);

COMMENT ON TABLE public.movement_library IS 'wod: 전 시설 공유 운동 사전. category는 최초부터 movement_categories.slug FK (P26 결함 사전 해소)';

-- ----------------------------------------------------------------------------
-- 3. wod_templates — 재사용 WOD 템플릿
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wod_templates (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id       UUID REFERENCES public.facilities(id) ON DELETE CASCADE,   -- NULL=글로벌 공유
    template_kind     VARCHAR(20) NOT NULL DEFAULT 'daily'
                      CHECK (template_kind IN ('daily','benchmark','skill','strength','conditioning')),
    title             VARCHAR(200) NOT NULL,
    format_type       VARCHAR(20)
                      CHECK (format_type IN ('for_time','amrap','emom','tabata','chipper',
                                             'strength','custom','station_circuit')
                             OR format_type IS NULL),
    time_cap_minutes  INT,
    rounds            INT,
    description       TEXT,
    public_notes      TEXT,                        -- 회원/Class 화면 노출용
    coach_notes       TEXT,                        -- 코치 전용
    is_shared         BOOLEAN NOT NULL DEFAULT false,
    is_benchmark      BOOLEAN NOT NULL DEFAULT false,
    published_at      TIMESTAMPTZ,
    created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 쿼리 패턴: scope(shared/facility/benchmark) + kind 필터
CREATE INDEX IF NOT EXISTS idx_wod_templates_facility_kind ON public.wod_templates(facility_id, template_kind);
CREATE INDEX IF NOT EXISTS idx_wod_templates_shared ON public.wod_templates(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_wod_templates_benchmark ON public.wod_templates(is_benchmark) WHERE is_benchmark = true;

COMMENT ON TABLE public.wod_templates IS 'wod: 재사용 WOD 템플릿. facility_id NULL=글로벌(벤치마크). format_type에 station_circuit 포함';

-- ----------------------------------------------------------------------------
-- 4. wod_template_movements — 템플릿 movement line
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wod_template_movements (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wod_template_id   UUID NOT NULL REFERENCES public.wod_templates(id) ON DELETE CASCADE,
    sort_order        INT NOT NULL DEFAULT 0,
    movement_id       UUID REFERENCES public.movement_library(id) ON DELETE SET NULL,
    custom_label      VARCHAR(200),
    target_value      NUMERIC,
    target_unit       VARCHAR(20),
    distance_meters   INT,
    duration_seconds  INT,
    load_male_rx      VARCHAR(40),
    load_female_rx    VARCHAR(40),
    rx_notes          TEXT,
    scaling_notes     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (movement_id IS NOT NULL OR custom_label IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_wod_template_movements_template
    ON public.wod_template_movements(wod_template_id, sort_order);

COMMENT ON TABLE public.wod_template_movements IS 'wod: 템플릿 라인. movement_library 참조 또는 custom_label 자유 텍스트';

-- ----------------------------------------------------------------------------
-- 5. session_wods — 세션별 게시 WOD 스냅샷 (세션당 1행, 발행 후 불변)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_wods (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id            UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
    template_id           UUID REFERENCES public.wod_templates(id) ON DELETE SET NULL,
    publish_state         VARCHAR(15) NOT NULL DEFAULT 'draft'
                          CHECK (publish_state IN ('draft','published','archived')),
    source_version        INT NOT NULL DEFAULT 1,
    title_override        VARCHAR(200),
    format_override       VARCHAR(20)
                          CHECK (format_override IN ('for_time','amrap','emom','tabata','chipper',
                                                     'strength','custom','station_circuit')
                                 OR format_override IS NULL),
    time_cap_override     INT,
    description_override  TEXT,
    movements_snapshot    JSONB NOT NULL DEFAULT '[]'::jsonb,   -- 발행 시점 동결 라인 배열
    coach_notes           TEXT,
    class_display_notes   TEXT,
    edited_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 쿼리 패턴: Class Display가 (publish_state, 날짜) 로 최신 발행분 조회
CREATE INDEX IF NOT EXISTS idx_session_wods_published
    ON public.session_wods(published_at DESC) WHERE publish_state = 'published';

COMMENT ON TABLE public.session_wods IS 'wod: 세션 WOD 스냅샷 — sessions.wod_description을 완전 대체하는 유일한 WOD 소스. publish 후 템플릿 변경 무영향';

-- ----------------------------------------------------------------------------
-- 6. class_runbook_templates — 클래스 표준 런시트
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_runbook_templates (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id              UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    class_type               VARCHAR(40),                     -- sessions.class_type 매칭 키
    name                     VARCHAR(120) NOT NULL,
    warmup                   TEXT,
    movement_prep            TEXT,
    scaling_options          TEXT,
    coach_cues               TEXT,
    safety_notes             TEXT,
    finish_notes             TEXT,
    default_wod_template_id  UUID REFERENCES public.wod_templates(id) ON DELETE SET NULL,
    is_default               BOOLEAN NOT NULL DEFAULT false,
    created_by               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runbook_templates_facility_type
    ON public.class_runbook_templates(facility_id, class_type);

COMMENT ON TABLE public.class_runbook_templates IS 'wod: 시설별 클래스 표준 런시트 (warmup/scaling/cue/safety/finish)';

-- ----------------------------------------------------------------------------
-- 7. session_runbooks — 세션별 런시트 오버라이드 (1:1, NULL=템플릿 상속)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_runbooks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
    template_id             UUID REFERENCES public.class_runbook_templates(id) ON DELETE SET NULL,
    session_wod_id          UUID REFERENCES public.session_wods(id) ON DELETE SET NULL,
    warmup_override         TEXT,
    movement_prep_override  TEXT,
    scaling_override        TEXT,
    cue_override            TEXT,
    safety_override         TEXT,
    finish_note_override    TEXT,
    published_at            TIMESTAMPTZ,
    updated_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.session_runbooks IS 'wod: 세션 런시트 오버라이드. *_override NULL=템플릿 값 상속';

-- ----------------------------------------------------------------------------
-- 8. member_alert_flags — 회원 컨텍스트 플래그 (코치 세션보드 배지)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_alert_flags (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id    UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    flag_type    VARCHAR(40) NOT NULL
                 CHECK (flag_type IN ('trial','injury','renewal_due',
                                      'returning_after_absence','vip_attention')),
    severity     VARCHAR(10) NOT NULL DEFAULT 'info'
                 CHECK (severity IN ('info','warning','critical')),
    starts_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at      TIMESTAMPTZ,
    note         TEXT,
    created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 쿼리 패턴: 회원별 활성 플래그(부분 인덱스 — resolved_at NULL)
CREATE INDEX IF NOT EXISTS idx_member_alert_flags_active
    ON public.member_alert_flags(member_id, flag_type) WHERE resolved_at IS NULL;

COMMENT ON TABLE public.member_alert_flags IS 'wod(코치 운영): 회원 플래그. resolved_at IS NULL AND (ends_at 미경과)=활성';

-- ----------------------------------------------------------------------------
-- 9. updated_at 트리거
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_movement_library_updated_at ON public.movement_library;
CREATE TRIGGER trg_movement_library_updated_at BEFORE UPDATE ON public.movement_library
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_wod_templates_updated_at ON public.wod_templates;
CREATE TRIGGER trg_wod_templates_updated_at BEFORE UPDATE ON public.wod_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_session_wods_updated_at ON public.session_wods;
CREATE TRIGGER trg_session_wods_updated_at BEFORE UPDATE ON public.session_wods
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_runbook_templates_updated_at ON public.class_runbook_templates;
CREATE TRIGGER trg_runbook_templates_updated_at BEFORE UPDATE ON public.class_runbook_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_session_runbooks_updated_at ON public.session_runbooks;
CREATE TRIGGER trg_session_runbooks_updated_at BEFORE UPDATE ON public.session_runbooks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_member_alert_flags_updated_at ON public.member_alert_flags;
CREATE TRIGGER trg_member_alert_flags_updated_at BEFORE UPDATE ON public.member_alert_flags
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 10. RLS  (쓰기 하드닝 표준: INSERT/UPDATE=admin+coach, DELETE=admin —
--           세션 귀속 테이블은 "배정 코치"로 추가 제한)
-- ----------------------------------------------------------------------------
ALTER TABLE public.movement_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_library        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wod_templates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wod_template_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_wods            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_runbook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_runbooks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_alert_flags      ENABLE ROW LEVEL SECURITY;

-- movement_categories / movement_library: 인증 읽기, staff INSERT/UPDATE, admin DELETE
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['movement_categories','movement_library'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s read" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s read" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s staff insert" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s staff insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_coach())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s staff update" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s staff update" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin_or_coach()) WITH CHECK (public.is_admin_or_coach())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s admin delete" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s admin delete" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t, t);
    END LOOP;
END $$;

-- wod_templates / wod_template_movements / class_runbook_templates:
-- 인증 읽기, staff INSERT/UPDATE, admin DELETE (P0 하드닝 패턴 계승)
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['wod_templates','wod_template_movements','class_runbook_templates'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s read" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s read" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s staff insert" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s staff insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_coach())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s staff update" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s staff update" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin_or_coach()) WITH CHECK (public.is_admin_or_coach())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s admin delete" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s admin delete" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t, t);
    END LOOP;
END $$;

-- session_wods: 인증 읽기 / admin 전체 / 배정 코치만 수정
DROP POLICY IF EXISTS "session_wods read" ON public.session_wods;
CREATE POLICY "session_wods read" ON public.session_wods
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "session_wods admin manage" ON public.session_wods;
CREATE POLICY "session_wods admin manage" ON public.session_wods
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "session_wods assigned coach manage" ON public.session_wods;
CREATE POLICY "session_wods assigned coach manage" ON public.session_wods
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.session_coaches sc
                   JOIN public.coaches c ON c.id = sc.coach_id
                   WHERE sc.session_id = session_wods.session_id AND c.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.session_coaches sc
                        JOIN public.coaches c ON c.id = sc.coach_id
                        WHERE sc.session_id = session_wods.session_id AND c.user_id = auth.uid()));

-- session_runbooks: session_wods와 동일 패턴
DROP POLICY IF EXISTS "session_runbooks read" ON public.session_runbooks;
CREATE POLICY "session_runbooks read" ON public.session_runbooks
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "session_runbooks admin manage" ON public.session_runbooks;
CREATE POLICY "session_runbooks admin manage" ON public.session_runbooks
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "session_runbooks assigned coach manage" ON public.session_runbooks;
CREATE POLICY "session_runbooks assigned coach manage" ON public.session_runbooks
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.session_coaches sc
                   JOIN public.coaches c ON c.id = sc.coach_id
                   WHERE sc.session_id = session_runbooks.session_id AND c.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.session_coaches sc
                        JOIN public.coaches c ON c.id = sc.coach_id
                        WHERE sc.session_id = session_runbooks.session_id AND c.user_id = auth.uid()));

-- member_alert_flags: staff 전용 (회원 비노출 민감 정보)
DROP POLICY IF EXISTS "member_alert_flags staff select" ON public.member_alert_flags;
CREATE POLICY "member_alert_flags staff select" ON public.member_alert_flags
    FOR SELECT TO authenticated USING (public.is_admin_or_coach());
DROP POLICY IF EXISTS "member_alert_flags staff insert" ON public.member_alert_flags;
CREATE POLICY "member_alert_flags staff insert" ON public.member_alert_flags
    FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_coach());
DROP POLICY IF EXISTS "member_alert_flags staff update" ON public.member_alert_flags;
CREATE POLICY "member_alert_flags staff update" ON public.member_alert_flags
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_coach()) WITH CHECK (public.is_admin_or_coach());
DROP POLICY IF EXISTS "member_alert_flags admin delete" ON public.member_alert_flags;
CREATE POLICY "member_alert_flags admin delete" ON public.member_alert_flags
    FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================================
-- 04_wod_runbook.sql 끝 — 다음: 05_race.sql
-- ============================================================================
