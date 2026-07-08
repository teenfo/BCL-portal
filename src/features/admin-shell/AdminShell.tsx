'use client';

// Admin 셸 — 사이드바(권한 게이트) + 메인 콘텐츠 영역 (02-admin §2.1)
// AuthGuard 통과 후(레이아웃) 마운트되므로 여기서는 권한 로딩·미노출만 담당.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMyPermissions } from '@/features/permissions';
import { ADMIN_NAV } from './nav';
import styles from './AdminShell.module.css';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can, loading } = useMyPermissions();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="관리자 메뉴">
        <div className={styles.brand}>BCL Admin</div>
        <nav className={styles.nav}>
          {ADMIN_NAV.map((group, gi) => {
            const visibleItems = group.items.filter((it) => loading || can(it.group, 'view'));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.header ?? `top-${gi}`} className={styles.group}>
                {group.header ? <div className={styles.groupHeader}>{group.header}</div> : null}
                {visibleItems.map((it) => {
                  const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={`${styles.navItem}${active ? ` ${styles.navItemActive}` : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <Link href="/auth/logout" className={styles.logout}>
          로그아웃
        </Link>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
