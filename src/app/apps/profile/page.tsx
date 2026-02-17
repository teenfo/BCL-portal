'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Membership {
    id: string;
    plan_name: string;
    end_date: string;
    status: string;
}

export default function UserProfilePage() {
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [membership, setMembership] = useState<Membership | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        setUserEmail(user.email || '');

        const { data: memberData } = await supabase
            .from('members')
            .select('name, role')
            .eq('user_id', user.id)
            .single();
        if (memberData) {
            setUserName(memberData.name || '');
            setIsAdmin(memberData.role === 'admin' || memberData.role === 'super_admin');
        }

        const { data: membershipData } = await supabase
            .from('memberships')
            .select('*, membership_plans(name)')
            .eq('member_id', user.id)
            .eq('status', 'active')
            .order('end_date', { ascending: false })
            .limit(1)
            .single();
        if (membershipData) {
            setMembership({
                id: membershipData.id,
                plan_name: membershipData.membership_plans?.name || 'Membership',
                end_date: membershipData.end_date,
                status: membershipData.status,
            });
        }

        setLoading(false);
    }

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/apps/auth/login');
    }

    if (loading) {
        return (
            <div className="app-page">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="app-skeleton" style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto 1rem' }} />
                    <div className="app-skeleton" style={{ width: '50%', height: 24, margin: '0 auto 0.5rem' }} />
                    <div className="app-skeleton" style={{ width: '40%', height: 16, margin: '0 auto' }} />
                </div>
            </div>
        );
    }

    const menuItems = [
        { icon: '📅', label: 'My Bookings', href: '/apps/schedule/bookings' },
        { icon: '🔔', label: 'Notification Settings', href: '/apps/profile/notifications' },
        { icon: '🕐', label: 'History', href: '/apps/records' },
        { icon: '⚙️', label: 'Settings', href: '/apps/profile/settings' },
    ];

    return (
        <div className="app-page">
            {/* ── Profile Header (Figma Style) ── */}
            <div className="profile-header">
                <div className="profile-avatar">
                    {userName ? userName.charAt(0).toUpperCase() : '?'}
                </div>
                <h1 className="profile-name">{userName || 'User'}</h1>
                <p className="profile-email">{userEmail}</p>
                <Link
                    href="/apps/profile/edit"
                    className="app-btn-outline"
                    style={{ marginTop: '0.75rem', textDecoration: 'none' }}
                >
                    Edit Profile
                </Link>
            </div>

            {/* ── Membership Card (Figma Style) ── */}
            {membership ? (
                <div className="app-glass-card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--app-accent)' }}>
                                CURRENT PLAN
                            </div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: 2 }}>{membership.plan_name}</div>
                        </div>
                        <span className="status-badge active">ACTIVE</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '0.75rem', color: 'var(--app-text-secondary)', fontSize: '0.8125rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Next renewal: {new Date(membership.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <Link
                        href="/apps/purchase"
                        className="app-btn-primary full-width"
                        style={{ marginTop: '1rem', textDecoration: 'none' }}
                    >
                        Renew Now
                    </Link>
                </div>
            ) : (
                <Link href="/apps/purchase" className="app-glass-card" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', marginBottom: '1.5rem', padding: '1.5rem' }}>
                    <p style={{ color: 'var(--app-text-secondary)', marginBottom: '0.75rem' }}>No active membership</p>
                    <span className="app-btn-primary">Get Started →</span>
                </Link>
            )}

            {/* ── Account Management (Figma Style) ── */}
            <div className="app-section-label">ACCOUNT MANAGEMENT</div>
            <div className="app-menu-list">
                {menuItems.map((item) => (
                    <Link key={item.href} href={item.href} className="app-menu-item">
                        <div className="menu-icon">{item.icon}</div>
                        <div className="menu-content">
                            <div className="menu-label">{item.label}</div>
                        </div>
                        <span className="menu-arrow">›</span>
                    </Link>
                ))}

                {/* Admin Portal Link */}
                {isAdmin && (
                    <Link href="/admin/dashboard" className="app-menu-item">
                        <div className="menu-icon" style={{ background: 'rgba(0,0,0,0.06)' }}>⚙️</div>
                        <div className="menu-content">
                            <div className="menu-label">Admin Portal</div>
                        </div>
                        <span className="menu-arrow">›</span>
                    </Link>
                )}
            </div>

            {/* ── Logout ── */}
            <button
                onClick={handleLogout}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '0.875rem',
                    marginTop: '1.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--app-danger)',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
            </button>
        </div>
    );
}
