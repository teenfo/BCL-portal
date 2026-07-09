-- 연동 설정/시크릿 관리 — 결제(Toss)·알림(웹푸시/SMS/Kakao) provider 자격증명
-- 원칙(CLAUDE.md 결제·번들노출 금지):
--   · 비밀값(secret) = Supabase Vault(vault.secrets)에만 저장 → 클라이언트 번들/응답에 절대 반환 안 함.
--     관리자는 "쓰기 전용" 입력만, 상태는 configured(존재)만 확인.
--   · 비비밀 config(publishable client key·발신번호·provider·토글) = integration_settings kv.
--   · 클라이언트: fn_get_public_integration() 로 publishable 값만 read.
--   · Edge Function(service_role): fn_service_get_config() 로 복호 secret + config read.
-- 신규 RPC 규약: SECURITY DEFINER + SET search_path=public + 내부 권한검증 + envelope {success,data,error}.

-- ── 비비밀 설정 kv ─────────────────────────────────────────────
create table if not exists public.integration_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
comment on table public.integration_settings is
  '연동 비비밀 설정 kv (publishable key/발신번호/provider/토글). 비밀값은 Vault.';

-- RLS 필수 — 정책 미부여 = authenticated/anon 직접 접근 불가(RPC/DEFINER·service_role 경유만).
alter table public.integration_settings enable row level security;
revoke all on public.integration_settings from anon, authenticated;

-- 허용 키(config) / 시크릿명(Vault) 화이트리스트는 각 함수 내부에 고정.

-- ── (admin) 연동 설정 저장 — config kv + Vault secret upsert ──────
create or replace function public.fn_admin_set_integration(
  p_config  jsonb default '{}'::jsonb,
  p_secrets jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_config_allow text[] := array[
    'payment_provider','toss_test_client_key','toss_live_client_key',
    'vapid_public_key','vapid_subject',
    'msg_provider','sms_sender','kakao_pf_id','kakao_template_default'
  ];
  v_secret_allow text[] := array[
    'toss_test_secret_key','toss_live_secret_key','toss_webhook_secret',
    'vapid_private_key','msg_api_key','msg_api_secret'
  ];
  r   record;
  v_id uuid;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'data', null, 'error', 'forbidden');
  end if;

  -- config: 빈문자열 → NULL(클리어). 화이트리스트 외 무시.
  for r in select key, value from jsonb_each_text(coalesce(p_config, '{}'::jsonb)) loop
    if r.key = any(v_config_allow) then
      insert into public.integration_settings(key, value, updated_by)
      values (r.key, nullif(r.value, ''), auth.uid())
      on conflict (key) do update
        set value = nullif(excluded.value, ''), updated_at = now(), updated_by = auth.uid();
    end if;
  end loop;

  -- secret: 비어있지 않은 값만 Vault upsert(빈값은 기존 유지 — 재입력 없이 저장 가능).
  for r in select key, value from jsonb_each_text(coalesce(p_secrets, '{}'::jsonb)) loop
    if r.key = any(v_secret_allow) and length(coalesce(r.value, '')) > 0 then
      select id into v_id from vault.secrets where name = r.key;
      if v_id is null then
        perform vault.create_secret(r.value, r.key, 'BCL integration secret');
      else
        perform vault.update_secret(v_id, r.value);
      end if;
    end if;
  end loop;

  return jsonb_build_object('success', true, 'data', null, 'error', null);
end;
$$;

-- ── (admin) 연동 상태 — config 값 + secret 존재여부(값 비반환) ───────
create or replace function public.fn_admin_get_integration_status()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_config_allow text[] := array[
    'payment_provider','toss_test_client_key','toss_live_client_key',
    'vapid_public_key','vapid_subject',
    'msg_provider','sms_sender','kakao_pf_id','kakao_template_default'
  ];
  v_secret_allow text[] := array[
    'toss_test_secret_key','toss_live_secret_key','toss_webhook_secret',
    'vapid_private_key','msg_api_key','msg_api_secret'
  ];
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'data', null, 'error', 'forbidden');
  end if;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'config', coalesce(
        (select jsonb_object_agg(key, value)
           from public.integration_settings where key = any(v_config_allow)), '{}'::jsonb),
      'secrets', coalesce(
        (select jsonb_object_agg(s.n, exists(select 1 from vault.secrets where name = s.n))
           from unnest(v_secret_allow) as s(n)), '{}'::jsonb),
      'payment_mode', (select payment_mode from public.pg_settings order by created_at asc limit 1)
    ),
    'error', null
  );
end;
$$;

-- ── (authenticated) publishable 값만 — 클라이언트 SDK/푸시 구독용 ────
create or replace function public.fn_get_public_integration()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_mode text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'data', null, 'error', 'no_session');
  end if;
  select payment_mode into v_mode from public.pg_settings order by created_at asc limit 1;
  v_mode := coalesce(v_mode, 'simulation');

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'vapid_public_key', (select value from public.integration_settings where key = 'vapid_public_key'),
      'payment_mode', v_mode,
      'toss_client_key', (select value from public.integration_settings
                          where key = case when v_mode = 'live' then 'toss_live_client_key'
                                           else 'toss_test_client_key' end)
    ),
    'error', null
  );
end;
$$;

-- ── (service_role only) EF용 복호 secret + config 일괄 read ─────────
create or replace function public.fn_service_get_config(
  p_config_names text[] default '{}',
  p_secret_names text[] default '{}'
) returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    return jsonb_build_object('success', false, 'data', null, 'error', 'forbidden');
  end if;
  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'config', coalesce(
        (select jsonb_object_agg(key, value)
           from public.integration_settings where key = any(p_config_names)), '{}'::jsonb),
      'secrets', coalesce(
        (select jsonb_object_agg(name, decrypted_secret)
           from vault.decrypted_secrets where name = any(p_secret_names)), '{}'::jsonb)
    ),
    'error', null
  );
end;
$$;

-- ── (authenticated) 웹푸시 구독 저장/해지 ───────────────────────────
create or replace function public.fn_save_push_subscription(
  p_endpoint    text,
  p_p256dh      text,
  p_auth        text,
  p_device_type text default null,
  p_user_agent  text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'data', null, 'error', 'no_session');
  end if;
  if coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    return jsonb_build_object('success', false, 'data', null, 'error', 'invalid_subscription');
  end if;

  insert into public.push_subscriptions(
    user_id, endpoint, p256dh_key, auth_key, device_type, user_agent, is_active, last_used_at)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_device_type, p_user_agent, true, now())
  on conflict (endpoint) do update
    set user_id     = auth.uid(),
        p256dh_key  = excluded.p256dh_key,
        auth_key    = excluded.auth_key,
        device_type = excluded.device_type,
        user_agent  = excluded.user_agent,
        is_active   = true,
        last_used_at = now(),
        updated_at  = now();

  return jsonb_build_object('success', true, 'data', null, 'error', null);
end;
$$;

create or replace function public.fn_delete_push_subscription(p_endpoint text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'data', null, 'error', 'no_session');
  end if;
  update public.push_subscriptions
     set is_active = false, updated_at = now()
   where endpoint = p_endpoint and user_id = auth.uid();
  return jsonb_build_object('success', true, 'data', null, 'error', null);
end;
$$;

-- service_role 전용 — PUBLIC 실행권 회수 후 service_role 에만 부여(내부 gate와 이중).
revoke execute on function public.fn_service_get_config(text[], text[]) from public, anon, authenticated;
grant execute on function public.fn_service_get_config(text[], text[]) to service_role;
