-- Phase 1: 결제 시스템 인프라 구축 (DB Schema)
-- Description: transactions 확장, pg_settings 및 refunds 테이블 생성, RLS 설정

BEGIN;

-- 1. transactions 테이블 확장
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES public.facilities(id),
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.membership_plans(id),
  ADD COLUMN IF NOT EXISTS order_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_key text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS toss_status text,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_amount numeric,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS toss_raw_data jsonb DEFAULT '{}'::jsonb;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON public.transactions(member_id);

-- 2. pg_settings 테이블 생성
CREATE TABLE IF NOT EXISTS public.pg_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'toss',
  
  -- 테스트 키
  test_client_key text DEFAULT 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm',
  test_secret_key_encrypted text,
  
  -- 라이브 키
  live_client_key text,
  live_secret_key_encrypted text,
  
  -- 공통
  webhook_secret_encrypted text,
  pos_api_key_encrypted text,
  
  -- 설정
  payment_mode text DEFAULT 'simulation' CHECK (payment_mode IN ('simulation', 'live')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- pg_settings RLS
ALTER TABLE public.pg_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage pg_settings') THEN
        CREATE POLICY "Admins can manage pg_settings"
          ON public.pg_settings
          FOR ALL
          TO authenticated
          USING (is_admin());
    END IF;
END $$;

-- 3. refunds 테이블 생성
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text REFERENCES public.transactions(id),
  amount numeric NOT NULL,
  reason text NOT NULL,
  penalty_amount numeric DEFAULT 0,
  refund_method text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  processed_by uuid REFERENCES auth.users(id),
  toss_cancel_key text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- refunds RLS
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage refunds') THEN
        CREATE POLICY "Admins can manage refunds"
          ON public.refunds
          FOR ALL
          TO authenticated
          USING (is_admin());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own refunds') THEN
        CREATE POLICY "Users can view own refunds"
          ON public.refunds
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.transactions t
              WHERE t.id = public.refunds.transaction_id 
              AND t.member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
            )
          );
    END IF;
END $$;

COMMIT;
