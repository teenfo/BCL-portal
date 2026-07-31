// Race 표현 계층 매핑·주기 계산 — src/features/class-race/device-theme.ts (docs/15 §5b.3b)
// 순수 매핑 + animationDurationSec 주기 공식(rate 동기)만 검증. DOM/rAF 미포함.
import { describe, expect, it } from 'vitest';
import {
  themeForEvent,
  characterForDevice,
  animationDurationSec,
  teamColorVar,
  defaultDeviceForTheme,
  poolLaneX,
} from '@/features/class-race/device-theme';

describe('themeForEvent — event_type → 트랙 테마', () => {
  it('종목별 테마 매핑', () => {
    expect(themeForEvent('rowing')).toBe('water');
    expect(themeForEvent('bike')).toBe('road');
    expect(themeForEvent('skierg')).toBe('snow');
    expect(themeForEvent('run')).toBe('track');
  });

  it('other/null/undefined는 track 폴백', () => {
    expect(themeForEvent('other')).toBe('track');
    expect(themeForEvent(null)).toBe('track');
    expect(themeForEvent(undefined)).toBe('track');
  });
});

describe('characterForDevice — device_type → 캐릭터 스펙', () => {
  it('기기별 assetKey/rateLabel', () => {
    expect(characterForDevice('rower')).toMatchObject({ assetKey: 'rower', rateLabel: 'SPM' });
    expect(characterForDevice('bike')).toMatchObject({ assetKey: 'bike', rateLabel: 'RPM' });
    expect(characterForDevice('skierg')).toMatchObject({ assetKey: 'ski', rateLabel: 'SPM' });
    expect(characterForDevice('treadmill')).toMatchObject({ assetKey: 'runner', rateLabel: 'CAD' });
  });

  it('other/null 폴백은 runner', () => {
    expect(characterForDevice('other').assetKey).toBe('runner');
    expect(characterForDevice(null).assetKey).toBe('runner');
  });
});

describe('animationDurationSec — rate 동기 재생 주기(초)', () => {
  it('bike: 60/RPM', () => {
    expect(animationDurationSec('bike', 60)).toBeCloseTo(1);
    expect(animationDurationSec('bike', 120)).toBeCloseTo(0.5);
  });

  it('treadmill: 120/CAD (1루프=2보)', () => {
    expect(animationDurationSec('treadmill', 120)).toBeCloseTo(1);
  });

  it('rower/skierg/기본: 60/SPM', () => {
    expect(animationDurationSec('rower', 30)).toBeCloseTo(2);
    expect(animationDurationSec('skierg', 30)).toBeCloseTo(2);
    expect(animationDurationSec(null, 30)).toBeCloseTo(2);
  });

  it('0/저 rate는 하한으로 클램프(무한대 방지)', () => {
    expect(animationDurationSec('bike', 0)).toBeCloseTo(60 / 20); // max(rate,20)
    expect(animationDurationSec('treadmill', 0)).toBeCloseTo(120 / 30); // max(rate,30)
    expect(animationDurationSec('rower', 0)).toBeCloseTo(60 / 6); // max(rate,6)
  });
});

describe('teamColorVar — 8색 순환 토큰', () => {
  it('index → --bcl-race-team-N (1-based)', () => {
    expect(teamColorVar(0)).toBe('var(--bcl-race-team-1)');
    expect(teamColorVar(7)).toBe('var(--bcl-race-team-8)');
  });

  it('8 이상은 순환', () => {
    expect(teamColorVar(8)).toBe('var(--bcl-race-team-1)');
    expect(teamColorVar(15)).toBe('var(--bcl-race-team-8)');
  });
});

describe('poolLaneX — 레인 x% 지오메트리 (RaceStage3D·RailBadge 공유 SSOT)', () => {
  it('1레인은 중앙 50% (상·하 동일)', () => {
    expect(poolLaneX(0, 1)).toEqual({ xt: 50, xb: 50 });
  });

  it('n 작을 때 간격은 14.5로 캡 — n=2는 88이 아닌 50±7.25', () => {
    expect(poolLaneX(0, 2).xb).toBeCloseTo(50 - 14.5 / 2);
    expect(poolLaneX(1, 2).xb).toBeCloseTo(50 + 14.5 / 2);
  });

  it('6레인: 하단 간격 14.5 균등 + 중앙(50) 좌우 대칭', () => {
    const xs = [0, 1, 2, 3, 4, 5].map((i) => poolLaneX(i, 6));
    for (let i = 1; i < 6; i++) expect(xs[i].xb - xs[i - 1].xb).toBeCloseTo(14.5);
    for (let i = 0; i < 6; i++) expect(xs[i].xb - 50).toBeCloseTo(50 - xs[5 - i].xb);
  });

  it('상단 수렴비 0.9 — xt 오프셋 = 0.9 × xb 오프셋 (중앙으로 수렴)', () => {
    for (const [i, n] of [
      [0, 6],
      [5, 6],
      [2, 8],
      [19, 20],
    ] as const) {
      const { xt, xb } = poolLaneX(i, n);
      expect(xt - 50).toBeCloseTo((xb - 50) * 0.9);
      expect(Math.abs(xt - 50)).toBeLessThanOrEqual(Math.abs(xb - 50));
    }
  });

  it('클램프 교차점 n=8부터 88/(n-1) 분기 — 양 끝 레인이 50±44 (88% 스팬)', () => {
    expect(88 / 7).toBeLessThan(14.5); // n=8 ⇔ 88/(n-1) < 14.5
    expect(poolLaneX(0, 8).xb).toBeCloseTo(50 - 44);
    expect(poolLaneX(7, 8).xb).toBeCloseTo(50 + 44);
  });

  it('n 큰 경우(8·20): 전 레인 88% 범위(6~94) 내 + index 단조 증가', () => {
    for (const n of [8, 20]) {
      let prev = -Infinity;
      for (let i = 0; i < n; i++) {
        const { xt, xb } = poolLaneX(i, n);
        expect(xb).toBeGreaterThanOrEqual(6);
        expect(xb).toBeLessThanOrEqual(94);
        expect(xt).toBeGreaterThanOrEqual(6);
        expect(xt).toBeLessThanOrEqual(94);
        expect(xb).toBeGreaterThan(prev);
        prev = xb;
      }
    }
  });
});

describe('defaultDeviceForTheme — 테마 → 기본 기기', () => {
  it('테마별 폴백 기기', () => {
    expect(defaultDeviceForTheme('water')).toBe('rower');
    expect(defaultDeviceForTheme('road')).toBe('bike');
    expect(defaultDeviceForTheme('snow')).toBe('skierg');
    expect(defaultDeviceForTheme('track')).toBe('treadmill');
  });
});
