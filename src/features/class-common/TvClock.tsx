'use client';

// 대형 시계 — rAF + DOM 직접 조작(React 리렌더 우회, docs/05 §2 성능 규칙).
// 번인 방지: 60s 주기로 1~2px 시프트(docs/05 §2 번인 방지).
import { useEffect, useRef } from 'react';
import styles from './tv.module.css';

interface TvClockProps {
  /** 초 표시 여부 */
  showSeconds?: boolean;
  /** 대형(screen 모드) 여부 */
  large?: boolean;
}

function two(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function TvClock({ showSeconds = true, large = false }: TvClockProps) {
  const timeRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let lastSec = -1;
    let lastMin = -1;
    const days = ['일', '월', '화', '수', '목', '금', '토'];

    const loop = () => {
      const now = new Date();
      const s = now.getSeconds();
      if (s !== lastSec) {
        lastSec = s;
        if (timeRef.current) {
          timeRef.current.textContent = showSeconds
            ? `${two(now.getHours())}:${two(now.getMinutes())}:${two(s)}`
            : `${two(now.getHours())}:${two(now.getMinutes())}`;
        }
        const m = now.getMinutes();
        if (m !== lastMin) {
          lastMin = m;
          if (dateRef.current) {
            dateRef.current.textContent = `${now.getFullYear()}.${two(
              now.getMonth() + 1,
            )}.${two(now.getDate())} (${days[now.getDay()]})`;
          }
        }
        // 번인 방지: 60s 주기로 미세 시프트
        if (wrapRef.current) {
          const phase = Math.floor(now.getTime() / 60_000) % 4;
          const dx = phase === 1 || phase === 2 ? 2 : 0;
          const dy = phase === 2 || phase === 3 ? 2 : 0;
          wrapRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [showSeconds]);

  return (
    <div ref={wrapRef} className={large ? styles.clockLarge : styles.clock}>
      <div ref={timeRef} className={styles.clockTime} />
      <div ref={dateRef} className={styles.clockDate} />
    </div>
  );
}
