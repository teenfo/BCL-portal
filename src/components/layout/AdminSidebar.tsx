'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import Logo from '@/components/ui/Logo';
import { APP_VERSION, BUILD_DATE, CHANGELOG } from '@/lib/version';

interface MenuItem {
    name: string;
    href: string;
    icon: React.ReactNode;
}

interface MenuGroup {
    label: string;
    items: MenuItem[];
}

// --- SVG Icon Components (matching reference design) ---
const IconDashboard = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 4-8" />
    </svg>
);

const IconReports = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
);

const IconMembers = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
);

const IconPayments = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
);

const IconSchedule = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const IconBookings = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10,9 9,9 8,9" />
    </svg>
);

const IconCoaches = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
);

const IconReservations = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M9 14l2 2 4-4" />
    </svg>
);

const IconRace = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
);

const IconInfrastructure = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
);

const IconRoles = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const IconLockers = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <rect x="5" y="7" width="4" height="4" rx="0.5" />
        <rect x="15" y="7" width="4" height="4" rx="0.5" />
        <circle cx="7" cy="16" r="1" />
        <circle cx="17" cy="16" r="1" />
    </svg>
);

const IconBranch = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
);

const IconSettings = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
);

const IconAudit = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
    </svg>
);

const IconCheckins = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9,11 12,14 22,4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
);

const IconPlans = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
);

const IconTransactions = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
);

const IconContent = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
);

const IconNotifications = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
);

const IconSupport = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0118 0v6" />
        <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
    </svg>
);

const IconFeedback = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
);

const IconMemberships = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
        <line x1="6" y1="15" x2="10" y2="15" />
    </svg>
);

const IconSystemLink = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
);

const IconAttendance = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
    </svg>
);

const IconRevenue = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
);

const IconCoachInsights = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

// --- Menu structure matching the reference design ---
const menuGroups: MenuGroup[] = [
    {
        label: 'INSIGHTS',
        items: [
            { name: 'Dashboard', href: '/admin/dashboard', icon: <IconDashboard /> },
            { name: 'Attendance', href: '/admin/insights/attendance', icon: <IconAttendance /> },
            { name: 'Revenue', href: '/admin/insights/finance', icon: <IconRevenue /> },
        ],
    },
    {
        label: 'USER & FINANCE',
        items: [
            { name: 'Members', href: '/admin/members', icon: <IconMembers /> },
            { name: 'Memberships', href: '/admin/memberships', icon: <IconMemberships /> },
            { name: 'Check-in Logs', href: '/admin/checkins', icon: <IconCheckins /> },
            { name: 'Plans', href: '/admin/plans', icon: <IconPlans /> },
            { name: 'Transactions', href: '/admin/transactions', icon: <IconTransactions /> },
        ],
    },
    {
        label: 'OPERATIONS',
        items: [
            { name: 'Schedule', href: '/admin/operations/schedule', icon: <IconSchedule /> },
            { name: 'Coaches', href: '/admin/operations/coaches', icon: <IconCoaches /> },
            { name: 'Reservations', href: '/admin/operations/reservations', icon: <IconReservations /> },
            { name: 'Race', href: '/admin/operations/race', icon: <IconRace /> },
            { name: 'Lockers', href: '/admin/operations/lockers', icon: <IconLockers /> },
            { name: 'Infrastructure', href: '/admin/operations/infrastructure', icon: <IconInfrastructure /> },
            { name: 'Roles', href: '/admin/operations/roles', icon: <IconRoles /> },
        ],
    },
    {
        label: 'CRM',
        items: [
            { name: 'Content', href: '/admin/crm/content', icon: <IconContent /> },
            { name: 'Notifications', href: '/admin/crm/notifications', icon: <IconNotifications /> },
            { name: 'Support', href: '/admin/crm/support', icon: <IconSupport /> },
            { name: 'Feedback', href: '/admin/crm/feedback', icon: <IconFeedback /> },
        ],
    },
    {
        label: 'INFRASTRUCTURE',
        items: [
            { name: 'Branch Setup', href: '/admin/setup/branch', icon: <IconBranch /> },
            { name: 'System Link', href: '/admin/setup/system', icon: <IconSystemLink /> },
            { name: 'Settings', href: '/admin/setup/settings', icon: <IconSettings /> },
            { name: 'Audit Logs', href: '/admin/setup/audit', icon: <IconAudit /> },
        ],
    },
];

// Segment-aware path matching
function isActivePath(pathname: string | null, href: string): boolean {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(href + '/');
}

