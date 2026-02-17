'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconCircle, IconFlag, IconStar, IconClock, IconSettings, IconSend, IconBell } from '@/components/icons/AdminIcons';

// ── Types ──
interface Notification {
    id: string;
    user_id: string | null;
    member_id: string | null;
    title: string;
    content: string;
    category: string;
    type: string;
    channel: string;
    is_read: boolean;
    action_url: string | null;
    sent_at: string | null;
    created_at: string;
    members?: { name: string; email: string };
}

interface NotifRule {
    id: string;
    name: string;
    description: string;
    trigger_type: string;
    trigger_config: Record<string, unknown>;
    title_template: string;
    message_template: string;
    category: string;
    channels: string[];
    is_active: boolean;
    facility_id: string | null;
    created_at: string;
    updated_at: string;
}

const TAB_ITEMS = [
    { key: 'history', label: '📋 History', desc: 'Sent notifications' },
    { key: 'rules', label: '⚡ Rules', desc: 'Auto-notification rules' },
    { key: 'compose', label: '✏️ Compose', desc: 'Send new notification' },
];

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    info: { icon: <IconCircle size={14} />, color: '#3B82F6', label: '안내' },
    warning: { icon: <IconFlag size={14} />, color: '#F59E0B', label: '경고' },
    success: { icon: <IconCircle size={14} />, color: '#22C55E', label: '성공' },
    error: { icon: <IconFlag size={14} />, color: '#EF4444', label: '에러' },
    promotion: { icon: <IconStar size={14} />, color: '#22C55E', label: '프로모션' },
};

const categoryConfig: Record<string, { label: string; emoji: string }> = {
    class_reminder: { label: '수업 알림', emoji: '📅' },
    waitlist_vacancy: { label: '빈자리', emoji: '🎉' },
    membership_expiry: { label: '만료 안내', emoji: '⚠️' },
    promotion: { label: '프로모션', emoji: '🎁' },
    checkin: { label: '체크인', emoji: '✅' },
    system: { label: '시스템', emoji: '🔧' },
    general: { label: '일반', emoji: '🔔' },
};

const triggerLabels: Record<string, string> = {
    time_before_session: '수업 시작 전',
    booking_cancelled: '예약 취소 (빈자리)',
    membership_expiry_dday: '멤버십 만료 D-Day',
    checkin_completed: '체크인 완료',
    cron_schedule: '커스텀 스케줄',
};

