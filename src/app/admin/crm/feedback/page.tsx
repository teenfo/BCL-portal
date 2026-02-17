'use client';

import { useState } from 'react';

interface FeedbackItem {
    id: string;
    memberName: string;
    sessionName: string;
    coach: string;
    rating: number;
    comment: string;
    date: string;
    category: string;
}

export default function FeedbackPage() {
    const [filter, setFilter] = useState('all');

    // Mock data - session_feedback table may not exist yet
    const feedbackData: FeedbackItem[] = [
        { id: '1', memberName: '김민수', sessionName: 'WOD Classic', coach: 'Coach Park', rating: 5, comment: '최고의 수업이었습니다! 코치님의 폼 교정이 매우 도움됐어요.', date: '2026-02-17', category: 'session' },
        { id: '2', memberName: '이지영', sessionName: 'Endurance Flow', coach: 'Coach Lee', rating: 4, comment: '전반적으로 좋았지만 난이도가 조금 높았어요.', date: '2026-02-16', category: 'session' },
        { id: '3', memberName: '박현우', sessionName: '-', coach: '-', rating: 3, comment: '샤워실 온수가 잘 안 나옵니다.', date: '2026-02-15', category: 'facility' },
        { id: '4', memberName: '최서연', sessionName: 'Olympic Lifting', coach: 'Coach Kim', rating: 5, comment: '데드리프트 자세 교정 정말 감사합니다!', date: '2026-02-14', category: 'session' },
        { id: '5', memberName: '정태영', sessionName: '-', coach: '-', rating: 2, comment: '주차 공간이 너무 부족합니다.', date: '2026-02-13', category: 'facility' },
    ];

    const filtered = filter === 'all' ? feedbackData : feedbackData.filter(f => f.category === filter);

    const avgRating = feedbackData.length > 0 ? (feedbackData.reduce((s, f) => s + f.rating, 0) / feedbackData.length).toFixed(1) : '0';
    const sessionFeedback = feedbackData.filter(f => f.category === 'session').length;
    const facilityFeedback = feedbackData.filter(f => f.category === 'facility').length;

    return (
        <div className="p-8 lg:p-12">
            <header className="mb-12">
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
                    <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em]">CRM</span>
                </div>
                <h1 className="text-4xl font-black text-white uppercase">Feedback <span className="opacity-20 font-light ml-2">Management</span></h1>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-12 gap-6 mb-10">
                <div className="col-span-4 kpi-card">
                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Avg Rating</h4>
                    <div className="mt-4 flex items-end gap-2">
                        <p className="text-4xl font-black text-[var(--primary)]">{avgRating}</p>
                        <p className="text-lg text-yellow-400 mb-1">{'★'.repeat(Math.round(Number(avgRating)))}</p>
                    </div>
                </div>
                <div className="col-span-4 kpi-card">
                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Session Feedback</h4>
                    <p className="text-3xl font-black text-white mt-4">{sessionFeedback}</p>
                </div>
                <div className="col-span-4 kpi-card">
                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Facility Feedback</h4>
                    <p className="text-3xl font-black text-white mt-4">{facilityFeedback}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-8">
                {['all', 'session', 'facility'].map((f) => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-[var(--primary)] text-white' : 'bg-white/[0.03] border border-white/5 text-[var(--text-muted)]'}`}>
                        {f === 'all' ? '전체' : f === 'session' ? '수업' : '시설'}
                    </button>
                ))}
            </div>

            {/* Feedback List */}
            <div className="space-y-4">
                {filtered.map((f) => (
                    <div key={f.id} className="glass-card p-6 rounded-2xl group hover:border-white/10 transition-all">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,107,0,0.1))', color: 'var(--primary)' }}>{f.memberName.charAt(0)}</div>
                                <div>
                                    <h4 className="text-sm font-black text-white">{f.memberName}</h4>
                                    <p className="text-[9px] text-[var(--text-muted)]">{f.date} · {f.category === 'session' ? `${f.sessionName} (${f.coach})` : '시설 피드백'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className={`text-sm ${star <= f.rating ? 'text-yellow-400' : 'text-white/10'}`}>★</span>
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed pl-13">{f.comment}</p>
                        <div className="flex gap-2 mt-4 pl-13 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-white/[0.03] border border-white/5 text-white hover:border-[var(--primary)]/50 transition-all">답변하기</button>
                            <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase ${f.category === 'session' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'bg-purple-500/10 border border-purple-500/20 text-purple-400'}`}>{f.category === 'session' ? '수업' : '시설'}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
