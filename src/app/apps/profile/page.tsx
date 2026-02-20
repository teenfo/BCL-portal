'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { AppSkeleton, StatCard } from '@/components/apps';

interface Membership {
    id: string;
    plan_name: string;
    end_date: string;
    status: string;
    remaining_credits?: number;
}

export default function UserProfilePage() {
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [membership, setMembership] = useState<Membership | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [totalCheckins, setTotalCheckins] = useState(0);
    const [totalBookings, setTotalBookings] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const toast = useToast();

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        setUserEmail(user.email || '');

        // 1차: auth 레이어 + members 조회 (member_id 확보)
        const [memberResult, profileResult] = await Promise.all([
            query('members').select('id, name, avatar_url').eq('user_id', user.id).single(),
            query('profiles').select('role').eq('id', user.id).single(),
        ]);

        const memberId = memberResult.data?.id;

        // 2차: member_id 의존 쿼리
        const [membershipResult, checkinCount, bookingCount] = await Promise.all([
            memberId
                ? query('memberships').select('*, membership_plans(name)')
                    .eq('member_id', memberId).eq('status', 'active')
                    .order('end_date', { ascending: false }).limit(1).single()
                : Promise.resolve({ data: null }),
            memberId
                ? query('checkins').select('id', { count: 'exact', head: true }).eq('member_id', memberId)
                : Promise.resolve({ count: 0 }),
            memberId
                ? query('bookings').select('id', { count: 'exact', head: true }).eq('member_id', memberId).in('status', ['confirmed', 'attended'])
                : Promise.resolve({ count: 0 }),
        ]);

        if (memberResult.data) {
            setUserName(memberResult.data.name || '');
            setAvatarUrl(memberResult.data.avatar_url || '');
        }
        if (profileResult.data) {
            setIsAdmin(profileResult.data.role === 'admin' || profileResult.data.role === 'super_admin');
        }
        if (membershipResult.data) {
            setMembership({
                id: membershipResult.data.id,
                plan_name: membershipResult.data.membership_plans?.name || 'Membership',
                end_date: membershipResult.data.end_date,
                status: membershipResult.data.status,
                remaining_credits: membershipResult.data.remaining_credits,
            });
        }
        setTotalCheckins(checkinCount.count || 0);
        setTotalBookings(bookingCount.count || 0);

        setLoading(false);
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('이미지 파일만 업로드 가능합니다.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('파일 크기는 5MB 이하여야 합니다.');
            return;
        }

        setUploading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setUploading(false); return; }

        const ext = file.name.split('.').pop();
        const path = `avatars/${user.id}.${ext}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, file, { upsert: true });

        if (uploadError) {
            toast.error('프로필 사진 업로드에 실패했습니다.');
            setUploading(false);
            return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        const publicUrl = urlData?.publicUrl;

        if (publicUrl) {
            // Update members table
            await query('members').update({ avatar_url: publicUrl }).eq('user_id', user.id);
            setAvatarUrl(publicUrl);
            toast.success('프로필 사진이 업데이트되었습니다! ✅');
        }
        setUploading(false);
    }

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/auth/login');
    }

    // Days until membership expires
    const daysUntilExpiry = membership
        ? Math.max(0, Math.ceil((new Date(membership.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;
    const expiryWarning = daysUntilExpiry > 0 && daysUntilExpiry <= 7;

    if (loading) {
        return (
            <div className="app-page">
                <AppSkeleton variant="card" count={2} />
            </div>
        );
    }

    const menuItems = [
        { icon: '📅', label: 'My Bookings', href: '/apps/schedule/bookings', badge: totalBookings > 0 ? `${totalBookings}` : undefined },
        { icon: '🔔', label: 'Notification Settings', href: '/apps/profile/notifications', badge: unreadNotifications > 0 ? `${unreadNotifications}` : undefined },
        { icon: '🕐', label: 'History', href: '/apps/records' },
        { icon: '⚙️', label: 'Settings', href: '/apps/profile/settings' },
    ];

    return (
        <div className="app-page">
            {/* ── Profile Header ── */}
            <div className="profile-header">
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt="Profile"
                            width={88}
                            height={88}
                            style={{
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '3px solid var(--app-accent)',
                            }}
                        />
                    ) : (
                        <div className="profile-avatar">
                            {userName ? userName.charAt(0).toUpperCase() : '?'}
                        </div>
                    )}
                    {/* Camera button for avatar upload */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--app-accent)', border: '2px solid var(--app-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '0.875rem',
                        }}
                    >
                        {uploading ? '⏳' : '📷'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        style={{ display: 'none' }}
                    />
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

            {/* ── Quick Stats ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <StatCard icon="✅" value={totalCheckins} label="Total Check-ins" />
                <StatCard icon="📅" value={totalBookings} label="Total Bookings" />
                <StatCard
                    icon="💳"
                    value={membership?.remaining_credits ?? 0}
                    label="Credits"
                />
            </div>

            {/* ── Membership Card ── */}
            {membership ? (
                <div className="app-glass-card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--app-accent)' }}>
                                CURRENT PLAN
                            </div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: 2 }}>{membership.plan_name}</div>
                        </div>
                        <span className={`status-badge ${expiryWarning ? 'warning' : 'active'}`}>
                            {expiryWarning ? `D-${daysUntilExpiry}` : 'ACTIVE'}
                        </span>
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
                    {expiryWarning && (
                        <div style={{
                            marginTop: '0.5rem', padding: '0.5rem 0.75rem',
                            background: 'rgba(250,204,21,0.1)', borderRadius: 8,
                            fontSize: '0.75rem', color: '#facc15', fontWeight: 600,
                        }}>
                            ⚠️ 멤버십이 {daysUntilExpiry}일 후 만료됩니다. 갱신해주세요!
                        </div>
                    )}
                    <Link
                        href="/apps/purchase"
                        className="app-btn-primary full-width"
                        style={{ marginTop: '1rem', textDecoration: 'none' }}
                    >
                        {expiryWarning ? 'Renew Now ⚡' : 'Renew Now'}
                    </Link>
                </div>
            ) : (
                <Link href="/apps/purchase" className="app-glass-card" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', marginBottom: '1.5rem', padding: '1.5rem' }}>
                    <p style={{ color: 'var(--app-text-secondary)', marginBottom: '0.75rem' }}>No active membership</p>
                    <span className="app-btn-primary">Get Started →</span>
                </Link>
            )}

            {/* ── Account Management ── */}
            <div className="app-section-label">ACCOUNT MANAGEMENT</div>
            <div className="app-menu-list">
                {menuItems.map((item) => (
                    <Link key={item.href} href={item.href} className="app-menu-item">
                        <div className="menu-icon">{item.icon}</div>
                        <div className="menu-content">
                            <div className="menu-label">{item.label}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {item.badge && (
                                <span style={{
                                    fontSize: '0.625rem', fontWeight: 700,
                                    padding: '0.125rem 0.375rem', borderRadius: 9999,
                                    background: 'var(--app-accent)', color: '#fff',
                                    minWidth: 18, textAlign: 'center',
                                }}>
                                    {item.badge}
                                </span>
                            )}
                            <span className="menu-arrow">›</span>
                        </div>
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
