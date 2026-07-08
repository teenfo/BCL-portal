'use client';

// 표준 Skeleton (docs/12-design-system §4.11)
// variant: text/rect/circle. aria-busy + 스크린리더 "불러오는 중" 1회 고지.
// 소비처는 4s 타임아웃 후 반드시 에러 표면화로 전이해야 한다 (F-5).
import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

export type SkeletonVariant = 'text' | 'rect' | 'circle';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  /** 치수(레이아웃 값) — 색상이 아니므로 인라인 전달 허용 */
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  className?: string;
  /** 스크린리더 고지 문구 — 같은 화면에 스켈레톤 여럿이면 1개만 남기고 빈 문자열 전달 */
  srLabel?: string;
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  className,
  srLabel = '불러오는 중',
}: SkeletonProps) {
  const classes = [styles.skeleton, styles[variant], className ?? null].filter(Boolean).join(' ');
  return (
    <div aria-busy="true" className={styles.wrap}>
      {srLabel ? <span className={styles.srOnly}>{srLabel}</span> : null}
      <div className={classes} style={{ width, height }} aria-hidden="true" />
    </div>
  );
}
