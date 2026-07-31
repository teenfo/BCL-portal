// serial 승격 판정 — 스냅샷 dev: 대체 키 ↔ 브릿지 실시리얼 (docs/15 §3.4 M-2, 감사 P1)
import { describe, expect, it } from 'vitest';
import { planSerialPromotion } from '@/features/class-race/serial-promotion';

describe('planSerialPromotion', () => {
  it('스냅샷 dev: 키로 매핑된 기기에 실시리얼 프레임 도착 → dev: 키와 device_id 키를 승격 대상으로', () => {
    const p = planSerialPromotion('d-123', 'PM5-001', 'dev:d-123');
    expect(p).not.toBeNull();
    expect(p?.staleKeys).toEqual(['dev:d-123', 'd-123']);
  });

  it('이미 실시리얼로 매핑된 기기 → null (기기당 1회, 프레임마다 재실행 금지)', () => {
    expect(planSerialPromotion('d-123', 'PM5-001', 'PM5-001')).toBeNull();
  });

  it('device_id 없는 프레임 → 판정 불가 null', () => {
    expect(planSerialPromotion(undefined, 'PM5-001', undefined)).toBeNull();
    expect(planSerialPromotion(null, 'PM5-001', undefined)).toBeNull();
  });

  it('시뮬레이터(device_serial=device_id) → 자기 자신은 제외, dev: 키만 정리 대상', () => {
    const p = planSerialPromotion('d-123', 'd-123', undefined);
    expect(p?.staleKeys).toEqual(['dev:d-123']);
  });

  it('lane_assign이 만든 device_id serial 레인 → 매핑 없이도 실시리얼로 승격', () => {
    const p = planSerialPromotion('d-123', 'PM5-001', undefined);
    expect(p?.staleKeys).toEqual(['dev:d-123', 'd-123']);
  });

  it('늦은 스냅샷이 매핑을 dev: 키로 되돌린 경우 → 다음 프레임에서 재승격', () => {
    const p = planSerialPromotion('d-123', 'PM5-001', 'dev:d-123');
    expect(p?.staleKeys).toContain('dev:d-123');
  });
});