export default function NotificationsPage() {
    const [activeTab, setActiveTab] = useState('history');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [rules, setRules] = useState<NotifRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [members, setMembers] = useState<{ id: string; name: string; user_id: string }[]>([]);
    const [sendForm, setSendForm] = useState({
        title: '',
        content: '',
        category: 'general' as string,
        type: 'info',
        channel: 'in_app',
        target: 'all',
        targetMemberId: '',
    });
    const [sending, setSending] = useState(false);
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [editingRule, setEditingRule] = useState<NotifRule | null>(null);

    // ── Load Data ──
    const loadNotifications = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        let query = supabase
            .from('notifications')
            .select('*, members!notifications_member_id_fkey(name, email)')
            .order('created_at', { ascending: false })
            .limit(200);

        if (filterType !== 'all') query = query.eq('type', filterType);
        const { data, error } = await query;
        if (error) {
            console.warn('Notifications JOIN error, using fallback:', error.message);
            const { data: fallbackData } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200);
            if (fallbackData) setNotifications(fallbackData as any);
        } else {
            if (data) setNotifications(data);
        }
        setLoading(false);
    }, [filterType]);

    const loadRules = useCallback(async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('notification_rules')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setRules(data as any);
    }, []);

    useEffect(() => {
        loadNotifications();
        loadRules();
    }, [loadNotifications, loadRules]);

    useEffect(() => {
        async function loadMembers() {
            const { data } = await createClient()
                .from('members')
                .select('id, name, user_id')
                .order('name');
            if (data) setMembers(data);
        }
        loadMembers();
    }, []);

    // ── Actions ──
    async function sendNotification() {
        if (!sendForm.title || !sendForm.content) return;
        setSending(true);
        const supabase = createClient();

        if (sendForm.target === 'all') {
            const inserts = members.map(m => ({
                user_id: m.user_id,
                member_id: m.id,
                title: sendForm.title,
                content: sendForm.content,
                category: sendForm.category,
                type: sendForm.type,
                channel: sendForm.channel,
                sent_at: new Date().toISOString(),
                sent_via: [sendForm.channel],
            }));
            if (inserts.length > 0) await supabase.from('notifications').insert(inserts);
        } else if (sendForm.targetMemberId) {
            const member = members.find(m => m.id === sendForm.targetMemberId);
            if (member) {
                await supabase.from('notifications').insert({
                    user_id: member.user_id,
                    member_id: member.id,
                    title: sendForm.title,
                    content: sendForm.content,
                    category: sendForm.category,
                    type: sendForm.type,
                    channel: sendForm.channel,
                    sent_at: new Date().toISOString(),
                    sent_via: [sendForm.channel],
                });
            }
        }

        setSendForm({ title: '', content: '', category: 'general', type: 'info', channel: 'in_app', target: 'all', targetMemberId: '' });
        setSending(false);
        setActiveTab('history');
        loadNotifications();
    }

    async function toggleRule(rule: NotifRule) {
        const supabase = createClient();
        await supabase.from('notification_rules').update({ is_active: !rule.is_active }).eq('id', rule.id);
        loadRules();
    }

    async function deleteRule(id: string) {
        if (!confirm('이 규칙을 삭제하시겠습니까?')) return;
        const supabase = createClient();
        await supabase.from('notification_rules').delete().eq('id', id);
        loadRules();
    }

    // ── Stats ──
    const totalSent = notifications.length;
    const readCount = notifications.filter(n => n.is_read).length;
    const readRate = totalSent > 0 ? ((readCount / totalSent) * 100).toFixed(1) : '0';
    const activeRules = rules.filter(r => r.is_active).length;

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="CRM"
                title="Notifications"
                subtitle="Center"
                actions={
                    <button onClick={() => setActiveTab('compose')} className="admin-action-btn">
                        <span className="inline-flex items-center gap-1">
                            <IconSend size={14} /> 알림 전송
                        </span>
                    </button>
                }
            />

            <div className="p-10 max-w-[1400px] mx-auto">

                {/* Stats */}
                <div className="grid grid-cols-12 gap-6 mb-10">
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Sent</h4>
                        <p className="text-3xl font-black text-white mt-4">{totalSent}</p>
                    </div>
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Read</h4>
                        <p className="text-3xl font-black text-white mt-4">{readCount}</p>
                    </div>
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Read Rate</h4>
                        <p className="text-3xl font-black text-[var(--primary)] mt-4">{readRate}%</p>
                    </div>
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Active Rules</h4>
                        <p className="text-3xl font-black text-[#22C55E] mt-4">{activeRules}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8">
                    {TAB_ITEMS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`admin-filter-btn ${activeTab === tab.key ? 'active' : ''}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab: History ── */}
                {activeTab === 'history' && (
                    <div>
                        {/* Type Filters */}
                        <div className="flex gap-2 mb-6">
                            {['all', ...Object.keys(typeConfig)].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setFilterType(t)}
                                    className={`admin-filter-btn ${filterType === t ? 'active' : ''}`}
                                    style={{ fontSize: '11px' }}
                                >
                                    {t === 'all' ? '전체' : typeConfig[t]?.label}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-64">
                                <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40">
                                <span className="text-4xl mb-4"><IconBell size={40} /></span>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">No notifications</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {notifications.map((n) => {
                                    const tc = typeConfig[n.type] || typeConfig.info;
                                    const cc = categoryConfig[n.category] || categoryConfig.general;
                                    return (
                                        <div key={n.id} className="grid grid-cols-12 gap-4 items-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all">
                                            <div className="col-span-1 text-center">
                                                <span className="text-lg">{cc.emoji}</span>
                                            </div>
                                            <div className="col-span-4">
                                                <h4 className="text-xs font-black text-white">{n.title}</h4>
                                                <p className="text-[9px] text-[var(--text-muted)] mt-0.5 line-clamp-1">{n.content}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-[10px] text-white">{n.members?.name || '전체'}</span>
                                            </div>
                                            <div className="col-span-1">
                                                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${tc.color}20`, color: tc.color }}>
                                                    {cc.label}
                                                </span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-[9px] text-[var(--text-muted)]">
                                                    {new Date(n.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-right flex items-center justify-end gap-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${n.is_read ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'}`}>
                                                    {n.is_read ? '읽음' : '미읽음'}
                                                </span>
                                                <span className="text-[8px] text-[var(--text-muted)] uppercase">{n.channel}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Rules ── */}
                {activeTab === 'rules' && (
                    <div>
                        <div className="space-y-3">
                            {rules.length === 0 ? (
                                <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40">
                                    <span className="text-4xl mb-4">⚡</span>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">No rules configured</p>
                                </div>
                            ) : (
                                rules.map(rule => {
                                    const cc = categoryConfig[rule.category] || categoryConfig.general;
                                    return (
                                        <div key={rule.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-2xl">{cc.emoji}</span>
                                                    <div>
                                                        <h4 className="text-sm font-black text-white">{rule.name}</h4>
                                                        <p className="text-[10px] text-[var(--text-muted)] mt-1">{rule.description}</p>
                                                        <div className="flex items-center gap-3 mt-3">
                                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 font-bold">
                                                                {triggerLabels[rule.trigger_type] || rule.trigger_type}
                                                            </span>
                                                            {rule.channels.map(ch => (
                                                                <span key={ch} className="text-[8px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(255,107,0,0.15)', color: 'var(--primary)' }}>
                                                                    {ch}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => toggleRule(rule)}
                                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${rule.is_active
                                                            ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                                                            : 'bg-white/5 text-white/30 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {rule.is_active ? 'Active' : 'Inactive'}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteRule(rule.id)}
                                                        className="px-3 py-2 rounded-lg text-[10px] font-black text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                                <p className="text-[10px] text-white/50">
                                                    <span className="font-bold text-white/70">Template:</span> {rule.title_template} — {rule.message_template}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ── Tab: Compose ── */}
                {activeTab === 'compose' && (
                    <div className="max-w-2xl">
                        <div className="glass-card p-8">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8">Compose Notification</h3>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">제목</label>
                                    <input
                                        value={sendForm.title}
                                        onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                                        placeholder="알림 제목 입력"
                                        className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">메시지</label>
                                    <textarea
                                        value={sendForm.content}
                                        onChange={(e) => setSendForm({ ...sendForm, content: e.target.value })}
                                        placeholder="알림 내용 입력"
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all resize-none"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">카테고리</label>
                                        <select
                                            value={sendForm.category}
                                            onChange={(e) => setSendForm({ ...sendForm, category: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                        >
                                            {Object.entries(categoryConfig).map(([key, c]) => (
                                                <option key={key} value={key}>{c.emoji} {c.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">유형</label>
                                        <select
                                            value={sendForm.type}
                                            onChange={(e) => setSendForm({ ...sendForm, type: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                        >
                                            {Object.entries(typeConfig).map(([key, t]) => (
                                                <option key={key} value={key}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">채널</label>
                                        <select
                                            value={sendForm.channel}
                                            onChange={(e) => setSendForm({ ...sendForm, channel: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                        >
                                            <option value="in_app">In-App</option>
                                            <option value="push">Push</option>
                                            <option value="sms">SMS</option>
                                            <option value="email">Email</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">대상</label>
                                        <select
                                            value={sendForm.target}
                                            onChange={(e) => setSendForm({ ...sendForm, target: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                        >
                                            <option value="all">전체 회원</option>
                                            <option value="individual">개인</option>
                                        </select>
                                    </div>
                                </div>

                                {sendForm.target === 'individual' && (
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">회원 선택</label>
                                        <select
                                            value={sendForm.targetMemberId}
                                            onChange={(e) => setSendForm({ ...sendForm, targetMemberId: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                        >
                                            <option value="">선택...</option>
                                            {members.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                >
                                    취소
                                </button>
                                <button
                                    onClick={sendNotification}
                                    disabled={sending || !sendForm.title || !sendForm.content}
                                    className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-30"
                                    style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                                >
                                    {sending ? '전송 중...' : '전송'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
