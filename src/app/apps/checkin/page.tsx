'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface CheckinRecord {
    id: string;
    checkin_time: string;
    checkin_method: string;
}

export default function UserCheckinPage() {
    const [qrToken, setQrToken] = useState('');
    const [memberId, setMemberId] = useState('BCL-00000');
    const [timeLeft, setTimeLeft] = useState(30);
    const [isActive, setIsActive] = useState(true);
    const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
    const [monthlyCount, setMonthlyCount] = useState(0);
    const [streak, setStreak] = useState(0);
    const [checkedDays, setCheckedDays] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [planName, setPlanName] = useState('');
    const [planEnd, setPlanEnd] = useState('');
    const [weeklyDelta, setWeeklyDelta] = useState(0);

    const generateToken = useCallback(() => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = 'BCL-';
        for (let i = 0; i < 20; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        token += '-' + Date.now().toString(36);
        setQrToken(token);
        setTimeLeft(30);
    }, []);

    useEffect(() => {
        generateToken();
        loadCheckinData();
    }, [generateToken]);

    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    generateToken();
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isActive, generateToken]);

    async function loadCheckinData() {
        const supabase: any = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Set member ID
        const shortId = user.id.slice(0, 5).toUpperCase();
        setMemberId(`BCL-${shortId}`);

        // Get membership info
        const { data: membershipData }: any = await supabase
            .from('memberships')
            .select('*, membership_plans(name)')
            .eq('member_id', user.id)
            .eq('status', 'active')
            .order('end_date', { ascending: false })
            .limit(1)
            .single();
        if (membershipData) {
            setPlanName(membershipData.membership_plans?.name || 'Membership');
            setPlanEnd(membershipData.end_date || '');
        }

        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const { data: monthData }: any = await supabase
            .from('checkins')
            .select('*')
            .eq('member_id', user.id)
            .gte('checkin_time', firstDay.toISOString())
            .lte('checkin_time', lastDay.toISOString())
            .order('checkin_time', { ascending: false });

        if (monthData) {
            setCheckins(monthData);
            setMonthlyCount(monthData.length);

            const days = new Set<number>();
            monthData.forEach(c => {
                const d = new Date(c.checkin_time);
                days.add(d.getDate());
            });
            setCheckedDays(days);

            // Calculate streak
            let currentStreak = 0;
            const today = new Date();
            for (let i = 0; i < 30; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(checkDate.getDate() - i);
                if (days.has(checkDate.getDate()) && checkDate.getMonth() === now.getMonth()) {
                    currentStreak++;
                } else if (i > 0) break;
            }
            setStreak(currentStreak);

            // Calculate weekly delta
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const thisWeek = monthData.filter(c => new Date(c.checkin_time) >= weekAgo).length;
            setWeeklyDelta(thisWeek);
        }
        setLoading(false);
    }

    const progressPercent = (timeLeft / 30) * 100;
    const progressClass = timeLeft <= 5 ? 'danger' : timeLeft <= 10 ? 'warning' : 'safe';

    // Calendar
    const now = new Date();
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    // Monday-first (shift: 0=Mon, 6=Sun)
    const adjustedFirst = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const dayHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = now.getDate();

    return (
        <div className="app-page">
            {/* ── Header with user info ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--app-accent), #E8933A)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: '1rem',
                    }}>
                        👤
                    </div>
                    <div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--app-text-muted)' }}>
                            GOOD MORNING
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>Secure Entry</div>
                    </div>
                </div>
                <button
                    onClick={() => setIsActive(!isActive)}
                    style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--app-surface)', border: '1px solid var(--app-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: '0.875rem',
                    }}
                >
                    {isActive ? '⏸' : '▶'}
                </button>
            </div>

            {/* ── QR Card (Figma Style) ── */}
            <div className="qr-card">
                <div className="qr-header">
                    <span className="qr-label">SECURE ENTRY</span>
                    <span className="qr-member-id">ID: {memberId}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                    <div className="qr-image-area">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 2, padding: 8 }}>
                            {Array.from({ length: 121 }, (_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: 2,
                                        background: qrToken.charCodeAt(i % qrToken.length) % 3 !== 0 ? '#1A1A1A' : '#FFFFFF',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    {/* Green dot indicator */}
                    <div style={{
                        position: 'absolute', top: -4, right: '20%',
                        width: 10, height: 10, borderRadius: '50%',
                        background: isActive ? '#22C55E' : '#EF4444',
                        border: '2px solid #fff',
                    }} />
                </div>

                <div className="qr-timer">
                    <div>
                        <span className="time-text">Refreshes in </span>
                        <span className="time-value">{timeLeft}s</span>
                    </div>
                    <span className="token-label">DYNAMIC TOKEN</span>
                </div>
                <div className="qr-progress">
                    <div
                        className={`qr-progress-bar ${progressClass}`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* ── Plan Status (Figma) ── */}
            {planName && (
                <div className="app-glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '1rem 1.25rem' }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'var(--app-accent-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        🏆
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{planName}</div>
                        {planEnd && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--app-text-secondary)' }}>
                                Active until {new Date(planEnd).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </div>
                        )}
                    </div>
                    <span className="status-badge active">ACTIVE</span>
                </div>
            )}

            {/* ── Monthly Attendance (Figma Style) ── */}
            <div style={{ marginBottom: '1rem' }}>
                <div className="app-section-header">
                    <div className="app-section-label" style={{ marginBottom: 0 }}>MONTHLY ATTENDANCE</div>
                    <Link href="/apps/records" className="app-link">View Full Report</Link>
                </div>

                <div className="stats-row" style={{ marginBottom: '1rem' }}>
                    <div className="stat-item">
                        <div className="label">TOTAL VISITS</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span className="value">{monthlyCount}</span>
                            {weeklyDelta > 0 && <span className="sub-value">+{weeklyDelta} this week</span>}
                        </div>
                    </div>
                    <div className="stat-item">
                        <div className="label">STREAK</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span className="value">{streak}</span>
                            <span style={{ fontSize: '0.875rem', color: 'var(--app-text-secondary)' }}>days</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Attendance Heatmap Calendar (Figma: colored blocks) ── */}
            <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{monthName}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--app-accent)' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--app-text-secondary)' }}>PRESENT</span>
                    </div>
                </div>
                <div className="attendance-calendar">
                    {dayHeaders.map((d, i) => (
                        <div key={`h-${i}`} className="attendance-day header">{d}</div>
                    ))}
                    {Array.from({ length: adjustedFirst }, (_, i) => (
                        <div key={`e-${i}`} className="attendance-day" />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const isChecked = checkedDays.has(day);
                        const isPast = day <= today;
                        return (
                            <div
                                key={day}
                                className={`attendance-day ${isChecked ? 'checked' : isPast ? 'empty' : ''} ${day === today ? 'today' : ''}`}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
