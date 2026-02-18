'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

interface FeedbackRecord {
    id: string;
    session_id: string;
    rating: number;
    comments: string;
    coach_rating?: number;
    created_at: string;
    session_title?: string;
    coach_name?: string;
    admin_response?: string;
}

export default function UserFeedbackPage() {
    const [tab, setTab] = useState<'write' | 'history'>('write');
    const [attendedSessions, setAttendedSessions] = useState<{ id: string; session_id: string; title: string; date: string; coach: string }[]>([]);
    const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
    const [selectedSession, setSelectedSession] = useState('');
    const [rating, setRating] = useState(0);
    const [coachRating, setCoachRating] = useState(0);
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const supabase: any = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: bookings }: any = await supabase
            .from('bookings')
            .select('id, session_id, sessions(title, start_time, coach_name)')
            .eq('user_id', user.id)
            .in('status', ['completed', 'confirmed'])
            .order('created_at', { ascending: false })
            .limit(20);

        if (bookings) {
            setAttendedSessions(bookings.map((b: Record<string, unknown>) => {
                const s = b.sessions as Record<string, unknown> | null;
                return {
                    id: b.id as string, session_id: b.session_id as string,
                    title: (s?.title as string) || '수업',
                    date: s?.start_time ? new Date(s.start_time as string).toLocaleDateString('ko-KR') : '',
                    coach: (s?.coach_name as string) || '',
                };
            }));
        }

        const { data: fbs }: any = await supabase
            .from('session_feedback')
            .select('*, sessions(title, coach_name)')
            .eq('member_id', user.id)
            .order('created_at', { ascending: false });

        if (fbs) {
            setFeedbacks(fbs.map((f: Record<string, unknown>) => {
                const s = f.sessions as Record<string, unknown> | null;
                return { ...(f as unknown as FeedbackRecord), session_title: (s?.title as string) || '수업', coach_name: (s?.coach_name as string) || '' };
            }));
        }
        setLoading(false);
    }

    async function handleSubmit() {
        if (!selectedSession || rating === 0 || submitting) return;
        setSubmitting(true);
        const supabase: any = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { toast.warning('로그인이 필요합니다.'); setSubmitting(false); return; }

        const { error }: any = await supabase.from('session_feedback').insert({
            session_id: selectedSession, member_id: user.id,
            rating, comment: comments.trim() || null,
        });

        if (error) {
            toast.error(error.code === '23505' ? '이미 해당 수업에 피드백을 작성했습니다.' : '제출 실패. 다시 시도해주세요.');
        } else {
            toast.success('피드백이 제출되었습니다!');
            setSelectedSession(''); setRating(0); setCoachRating(0); setComments('');
            loadData();
        }
        setSubmitting(false);
    }

    const labels: Record<number, string> = { 1: '별로예요', 2: '아쉬워요', 3: '괜찮아요', 4: '좋아요!', 5: '최고예요!' };

    function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
        return (
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }} role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => onChange(s)}
                        role="radio"
                        aria-checked={value >= s}
                        aria-label={`${s}점`}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem',
                            transform: value >= s ? 'scale(1.15)' : 'scale(1)', filter: value >= s ? 'none' : 'grayscale(1) opacity(0.3)', transition: 'all 0.15s'
                        }}>⭐</button>
                ))}
            </div>
        );
    }

    if (loading) return <div className="app-page"><div className="app-skeleton" style={{ height: 300 }} /></div>;

    return (
        <div className="app-page">
            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem' }}>수업에 대한 솔직한 의견을 들려주세요</p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {(['write', 'history'] as const).map(t => (
                    <button key={t} className={`app-filter-chip ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ flex: 1 }}>
                        {t === 'write' ? '피드백 작성' : `내 피드백 (${feedbacks.length})`}
                    </button>
                ))}
            </div>

            {tab === 'write' ? (
                <div>
                    <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '0.5rem' }}>수업 선택</label>
                        <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
                            aria-label="수업 선택"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }}>
                            <option value="">참여한 수업을 선택하세요</option>
                            {attendedSessions.map(s => (<option key={s.session_id} value={s.session_id}>{s.title} ({s.date}) - {s.coach}</option>))}
                        </select>
                    </div>
                    <div className="app-glass-card" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '0.75rem' }}>수업 만족도</label>
                        <Stars value={rating} onChange={setRating} />
                        {rating > 0 && <p style={{ color: 'var(--app-accent)', fontSize: '0.875rem', fontWeight: 600, marginTop: '0.5rem' }}>{labels[rating]}</p>}
                    </div>
                    <div className="app-glass-card" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '0.75rem' }}>코치 평가 <span style={{ fontSize: '0.75rem', color: 'var(--app-text-muted)', fontWeight: 400 }}>(선택)</span></label>
                        <Stars value={coachRating} onChange={setCoachRating} />
                    </div>
                    <div className="app-glass-card" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '0.5rem' }}>리뷰 <span style={{ fontSize: '0.75rem', color: 'var(--app-text-muted)', fontWeight: 400 }}>(선택)</span></label>
                        <textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="소감을 자유롭게 작성해주세요..." rows={4}
                            aria-label="리뷰 작성"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <button className="app-btn-primary" style={{ width: '100%', padding: '0.875rem' }} disabled={!selectedSession || rating === 0 || submitting} onClick={handleSubmit}>
                        {submitting ? '제출 중...' : '피드백 제출하기'}
                    </button>
                </div>
            ) : (
                <div>
                    {feedbacks.length === 0 ? (
                        <div className="app-empty-state"><div className="emoji">📝</div><div className="message">작성한 피드백이 없습니다</div>
                            <button className="app-btn-primary" style={{ marginTop: '1rem' }} onClick={() => setTab('write')}>첫 피드백 작성하기</button></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {feedbacks.map(fb => (
                                <div key={fb.id} className="app-glass-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <div><h4 style={{ color: 'var(--app-text-primary)', fontWeight: 600 }}>{fb.session_title}</h4>
                                            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.75rem' }}>{fb.coach_name && `코치: ${fb.coach_name} · `}{new Date(fb.created_at).toLocaleDateString('ko-KR')}</p></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span>⭐</span><span style={{ color: 'var(--app-text-primary)', fontWeight: 700 }}>{fb.rating}</span></div>
                                    </div>
                                    {fb.comments && <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5 }}>{fb.comments}</p>}
                                    {fb.admin_response && (
                                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 8, background: 'var(--app-accent-light)', border: '1px solid rgba(210,105,30,0.15)' }}>
                                            <p style={{ fontSize: '0.6875rem', color: 'var(--app-accent)', fontWeight: 600 }}>관리자 답변</p>
                                            <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', lineHeight: 1.5 }}>{fb.admin_response}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
