'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconHeadphones, IconEdit, IconTrash } from '@/components/icons/AdminIcons';
import { useToast } from '@/components/ui/Toast';

interface Ticket {
    id: string;
    member_id: string;
    subject: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    created_at: string;
    updated_at: string;
    members?: { name: string; email: string };
    admin_reply?: string | null;
    resolved_at?: string | null;
}

// T3-6: FAQ interface
interface FAQItem {
    id: string;
    question: string;
    answer: string;
    category: string;
    sort_order: number;
    is_published: boolean;
    created_at: string;
    updated_at: string;
}

type TabType = 'tickets' | 'faq';

export default function SupportPage() {
    const [activeTab, setActiveTab] = useState<TabType>('tickets');

    // --- Tickets State ---
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    // --- T3-6: FAQ State ---
    const [faqs, setFaqs] = useState<FAQItem[]>([]);
    const [faqLoading, setFaqLoading] = useState(false);
    const [faqLoaded, setFaqLoaded] = useState(false);
    const [showFaqModal, setShowFaqModal] = useState(false);
    const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
    const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: '일반', sort_order: 0, is_published: true });
    const [faqFilter, setFaqFilter] = useState('all');
    const { success, error: toastError, info } = useToast();

    const loadTickets = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        try {
            let query = supabase.from('support_tickets').select('*, members!support_tickets_member_id_fkey(name, email)').order('created_at', { ascending: false });
            if (filterStatus !== 'all') query = query.eq('status', filterStatus);
            const { data, error } = await query;
            if (error) {
                console.warn('Support tickets JOIN error, using fallback:', error.message);
                let fallbackQuery = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
                if (filterStatus !== 'all') fallbackQuery = fallbackQuery.eq('status', filterStatus);
                const { data: fallbackData } = await fallbackQuery;
                if (fallbackData) setTickets(fallbackData.map((t: any) => ({ ...t, description: t.description || t.content || '' })) as any);
            } else {
                if (data) setTickets(data.map((t: any) => ({ ...t, description: t.description || t.content || '' })) as any);
            }
        } catch (e) {
            console.error('Error loading tickets:', e);
        }
        setLoading(false);
    }, [filterStatus]);

    useEffect(() => { loadTickets(); }, [loadTickets]);

    // T3-6: Load FAQs
    const loadFaqs = useCallback(async () => {
        const supabase = createClient();
        setFaqLoading(true);
        try {
            let query = (supabase as any).from('faqs').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
            if (faqFilter !== 'all') query = query.eq('category', faqFilter);
            const { data, error } = await query;
            if (!error && data) setFaqs(data as FAQItem[]);
        } catch (e) {
            console.error('Error loading FAQs:', e);
        }
        setFaqLoading(false);
        setFaqLoaded(true);
    }, [faqFilter]);

    useEffect(() => {
        if (activeTab === 'faq' && !faqLoaded) loadFaqs();
    }, [activeTab, faqLoaded, loadFaqs]);

    useEffect(() => {
        if (activeTab === 'faq') loadFaqs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [faqFilter]);

    async function updateTicketStatus(id: string, status: string) {
        const supabase = createClient();
        const updates: any = { status };
        const { error } = await supabase.from('support_tickets').update(updates).eq('id', id);
        if (error) {
            toastError(`상태 변경 실패: ${error.message}`);
        } else {
            success(`문의 상태가 ${statusConfig[status]?.label || status}로 변경되었습니다.`);
            if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, status, ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}) });
            loadTickets();
        }
    }

    // T1-6: Send reply to ticket
    async function sendReply() {
        if (!selectedTicket || !replyText.trim()) return;
        setReplying(true);
        const supabase = createClient();
        const existingReply = selectedTicket.admin_reply || '';
        const timestamp = new Date().toLocaleString('ko-KR');
        const newReply = existingReply
            ? `${existingReply}\n---\n[${timestamp}] ${replyText.trim()}`
            : `[${timestamp}] ${replyText.trim()}`;

        const { error } = await supabase.from('support_tickets').update({
            admin_reply: newReply,
            status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status,
        }).eq('id', selectedTicket.id);

        if (!error) {
            setSelectedTicket({
                ...selectedTicket,
                admin_reply: newReply,
                status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status,
            });
            setReplyText('');
            success('답변이 성공적으로 전송되었습니다.');
            loadTickets();
        } else {
            toastError(`답변 전송 실패: ${error.message}`);
        }
        setReplying(false);
    }

    // T3-6: FAQ CRUD
    function openFaqModal(faq?: FAQItem) {
        if (faq) {
            setEditingFaq(faq);
            setFaqForm({ question: faq.question, answer: faq.answer, category: faq.category, sort_order: faq.sort_order, is_published: faq.is_published });
        } else {
            setEditingFaq(null);
            setFaqForm({ question: '', answer: '', category: '일반', sort_order: faqs.length, is_published: true });
        }
        setShowFaqModal(true);
    }

    async function saveFaq() {
        if (!faqForm.question.trim() || !faqForm.answer.trim()) return;
        const supabase = createClient();
        const payload = {
            question: faqForm.question,
            answer: faqForm.answer,
            category: faqForm.category,
            sort_order: faqForm.sort_order,
            is_published: faqForm.is_published,
            updated_at: new Date().toISOString(),
        };

        if (editingFaq) {
            const { error } = await (supabase as any).from('faqs').update(payload).eq('id', editingFaq.id);
            if (error) toastError(`수정 실패: ${error.message}`);
            else success('FAQ가 수정되었습니다.');
        } else {
            const { error } = await (supabase as any).from('faqs').insert(payload);
            if (error) toastError(`등록 실패: ${error.message}`);
            else success('새 FAQ가 등록되었습니다.');
        }
        setShowFaqModal(false);
        loadFaqs();
    }

    async function deleteFaq(id: string) {
        if (!confirm('이 FAQ를 삭제하시겠습니까?')) return;
        const supabase = createClient();
        const { error } = await (supabase as any).from('faqs').delete().eq('id', id);
        if (error) {
            toastError(`삭제 실패: ${error.message}`);
        } else {
            success('FAQ가 삭제되었습니다.');
            loadFaqs();
        }
    }

    async function toggleFaqPublished(faq: FAQItem) {
        const supabase = createClient();
        const { error } = await (supabase as any).from('faqs').update({ is_published: !faq.is_published, updated_at: new Date().toISOString() }).eq('id', faq.id);
        if (error) {
            toastError(`상태 변경 실패: ${error.message}`);
        } else {
            success(`FAQ가 ${!faq.is_published ? '공개' : '비공개'} 상태로 변경되었습니다.`);
            loadFaqs();
        }
    }

    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
        open: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: '접수' },
        in_progress: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: '처리중' },
        resolved: { color: '#22C55E', bg: 'rgba(34,197,94,0.15)', label: '해결' },
        closed: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', label: '종료' },
    };

    const priorityColors: Record<string, string> = { urgent: '#EF4444', high: '#F59E0B', normal: '#3B82F6', low: '#6B7280' };

    // T3-6: FAQ categories
    const FAQ_CATEGORIES = ['일반', '회원권', '체크인', '결제', '시설', '코치', '기타'];

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="CRM"
                title="Support"
                subtitle={activeTab === 'tickets' ? 'Tickets' : 'FAQ'}
                actions={activeTab === 'faq' ? <button onClick={() => openFaqModal()} className="admin-action-btn">+ FAQ 추가</button> : undefined}
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {/* Tab Bar */}
                <div className="flex gap-1 mb-8 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {([
                        { key: 'tickets' as TabType, label: '고객 문의', icon: '🎫' },
                        { key: 'faq' as TabType, label: 'FAQ 관리', icon: '❓' },
                    ]).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                            style={{
                                background: activeTab === tab.key ? 'rgba(255,107,0,0.15)' : 'transparent',
                                color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                                border: activeTab === tab.key ? '1px solid rgba(255,107,0,0.3)' : '1px solid transparent',
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ========== Tickets Tab ========== */}
                {activeTab === 'tickets' && (
                    <>
                        <div className="flex gap-2 mb-8">
                            {['all', 'open', 'in_progress', 'resolved', 'closed'].map((s) => (
                                <button key={s} onClick={() => setFilterStatus(s)} className={`admin-filter-btn ${filterStatus === s ? 'active' : ''}`}>
                                    {s === 'all' ? '전체' : statusConfig[s]?.label || s}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-12 gap-8">
                            {/* Ticket List */}
                            <div className={`${selectedTicket ? 'col-span-5' : 'col-span-12'} space-y-2`}>
                                {loading ? (
                                    <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
                                ) : tickets.length === 0 ? (
                                    <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40"><span className="text-4xl mb-4"><IconHeadphones size={40} /></span><p className="text-[10px] font-black uppercase tracking-[0.4em]">No tickets</p></div>
                                ) : tickets.map((t) => {
                                    const sc = statusConfig[t.status] || statusConfig.open;
                                    return (
                                        <button key={t.id} onClick={() => setSelectedTicket(t)} className={`w-full text-left p-4 rounded-2xl transition-all ${selectedTicket?.id === t.id ? 'bg-white/[0.05] border border-[var(--primary)]/30' : 'bg-white/[0.02] border border-white/[0.03] hover:border-white/10'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-xs font-black text-white line-clamp-1">{t.subject}</h4>
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: priorityColors[t.priority] || '#6B7280' }}></span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] text-[var(--text-muted)]">{t.members?.name} · {new Date(t.created_at).toLocaleDateString('ko-KR')}</span>
                                                <span className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Ticket Detail */}
                            {selectedTicket && (
                                <div className="col-span-7 glass-card p-8 rounded-2xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-black text-white">{selectedTicket.subject}</h3>
                                        <button onClick={() => setSelectedTicket(null)} className="text-[var(--text-muted)] hover:text-white text-lg">✕</button>
                                    </div>
                                    <div className="space-y-4 mb-6">
                                        <div className="grid grid-cols-4 gap-4 text-center">
                                            <div className="p-3 rounded-xl bg-white/[0.02]"><p className="text-[8px] text-[var(--text-muted)] uppercase mb-1">Status</p><span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase" style={{ background: (statusConfig[selectedTicket.status]?.bg), color: (statusConfig[selectedTicket.status]?.color) }}>{statusConfig[selectedTicket.status]?.label}</span></div>
                                            <div className="p-3 rounded-xl bg-white/[0.02]"><p className="text-[8px] text-[var(--text-muted)] uppercase mb-1">Member</p><p className="text-xs font-bold text-white">{selectedTicket.members?.name}</p></div>
                                            <div className="p-3 rounded-xl bg-white/[0.02]"><p className="text-[8px] text-[var(--text-muted)] uppercase mb-1">Created</p><p className="text-xs font-bold text-white">{new Date(selectedTicket.created_at).toLocaleDateString('ko-KR')}</p></div>
                                            <div className="p-3 rounded-xl bg-white/[0.02]"><p className="text-[8px] text-[var(--text-muted)] uppercase mb-1">Priority</p><span className="w-2 h-2 rounded-full inline-block" style={{ background: priorityColors[selectedTicket.priority] || '#6B7280' }}></span> <span className="text-[9px] text-white/60 uppercase">{selectedTicket.priority}</span></div>
                                        </div>
                                        {/* Customer message */}
                                        <div>
                                            <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">고객 문의 내용</p>
                                            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.03]"><p className="text-sm text-white/80 leading-relaxed">{selectedTicket.description}</p></div>
                                        </div>
                                        {/* T1-6: Admin replies */}
                                        {selectedTicket.admin_reply && (
                                            <div>
                                                <p className="text-[8px] font-black text-[var(--primary)] uppercase tracking-widest mb-2">관리자 답변</p>
                                                <div className="space-y-2">
                                                    {selectedTicket.admin_reply.split('\n---\n').map((reply, i) => (
                                                        <div key={i} className="p-4 rounded-xl border" style={{ background: 'rgba(255,107,0,0.03)', borderColor: 'rgba(255,107,0,0.1)' }}>
                                                            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{reply}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* T1-6: Reply input */}
                                        {selectedTicket.status !== 'closed' && (
                                            <div>
                                                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">답변 작성</p>
                                                <div className="flex gap-2">
                                                    <textarea
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        placeholder="답변을 입력하세요..."
                                                        rows={3}
                                                        className="flex-1 px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
                                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={sendReply}
                                                    disabled={replying || !replyText.trim()}
                                                    className="mt-2 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-40"
                                                    style={{ background: 'var(--primary)', boxShadow: '0 0 15px rgba(255,107,0,0.3)' }}
                                                >
                                                    {replying ? '전송 중...' : '답변 전송'}
                                                </button>
                                            </div>
                                        )}
                                        {selectedTicket.resolved_at && (
                                            <p className="text-[9px] text-green-500/60">✅ 해결일: {new Date(selectedTicket.resolved_at).toLocaleString('ko-KR')}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(statusConfig).map(([key, val]) => (
                                            <button key={key} onClick={() => updateTicketStatus(selectedTicket.id, key)} disabled={selectedTicket.status === key} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${selectedTicket.status === key ? 'opacity-30' : 'hover:opacity-80'}`} style={{ background: val.bg, color: val.color, border: `1px solid ${val.color}30` }}>{val.label}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ========== T3-6: FAQ Tab ========== */}
                {activeTab === 'faq' && (
                    <>
                        {/* Category Filter */}
                        <div className="flex gap-2 mb-8 flex-wrap">
                            <button onClick={() => { setFaqFilter('all'); setFaqLoaded(false); }} className={`admin-filter-btn ${faqFilter === 'all' ? 'active' : ''}`}>전체</button>
                            {FAQ_CATEGORIES.map((cat) => (
                                <button key={cat} onClick={() => { setFaqFilter(cat); setFaqLoaded(false); }} className={`admin-filter-btn ${faqFilter === cat ? 'active' : ''}`}>{cat}</button>
                            ))}
                        </div>

                        {faqLoading ? (
                            <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
                        ) : faqs.length === 0 ? (
                            <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40">
                                <span className="text-4xl mb-4">❓</span>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">등록된 FAQ가 없습니다</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {faqs.map((faq, idx) => (
                                    <div key={faq.id} className="glass-card p-6 rounded-2xl group hover:border-white/10 transition-all">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-xs font-black text-white/30">Q{idx + 1}.</span>
                                                    <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)' }}>{faq.category}</span>
                                                    {!faq.is_published && (
                                                        <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>비공개</span>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-black text-white mb-2">{faq.question}</h4>
                                                <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                <button
                                                    onClick={() => toggleFaqPublished(faq)}
                                                    className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all"
                                                    style={{
                                                        background: faq.is_published ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                                                        border: `1px solid ${faq.is_published ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                                                        color: faq.is_published ? '#22C55E' : '#F59E0B',
                                                    }}
                                                >
                                                    {faq.is_published ? '공개' : '비공개'}
                                                </button>
                                                <button onClick={() => openFaqModal(faq)} className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-white/[0.03] border border-white/5 text-white hover:border-[var(--primary)]/50 transition-all">
                                                    <IconEdit size={12} />
                                                </button>
                                                <button onClick={() => deleteFaq(faq.id)} className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                                                    <IconTrash size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* T3-6: FAQ Modal */}
                <AdminModal show={showFaqModal} onClose={() => setShowFaqModal(false)} title={editingFaq ? 'FAQ 수정' : '새 FAQ 등록'}>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">카테고리</label>
                            <select value={faqForm.category} onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                {FAQ_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">질문 *</label>
                            <input value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} placeholder="자주 묻는 질문을 입력하세요" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">답변 *</label>
                            <textarea value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} placeholder="답변 내용을 입력하세요" rows={5} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">정렬 순서</label>
                                <input type="number" value={faqForm.sort_order} onChange={(e) => setFaqForm({ ...faqForm, sort_order: Number(e.target.value) })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                            </div>
                            <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={faqForm.is_published} onChange={(e) => setFaqForm({ ...faqForm, is_published: e.target.checked })} className="w-4 h-4 rounded accent-[var(--primary)]" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">공개</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setShowFaqModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={saveFaq} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>저장</button>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
