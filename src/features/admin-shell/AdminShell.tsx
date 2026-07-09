'use client';

// Admin 셸 — Bootstrap 5.3 sidebars 스타일(브랜드 + 아이콘 pill 네비 + 하단 유저 드롭다운).
// 권한 게이트(can(group,'view')) + 그룹 아코디언은 유지. AuthGuard 통과 후 마운트.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMyPermissions } from '@/features/permissions';
import { useAuth } from '@/features/auth';
import { ADMIN_NAV, APP_LINKS } from './nav';
import { NavIcon } from './icons';
import styles from './AdminShell.module.css';

const ROLE_LABEL: Record<string, string> = { admin: '관리자', coach: '코치', member: '회원' };

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

  // 모바일 드로어(오프캔버스) — 데스크톱은 상시 사이드바, ≤860px는 햄버거 토글.
  //   네비 클릭 시 닫힘은 onClick(사용자 액션)으로 처리 — effect에서 setState 금지 규약.
  const [mobileOpen, setMobileOpen] = useState(false);
  // 열림 상태에서 Escape로 닫기
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // 아코디언 상태: 접힌 그룹 집합(기본 전체 펼침). 현재 경로가 속한 그룹은 항상 펼침.
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
      {/* 모바일 상단바 — 데스크톱 숨김(CSS). 햄버거로 드로어 열기 */}
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.hamburger}
          onClick={() => setMobileOpen(true)}
          aria-label="메뉴 열기"
          aria-expanded={mobileOpen}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <div className={styles.topbarBrand}>
          <NavIcon name="brand" className={styles.brandIcon} width={20} height={20} />
          <span>BCL Admin</span>
        </div>
      </header>

      {/* 드로어 백드롭 — 모바일 열림 시에만(CSS) */}
      <div
        className={`${styles.backdrop}${mobileOpen ? ` ${styles.backdropShow}` : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`${styles.sidebar}${mobileOpen ? ` ${styles.sidebarOpen}` : ''}`}
        aria-label="관리자 메뉴"
      >
        <div className={styles.brand}>
          <NavIcon name="brand" className={styles.brandIcon} width={22} height={22} />
          <span>BCL Admin</span>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={() => setMobileOpen(false)}
            aria-label="메뉴 닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

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
                    <NavLink key={it.href} item={it} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
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
                  <NavIcon
                    name="chevron"
                    width={14}
                    height={14}
                    className={`${styles.chevron}${isOpen ? ` ${styles.chevronOpen}` : ''}`}
                  />
                </button>
                {isOpen ? (
                  <div className={styles.groupItems}>
                    {group.items.map((it) => (
                      <NavLink key={it.href} item={it} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className={styles.appLinks}>
          <span className={styles.appLinksLabel}>앱 바로가기</span>
          {APP_LINKS.map((app) => (
            <a
              key={app.href}
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.appLink}
            >
              <NavIcon name={app.icon} className={styles.navIcon} />
              <span className={styles.navLabel}>{app.label}</span>
              <NavIcon name="external" width={13} height={13} className={styles.appLinkExt} />
            </a>
          ))}
        </div>

        <UserMenu />
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: { href: string; label: string; group: string };
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      className={`${styles.navItem}${active ? ` ${styles.navItemActive}` : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
    >
      <NavIcon name={item.group} className={styles.navIcon} />
      <span className={styles.navLabel}>{item.label}</span>
    </Link>
  );
}

// 하단 유저 드롭다운(Bootstrap sidebars 풋터 패턴) — 아바타 + 이름/역할 + 드롭업 메뉴.
function UserMenu() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const email = profile?.email ?? '';
  const namePart = email ? email.split('@')[0] : '관리자';
  const initial = (namePart.charAt(0) || 'A').toUpperCase();
  const roleLabel = ROLE_LABEL[profile?.role ?? 'admin'] ?? '관리자';

  return (
    <div className={styles.userMenu} ref={ref}>
      {open ? (
        <div className={styles.userDropdown} role="menu">
          <Link
            href="/admin/settings"
            className={styles.userDropdownItem}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <NavIcon name="settings" width={16} height={16} />
            설정
          </Link>
          <div className={styles.userDropdownDivider} />
          <Link href="/auth/logout" className={styles.userDropdownItem} role="menuitem">
            <NavIcon name="logout" width={16} height={16} />
            로그아웃
          </Link>
        </div>
      ) : null}
      <button
        type="button"
        className={styles.userToggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className={styles.avatar} aria-hidden="true">
          {initial}
        </span>
        <span className={styles.userInfo}>
          <span className={styles.userName}>{namePart}</span>
          <span className={styles.userRole}>{roleLabel}</span>
        </span>
        <NavIcon
          name="chevron"
          width={14}
          height={14}
          className={`${styles.userChevron}${open ? ` ${styles.userChevronOpen}` : ''}`}
        />
      </button>
    </div>
  );
}
