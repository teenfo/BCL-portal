// 키오스크 단말 로컬 설정 (docs/06 §1 — 기기 프로비저닝).
// Phase 3.6: 수동 device_id/facility_id UUID 입력 → Admin 발급 "등록 토큰" 프로비저닝으로 교체.
//   · 단말은 토큰(bcl-kiosk-token)만 영구 보관한다.
//   · 부팅 시 fn_kiosk_provision(token) 이 device_id/facility_id/device_name 을 서버에서 해석.
//   · 해석 결과(config)는 오프라인 즉시 구동을 위해 캐시(bcl-kiosk-device)한다 — 재검증은 온라인 복귀 시.
export interface KioskDeviceConfig {
  deviceId: string;
  facilityId: string;
  deviceName: string;
}

const TOKEN_KEY = 'bcl-kiosk-token';
const CONFIG_KEY = 'bcl-kiosk-device';

// ── 등록 토큰(영구 보관, 단일 진실 소스) ──────────────────────────────
export function readDeviceToken(): string | null {
  if (typeof window === 'undefined') return null;
  const t = window.localStorage.getItem(TOKEN_KEY);
  return t && t.trim().length >= 16 ? t : null;
}

export function writeDeviceToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token.trim());
}

// ── 해석된 단말 config 캐시(오프라인 즉시 구동용) ─────────────────────
export function readDeviceConfig(): KioskDeviceConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
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
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

/** 프로비저닝 해제 — 토큰·config 모두 제거(토큰 폐기/재등록 시). */
export function clearDeviceConfig(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CONFIG_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
}
