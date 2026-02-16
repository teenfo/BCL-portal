'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminSidebar from '@/components/layout/AdminSidebar';

interface Stats {
    todayBookings: number;
    todayCheckins: number;
    todayRevenue: number;
    activeMembers: number;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<Stats>({
        todayBookings: 0,
        todayCheckins: 0,
        todayRevenue: 0,
        activeMembers: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        const supabase = createClient();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Today's bookings
        const { count: bookingsCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        // Today's check-ins
        const { count: checkinsCount } = await supabase
            .from('check_ins')
            .select('*', { count: 'exact', head: true })
            .gte('checked_in_at', today.toISOString());

        // Active members
        const { count: membersCount } = await supabase
            .from('memberships')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        // TODO: Calculate today's revenue from payments table

        setStats({
            todayBookings: bookingsCount || 0,
            todayCheckins: checkinsCount || 0,
            todayRevenue: 0,
            activeMembers: membersCount || 0,
        });

        setLoading(false);
    }

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
            <AdminSidebar />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                    <p style={{ color: 'var(--foreground-secondary)' }}>
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="glass-card p-6 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(239, 108, 0, 0.2)' }}
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    style={{ color: 'var(--bcl-orange)' }}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                        </div>
                        <p className="text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>
                            Today's Bookings
                        </p>
                        <p className="text-3xl font-bold text-white">{stats.todayBookings}</p>
                    </div>

                    <div className="glass-card p-6 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(34, 197, 94, 0.2)' }}
                            >
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                        </div>
                        <p className="text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>
                            Today's Check-ins
                        </p>
                        <p className="text-3xl font-bold text-white">{stats.todayCheckins}</p>
                    </div>

                    <div className="glass-card p-6 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(59, 130, 246, 0.2)' }}
                            >
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                        </div>
                        <p className="text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>
                            Today's Revenue
                        </p>
                        <p className="text-3xl font-bold text-white">₩{stats.todayRevenue.toLocaleString()}</p>
                    </div>

                    <div className="glass-card p-6 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(168, 85, 247, 0.2)' }}
                            >
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                            </div>
                        </div>
                        <p className="text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>
                            Active Members
                        </p>
                        <p className="text-3xl font-bold text-white">{stats.activeMembers}</p>
                    </div>
                </div>

                {/* Charts Placeholder */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="glass-card p-6 rounded-xl">
                        <h2 className="text-xl font-semibold text-white mb-4">Weekly Attendance</h2>
                        <div
                            className="h-64 flex items-center justify-center"
                            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                        >
                            <p style={{ color: 'var(--foreground-secondary)' }}>Chart coming soon</p>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-xl">
                        <h2 className="text-xl font-semibold text-white mb-4">Revenue Trend</h2>
                        <div
                            className="h-64 flex items-center justify-center"
                            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                        >
                            <p style={{ color: 'var(--foreground-secondary)' }}>Chart coming soon</p>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="glass-card p-6 rounded-xl">
                    <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
                    <div className="space-y-3">
                        {loading ? (
                            <p style={{ color: 'var(--foreground-secondary)' }}>Loading...</p>
                        ) : (
                            <p style={{ color: 'var(--foreground-secondary)' }}>No recent activity</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
