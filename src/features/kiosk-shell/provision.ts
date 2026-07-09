// 키오스크 프로비저닝 (docs/06 §1) — 등록 토큰 → 단말 config 해석.
// Admin 이 fn_admin_issue_kiosk_token 으로 발급한 토큰을 단말이 입력하면,
// ANON fn_kiosk_provision 이 device_id/facility_id/device_name 을 서버에서 좁게 반환한다.
// 클라이언트가 facility UUID 를 임의 입력하던 사칭 경로를 제거한다.
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpc } from '@/lib/supabase/query';
import type { KioskDeviceConfig } from './device';

interface ProvisionRow {
  device_id: string;
  facility_id: string;
  device_name: string | null;
  status: string | null;
}

export type ProvisionResult =
  | { ok: true; config: KioskDeviceConfig; status: string | null }
  | { ok: false; code: 'invalid_token' | 'network_error' };

/** 토큰 → 단말 config. invalid_token = 토큰 폐기(재등록 유도), network_error = 캐시 유지 후 재시도 */
export async function provisionDevice(token: string): Promise<ProvisionResult> {
  try {
    const client = getSupabaseBrowserClient();
    const res = await rpc<ProvisionRow>(client, 'fn_kiosk_provision', { p_token: token.trim() });
    if (res.success && res.data?.device_id && res.data.facility_id) {
      return {
        ok: true,
        config: {
          deviceId: res.data.device_id,
          facilityId: res.data.facility_id,
          deviceName: res.data.device_name ?? '키오스크',
        },
        status: res.data.status ?? null,
      };
    }
    // 명시적 invalid_token envelope 만 토큰 폐기 대상 — 전송/DB 오류(임의 메시지)는
    // network_error 로 취급해 캐시 config 를 보존한다(순간 단절로 토큰이 지워지는 사고 방지).
    if (res.error === 'invalid_token') {
      return { ok: false, code: 'invalid_token' };
    }
    return { ok: false, code: 'network_error' };
  } catch {
    return { ok: false, code: 'network_error' };
  }
}
