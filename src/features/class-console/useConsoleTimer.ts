'use client';

// 초대형 수업 타이머 엔진 — 4모드(countdown/countup/emom/tabata).
// rAF + DOM 직접 조작(React 리렌더 우회, docs/05 §2·§3.2). 상태는 ref 보관.
// 외부 입력은 원격 명령(§4)뿐: apply(TimerCommand) 하나로 configure/start/pause/reset 수용.
import { useEffect, useRef } from 'react';
import type { TimerCommand, TimerMode } from '@/features/class-broadcast';
import { beepLow, beepHigh, beepEnd } from './audio';

export interface TimerDisplayRefs {
  /** 주 시간 텍스트(MM:SS) */
  time: React.RefObject<HTMLElement | null>;
  /** 보조 라벨(라운드/페이즈) — 옵션 */
  label?: React.RefObject<HTMLElement | null>;
  /** 배경/페이즈 색 전환 대상(루트) — 옵션(tabata work/rest) */
  phaseRoot?: React.RefObject<HTMLElement | null>;
}

interface TimerConfig {
  mode: TimerMode;
  seconds: number;
  intervalSeconds: number;
  totalRounds: number;
  workSeconds: number;
  restSeconds: number;
  totalSets: number;
}

const DEFAULT_CFG: TimerConfig = {
  mode: 'countdown',
  seconds: 600,
  intervalSeconds: 60,
  totalRounds: 10,
  workSeconds: 20,
  restSeconds: 10,
  totalSets: 8,
};

function fmt(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m < 10 ? '0' + m : m}:${r < 10 ? '0' + r : r}`;
}

interface TimerApi {
  apply: (cmd: TimerCommand) => void;
}

/** 타이머 엔진 훅 — 표시 ref를 받아 rAF로 직접 갱신. React state 미사용. */
export function useConsoleTimer(refs: TimerDisplayRefs): TimerApi {
  const cfgRef = useRef<TimerConfig>({ ...DEFAULT_CFG });
  const runningRef = useRef(false);
  const startAtRef = useRef(0); // performance.now() 기준
  const baseElapsedRef = useRef(0); // pause 누적 경과(초)
  const lastWholeSecRef = useRef(-1);
  const lastPhaseRef = useRef<string>('');
  const rafRef = useRef(0);
  const refsRef = useRef(refs);
  useEffect(() => {
    refsRef.current = refs;
  });

  useEffect(() => {
    const loop = () => {
      const cfg = cfgRef.current;
      const elapsed = runningRef.current
        ? baseElapsedRef.current + (performance.now() - startAtRef.current) / 1000
        : baseElapsedRef.current;

      let display = '';
      let label = '';
      let phase = '';

      if (cfg.mode === 'countup') {
        display = fmt(elapsed);
      } else if (cfg.mode === 'countdown') {
        const remain = cfg.seconds - elapsed;
        display = fmt(remain);
        if (remain <= 0 && runningRef.current) finish();
      } else if (cfg.mode === 'emom') {
        const round = Math.min(Math.floor(elapsed / cfg.intervalSeconds) + 1, cfg.totalRounds);
        const inRound = elapsed - (round - 1) * cfg.intervalSeconds;
        const remain = cfg.intervalSeconds - inRound;
        display = fmt(remain);
        label = `ROUND ${round} / ${cfg.totalRounds}`;
        phase = `emom-${round}`;
        if (elapsed >= cfg.intervalSeconds * cfg.totalRounds && runningRef.current) finish();
      } else if (cfg.mode === 'tabata') {
        const cycle = cfg.workSeconds + cfg.restSeconds;
        const set = Math.floor(elapsed / cycle) + 1;
        const inCycle = elapsed % cycle;
        const isWork = inCycle < cfg.workSeconds;
        const remain = isWork ? cfg.workSeconds - inCycle : cycle - inCycle;
        display = fmt(remain);
        label = `${isWork ? 'WORK' : 'REST'} · SET ${Math.min(set, cfg.totalSets)}/${cfg.totalSets}`;
        phase = isWork ? 'work' : 'rest';
        if (elapsed >= cycle * cfg.totalSets && runningRef.current) finish();
      }

      // 초 경계에서만 DOM 텍스트/비프 갱신
      const whole = Math.floor(elapsed);
      if (whole !== lastWholeSecRef.current) {
        lastWholeSecRef.current = whole;
        const t = refsRef.current.time.current;
        if (t) t.textContent = display;
        const l = refsRef.current.label?.current;
        if (l) l.textContent = label;

        // 카운트다운 3-2-1 비프
        if (runningRef.current && cfg.mode === 'countdown') {
          const remain = Math.ceil(cfg.seconds - elapsed);
          if (remain === 3 || remain === 2 || remain === 1) beepLow();
          if (remain === 0) beepHigh();
        }
      } else {
        // 초 경계가 아니어도 최초 프레임 텍스트 보장
        const t = refsRef.current.time.current;
        if (t && !t.textContent) t.textContent = display;
      }

      // 페이즈 전환(색·비프)
      if (phase !== lastPhaseRef.current) {
        const prev = lastPhaseRef.current;
        lastPhaseRef.current = phase;
        const root = refsRef.current.phaseRoot?.current;
        if (root) root.setAttribute('data-phase', phase.startsWith('emom') ? 'emom' : phase);
        if (runningRef.current && prev) beepHigh(); // 라운드/페이즈 시작 신호
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    function finish() {
      runningRef.current = false;
      baseElapsedRef.current = cfgRef.current.mode === 'countdown' ? cfgRef.current.seconds : baseElapsedRef.current;
      beepEnd();
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const apply = (cmd: TimerCommand) => {
    if (cmd.action === 'configure') {
      cfgRef.current = {
        mode: cmd.mode ?? cfgRef.current.mode,
        seconds: cmd.seconds ?? DEFAULT_CFG.seconds,
        intervalSeconds: cmd.intervalSeconds ?? DEFAULT_CFG.intervalSeconds,
        totalRounds: cmd.totalRounds ?? DEFAULT_CFG.totalRounds,
        workSeconds: cmd.workSeconds ?? DEFAULT_CFG.workSeconds,
        restSeconds: cmd.restSeconds ?? DEFAULT_CFG.restSeconds,
        totalSets: cmd.totalSets ?? DEFAULT_CFG.totalSets,
      };
      runningRef.current = false;
      baseElapsedRef.current = 0;
      lastWholeSecRef.current = -1;
      lastPhaseRef.current = '';
    } else if (cmd.action === 'start') {
      if (!runningRef.current) {
        startAtRef.current = performance.now();
        runningRef.current = true;
      }
    } else if (cmd.action === 'pause') {
      if (runningRef.current) {
        baseElapsedRef.current += (performance.now() - startAtRef.current) / 1000;
        runningRef.current = false;
      }
    } else if (cmd.action === 'reset') {
      runningRef.current = false;
      baseElapsedRef.current = 0;
      lastWholeSecRef.current = -1;
      lastPhaseRef.current = '';
    }
  };

  return { apply };
}
