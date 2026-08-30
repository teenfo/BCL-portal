'use client';

// 초대형 수업 타이머 — rAF + DOM 직접 조작 훅 (docs/05 §2·§3.2). 상태는 ref 보관.
// 프레임 계산은 timer-engine.ts(순수 함수) 단일 소스 — 이 훅은 구동/비프/DOM만 담당.
// 외부 입력은 원격 명령(§4)뿐: apply(TimerCommand) 하나로 configure/start/pause/reset 수용.
//
// 비프 규약(timer v2): 각 페이즈 마지막 3초 숏비프(3-2-1) → 페이즈 전환 롱비프(GO 포함)
//   → 전체 종료 엔드 차임. countdown의 기존 3-2-1도 동일 규약으로 흡수.
import { useEffect, useRef } from 'react';
import type { TimerCommand } from '@/features/class-broadcast';
import {
  DEFAULT_ENGINE_CFG,
  computeTimerFrame,
  configFromCommand,
  timerTypeLabel,
  totalDuration,
  type TimerEngineConfig,
} from './timer-engine';
import { beepLow, beepHigh, beepEnd } from './audio';

export interface TimerDisplayRefs {
  /** 주 시간 텍스트(MM:SS) */
  time: React.RefObject<HTMLElement | null>;
  /** 보조 라벨(라운드/페이즈) — 옵션 */
  label?: React.RefObject<HTMLElement | null>;
  /** 타이머 타입 배지(TABATA·EMOM·AMRAP 등) — 옵션 */
  type?: React.RefObject<HTMLElement | null>;
  /** 배경/페이즈 색 전환 대상(루트) — 옵션(work/rest/pre/emom) */
  phaseRoot?: React.RefObject<HTMLElement | null>;
}

interface TimerApi {
  apply: (cmd: TimerCommand) => void;
  /**
   * 현재 경과 초(pre 포함, 정지 중이면 고정값). 같은 시계 위에 얹는 파생 표시
   * (시차 출발 조별 카운트다운 등)가 별도 엔진 없이 읽어 쓴다.
   */
  getElapsed: () => number;
}

/** 타이머 엔진 훅 — 표시 ref를 받아 rAF로 직접 갱신. React state 미사용. */
export function useConsoleTimer(refs: TimerDisplayRefs): TimerApi {
  const cfgRef = useRef<TimerEngineConfig>({ ...DEFAULT_ENGINE_CFG });
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

      const frame = computeTimerFrame(cfg, elapsed);

      if (frame.done && runningRef.current) {
        // 자동 종료 — 경과를 정확히 종점에 고정(재개 방지, 표시 잔상 제거)
        runningRef.current = false;
        baseElapsedRef.current = totalDuration(cfg) ?? elapsed;
        beepEnd();
      }

      // 초 경계에서만 DOM 텍스트/비프 갱신
      const phaseChanged = frame.phase !== lastPhaseRef.current;
      const whole = Math.floor(elapsed);
      if (whole !== lastWholeSecRef.current) {
        lastWholeSecRef.current = whole;
        const t = refsRef.current.time.current;
        if (t) t.textContent = frame.display;
        const l = refsRef.current.label?.current;
        if (l) l.textContent = frame.label;
        const ty = refsRef.current.type?.current;
        if (ty) ty.textContent = timerTypeLabel(cfg);

        // 페이즈 마지막 3초 숏비프(3-2-1) — pre 카운트다운·countdown 종료 임박·라운드 전환 경고 공통.
        // 전환 프레임은 제외 — 새 페이즈가 3초 이하일 때 진입 롱비프와 겹쳐 울리는 것 방지.
        if (
          runningRef.current &&
          !frame.done &&
          !phaseChanged &&
          frame.secRemainInPhase >= 1 &&
          frame.secRemainInPhase <= 3
        ) {
          beepLow();
        }
      } else {
        // 초 경계가 아니어도 최초 프레임 텍스트 보장
        const t = refsRef.current.time.current;
        if (t && !t.textContent) t.textContent = frame.display;
      }

      // 페이즈 전환(색·롱비프) — pre→본 타이머 'GO', work↔rest, 라운드 경계
      // (emom-N·work-N은 라운드 번호 포함 키 — CSS data-phase는 기본 페이즈명으로 정규화)
      if (phaseChanged) {
        const prev = lastPhaseRef.current;
        lastPhaseRef.current = frame.phase;
        const root = refsRef.current.phaseRoot?.current;
        if (root) {
          root.setAttribute(
            'data-phase',
            frame.phase.startsWith('emom')
              ? 'emom'
              : frame.phase.startsWith('work')
                ? 'work'
                : frame.phase,
          );
        }
        // 센티널(' ')은 재구성 직후 첫 기록 — 전환음 없음(기존 configure 무비프 의미론 유지)
        if (runningRef.current && prev && prev !== ' ' && !frame.done) beepHigh();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const apply = (cmd: TimerCommand) => {
    if (cmd.action === 'configure') {
      cfgRef.current = configFromCommand(cmd, cfgRef.current.mode);
      runningRef.current = false;
      baseElapsedRef.current = 0;
      lastWholeSecRef.current = -1;
      // 센티널 — 다음 프레임에서 data-phase를 반드시 재기록(직전 모드 페이즈 배경 잔존 방지)
      lastPhaseRef.current = ' ';
    } else if (cmd.action === 'start') {
      // 자동 종료 지점에 도달한 타이머는 재개 불가 — start 재수신마다 done 재판정→엔드 차임
      // 반복 재생되는 것 방지(재구동은 configure/reset 경유가 정본)
      const total = totalDuration(cfgRef.current);
      if (total != null && baseElapsedRef.current >= total) return;
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
      lastPhaseRef.current = ' '; // 센티널 — configure와 동일(페이즈 배경 재기록)
    }
  };

  const getElapsed = () =>
    runningRef.current
      ? baseElapsedRef.current + (performance.now() - startAtRef.current) / 1000
      : baseElapsedRef.current;

  return { apply, getElapsed };
}
