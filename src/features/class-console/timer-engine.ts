// 수업 타이머 엔진 코어 — 순수 계산부 (docs/05 §3.2 timer v2)
// useConsoleTimer(rAF 훅)에서 분리한 프레임 계산 단일 소스. DOM·부수효과 없음(단위 테스트 대상).
// 모드 5종: countdown / countup(+capSeconds 자동 종료) / emom(가변 인터벌) / tabata / interval
// 공통: preSeconds(시작 전 READY 카운트다운) — 본 타이머 경과는 pre 종료 후 0부터.
import type { HeatPlan, TimerCommand, TimerMode } from '@/features/class-broadcast';

export interface TimerEngineConfig {
  mode: TimerMode;
  /** countdown: 총 초 */
  seconds: number;
  /** countup: 자동 종료 캡(0=무제한) */
  capSeconds: number;
  /** emom: 인터벌 초 */
  intervalSeconds: number;
  /** emom·interval: 총 라운드 */
  totalRounds: number;
  /** tabata·interval: work 초 */
  workSeconds: number;
  /** tabata·interval: rest 초 */
  restSeconds: number;
  /** tabata: 세트 수 */
  totalSets: number;
  /** 시작 전 준비 카운트다운 초(0=즉시) */
  preSeconds: number;
  /** 표시용 타이머 타입명('' = mode에서 유도) */
  typeLabel: string;
}

export const DEFAULT_ENGINE_CFG: TimerEngineConfig = {
  mode: 'countdown',
  seconds: 600,
  capSeconds: 0,
  intervalSeconds: 60,
  totalRounds: 10,
  workSeconds: 20,
  restSeconds: 10,
  totalSets: 8,
  preSeconds: 0,
  typeLabel: '',
};

/**
 * configure 명령 → 엔진 구성. 기존 의미론 유지: 미지정 필드는 DEFAULT로 리셋(명령 멱등 —
 * 같은 configure 재수신 시 항상 같은 구성). mode만 직전 값 폴백.
 */
export function configFromCommand(cmd: TimerCommand, prevMode: TimerMode): TimerEngineConfig {
  return {
    mode: cmd.mode ?? prevMode,
    seconds: cmd.seconds ?? DEFAULT_ENGINE_CFG.seconds,
    capSeconds: cmd.capSeconds ?? DEFAULT_ENGINE_CFG.capSeconds,
    intervalSeconds: cmd.intervalSeconds ?? DEFAULT_ENGINE_CFG.intervalSeconds,
    totalRounds: cmd.totalRounds ?? DEFAULT_ENGINE_CFG.totalRounds,
    workSeconds: cmd.workSeconds ?? DEFAULT_ENGINE_CFG.workSeconds,
    restSeconds: cmd.restSeconds ?? DEFAULT_ENGINE_CFG.restSeconds,
    totalSets: cmd.totalSets ?? DEFAULT_ENGINE_CFG.totalSets,
    preSeconds: cmd.preSeconds ?? DEFAULT_ENGINE_CFG.preSeconds,
    typeLabel: cmd.typeLabel ?? DEFAULT_ENGINE_CFG.typeLabel,
  };
}

/** 표시용 타이머 타입명 — 코치 지정(typeLabel) 우선, 없으면 mode 관례명 */
export function timerTypeLabel(cfg: TimerEngineConfig): string {
  if (cfg.typeLabel) return cfg.typeLabel;
  switch (cfg.mode) {
    case 'countdown':
      return 'COUNTDOWN';
    case 'countup':
      return cfg.capSeconds > 0 ? 'FOR TIME' : 'COUNT-UP';
    case 'emom':
      return 'EMOM';
    case 'tabata':
      return 'TABATA';
    case 'interval':
      return 'INTERVAL';
  }
}

/** 전체 구동 길이(초, pre 포함). 무제한(캡 없는 countup)은 null — 자동 종료 없음 */
export function totalDuration(cfg: TimerEngineConfig): number | null {
  const pre = Math.max(0, cfg.preSeconds);
  switch (cfg.mode) {
    case 'countdown':
      return pre + cfg.seconds;
    case 'countup':
      return cfg.capSeconds > 0 ? pre + cfg.capSeconds : null;
    case 'emom':
      return pre + Math.max(1, cfg.intervalSeconds) * cfg.totalRounds;
    case 'tabata':
      return pre + (Math.max(1, cfg.workSeconds) + Math.max(0, cfg.restSeconds)) * cfg.totalSets;
    case 'interval':
      return pre + (Math.max(1, cfg.workSeconds) + Math.max(0, cfg.restSeconds)) * cfg.totalRounds;
  }
}

