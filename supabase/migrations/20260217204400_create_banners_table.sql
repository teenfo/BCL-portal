-- =============================================
-- Migration: Banners 테이블 생성
-- =============================================

CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    position TEXT CHECK (position IN ('홈 상단', '홈 중단', '홈 하단', '팝업', '이벤트')),
    priority_order INTEGER DEFAULT 0,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.banners IS '배너 관리 테이블';

CREATE INDEX idx_banners_position ON public.banners(position);
CREATE INDEX idx_banners_active ON public.banners(is_active);
CREATE INDEX idx_banners_dates ON public.banners(start_date, end_date);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read banners" ON public.banners
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin manage banners" ON public.banners
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
