'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Ticket {
    id: string;
    subject: string;
    message: string;
    status: string;
    priority: string;
    admin_response?: string;
    created_at: string;
}

export default function SupportPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => { loadTickets(); }, []);

    async function loadTickets() {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('member_id', user.id)
            .order('created_at', { ascending: false });
        if (data) setTickets(data);
        setLoading(false);
    }

    async function handleSubmit() {
        if (!subject.trim() || !message.trim() || submitting) return;
        setSubmitting(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSubmitting(false); return; }

        const { error } = await supabase.from('support_tickets').insert({
            member_id: user.id,
            subject: subject.trim(),
            message: message.trim(),
            status: 'open',
            priority: 'medium',
        });

        if (error) {
            alert('문의 등록에 실패했습니다.');
        } else {
            alert('✅ 문의가 등록되었습니다. 빠른 시일 내 답변드리겠습니다.');
            setSubject(''); setMessage(''); setShowForm(false);
            loadTickets();
        }
        setSubmitting(false);
    }

    function statusInfo(s: string) {
        switch (s) {
            case 'open': return { label: '접수됨', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
            case 'in_progress': return { label: '처리 중', color: '#facc15', bg: 'rgba(250,204,21,0.1)' };
            case 'resolved': return { label: '답변 완료', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' };
            case 'closed': return { label: '종료', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' };
            default: return { label: s, color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' };
        }
    }

    if (loading) return <div className="app-page"><div className="app-skeleton" style={{ height: 300 }} /></div>;

    return (
        <div className="app-page">
            <Link href="/apps/profile" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← 돌아가기</Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '1rem 0 0.25rem' }}>고객센터</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>1:1 문의 및 답변</p>

            {!showForm ? (
                <button className="app-btn-primary" style={{ width: '100%', marginBottom: '1.5rem', padding: '0.75rem' }} onClick={() => setShowForm(true)}>
                    + 새 문의 작성
                </button>
            ) : (
                <div className="app-glass-card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem' }}>새 문의</h3>
                    <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="제목"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.875rem', outline: 'none', marginBottom: '0.75rem' }} />
                    <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="문의 내용을 작성해주세요..." rows={5}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', marginBottom: '1rem' }} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="app-btn-secondary" style={{ flex: 1 }} onClick={() => setShowForm(false)}>취소</button>
                        <button className="app-btn-primary" style={{ flex: 1 }} disabled={!subject.trim() || !message.trim() || submitting} onClick={handleSubmit}>
                            {submitting ? '제출 중...' : '문의 등록'}
                        </button>
                    </div>
                </div>
            )}

            {/* FAQ quicklinks */}
            <div className="app-glass-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '0.75rem' }}>자주 묻는 질문</h3>
                {['이용권 환불은 어떻게 하나요?', '홀딩 신청은 어디서 하나요?', '체크인이 안 돼요', '코치 변경 요청'].map((q, i) => (
                    <div key={i} style={{ padding: '0.75rem 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{q}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>→</span>
                    </div>
                ))}
            </div>

            {/* Ticket list */}
            <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '0.75rem' }}>내 문의 내역</h3>
            {tickets.length === 0 ? (
                <div className="app-empty-state"><div className="emoji">📋</div><div className="message">문의 내역이 없습니다</div></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tickets.map(t => {
                        const si = statusInfo(t.status);
                        const expanded = expandedId === t.id;
                        return (
                            <div key={t.id} className="app-glass-card" style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expanded ? null : t.id)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ color: '#fff', fontWeight: 600, fontSize: '0.9375rem' }}>{t.subject}</h4>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.125rem' }}>{new Date(t.created_at).toLocaleDateString('ko-KR')}</p>
                                    </div>
                                    <span style={{ padding: '0.125rem 0.5rem', borderRadius: 9999, fontSize: '0.6875rem', fontWeight: 600, background: si.bg, color: si.color }}>{si.label}</span>
                                </div>
                                {expanded && (
                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.6 }}>{t.message}</p>
                                        {t.admin_response && (
                                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,107,0,0.05)', border: '1px solid rgba(255,107,0,0.1)' }}>
                                                <p style={{ fontSize: '0.6875rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.25rem' }}>답변</p>
                                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.admin_response}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
