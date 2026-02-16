'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';


export default function CheckInPage() {
    const { user } = useAuth();
    const [qrCode, setQrCode] = useState<string>('');
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [stats, setStats] = useState({ thisWeek: 0, thisMonth: 0, total: 0 });

    useEffect(() => {
        generateQR();
        loadStats();

        // Regenerate QR every 30 seconds
        const interval = setInterval(generateQR, 30000);
        return () => clearInterval(interval);
    }, [user]);

    async function generateQR() {
        if (!user) return;

        // Generate a time-based token
        const token = `${user.id}:${Date.now()}`;
        const encoded = btoa(token);
        setQrCode(encoded);
        setExpiresAt(new Date(Date.now() + 30000)); // 30 seconds
    }

    async function loadStats() {
        if (!user) return;

        const supabase = createClient();

        // This week
        const { count: weekCount } = await supabase
            .from('check_ins')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('checked_in_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        // This month
        const { count: monthCount } = await supabase
            .from('check_ins')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('checked_in_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

        // Total
        const { count: totalCount } = await supabase
            .from('check_ins')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        setStats({
            thisWeek: weekCount || 0,
            thisMonth: monthCount || 0,
            total: totalCount || 0,
        });
    }

    return (
        <div className="min-h-screen pb-20" style={{ background: 'var(--background)' }}>
            {/* Header */}
            <div className="p-6 pb-4">
                <h1 className="text-2xl font-bold text-white">Check-in</h1>
                <p style={{ color: 'var(--foreground-secondary)' }}>Scan QR code at the facility</p>
            </div>

            {/* QR Code */}
            <div className="px-4 mb-6">
                <div
                    className="glass-card p-8 rounded-xl text-center"
                    style={{
                        background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.9), rgba(20, 20, 20, 0.95))',
                    }}
                >
                    <div
                        className="bg-white p-6 rounded-xl inline-block mb-4"
                        style={{
                            boxShadow: '0 0 0 4px var(--bcl-orange)',
                        }}
                    >
                        {/* QR Code Placeholder - In production, use a QR library */}
                        <div className="w-48 h-48 flex items-center justify-center text-gray-800">
                            <div>
                                <div className="text-6xl font-mono break-all text-center">
                                    {qrCode.substring(0, 16)}
                                </div>
                                <p className="text-xs mt-2">QR Code</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-white font-semibold mb-1">Member ID: {user?.id.substring(0, 8)}</p>
                    <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                        Expires in {expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : 30}s
                    </p>

                    <div className="mt-4 flex justify-center">
                        <div
                            className="h-1 w-full max-w-xs rounded-full overflow-hidden"
                            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                        >
                            <div
                                className="h-full transition-all duration-1000"
                                style={{
                                    background: 'var(--bcl-orange)',
                                    width: expiresAt
                                        ? `${((expiresAt.getTime() - Date.now()) / 30000) * 100}%`
                                        : '100%',
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="px-4 mb-6">
                <h2 className="text-lg font-semibold text-white mb-3">Attendance Stats</h2>
                <div className="grid grid-cols-3 gap-3">
                    <div className="glass-card p-4 rounded-xl text-center">
                        <p className="text-2xl font-bold" style={{ color: 'var(--bcl-orange)' }}>
                            {stats.thisWeek}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                            This Week
                        </p>
                    </div>
                    <div className="glass-card p-4 rounded-xl text-center">
                        <p className="text-2xl font-bold" style={{ color: 'var(--bcl-orange)' }}>
                            {stats.thisMonth}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                            This Month
                        </p>
                    </div>
                    <div className="glass-card p-4 rounded-xl text-center">
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                            Total
                        </p>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="px-4">
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-white font-semibold mb-3">How to Check-in</h3>
                    <ol className="space-y-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                        <li className="flex gap-3">
                            <span className="font-bold" style={{ color: 'var(--bcl-orange)' }}>
                                1.
                            </span>
                            <span>Find the check-in kiosk at the facility entrance</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold" style={{ color: 'var(--bcl-orange)' }}>
                                2.
                            </span>
                            <span>Increase screen brightness for better scanning</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold" style={{ color: 'var(--bcl-orange)' }}>
                                3.
                            </span>
                            <span>Hold your QR code steady in front of the camera</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold" style={{ color: 'var(--bcl-orange)' }}>
                                4.
                            </span>
                            <span>Wait for confirmation beep and message</span>
                        </li>
                    </ol>
                </div>
            </div>


        </div>
    );
}
