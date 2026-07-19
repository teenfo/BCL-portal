-- ============================================================================
-- PM5 기기 관리 RPC — Admin CRUD + Coach 조회 (docs/15 §6.3 pm5_devices · R-1/R-5/R-7)
--   갭 봉합: race-admin 기기 관리·coach Devices 탭이 pm5_devices 직접 query에 의존.
--   전용 SECURITY DEFINER RPC로 대체 — envelope {success,data,error}, auth.uid() 내부 검증,
--   audit_logs 기록(직접 쓰기 경로의 미기록 결함 해소).
--   식별자(id/facility_id)는 서버가 payload에서 파싱하되 권한은 is_admin()/is_admin_or_coach() 게이트로 강제.
-- 규약: SECURITY DEFINER + SET search_path=public. CHECK enum 서버 재검증.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (1) fn_admin_upsert_pm5_device(p_payload) — admin 전용 insert/update
--     p_payload: {id?, serial_number, facility_id?, device_type?, status?, current_mode?,
--                 ble_name?, mac_address?, qr_identifier?, firmware_version?}
--     id 있으면 update, 없으면 insert. serial_number UNIQUE 위반은 명시적 error.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_admin_upsert_pm5_device(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id          uuid;
  v_serial      text;
  v_facility    uuid;
  v_type        text;
  v_status      text;
  v_mode        text;
  v_ble         text;
  v_mac         text;
  v_qr          text;
  v_fw          text;
  v_old         public.pm5_devices;
  v_row         public.pm5_devices;
  v_is_insert   boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
  END IF;

  v_id     := NULLIF(p_payload->>'id', '')::uuid;
  v_serial := NULLIF(trim(p_payload->>'serial_number'), '');
  IF v_serial IS NULL THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'serial_required');
  END IF;

  v_facility := NULLIF(p_payload->>'facility_id', '')::uuid;
  v_type     := COALESCE(NULLIF(p_payload->>'device_type', ''), 'rower');
  v_status   := COALESCE(NULLIF(p_payload->>'status', ''), 'offline');
  v_mode     := COALESCE(NULLIF(p_payload->>'current_mode', ''), 'idle');
  v_ble      := NULLIF(trim(p_payload->>'ble_name'), '');
  v_mac      := NULLIF(trim(p_payload->>'mac_address'), '');
  v_qr       := NULLIF(trim(p_payload->>'qr_identifier'), '');
  v_fw       := NULLIF(trim(p_payload->>'firmware_version'), '');

  -- CHECK enum 서버 재검증 (docs/15 §1.5)
  IF v_type NOT IN ('rower','bike','skierg','treadmill','other') THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_device_type');
  END IF;
  IF v_status NOT IN ('online','offline','maintenance') THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_status');
  END IF;
  IF v_mode NOT IN ('idle','racing','personal_recording') THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'invalid_current_mode');
  END IF;

  v_is_insert := v_id IS NULL;

  IF NOT v_is_insert THEN
    SELECT * INTO v_old FROM public.pm5_devices WHERE id = v_id;
    IF v_old.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'device_not_found');
    END IF;
  END IF;

  -- serial UNIQUE 충돌 사전 검사 (자기 자신 제외)
  IF EXISTS (SELECT 1 FROM public.pm5_devices
             WHERE serial_number = v_serial
               AND (v_is_insert OR id <> v_id)) THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'serial_duplicate');
  END IF;

  IF v_is_insert THEN
    INSERT INTO public.pm5_devices (
      serial_number, facility_id, device_type, status, current_mode,
      ble_name, mac_address, qr_identifier, firmware_version)
    VALUES (v_serial, v_facility, v_type, v_status, v_mode,
            v_ble, v_mac, v_qr, v_fw)
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.pm5_devices SET
      serial_number    = v_serial,
      facility_id      = v_facility,
      device_type      = v_type,
      status           = v_status,
      current_mode     = v_mode,
      ble_name         = v_ble,
      mac_address      = v_mac,
      qr_identifier    = v_qr,
      firmware_version = v_fw,
      updated_at       = now()
    WHERE id = v_id
    RETURNING * INTO v_row;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
  VALUES (auth.uid(),
          CASE WHEN v_is_insert THEN 'CREATE_PM5_DEVICE' ELSE 'UPDATE_PM5_DEVICE' END,
          'pm5_devices', v_row.id,
          CASE WHEN v_is_insert THEN NULL ELSE to_jsonb(v_old) END,
          to_jsonb(v_row));

  RETURN jsonb_build_object('success', true,
    'data', jsonb_build_object('id', v_row.id, 'serial_number', v_row.serial_number,
                               'created', v_is_insert),
    'error', NULL);
