'use client';

import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { MonthCalendar, StatCard, AppSkeleton } from '@/components/apps';

interface CheckinRecord {
    id: string;
    time: string;
    status: string;
}

export default function UserCheckinPage() {
    const [qrToken, setQrToken] = useState('');
    const [memberId, setMemberId] = useState('BCL-00000');
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes = 300 seconds
    const [isActive, setIsActive] = useState(true);
    const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
    const [monthlyCount, setMonthlyCount] = useState(0);
    const [streak, setStreak] = useState(0);
    const [checkedDates, setCheckedDates] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [planName, setPlanName] = useState('');
    const [planEnd, setPlanEnd] = useState('');
    const [weeklyDelta, setWeeklyDelta] = useState(0);
    // Calendar month navigation
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
    // Monthly filter for check-in history
    const [historyMonth, setHistoryMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const generateToken = useCallback(() => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = 'BCL-';
        for (let i = 0; i < 20; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        token += '-' + Date.now().toString(36);
        setQrToken(token);
        setTimeLeft(300); // Reset to 5 minutes
    }, []);

    useEffect(() => {
        generateToken();
        loadCheckinData();
    }, [generateToken]);

    // QR Timer: 5-minute expiration with auto-refresh
    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    generateToken();
                    return 300;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isActive, generateToken]);

    // Load check-in data for calYear/calMonth
    const loadCheckinData = useCallback(async () => {
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
            .eq('user_id', user.id)
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
            .gte('time', firstDay.toISOString())
            .lte('time', lastDay.toISOString())
            .order('time', { ascending: false });

        if (monthData) {
            setCheckins(monthData);
            setMonthlyCount(monthData.length);

            // Format dates for MonthCalendar component
            const dates: string[] = [];
            monthData.forEach((c: any) => {
                const d = new Date(c.time);
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (!dates.includes(dateStr)) dates.push(dateStr);
            });
            setCheckedDates(dates);

            // Calculate streak
            let currentStreak = 0;
            const today = new Date();
            const daySet = new Set(dates);
            for (let i = 0; i < 60; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(checkDate.getDate() - i);
                const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
                if (daySet.has(checkStr)) {
                    currentStreak++;
                } else if (i > 0) break;
            }
            setStreak(currentStreak);

            // Calculate weekly delta
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const thisWeek = monthData.filter((c: any) => new Date(c.time) >= weekAgo).length;
            setWeeklyDelta(thisWeek);
        }
        setLoading(false);
    }, []);

    // Load calendar-specific check-in data when calendar month changes
    const [calCheckedDates, setCalCheckedDates] = useState<string[]>([]);
    useEffect(() => {
        async function loadCalendarData() {
            const supabase: any = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const firstDay = new Date(calYear, calMonth - 1, 1);
            const lastDay = new Date(calYear, calMonth, 0);

            const { data }: any = await supabase
                .from('checkins')
                .select('time')
                .eq('member_id', user.id)
                .gte('time', firstDay.toISOString())
                .lte('time', lastDay.toISOString());

            if (data) {
                const dates: string[] = [];
                data.forEach((c: any) => {
                    const d = new Date(c.time);
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    if (!dates.includes(dateStr)) dates.push(dateStr);
                });
                setCalCheckedDates(dates);
            }
        }
        loadCalendarData();
    }, [calYear, calMonth]);

    // Timer display format: mm:ss
    const timerMinutes = Math.floor(timeLeft / 60);
    const timerSeconds = timeLeft % 60;
    const timerDisplay = `${timerMinutes}:${String(timerSeconds).padStart(2, '0')}`;
    const progressPercent = (timeLeft / 300) * 100;
    const progressClass = timeLeft <= 30 ? 'danger' : timeLeft <= 60 ? 'warning' : 'safe';

    // History month options (last 6 months)
    const monthOptions: string[] = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Filter checkins by historyMonth
    const filteredCheckins = checkins.filter(c => {
        const d = new Date(c.time);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return m === historyMonth;
    });

    if (loading) return (
        <div className="app-page">
            <AppSkeleton variant="card" count={2} />
        </div>
    );

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
                            SECURE CHECK-IN
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

            {/* ── QR Card ── */}
            <div className="qr-card">
                <div className="qr-header">
                    <span className="qr-label">SECURE ENTRY</span>
                    <span className="qr-member-id">ID: {memberId}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                    <div className="qr-image-area">
                        <QRCodeSVG
                            value={qrToken}
                            size={200}
                            level="M"
                            bgColor="transparent"
                            fgColor="#1A1A1A"
                            style={{ display: 'block', margin: '0 auto' }}
                        />
                    </div>
                    {/* Status indicator */}
                    <div style={{
                        position: 'absolute', top: -4, right: '20%',
                        width: 10, height: 10, borderRadius: '50%',
                        background: isActive ? '#22C55E' : '#EF4444',
                        border: '2px solid #fff',
                    }} />
                </div>

                {/* 5-minute timer */}
                <div className="qr-timer">
                    <div>
                        <span className="time-text">Expires in </span>
                        <span className="time-value" style={{ fontSize: '1.25rem', fontWeight: 800 }}>{timerDisplay}</span>
                    </div>
                    <span className="token-label">DYNAMIC TOKEN</span>
                </div>
                <div className="qr-progress">
                    <div
                        className={`qr-progress-bar ${progressClass}`}
                        style={{ width: `${progressPercent}%`, transition: 'width 1s linear' }}
                    />
                </div>

                {/* Manual refresh button  */}
                <button
                    onClick={generateToken}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--app-accent)', fontSize: '0.75rem', fontWeight: 600,
                        marginTop: '0.5rem', padding: '0.25rem 0.5rem',
                    }}
                >
                    🔄 새 코드 생성
                </button>
            </div>

            {/* ── Plan Status ── */}
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

            {/* ── Attendance Statistics ── */}
            <div className="app-section-header" style={{ marginBottom: '0.75rem' }}>
                <div className="app-section-label" style={{ marginBottom: 0 }}>ATTENDANCE STATISTICS</div>
                <Link href="/apps/records" className="app-link">View Full Report</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <StatCard
                    icon="📊"
                    value={monthlyCount}
                    label="이번 달"
                    suffix={weeklyDelta > 0 ? `+${weeklyDelta}` : undefined}
                />
                <StatCard
                    icon="🔥"
                    value={streak}
                    label="연속 출석"
                    suffix="일"
                />
                <StatCard
                    icon="📅"
                    value={checkedDates.length}
                    label="출석일 수"
                    suffix="일"
                />
            </div>

            {/* ── Monthly Attendance Calendar (MonthCalendar component) ── */}
            <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                <MonthCalendar
                    year={calYear}
                    month={calMonth}
                    checkedDates={calCheckedDates.length > 0 ? calCheckedDates : checkedDates}
                    onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
                />
            </div>

            {/* ── Check-in History with Month Filter ── */}
            <div className="app-section-header" style={{ marginBottom: '0.75rem' }}>
                <div className="app-section-label" style={{ marginBottom: 0 }}>CHECK-IN HISTORY</div>
                <select
                    value={historyMonth}
                    onChange={(e) => setHistoryMonth(e.target.value)}
                    style={{
                        background: 'var(--app-surface)', border: '1px solid var(--app-border)',
                        borderRadius: 'var(--app-radius-md)', padding: '0.25rem 0.5rem',
                        color: 'var(--app-text-primary)', fontSize: '0.75rem',
                        fontWeight: 600, outline: 'none', cursor: 'pointer',
                    }}
                >
                    {monthOptions.map(m => {
                        const [y, mo] = m.split('-');
                        const label = new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
                        return <option key={m} value={m}>{label}</option>;
                    })}
                </select>
            </div>

            {filteredCheckins.length === 0 ? (
                <div className="app-glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-text-secondary)' }}>
                    해당 월의 체크인 기록이 없습니다.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredCheckins.slice(0, 10).map((c) => {
                        const d = new Date(c.time);
                        return (
                            <div key={c.id} className="app-glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem' }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'var(--app-accent-light)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.875rem',
                                }}>✅</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                        {d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--app-text-secondary)' }}>
                                        {d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '0.6875rem', fontWeight: 600, padding: '0.125rem 0.5rem',
                                    borderRadius: 9999, background: 'rgba(74,222,128,0.1)', color: '#4ade80',
                                }}>확인됨</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
