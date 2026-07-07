-- =============================================
-- Migration: Membership History
-- =============================================

CREATE TABLE IF NOT EXISTS public.membership_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID REFERENCES public.memberships(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('created', 'extended', 'paused', 'resumed', 'credit_adjusted', 'transferred', 'cancelled')),
    changed_by UUID REFERENCES auth.users(id),
    old_values JSONB,
    new_values JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.membership_history IS '멤버십 변경 이력 테이블';
COMMENT ON COLUMN public.membership_history.action_type IS '액션 타입: created, extended, paused, resumed, credit_adjusted, transferred, cancelled';
COMMENT ON COLUMN public.membership_history.old_values IS '변경 전 값 (JSON)';
COMMENT ON COLUMN public.membership_history.new_values IS '변경 후 값 (JSON)';

-- 인덱스
CREATE INDEX idx_membership_history_membership ON public.membership_history(membership_id);
CREATE INDEX idx_membership_history_created ON public.membership_history(created_at);
CREATE INDEX idx_membership_history_action ON public.membership_history(action_type);

-- RLS 활성화
ALTER TABLE public.membership_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read membership_history" ON public.membership_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin manage membership_history" ON public.membership_history
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
