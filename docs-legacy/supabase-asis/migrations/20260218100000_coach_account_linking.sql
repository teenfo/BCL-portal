-- ============================================================
-- Migration: coach_account_linking
-- Purpose: 코치 계정 아키텍처 강화 - Priority 6
-- Author: Senior Dev (Opus)
-- Date: 2026-02-18
-- ============================================================

-- 1. coaches 테이블 확장: 누락된 컬럼 추가
ALTER TABLE public.coaches 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.coaches 
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.coaches 
  ADD COLUMN IF NOT EXISTS specialties TEXT[];

ALTER TABLE public.coaches 
  ADD COLUMN IF NOT EXISTS bio TEXT;

ALTER TABLE public.coaches 
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

ALTER TABLE public.coaches 
  ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ;

ALTER TABLE public.coaches 
  ADD COLUMN IF NOT EXISTS linked_by UUID;

-- 2. user_id UNIQUE 제약 추가
ALTER TABLE public.coaches 
  ADD CONSTRAINT coaches_user_id_unique UNIQUE (user_id);

-- 3. 인덱스 최적화
CREATE INDEX IF NOT EXISTS idx_coaches_user_id ON public.coaches(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coaches_status ON public.coaches(status);

-- 4. RLS 정책: 코치 본인 프로필 수정 허용
CREATE POLICY "coach_update_own_record"
  ON public.coaches FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. promote_to_coach 함수
CREATE OR REPLACE FUNCTION public.promote_to_coach(
  target_user_id UUID,
  admin_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = admin_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can promote users';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE id = target_user_id AND role = 'coach'
  ) THEN
    RAISE EXCEPTION 'User is already a coach';
  END IF;

  UPDATE public.profiles SET role = 'coach', updated_at = now() WHERE id = target_user_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, new_values)
  VALUES (admin_user_id, 'PROMOTE_TO_COACH', 'profiles',
    jsonb_build_object('target_user_id', target_user_id, 'new_role', 'coach'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. demote_from_coach 함수
CREATE OR REPLACE FUNCTION public.demote_from_coach(
  target_user_id UUID,
  admin_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = admin_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can demote coaches';
  END IF;

  UPDATE public.profiles SET role = 'member', updated_at = now() WHERE id = target_user_id;
  UPDATE public.coaches SET status = 'Inactive' WHERE user_id = target_user_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, new_values)
  VALUES (admin_user_id, 'DEMOTE_FROM_COACH', 'profiles',
    jsonb_build_object('target_user_id', target_user_id, 'new_role', 'member'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
