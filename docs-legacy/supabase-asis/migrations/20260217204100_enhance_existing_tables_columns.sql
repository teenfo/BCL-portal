-- =============================================
-- Migration: 기존 테이블 누락 컬럼 추가
-- notices, membership_plans, memberships, facilities, members
-- =============================================

-- ─── 1. notices 테이블 ───────────────────────
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
DO $$ BEGIN
  ALTER TABLE public.notices ADD CONSTRAINT notices_priority_check 
    CHECK (priority IN ('urgent', 'high', 'normal', 'low'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON COLUMN public.notices.priority IS '우선순위: urgent, high, normal, low';

ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
COMMENT ON COLUMN public.notices.is_published IS '게시 여부';

-- 기존 데이터 정규화
UPDATE public.notices SET category = lower(category) WHERE category <> lower(category);
UPDATE public.notices SET category = 'general' WHERE category NOT IN ('general', 'schedule', 'event', 'maintenance', 'emergency');

ALTER TABLE public.notices DROP CONSTRAINT IF EXISTS notices_category_check;
ALTER TABLE public.notices ADD CONSTRAINT notices_category_check 
  CHECK (category IN ('general', 'schedule', 'event', 'maintenance', 'emergency'));


-- ─── 2. membership_plans 테이블 ──────────────
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS refund_policy JSONB DEFAULT '{}';
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS max_pauses INT DEFAULT 0;
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS facility_sharing BOOLEAN DEFAULT false;
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2);

COMMENT ON COLUMN public.membership_plans.refund_policy IS '환급 규정 (JSON): {"within_7days": 1.0, "within_30days": 0.5}';
COMMENT ON COLUMN public.membership_plans.max_pauses IS '홀딩(일시정지) 가능 횟수';
COMMENT ON COLUMN public.membership_plans.facility_sharing IS '지점 공유 사용 가능 여부';
COMMENT ON COLUMN public.membership_plans.discount_price IS '할인가';


-- ─── 3. memberships 테이블 ───────────────────
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS pause_count INT DEFAULT 0;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS pause_reason TEXT;

COMMENT ON COLUMN public.memberships.pause_count IS '홀딩 사용 횟수';
COMMENT ON COLUMN public.memberships.paused_at IS '일시정지 시작 시간';
COMMENT ON COLUMN public.memberships.pause_reason IS '일시정지 사유';


-- ─── 4. facilities 테이블 ────────────────────
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS images TEXT[];
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS terms_of_service TEXT;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS privacy_policy TEXT;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS refund_policy TEXT;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN public.facilities.latitude IS '위도';
COMMENT ON COLUMN public.facilities.longitude IS '경도';
COMMENT ON COLUMN public.facilities.images IS '센터 이미지 URL 배열';


-- ─── 5. members 테이블 ──────────────────────
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS counseling_notes TEXT;

COMMENT ON COLUMN public.members.is_blacklisted IS '블랙리스트 여부';
COMMENT ON COLUMN public.members.blacklist_reason IS '블랙리스트 사유';
COMMENT ON COLUMN public.members.counseling_notes IS '상담 로그';