END $$;

REVOKE ALL ON FUNCTION public.fn_admin_upsert_pm5_device(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_upsert_pm5_device(jsonb) TO authenticated;
COMMENT ON FUNCTION public.fn_admin_upsert_pm5_device(jsonb) IS
'PM5 기기 등록/수정(admin 전용). serial UNIQUE 검증 + CHECK enum 재검증 + audit_logs.';

-- ----------------------------------------------------------------------------
-- (2) fn_admin_delete_pm5_device(p_id) — admin 전용 삭제
--     레이싱 중(current_mode='racing') 기기는 삭제 차단.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_admin_delete_pm5_device(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old public.pm5_devices;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_old FROM public.pm5_devices WHERE id = p_id;
  IF v_old.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'device_not_found');
  END IF;
  IF v_old.current_mode = 'racing' THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'device_racing');
  END IF;

  DELETE FROM public.pm5_devices WHERE id = p_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
  VALUES (auth.uid(), 'DELETE_PM5_DEVICE', 'pm5_devices', p_id, to_jsonb(v_old), NULL);

  RETURN jsonb_build_object('success', true,
    'data', jsonb_build_object('id', p_id), 'error', NULL);
END $$;

REVOKE ALL ON FUNCTION public.fn_admin_delete_pm5_device(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_delete_pm5_device(uuid) TO authenticated;
COMMENT ON FUNCTION public.fn_admin_delete_pm5_device(uuid) IS
'PM5 기기 삭제(admin 전용). 레이싱 중 기기 차단 + audit_logs.';

-- ----------------------------------------------------------------------------
-- (3) fn_list_pm5_devices(p_facility_id) — admin/coach 조회
--     admin: 전체(또는 p_facility_id 필터). coach: 본인 시설 스코프.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_list_pm5_devices(p_facility_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_admin    boolean := public.is_admin();
  v_coach_fac   uuid;
  v_scope_fac   uuid;
  v_data        jsonb;
BEGIN
  IF NOT public.is_admin_or_coach() THEN
    RETURN jsonb_build_object('success', false, 'data', NULL, 'error', 'forbidden');
  END IF;

  IF v_is_admin THEN
    v_scope_fac := p_facility_id;          -- NULL = 전체
  ELSE
    SELECT facility_id INTO v_coach_fac
    FROM public.coaches WHERE user_id = auth.uid() LIMIT 1;
    v_scope_fac := v_coach_fac;            -- 코치는 항상 본인 시설 스코프
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.serial_number), '[]'::jsonb)
  INTO v_data
  FROM (
    SELECT d.id, d.facility_id, d.serial_number, d.mac_address, d.ble_name,
           d.qr_identifier, d.device_type, d.status, d.current_mode,
           d.firmware_version, d.last_sync_at, d.created_at
    FROM public.pm5_devices d
    WHERE v_scope_fac IS NULL OR d.facility_id = v_scope_fac
  ) t;

  RETURN jsonb_build_object('success', true,
    'data', jsonb_build_object('devices', v_data), 'error', NULL);
END $$;

REVOKE ALL ON FUNCTION public.fn_list_pm5_devices(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_list_pm5_devices(uuid) TO authenticated;
COMMENT ON FUNCTION public.fn_list_pm5_devices(uuid) IS
'PM5 기기 목록(admin=전체/필터, coach=본인 시설). 조회 전용 envelope.';
