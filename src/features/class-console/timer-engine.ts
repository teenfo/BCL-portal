// 수업 타이머 엔진 코어 — 순수 계산부 (docs/05 §3.2 timer v2)
// useConsoleTimer(rAF 훅)에서 분리한 프레임 계산 단일 소스. DOM·부수효과 없음(단위 테스트 대상).
// 모드 5종: countdown / countup(+capSeconds 자동 종료) / emom(가변 인터벌) / tabata / interval
// 공통: preSeconds(시작 전 READY 카운트다운) — 본 타이머 경과는 pre 종료 후 0부터.
import type { TimerCommand, TimerMode } from '@/features/class-broadcast';

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
  };
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

/** 경과 초(elapsed, 시작부터 연속) → 표시 프레임. 순수 함수 — 비프/DOM은 훅이 담당. */
export function computeTimerFrame(cfg: TimerEngineConfig, elapsed: number): TimerFrame {
  // 프리 카운트다운 — 본 타이머와 독립된 준비 구간(READY 3-2-1-GO)
  if (cfg.preSeconds > 0 && elapsed < cfg.preSeconds) {
    const remain = cfg.preSeconds - elapsed;
    return {
      display: fmtClock(remain),
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
      display: fmtClock(remain),
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
      display: fmtClock(remain),
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
  const inCycle = t % cycle;
  const isWork = rest === 0 || inCycle < work;
  const remain = isWork ? work - inCycle : cycle - inCycle;
  return {
    display: fmtClock(remain),
    label: `${isWork ? 'WORK' : 'REST'} · ${unitLabel} ${n}/${units}`,
    phase: isWork ? 'work' : 'rest',
    secRemainInPhase: Math.ceil(remain),
    done: t >= cycle * units,
  };
}
