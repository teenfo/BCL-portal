'use client';

// 비탭 스택 화면(purchase/feedback/notifications) 상단 back 헤더
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './StackHeader.module.css';

export function StackHeader({
  title,
  action,
  fallbackHref = '/apps/home',
}: {
  title: ReactNode;
  action?: ReactNode;
  fallbackHref?: string;
}) {
  const router = useRouter();
  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  };
  return (
    <header className={styles.header}>
      <button type="button" className={styles.back} onClick={back} aria-label="뒤로">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.action}>{action}</div>
    </header>
  );
}
