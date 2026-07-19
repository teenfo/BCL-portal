'use client';

// 하단탭 5 (docs/03 §2.3 IA 순서: home/schedule/checkin/performance/profile)
// 탭 셸은 회원 셸에 자체 구현(shared kit 미변경). 비탭 스택 화면에서는 렌더하지 않는다.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './BottomNav.module.css';

interface TabDef {
  href: string;
  label: string;
  icon: ReactNode;
}

const icon = (path: ReactNode) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {path}
  </svg>
);

export const MEMBER_TABS: TabDef[] = [
  {
    href: '/apps/home',
    label: '홈',
    icon: icon(<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />),
  },
  {
    href: '/apps/schedule',
    label: '수업',
    icon: icon(<><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>),
  },
  {
    href: '/apps/checkin',
    label: '체크인',
    icon: icon(<><rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" /><rect x="4" y="13" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" /><rect x="13" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" /><path d="M13 14h3v3M20 20v-3M17 20h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>),
  },
  {
    href: '/apps/performance',
    label: '성과',
    icon: icon(<path d="M4 19V5m0 14h16M8 15l3-4 3 2 4-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />),
  },
  {
    href: '/apps/profile',
    label: '프로필',
    icon: icon(<><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" /><path d="M4 20c0-3.3 3.6-5 8-5s8 1.7 8 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="주요 메뉴">
      {MEMBER_TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`${styles.tab} ${active ? styles.active : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.icon}>{t.icon}</span>
            <span className={styles.label}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
