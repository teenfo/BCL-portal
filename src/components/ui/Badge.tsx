// 표준 Badge (docs/12-design-system §4.5)
// variant neutral/accent/success/warning/danger/info — 전부 -soft 배경 + 상태색 텍스트
// size md/sm, pill 옵션 · 라벨 텍스트 필수(색만으로 구분 금지)
import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeVariant =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';
export type BadgeSize = 'md' | 'sm';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** 완전 둥근 알약 형태 */
  pill?: boolean;
  children: ReactNode;
}

/**
 * 상태 → 배지 variant 매핑 상수 (docs/12 §4.5 — 화면별 임의 매핑 금지).
 * 화면은 이 표를 참조하고 자체 색 조합을 만들지 않는다.
 */
export const STATUS_BADGE: Record<string, BadgeVariant> = {
  // 출결
  출석: 'success',
  예약: 'info',
  대기: 'warning',
  노쇼: 'danger',
  // 승인 흐름
  승인: 'success',
  승인대기: 'warning',
  거부: 'danger',
  // 멤버십 상태
  활성: 'success',
  만료임박: 'warning',
  만료: 'danger',
  정지: 'neutral',
  // 결제
  결제완료: 'success',
  결제대기: 'warning',
  환불: 'neutral',
  실패: 'danger',
};

export function Badge({ variant = 'neutral', size = 'md', pill = false, children }: BadgeProps) {
  const classes = [
    styles.badge,
    styles[variant],
    styles[size],
    pill ? styles.pill : null,
  ]
    .filter(Boolean)
    .join(' ');
  return <span className={classes}>{children}</span>;
}
