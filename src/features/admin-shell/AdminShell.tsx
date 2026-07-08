'use client';

// Admin 셸 — 사이드바(권한 게이트 + 그룹 아코디언) + 메인 콘텐츠 영역 (02-admin §2.1)
// AuthGuard 통과 후(레이아웃) 마운트되므로 여기서는 권한 로딩·미노출만 담당.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMyPermissions } from '@/features/permissions';
import { ADMIN_NAV } from './nav';
import styles from './AdminShell.module.css';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can, loading } = useMyPermissions();

  // 권한 필터링된 그룹 (view 없으면 미노출)
  const groups = useMemo(
    () =>
      ADMIN_NAV.map((group) => ({
        ...group,
        items: group.items.filter((it) => loading || can(it.group, 'view')),
      })).filter((group) => group.items.length > 0),
    [can, loading],
  );

  // 아코디언 상태: 접힌 그룹 집합(기본 전체 펼침). 현재 경로가 속한 그룹은 항상 펼침 처리.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (header: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(header)) next.delete(header);
      else next.add(header);
      return next;
    });

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="관리자 메뉴">
        <div className={styles.brand}>BCL Admin</div>
        <nav className={styles.nav}>
          {groups.map((group, gi) => {
            const hasActive = group.items.some(
              (it) => pathname === it.href || pathname.startsWith(`${it.href}/`),
            );

            // 헤더 없는 그룹(대시보드/설정) — 항상 노출, 아코디언 아님
            if (!group.header) {
              return (
                <div key={`top-${gi}`} className={styles.group}>
                  {group.items.map((it) => (
                    <NavLink key={it.href} href={it.href} label={it.label} pathname={pathname} />
                  ))}
                </div>
              );
            }

            const isOpen = !collapsed.has(group.header) || hasActive;
            return (
              <div key={group.header} className={styles.group}>
                <button
                  type="button"
                  className={styles.groupHeader}
                  onClick={() => toggle(group.header!)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.groupLabel}>{group.header}</span>
                  <span
                    className={`${styles.chevron}${isOpen ? ` ${styles.chevronOpen}` : ''}`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </button>
                {isOpen ? (
                  <div className={styles.groupItems}>
                    {group.items.map((it) => (
                      <NavLink key={it.href} href={it.href} label={it.label} pathname={pathname} />
                    ))}
                  </div>
                ) : null}
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

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`${styles.navItem}${active ? ` ${styles.navItemActive}` : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  );
}
