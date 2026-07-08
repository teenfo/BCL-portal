'use client';

// 표준 Card (docs/12-design-system §4.2)
// variant: default(surface+border) / raised(surface-raised+shadow) / accent(좌측 3px 보더)
import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export type CardVariant = 'default' | 'raised' | 'accent';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  /** header 슬롯 — 카드 제목 (h3) */
  title?: ReactNode;
  /** header 우측 액션 슬롯 */
  action?: ReactNode;
  /** footer 슬롯 — 버튼 우측 정렬 */
  footer?: ReactNode;
  children?: ReactNode;
}

export function Card({
  variant = 'default',
  title,
  action,
  footer,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = [
    styles.card,
    variant === 'raised' ? styles.raised : null,
    variant === 'accent' ? styles.accent : null,
    className ?? null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes} {...rest}>
      {title || action ? (
        <header className={styles.header}>
          {title ? <h3 className={styles.title}>{title}</h3> : <span />}
          {action ?? null}
        </header>
      ) : null}
      {children}
      {footer ? <footer className={styles.footer}>{footer}</footer> : null}
    </section>
  );
}
