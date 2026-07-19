'use client';

// timer 모드 — 초대형 수업 타이머 (docs/05 §3.2). 원격 명령(§4)이 유일 외부 입력.
// rAF + DOM 직접 조작(useConsoleTimer). tabata work/rest 페이즈 컬러는 data-phase로 전환.
import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import type { TimerCommand } from '@/features/class-broadcast';
import { useConsoleTimer } from '../useConsoleTimer';
import styles from '../console.module.css';

export interface TimerModeHandle {
  apply: (cmd: TimerCommand) => void;
}

/** 상위(ConsoleShell)가 원격 timer 명령을 ref.apply()로 주입 */
export const TimerMode = forwardRef<TimerModeHandle>(function TimerMode(_props, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const timer = useConsoleTimer({ time: timeRef, label: labelRef, phaseRoot: rootRef });

  useImperativeHandle(ref, () => ({ apply: timer.apply }), [timer]);

  // 초기 표시값 세팅(명령 도착 전 00:00)
  useEffect(() => {
    if (timeRef.current && !timeRef.current.textContent) timeRef.current.textContent = '00:00';
  }, []);

  return (
    <div ref={rootRef} className={styles.timerRoot} data-phase="">
      <div ref={labelRef} className={styles.timerLabel} />
      <div ref={timeRef} className={styles.timerTime} />
    </div>
  );
});
