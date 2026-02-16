'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

import Link from 'next/link';

interface DashboardData {
    nextClass: any;
    membership: any;
    announcements: any[];
    stats: {
        weeklyAttendance: number;
        remainingCredits: number;
    };
}

export default function UserDashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [user]);

    async function loadDashboardData() {
        if (!user) return;

        const supabase = createClient();

        try {
            // Load next class
            const { data: nextClass } = await supabase
                .from('bookings')
                .select(`
                    *,
                    class:classes(*)
                `)
                .eq('user_id', user.id)
                .eq('status', 'confirmed')
                .gte('class.start_time', new Date().toISOString())
                .order('class.start_time', { ascending: true })
                .limit(1)
                .single();

            // Load active membership
            const { data: membership } = await supabase
                .from('memberships')
                .select('*, plan:plans(*)')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single();

            // Load announcements
            const { data: announcements } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false })
                .limit(3);

            // Calculate stats
            const { count: weeklyAttendance } = await supabase
                .from('check_ins')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('checked_in_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            setData({
                nextClass: nextClass || null,
                membership: membership || null,
                announcements: announcements || [],
                stats: {
                    weeklyAttendance: weeklyAttendance || 0,
                    remainingCredits: membership?.remaining_credits || 0,
                },
            });
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
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
                <h1 className="text-2xl font-bold text-white mb-1">Welcome back!</h1>
                <p style={{ color: 'var(--foreground-secondary)' }}>
                    {user?.email}
                </p>
            </div>

            {/* Main Content */}
            <div className="px-4 space-y-4">
                {/* Next Class Card */}
                <div
                    className="glass-card p-6 rounded-xl"
                    style={{
                        borderLeft: '4px solid var(--bcl-orange)',
                    }}
                >
                    <h2 className="text-lg font-semibold text-white mb-3">Next Class</h2>
                    {data?.nextClass ? (
                        <div>
                            <p className="text-xl font-bold" style={{ color: 'var(--bcl-orange)' }}>
                                {new Date(data.nextClass.class.start_time).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                            <p className="text-white mt-1">{data.nextClass.class.name}</p>
                            <Link
                                href="/apps/schedule"
                                className="inline-block mt-3 text-sm"
                                style={{ color: 'var(--bcl-orange)' }}
                            >
                                View Schedule →
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <p style={{ color: 'var(--foreground-secondary)' }}>No upcoming classes</p>
                            <Link
                                href="/apps/schedule"
                                className="inline-block mt-3 px-4 py-2 rounded-lg text-sm font-semibold"
                                style={{
                                    background: 'var(--bcl-orange)',
                                    color: '#FFFFFF',
                                }}
                            >
                                Book a Class
                            </Link>
                        </div>
                    )}
                </div>

                {/* Membership Card */}
                <div className="glass-card p-6 rounded-xl">
                    <h2 className="text-lg font-semibold text-white mb-3">Membership</h2>
                    {data?.membership ? (
                        <div>
                            <p className="text-xl font-bold text-white">{data.membership.plan.name}</p>
                            <div className="mt-3 flex justify-between text-sm">
                                <div>
                                    <p style={{ color: 'var(--foreground-secondary)' }}>Expires</p>
                                    <p className="text-white font-semibold">
                                        {new Date(data.membership.end_date).toLocaleDateString()}
                                    </p>
                                </div>
                                {data.membership.plan.type === 'credits' && (
                                    <div>
                                        <p style={{ color: 'var(--foreground-secondary)' }}>Remaining</p>
                                        <p className="text-white font-semibold">{data.stats.remainingCredits} credits</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p style={{ color: 'var(--foreground-secondary)' }}>No active membership</p>
                            <Link
                                href="/apps/purchase"
                                className="inline-block mt-3 px-4 py-2 rounded-lg text-sm font-semibold"
                                style={{
                                    background: 'var(--bcl-orange)',
                                    color: '#FFFFFF',
                                }}
                            >
                                Purchase Plan
                            </Link>
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-4 rounded-xl text-center">
                        <p style={{ color: 'var(--foreground-secondary)' }} className="text-sm mb-1">
                            This Week
                        </p>
                        <p className="text-3xl font-bold" style={{ color: 'var(--bcl-orange)' }}>
                            {data?.stats.weeklyAttendance}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                            Classes
                        </p>
                    </div>
                    <div className="glass-card p-4 rounded-xl text-center">
                        <p style={{ color: 'var(--foreground-secondary)' }} className="text-sm mb-1">
                            Credits
                        </p>
                        <p className="text-3xl font-bold text-white">{data?.stats.remainingCredits}</p>
                        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                            Remaining
                        </p>
                    </div>
                </div>

                {/* Announcements */}
                {data?.announcements && data.announcements.length > 0 && (
                    <div className="glass-card p-6 rounded-xl">
                        <h2 className="text-lg font-semibold text-white mb-3">Announcements</h2>
                        <div className="space-y-3">
                            {data.announcements.map((announcement) => (
                                <div
                                    key={announcement.id}
                                    className="pb-3 border-b last:border-0 last:pb-0"
                                    style={{ borderColor: 'var(--border-color)' }}
                                >
                                    <h3 className="text-white font-medium">{announcement.title}</h3>
                                    <p className="text-sm mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                                        {announcement.content.substring(0, 100)}...
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
}
