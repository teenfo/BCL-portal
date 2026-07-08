'use client';

// 스테이션 서킷 HUD (docs/05 §5.2) — 6분할, 라운드·전환 카운트다운, 코치 리모컨 실시간 연동.
// 타이머 rAF(로컬 진행) — 남은 시간은 timer_started_at + seconds_per_round에서 산출.
// Display-Safe: 팀 배정 이름만(회원 판정·메모 없음).
import { useEffect, useRef } from 'react';
import { StatusStrip } from '@/features/class-common';
import { useRotationSync, type StationAssignment } from './useRotationSync';
import styles from './rotation.module.css';

function remainingSeconds(
  isRunning: boolean,
  startedAt: string | null,
  perRound: number,
  pausedRemain: number | null,
): number {
  if (!isRunning) return pausedRemain ?? perRound;
  if (!startedAt) return perRound;
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  return Math.max(0, perRound - (elapsed % Math.max(perRound, 1)));
}

export function RotationHud({ sessionId }: { sessionId: string | null }) {
  const { state, loaded } = useRotationSync(sessionId);
  const timeRef = useRef<HTMLDivElement>(null);

  // rAF 타이머(초 경계 DOM 직접 갱신)
  useEffect(() => {
    if (!state) return;
    let raf = 0;
    let lastSec = -1;
    const loop = () => {
      const remain = remainingSeconds(
        state.is_running,
        state.timer_started_at,
        state.seconds_per_round,
        state.paused_remaining_seconds,
      );
      const whole = Math.ceil(remain);
      if (whole !== lastSec) {
        lastSec = whole;
        if (timeRef.current) {
          const m = Math.floor(whole / 60);
          const s = whole % 60;
          timeRef.current.textContent = `${m}:${s < 10 ? '0' + s : s}`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  if (!sessionId) {
    return (
      <div className={styles.hudRoot}>
        <div className={styles.hudEmpty}>세션이 지정되지 않았습니다 (?session=)</div>
      </div>
    );
  }
  if (loaded && !state) {
    return (
      <div className={styles.hudRoot}>
        <div className={styles.hudEmpty}>서킷 상태를 불러올 수 없습니다</div>
      </div>
    );
  }

  const stations: StationAssignment[] = state?.team_assignments ?? [];

  return (
    <div className={styles.hudRoot}>
      <StatusStrip realtime={state ? 'connected' : 'connecting'} />
      <header className={styles.hudHead}>
        <div className={styles.hudRound}>
          ROUND {state?.current_round ?? 1} / {state?.total_rounds ?? '-'}
        </div>
        <div ref={timeRef} className={styles.hudTimer} data-run={state?.is_running ? 'true' : 'false'}>
          0:00
        </div>
        <div className={styles.hudState}>{state?.is_running ? 'WORK' : 'READY'}</div>
      </header>

      <div className={styles.stationGrid} data-count={stations.length}>
        {stations.map((st, i) => (
          <div key={i} className={styles.station}>
            <div className={styles.stationHead}>
              <span className={styles.stationNo}>{st.station ?? i + 1}</span>
              <span className={styles.stationTask}>{st.task ?? st.label ?? `스테이션 ${i + 1}`}</span>
            </div>
            <ul className={styles.stationMembers}>
              {(st.members ?? []).map((m, j) => (
                <li key={j} className={styles.stationMember}>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
