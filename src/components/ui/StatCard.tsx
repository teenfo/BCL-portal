// 표준 StatCard (docs/12-design-system §4.12)
// variant default(라벨+값) / trend(▲▼ 증가=success·감소=danger, invert prop) / progress(게이지)
// 라벨(caption·muted) → 값(display·tabular-nums) → 보조
// loading(Skeleton) / error(값 자리 "—") · trend 화살표 텍스트 대체
import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import styles from './StatCard.module.css';

export type StatCardVariant = 'default' | 'trend' | 'progress';

export interface StatCardProps {
  variant?: StatCardVariant;
  label: string;
  value: ReactNode;
  /** 보조 텍스트 (기간 등) */
  hint?: string;
  /** trend: 전기 대비 변화율(%) — 양수=증가, 음수=감소 */
  trend?: number;
  /** trend: 감소가 좋은 지표(노쇼율 등)면 true — 색 반전 */
  invert?: boolean;
  /** progress: 0~1 진행률 */
  progress?: number;
  loading?: boolean;
  error?: boolean;
}

function trendText(trend: number): string {
  if (trend > 0) return `전기 대비 ${Math.abs(trend)}% 증가`;
  if (trend < 0) return `전기 대비 ${Math.abs(trend)}% 감소`;
  return '전기 대비 변화 없음';
}

export function StatCard({
  variant = 'default',
  label,
  value,
  hint,
  trend,
  invert = false,
  progress,
  loading = false,
  error = false,
}: StatCardProps) {
  const isUp = typeof trend === 'number' && trend > 0;
  const isDown = typeof trend === 'number' && trend < 0;
  // 증가=success·감소=danger, invert면 반전
  const positive = invert ? isDown : isUp;
  const negative = invert ? isUp : isDown;
  const trendTone = positive ? styles.up : negative ? styles.down : styles.flat;
  const pct = typeof progress === 'number' ? Math.max(0, Math.min(1, progress)) : 0;

  return (
    <div className={styles.card}>
      <p className={styles.label}>{label}</p>

      {loading ? (
        <Skeleton variant="text" width="60%" height="calc(32px * var(--bcl-font-scale))" />
      ) : (
        <p className={styles.value}>{error ? '—' : value}</p>
      )}

      {!loading && variant === 'trend' && typeof trend === 'number' && !error ? (
        <p className={[styles.trend, trendTone].join(' ')}>
          <span aria-hidden="true" className={styles.arrow}>
            {isUp ? '▲' : isDown ? '▼' : '—'}
          </span>
          <span className={styles.srOnly}>{trendText(trend)}</span>
          <span aria-hidden="true">{Math.abs(trend)}%</span>
          {hint ? <span className={styles.trendHint}>{hint}</span> : null}
        </p>
      ) : null}

      {!loading && variant === 'progress' && !error ? (
        <div className={styles.gauge} role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.gaugeFill} style={{ width: `${pct * 100}%` }} />
        </div>
      ) : null}

      {!loading && variant === 'default' && hint && !error ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}

      {!loading && variant === 'progress' && hint && !error ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
}
