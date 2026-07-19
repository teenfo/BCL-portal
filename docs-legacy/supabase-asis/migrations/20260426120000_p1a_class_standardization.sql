-- ============================================================
-- Migration: p1a_class_standardization
-- Purpose: 코치앱 P1-A 수업 표준화 + 회원 컨텍스트 (Priority 23)
--   - movement_library / wod_templates / wod_template_movements
--   - class_runbook_templates / session_runbooks
--   - session_wods (Coach/Admin/Class Display 공통 WOD 소스)
--   - member_alert_flags (Trial/injury/renewal_due/...)
--   - 14개 RPC (search/list/upsert/get/publish)
--   - movement_library / benchmark wod_templates 시드
-- Author: Senior Dev (Opus)
-- Date: 2026-04-26
-- Related: .docs/archive/planning/coach-app-master-plan-20260425.md §9 (P1-A)
-- ============================================================

-- ============================================================
-- SECTION A. 스키마 — 7개 신규 테이블
-- ============================================================

-- A.1 movement_library — 공통 운동 사전 (전 시설 공유)
CREATE TABLE IF NOT EXISTS public.movement_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    name_ko VARCHAR(120) NOT NULL,
    name_en VARCHAR(120) NOT NULL,
    category VARCHAR(40) NOT NULL
        CHECK (category IN ('weightlifting','gymnastics','monostructural','dumbbell','kettlebell','medball','other_equipment','accessory')),
    equipment TEXT[] DEFAULT ARRAY[]::TEXT[],
    difficulty_level INT NOT NULL DEFAULT 1
        CHECK (difficulty_level BETWEEN 1 AND 5),
    primary_muscles TEXT[] DEFAULT ARRAY[]::TEXT[],
    coaching_points TEXT,
    source_tag VARCHAR(40) DEFAULT 'wod_exercise_list',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movement_library_category ON public.movement_library(category);
