'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNotifications, AppNotification } from '@/hooks/useNotifications';

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
    class_reminder: { icon: '📅', label: 'Class', color: '#3B82F6' },
    waitlist_vacancy: { icon: '🎉', label: 'Vacancy', color: '#22C55E' },
    membership_expiry: { icon: '⚠️', label: 'Membership', color: '#F59E0B' },
    promotion: { icon: '🎁', label: 'Promo', color: '#8B5CF6' },
    checkin: { icon: '✅', label: 'Check-in', color: '#10B981' },
    system: { icon: '🔧', label: 'System', color: '#6B7280' },
    general: { icon: '🔔', label: 'General', color: '#D2691E' },
};

function timeAgo(dateStr: string) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
    const [filter, setFilter] = useState('all');
    const router = useRouter();

    // Register service worker on page load
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err =>
                console.log('SW registration failed:', err)
            );
        }
    }, []);

    const filtered = filter === 'all'
        ? notifications
        : notifications.filter(n => n.category === filter);

    const handleNotificationClick = async (notif: AppNotification) => {
        if (!notif.is_read) {
            await markAsRead(notif.id);
        }
        if (notif.action_url) {
            router.push(notif.action_url);
        }
    };

    const filterCategories = [
        { key: 'all', label: 'All' },
        { key: 'class_reminder', label: 'Classes' },
        { key: 'waitlist_vacancy', label: 'Vacancy' },
        { key: 'membership_expiry', label: 'Membership' },
        { key: 'promotion', label: 'Promos' },
    ];

    if (loading) {
        return (
            <div className="app-page">
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="app-skeleton" style={{ width: '50%', height: 28 }} />
                </div>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="app-skeleton" style={{ height: 80, marginBottom: 10, borderRadius: 16 }} />
                ))}
            </div>
        );
    }

    return (
        <div className="app-page">
            {/* Mark all read action */}
            {unreadCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                    <button
                        onClick={markAllAsRead}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--app-accent)',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        Mark all read
                    </button>
                </div>
            )}

            {/* Category Filters */}
            <div className="app-filter-chips">
                {filterCategories.map(f => (
                    <button
                        key={f.key}
                        className={`app-filter-chip ${filter === f.key ? 'active' : ''}`}
                        onClick={() => setFilter(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Notification List */}
            {filtered.length === 0 ? (
                <div className="app-empty-state">
                    <div className="emoji">🔕</div>
                    <div className="message">
                        {filter === 'all' ? 'No notifications yet' : `No ${filterCategories.find(f => f.key === filter)?.label || ''} notifications`}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filtered.map((notif) => {
                        const config = CATEGORY_CONFIG[notif.category] || CATEGORY_CONFIG.general;
                        return (
                            <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                    padding: '14px 16px',
                                    borderRadius: 16,
                                    background: notif.is_read ? 'var(--app-surface)' : 'rgba(210, 105, 30, 0.04)',
                                    border: `1px solid ${notif.is_read ? 'var(--app-border)' : 'rgba(210, 105, 30, 0.12)'}`,
                                    cursor: notif.action_url ? 'pointer' : 'default',
                                    transition: 'all 0.2s ease',
                                    boxShadow: notif.is_read ? 'none' : '0 1px 4px rgba(210,105,30,0.06)',
                                    position: 'relative',
                                }}
                            >
                                {/* Unread indicator */}
                                {!notif.is_read && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: 'var(--app-accent)',
                                    }} />
                                )}

                                {/* Icon */}
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 14,
                                    background: `${config.color}10`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.25rem',
                                    flexShrink: 0,
                                }}>
                                    {config.icon}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: 4,
                                    }}>
                                        <span style={{
                                            fontSize: '0.9375rem',
                                            fontWeight: notif.is_read ? 500 : 700,
                                            color: 'var(--app-text-primary)',
                                            flex: 1,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}>
                                            {notif.title}
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: '0.8125rem',
                                        color: 'var(--app-text-secondary)',
                                        lineHeight: 1.4,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}>
                                        {notif.content}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginTop: 6,
                                    }}>
                                        <span style={{
                                            fontSize: '0.6875rem',
                                            color: 'var(--app-text-muted)',
                                        }}>
                                            {timeAgo(notif.created_at)}
                                        </span>
                                        {notif.action_label && (
                                            <span style={{
                                                fontSize: '0.6875rem',
                                                fontWeight: 600,
                                                color: 'var(--app-accent)',
                                            }}>
                                                {notif.action_label} →
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
