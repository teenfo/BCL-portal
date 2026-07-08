// 표준 EmptyState (docs/12-design-system §4.10)
// variant empty(아이콘+제목+설명+CTA1) / error(danger 아이콘+[다시 시도]+보조 탈출구)
//        / no-result([필터 초기화])
// 모든 데이터 뷰 필수(공백 화면 금지). 아이콘은 인라인 SVG(aria-hidden), CTA는 Button.
import type { ReactNode } from 'react';
import { Button } from './Button';
import styles from './EmptyState.module.css';

export type EmptyStateVariant = 'empty' | 'error' | 'no-result';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  /** 주 CTA (empty=주요 행동, no-result=필터 초기화) */
  action?: EmptyStateAction;
  /** error variant 재시도 핸들러 — [다시 시도] 버튼 */
  onRetry?: () => void;
  /** error variant 보조 탈출구 (예: 홈으로) */
  secondaryAction?: EmptyStateAction;
}

function Icon({ variant }: { variant: EmptyStateVariant }) {
  if (variant === 'error') {
    return (
      <svg viewBox="0 0 48 48" className={styles.iconError} aria-hidden="true">
        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M24 14v14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="34" r="1.6" fill="currentColor" />
      </svg>
    );
  }
  if (variant === 'no-result') {
    return (
      <svg viewBox="0 0 48 48" className={styles.icon} aria-hidden="true">
        <circle cx="21" cy="21" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M31 31l10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={styles.icon} aria-hidden="true">
      <rect x="8" y="12" width="32" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M8 20h32" stroke="currentColor" strokeWidth="2.5" />
      <path d="M15 28h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({
  variant = 'empty',
  title,
  description,
  action,
  onRetry,
  secondaryAction,
}: EmptyStateProps): ReactNode {
  return (
    <div className={styles.root} role={variant === 'error' ? 'alert' : undefined}>
      <Icon variant={variant} />
      <p className={styles.title}>{title}</p>
      {description ? <p className={styles.description}>{description}</p> : null}
      <div className={styles.actions}>
        {variant === 'error' && onRetry ? (
          <Button variant="primary" onClick={onRetry}>
            다시 시도
          </Button>
        ) : null}
        {action ? (
          <Button variant={variant === 'error' ? 'ghost' : 'primary'} onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
        {secondaryAction ? (
          <Button variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
