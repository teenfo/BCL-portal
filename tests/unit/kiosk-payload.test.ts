// 키오스크 QR 페이로드 파싱·선검증 — src/features/kiosk-checkin/payload.ts (docs/06 §4.1~4.2)
// 서버(fn_kiosk_checkin)가 최종 판정이나, 이 순수 로직이 오프라인 폴백·조기거절 UX를 좌우.
import { describe, expect, it } from 'vitest';
import { parsePayload, isExpired, isFacilityMismatch } from '@/features/kiosk-checkin/payload';
import {
  PAYLOAD_VERSION,
  QR_TTL_SECONDS,
  FUTURE_SKEW_SECONDS,
  type QrPayload,
} from '@/features/kiosk-checkin/types';

const valid: QrPayload = { mid: 'm-1', fid: 'f-1', ts: 1_700_000_000, v: PAYLOAD_VERSION };

describe('parsePayload', () => {
  it('정상 JSON 페이로드 파싱', () => {
    const res = parsePayload(JSON.stringify(valid));
    expect(res).toEqual({ ok: true, payload: valid });
  });

  it('여분 필드는 무시하고 계약 필드만 추출', () => {
    const res = parsePayload(JSON.stringify({ ...valid, extra: 'x' }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.payload).toEqual(valid);
  });

  it('JSON 파싱 실패 → invalid_payload', () => {
    expect(parsePayload('not-json')).toEqual({ ok: false, code: 'invalid_payload' });
    expect(parsePayload('')).toEqual({ ok: false, code: 'invalid_payload' });
  });

  it('객체 아님(배열/원시값) → invalid_payload', () => {
    expect(parsePayload('123')).toEqual({ ok: false, code: 'invalid_payload' });
    expect(parsePayload('null')).toEqual({ ok: false, code: 'invalid_payload' });
  });

  it('필수 필드 타입 불일치 → invalid_payload', () => {
    expect(parsePayload(JSON.stringify({ ...valid, mid: 123 }))).toEqual({
      ok: false,
      code: 'invalid_payload',
    });
    expect(parsePayload(JSON.stringify({ ...valid, ts: 'now' }))).toEqual({
      ok: false,
      code: 'invalid_payload',
    });
  });

  it('버전 불일치 → unsupported_version', () => {
    const res = parsePayload(JSON.stringify({ ...valid, v: PAYLOAD_VERSION + 1 }));
    expect(res).toEqual({ ok: false, code: 'unsupported_version' });
  });
});

describe('isExpired — scannedAt 기준 소급 판정', () => {
  const base = valid.ts * 1000;

  it('TTL 이내는 유효', () => {
    expect(isExpired(valid, base)).toBe(false);
    expect(isExpired(valid, base + (QR_TTL_SECONDS - 1) * 1000)).toBe(false);
  });

  it('TTL 초과는 만료', () => {
    expect(isExpired(valid, base + (QR_TTL_SECONDS + 1) * 1000)).toBe(true);
  });

  it('미래 시각(시계 조작, skew 초과)은 거부', () => {
    expect(isExpired(valid, base - (FUTURE_SKEW_SECONDS + 1) * 1000)).toBe(true);
  });

  it('허용 skew 이내의 미래 시각은 통과', () => {
    expect(isExpired(valid, base - (FUTURE_SKEW_SECONDS - 1) * 1000)).toBe(false);
  });
});

describe('isFacilityMismatch — 지점 선검증(④)', () => {
  it('단말 미등록(null)이면 서버 위임 — 선검증 생략', () => {
    expect(isFacilityMismatch(valid, null)).toBe(false);
  });

  it('fid 일치는 통과', () => {
    expect(isFacilityMismatch(valid, 'f-1')).toBe(false);
  });

  it('fid 불일치는 mismatch', () => {
    expect(isFacilityMismatch(valid, 'f-2')).toBe(true);
  });
});
