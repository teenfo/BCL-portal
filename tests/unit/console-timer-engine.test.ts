// 수업 타이머 엔진 v2 — 순수 프레임 계산 검증 (docs/05 §3.2 timer)
// rAF/DOM 없는 timer-engine.ts 단일 소스: 모드 5종 + 프리 카운트다운 + 자동 종료 경계.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ENGINE_CFG,
  computeHeatFrames,
  computeTimerFrame,
  heatCount,
  configFromCommand,
  timerTypeLabel,
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
  it('rest=0 인터벌은 WORK 고정 + 라운드 번호 페이즈 키(경계 전환음 유지)', () => {
    const f = computeTimerFrame(
      cfg({ mode: 'interval', workSeconds: 30, restSeconds: 0, totalRounds: 4 }),
      35,
    );
    expect(f.phase).toBe('work-2');
  });
  it('종료 프레임은 00:00·마지막 페이즈로 클램프(t%cycle 랩으로 WORK 풀타임 동결 방지)', () => {
    const done = computeTimerFrame(
      cfg({ mode: 'tabata', workSeconds: 20, restSeconds: 10, totalSets: 8 }),
      240,
    );
    expect(done.done).toBe(true);
    expect(done.display).toBe('00:00');
    expect(done.phase).toBe('rest');
    expect(done.label).toBe('SET 8/8 · REST');
  });
});

describe('computeTimerFrame — preSeconds(READY 카운트다운)', () => {
  it('pre 10초 · 7초 경과 → READY 페이즈 00:03, 본 타이머 미진입', () => {
    const f = computeTimerFrame(cfg({ mode: 'countdown', seconds: 600, preSeconds: 10 }), 7);
    expect(f.phase).toBe('pre');
    expect(f.label).toBe('READY');
    expect(f.display).toBe('00:03');
  });
  it('pre 종료 직후 → 본 타이머 0초 기준(경과 시프트), 첫 1초는 시작값 표시(올림)', () => {
    const f = computeTimerFrame(cfg({ mode: 'countdown', seconds: 600, preSeconds: 10 }), 10.5);
    expect(f.phase).toBe('');
    expect(f.display).toBe('10:00');
    const g = computeTimerFrame(cfg({ mode: 'countdown', seconds: 600, preSeconds: 10 }), 11.2);
    expect(g.display).toBe('09:59');
  });
});

describe('GO 시각 신호 — pre 종료 직후 라벨(기획서 1-2)', () => {
  it('pre 직후 1.5초 동안 라벨이 GO (시간·페이즈는 본 타이머 그대로)', () => {
    const c = cfg({ mode: 'countdown', seconds: 600, preSeconds: 10 });
    const go = computeTimerFrame(c, 10.4);
    expect(go.label).toBe('GO');
    expect(go.display).toBe('10:00');
    expect(go.phase).toBe('');
  });
  it('GO 유지 시간이 지나면 원래 라벨로 복귀', () => {
    const c = cfg({ mode: 'tabata', workSeconds: 20, restSeconds: 10, totalSets: 8, preSeconds: 10 });
    expect(computeTimerFrame(c, 10.2).label).toBe('GO');
    expect(computeTimerFrame(c, 12).label).toBe('SET 1/8 · WORK');
  });
  it('pre 없는 타이머는 GO를 띄우지 않는다', () => {
    expect(computeTimerFrame(cfg({ mode: 'countdown', seconds: 600 }), 0.2).label).toBe('');
  });
});

