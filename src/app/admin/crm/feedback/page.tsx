'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';

interface FeedbackItem {
    id: string;
    session_id: string | null;
    member_id: string | null;
    coach_id: string | null;
    rating: number;
    comment: string;
    admin_response: string | null;
    responded_at: string | null;
    created_at: string;
    members?: { name: string; email: string } | null;
    sessions?: { title: string } | null;
    coaches?: { name: string } | null;
}

export default function FeedbackPage() {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
    const [replyText, setReplyText] = useState('');
    const [saving, setSaving] = useState(false);
    // T2-4: Additional filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCoach, setFilterCoach] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const loadFeedback = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        try {
            // Try with JOINs first
            const { data, error } = await supabase
                .from('session_feedback')
                .select('*, members(name, email), sessions(title), coaches(name)')
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Feedback JOIN error, using fallback:', error.message);
                const { data: fallbackData } = await supabase
                    .from('session_feedback')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (fallbackData) setFeedback(fallbackData as any);
            } else {
                if (data) setFeedback(data as any);
            }
        } catch (e) {
            console.error('Error loading feedback:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadFeedback(); }, [loadFeedback]);

    async function submitReply(feedbackId: string) {
        if (!replyText.trim()) return;
        setSaving(true);
        const supabase = createClient();
        const { error } = await supabase
            .from('session_feedback')
            .update({ admin_response: replyText, responded_at: new Date().toISOString() })
            .eq('id', feedbackId);
        setSaving(false);
        if (!error) {
            setReplyText('');
            setSelectedFeedback(null);
            loadFeedback();
        }
    }

    const intermediateFiltered = filter === 'all'
        ? feedback
        : filter === 'responded'
            ? feedback.filter(f => f.admin_response)
            : filter === 'pending'
                ? feedback.filter(f => !f.admin_response)
                : feedback.filter(f => f.rating <= 2);

    // T2-4: Apply additional filters
    const finalFiltered = intermediateFiltered.filter(f => {
        // Coach filter
        if (filterCoach !== 'all') {
            const coachName = (f.coaches as any)?.name || '';
            if (coachName !== filterCoach) return false;
        }
        // Date range
        if (dateFrom && f.created_at && f.created_at < dateFrom) return false;
        if (dateTo && f.created_at && f.created_at > `${dateTo}T23:59:59`) return false;
        // Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const memberName = ((f.members as any)?.name || '').toLowerCase();
            const sessionTitle = ((f.sessions as any)?.title || '').toLowerCase();
            const comment = (f.comment || '').toLowerCase();
            if (!memberName.includes(term) && !sessionTitle.includes(term) && !comment.includes(term)) return false;
        }
        return true;
    });

    // T2-4: Unique coaches for filter
    const uniqueCoaches = Array.from(new Set(feedback.map(f => (f.coaches as any)?.name).filter(Boolean)));

    const avgRating = feedback.length > 0 ? (feedback.reduce((s, f) => s + (f.rating || 0), 0) / feedback.length).toFixed(1) : '0';
    const respondedCount = feedback.filter(f => f.admin_response).length;
    const lowRatingCount = feedback.filter(f => f.rating <= 2).length;

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="CRM"
                title="Feedback"
                subtitle="Management"
            />

            <div className="p-10 max-w-[1400px] mx-auto">

                {/* Stats */}
                <div className="grid grid-cols-12 gap-6 mb-10">
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Feedback</h4>
                        <p className="text-4xl font-black text-white mt-4">{feedback.length}</p>
                    </div>
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Avg Rating</h4>
                        <div className="mt-4 flex items-end gap-2">
                            <p className="text-4xl font-black text-[var(--primary)]">{avgRating}</p>
                            <p className="text-lg text-yellow-400 mb-1">{'★'.repeat(Math.round(Number(avgRating)))}</p>
                        </div>
                    </div>
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Responded</h4>
                        <div className="mt-4 flex items-end gap-2">
                            <p className="text-4xl font-black text-green-400">{respondedCount}</p>
                            <p className="text-xs text-[var(--text-muted)] mb-1">/ {feedback.length}</p>
                        </div>
                    </div>
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Low Rating</h4>
                        <p className="text-4xl font-black text-red-400 mt-4">{lowRatingCount}</p>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2 mb-8">
                    {[
                        { key: 'all', label: '전체' },
                        { key: 'pending', label: '미답변' },
                        { key: 'responded', label: '답변완료' },
                        { key: 'low', label: '낮은 평점' },
                    ].map(({ key, label }) => (
                        <button key={key} onClick={() => setFilter(key)} className={`admin-filter-btn ${filter === key ? 'active' : ''}`}>
                            {label}
                        </button>
                    ))}
                </div>
                {/* T2-4: Coach filter + search + date range */}
                <div className="flex items-center gap-3 mb-8">
                    <select value={filterCoach} onChange={(e) => setFilterCoach(e.target.value)} className="admin-search-input" style={{ maxWidth: 160 }}>
                        <option value="all">코치 전체</option>
                        {uniqueCoaches.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="text" placeholder="회원, 수업, 내용 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 admin-search-input" />
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="admin-search-input" style={{ maxWidth: 140 }} />
                    <span className="text-white/30 text-xs">~</span>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="admin-search-input" style={{ maxWidth: 140 }} />
                </div>

                {/* Loading */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="glass-card p-6 rounded-2xl animate-pulse">
                                <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
                                <div className="h-3 bg-white/5 rounded w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : finalFiltered.length === 0 ? (
                    <div className="glass-card p-16 rounded-2xl text-center">
                        <p className="text-4xl mb-4">💬</p>
                        <p className="text-white/40 text-sm">피드백이 없습니다</p>
                    </div>
                ) : (
                    /* Feedback List */
                    <div className="space-y-4">
                        {finalFiltered.map((f) => {
                            const memberName = (f.members as any)?.name || '회원';
                            const sessionTitle = (f.sessions as any)?.title || '-';
                            const coachName = (f.coaches as any)?.name || '-';
                            const dateStr = f.created_at ? new Date(f.created_at).toLocaleDateString('ko-KR') : '';

                            return (
                                <div key={f.id} className="glass-card p-6 rounded-2xl group hover:border-white/10 transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,107,0,0.1))', color: 'var(--primary)' }}>
                                                {memberName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white">{memberName}</h4>
                                                <p className="text-[9px] text-[var(--text-muted)]">
                                                    {dateStr} · {sessionTitle !== '-' ? `${sessionTitle} (${coachName})` : '일반 피드백'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {f.admin_response && (
                                                <span className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase bg-green-500/10 border border-green-500/20 text-green-400">답변완료</span>
                                            )}
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <span key={star} className={`text-sm ${star <= (f.rating || 0) ? 'text-yellow-400' : 'text-white/10'}`}>★</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-white/70 leading-relaxed pl-13">{f.comment || '(내용 없음)'}</p>

                                    {/* Admin Response */}
                                    {f.admin_response && (
                                        <div className="mt-3 ml-13 p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                                            <p className="text-[9px] text-[var(--primary)] font-bold mb-1">관리자 답변</p>
                                            <p className="text-xs text-white/60">{f.admin_response}</p>
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-4 pl-13 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setSelectedFeedback(f); setReplyText(f.admin_response || ''); }}
                                            className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-white/[0.03] border border-white/5 text-white hover:border-[var(--primary)]/50 transition-all"
                                        >
                                            {f.admin_response ? '답변 수정' : '답변하기'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Reply Modal */}
            <AdminModal
                isOpen={!!selectedFeedback}
                onClose={() => { setSelectedFeedback(null); setReplyText(''); }}
                title="피드백 답변"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => { setSelectedFeedback(null); setReplyText(''); }} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/50 bg-white/[0.03] border border-white/5 hover:border-white/10">취소</button>
                        <button onClick={() => selectedFeedback && submitReply(selectedFeedback.id)} disabled={saving || !replyText.trim()} className="admin-action-btn disabled:opacity-50">
                            {saving ? '저장 중...' : '답변 저장'}
                        </button>
                    </div>
                }
            >
                {selectedFeedback && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-white">{(selectedFeedback.members as any)?.name || '회원'}</span>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <span key={s} className={`text-xs ${s <= (selectedFeedback.rating || 0) ? 'text-yellow-400' : 'text-white/10'}`}>★</span>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-white/60">{selectedFeedback.comment}</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">답변 내용</label>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="답변을 입력하세요..."
                                rows={4}
                                className="w-full admin-search-input resize-none"
                                style={{ minHeight: '120px' }}
                            />
                        </div>
                    </div>
                )}
            </AdminModal>
        </div>
    );
}
