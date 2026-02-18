'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import AdminModal from '@/components/layout/AdminModal';
import { IconUser, IconBarChart, IconClipboard, IconCreditCard, IconNotes } from '@/components/icons/AdminIcons';

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

interface Membership {
    id: string;
    status: string;
    start_date: string;
    end_date: string;
    remaining_credits: number;
    pause_count: number;
    paused_at: string | null;
    pause_reason: string | null;
    membership_plans: {
        name: string;
        price: number;
        duration_days: number;
        credits: number;
        max_pauses: number;
    } | null;
}

export default function MemberDetailPage() {
    const params = useParams();
    const memberId = params.id as string;

    const [member, setMember] = useState<Member | null>(null);
    const [checkins, setCheckins] = useState<Checkin[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'payments' | 'notes'>('overview');
    const [newNote, setNewNote] = useState('');

    // T1-2: Edit member modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', phone: '', gender: '', birthdate: '', status: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadMemberData();
    }, [memberId]);

    async function loadMemberData() {
        const supabase = createClient();
        setLoading(true);

        const [memberRes, checkinsRes, txRes, notesRes, membershipsRes] = await Promise.all([
            supabase.from('members').select('*').eq('id', memberId).single(),
            supabase.from('checkins').select('*').eq('member_id', memberId).order('time', { ascending: false }).limit(20),
            supabase.from('transactions').select('*').eq('member_id', memberId).order('date', { ascending: false }),
            supabase.from('member_notes').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
            supabase.from('memberships').select('*, membership_plans(name, price, duration_days, credits, max_pauses)').eq('user_id', memberId).order('created_at', { ascending: false }),
        ]);

        if (memberRes.data) setMember(memberRes.data);
        if (checkinsRes.data) setCheckins(checkinsRes.data);
        if (txRes.data) setTransactions(txRes.data);
        if (notesRes.data) setNotes(notesRes.data);
        if (membershipsRes.data) setMemberships(membershipsRes.data as unknown as Membership[]);

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

    // T1-2: Open edit modal
    function openEditModal() {
        if (!member) return;
        setEditForm({ name: member.name || '', phone: member.phone || '', gender: member.gender || '', birthdate: member.birthdate || '', status: member.status || 'Active' });
        setShowEditModal(true);
    }

    // T1-2: Save member edit
    async function saveMemberEdit() {
        if (!member) return;
        setSaving(true);
        const supabase = createClient();
        const { error } = await supabase.from('members').update({
            name: editForm.name, phone: editForm.phone || null, gender: editForm.gender || null, birthdate: editForm.birthdate || null, status: editForm.status,
        }).eq('id', member.id);
        if (!error) { setShowEditModal(false); loadMemberData(); }
        setSaving(false);
    }

    if (loading) {
        return (
            <div className="p-8 lg:p-12 flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 rounded-xl border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.05)', borderTopColor: 'var(--primary)' }}></div>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="p-8 lg:p-12">
                <div className="flex flex-col items-center justify-center py-32 opacity-50">
                    <span className="text-5xl mb-4"><IconUser size={48} /></span>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-6">Member not found</p>
                    <Link href="/admin/members" className="text-xs font-black uppercase tracking-widest transition-all hover:opacity-80" style={{ color: 'var(--primary)' }}>
                        ← 회원 목록으로
                    </Link>
                </div>
            </div>
        );
    }

    const daysRemaining = getDaysRemaining(member.membership_end_date);
    const statusColor = member.status === 'Active' ? '#22C55E' : member.status === 'Expired' ? '#EF4444' : '#F59E0B';
    const statusBg = member.status === 'Active' ? 'rgba(34,197,94,0.15)' : member.status === 'Expired' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)';

    const tabItems = [
        { key: 'overview' as const, label: '개요', icon: <IconBarChart size={14} /> },
        { key: 'attendance' as const, label: '출석', icon: <IconClipboard size={14} /> },
        { key: 'payments' as const, label: '결제', icon: <IconCreditCard size={14} /> },
        { key: 'notes' as const, label: '메모', icon: <IconNotes size={14} /> },
    ];

    return (
        <div className="p-8 lg:p-12 transition-all duration-700">
            {/* Header */}
            <header className="mb-10 animate-premium-fade">
                <Link
                    href="/admin/members"
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-8 transition-all hover:gap-3"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                    ← 회원 목록
                </Link>

                <div className="flex items-center gap-3 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)', boxShadow: '0 0 15px var(--primary-glow)' }}></span>
                    <span className="text-[11px] font-black uppercase tracking-[0.5em] italic" style={{ color: 'var(--primary)' }}>User &amp; Finance</span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight leading-none uppercase">
                    Member <span className="opacity-20 font-light ml-2">Detail</span>
                </h1>
            </header>

            {/* Profile Hero Card */}
            <div
                className="rounded-2xl p-8 mb-8 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,107,0,0.08) 0%, rgba(255,255,255,0.02) 50%, rgba(255,107,0,0.04) 100%)',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                {/* Decorative glow */}
                <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}></div>

                <div className="flex items-center gap-8 relative z-10">
                    {/* Avatar */}
                    <div
                        className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg, var(--primary), #FF8F3F)', boxShadow: '0 0 30px rgba(255,107,0,0.2)' }}
                    >
                        {member.name?.charAt(0) || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-black text-white tracking-tight">{member.name}</h2>
                            <span
                                className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                                style={{ background: statusBg, color: statusColor }}
                            >
                                {member.status}
                            </span>
                            <button onClick={openEditModal} className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-white/[0.05] border border-white/5 text-white hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all">✏️ 수정</button>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{member.email}</span>
                            {member.phone && <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>· {member.phone}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                {member.gender === 'M' ? '남성' : member.gender === 'F' ? '여성' : '-'}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                {member.birthdate ? new Date(member.birthdate).toLocaleDateString('ko-KR') : '-'}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                가입: {member.joined_date ? new Date(member.joined_date).toLocaleDateString('ko-KR') : '-'}
                            </span>
                        </div>
                    </div>

                    {/* Plan Badge */}
                    <div
                        className="text-right shrink-0 p-5 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>현재 이용권</p>
                        <p className="text-xl font-black" style={{ color: 'var(--primary)' }}>{member.plan || 'No Plan'}</p>
                        {daysRemaining !== null && (
                            <p className="text-sm font-black mt-1" style={{ color: daysRemaining > 7 ? '#22C55E' : daysRemaining > 0 ? '#F59E0B' : '#EF4444' }}>
                                {daysRemaining > 0 ? `D-${daysRemaining}` : '만료됨'}
                            </p>
                        )}
                        {member.credits > 0 && (
                            <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--primary)' }}>{member.credits}회 남음</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8">
                {tabItems.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        style={activeTab === tab.key
                            ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 0 15px rgba(255,107,0,0.3)' }
                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }
                        }
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-3 gap-6">
                    {/* Membership Card */}
                    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>멤버십 정보</h3>
                        {(() => {
                            const activeMembership = memberships.find(m => m.status === 'active') || memberships[0];
                            const planName = activeMembership?.membership_plans?.name || member.plan || '-';
                            const startDate = activeMembership?.start_date || member.membership_start_date || '-';
                            const endDate = activeMembership?.end_date || member.membership_end_date || '-';
                            const credits = activeMembership?.remaining_credits ?? member.credits;
                            const pauseCount = activeMembership?.pause_count || 0;
                            const maxPauses = activeMembership?.membership_plans?.max_pauses || 0;
                            return (
                                <div className="space-y-4">
                                    {[
                                        { label: '플랜', value: planName, highlight: true },
                                        { label: '시작일', value: startDate },
                                        { label: '종료일', value: endDate },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</span>
                                            <span className={`text-sm font-bold ${item.highlight ? '' : 'text-white'}`} style={item.highlight ? { color: 'var(--primary)' } : {}}>{item.value}</span>
                                        </div>
                                    ))}
                                    {credits > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>잔여 횟수</span>
                                            <span className="text-sm font-black text-white">{credits}회</span>
                                        </div>
                                    )}
                                    {activeMembership?.status === 'paused' && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>홀딩 상태</span>
                                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>일시정지 ({pauseCount}/{maxPauses})</span>
                                        </div>
                                    )}
                                    {memberships.length > 1 && (
                                        <div className="pt-3 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>이전 멤버십 {memberships.length - 1}건</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Stats Card */}
                    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>활동 통계</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>총 출석</span>
                                <span className="text-sm font-black text-white">{checkins.length}회</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>이번 주</span>
                                <span className="text-sm font-black text-white">{checkins.filter(c => {
                                    const d = new Date(c.time);
                                    const now = new Date();
                                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                                    return d >= weekAgo;
                                }).length}회</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>총 결제</span>
                                <span className="text-sm font-black" style={{ color: 'var(--primary)' }}>₩{transactions.reduce((a, t) => a + Number(t.amount), 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Locker Card */}
                    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>부가 정보</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>락커 번호</span>
                                <span className="text-sm font-bold text-white">{member.locker_number || '미배정'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>락커 만료</span>
                                <span className="text-sm text-white">{member.locker_end_date || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Checkins */}
                    <div className="col-span-2 rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>최근 출석</h3>
                        {checkins.length === 0 ? (
                            <p className="text-xs py-6 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>출석 기록이 없습니다</p>
                        ) : (
                            <div className="space-y-2">
                                {checkins.slice(0, 5).map((c) => (
                                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/[0.02]" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <p className="text-sm font-bold text-white">{new Date(c.time).toLocaleDateString('ko-KR')} <span className="font-normal" style={{ color: 'rgba(255,255,255,0.5)' }}>{new Date(c.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span></p>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.facility}</p>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>{c.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Transactions */}
                    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>최근 결제</h3>
                        {transactions.length === 0 ? (
                            <p className="text-xs py-6 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>결제 기록이 없습니다</p>
                        ) : (
                            <div className="space-y-2">
                                {transactions.slice(0, 5).map((t) => (
                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <p className="text-sm font-bold text-white">₩{Number(t.amount).toLocaleString()}</p>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.date} · {t.method}</p>
                                        </div>
                                        <span className="text-[9px] font-black uppercase" style={{ color: t.status === 'completed' ? '#22C55E' : '#EF4444' }}>{t.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Table Header */}
                    <div className="grid grid-cols-4 gap-4 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {['날짜', '시간', '지점', '상태'].map((h) => (
                            <span key={h} className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>{h}</span>
                        ))}
                    </div>
                    {checkins.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>출석 기록이 없습니다</p>
                        </div>
                    ) : (
                        checkins.map((c) => (
                            <div key={c.id} className="grid grid-cols-4 gap-4 px-6 py-4 transition-all hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <span className="text-sm text-white">{new Date(c.time).toLocaleDateString('ko-KR')}</span>
                                <span className="text-sm text-white">{new Date(c.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-sm text-white">{c.facility}</span>
                                <span><span className="px-3 py-1 rounded-full text-[9px] font-black uppercase" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>{c.status}</span></span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Table Header */}
                    <div className="grid grid-cols-6 gap-4 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {['결제 ID', '금액', '카테고리', '결제 수단', '날짜', '상태'].map((h) => (
                            <span key={h} className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>{h}</span>
                        ))}
                    </div>
                    {transactions.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>결제 기록이 없습니다</p>
                        </div>
                    ) : (
                        transactions.map((t) => (
                            <div key={t.id} className="grid grid-cols-6 gap-4 px-6 py-4 transition-all hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <span className="text-xs text-white truncate">{t.id}</span>
                                <span className="text-sm font-bold text-white">₩{Number(t.amount).toLocaleString()}</span>
                                <span className="text-sm text-white">{t.category}</span>
                                <span className="text-sm text-white">{t.method}</span>
                                <span className="text-sm text-white">{t.date}</span>
                                <span>
                                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase"
                                        style={{ background: t.status === 'completed' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: t.status === 'completed' ? '#22C55E' : '#EF4444' }}>
                                        {t.status}
                                    </span>
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
                <div>
                    {/* Add Note */}
                    <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="새 메모를 입력하세요..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                                className="flex-1 px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                            />
                            <button
                                onClick={addNote}
                                disabled={!newNote.trim()}
                                className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-40"
                                style={{ background: 'var(--primary)', boxShadow: '0 0 15px rgba(255,107,0,0.3)' }}
                            >
                                추가
                            </button>
                        </div>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3">
                        {notes.map((n) => (
                            <div key={n.id} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <p className="text-sm text-white mb-2">{n.content}</p>
                                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{new Date(n.created_at).toLocaleString('ko-KR')}</p>
                            </div>
                        ))}
                        {notes.length === 0 && (
                            <div className="py-12 text-center">
                                <span className="text-3xl mb-3 block"><IconNotes size={32} /></span>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>메모가 없습니다</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* T1-2: Member Edit Modal */}
            <AdminModal show={showEditModal} onClose={() => setShowEditModal(false)} title="회원 정보 수정" subtitle={member.email}>
                <div className="space-y-5">
                    <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">이름 *</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} /></div>
                    <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">전화번호</label><input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="010-0000-0000" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">성별</label><select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}><option value="">미지정</option><option value="M">남성</option><option value="F">여성</option></select></div>
                        <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">생년월일</label><input type="date" value={editForm.birthdate} onChange={(e) => setEditForm({ ...editForm, birthdate: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} /></div>
                    </div>
                    <div><label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">상태</label><select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}><option value="Active">활성</option><option value="Inactive">비활성</option><option value="Expired">만료</option><option value="Suspended">정지</option></select></div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                    <button onClick={saveMemberEdit} disabled={saving || !editForm.name.trim()} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-50" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>{saving ? '저장 중...' : '저장'}</button>
                </div>
            </AdminModal>
        </div>
    );
}