describe('잔여시간 표시 올림 규약 — 표시·비프(ceil) 정합', () => {
  it('countdown: 초 경계 직후(N+ε)에도 표시=ceil — 3-2-1 비프와 같은 숫자', () => {
    const f = computeTimerFrame(cfg({ mode: 'countdown', seconds: 600 }), 597.4);
    expect(f.display).toBe('00:03');
    expect(f.secRemainInPhase).toBe(3);
  });
  it('countup(경과 표시)은 내림 유지 — 첫 1초는 00:00', () => {
    const f = computeTimerFrame(cfg({ mode: 'countup', capSeconds: 0 }), 0.7);
    expect(f.display).toBe('00:00');
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

describe('timerTypeLabel — 타입 배지(코치 지정 우선, mode 폴백)', () => {
  it('typeLabel 지정 시 그대로(AMRAP은 countdown 모드지만 배지는 AMRAP)', () => {
    expect(timerTypeLabel(cfg({ mode: 'countdown', typeLabel: 'AMRAP' }))).toBe('AMRAP');
  });
  it('mode 폴백 — countdown/emom/tabata/interval 관례명', () => {
    expect(timerTypeLabel(cfg({ mode: 'countdown' }))).toBe('COUNTDOWN');
    expect(timerTypeLabel(cfg({ mode: 'emom' }))).toBe('EMOM');
    expect(timerTypeLabel(cfg({ mode: 'tabata' }))).toBe('TABATA');
    expect(timerTypeLabel(cfg({ mode: 'interval' }))).toBe('INTERVAL');
  });
  it('countup은 캡 유무로 분기 — 캡 있음 FOR TIME, 없음 COUNT-UP', () => {
    expect(timerTypeLabel(cfg({ mode: 'countup', capSeconds: 720 }))).toBe('FOR TIME');
    expect(timerTypeLabel(cfg({ mode: 'countup', capSeconds: 0 }))).toBe('COUNT-UP');
  });
  it('configure에 typeLabel 미지정 → 리셋(직전 배지 비승계 — 멱등 규약)', () => {
    const c = configFromCommand({ action: 'configure', mode: 'tabata' }, 'countdown');
    expect(c.typeLabel).toBe('');
    expect(timerTypeLabel(c)).toBe('TABATA');
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

// ── 시차 출발(waterfall) — 세그먼트 타이머 시계 위의 파생 계산 (기획서 1-3) ──
describe('computeHeatFrames — 조 시차 출발', () => {
  const plan = { count: 3, staggerSeconds: 30 };

  it('조 수 2 미만 = 시차 출발 아님(빈 배열)', () => {
    expect(heatCount({ count: 1, staggerSeconds: 30 })).toBe(0);
    expect(computeHeatFrames({ count: 1, staggerSeconds: 30 }, 0, 0)).toEqual([]);
    expect(heatCount(null)).toBe(0);
  });

  it('출발 전 — 각 조가 pre + n×stagger 기준 잔여를 센다', () => {
    const f = computeHeatFrames(plan, 10, 0); // READY 10초 + 30초 간격
    expect(f.map((h) => h.state)).toEqual(['waiting', 'waiting', 'waiting']);
    expect(f.map((h) => h.display)).toEqual(['00:10', '00:40', '01:10']);
    expect(f[2].secToStart).toBe(70);
  });

  it('1조 출발 순간 = GO 상태(짧은 유지), 나머지는 대기', () => {
    const f = computeHeatFrames(plan, 10, 10.2);
    expect(f[0].state).toBe('go');
    expect(f[1].state).toBe('waiting');
  });

  it('출발 후 = 조별 경과 시간(GO 유지 구간 이후)', () => {
    const f = computeHeatFrames(plan, 10, 100); // 1조 +90s · 2조 +60s · 3조 +30s
    expect(f.map((h) => h.state)).toEqual(['running', 'running', 'running']);
    expect(f.map((h) => h.display)).toEqual(['01:30', '01:00', '00:30']);
  });

  it('조 이름 — labels 우선, 부족분은 HEAT n', () => {
    const f = computeHeatFrames({ count: 3, staggerSeconds: 30, labels: ['A조', ' '] }, 0, 0);
    expect(f.map((h) => h.label)).toEqual(['A조', 'HEAT 2', 'HEAT 3']);
  });

  it('조 수 상한 12 — 잘못 큰 값이 TV를 채우지 않는다', () => {
    expect(computeHeatFrames({ count: 50, staggerSeconds: 15 }, 0, 0)).toHaveLength(12);
  });

  it('stagger 0/음수 = 최소 1초로 보정(모든 조가 같은 시각에 겹치지 않게)', () => {
    const f = computeHeatFrames({ count: 2, staggerSeconds: 0 }, 0, 0);
    expect(f[1].secToStart).toBe(1);
  });
});
