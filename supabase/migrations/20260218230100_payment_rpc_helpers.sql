-- Phase 1 Helper: PG Settings Encryption RPC
-- Description: pgp_sym_encrypt를 이용한 시크릿 키 암복호화 함수

BEGIN;

-- pg_settings 저장 및 암호화 RPC
CREATE OR REPLACE FUNCTION public.save_pg_settings(
  p_facility_id uuid,
  p_test_secret_key text,
  p_live_secret_key text,
  p_webhook_secret text,
  p_encryption_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.pg_settings (
    facility_id,
    test_secret_key_encrypted,
    live_secret_key_encrypted,
    webhook_secret_encrypted,
    updated_at
  )
  VALUES (
    p_facility_id,
    CASE WHEN p_test_secret_key IS NOT NULL THEN pgp_sym_encrypt(p_test_secret_key, p_encryption_key) ELSE NULL END,
    CASE WHEN p_live_secret_key IS NOT NULL THEN pgp_sym_encrypt(p_live_secret_key, p_encryption_key) ELSE NULL END,
    CASE WHEN p_webhook_secret IS NOT NULL THEN pgp_sym_encrypt(p_webhook_secret, p_encryption_key) ELSE NULL END,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    test_secret_key_encrypted = EXCLUDED.test_secret_key_encrypted,
    live_secret_key_encrypted = EXCLUDED.live_secret_key_encrypted,
    webhook_secret_encrypted = EXCLUDED.webhook_secret_encrypted,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- pg_settings 복호화 (내부용, SECURITY DEFINER)
-- 주의: 이 함수는 외부에서 직접 호출되지 않도록 RLS 또는 권한 체크 필수
CREATE OR REPLACE FUNCTION public.get_decrypted_pg_settings(
  p_facility_id uuid,
  p_encryption_key text
)
RETURNS TABLE (
  test_secret_key text,
  live_secret_key text,
  webhook_secret text,
  payment_mode text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pgp_sym_decrypt(test_secret_key_encrypted::bytea, p_encryption_key) as test_secret_key,
    pgp_sym_decrypt(live_secret_key_encrypted::bytea, p_encryption_key) as live_secret_key,
    pgp_sym_decrypt(webhook_secret_encrypted::bytea, p_encryption_key) as webhook_secret,
    pg_settings.payment_mode
  FROM public.pg_settings
  WHERE facility_id = p_facility_id AND is_active = true
  LIMIT 1;
END;
$$;

COMMIT;