export interface TimerFrame {
  /** 주 표시 텍스트(MM:SS) */
  display: string;
  /** 보조 라벨(READY/라운드/페이즈) */
  label: string;
  /** 페이즈 키 — CSS data-phase: '' | 'pre' | 'work' | 'rest' | 'emom' (라운드는 emom-N) */
  phase: string;
  /**
   * 현재 페이즈 잔여 초(올림) — 마지막 3초 비프 판정용.
   * 무제한 카운트업 등 잔여 개념이 없으면 Infinity.
   */
  secRemainInPhase: number;
  /** 전체 종료 여부(자동 종료 지점 도달) */
  done: boolean;
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m < 10 ? '0' + m : m}:${r < 10 ? '0' + r : r}`;
}

/**
 * 잔여시간 표시는 올림(ceil) — rAF는 초 경계 직후(N+ε)에 갱신되므로 내림이면 시작값이
 * 한 번도 안 보이고(10:00→즉시 09:59) 마지막 1초 내내 00:00이 표시된다. 올림이면
 * 표시·비프(secRemainInPhase=ceil)가 같은 숫자를 가리킨다. 경과 표시(countup)는 내림 유지.
 */
function fmtRemain(sec: number): string {
  return fmtClock(Math.ceil(sec));
}

/** pre 종료 직후 화면에 'GO'를 유지하는 시간(초) — 소리 신호와 짝을 이루는 시각 신호 */
const GO_HOLD_SEC = 1.5;

/**
 * 경과 초(elapsed, 시작부터 연속) → 표시 프레임. 순수 함수 — 비프/DOM은 훅이 담당.
 * pre 카운트다운을 쓴 경우 본 타이머 진입 직후 잠시 라벨을 'GO'로 덮는다(표시 전용 —
 * 시간·페이즈·종료 판정은 그대로).
 */
export function computeTimerFrame(cfg: TimerEngineConfig, elapsed: number): TimerFrame {
  const frame = baseTimerFrame(cfg, elapsed);
  if (cfg.preSeconds > 0) {
    const t = elapsed - cfg.preSeconds;
    if (t >= 0 && t < GO_HOLD_SEC && !frame.done) return { ...frame, label: 'GO' };
  }
  return frame;
}

// ── 시차 출발(waterfall) — 세그먼트 타이머와 같은 시계 위의 파생 표시 ──────────

export interface HeatFrame {
  /** 0-based 조 번호 */
  index: number;
  label: string;
  /** waiting=출발 대기 · go=출발 순간(짧게) · running=진행 중 */
  state: 'waiting' | 'go' | 'running';
  /** waiting: 출발까지 남은 MM:SS · go/running: 출발 후 경과 MM:SS */
  display: string;
  /** 출발까지 남은 초(음수 = 이미 출발) — 비프·강조 판정용 */
  secToStart: number;
}

/** 조 이름 — labels 우선, 부족분은 HEAT n */
function heatLabel(plan: HeatPlan, i: number): string {
  const l = plan.labels?.[i];
  return l && l.trim() ? l.trim() : `HEAT ${i + 1}`;
}

/** 유효 조 수(1 이하 = 시차 출발 아님) */
export function heatCount(plan: HeatPlan | null | undefined): number {
  if (!plan) return 0;
  const n = Math.floor(plan.count);
  return Number.isFinite(n) && n >= 2 ? Math.min(n, 12) : 0;
}

/**
 * 조별 출발 상태. 조 h의 출발 시각 = preSeconds + h × staggerSeconds (elapsed 축).
 * 순수 함수 — TV는 rAF에서 이 결과만 DOM에 반영한다.
 */
export function computeHeatFrames(
  plan: HeatPlan,
  preSeconds: number,
  elapsed: number,
): HeatFrame[] {
  const n = heatCount(plan);
  if (n === 0) return [];
  const stagger = Math.max(1, Math.floor(plan.staggerSeconds) || 0);
  const pre = Math.max(0, preSeconds);
  const frames: HeatFrame[] = [];
  for (let i = 0; i < n; i++) {
    const startAt = pre + i * stagger;
    const secToStart = startAt - elapsed;
    const state: HeatFrame['state'] =
      secToStart > 0 ? 'waiting' : -secToStart < GO_HOLD_SEC ? 'go' : 'running';
    frames.push({
      index: i,
      label: heatLabel(plan, i),
      state,
      display: state === 'waiting' ? fmtRemain(secToStart) : fmtClock(-secToStart),
      secToStart,
    });
  }
  return frames;
}

function baseTimerFrame(cfg: TimerEngineConfig, elapsed: number): TimerFrame {
  // 프리 카운트다운 — 본 타이머와 독립된 준비 구간(READY 3-2-1-GO)
  if (cfg.preSeconds > 0 && elapsed < cfg.preSeconds) {
    const remain = cfg.preSeconds - elapsed;
    return {
      display: fmtRemain(remain),
      label: 'READY',
      phase: 'pre',
      secRemainInPhase: Math.ceil(remain),
      done: false,
    };
  }
  const t = cfg.preSeconds > 0 ? elapsed - cfg.preSeconds : elapsed;

  if (cfg.mode === 'countup') {
    const cap = cfg.capSeconds > 0 ? cfg.capSeconds : 0;
    const done = cap > 0 && t >= cap;
    return {
      display: fmtClock(cap > 0 ? Math.min(t, cap) : t),
      label: cap > 0 ? `CAP ${fmtClock(cap)}` : '',
      phase: '',
      secRemainInPhase: cap > 0 ? Math.ceil(cap - t) : Infinity,
      done,
    };
  }

  if (cfg.mode === 'countdown') {
    const remain = cfg.seconds - t;
    return {
      display: fmtRemain(remain),
      label: '',
      phase: '',
      secRemainInPhase: Math.ceil(remain),
      done: remain <= 0,
    };
  }

  if (cfg.mode === 'emom') {
    const iv = Math.max(1, cfg.intervalSeconds);
    const total = iv * cfg.totalRounds;
    const round = Math.min(Math.floor(t / iv) + 1, cfg.totalRounds);
    const inRound = t - (round - 1) * iv;
    const remain = iv - inRound;
    return {
      display: fmtRemain(remain),
      label: `ROUND ${round} / ${cfg.totalRounds}`,
      phase: `emom-${round}`,
      secRemainInPhase: Math.ceil(remain),
      done: t >= total,
    };
  }

  // tabata·interval — work/rest 사이클. tabata=세트(totalSets), interval=라운드(totalRounds)
  const work = Math.max(1, cfg.workSeconds);
  const rest = Math.max(0, cfg.restSeconds);
  const cycle = work + rest;
  const units = cfg.mode === 'tabata' ? cfg.totalSets : cfg.totalRounds;
  const unitLabel = cfg.mode === 'tabata' ? 'SET' : 'ROUND';
  const n = Math.min(Math.floor(t / cycle) + 1, units);
  // 마지막 사이클로 클램프(emom inRound 방식) — 종점에서 t%cycle=0 랩으로
  // 'WORK 풀타임' 동결 화면이 되는 것을 방지(종료 프레임 = 00:00 · 마지막 페이즈)
  const inCycle = t - (n - 1) * cycle;
  const isWork = rest === 0 || inCycle < work;
  const remain = isWork ? work - inCycle : cycle - inCycle;
  return {
    display: fmtRemain(remain),
    label: `${unitLabel} ${n}/${units} · ${isWork ? 'WORK' : 'REST'}`,
    // rest=0(work-only)은 페이즈가 'work' 고정이라 라운드 경계 전환(색·롱비프)이 사라지므로
    // emom-N과 동일하게 라운드 번호를 페이즈 키에 포함한다(CSS data-phase는 훅에서 'work'로 정규화)
    phase: isWork ? (rest === 0 ? `work-${n}` : 'work') : 'rest',
    secRemainInPhase: Math.ceil(remain),
    done: t >= cycle * units,
  };
}
