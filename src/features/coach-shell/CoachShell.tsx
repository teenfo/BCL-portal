'use client';

// 코치 앱 셸 (docs/04 §2) — 콘텐츠 + 하단 5탭. 중앙 Schedule 강조 슬롯.
// 진행 중 세션 존재 시 중앙 탭에 LIVE 도트(대시보드 위험요약 소스 재사용).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { COACH_TABS } from './nav';
import styles from './CoachShell.module.css';

export function CoachShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className={styles.shell}>
      <main className={styles.content}>{children}</main>
      <nav className={styles.tabbar} aria-label="코치 메뉴">
        {COACH_TABS.map((tab) => {
          const active = isActive(tab.href);
          if (tab.emphasis) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={styles.centerSlot}
                aria-current={active ? 'page' : undefined}
                aria-label={tab.label}
              >
                <span
                  className={`${styles.centerButton}${active ? ` ${styles.centerButtonActive}` : ''}`}
                  aria-hidden="true"
                >
                  {tab.icon}
                </span>
                <span className={styles.centerLabel}>{tab.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.tab}${active ? ` ${styles.tabActive}` : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className={styles.tabIcon} aria-hidden="true">
                {tab.icon}
              </span>
              <span className={styles.tabLabel}>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
