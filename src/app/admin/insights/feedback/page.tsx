'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import Image from 'next/image';
import { IconStar, IconMessage, IconTrendingUp, IconUsers } from '@/components/icons/AdminIcons';
import { useToast } from '@/components/ui/Toast';

interface Feedback {
    id: string;
    session_id: string;
    member_id: string;
    coach_id: string;
    rating: number;
    comment: string | null;
    admin_response: string | null;
    created_at: string;
    responded_at: string | null;
    members?: { name: string; profile_image_url: string | null };
    sessions?: { title: string };
    coaches?: { name: string };
}

interface CoachStat {
    name: string;
    avgRating: number;
    count: number;
}

export default function FeedbackInsightsPage() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        avgRating: 0,
        totalCount: 0,
        negativeRate: 0,
        responseRate: 0
    });
    const [coachStats, setCoachStats] = useState<CoachStat[]>([]);
    const [filter, setFilter] = useState({
        rating: 'all',
        coach: 'all',
        status: 'all',
        search: ''
    });
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
    const [replyText, setReplyText] = useState('');
    const [saving, setSaving] = useState(false);
    const { success, error: toastError } = useToast();

    const loadData = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        try {
            const { data, error } = await query('session_feedback')
                
                .select('*, members(name, profile_image_url), sessions(title), coaches(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const raw = data as Feedback[];
            setFeedbacks(raw);

            // Calculate KPIs
            if (raw.length > 0) {
                const total = raw.length;
                const sum = raw.reduce((s, f) => s + f.rating, 0);
                const negative = raw.filter(f => f.rating <= 2).length;
                const responded = raw.filter(f => f.admin_response).length;

                setStats({
                    avgRating: Number((sum / total).toFixed(1)),
                    totalCount: total,
                    negativeRate: Number(((negative / total) * 100).toFixed(1)),
                    responseRate: Number(((responded / total) * 100).toFixed(1))
                });

                // Coach stats
                const coachMap: Record<string, { sum: number; count: number }> = {};
                raw.forEach(f => {
                    const name = f.coaches?.name || 'Unknown';
                    if (!coachMap[name]) coachMap[name] = { sum: 0, count: 0 };
                    coachMap[name].sum += f.rating;
                    coachMap[name].count += 1;
                });
                const cStats = Object.entries(coachMap)
                    .map(([name, d]) => ({ name, avgRating: Number((d.sum / d.count).toFixed(1)), count: d.count }))
                    .sort((a, b) => b.avgRating - a.avgRating);
                setCoachStats(cStats);
            }
        } catch (e: any) {
            toastError(`데이터 로드 실패: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [toastError]);

    useEffect(() => { loadData(); }, [loadData]);

    async function submitReply() {
        if (!selectedFeedback || !replyText.trim()) return;
        setSaving(true);
        const supabase = createClient();

        const { error } = await query('session_feedback')
            
            .update({
                admin_response: replyText,
                responded_at: new Date().toISOString(),
                responded_by: (await supabase.auth.getUser()).data.user?.id
            })
            .eq('id', selectedFeedback.id);

        setSaving(false);
        if (error) {
            toastError(`답변 저장 실패: ${error.message}`);
        } else {
            success('답변이 등록되었습니다.');
            setReplyText('');
            setSelectedFeedback(null);
            loadData();
        }
    }

    const filteredFeedbacks = feedbacks.filter(f => {
        if (filter.rating !== 'all' && f.rating !== parseInt(filter.rating)) return false;
        if (filter.coach !== 'all' && f.coaches?.name !== filter.coach) return false;
        if (filter.status === 'pending' && f.admin_response) return false;
        if (filter.status === 'answered' && !f.admin_response) return false;
        if (filter.search) {
            const term = filter.search.toLowerCase();
            return f.members?.name.toLowerCase().includes(term) || f.comment?.toLowerCase().includes(term);
        }
        return true;
    });

    const coaches = Array.from(new Set(feedbacks.map(f => f.coaches?.name).filter(Boolean)));

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Insights"
                title="Feedback"
                subtitle="Member Sentiment"
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {loading ? (
                    <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
                ) : (
                    <div className="space-y-10">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-4 gap-6">
                            <div className="kpi-card relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><IconStar size={40} /></div>
                                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Average Rating</h4>
                                <p className="text-4xl font-black text-white mt-4">{stats.avgRating} <span className="text-sm text-yellow-400">★</span></p>
                                <p className="text-[9px] text-[var(--primary)] font-bold mt-1 uppercase tracking-widest">Total {stats.totalCount} Feedbacks</p>
                            </div>
                            <div className="kpi-card">
                                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Negative Rate</h4>
                                <p className="text-4xl font-black text-white mt-4">{stats.negativeRate}%</p>
                                <p className="text-[9px] text-red-400 font-bold mt-1 uppercase tracking-widest">Ratings ≤ 2 stars</p>
                            </div>
                            <div className="kpi-card">
                                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Response Rate</h4>
                                <p className="text-4xl font-black text-white mt-4">{stats.responseRate}%</p>
                                <p className="text-[9px] text-green-400 font-bold mt-1 uppercase tracking-widest">Admin Replied</p>
                            </div>
                            <div className="kpi-card">
                                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Feedback Density</h4>
                                <p className="text-4xl font-black text-white mt-4">{(stats.totalCount / 30).toFixed(1)}</p>
                                <p className="text-[9px] text-blue-400 font-bold mt-1 uppercase tracking-widest">Avg per day</p>
                            </div>
                        </div>

                        {/* Mid Section: Charts/Stats */}
                        <div className="grid grid-cols-12 gap-8">
                            <div className="col-span-12 glass-card p-8">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 inline-flex items-center gap-2"><IconTrendingUp size={20} /> Coach Performance</h3>
                                <div className="space-y-6">
                                    {coachStats.map((cs) => (
                                        <div key={cs.name}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-white">{cs.name}</span>
                                                    <span className="text-[10px] text-white/40">({cs.count} feedbacks)</span>
                                                </div>
                                                <span className="text-xs font-black text-[var(--primary)]">{cs.avgRating} ★</span>
                                            </div>
                                            <div className="h-2 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${(cs.avgRating / 5) * 100}%`, background: cs.avgRating >= 4.5 ? '#22C55E' : cs.avgRating >= 3.5 ? 'var(--primary)' : '#EF4444' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Feedback List */}
                        <div className="glass-card p-8">
                            <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight inline-flex items-center gap-2"><IconMessage size={20} /> Detailed Feedback</h3>
                                <div className="flex flex-wrap items-center gap-3">
                                    <input
                                        type="text"
                                        placeholder="Search comment or member..."
                                        className="admin-search-input min-w-[200px]"
                                        value={filter.search}
                                        onChange={e => setFilter({ ...filter, search: e.target.value })}
                                    />
                                    <select className="admin-search-input" value={filter.rating} onChange={e => setFilter({ ...filter, rating: e.target.value })}>
                                        <option value="all">Rating: All</option>
                                        <option value="5">5 Stars</option>
                                        <option value="4">4 Stars</option>
                                        <option value="3">3 Stars</option>
                                        <option value="2">2 Stars</option>
                                        <option value="1">1 Star</option>
                                    </select>
                                    <select className="admin-search-input" value={filter.coach} onChange={e => setFilter({ ...filter, coach: e.target.value })}>
                                        <option value="all">Coach: All</option>
                                        {coaches.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <select className="admin-search-input" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
                                        <option value="all">Status: All</option>
                                        <option value="pending">Pending</option>
                                        <option value="answered">Answered</option>
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                            <th className="px-4 py-4">Member</th>
                                            <th className="px-4 py-4">Rating</th>
                                            <th className="px-4 py-4">Coach / Session</th>
                                            <th className="px-4 py-4">Comment</th>
                                            <th className="px-4 py-4">Status</th>
                                            <th className="px-4 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03]">
                                        {filteredFeedbacks.map((f) => (
                                            <tr key={f.id} className="group hover:bg-white/[0.01] transition-colors">
                                                <td className="px-4 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                                            {f.members?.profile_image_url ? (
                                                                <Image src={f.members.profile_image_url} alt="" width={32} height={32} className="object-cover rounded-full" />
                                                            ) : (
                                                                <IconUsers size={14} className="text-white/20" />
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-bold text-white">{f.members?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5">
                                                    <div className="flex items-center gap-0.5">
                                                        {[1, 2, 3, 4, 5].map(s => (
                                                            <IconStar key={s} size={12} className={s <= f.rating ? 'text-yellow-400' : 'text-white/5'} />
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5">
                                                    <p className="text-[11px] font-bold text-white">{f.coaches?.name}</p>
                                                    <p className="text-[9px] text-white/40">{f.sessions?.title}</p>
                                                </td>
                                                <td className="px-4 py-5 max-w-[300px]">
                                                    <p className="text-[11px] text-white/70 line-clamp-1">{f.comment || '-'}</p>
                                                    <p className="text-[8px] text-white/30 mt-1">{new Date(f.created_at).toLocaleDateString()}</p>
                                                </td>
                                                <td className="px-4 py-5">
                                                    {f.admin_response ? (
                                                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-green-500/10 text-green-400 border border-green-500/20">Answered</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Pending</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-5 text-right">
                                                    <button
                                                        onClick={() => { setSelectedFeedback(f); setReplyText(f.admin_response || ''); }}
                                                        className="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 transition-all"
                                                    >
                                                        {f.admin_response ? 'View Reply' : 'View & Reply'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredFeedbacks.length === 0 && (
                                    <div className="py-20 text-center opacity-30">
                                        <IconMessage size={40} className="mx-auto mb-4" />
                                        <p className="text-sm font-bold">No feedback matches your filters</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Reply Modal */}
            <AdminModal
                isOpen={!!selectedFeedback}
                onClose={() => setSelectedFeedback(null)}
                title="Feedback Details & Response"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setSelectedFeedback(null)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/50 bg-white/[0.03] border border-white/5">Close</button>
                        <button
                            onClick={submitReply}
                            disabled={saving || !replyText.trim()}
                            className="admin-action-btn disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Response'}
                        </button>
                    </div>
                }
            >
                {selectedFeedback && (
                    <div className="space-y-6">
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-black">
                                        {selectedFeedback.members?.name[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white">{selectedFeedback.members?.name}</p>
                                        <p className="text-[10px] text-white/40">{new Date(selectedFeedback.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map(s => <IconStar key={s} size={14} className={s <= selectedFeedback.rating ? 'text-yellow-400' : 'text-white/5'} />)}
                                </div>
                            </div>
                            <p className="text-sm text-white/80 leading-relaxed font-medium italic">&quot;{selectedFeedback.comment || 'No comment provided.'}&quot;</p>
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Target Session</p>
                                <p className="text-xs font-bold text-white mt-1">{selectedFeedback.sessions?.title} with {selectedFeedback.coaches?.name}</p>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">Admin Response</label>
                            <textarea
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Write your response to the member..."
                                className="w-full admin-search-input min-h-[120px] py-4 leading-relaxed"
                            />
                            <p className="text-[9px] text-white/30 mt-2">Responses are visible to the member in their app.</p>
                        </div>
                    </div>
                )}
            </AdminModal>
        </div>
    );
}

