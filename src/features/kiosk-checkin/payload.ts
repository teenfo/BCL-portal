// QR 페이로드 파싱·클라이언트 선검증 (docs/06 §4.1~4.2 ①②④)
// 서버(fn_kiosk_checkin)가 최종 판정이며, 여기 검증은 오프라인 폴백(§7)과 UX 조기거절 용도.
import {
  FUTURE_SKEW_SECONDS,
  PAYLOAD_VERSION,
  QR_TTL_SECONDS,
  type KioskErrorCode,
  type QrPayload,
} from './types';

export type ParseResult =
  | { ok: true; payload: QrPayload }
  | { ok: false; code: KioskErrorCode };

/** QR 문자열 → 페이로드. JSON 스키마·버전만 확인(①), 만료·회원·지점은 별도 */
export function parsePayload(raw: string): ParseResult {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { ok: false, code: 'invalid_payload' };
  }
  if (!obj || typeof obj !== 'object') return { ok: false, code: 'invalid_payload' };
  const p = obj as Record<string, unknown>;
  if (
    typeof p.mid !== 'string' ||
    typeof p.fid !== 'string' ||
    typeof p.ts !== 'number' ||
    typeof p.v !== 'number'
  ) {
    return { ok: false, code: 'invalid_payload' };
  }
  if (p.v !== PAYLOAD_VERSION) return { ok: false, code: 'unsupported_version' };
  return { ok: true, payload: { mid: p.mid, fid: p.fid, ts: p.ts, v: p.v } };
}

/** 만료 검증(②) — scannedAtMs 기준(오프라인 소급 판정 대비). now-ts>300s 또는 미래 시각(+60s) 거부 */
export function isExpired(payload: QrPayload, scannedAtMs: number = Date.now()): boolean {
  const now = Math.floor(scannedAtMs / 1000);
  const delta = now - payload.ts;
  if (delta > QR_TTL_SECONDS) return true; // 만료
  if (delta < -FUTURE_SKEW_SECONDS) return true; // 미래 시각 = 시계 조작
  return false;
}

/** 지점 일치 선검증(④) — 단말 facility와 페이로드 fid 대조. 서버는 fid를 신뢰하므로 UX 방어선 */
export function isFacilityMismatch(payload: QrPayload, deviceFacilityId: string | null): boolean {
  if (!deviceFacilityId) return false; // 단말 미등록 시 선검증 생략(서버 위임)
  return payload.fid !== deviceFacilityId;
}
