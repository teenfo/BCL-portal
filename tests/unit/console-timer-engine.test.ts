// 수업 타이머 엔진 v2 — 순수 프레임 계산 검증 (docs/05 §3.2 timer)
// rAF/DOM 없는 timer-engine.ts 단일 소스: 모드 5종 + 프리 카운트다운 + 자동 종료 경계.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ENGINE_CFG,
  computeTimerFrame,
  configFromCommand,
  totalDuration,
  type TimerEngineConfig,
} from '@/features/class-console/timer-engine';

const cfg = (patch: Partial<TimerEngineConfig>): TimerEngineConfig => ({
  ...DEFAULT_ENGINE_CFG,
  ...patch,
});

describe('computeTimerFrame — countdown', () => {
  it('600초 설정 · 0초 경과 → 10:00 표시, 잔여 600', () => {
    const f = computeTimerFrame(cfg({ mode: 'countdown', seconds: 600 }), 0);
    expect(f.display).toBe('10:00');
    expect(f.secRemainInPhase).toBe(600);
    expect(f.done).toBe(false);
  });
  it('종점 도달 → done, 00:00 클램프', () => {
    const f = computeTimerFrame(cfg({ mode: 'countdown', seconds: 600 }), 600);
    expect(f.done).toBe(true);
    expect(f.display).toBe('00:00');
  });
});

describe('computeTimerFrame — countup + capSeconds', () => {
  it('캡 없음 → 무한(잔여 Infinity), done 아님', () => {
    const f = computeTimerFrame(cfg({ mode: 'countup', capSeconds: 0 }), 125);
    expect(f.display).toBe('02:05');
    expect(f.secRemainInPhase).toBe(Infinity);
    expect(f.done).toBe(false);
  });
  it('캡 720초 → CAP 라벨 + 캡 도달 시 자동 종료(표시 캡 클램프)', () => {
    const before = computeTimerFrame(cfg({ mode: 'countup', capSeconds: 720 }), 719);
    expect(before.label).toBe('CAP 12:00');
    expect(before.done).toBe(false);
    const at = computeTimerFrame(cfg({ mode: 'countup', capSeconds: 720 }), 721);
    expect(at.done).toBe(true);
    expect(at.display).toBe('12:00');
  });
});

describe('computeTimerFrame — emom(가변 인터벌)', () => {
  it('90초×5R · 91초 경과 → ROUND 2, 잔여 89', () => {
    const f = computeTimerFrame(cfg({ mode: 'emom', intervalSeconds: 90, totalRounds: 5 }), 91);
    expect(f.label).toBe('ROUND 2 / 5');
    expect(f.phase).toBe('emom-2');
    expect(f.secRemainInPhase).toBe(89);
  });
  it('전체 라운드 소진 → done', () => {
    const f = computeTimerFrame(cfg({ mode: 'emom', intervalSeconds: 90, totalRounds: 5 }), 450);
    expect(f.done).toBe(true);
  });
});

describe('computeTimerFrame — tabata/interval(work·rest 사이클)', () => {
  it('tabata 20/10 · 25초 경과 → REST 페이즈, SET 1', () => {
    const f = computeTimerFrame(cfg({ mode: 'tabata', workSeconds: 20, restSeconds: 10, totalSets: 8 }), 25);
    expect(f.phase).toBe('rest');
    expect(f.label).toBe('SET 1/8 · REST');
    expect(f.secRemainInPhase).toBe(5);
  });
  it('interval 40/20×6 · 60초 경과 → 2라운드 WORK 시작', () => {
    const f = computeTimerFrame(
      cfg({ mode: 'interval', workSeconds: 40, restSeconds: 20, totalRounds: 6 }),
      60,
    );
    expect(f.phase).toBe('work');
    expect(f.label).toBe('ROUND 2/6 · WORK');
  });
  it('rest=0 인터벌은 항상 WORK(0 나눗셈·즉시 REST 진입 방지)', () => {
    const f = computeTimerFrame(
      cfg({ mode: 'interval', workSeconds: 30, restSeconds: 0, totalRounds: 4 }),
      35,
    );
    expect(f.phase).toBe('work');
  });
});

describe('computeTimerFrame — preSeconds(READY 카운트다운)', () => {
  it('pre 10초 · 7초 경과 → READY 페이즈 00:03, 본 타이머 미진입', () => {
    const f = computeTimerFrame(cfg({ mode: 'countdown', seconds: 600, preSeconds: 10 }), 7);
    expect(f.phase).toBe('pre');
    expect(f.label).toBe('READY');
    expect(f.display).toBe('00:03');
  });
  it('pre 종료 직후 → 본 타이머 0초 기준(경과 시프트)', () => {
    const f = computeTimerFrame(cfg({ mode: 'countdown', seconds: 600, preSeconds: 10 }), 10.5);
    expect(f.phase).toBe('');
    expect(f.display).toBe('09:59');
  });
});

describe('totalDuration — 자동 종료 종점(pre 포함)', () => {
  it('countdown 600 + pre 10 = 610', () => {
    expect(totalDuration(cfg({ mode: 'countdown', seconds: 600, preSeconds: 10 }))).toBe(610);
  });
  it('무제한 countup은 null', () => {
    expect(totalDuration(cfg({ mode: 'countup', capSeconds: 0 }))).toBeNull();
  });
  it('tabata (20+10)×8 = 240', () => {
    expect(totalDuration(cfg({ mode: 'tabata', workSeconds: 20, restSeconds: 10, totalSets: 8 }))).toBe(240);
  });
});

describe('configFromCommand — configure 멱등(미지정 필드 DEFAULT 리셋)', () => {
  it('부분 지정 configure → 나머지는 DEFAULT(직전 값 비승계)', () => {
    const c = configFromCommand({ action: 'configure', mode: 'interval', workSeconds: 45 }, 'countdown');
    expect(c.mode).toBe('interval');
    expect(c.workSeconds).toBe(45);
    expect(c.restSeconds).toBe(DEFAULT_ENGINE_CFG.restSeconds);
    expect(c.preSeconds).toBe(0);
  });
  it('mode 미지정 → 직전 mode 유지(start/pause 전 재구성 관례)', () => {
    const c = configFromCommand({ action: 'configure', seconds: 300 }, 'emom');
    expect(c.mode).toBe('emom');
  });
});
