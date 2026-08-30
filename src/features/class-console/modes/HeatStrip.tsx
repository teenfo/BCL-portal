'use client';

// 시차 출발(waterfall) 조 패널 — 기획서 1-3. flow 세그먼트의 heats 플랜을 렌더한다.
// 별도 타이머 엔진을 두지 않는다: 세그먼트 타이머의 경과(getElapsed)를 읽어
// 조 h의 출발 시각(pre + h×stagger)과 비교할 뿐 — 두 시계가 어긋날 여지가 없다.
// Class 화면 규칙대로 rAF + DOM 직접 조작(React 리렌더 우회).
import { useEffect, useRef } from 'react';
import type { HeatPlan } from '@/features/class-broadcast';
import { computeHeatFrames, heatCount } from '../timer-engine';
import styles from '../console.module.css';

export function HeatStrip({
  plan,
  preSeconds,
  getElapsed,
}: {
  plan: HeatPlan;
  /** 세그먼트 타이머의 READY 초 — 조 출발 기준점(본 타이머 0초 = 1조 출발) */
  preSeconds: number;
  getElapsed: () => number;
}) {
  const n = heatCount(plan);
  const rowsRef = useRef<(HTMLLIElement | null)[]>([]);
  const timesRef = useRef<(HTMLSpanElement | null)[]>([]);
  // rAF 루프가 최신 플랜·시계를 읽도록 미러(루프는 마운트 1회만 건다 — 프레임 연속성)
  const planRef = useRef({ plan, preSeconds });
  const getElapsedRef = useRef(getElapsed);
  useEffect(() => {
    planRef.current = { plan, preSeconds };
    getElapsedRef.current = getElapsed;
  });

  useEffect(() => {
    if (n === 0) return;
    let raf = 0;
    const loop = () => {
      const { plan: p, preSeconds: pre } = planRef.current;
      const frames = computeHeatFrames(p, pre, getElapsedRef.current());
      for (const f of frames) {
        const t = timesRef.current[f.index];
        // go 상태는 시간 대신 큰 'GO' — 출발 신호를 놓치지 않도록
        const text = f.state === 'go' ? 'GO' : f.display;
        if (t && t.textContent !== text) t.textContent = text;
        const row = rowsRef.current[f.index];
        if (row && row.dataset.state !== f.state) row.dataset.state = f.state;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [n]);

  if (n === 0) return null;
  const stagger = Math.max(1, Math.floor(plan.staggerSeconds) || 0);
  const frames = computeHeatFrames(plan, preSeconds, getElapsed());

  return (
    <div className={styles.heatStrip}>
      <div className={styles.heatHead}>
        <span className={styles.heatTag}>시차 출발</span>
        <span className={styles.heatMeta}>
          {n}조 · {stagger}초 간격
        </span>
      </div>
      <ol className={styles.heatList}>
        {frames.map((f) => (
          <li
            key={f.index}
            ref={(el) => {
              rowsRef.current[f.index] = el;
            }}
            className={styles.heatRow}
            data-state={f.state}
          >
            <span className={styles.heatName}>{f.label}</span>
            <span
              ref={(el) => {
                timesRef.current[f.index] = el;
              }}
              className={styles.heatTime}
            >
              {f.state === 'go' ? 'GO' : f.display}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
