// 키오스크 단말 로컬 설정 (docs/06 §1 — device_id 로컬 보관).
// 단말 등록(kiosk_devices)은 Admin이 발급하고, 단말은 device_id/facility_id를 localStorage에 보관한다.
// ※ 정식 device 등록/토큰 발급 플로우는 미구현 — 최소 수동 설정 폼으로 대체. FLAG.
export interface KioskDeviceConfig {
  deviceId: string;
  facilityId: string;
  deviceName: string;
}

const KEY = 'bcl-kiosk-device';

export function readDeviceConfig(): KioskDeviceConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as Partial<KioskDeviceConfig>;
    if (!obj.deviceId || !obj.facilityId) return null;
    return {
      deviceId: obj.deviceId,
      facilityId: obj.facilityId,
      deviceName: obj.deviceName ?? '키오스크',
    };
  } catch {
    return null;
  }
}

export function writeDeviceConfig(cfg: KioskDeviceConfig): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function clearDeviceConfig(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}
