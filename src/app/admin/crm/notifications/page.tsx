'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Notification {
    id: string;
    member_id: string | null;
    title: string;
    message: string;
    type: string;
    channel: string;
    is_read: boolean;
    sent_at: string;
    created_at: string;
    members?: { name: string; email: string };
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [showSendModal, setShowSendModal] = useState(false);
    const [sendForm, setSendForm] = useState({ title: '', message: '', type: 'info', channel: 'push', target: 'all' });
    const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

    const loadNotifications = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        let query = supabase.from('notifications').select('*, members(name, email)').order('created_at', { ascending: false }).limit(100);
        if (filterType !== 'all') query = query.eq('type', filterType);
        const { data } = await query;
        if (data) setNotifications(data);
        setLoading(false);
    }, [filterType]);

    useEffect(() => { loadNotifications(); }, [loadNotifications]);
    useEffect(() => {
        async function loadMembers() {
            const { data } = await createClient().from('members').select('id, name').order('name');
            if (data) setMembers(data);
        }
        loadMembers();
    }, []);

    async function sendNotification() {
        if (!sendForm.title || !sendForm.message) return;
        const supabase = createClient();
        if (sendForm.target === 'all') {
            const inserts = members.map(m => ({ member_id: m.id, title: sendForm.title, message: sendForm.message, type: sendForm.type, channel: sendForm.channel, sent_at: new Date().toISOString() }));
            if (inserts.length > 0) await supabase.from('notifications').insert(inserts);
        }
        setShowSendModal(false);
        setSendForm({ title: '', message: '', type: 'info', channel: 'push', target: 'all' });
        loadNotifications();
    }

    const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
        info: { icon: 'ℹ️', color: '#3B82F6', label: '안내' },
        warning: { icon: '⚠️', color: '#F59E0B', label: '경고' },
        promotion: { icon: '🎉', color: '#22C55E', label: '프로모션' },
        reminder: { icon: '⏰', color: '#8B5CF6', label: '리마인더' },
        system: { icon: '⚙️', color: '#6B7280', label: '시스템' },
    };

    // Stats
    const totalSent = notifications.length;
    const readCount = notifications.filter(n => n.is_read).length;
    const readRate = totalSent > 0 ? ((readCount / totalSent) * 100).toFixed(1) : '0';

    return (
        <div className="p-8 lg:p-12">
            <header className="flex items-end justify-between mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
                        <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em]">CRM</span>
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase">Notifications <span className="opacity-20 font-light ml-2">Center</span></h1>
                </div>
                <button onClick={() => setShowSendModal(true)} className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest" style={{ background: 'var(--primary)', color: '#fff', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>📤 알림 전송</button>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-12 gap-6 mb-10">
                <div className="col-span-4 kpi-card"><h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Sent</h4><p className="text-3xl font-black text-white mt-4">{totalSent}</p></div>
                <div className="col-span-4 kpi-card"><h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Read</h4><p className="text-3xl font-black text-white mt-4">{readCount}</p></div>
                <div className="col-span-4 kpi-card"><h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Read Rate</h4><p className="text-3xl font-black text-[var(--primary)] mt-4">{readRate}%</p></div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-8">
                {['all', ...Object.keys(typeConfig)].map((t) => (
                    <button key={t} onClick={() => setFilterType(t)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterType === t ? 'bg-[var(--primary)] text-white' : 'bg-white/[0.03] border border-white/5 text-[var(--text-muted)]'}`}>
                        {t === 'all' ? '전체' : typeConfig[t]?.label}
                    </button>
                ))}
            </div>

            {/* Notification List */}
            {loading ? (
                <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
            ) : notifications.length === 0 ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40"><span className="text-4xl mb-4">🔔</span><p className="text-[10px] font-black uppercase tracking-[0.4em]">No notifications</p></div>
            ) : (
                <div className="space-y-2">
                    {notifications.map((n) => {
                        const tc = typeConfig[n.type] || typeConfig.info;
                        return (
                            <div key={n.id} className="grid grid-cols-12 gap-4 items-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all">
                                <div className="col-span-1 text-center"><span className="text-lg">{tc.icon}</span></div>
                                <div className="col-span-4">
                                    <h4 className="text-xs font-black text-white">{n.title}</h4>
                                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5 line-clamp-1">{n.message}</p>
                                </div>
                                <div className="col-span-2"><span className="text-[10px] text-white">{n.members?.name || '전체'}</span></div>
                                <div className="col-span-2"><span className="text-[9px] text-[var(--text-muted)]">{new Date(n.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></div>
                                <div className="col-span-1"><span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${n.is_read ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'}`}>{n.is_read ? '읽음' : '미읽음'}</span></div>
                                <div className="col-span-2 text-right"><span className="text-[8px] font-black uppercase tracking-widest" style={{ color: tc.color }}>{tc.label}</span></div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Send Modal */}
            {showSendModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSendModal(false)}>
                    <div className="glass-card p-8 rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-black text-white uppercase mb-8">알림 전송</h2>
                        <div className="space-y-5">
                            <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">제목</label><input value={sendForm.title} onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none" /></div>
                            <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">메시지</label><textarea value={sendForm.message} onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })} rows={4} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none resize-none" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">유형</label><select value={sendForm.type} onChange={(e) => setSendForm({ ...sendForm, type: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none"><option value="info">안내</option><option value="warning">경고</option><option value="promotion">프로모션</option><option value="reminder">리마인더</option></select></div>
                                <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">채널</label><select value={sendForm.channel} onChange={(e) => setSendForm({ ...sendForm, channel: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white outline-none"><option value="push">Push</option><option value="sms">SMS</option><option value="email">Email</option></select></div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setShowSendModal(false)} className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black text-white uppercase">취소</button>
                            <button onClick={sendNotification} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase" style={{ background: 'var(--primary)' }}>전송</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
