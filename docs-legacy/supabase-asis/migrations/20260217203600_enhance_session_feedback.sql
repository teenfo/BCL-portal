-- =============================================
-- Migration: Enhance session_feedback table
-- 기존 테이블에 coach_id, admin_response 등 누락 컬럼 추가
-- =============================================

-- coach_id 컬럼 추가
ALTER TABLE public.session_feedback 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.coaches(id);

-- 관리자/코치 답변
ALTER TABLE public.session_feedback 
ADD COLUMN IF NOT EXISTS admin_response TEXT;

-- 답변 작성자
ALTER TABLE public.session_feedback 
ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES auth.users(id);

-- 답변 시간
ALTER TABLE public.session_feedback 
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- updated_at
ALTER TABLE public.session_feedback 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_feedback_session ON public.session_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_member ON public.session_feedback(member_id);
CREATE INDEX IF NOT EXISTS idx_feedback_coach ON public.session_feedback(coach_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON public.session_feedback(rating);

-- 코멘트
COMMENT ON TABLE public.session_feedback IS '수업 피드백 테이블';
COMMENT ON COLUMN public.session_feedback.rating IS '별점 (1-5)';
COMMENT ON COLUMN public.session_feedback.admin_response IS '관리자/코치 답변';
COMMENT ON COLUMN public.session_feedback.responded_by IS '답변 작성자 user_id';
