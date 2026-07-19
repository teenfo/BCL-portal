'use client';

// 우상단 상태 스트립 — 시각·Realtime 연결 도트·시설·stale 배지 (docs/05 §3.3, §2 무인 내구성).
import styles from './tv.module.css';
import type { RealtimeStatus } from '@/features/class-broadcast';

interface StatusStripProps {
  facilityLabel?: string | null;
  realtime?: RealtimeStatus;
  /** 데이터 폴링 실패로 직전 데이터 표시 중 */
  stale?: boolean;
  /** 폴백 폴링 모드(Broadcast 대신 REST 폴링) 표시 */
  polling?: boolean;
}

const DOT_CLASS: Record<RealtimeStatus, string> = {
  connected: 'dotOk',
  connecting: 'dotWarn',
  error: 'dotErr',
};

export function StatusStrip({ facilityLabel, realtime, stale, polling }: StatusStripProps) {
  return (
    <div className={styles.statusStrip} role="status" aria-live="polite">
      {realtime ? (
        <span className={styles.statusItem}>
          <span className={`${styles.dot} ${styles[DOT_CLASS[realtime]]}`} />
          {realtime === 'connected' ? '연결' : realtime === 'connecting' ? '연결 중' : '재연결'}
        </span>
      ) : null}
      {polling ? <span className={styles.statusBadge}>폴링</span> : null}
      {stale ? <span className={`${styles.statusBadge} ${styles.statusStale}`}>오프라인</span> : null}
      {facilityLabel ? <span className={styles.statusItem}>{facilityLabel}</span> : null}
    </div>
  );
}
