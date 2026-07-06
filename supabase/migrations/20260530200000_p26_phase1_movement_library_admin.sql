-- ============================================================
-- Priority 26 Phase 1: Movement Library Admin DB Migration
-- ------------------------------------------------------------
-- [백필 노트] 본 파일은 2026-05-30 Supabase MCP(apply_migration,
-- remote version 20260530115016)로 운영 DB에 이미 적용된 SQL의
-- 버전 관리용 백필 기록입니다. 원격 재적용 불필요.
-- 적용 가이드: .docs/database/migrations/20260530_p26_phase1_movement_library_admin.md
-- ============================================================

-- 1. movement_categories 테이블 생성
CREATE TABLE IF NOT EXISTS public.movement_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       VARCHAR NOT NULL UNIQUE,
  name_ko    VARCHAR NOT NULL,
  name_en    VARCHAR NOT NULL,
  color      VARCHAR,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.movement_categories IS '운동 카테고리 마스터 테이블 (Priority 26)';

-- 2. 기존 8개 카테고리 데이터 이관
INSERT INTO public.movement_categories (slug, name_ko, name_en, color, sort_order) VALUES
  ('weightlifting',    '바벨',       'Weightlifting',    '#f87171', 1),
  ('gymnastics',       '체조',       'Gymnastics',       '#4ade80', 2),
  ('monostructural',   '카디오',     'Cardio',           '#22d3ee', 3),
  ('dumbbell',         '덤벨',       'Dumbbell',         '#c084fc', 4),
  ('kettlebell',       '케틀벨',     'Kettlebell',       '#f472b6', 5),
  ('medball',          '메드볼',     'Medball',          '#fbbf24', 6),
  ('other_equipment',  '기타 기구',  'Other Equipment',  '#2dd4bf', 7),
  ('accessory',        '보조 운동',  'Accessory',        '#818cf8', 8)
ON CONFLICT (slug) DO NOTHING;

-- 3. movement_library에 미디어 컬럼 추가
ALTER TABLE public.movement_library
  ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR,
  ADD COLUMN IF NOT EXISTS video_url     VARCHAR;

COMMENT ON COLUMN public.movement_library.thumbnail_url IS '운동 썸네일 이미지 URL (Supabase Storage)';
COMMENT ON COLUMN public.movement_library.video_url     IS '시범 영상 URL (YouTube or Supabase Storage)';

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_movement_categories_slug      ON public.movement_categories (slug);
CREATE INDEX IF NOT EXISTS idx_movement_categories_sort      ON public.movement_categories (sort_order);
CREATE INDEX IF NOT EXISTS idx_movement_library_category     ON public.movement_library (category);
CREATE INDEX IF NOT EXISTS idx_movement_library_is_active    ON public.movement_library (is_active);
CREATE INDEX IF NOT EXISTS idx_movement_library_slug         ON public.movement_library (slug);

-- 5. movement_categories RLS
ALTER TABLE public.movement_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movement_categories_read_all"
  ON public.movement_categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "movement_categories_admin_coach_write"
  ON public.movement_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'coach')
    )
  );

-- 6. movement_library RLS 추가 (기존 정책에 INSERT/UPDATE/DELETE 추가)
-- 기존 테이블이므로 기존 정책과 충돌 방지를 위해 명칭 구분
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'movement_library'
      AND policyname = 'movement_library_admin_coach_write'
  ) THEN
    CREATE POLICY "movement_library_admin_coach_write"
      ON public.movement_library FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'coach')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'coach')
        )
      );
  END IF;
END;
$$;

-- 7. RPC: fn_list_movement_library
CREATE OR REPLACE FUNCTION public.fn_list_movement_library(
  p_query        TEXT    DEFAULT NULL,
  p_category     TEXT    DEFAULT NULL,
  p_is_active    BOOLEAN DEFAULT NULL,
  p_limit        INTEGER DEFAULT 100,
  p_offset       INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'success', true,
    'data', COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb),
    'total', COUNT(*) OVER()
  ) INTO v_result
  FROM (
    SELECT
      ml.id,
      ml.slug,
      ml.name_ko,
      ml.name_en,
      ml.category,
      ml.equipment,
      ml.difficulty_level,
      ml.primary_muscles,
      ml.coaching_points,
      ml.source_tag,
      ml.is_active,
      ml.thumbnail_url,
      ml.video_url,
      ml.created_at,
      ml.updated_at,
      -- WOD 사용 수
      COALESCE((
        SELECT COUNT(*)
        FROM public.wod_template_movements wtm
        WHERE wtm.movement_id = ml.id
      ), 0)::INTEGER AS wod_usage_count,
      -- 카테고리 정보
      mc.name_ko AS category_name_ko,
      mc.name_en AS category_name_en,
      mc.color   AS category_color
    FROM public.movement_library ml
    LEFT JOIN public.movement_categories mc ON mc.slug = ml.category
    WHERE
      (p_is_active IS NULL OR ml.is_active = p_is_active)
      AND (p_category IS NULL OR ml.category = p_category)
      AND (
        p_query IS NULL
        OR ml.slug      ILIKE '%' || p_query || '%'
        OR ml.name_ko   ILIKE '%' || p_query || '%'
        OR ml.name_en   ILIKE '%' || p_query || '%'
      )
    ORDER BY mc.sort_order NULLS LAST, ml.name_ko
    LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN COALESCE(v_result, jsonb_build_object('success', true, 'data', '[]'::jsonb, 'total', 0));
END;
$$;

REVOKE ALL ON FUNCTION public.fn_list_movement_library(TEXT, TEXT, BOOLEAN, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_list_movement_library(TEXT, TEXT, BOOLEAN, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.fn_list_movement_library IS 'Priority 26: 운동 라이브러리 목록 조회 (필터/검색/WOD 사용 수 포함)';
