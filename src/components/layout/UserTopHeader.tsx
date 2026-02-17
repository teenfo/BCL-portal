'use client';

import Link from 'next/link';

import { usePathname, useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';

// Pages where logo is shown (main tabs)
const MAIN_PAGES = ['/apps/dashboard', '/apps/schedule', '/apps/checkin', '/apps/facilities', '/apps/profile'];

// Page titles for sub-pages
const PAGE_TITLES: Record<string, string> = {
    '/apps/purchase': '이용권 구매',
    '/apps/feedback': '피드백',
    '/apps/records': '운동 기록',
    '/apps/notifications': '알림',
    '/apps/leaderboard': '리더보드',
    '/apps/badges': '배지',
    '/apps/coaches': '코치 소개',
    '/apps/schedule/bookings': '나의 예약',
    '/apps/profile/edit': '프로필 편집',
    '/apps/profile/memberships': '멤버십 관리',
    '/apps/profile/notifications': '알림 설정',
    '/apps/profile/payments': '결제 내역',
    '/apps/profile/settings': '설정',
    '/apps/profile/support': '고객 지원',
};

export default function UserTopHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { unreadCount } = useNotifications();

    const isMainPage = MAIN_PAGES.some(p => pathname === p || (p === '/apps/dashboard' && pathname === '/apps'));
    const pageTitle = PAGE_TITLES[pathname || ''] || '';

    if (isMainPage) {
        // Main page layout: Branch | Logo | Bell + Avatar
        return (
            <header className="user-top-header" role="banner">
                <div className="user-top-header-inner">
                    <div className="uth-left">
                        <span className="uth-branch-name">BCL Gangnam</span>
                    </div>
                    <div className="uth-center">
                        <img
                            src="/images/logo/bcl-logo.svg"
                            alt="BCL Logo"
                            width={32}
                            height={32}
                            className="uth-logo"
                        />
                    </div>
                    <div className="uth-right">
                        <Link href="/apps/notifications" className="uth-icon-btn" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="uth-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                            )}
                        </Link>
                    </div>
                </div>
            </header>
        );
    }

    // Sub-page layout: Back | Title | Action
    return (
        <header className="user-top-header sub-page" role="banner">
            <div className="user-top-header-inner">
                <div className="uth-left">
                    <button
                        onClick={() => router.back()}
                        className="uth-back-btn"
                        aria-label="Go back"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                </div>
                <div className="uth-center">
                    <h1 className="uth-page-title">{pageTitle}</h1>
                </div>
                <div className="uth-right">
                    {/* Spacer for alignment */}
                    <div style={{ width: 36 }} />
                </div>
            </div>
        </header>
    );
}
