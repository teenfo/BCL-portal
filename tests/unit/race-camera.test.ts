// 레이스 카메라 순수 로직 검증 — 배틀 캠 페어 선정 / 피날레 게이트 / 코스 스케일 (docs/15 §5b)
import { describe, it, expect } from 'vitest';
import {
  pickDuelPair,
  finaleGate,
  courseScaleMax,
  DUEL_IDLE_MS,
} from '@/features/class-race/race-camera';

const NOW = 1_000_000;
const racer = (serial: string, d: number, lastAt: number | null = NOW) => ({ serial, d, lastAt });

describe('pickDuelPair', () => {
  it('최소 간격 페어를 선정한다', () => {
    const pair = pickDuelPair(
      [racer('a', 100), racer('b', 97), racer('c', 60), racer('d', 59)],
      NOW,
      300,
    );
    expect(pair).toEqual(['c', 'd']);
  });

  it('간격 4m 초과면 경합 없음(null)', () => {
    expect(pickDuelPair([racer('a', 100), racer('b', 90)], NOW, 300)).toBeNull();
  });

  it('미출발(0m)·저전진 레인은 gap 0이어도 후보 제외 — DNS 두 명이 선정되던 결함 방지', () => {
    const pair = pickDuelPair(
      [racer('dns1', 0), racer('dns2', 0), racer('a', 80), racer('b', 78)],
      NOW,
      300,
    );
    expect(pair).toEqual(['a', 'b']);
  });

  it('idle(샘플 스테일) 레인은 제외한다', () => {
    const pair = pickDuelPair(
      [racer('stale', 81, NOW - DUEL_IDLE_MS - 1), racer('a', 80), racer('b', 78)],
      NOW,
      300,
    );
    expect(pair).toEqual(['a', 'b']);
  });

  it('샘플 없는 레인(lastAt null)은 제외한다', () => {
    expect(pickDuelPair([racer('x', 50, null), racer('a', 49)], NOW, 300)).toBeNull();
  });

  it('피니시 근접(target-1 이상) 레인은 제외한다', () => {
    const pair = pickDuelPair([racer('fin', 299.5), racer('a', 298)], NOW, 300);
    expect(pair).toBeNull();
  });

  it('활동 레인이 1명 이하면 null', () => {
    expect(pickDuelPair([racer('a', 50)], NOW, 300)).toBeNull();
    expect(pickDuelPair([], NOW, 300)).toBeNull();
  });
});

describe('finaleGate', () => {
  const base = { status: 'racing', target: 300, leadD: 285, finishedCount: 0 };
  it('선두 95% 통과 시 발동', () => {
    expect(finaleGate(base)).toBe(true);
  });
  it('95% 미만이면 비발동', () => {
    expect(finaleGate({ ...base, leadD: 284 })).toBe(false);
  });
  it('첫 피니셔 발생 후엔 와이드(비발동)', () => {
    expect(finaleGate({ ...base, finishedCount: 1 })).toBe(false);
  });
  it('레이싱 외 상태·시간제(target null)는 비발동', () => {
    expect(finaleGate({ ...base, status: 'finished' })).toBe(false);
    expect(finaleGate({ ...base, target: null })).toBe(false);
  });
});

describe('courseScaleMax', () => {
  it('목표 거리가 있으면 그대로', () => {
    expect(courseScaleMax(300, 500)).toBe(300);
  });
  it('시간제(null)는 선두×1.15 여유 스케일 — 선두 prog≈0.87', () => {
    expect(courseScaleMax(null, 1000)).toBeCloseTo(1150);
    expect(1000 / courseScaleMax(null, 1000)).toBeCloseTo(0.87, 2);
  });
  it('시작 전(leadD 0)엔 최소 1', () => {
    expect(courseScaleMax(null, 0)).toBe(1);
  });
});