CREATE INDEX IF NOT EXISTS idx_movement_library_active ON public.movement_library(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_movement_library_slug ON public.movement_library(slug);

COMMENT ON TABLE public.movement_library IS '전 시설 공유 운동 라이브러리. wod_exercise_list.md 기반 시드.';

-- A.2 wod_templates — 재사용 가능한 WOD 템플릿
CREATE TABLE IF NOT EXISTS public.wod_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    template_kind VARCHAR(20) NOT NULL DEFAULT 'daily'
        CHECK (template_kind IN ('daily','benchmark','skill','strength','conditioning')),
    title VARCHAR(200) NOT NULL,
    format_type VARCHAR(20)
        CHECK (format_type IN ('for_time','amrap','emom','tabata','chipper','strength','custom') OR format_type IS NULL),
    time_cap_minutes INT,
    rounds INT,
    description TEXT,
    public_notes TEXT,
    coach_notes TEXT,
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    is_benchmark BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wod_templates_facility ON public.wod_templates(facility_id);
CREATE INDEX IF NOT EXISTS idx_wod_templates_kind ON public.wod_templates(template_kind);
CREATE INDEX IF NOT EXISTS idx_wod_templates_shared ON public.wod_templates(is_shared) WHERE is_shared = TRUE;
CREATE INDEX IF NOT EXISTS idx_wod_templates_benchmark ON public.wod_templates(is_benchmark) WHERE is_benchmark = TRUE;

COMMENT ON TABLE public.wod_templates IS 'Admin/Head Coach가 작성한 재사용 가능한 WOD 템플릿';
COMMENT ON COLUMN public.wod_templates.facility_id IS 'NULL이면 글로벌 공유 (벤치마크 WOD 등)';

-- A.3 wod_template_movements — WOD 템플릿의 movement line
CREATE TABLE IF NOT EXISTS public.wod_template_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wod_template_id UUID NOT NULL REFERENCES public.wod_templates(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    movement_id UUID REFERENCES public.movement_library(id) ON DELETE SET NULL,
    custom_label VARCHAR(200),
    target_value NUMERIC,
    target_unit VARCHAR(20),
    distance_meters INT,
    duration_seconds INT,
    load_male_rx VARCHAR(40),
    load_female_rx VARCHAR(40),
    rx_notes TEXT,
    scaling_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (movement_id IS NOT NULL OR custom_label IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_wod_template_movements_template ON public.wod_template_movements(wod_template_id, sort_order);

COMMENT ON TABLE public.wod_template_movements IS '템플릿 내 movement line (movement_library 참조 또는 custom_label 자유 텍스트)';

-- A.4 session_wods — 세션별 게시 WOD 스냅샷 (불변)
CREATE TABLE IF NOT EXISTS public.session_wods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.wod_templates(id) ON DELETE SET NULL,
    publish_state VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (publish_state IN ('draft','published','archived')),
    source_version INT NOT NULL DEFAULT 1,
    title_override VARCHAR(200),
    format_override VARCHAR(20)
        CHECK (format_override IN ('for_time','amrap','emom','tabata','chipper','strength','custom') OR format_override IS NULL),
    time_cap_override INT,
    description_override TEXT,
    movements_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,
    coach_notes TEXT,
    class_display_notes TEXT,
    edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_wods_session ON public.session_wods(session_id);
CREATE INDEX IF NOT EXISTS idx_session_wods_state ON public.session_wods(publish_state);
CREATE INDEX IF NOT EXISTS idx_session_wods_published_at ON public.session_wods(published_at) WHERE publish_state = 'published';

COMMENT ON TABLE public.session_wods IS '세션별 게시 WOD 스냅샷. publish 후에는 템플릿 변경에 영향받지 않음.';
COMMENT ON COLUMN public.session_wods.movements_snapshot IS '발행 시점에 동결된 movement line 배열 (JSONB)';

-- A.5 class_runbook_templates — 클래스 표준 런시트
CREATE TABLE IF NOT EXISTS public.class_runbook_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    class_type VARCHAR(40),
    name VARCHAR(120) NOT NULL,
    warmup TEXT,
    movement_prep TEXT,
    scaling_options TEXT,
    coach_cues TEXT,
    safety_notes TEXT,
    finish_notes TEXT,
    default_wod_template_id UUID REFERENCES public.wod_templates(id) ON DELETE SET NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_runbook_templates_facility ON public.class_runbook_templates(facility_id);
CREATE INDEX IF NOT EXISTS idx_runbook_templates_class_type ON public.class_runbook_templates(facility_id, class_type) WHERE class_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_runbook_templates_default ON public.class_runbook_templates(facility_id, is_default) WHERE is_default = TRUE;

COMMENT ON TABLE public.class_runbook_templates IS '시설별 클래스 표준 런시트 (warmup/scaling/cue/safety/finish)';

-- A.6 session_runbooks — 세션별 런시트 오버라이드
CREATE TABLE IF NOT EXISTS public.session_runbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.class_runbook_templates(id) ON DELETE SET NULL,
    session_wod_id UUID REFERENCES public.session_wods(id) ON DELETE SET NULL,
    warmup_override TEXT,
    movement_prep_override TEXT,
    scaling_override TEXT,
    cue_override TEXT,
    safety_override TEXT,
    finish_note_override TEXT,
    published_at TIMESTAMPTZ,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_runbooks_session ON public.session_runbooks(session_id);
CREATE INDEX IF NOT EXISTS idx_session_runbooks_template ON public.session_runbooks(template_id);

COMMENT ON TABLE public.session_runbooks IS '세션별 런시트 오버라이드. NULL인 필드는 템플릿 기본값 사용.';

-- A.7 member_alert_flags — 회원 컨텍스트 플래그
CREATE TABLE IF NOT EXISTS public.member_alert_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    flag_type VARCHAR(40) NOT NULL
        CHECK (flag_type IN ('trial','injury','renewal_due','returning_after_absence','vip_attention')),
    severity VARCHAR(20) NOT NULL DEFAULT 'info'
        CHECK (severity IN ('info','warning','critical')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ,
    note TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_member_alert_flags_member ON public.member_alert_flags(member_id);
CREATE INDEX IF NOT EXISTS idx_member_alert_flags_active ON public.member_alert_flags(member_id, flag_type)
    WHERE resolved_at IS NULL AND (ends_at IS NULL OR ends_at > now());
CREATE INDEX IF NOT EXISTS idx_member_alert_flags_type ON public.member_alert_flags(flag_type)
    WHERE resolved_at IS NULL;

COMMENT ON TABLE public.member_alert_flags IS '회원 컨텍스트 플래그. resolved_at IS NULL이고 ends_at 미경과면 활성.';

-- ============================================================
-- SECTION B. RLS 정책
-- ============================================================

-- B.1 movement_library — 인증된 사용자 읽기 / admin·coach 관리
ALTER TABLE public.movement_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "movement_library read all" ON public.movement_library;
CREATE POLICY "movement_library read all" ON public.movement_library
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "movement_library admin manage" ON public.movement_library;
CREATE POLICY "movement_library admin manage" ON public.movement_library
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- B.2 wod_templates — 읽기 전체 / admin·coach 작성
ALTER TABLE public.wod_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wod_templates read all" ON public.wod_templates;
CREATE POLICY "wod_templates read all" ON public.wod_templates
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "wod_templates coach admin manage" ON public.wod_templates;
CREATE POLICY "wod_templates coach admin manage" ON public.wod_templates
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')));

-- B.3 wod_template_movements — 부모 정책 위임
ALTER TABLE public.wod_template_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wod_template_movements read all" ON public.wod_template_movements;
CREATE POLICY "wod_template_movements read all" ON public.wod_template_movements
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "wod_template_movements coach admin manage" ON public.wod_template_movements;
CREATE POLICY "wod_template_movements coach admin manage" ON public.wod_template_movements
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')));

-- B.4 session_wods — 인증 읽기 / admin 또는 배정된 코치만 수정 (감사 지적 2.3 수정)
ALTER TABLE public.session_wods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "session_wods read all" ON public.session_wods;
CREATE POLICY "session_wods read all" ON public.session_wods
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "session_wods coach admin manage" ON public.session_wods;
-- admin: 전체 관리
CREATE POLICY "session_wods admin manage" ON public.session_wods
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
-- coach: 본인이 배정된 세션의 WOD만 수정 가능
CREATE POLICY "session_wods assigned coach manage" ON public.session_wods
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
        AND EXISTS (
            SELECT 1 FROM public.session_coaches sc
            JOIN public.coaches c ON c.id = sc.coach_id
            WHERE sc.session_id = session_wods.session_id AND c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
        AND EXISTS (
            SELECT 1 FROM public.session_coaches sc
            JOIN public.coaches c ON c.id = sc.coach_id
            WHERE sc.session_id = session_wods.session_id AND c.user_id = auth.uid()
        )
    );

-- B.5 class_runbook_templates — 인증 읽기 / admin·coach 작성
ALTER TABLE public.class_runbook_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "class_runbook_templates read all" ON public.class_runbook_templates;
CREATE POLICY "class_runbook_templates read all" ON public.class_runbook_templates
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "class_runbook_templates coach admin manage" ON public.class_runbook_templates;
CREATE POLICY "class_runbook_templates coach admin manage" ON public.class_runbook_templates
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')));

-- B.6 session_runbooks — 인증 읽기 / admin 또는 배정된 코치만 수정 (감사 지적 2.3 수정)
ALTER TABLE public.session_runbooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "session_runbooks read all" ON public.session_runbooks;
CREATE POLICY "session_runbooks read all" ON public.session_runbooks
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "session_runbooks coach admin manage" ON public.session_runbooks;
-- admin: 전체 관리
CREATE POLICY "session_runbooks admin manage" ON public.session_runbooks
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
-- coach: 본인이 배정된 세션의 런북만 수정 가능
CREATE POLICY "session_runbooks assigned coach manage" ON public.session_runbooks
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
        AND EXISTS (
            SELECT 1 FROM public.session_coaches sc
            JOIN public.coaches c ON c.id = sc.coach_id
            WHERE sc.session_id = session_runbooks.session_id AND c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
        AND EXISTS (
            SELECT 1 FROM public.session_coaches sc
            JOIN public.coaches c ON c.id = sc.coach_id
            WHERE sc.session_id = session_runbooks.session_id AND c.user_id = auth.uid()
        )
    );

-- B.7 member_alert_flags — admin·coach만 (민감 정보)
ALTER TABLE public.member_alert_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "member_alert_flags coach admin select" ON public.member_alert_flags;
CREATE POLICY "member_alert_flags coach admin select" ON public.member_alert_flags
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')));
DROP POLICY IF EXISTS "member_alert_flags coach admin manage" ON public.member_alert_flags;
CREATE POLICY "member_alert_flags coach admin manage" ON public.member_alert_flags
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coach')));

-- ============================================================
-- SECTION C. Helper functions (private)
-- ============================================================

-- C.1 _p1a_assert_coach_or_admin — 권한 체크 단일 진입점
CREATE OR REPLACE FUNCTION public._p1a_assert_coach_or_admin()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'unauthenticated';
    END IF;
    SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
    IF v_role IS NULL OR v_role NOT IN ('admin','coach') THEN
        RAISE EXCEPTION 'forbidden';
    END IF;
    RETURN v_user_id;
END;
$$;

-- C.2 _p1a_assert_coach_can_edit_session — 세션 편집 권한
CREATE OR REPLACE FUNCTION public._p1a_assert_coach_can_edit_session(p_session_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
BEGIN
    v_user_id := public._p1a_assert_coach_or_admin();
    SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
    IF v_role = 'admin' THEN
        RETURN v_user_id;
    END IF;
    -- coach: 본인이 배정된 세션인지 확인
    IF NOT EXISTS (
        SELECT 1
        FROM public.session_coaches sc
        JOIN public.coaches c ON c.id = sc.coach_id
        WHERE sc.session_id = p_session_id
          AND c.user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'forbidden_session: %', p_session_id;
    END IF;
    RETURN v_user_id;
END;
$$;

-- ============================================================
-- SECTION D. RPC 14종
-- ============================================================

-- D.1 fn_search_wod_movements — 운동 검색
CREATE OR REPLACE FUNCTION public.fn_search_wod_movements(
    p_query TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_equipment TEXT DEFAULT NULL,
    p_limit INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_results JSONB;
BEGIN
    PERFORM public._p1a_assert_coach_or_admin();
    SELECT COALESCE(jsonb_agg(t ORDER BY t.name_ko), '[]'::JSONB)
    INTO v_results
    FROM (
        SELECT
            m.id,
            m.slug,
            m.name_ko,
            m.name_en,
            m.category,
            m.equipment,
            m.difficulty_level,
            m.primary_muscles,
            m.coaching_points
        FROM public.movement_library m
        WHERE m.is_active = TRUE
          AND (p_query IS NULL OR p_query = '' OR
               m.name_ko ILIKE '%' || p_query || '%' OR
               m.name_en ILIKE '%' || p_query || '%' OR
               m.slug ILIKE '%' || p_query || '%')
          AND (p_category IS NULL OR p_category = '' OR m.category = p_category)
          AND (p_equipment IS NULL OR p_equipment = '' OR m.equipment @> ARRAY[p_equipment]::TEXT[])
        ORDER BY m.name_ko
        LIMIT GREATEST(p_limit, 1)
    ) t;
    RETURN jsonb_build_object('success', TRUE, 'status', 'ok', 'data', v_results, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.2 fn_list_wod_templates — 템플릿 목록
CREATE OR REPLACE FUNCTION public.fn_list_wod_templates(
    p_scope TEXT DEFAULT 'shared',
    p_facility_id UUID DEFAULT NULL,
    p_template_kind TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_results JSONB;
BEGIN
    PERFORM public._p1a_assert_coach_or_admin();
    SELECT COALESCE(jsonb_agg(t ORDER BY t.title), '[]'::JSONB)
    INTO v_results
    FROM (
        SELECT
            wt.id,
            wt.facility_id,
            wt.template_kind,
            wt.title,
            wt.format_type,
            wt.time_cap_minutes,
            wt.rounds,
            wt.description,
            wt.public_notes,
            wt.coach_notes,
            wt.is_shared,
            wt.is_benchmark,
            wt.published_at,
            wt.created_at,
            wt.updated_at,
            (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', m.id,
                    'sort_order', m.sort_order,
                    'movement_id', m.movement_id,
                    'movement_name_ko', ml.name_ko,
                    'movement_name_en', ml.name_en,
                    'custom_label', m.custom_label,
                    'target_value', m.target_value,
                    'target_unit', m.target_unit,
                    'distance_meters', m.distance_meters,
                    'duration_seconds', m.duration_seconds,
                    'load_male_rx', m.load_male_rx,
                    'load_female_rx', m.load_female_rx,
                    'rx_notes', m.rx_notes,
                    'scaling_notes', m.scaling_notes
                ) ORDER BY m.sort_order), '[]'::JSONB)
                FROM public.wod_template_movements m
                LEFT JOIN public.movement_library ml ON ml.id = m.movement_id
                WHERE m.wod_template_id = wt.id
            ) AS movements
        FROM public.wod_templates wt
        WHERE
            CASE
                WHEN p_scope = 'shared' THEN wt.is_shared = TRUE OR wt.facility_id IS NULL
                WHEN p_scope = 'facility' THEN wt.facility_id = p_facility_id
                WHEN p_scope = 'benchmark' THEN wt.is_benchmark = TRUE
                ELSE TRUE
            END
          AND (p_template_kind IS NULL OR wt.template_kind = p_template_kind)
        ORDER BY wt.title
        LIMIT 200
    ) t;
    RETURN jsonb_build_object('success', TRUE, 'status', 'ok', 'data', v_results, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.3 fn_upsert_wod_template — 템플릿 생성/수정 + movement line 일괄 저장
CREATE OR REPLACE FUNCTION public.fn_upsert_wod_template(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
    v_movements JSONB;
    v_movement JSONB;
    v_idx INT := 0;
BEGIN
    v_user_id := public._p1a_assert_coach_or_admin();
    v_id := NULLIF(p_payload->>'id','')::UUID;
    v_movements := COALESCE(p_payload->'movements', '[]'::JSONB);

    IF v_id IS NULL THEN
        INSERT INTO public.wod_templates (
            facility_id, template_kind, title, format_type, time_cap_minutes, rounds,
            description, public_notes, coach_notes, is_shared, is_benchmark,
            created_by, updated_by
        )
        VALUES (
            NULLIF(p_payload->>'facility_id','')::UUID,
            COALESCE(p_payload->>'template_kind','daily'),
            p_payload->>'title',
            NULLIF(p_payload->>'format_type',''),
            (p_payload->>'time_cap_minutes')::INT,
            (p_payload->>'rounds')::INT,
            p_payload->>'description',
            p_payload->>'public_notes',
            p_payload->>'coach_notes',
            COALESCE((p_payload->>'is_shared')::BOOLEAN, FALSE),
            COALESCE((p_payload->>'is_benchmark')::BOOLEAN, FALSE),
            v_user_id, v_user_id
        )
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.wod_templates SET
            facility_id = NULLIF(p_payload->>'facility_id','')::UUID,
            template_kind = COALESCE(p_payload->>'template_kind', template_kind),
            title = COALESCE(p_payload->>'title', title),
            format_type = NULLIF(p_payload->>'format_type',''),
            time_cap_minutes = (p_payload->>'time_cap_minutes')::INT,
            rounds = (p_payload->>'rounds')::INT,
            description = p_payload->>'description',
            public_notes = p_payload->>'public_notes',
            coach_notes = p_payload->>'coach_notes',
            is_shared = COALESCE((p_payload->>'is_shared')::BOOLEAN, is_shared),
            is_benchmark = COALESCE((p_payload->>'is_benchmark')::BOOLEAN, is_benchmark),
            updated_by = v_user_id,
            updated_at = now()
        WHERE id = v_id;
    END IF;

    -- movement line 전체 교체 (idempotent)
    DELETE FROM public.wod_template_movements WHERE wod_template_id = v_id;
    FOR v_movement IN SELECT * FROM jsonb_array_elements(v_movements)
    LOOP
        INSERT INTO public.wod_template_movements (
            wod_template_id, sort_order, movement_id, custom_label,
            target_value, target_unit, distance_meters, duration_seconds,
            load_male_rx, load_female_rx, rx_notes, scaling_notes
        )
        VALUES (
            v_id, v_idx,
            NULLIF(v_movement->>'movement_id','')::UUID,
            v_movement->>'custom_label',
            (v_movement->>'target_value')::NUMERIC,
            v_movement->>'target_unit',
            (v_movement->>'distance_meters')::INT,
            (v_movement->>'duration_seconds')::INT,
            v_movement->>'load_male_rx',
            v_movement->>'load_female_rx',
            v_movement->>'rx_notes',
            v_movement->>'scaling_notes'
        );
        v_idx := v_idx + 1;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'status', 'ok', 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.4 fn_get_session_wod — 세션 WOD 조회 (편집/표시 공통)
CREATE OR REPLACE FUNCTION public.fn_get_session_wod(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    PERFORM public._p1a_assert_coach_or_admin();
    SELECT to_jsonb(sw) - 'movements_snapshot' || jsonb_build_object(
        'movements_snapshot', sw.movements_snapshot,
        'template', CASE WHEN sw.template_id IS NULL THEN NULL ELSE
            (SELECT to_jsonb(wt) FROM public.wod_templates wt WHERE wt.id = sw.template_id)
        END
    )
    INTO v_data
    FROM public.session_wods sw
    WHERE sw.session_id = p_session_id;
    RETURN jsonb_build_object('success', TRUE, 'status', 'ok',
        'data', COALESCE(v_data, jsonb_build_object('session_id', p_session_id, 'publish_state', 'none')),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.5 fn_upsert_session_wod — 세션 WOD 작성/오버라이드 (draft 단계)
CREATE OR REPLACE FUNCTION public.fn_upsert_session_wod(p_session_id UUID, p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := public._p1a_assert_coach_can_edit_session(p_session_id);

    INSERT INTO public.session_wods (
        session_id, template_id, publish_state, source_version,
        title_override, format_override, time_cap_override, description_override,
        movements_snapshot, coach_notes, class_display_notes, edited_by
    )
    VALUES (
        p_session_id,
        NULLIF(p_payload->>'template_id','')::UUID,
        COALESCE(p_payload->>'publish_state','draft'),
        1,
        p_payload->>'title_override',
        NULLIF(p_payload->>'format_override',''),
        (p_payload->>'time_cap_override')::INT,
        p_payload->>'description_override',
        COALESCE(p_payload->'movements_snapshot', '[]'::JSONB),
        p_payload->>'coach_notes',
        p_payload->>'class_display_notes',
        v_user_id
    )
    ON CONFLICT (session_id) DO UPDATE SET
        template_id = EXCLUDED.template_id,
        title_override = EXCLUDED.title_override,
        format_override = EXCLUDED.format_override,
        time_cap_override = EXCLUDED.time_cap_override,
        description_override = EXCLUDED.description_override,
        movements_snapshot = EXCLUDED.movements_snapshot,
        coach_notes = EXCLUDED.coach_notes,
        class_display_notes = EXCLUDED.class_display_notes,
        edited_by = v_user_id,
        updated_at = now()
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', TRUE, 'status', 'ok', 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.6 fn_publish_session_wod — draft → published 전환
CREATE OR REPLACE FUNCTION public.fn_publish_session_wod(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := public._p1a_assert_coach_can_edit_session(p_session_id);
    UPDATE public.session_wods
    SET publish_state = 'published',
        source_version = source_version + 1,
        published_by = v_user_id,
        published_at = now(),
        updated_at = now()
    WHERE session_id = p_session_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'session_wod_not_found';
    END IF;

    RETURN jsonb_build_object('success', TRUE, 'status', 'ok', 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.7 fn_get_class_display_wod — Class WOD 화면용 (인증된 사용자만)
CREATE OR REPLACE FUNCTION public.fn_get_class_display_wod(
    p_session_id UUID DEFAULT NULL,
    p_session_date DATE DEFAULT CURRENT_DATE,
    p_facility_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    -- 권한: 인증만 통과하면 됨 (Class Display 환경)
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'unauthenticated';
    END IF;

    SELECT jsonb_build_object(
        'session_id', sw.session_id,
        'session_title', s.title,
        'session_date', s.session_date,
        'session_start', s.start_time,
        'session_end', s.end_time,
        'wod_id', sw.id,
        'title', COALESCE(sw.title_override, wt.title),
        'format', COALESCE(sw.format_override, wt.format_type),
        'time_cap_minutes', COALESCE(sw.time_cap_override, wt.time_cap_minutes),
        'rounds', wt.rounds,
        'description', COALESCE(sw.description_override, wt.description),
        'movements_snapshot', sw.movements_snapshot,
        'class_display_notes', sw.class_display_notes,
        'published_at', sw.published_at
    )
    INTO v_data
    FROM public.session_wods sw
    JOIN public.sessions s ON s.id = sw.session_id
    LEFT JOIN public.wod_templates wt ON wt.id = sw.template_id
    WHERE sw.publish_state = 'published'
      AND (p_session_id IS NULL OR sw.session_id = p_session_id)
      AND (p_session_id IS NOT NULL OR s.session_date = p_session_date)
      AND (p_facility_id IS NULL OR s.facility_id = p_facility_id)
    ORDER BY s.session_date DESC, s.start_time DESC, sw.published_at DESC
    LIMIT 1;

    RETURN jsonb_build_object('success', TRUE, 'status', 'ok', 'data', v_data, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.8 fn_list_runbook_templates — 런시트 템플릿 목록
CREATE OR REPLACE FUNCTION public.fn_list_runbook_templates(
    p_facility_id UUID DEFAULT NULL,
    p_class_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    PERFORM public._p1a_assert_coach_or_admin();
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.is_default DESC, t.name), '[]'::JSONB)
    INTO v_data
    FROM public.class_runbook_templates t
    WHERE (p_facility_id IS NULL OR t.facility_id = p_facility_id)
      AND (p_class_type IS NULL OR t.class_type = p_class_type);
    RETURN jsonb_build_object('success', TRUE, 'status', 'ok', 'data', v_data, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.9 fn_upsert_runbook_template
CREATE OR REPLACE FUNCTION public.fn_upsert_runbook_template(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := public._p1a_assert_coach_or_admin();
    v_id := NULLIF(p_payload->>'id','')::UUID;

    IF v_id IS NULL THEN
        INSERT INTO public.class_runbook_templates (
            facility_id, class_type, name, warmup, movement_prep, scaling_options,
            coach_cues, safety_notes, finish_notes, default_wod_template_id, is_default,
            created_by, updated_by
        )
        VALUES (
            (p_payload->>'facility_id')::UUID,
            NULLIF(p_payload->>'class_type',''),
            p_payload->>'name',
            p_payload->>'warmup',
            p_payload->>'movement_prep',
            p_payload->>'scaling_options',
            p_payload->>'coach_cues',
            p_payload->>'safety_notes',
            p_payload->>'finish_notes',
            NULLIF(p_payload->>'default_wod_template_id','')::UUID,
            COALESCE((p_payload->>'is_default')::BOOLEAN, FALSE),
            v_user_id, v_user_id
        )
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.class_runbook_templates SET
            class_type = NULLIF(p_payload->>'class_type',''),
            name = COALESCE(p_payload->>'name', name),
            warmup = p_payload->>'warmup',
            movement_prep = p_payload->>'movement_prep',
            scaling_options = p_payload->>'scaling_options',
            coach_cues = p_payload->>'coach_cues',
            safety_notes = p_payload->>'safety_notes',
            finish_notes = p_payload->>'finish_notes',
            default_wod_template_id = NULLIF(p_payload->>'default_wod_template_id','')::UUID,
            is_default = COALESCE((p_payload->>'is_default')::BOOLEAN, is_default),
            updated_by = v_user_id,
            updated_at = now()
        WHERE id = v_id;
    END IF;

    RETURN jsonb_build_object('success', TRUE, 'status', 'ok', 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.10 fn_get_session_runbook
CREATE OR REPLACE FUNCTION public.fn_get_session_runbook(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    PERFORM public._p1a_assert_coach_or_admin();
    SELECT jsonb_build_object(
        'runbook', to_jsonb(sr),
        'template', CASE WHEN sr.template_id IS NULL THEN NULL ELSE
            (SELECT to_jsonb(t) FROM public.class_runbook_templates t WHERE t.id = sr.template_id)
        END
    )
    INTO v_data
    FROM public.session_runbooks sr
    WHERE sr.session_id = p_session_id;
    RETURN jsonb_build_object('success', TRUE, 'status', 'ok',
        'data', COALESCE(v_data, jsonb_build_object('runbook', NULL, 'template', NULL)),
        'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.11 fn_upsert_session_runbook
CREATE OR REPLACE FUNCTION public.fn_upsert_session_runbook(p_session_id UUID, p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := public._p1a_assert_coach_can_edit_session(p_session_id);

    INSERT INTO public.session_runbooks (
        session_id, template_id, session_wod_id,
        warmup_override, movement_prep_override, scaling_override,
        cue_override, safety_override, finish_note_override,
        published_at, updated_by
    )
    VALUES (
        p_session_id,
        NULLIF(p_payload->>'template_id','')::UUID,
        NULLIF(p_payload->>'session_wod_id','')::UUID,
        p_payload->>'warmup_override',
        p_payload->>'movement_prep_override',
        p_payload->>'scaling_override',
        p_payload->>'cue_override',
        p_payload->>'safety_override',
        p_payload->>'finish_note_override',
        CASE WHEN COALESCE((p_payload->>'publish')::BOOLEAN, FALSE) THEN now() ELSE NULL END,
        v_user_id
    )
    ON CONFLICT (session_id) DO UPDATE SET
        template_id = EXCLUDED.template_id,
        session_wod_id = EXCLUDED.session_wod_id,
        warmup_override = EXCLUDED.warmup_override,
        movement_prep_override = EXCLUDED.movement_prep_override,
        scaling_override = EXCLUDED.scaling_override,
        cue_override = EXCLUDED.cue_override,
        safety_override = EXCLUDED.safety_override,
        finish_note_override = EXCLUDED.finish_note_override,
        published_at = COALESCE(EXCLUDED.published_at, public.session_runbooks.published_at),
        updated_by = v_user_id,
        updated_at = now()
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', TRUE, 'status', 'ok', 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.12 fn_list_member_alert_flags — 회원별 활성 플래그
CREATE OR REPLACE FUNCTION public.fn_list_member_alert_flags(p_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data JSONB;
BEGIN
    PERFORM public._p1a_assert_coach_or_admin();
    SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.severity DESC, f.created_at DESC), '[]'::JSONB)
    INTO v_data
    FROM public.member_alert_flags f
    WHERE f.member_id = p_member_id
      AND f.resolved_at IS NULL
      AND (f.ends_at IS NULL OR f.ends_at > now());
    RETURN jsonb_build_object('success', TRUE, 'status', 'ok', 'data', v_data, 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.13 fn_upsert_member_alert_flag
CREATE OR REPLACE FUNCTION public.fn_upsert_member_alert_flag(p_member_id UUID, p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_id UUID;
BEGIN
    v_user_id := public._p1a_assert_coach_or_admin();
    v_id := NULLIF(p_payload->>'id','')::UUID;

    IF v_id IS NULL THEN
        INSERT INTO public.member_alert_flags (
            member_id, flag_type, severity, starts_at, ends_at, note, created_by
        )
        VALUES (
            p_member_id,
            p_payload->>'flag_type',
            COALESCE(p_payload->>'severity','info'),
            COALESCE((p_payload->>'starts_at')::TIMESTAMPTZ, now()),
            (p_payload->>'ends_at')::TIMESTAMPTZ,
            p_payload->>'note',
            v_user_id
        )
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.member_alert_flags SET
            flag_type = COALESCE(p_payload->>'flag_type', flag_type),
            severity = COALESCE(p_payload->>'severity', severity),
            starts_at = COALESCE((p_payload->>'starts_at')::TIMESTAMPTZ, starts_at),
            ends_at = (p_payload->>'ends_at')::TIMESTAMPTZ,
            note = p_payload->>'note',
            resolved_at = CASE WHEN COALESCE((p_payload->>'resolved')::BOOLEAN, FALSE) THEN now() ELSE NULL END,
            resolved_by = CASE WHEN COALESCE((p_payload->>'resolved')::BOOLEAN, FALSE) THEN v_user_id ELSE NULL END,
            updated_at = now()
        WHERE id = v_id AND member_id = p_member_id;
    END IF;

    RETURN jsonb_build_object('success', TRUE, 'status', 'ok', 'data', jsonb_build_object('id', v_id), 'error', NULL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- D.14 fn_get_member_context_panel — 회원 종합 컨텍스트 (Members 화면 + Session Board 양쪽)
CREATE OR REPLACE FUNCTION public.fn_get_member_context_panel(p_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member JSONB;
    v_flags JSONB;
    v_recent_notes JSONB;
    v_attendance JSONB;
    v_membership JSONB;
BEGIN
    PERFORM public._p1a_assert_coach_or_admin();

    SELECT jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'phone', m.phone,
        'birthday', m.birthday,
        'avatar_url', m.avatar_url,
        'created_at', m.created_at,
        'facility_id', m.facility_id
    )
    INTO v_member
    FROM public.members m WHERE m.id = p_member_id;

    IF v_member IS NULL THEN
        RAISE EXCEPTION 'member_not_found';
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.severity DESC, f.created_at DESC), '[]'::JSONB)
    INTO v_flags
    FROM public.member_alert_flags f
    WHERE f.member_id = p_member_id
      AND f.resolved_at IS NULL
      AND (f.ends_at IS NULL OR f.ends_at > now());

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cn.id,
        'note_type', cn.note_type,
        'note', cn.content,
        'created_at', cn.created_at,
        'coach_name', c.name
    ) ORDER BY cn.created_at DESC), '[]'::JSONB)
    INTO v_recent_notes
    FROM public.coaching_notes cn
    LEFT JOIN public.coaches c ON c.id = cn.coach_id
    WHERE cn.member_id = p_member_id
    LIMIT 5;

    SELECT jsonb_build_object(
        'total_checkins', COUNT(*),
        'last_checkin', MAX(c.checkin_time),
        'thirty_day_count', COUNT(*) FILTER (WHERE c.checkin_time > now() - INTERVAL '30 days')
    )
    INTO v_attendance
    FROM public.checkins c
    WHERE c.member_id = p_member_id;

    SELECT jsonb_build_object(
        'plan_name', mp.name,
        'end_date', ms.end_date,
        'days_until_expiry', GREATEST(0, EXTRACT(DAY FROM ms.end_date::TIMESTAMPTZ - now())::INT),
        'status', ms.status
    )
    INTO v_membership
    FROM public.memberships ms
    LEFT JOIN public.membership_plans mp ON mp.id = ms.plan_id
    WHERE ms.member_id = p_member_id
      AND ms.status = 'active'
    ORDER BY ms.end_date DESC
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', TRUE, 'status', 'ok',
        'data', jsonb_build_object(
            'member', v_member,
            'active_flags', v_flags,
            'recent_notes', v_recent_notes,
            'attendance', COALESCE(v_attendance, jsonb_build_object('total_checkins',0,'last_checkin',NULL,'thirty_day_count',0)),
            'active_membership', v_membership
        ),
        'error', NULL
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'status', 'error', 'data', NULL, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- SECTION E. 권한 — REVOKE FROM PUBLIC, GRANT TO authenticated
-- ============================================================
DO $$
DECLARE
    v_fn TEXT;
BEGIN
    FOR v_fn IN VALUES
        ('public.fn_search_wod_movements(text,text,text,int)'),
        ('public.fn_list_wod_templates(text,uuid,text)'),
        ('public.fn_upsert_wod_template(jsonb)'),
        ('public.fn_get_session_wod(uuid)'),
        ('public.fn_upsert_session_wod(uuid,jsonb)'),
        ('public.fn_publish_session_wod(uuid)'),
        ('public.fn_get_class_display_wod(uuid,date,uuid)'),
        ('public.fn_list_runbook_templates(uuid,text)'),
        ('public.fn_upsert_runbook_template(jsonb)'),
        ('public.fn_get_session_runbook(uuid)'),
        ('public.fn_upsert_session_runbook(uuid,jsonb)'),
        ('public.fn_list_member_alert_flags(uuid)'),
        ('public.fn_upsert_member_alert_flag(uuid,jsonb)'),
        ('public.fn_get_member_context_panel(uuid)')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_fn);
    END LOOP;
END $$;

-- ============================================================
-- SECTION F. Seed — movement_library (35종 + benchmark wod_templates 10종)
-- ============================================================

INSERT INTO public.movement_library (slug, name_ko, name_en, category, equipment, difficulty_level, primary_muscles, coaching_points)
VALUES
  -- Weightlifting (8)
  ('clean-and-jerk','클린 앤 저크','Clean & Jerk','weightlifting',ARRAY['barbell'],5,ARRAY['전신','대퇴사두','삼각근','승모근'],'1st pull→catch→jerk 3단계. 바를 몸에 붙여 당기고 elbows high'),
  ('snatch','스내치','Snatch','weightlifting',ARRAY['barbell'],5,ARRAY['전신','광배근','대퇴사두','삼각근'],'광폭 그립, 바를 최대한 몸 가까이. 머리 위 고정 시 어깨 활성화'),
  ('power-clean','파워 클린','Power Clean','weightlifting',ARRAY['barbell'],4,ARRAY['전신','햄스트링','삼각근','승모근'],'스쿼트 없이 수직점프 후 캐치. 엘보우 앞으로 빠르게'),
  ('deadlift','데드리프트','Deadlift','weightlifting',ARRAY['barbell'],2,ARRAY['햄스트링','둔근','척추기립근','광배근'],'중립 척추 유지, 바를 몸 가까이. 발뒤꿈치로 밀어내는 느낌'),
  ('back-squat','백 스쿼트','Back Squat','weightlifting',ARRAY['barbell','rack'],2,ARRAY['대퇴사두','둔근','햄스트링'],'바 위치는 high bar 또는 low bar. 깊이는 평행 이하'),
  ('front-squat','프론트 스쿼트','Front Squat','weightlifting',ARRAY['barbell','rack'],3,ARRAY['대퇴사두','코어','삼각근'],'클린 그립 또는 크로스 그립. 엘보우 높게 유지'),
  ('overhead-squat','오버헤드 스쿼트','Overhead Squat','weightlifting',ARRAY['barbell'],4,ARRAY['전신','삼각근','코어','대퇴사두'],'광폭 그립, 바를 귀 뒤에 위치. 코어와 어깨 안정성 핵심'),
  ('thruster','스러스터','Thruster','weightlifting',ARRAY['barbell','dumbbell'],3,ARRAY['전신','대퇴사두','삼각근'],'프론트 스쿼트 + 푸시 프레스 연속 동작. Fran의 핵심'),
  -- Gymnastics (10)
  ('strict-pull-up','풀업 (스트릭트)','Strict Pull-up','gymnastics',ARRAY['pullup_bar'],3,ARRAY['광배근','이두근','코어'],'데드행에서 턱이 바 위로. 스윙 없이 순수 근력'),
  ('kipping-pull-up','풀업 (키핑)','Kipping Pull-up','gymnastics',ARRAY['pullup_bar'],3,ARRAY['광배근','코어','어깨'],'스윙 모멘텀 활용. hollow→arch→pull. 스트릭트 선행 권장'),
  ('chest-to-bar','체스트 투 바 풀업','Chest-to-Bar Pull-up','gymnastics',ARRAY['pullup_bar'],4,ARRAY['광배근','이두근','코어'],'가슴이 바에 닿아야 유효. 더 높은 풀 요구'),
  ('bar-muscle-up','바 머슬업','Bar Muscle-up','gymnastics',ARRAY['pullup_bar'],5,ARRAY['광배근','삼두근','코어'],'바 위로 몸을 넘기는 전환이 핵심. hips to bar 먼저'),
  ('hspu','핸드스탠드 푸시업','Handstand Push-up','gymnastics',ARRAY['wall'],4,ARRAY['삼각근','삼두근','상부승모근'],'벽에 기대어 물구나무. 헤드 터치 후 완전 락아웃'),
  ('toes-to-bar','토스 투 바','Toes-to-Bar','gymnastics',ARRAY['pullup_bar'],3,ARRAY['복근','고관절굴곡근','광배근'],'발끝이 바에 터치. hollow→arch 사이클 활용'),
  ('air-squat','에어 스쿼트','Air Squat','gymnastics',ARRAY[]::TEXT[],1,ARRAY['대퇴사두','둔근','햄스트링'],'힙이 무릎 아래로. 가슴 올리고 무릎 발 방향'),
  ('box-jump','박스 점프','Box Jump','gymnastics',ARRAY['box'],2,ARRAY['대퇴사두','둔근','종아리'],'두발 착지, 완전히 서서 립오버. 내려올 때 조심'),
  ('burpee','버피','Burpee','gymnastics',ARRAY[]::TEXT[],2,ARRAY['전신'],'플랭크 내려갔다 점프. 손 머리 위에서 박수 또는 클랩'),
  ('push-up','푸시업','Push-up','gymnastics',ARRAY[]::TEXT[],1,ARRAY['가슴','삼두근','삼각근'],'척추 일직선. 가슴이 바닥에 닿고 완전 락아웃'),
  -- Monostructural (5)
  ('row-cardio','로잉','Row','monostructural',ARRAY['rower'],1,ARRAY['전신'],'드라이브 → 피니시 → 리커버리. 다리 중심 파워'),
  ('assault-bike','어썰트 바이크','Assault Bike','monostructural',ARRAY['assault_bike'],1,ARRAY['전신'],'페달과 핸들 동시 구동. 호흡 컨트롤'),
  ('run-400','400m Run','400m Run','monostructural',ARRAY[]::TEXT[],1,ARRAY['하체'],'페이스 유지. WOD 시 회복 시간 고려'),
  ('double-under','더블언더','Double-under','monostructural',ARRAY['jump_rope'],3,ARRAY['종아리','코어'],'손목 회전 빠르게. 점프 높이는 낮게'),
  ('ski-erg','스키 에르그','Ski Erg','monostructural',ARRAY['ski_erg'],2,ARRAY['전신','광배근','코어'],'더블 폴 동작. 힙 힌지 활용'),
  -- Dumbbell (3)
  ('db-snatch','덤벨 스내치','Dumbbell Snatch','dumbbell',ARRAY['dumbbell'],3,ARRAY['전신','어깨','코어'],'한 손씩 교대. 풀 후 락아웃'),
  ('db-thruster','덤벨 스러스터','Dumbbell Thruster','dumbbell',ARRAY['dumbbell'],3,ARRAY['전신'],'양손 덤벨로 프론트 스쿼트 + 프레스'),
  ('db-clean','덤벨 클린','Dumbbell Clean','dumbbell',ARRAY['dumbbell'],3,ARRAY['전신','승모근'],'바벨 클린과 동일 메커니즘'),
  -- Kettlebell (3)
  ('kb-swing','케틀벨 스윙','Kettlebell Swing','kettlebell',ARRAY['kettlebell'],2,ARRAY['둔근','햄스트링','코어'],'힙 힌지 중심. American/Russian 구분'),
  ('kb-clean','케틀벨 클린','Kettlebell Clean','kettlebell',ARRAY['kettlebell'],3,ARRAY['전신'],'랙 포지션까지. 손목 충격 최소화'),
  ('kb-snatch','케틀벨 스내치','Kettlebell Snatch','kettlebell',ARRAY['kettlebell'],4,ARRAY['전신','어깨'],'한 손으로 머리 위까지. 손목 위치 주의'),
  -- Med Ball (2)
  ('wall-ball','월볼','Wall Ball','medball',ARRAY['med_ball','wall'],2,ARRAY['전신','대퇴사두','삼각근'],'스쿼트 + 던지기. 타겟 위치 일정'),
  ('med-ball-cleans','메드볼 클린','Med Ball Clean','medball',ARRAY['med_ball'],2,ARRAY['전신'],'바벨 클린과 유사. 안전한 도입 동작'),
  -- Other Equipment (2)
  ('rope-climb','로프 클라임','Rope Climb','other_equipment',ARRAY['rope'],3,ARRAY['광배근','이두근','코어'],'J-hook 또는 S-wrap 발 기술. 팔보다 다리 활용'),
  ('sled-push','슬레드 푸시','Sled Push','other_equipment',ARRAY['sled'],2,ARRAY['하체','코어'],'낮은 자세로 추진. 작은 스텝'),
  -- Accessory (2)
  ('plank','플랭크','Plank','accessory',ARRAY[]::TEXT[],1,ARRAY['코어'],'척추 중립. 시간 또는 자세'),
  ('hollow-hold','할로우 홀드','Hollow Hold','accessory',ARRAY[]::TEXT[],2,ARRAY['코어'],'허리 바닥 밀착. 다리/상체 동시 들기')
ON CONFLICT (slug) DO NOTHING;

-- Benchmark WOD templates 10종 (글로벌 공유 — facility_id NULL, is_shared=TRUE, is_benchmark=TRUE)
DO $$
DECLARE
    v_template_id UUID;
    v_thruster_id UUID;
    v_pullup_id UUID;
    v_cnj_id UUID;
    v_run_id UUID;
    v_kb_id UUID;
    v_air_squat_id UUID;
    v_pushup_id UUID;
    v_dl_id UUID;
    v_hspu_id UUID;
    v_dub_id UUID;
    v_situp_id UUID;
    v_wallball_id UUID;
    v_ohs_id UUID;
    v_snatch_id UUID;
BEGIN
    SELECT id INTO v_thruster_id FROM public.movement_library WHERE slug = 'thruster';
    SELECT id INTO v_pullup_id FROM public.movement_library WHERE slug = 'kipping-pull-up';
    SELECT id INTO v_cnj_id FROM public.movement_library WHERE slug = 'clean-and-jerk';
    SELECT id INTO v_run_id FROM public.movement_library WHERE slug = 'run-400';
    SELECT id INTO v_kb_id FROM public.movement_library WHERE slug = 'kb-swing';
    SELECT id INTO v_air_squat_id FROM public.movement_library WHERE slug = 'air-squat';
    SELECT id INTO v_pushup_id FROM public.movement_library WHERE slug = 'push-up';
    SELECT id INTO v_dl_id FROM public.movement_library WHERE slug = 'deadlift';
    SELECT id INTO v_hspu_id FROM public.movement_library WHERE slug = 'hspu';
    SELECT id INTO v_dub_id FROM public.movement_library WHERE slug = 'double-under';
    SELECT id INTO v_wallball_id FROM public.movement_library WHERE slug = 'wall-ball';
    SELECT id INTO v_ohs_id FROM public.movement_library WHERE slug = 'overhead-squat';
    SELECT id INTO v_snatch_id FROM public.movement_library WHERE slug = 'snatch';

    -- Fran (21-15-9 thruster + pull-up)
    INSERT INTO public.wod_templates (template_kind, title, format_type, description, is_shared, is_benchmark, published_at)
    VALUES ('benchmark','Fran','for_time','Thruster + Pull-up 21-15-9 reps',TRUE,TRUE,now())
    RETURNING id INTO v_template_id;
    INSERT INTO public.wod_template_movements (wod_template_id, sort_order, movement_id, target_value, target_unit, load_male_rx, load_female_rx)
    VALUES
      (v_template_id, 0, v_thruster_id, 21, 'reps', '43kg', '29kg'),
      (v_template_id, 1, v_pullup_id, 21, 'reps', NULL, NULL),
      (v_template_id, 2, v_thruster_id, 15, 'reps', '43kg', '29kg'),
      (v_template_id, 3, v_pullup_id, 15, 'reps', NULL, NULL),
      (v_template_id, 4, v_thruster_id, 9, 'reps', '43kg', '29kg'),
      (v_template_id, 5, v_pullup_id, 9, 'reps', NULL, NULL);

    -- Grace (30 Clean & Jerk)
    INSERT INTO public.wod_templates (template_kind, title, format_type, description, is_shared, is_benchmark, published_at)
    VALUES ('benchmark','Grace','for_time','Clean & Jerk 30 reps',TRUE,TRUE,now())
    RETURNING id INTO v_template_id;
    INSERT INTO public.wod_template_movements (wod_template_id, sort_order, movement_id, target_value, target_unit, load_male_rx, load_female_rx)
    VALUES (v_template_id, 0, v_cnj_id, 30, 'reps', '61kg', '43kg');

    -- Helen (3 RFT: 400m run + 21 KBS + 12 PU)
    INSERT INTO public.wod_templates (template_kind, title, format_type, rounds, description, is_shared, is_benchmark, published_at)
    VALUES ('benchmark','Helen','for_time',3,'3 Rounds: 400m Run + 21 KB Swing + 12 Pull-up',TRUE,TRUE,now())
    RETURNING id INTO v_template_id;
    INSERT INTO public.wod_template_movements (wod_template_id, sort_order, movement_id, target_value, target_unit, distance_meters, load_male_rx, load_female_rx)
    VALUES
      (v_template_id, 0, v_run_id, NULL, 'meters', 400, NULL, NULL),
      (v_template_id, 1, v_kb_id, 21, 'reps', NULL, '24kg', '16kg'),
      (v_template_id, 2, v_pullup_id, 12, 'reps', NULL, NULL, NULL);

    -- Cindy (AMRAP 20: 5 PU + 10 PUSH + 15 SQ)
    INSERT INTO public.wod_templates (template_kind, title, format_type, time_cap_minutes, description, is_shared, is_benchmark, published_at)
    VALUES ('benchmark','Cindy','amrap',20,'AMRAP 20: 5 Pull-up + 10 Push-up + 15 Air Squat',TRUE,TRUE,now())
    RETURNING id INTO v_template_id;
    INSERT INTO public.wod_template_movements (wod_template_id, sort_order, movement_id, target_value, target_unit)
    VALUES
      (v_template_id, 0, v_pullup_id, 5, 'reps'),
      (v_template_id, 1, v_pushup_id, 10, 'reps'),
      (v_template_id, 2, v_air_squat_id, 15, 'reps');

    -- Diane (21-15-9 Deadlift + HSPU)
    INSERT INTO public.wod_templates (template_kind, title, format_type, description, is_shared, is_benchmark, published_at)
    VALUES ('benchmark','Diane','for_time','Deadlift + HSPU 21-15-9 reps',TRUE,TRUE,now())
    RETURNING id INTO v_template_id;
    INSERT INTO public.wod_template_movements (wod_template_id, sort_order, movement_id, target_value, target_unit, load_male_rx, load_female_rx)
    VALUES
      (v_template_id, 0, v_dl_id, 21, 'reps', '102kg', '70kg'),
      (v_template_id, 1, v_hspu_id, 21, 'reps', NULL, NULL),
      (v_template_id, 2, v_dl_id, 15, 'reps', '102kg', '70kg'),
      (v_template_id, 3, v_hspu_id, 15, 'reps', NULL, NULL),
      (v_template_id, 4, v_dl_id, 9, 'reps', '102kg', '70kg'),
      (v_template_id, 5, v_hspu_id, 9, 'reps', NULL, NULL);

    -- Annie (50-40-30-20-10 DU + Sit-up) — note: sit-up not yet in library, use custom_label
    INSERT INTO public.wod_templates (template_kind, title, format_type, description, is_shared, is_benchmark, published_at)
    VALUES ('benchmark','Annie','for_time','Double-under + Sit-up 50-40-30-20-10',TRUE,TRUE,now())
    RETURNING id INTO v_template_id;
    INSERT INTO public.wod_template_movements (wod_template_id, sort_order, movement_id, custom_label, target_value, target_unit)
    VALUES
      (v_template_id, 0, v_dub_id, NULL, 50, 'reps'),
      (v_template_id, 1, NULL, 'Sit-up', 50, 'reps'),
      (v_template_id, 2, v_dub_id, NULL, 40, 'reps'),
      (v_template_id, 3, NULL, 'Sit-up', 40, 'reps'),
      (v_template_id, 4, v_dub_id, NULL, 30, 'reps'),
      (v_template_id, 5, NULL, 'Sit-up', 30, 'reps'),
      (v_template_id, 6, v_dub_id, NULL, 20, 'reps'),
      (v_template_id, 7, NULL, 'Sit-up', 20, 'reps'),
      (v_template_id, 8, v_dub_id, NULL, 10, 'reps'),
      (v_template_id, 9, NULL, 'Sit-up', 10, 'reps');

    -- Karen (150 Wall Ball)
    INSERT INTO public.wod_templates (template_kind, title, format_type, description, is_shared, is_benchmark, published_at)
    VALUES ('benchmark','Karen','for_time','Wall Ball 150 reps',TRUE,TRUE,now())
    RETURNING id INTO v_template_id;
    INSERT INTO public.wod_template_movements (wod_template_id, sort_order, movement_id, target_value, target_unit, load_male_rx, load_female_rx)
    VALUES (v_template_id, 0, v_wallball_id, 150, 'reps', '9kg', '6kg');

    -- Nancy (5 RFT: 400m run + 15 OHS)
    INSERT INTO public.wod_templates (template_kind, title, format_type, rounds, description, is_shared, is_benchmark, published_at)
    VALUES ('benchmark','Nancy','for_time',5,'5 Rounds: 400m Run + 15 OHS',TRUE,TRUE,now())
    RETURNING id INTO v_template_id;
    INSERT INTO public.wod_template_movements (wod_template_id, sort_order, movement_id, target_value, target_unit, distance_meters, load_male_rx, load_female_rx)
    VALUES
      (v_template_id, 0, v_run_id, NULL, 'meters', 400, NULL, NULL),
      (v_template_id, 1, v_ohs_id, 15, 'reps', NULL, '43kg', '29kg');

    -- Isabel (30 Snatch)
    INSERT INTO public.wod_templates (template_kind, title, format_type, description, is_shared, is_benchmark, published_at)
    VALUES ('benchmark','Isabel','for_time','Snatch 30 reps',TRUE,TRUE,now())
    RETURNING id INTO v_template_id;
    INSERT INTO public.wod_template_movements (wod_template_id, sort_order, movement_id, target_value, target_unit, load_male_rx, load_female_rx)
    VALUES (v_template_id, 0, v_snatch_id, 30, 'reps', '61kg', '43kg');

    -- Barbara (5 RFT: 20 PU + 30 PUSH + 40 SU + 50 SQ, 3min rest)
    INSERT INTO public.wod_templates (template_kind, title, format_type, rounds, description, public_notes, is_shared, is_benchmark, published_at)
    VALUES ('benchmark','Barbara','for_time',5,'5 Rounds: 20 PU + 30 Push-up + 40 Sit-up + 50 Air Squat (3min rest between rounds)','라운드 사이 3분 휴식', TRUE, TRUE, now())
    RETURNING id INTO v_template_id;
    INSERT INTO public.wod_template_movements (wod_template_id, sort_order, movement_id, custom_label, target_value, target_unit)
    VALUES
      (v_template_id, 0, v_pullup_id, NULL, 20, 'reps'),
      (v_template_id, 1, v_pushup_id, NULL, 30, 'reps'),
      (v_template_id, 2, NULL, 'Sit-up', 40, 'reps'),
      (v_template_id, 3, v_air_squat_id, NULL, 50, 'reps');
END $$;

-- ============================================================
-- SECTION G. 호환성 — sessions.wod_description deprecation 메모
-- ============================================================
COMMENT ON COLUMN public.sessions.wod_description IS
    'DEPRECATED (Priority 23 P1-A): session_wods 테이블로 이전 예정. session_wods.description_override 또는 movements_snapshot 사용. 호환 레이어 유지 단계.';

-- DEPRECATED 메모: wods 테이블이 저장소에 존재할 경우에만 comment 적용 (감사 지적 2.2 수정)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wods') THEN
        COMMENT ON TABLE public.wods IS
            'DEPRECATED (Priority 23 P1-A): /class/wod 화면이 fn_get_class_display_wod()로 전환되면 단계적으로 제거. 신규 코드는 session_wods 사용.';
    END IF;
END $$;

-- ============================================================
-- 마이그레이션 완료
-- ============================================================
