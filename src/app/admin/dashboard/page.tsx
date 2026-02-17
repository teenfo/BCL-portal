'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

interface DashboardStats {
    todayBookings: number;
    todayCheckins: number;
    monthlyRevenue: number;
    activeMembers: number;
    totalMembers: number;
    expiredMembers: number;
    activeMemberships: number;
    totalCoaches: number;
}

interface RecentTransaction {
    id: string;
    member_name: string;
    amount: number;
    payment_status: string;
    category: string;
    created_at: string;
}

interface RecentCheckin {
    id: string;
    member_name: string;
    facility_name: string;
    checkin_method: string;
    checkin_time: string;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        todayBookings: 0, todayCheckins: 0, monthlyRevenue: 0,
        activeMembers: 0, totalMembers: 0, expiredMembers: 0,
        activeMemberships: 0, totalCoaches: 0,
    });
    const [recentTx, setRecentTx] = useState<RecentTransaction[]>([]);
    const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([]);
    const [loading, setLoading] = useState(true);

    const loadDashboard = useCallback(async () => {
        const supabase = createClient();
        const today = new Date().toISOString().split('T')[0];
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        try {
            const [
                membersRes, activeRes, expiredRes,
                checkinsRes, bookingsRes,
                txRes, membershipRes, coachRes,
                recentTxRes, recentCheckinRes
            ] = await Promise.all([
                supabase.from('members').select('id', { count: 'exact', head: true }),
                supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
                supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'Expired'),
                supabase.from('checkins').select('id', { count: 'exact', head: true }).gte('checkin_time', today + 'T00:00:00'),
                supabase.from('bookings').select('id', { count: 'exact', head: true }).gte('booking_date', today).lte('booking_date', today),
                supabase.from('transactions').select('amount').gte('created_at', startOfMonth + 'T00:00:00').eq('payment_status', 'completed'),
                supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('status', 'active'),
                supabase.from('coaches').select('id', { count: 'exact', head: true }).eq('status', 'active'),
                supabase.from('transactions').select('id, amount, payment_status, category, created_at, member_id, members(name)').order('created_at', { ascending: false }).limit(5),
                supabase.from('checkins').select('id, checkin_time, checkin_method, member_id, members(name), facility_id, facilities(name)').order('checkin_time', { ascending: false }).limit(6),
            ]);

            const monthlyRevenue = txRes.data?.reduce((sum: number, t: { amount: number }) => sum + Number(t.amount), 0) || 0;

            setStats({
                todayBookings: bookingsRes.count || 0,
                todayCheckins: checkinsRes.count || 0,
                monthlyRevenue,
                activeMembers: activeRes.count || 0,
                totalMembers: membersRes.count || 0,
                expiredMembers: expiredRes.count || 0,
                activeMemberships: membershipRes.count || 0,
                totalCoaches: coachRes.count || 0,
            });

            if (recentTxRes.data) {
                setRecentTx(recentTxRes.data.map((t: any) => ({
                    id: t.id,
                    member_name: t.members?.name || 'Unknown',
                    amount: Number(t.amount),
                    payment_status: t.payment_status,
                    category: t.category,
                    created_at: t.created_at,
                })));
            }

            if (recentCheckinRes.data) {
                setRecentCheckins(recentCheckinRes.data.map((c: any) => ({
                    id: c.id,
                    member_name: c.members?.name || 'Unknown',
                    facility_name: c.facilities?.name || '-',
                    checkin_method: c.checkin_method,
                    checkin_time: c.checkin_time,
                })));
            }
        } catch (error) {
            console.error('Dashboard Load Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    const methodIcons: Record<string, string> = { qr: '📱', kiosk: '🖥️', manual: '✋', face: '👤' };
    const statusColors: Record<string, { color: string; label: string }> = {
        completed: { color: '#22C55E', label: 'SUCCESS' },
        pending: { color: '#F59E0B', label: 'PENDING' },
        failed: { color: '#EF4444', label: 'FAILED' },
        refunded: { color: '#8B5CF6', label: 'REFUNDED' },
    };

    return (
        <div className="p-8 lg:p-12 transition-all duration-700">
            {/* Header */}
            <header className="flex items-end justify-between mb-12 animate-premium-fade">
                <div className="space-y-4">
                    <Logo size={28} className="opacity-80" collapsed={true} />
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_15px_var(--primary-glow)]"></span>
                            <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em] italic">Operational Intelligence</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight leading-none uppercase">
                            System Overview <span className="opacity-20 font-light ml-2">Enterprise</span>
                        </h1>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-1 italic">Current Network Lifecycle</p>
                    <p className="text-xl font-bold text-white tracking-tighter">
                        {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                    </p>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-64 space-y-6 opacity-40">
                    <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Synchronizing Data Stream...</p>
                </div>
            ) : (
                <div className="space-y-12 animate-premium-fade" style={{ animationDelay: '0.1s' }}>
                    {/* KPI Grid */}
                    <div className="grid grid-cols-12 gap-6">
                        {[
                            { label: 'Monthly Revenue', value: stats.monthlyRevenue > 0 ? `₩${(stats.monthlyRevenue / 10000).toFixed(0)}만` : '₩0', delta: '+15.2%', deltaColor: 'text-green-400', sub: `${new Date().getMonth() + 1}월 누적`, type: 'revenue' },
                            { label: 'Active Members', value: `${stats.activeMembers} / ${stats.totalMembers}`, delta: stats.totalMembers > 0 ? `${((stats.activeMembers / stats.totalMembers) * 100).toFixed(0)}%` : '0%', deltaColor: 'text-blue-400', sub: `활성 멤버십 ${stats.activeMemberships}건`, progress: stats.totalMembers > 0 ? (stats.activeMembers / stats.totalMembers) * 100 : 0, type: 'capacity' },
                            { label: 'Today Check-ins', value: stats.todayCheckins.toLocaleString(), delta: 'Live', deltaColor: 'text-[var(--primary)]', sub: `Today Bookings: ${stats.todayBookings}`, icon: '📡', type: 'checkin' },
                            { label: 'System Status', value: `${stats.totalCoaches} Coaches`, delta: `${stats.expiredMembers} Expired`, deltaColor: stats.expiredMembers > 5 ? 'text-red-500' : 'text-yellow-400', sub: 'Active Resources', icon: '⚙️', type: 'alerts' },
                        ].map((kpi, i) => (
                            <div key={i} className="col-span-12 md:col-span-6 xl:col-span-3 animate-scale-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="kpi-card h-full">
                                    <div className="flex items-start justify-between">
                                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] italic">{kpi.label}</h4>
                                        <div className={`px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.05] text-[9px] font-black ${kpi.deltaColor} uppercase tracking-tighter`}>
                                            {kpi.delta}
                                        </div>
                                    </div>
                                    <div className="mt-8">
                                        <p className="text-3xl font-black text-white tracking-tighter mb-1">{kpi.value}</p>
                                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{kpi.sub}</p>
                                    </div>
                                    {kpi.progress !== undefined && (
                                        <div className="mt-6 h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${kpi.progress}%`, background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-hover) 100%)', boxShadow: '0 0 12px rgba(255, 107, 0, 0.4)' }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mid Section: Revenue Chart & Live Check-ins */}
                    <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-12 xl:col-span-8">
                            <div className="glass-card p-8 h-full">
                                <div className="flex items-end justify-between mb-10">
                                    <div>
                                        <h3 className="text-xl font-black italic tracking-tighter uppercase">Revenue Dynamics</h3>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.3em] mt-1">Operational Performance Analysis</p>
                                    </div>
                                    <Link href="/admin/insights/finance" className="px-4 py-2 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[9px] font-black text-[var(--primary)] uppercase tracking-widest hover:bg-[var(--primary)]/20 transition-all">
                                        상세 리포트 →
                                    </Link>
                                </div>
                                <div className="relative h-[240px] w-full mt-4">
                                    <svg viewBox="0 0 800 240" className="w-full h-full">
                                        <defs>
                                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                                                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                                            </linearGradient>
                                            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="var(--primary)" />
                                                <stop offset="100%" stopColor="var(--primary-hover)" />
                                            </linearGradient>
                                        </defs>
                                        {[0, 60, 120, 180].map(y => (
                                            <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                        ))}
                                        <path d="M0,180 Q100,160 200,185 T400,140 T600,60 T800,100 L800,240 L0,240 Z" fill="url(#chartGradient)" className="opacity-60" />
                                        <path d="M0,180 Q100,160 200,185 T400,140 T600,60 T800,100" fill="none" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round" />
                                        <circle cx="600" cy="60" r="5" fill="var(--primary)" />
                                        <circle cx="600" cy="60" r="12" fill="var(--primary)" opacity="0.2" className="animate-ping" />
                                    </svg>
                                    <div className="flex justify-between px-2 mt-6 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.4em]">
                                        <span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-12 xl:col-span-4">
                            <div className="glass-card p-8 h-full flex flex-col">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-black italic tracking-tighter uppercase">Live Check-ins</h3>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Live</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                                    {recentCheckins.length > 0 ? recentCheckins.map((c) => (
                                        <div key={c.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group flex gap-4">
                                            <div className="text-[9px] font-black text-[var(--primary)] opacity-50 pt-1">
                                                {new Date(c.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-green-400">
                                                        {methodIcons[c.checkin_method] || '📍'} {c.checkin_method}
                                                    </span>
                                                    <span className="text-[7px] text-white/20 uppercase tracking-tighter">{c.facility_name}</span>
                                                </div>
                                                <p className="text-[12px] font-bold text-white leading-snug group-hover:text-[var(--primary)] transition-colors">{c.member_name}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-10 text-center opacity-30">
                                            <span className="text-2xl">📡</span>
                                            <p className="text-[9px] mt-2 uppercase tracking-widest">No recent check-ins</p>
                                        </div>
                                    )}
                                </div>
                                <Link href="/admin/checkins" className="mt-8 w-full py-3 rounded-xl bg-white/[0.03] border border-white/5 text-[9px] font-black text-white hover:bg-white/[0.06] transition-all uppercase tracking-widest text-center block">
                                    Full Check-in History →
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black italic tracking-tighter px-2">Quick Actions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: 'Members', sub: '회원 관리', icon: '👥', href: '/admin/members' },
                                { title: 'Schedule', sub: '수업 스케줄', icon: '📅', href: '/admin/operations/schedule' },
                                { title: 'Notifications', sub: '알림 전송', icon: '📢', href: '/admin/crm/notifications' },
                                { title: 'Transactions', sub: '결제 내역', icon: '💳', href: '/admin/transactions' },
                            ].map((action, i) => (
                                <Link key={i} href={action.href} className="glass-card p-8 group hover:glass-card-hover text-left flex flex-col gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-500">
                                        {action.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white group-hover:text-[var(--primary)] transition-colors">{action.title}</h4>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">{action.sub}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Recent Financial Activity */}
                    <section className="glass-card p-10">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase">Recent Financial Activity</h3>
                            <Link href="/admin/transactions" className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest hover:opacity-80 transition-opacity">
                                View All →
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {recentTx.length > 0 ? recentTx.map((tx) => {
                                const sc = statusColors[tx.payment_status] || statusColors.pending;
                                return (
                                    <div key={tx.id} className="grid grid-cols-12 gap-4 items-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                        <div className="col-span-3 text-[10px] font-bold text-[var(--text-muted)] uppercase">{new Date(tx.created_at).toLocaleDateString('ko-KR')}</div>
                                        <div className="col-span-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/5 flex items-center justify-center text-[10px] font-black text-[var(--primary)] uppercase">
                                                    {tx.member_name[0]}
                                                </div>
                                                <span className="text-sm font-bold text-white group-hover:text-[var(--primary)] transition-colors">{tx.member_name}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-[10px] font-bold text-white/30 truncate">{tx.category}</div>
                                        <div className="col-span-2">
                                            <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase" style={{ background: `${sc.color}15`, color: sc.color }}>{sc.label}</span>
                                        </div>
                                        <div className="col-span-2 text-right text-sm font-black text-white">₩{Number(tx.amount).toLocaleString()}</div>
                                    </div>
                                );
                            }) : (
                                <div className="py-10 text-center opacity-30">
                                    <span className="text-2xl">💳</span>
                                    <p className="text-[9px] mt-2 uppercase tracking-widest">No recent transactions</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}

            <footer className="mt-32 pb-12 opacity-20 flex items-center justify-between border-t border-white/[0.05] pt-10">
                <div className="flex items-center gap-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">© 2026 BCL PORTAL INTELLIGENCE</span>
                    <div className="h-4 w-[1px] bg-white/20"></div>
                    <span className="text-[9px] font-bold uppercase tracking-widest">Branch ID: PX-ENTERPRISE-01</span>
                </div>
            </footer>
        </div>
    );
}
