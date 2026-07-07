-- ============================================================
-- Migration: p26_movement_category_fk
-- Purpose: movement_library.category 검증을 하드코딩 CHECK → movement_categories FK로 전환
-- 배경: Priority 26에서 카테고리가 movement_categories 테이블로 동적화됐으나
--   P1-A 시절의 CHECK 제약(8개 슬러그 고정)이 남아 있어, Admin UI에서 새 카테고리를
--   추가해도 해당 카테고리로 운동을 저장하면 제약 위반이 발생하는 결함 수정.
-- Date: 2026-07-05
-- ============================================================

-- 1. 기존 하드코딩 CHECK 제거
ALTER TABLE public.movement_library
    DROP CONSTRAINT IF EXISTS movement_library_category_check;

-- 2. movement_categories.slug FK로 대체 (신규 카테고리 자동 허용,
--    운동이 사용 중인 카테고리 삭제는 차단)
ALTER TABLE public.movement_library
    ADD CONSTRAINT movement_library_category_fkey
    FOREIGN KEY (category) REFERENCES public.movement_categories(slug)
    ON UPDATE CASCADE ON DELETE RESTRICT;

COMMENT ON COLUMN public.movement_library.category IS '운동 카테고리 slug (movement_categories.slug FK — P26 동적 카테고리)';
