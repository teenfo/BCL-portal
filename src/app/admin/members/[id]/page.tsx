'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Member {
    id: string;
    name: string;
    email: string;
    phone: string;
    gender: string;
    birthdate: string;
    status: string;
    plan: string;
    credits: number;
    joined_date: string;
    membership_start_date: string;
    membership_end_date: string;
    locker_number: string;
    locker_end_date: string;
    profile_image: string;
}

interface Checkin {
    id: string;
    time: string;
    facility: string;
    status: string;
}

interface Transaction {
    id: string;
    amount: number;
    status: string;
    date: string;
    method: string;
    category: string;
}

interface Note {
    id: string;
    content: string;
    created_at: string;
}

export default function MemberDetailPage() {
    const params = useParams();
    const router = useRouter();
    const memberId = params.id as string;

    const [member, setMember] = useState<Member | null>(null);
    const [checkins, setCheckins] = useState<Checkin[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'payments' | 'notes'>('overview');
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        loadMemberData();
    }, [memberId]);

    async function loadMemberData() {
        const supabase = createClient();
        setLoading(true);

        const [memberRes, checkinsRes, txRes, notesRes] = await Promise.all([
            supabase.from('members').select('*').eq('id', memberId).single(),
            supabase.from('checkins').select('*').eq('member_id', memberId).order('time', { ascending: false }).limit(20),
            supabase.from('transactions').select('*').eq('member_id', memberId).order('date', { ascending: false }),
            supabase.from('member_notes').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
        ]);

        if (memberRes.data) setMember(memberRes.data);
        if (checkinsRes.data) setCheckins(checkinsRes.data);
        if (txRes.data) setTransactions(txRes.data);
        if (notesRes.data) setNotes(notesRes.data);

        setLoading(false);
    }

    async function addNote() {
        if (!newNote.trim()) return;
        const supabase = createClient();
        const { error } = await supabase.from('member_notes').insert({
            member_id: memberId,
            content: newNote,
        });
        if (!error) {
            setNewNote('');
            loadMemberData();
        }
    }

    function getDaysRemaining(endDate: string) {
        if (!endDate) return null;
        const diff = new Date(endDate).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    if (loading) {
        return (
            <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
                <main className="flex-1 ml-64 p-8 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--bcl-orange)' }}></div>
                </main>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
                <main className="flex-1 ml-64 p-8">
                    <div className="text-center py-20">
                        <p className="text-white text-xl mb-4">회원을 찾을 수 없습니다</p>
                        <Link href="/admin/members" style={{ color: 'var(--bcl-orange)' }}>← 회원 목록으로</Link>
                    </div>
                </main>
            </div>
        );
    }

    const daysRemaining = getDaysRemaining(member.membership_end_date);

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
            <main className="flex-1 ml-64 p-8">
                {/* Back button */}
                <Link href="/admin/members" className="inline-flex items-center gap-2 mb-6 transition-colors" style={{ color: 'var(--foreground-secondary)' }}>
                    ← 회원 목록으로
                </Link>

                {/* Header */}
                <div className="glass-card p-6 rounded-xl mb-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--bcl-orange), #FF8F3F)' }}>
                            {member.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-white">{member.name}</h1>
                                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={
                                    member.status === 'Active'
                                        ? { background: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' }
                                        : { background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }
                                }>{member.status}</span>
                            </div>
                            <p style={{ color: 'var(--foreground-secondary)' }}>{member.email} · {member.phone || 'N/A'}</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                                {member.gender === 'M' ? '남성' : member.gender === 'F' ? '여성' : '-'} · {member.birthdate ? new Date(member.birthdate).toLocaleDateString('ko-KR') : '-'} · 가입일: {member.joined_date ? new Date(member.joined_date).toLocaleDateString('ko-KR') : '-'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>현재 이용권</p>
                            <p className="text-lg font-bold" style={{ color: 'var(--bcl-orange)' }}>{member.plan || 'No Plan'}</p>
                            {daysRemaining !== null && (
                                <p className="text-sm" style={{ color: daysRemaining > 7 ? '#22C55E' : daysRemaining > 0 ? '#F59E0B' : '#EF4444' }}>
                                    {daysRemaining > 0 ? `D-${daysRemaining}` : '만료됨'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['overview', 'attendance', 'payments', 'notes'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                            style={activeTab === tab ? { background: 'var(--bcl-orange)', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: 'var(--foreground-secondary)' }}
                        >
                            {tab === 'overview' ? '📊 개요' : tab === 'attendance' ? '📋 출석' : tab === 'payments' ? '💳 결제' : '📝 메모'}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-3 gap-6">
                        {/* Membership Card */}
                        <div className="glass-card p-6 rounded-xl">
                            <h3 className="text-white font-semibold mb-4">멤버십 정보</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--foreground-secondary)' }}>플랜</span>
                                    <span className="text-white font-medium">{member.plan || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--foreground-secondary)' }}>시작일</span>
                                    <span className="text-white">{member.membership_start_date || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--foreground-secondary)' }}>종료일</span>
                                    <span className="text-white">{member.membership_end_date || '-'}</span>
                                </div>
                                {member.credits > 0 && (
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--foreground-secondary)' }}>잔여 횟수</span>
                                        <span className="text-white font-bold">{member.credits}회</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Card */}
                        <div className="glass-card p-6 rounded-xl">
                            <h3 className="text-white font-semibold mb-4">출석 통계</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--foreground-secondary)' }}>총 출석</span>
                                    <span className="text-white font-bold">{checkins.length}회</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--foreground-secondary)' }}>이번 주</span>
                                    <span className="text-white font-bold">{checkins.filter(c => {
                                        const d = new Date(c.time);
                                        const now = new Date();
                                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                                        return d >= weekAgo;
                                    }).length}회</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--foreground-secondary)' }}>총 결제</span>
                                    <span className="text-white font-bold">₩{transactions.reduce((a, t) => a + Number(t.amount), 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Locker Card */}
                        <div className="glass-card p-6 rounded-xl">
                            <h3 className="text-white font-semibold mb-4">부가 정보</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--foreground-secondary)' }}>락커 번호</span>
                                    <span className="text-white">{member.locker_number || '미배정'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--foreground-secondary)' }}>락커 만료</span>
                                    <span className="text-white">{member.locker_end_date || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Checkins */}
                        <div className="col-span-2 glass-card p-6 rounded-xl">
                            <h3 className="text-white font-semibold mb-4">최근 출석</h3>
                            {checkins.length === 0 ? (
                                <p style={{ color: 'var(--foreground-secondary)' }}>출석 기록이 없습니다</p>
                            ) : (
                                <div className="space-y-2">
                                    {checkins.slice(0, 5).map((c) => (
                                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                            <div>
                                                <p className="text-white text-sm">{new Date(c.time).toLocaleDateString('ko-KR')} {new Date(c.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{c.facility}</p>
                                            </div>
                                            <span className="px-2 py-1 rounded text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.2)', color: '#22C55E' }}>{c.status}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Transactions */}
                        <div className="glass-card p-6 rounded-xl">
                            <h3 className="text-white font-semibold mb-4">최근 결제</h3>
                            {transactions.length === 0 ? (
                                <p style={{ color: 'var(--foreground-secondary)' }}>결제 기록이 없습니다</p>
                            ) : (
                                <div className="space-y-2">
                                    {transactions.slice(0, 5).map((t) => (
                                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                            <div>
                                                <p className="text-white text-sm font-medium">₩{Number(t.amount).toLocaleString()}</p>
                                                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{t.date} · {t.method}</p>
                                            </div>
                                            <span className="text-xs" style={{ color: '#22C55E' }}>{t.status}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                    <div className="glass-card rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>날짜</th>
                                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>시간</th>
                                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>지점</th>
                                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {checkins.map((c) => (
                                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td className="p-4 text-white">{new Date(c.time).toLocaleDateString('ko-KR')}</td>
                                        <td className="p-4 text-white">{new Date(c.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="p-4 text-white">{c.facility}</td>
                                        <td className="p-4"><span className="px-2 py-1 rounded text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.2)', color: '#22C55E' }}>{c.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Payments Tab */}
                {activeTab === 'payments' && (
                    <div className="glass-card rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>결제 ID</th>
                                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>금액</th>
                                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>카테고리</th>
                                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>결제 수단</th>
                                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>날짜</th>
                                    <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--foreground-secondary)' }}>상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t) => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td className="p-4 text-white text-sm">{t.id}</td>
                                        <td className="p-4 text-white font-semibold">₩{Number(t.amount).toLocaleString()}</td>
                                        <td className="p-4 text-white">{t.category}</td>
                                        <td className="p-4 text-white">{t.method}</td>
                                        <td className="p-4 text-white">{t.date}</td>
                                        <td className="p-4"><span className="px-2 py-1 rounded text-xs font-semibold" style={{ background: t.status === 'completed' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: t.status === 'completed' ? '#22C55E' : '#EF4444' }}>{t.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <div>
                        <div className="glass-card p-4 rounded-xl mb-4">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="새 메모를 입력하세요..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    className="bcl-input flex-1"
                                    onKeyDown={(e) => e.key === 'Enter' && addNote()}
                                />
                                <button onClick={addNote} className="px-6 py-2 rounded-lg font-semibold" style={{ background: 'var(--bcl-orange)', color: '#fff' }}>추가</button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {notes.map((n) => (
                                <div key={n.id} className="glass-card p-4 rounded-xl">
                                    <p className="text-white mb-2">{n.content}</p>
                                    <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{new Date(n.created_at).toLocaleString('ko-KR')}</p>
                                </div>
                            ))}
                            {notes.length === 0 && <p className="text-center py-8" style={{ color: 'var(--foreground-secondary)' }}>메모가 없습니다</p>}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
