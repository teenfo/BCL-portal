'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MemberItem {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    created_at: string;
}

export default function CoachMembersPage() {
    const { user } = useAuth();
    const [members, setMembers] = useState<MemberItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null);
    const [coachingNote, setCoachingNote] = useState('');

    useEffect(() => {
        loadMembers();
    }, [user]);

    async function loadMembers() {
        if (!user) return;
        const supabase: any = createClient();

        try {
            const { data } = await supabase
                .from('members')
                .select('id, name, email, phone, status, created_at')
                .order('name', { ascending: true });

            if (data) setMembers(data);
        } catch (error) {
            console.error('Members load error:', error);
        }
        setLoading(false);
    }

    const filteredMembers = members.filter(m => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return m.name?.toLowerCase().includes(term) || m.email?.toLowerCase().includes(term);
    });

    if (loading) {
        return (
            <div className="app-page">
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="app-skeleton" style={{ width: '50%', height: 28, marginBottom: 16 }} />
                    <div className="app-skeleton" style={{ height: 44, borderRadius: 12, marginBottom: 16 }} />
                </div>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="app-skeleton" style={{ height: 72, borderRadius: 16, marginBottom: 12 }} />
                ))}
            </div>
        );
    }

    return (
        <div className="app-page">
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', letterSpacing: '-0.01em' }}>
                    회원 관리
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginTop: 4 }}>
                    {members.length}명 등록
                </p>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '1rem' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--app-radius-lg)',
                    background: 'var(--app-surface)',
                    border: '1px solid var(--app-border)',
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-muted)" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="이름 또는 이메일로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            flex: 1, border: 'none', outline: 'none',
                            background: 'transparent',
                            color: 'var(--app-text-primary)',
                            fontSize: '0.875rem',
                        }}
                    />
                </div>
            </div>

            {/* Member List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredMembers.length === 0 ? (
                    <div className="app-glass-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>🔍</div>
                        <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>검색 결과가 없습니다</p>
                    </div>
                ) : (
                    filteredMembers.map(member => (
                        <div
                            key={member.id}
                            onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                            className="app-glass-card"
                            style={{
                                padding: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                borderColor: selectedMember?.id === member.id ? 'var(--app-accent)' : undefined,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: '50%',
                                    background: 'var(--app-accent-bg)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--app-accent)',
                                    fontWeight: 800, fontSize: '1rem',
                                    flexShrink: 0,
                                }}>
                                    {member.name?.charAt(0) || '?'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>
                                        {member.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--app-text-secondary)', marginTop: 2 }}>
                                        {member.email}
                                    </div>
                                </div>
                                <span style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: 'var(--app-radius-sm)',
                                    background: member.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: member.status === 'active' ? '#22C55E' : '#EF4444',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                }}>
                                    {member.status === 'active' ? '활성' : '비활성'}
                                </span>
                            </div>

                            {/* Expanded Detail */}
                            {selectedMember?.id === member.id && (
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--app-border)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: 2 }}>연락처</div>
                                            <div style={{ fontSize: '0.8125rem', color: 'var(--app-text-primary)' }}>{member.phone || '-'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: 2 }}>가입일</div>
                                            <div style={{ fontSize: '0.8125rem', color: 'var(--app-text-primary)' }}>
                                                {new Date(member.created_at).toLocaleDateString('ko-KR')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Coaching Note */}
                                    <div>
                                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: 4 }}>코칭 노트</div>
                                        <textarea
                                            value={coachingNote}
                                            onChange={(e) => setCoachingNote(e.target.value)}
                                            placeholder="부상 이력, 운동 특이사항 등을 기록하세요..."
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                width: '100%',
                                                minHeight: 80,
                                                padding: '0.75rem',
                                                borderRadius: 'var(--app-radius-md)',
                                                background: 'var(--app-bg)',
                                                border: '1px solid var(--app-border)',
                                                color: 'var(--app-text-primary)',
                                                fontSize: '0.8125rem',
                                                resize: 'vertical',
                                                outline: 'none',
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
