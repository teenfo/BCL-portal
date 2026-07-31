// 스냅샷 대체 키 → 브릿지 실시리얼 승격 판정 (docs/15 §3.4 M-2 보강)
//
// 배경: 스냅샷 복원(race_live_state)에는 serial이 없어 레인/샘플을 `dev:{device_id}` 대체 키로
// 만들고, lane_assign broadcast는 device_id를 그대로 serial로 쓴다. 반면 실브릿지의
// erg_update는 PM5 실시리얼(device_serial)을 키로 발행하므로 같은 기기의 데이터가 두 키로
// 갈라진다 — 레이스 도중 접속/새로고침한 TV가 접속 시점 값으로 영구 동결되는 원인(감사 P1).
// erg_update payload의 device_id(계약 선택 필드, 브릿지 포함)로 첫 프레임에서 대체 키를
// 실시리얼로 승격한다. 시뮬레이터(device_serial=device_id)는 승격이 자연히 no-op.
//
// 순수 판정만 여기서 — 적용(샘플 제거·레인 메타 치환·매핑 갱신)은 useRaceRealtime이 수행.

export interface SerialPromotion {
  /** 실시리얼로 치환·제거해야 할 구 대체 키 목록 */
  staleKeys: string[];
}

/**
 * @param deviceId erg_update.device_id (없으면 승격 불가 — null)
 * @param serial erg_update.device_serial (실시리얼)
 * @param mappedSerial serialByDevice에 기록된 현재 매핑 (스냅샷이 dev: 키를 기록)
 * @returns 승격 필요 시 구 키 목록, 이미 정합(mapped=serial)이거나 판정 불가면 null
 */
export function planSerialPromotion(
  deviceId: string | null | undefined,
  serial: string,
  mappedSerial: string | undefined,
): SerialPromotion | null {
  if (!deviceId || !serial) return null;
  if (mappedSerial === serial) return null; // 이미 승격 완료 — 프레임마다 재실행 방지
  const staleKeys = [`dev:${deviceId}`, deviceId].filter((k) => k !== serial);
  return { staleKeys };
}
