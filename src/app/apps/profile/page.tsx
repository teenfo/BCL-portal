'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [membership, setMembership] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, [user]);

    async function loadProfile() {
        if (!user) return;

        const supabase = createClient();

        // Load user profile
        const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        // Load active membership
        const { data: membershipData } = await supabase
            .from('memberships')
            .select('*, plan:plans(*)')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

        setProfile(profileData);
        setMembership(membershipData);
        setLoading(false);
    }

    async function handleSignOut() {
        await signOut();
        router.push('/auth/login');
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--bcl-orange)' }}></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20" style={{ background: 'var(--background)' }}>
            {/* Header */}
            <div className="p-6 pb-4">
                <h1 className="text-2xl font-bold text-white">Profile</h1>
                <p style={{ color: 'var(--foreground-secondary)' }}>Manage your account</p>
            </div>

            {/* Profile Card */}
            <div className="px-4 mb-6">
                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center gap-4 mb-4">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                            style={{ background: 'var(--bcl-orange)', color: '#FFFFFF' }}
                        >
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{profile?.full_name || 'User'}</h2>
                            <p style={{ color: 'var(--foreground-secondary)' }}>{user?.email}</p>
                        </div>
                    </div>

                    {profile?.phone && (
                        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                Phone
                            </p>
                            <p className="text-white">{profile.phone}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Membership Card */}
            {membership && (
                <div className="px-4 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-3">Current Membership</h2>
                    <div className="glass-card p-6 rounded-xl">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">{membership.plan.name}</h3>
                                <p className="text-sm mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                                    {membership.plan.type === 'period' ? 'Period Plan' : 'Credits Plan'}
                                </p>
                            </div>
                            <div
                                className="px-3 py-1 rounded-full text-xs font-semibold"
                                style={{
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    color: '#22C55E',
                                }}
                            >
                                Active
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>
                                    Start Date
                                </p>
                                <p className="text-white font-semibold">
                                    {new Date(membership.start_date).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>
                                    End Date
                                </p>
                                <p className="text-white font-semibold">
                                    {new Date(membership.end_date).toLocaleDateString()}
                                </p>
                            </div>
                            {membership.plan.type === 'credits' && (
                                <div className="col-span-2">
                                    <p className="text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>
                                        Remaining Credits
                                    </p>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--bcl-orange)' }}>
                                        {membership.remaining_credits} / {membership.total_credits}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Menu Items */}
            <div className="px-4 space-y-2">
                <button className="glass-card p-4 rounded-xl w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--bcl-orange)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-white">Edit Profile</span>
                    </div>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--foreground-secondary)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                <button className="glass-card p-4 rounded-xl w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--bcl-orange)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-white">Change Password</span>
                    </div>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--foreground-secondary)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                <button className="glass-card p-4 rounded-xl w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--bcl-orange)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="text-white">Payment History</span>
                    </div>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--foreground-secondary)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                <button className="glass-card p-4 rounded-xl w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--bcl-orange)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-white">Settings</span>
                    </div>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--foreground-secondary)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                <button
                    onClick={handleSignOut}
                    className="glass-card p-4 rounded-xl w-full flex items-center gap-3 mt-6"
                    style={{ borderColor: '#EF4444' }}
                >
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-red-500 font-semibold">Sign Out</span>
                </button>
            </div>


        </div>
    );
}
