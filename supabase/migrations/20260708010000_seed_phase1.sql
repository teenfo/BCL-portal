-- ============================================================================
-- BCL Portal Phase 1 — 10_seed_phase1.sql
-- ----------------------------------------------------------------------------
-- 목적   : 초기 운영/E2E 시드 — 시설 1건 + 계정 4종
--          admin@bcl.com / coach@bcl.com / member@bcl.com (approved)
--          pending@bcl.com (승인 게이트 E2E 시나리오 S4용 — 트리거 기본값 유지)
-- 의존   : 00~09 전부 (01_core의 handle_new_auth_user 트리거가 profiles/members 자동 생성)
-- 원칙   : 멱등 (재실행 안전). 비밀번호는 개발용 '0000' — 운영 전 교체 필수
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 시설: BCL (멱등)
-- ----------------------------------------------------------------------------
INSERT INTO public.facilities (name)
SELECT 'BCL'
WHERE NOT EXISTS (SELECT 1 FROM public.facilities WHERE name = 'BCL');

-- ----------------------------------------------------------------------------
-- 2. 시드 계정 4종 — auth.users + auth.identities 쌍 INSERT (멱등)
--    01_core의 trg_on_auth_user_created가 profiles(pending)/members를 자동 생성
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_email TEXT;
    v_user_id UUID;
BEGIN
    FOREACH v_email IN ARRAY ARRAY[
        'admin@bcl.com', 'coach@bcl.com', 'member@bcl.com', 'pending@bcl.com'
    ] LOOP
        SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

        IF v_user_id IS NULL THEN
            v_user_id := gen_random_uuid();

            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                created_at, updated_at,
                confirmation_token, recovery_token,
                email_change, email_change_token_new, email_change_token_current
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                v_user_id, 'authenticated', 'authenticated',
                v_email, crypt('0000', gen_salt('bf')),
                now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
                now(), now(),
                '', '', '', '', ''
            );

            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id,
                last_sign_in_at, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), v_user_id,
                jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
                'email', v_user_id::text,
                now(), now(), now()
            );
        END IF;
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. 역할/승인 상태 (pending@bcl.com은 트리거 기본값 유지 — role=member, pending)
-- ----------------------------------------------------------------------------
UPDATE public.profiles
   SET role = 'admin', approval_status = 'approved', approved_at = COALESCE(approved_at, now())
 WHERE email = 'admin@bcl.com'
   AND (role <> 'admin' OR approval_status <> 'approved');

UPDATE public.profiles
   SET role = 'coach', approval_status = 'approved', approved_at = COALESCE(approved_at, now())
 WHERE email = 'coach@bcl.com'
   AND (role <> 'coach' OR approval_status <> 'approved');

UPDATE public.profiles
   SET role = 'member', approval_status = 'approved', approved_at = COALESCE(approved_at, now())
 WHERE email = 'member@bcl.com'
   AND (role <> 'member' OR approval_status <> 'approved');

-- ----------------------------------------------------------------------------
-- 4. coach@bcl.com의 coaches 행 (트리거는 members만 생성 — coaches는 여기서 보강)
-- ----------------------------------------------------------------------------
INSERT INTO public.coaches (user_id, name, email, status, linked_at)
SELECT u.id, '테스트코치', 'coach@bcl.com', 'active', now()
  FROM auth.users u
 WHERE u.email = 'coach@bcl.com'
   AND NOT EXISTS (SELECT 1 FROM public.coaches c WHERE c.user_id = u.id);

-- ============================================================================
-- 10_seed_phase1.sql 끝
-- ============================================================================
