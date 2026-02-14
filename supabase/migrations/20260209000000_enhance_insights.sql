-- Create session_feedback table
CREATE TABLE IF NOT EXISTS public.session_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for session_feedback
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for session_feedback
-- Admins can read all feedback
CREATE POLICY "Admins can view all feedback" ON public.session_feedback
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Coaches can read feedback for their sessions (Simplified: Coaches can read all for now, or refine later)
CREATE POLICY "Coaches can view feedback" ON public.session_feedback
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'coach'
        )
    );

-- Members can create feedback for themselves
CREATE POLICY "Members can create feedback" ON public.session_feedback
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Basic check: member_id must link to the user's member record
        -- Complex check: User must be enrolled and attended session (Skipping for now to keep it simple)
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.id = session_feedback.member_id AND members.user_id = auth.uid()
        )
    );

-- Add category to transactions if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'category') THEN
        ALTER TABLE public.transactions ADD COLUMN category TEXT DEFAULT 'Membership';
    END IF;
END $$;