// --- Live Clock Component ---
function SidebarClock({ collapsed }: { collapsed: boolean }) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const dateStr = now.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    });
    const timeStr = now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    if (collapsed) {
        return (
            <div
                style={{
                    padding: '12px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    marginBottom: '8px',
                }}
                title={`${dateStr} ${timeStr}`}
            >
                <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--primary)',
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                }}>
                    {now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
            </div>
        );
    }

    return (
        <div
            style={{
                padding: '14px 16px',
                margin: '0 12px 8px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
            }}
        >
            {/* Clock Icon */}
            <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255,107,0,0.08)',
                border: '1px solid rgba(255,107,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                </svg>
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    lineHeight: 1,
                    marginBottom: '4px',
                }}>
                    {dateStr}
                </div>
                <div style={{
                    fontSize: '18px',
                    fontWeight: 900,
                    color: 'white',
                    letterSpacing: '-0.03em',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                }}>
                    {timeStr}
                </div>
            </div>
        </div>
    );
}

// --- Changelog Modal ---
function ChangelogModal({ onClose }: { onClose: () => void }) {
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, rgba(30,30,35,0.98) 0%, rgba(20,20,25,0.98) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '20px',
                    width: '100%', maxWidth: '520px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '24px 28px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>
                            📋 Changelog
                        </h2>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                            BCL Portal 업데이트 내역
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.06)', border: 'none',
                            borderRadius: '10px', width: '36px', height: '36px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Changelog entries */}
                <div style={{ padding: '16px 28px 24px', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
                    {CHANGELOG.map((entry, idx) => (
                        <div key={entry.version} style={{
                            marginBottom: idx < CHANGELOG.length - 1 ? '24px' : 0,
                            paddingBottom: idx < CHANGELOG.length - 1 ? '24px' : 0,
                            borderBottom: idx < CHANGELOG.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        }}>
                            {/* Version header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <span style={{
                                    padding: '3px 10px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    fontVariantNumeric: 'tabular-nums',
                                    background: entry.type === 'major' ? 'rgba(239,68,68,0.15)'
                                        : entry.type === 'minor' ? 'rgba(255,107,0,0.12)'
                                            : 'rgba(255,255,255,0.06)',
                                    color: entry.type === 'major' ? '#f87171'
                                        : entry.type === 'minor' ? '#FF8A3D'
                                            : 'rgba(255,255,255,0.5)',
                                    border: `1px solid ${entry.type === 'major' ? 'rgba(239,68,68,0.25)'
                                        : entry.type === 'minor' ? 'rgba(255,107,0,0.2)'
                                            : 'rgba(255,255,255,0.08)'}`,
                                }}>
                                    v{entry.version}
                                </span>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>
                                    {entry.date}
                                </span>
                                {idx === 0 && (
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '6px',
                                        fontSize: '10px', fontWeight: 700,
                                        background: 'rgba(34,197,94,0.12)',
                                        color: '#4ade80',
                                        border: '1px solid rgba(34,197,94,0.2)',
                                        letterSpacing: '0.05em',
                                    }}>
                                        LATEST
                                    </span>
                                )}
                            </div>
                            {/* Title */}
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '10px' }}>
                                {entry.title}
                            </div>
                            {/* Changes */}
                            <ul style={{ margin: 0, paddingLeft: '4px', listStyle: 'none' }}>
                                {entry.changes.map((change, ci) => (
                                    <li key={ci} style={{
                                        fontSize: '13px',
                                        color: 'rgba(255,255,255,0.55)',
                                        lineHeight: 1.6,
                                        paddingLeft: '8px',
                                    }}>
                                        {change}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { collapsed, setCollapsed } = useAdminSidebar();
    const { user, profile, signOut } = useAuth();
    const { canAccessMenu, loading: permLoading } = useAdminPermissions();
    const [isMounted, setIsMounted] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const isDev = process.env.NEXT_PUBLIC_SUPABASE_ENV === 'dev';

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    const handleSignOut = async () => {
        await signOut();
        router.push('/auth/login');
    };

    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
        <aside
            className="admin-sidebar"
            data-collapsed={collapsed}
            style={{
                width: collapsed ? '68px' : '256px',
            }}
        >
            {/* Logo Area */}
            <div className="admin-sidebar__logo">
                <Logo collapsed={collapsed} size={collapsed ? 36 : 54} />
            </div>

            {/* Navigation */}
            <nav className="admin-sidebar__nav custom-scrollbar">
                {/* Live Clock Widget */}
                <SidebarClock collapsed={collapsed} />

                {menuGroups.map((group, groupIndex) => (
                    <div key={group.label} className="admin-sidebar__group">
                        {/* Section Label (expanded) / Divider (collapsed) */}
                        {!collapsed ? (
                            <div className="admin-sidebar__section-label">
                                {group.label}
                            </div>
                        ) : (
                            groupIndex > 0 && (
                                <div className="admin-sidebar__divider" />
                            )
                        )}

                        {/* Menu Items */}
                        <div className="admin-sidebar__items">
                            {group.items.map((item) => {
                                const isActive = isActivePath(pathname, item.href);
                                const hasAccess = permLoading || canAccessMenu(item.href);

                                if (!hasAccess) {
                                    // T3-9: 접근 불가 메뉴 — 잠금 표시
                                    return (
                                        <div
                                            key={item.href}
                                            className="admin-sidebar__item admin-sidebar__item--locked"
                                            title={collapsed ? `🔒 ${item.name}` : '접근 권한이 없습니다'}
                                            style={{ opacity: 0.3, cursor: 'not-allowed' }}
                                        >
                                            <span className="admin-sidebar__icon">
                                                {item.icon}
                                            </span>
                                            {!collapsed && (
                                                <span className="admin-sidebar__label">
                                                    {item.name}
                                                </span>
                                            )}
                                            {!collapsed && (
                                                <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.6 }}>🔒</span>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`admin-sidebar__item ${isActive ? 'admin-sidebar__item--active' : ''}`}
                                        title={collapsed ? item.name : undefined}
                                    >
                                        <span className="admin-sidebar__icon">
                                            {item.icon}
                                        </span>
                                        {!collapsed && (
                                            <span className="admin-sidebar__label">
                                                {item.name}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* DEV 환경 표시 - 사이드바 하단, 유저 정보 위 */}
            {isDev && (
                <div
                    style={{
                        margin: collapsed ? '0 8px 8px' : '0 12px 8px',
                        padding: collapsed ? '8px 0' : '8px 12px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)',
                        border: '1px solid rgba(102,126,234,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: '8px',
                    }}
                    title={collapsed ? 'DEV 환경 - 개발 DB 연결' : undefined}
                >
                    <span style={{ fontSize: collapsed ? '16px' : '14px', lineHeight: 1 }}>🔧</span>
                    {!collapsed && (
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#a78bfa',
                                letterSpacing: '0.08em',
                                lineHeight: 1,
                            }}>
                                DEV 환경
                            </div>
                            <div style={{
                                fontSize: '10px',
                                color: 'rgba(255,255,255,0.4)',
                                lineHeight: 1.3,
                                marginTop: '2px',
                            }}>
                                개발 DB 연결
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Version Badge (clickable → Changelog) */}
            <div
                onClick={() => setShowChangelog(true)}
                style={{
                    margin: collapsed ? '0 8px 4px' : '0 12px 4px',
                    padding: collapsed ? '6px 0' : '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: '6px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'background 0.2s',
                }}
                title={collapsed ? `v${APP_VERSION} (${BUILD_DATE}) — 클릭하여 변경 내역 보기` : '변경 내역 보기'}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
                <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.25)',
                    letterSpacing: '0.05em',
                    fontVariantNumeric: 'tabular-nums',
                    transition: 'color 0.2s',
                }}>
                    {collapsed ? `v${APP_VERSION}` : `v${APP_VERSION} · ${BUILD_DATE}`}
                </span>
            </div>

            {/* Changelog Modal */}
            {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}

            {/* Footer / User Profile */}
            <div className="admin-sidebar__footer">
                <div className={`admin-sidebar__profile ${collapsed ? 'admin-sidebar__profile--collapsed' : ''}`}>
                    <div className="admin-sidebar__avatar">{initials}</div>
                    {!collapsed && (
                        <div className="admin-sidebar__user-info" style={{ flex: 1, minWidth: 0 }}>
                            <span className="admin-sidebar__user-name">{displayName}</span>
                            <span className="admin-sidebar__user-role">{profile?.role || 'admin'}</span>
                        </div>
                    )}
                    {!collapsed && (
                        <button
                            onClick={handleSignOut}
                            title="로그아웃"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255,255,255,0.3)',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#EF4444';
                                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
                                e.currentTarget.style.background = 'none';
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                <polyline points="16,17 21,12 16,7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </button>
                    )}
                </div>
                {collapsed && (
                    <button
                        onClick={handleSignOut}
                        title="로그아웃"
                        style={{
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px 0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.3)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#EF4444';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                            <polyline points="16,17 21,12 16,7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="admin-sidebar__toggle"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                        transition: 'transform 0.3s ease',
                    }}
                >
                    <polyline points="9,18 15,12 9,6" />
                </svg>
            </button>
        </aside>
    );
}
