'use client';

import { useEffect, useState } from 'react';

import { query } from '@/lib/supabase/query';
import { useAuth } from '@/contexts/AuthContext';
import MemberFollowupTimeline from '@/components/coach/followups/MemberFollowupTimeline';
import MemberPerformanceProfile from '@/components/members/MemberPerformanceProfile';

interface MemberItem {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    created_at: string;
}

interface CoachingNote {
    id: string;
    note_type: string;
    content: string;
    created_at: string;
}

interface AttendanceStats {
    totalCheckins: number;
    thisMonthCheckins: number;
    thisMonthSessions: number;
}

export default function CoachMembersPage() {
    const { user } = useAuth();
    const [coachId, setCoachId] = useState<string | null>(null);
    const [members, setMembers] = useState<MemberItem[]>([]);
    const [myMemberIds, setMyMemberIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [filterScope, setFilterScope] = useState<'all' | 'my'>('my');

    // Selection & Notes
    const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null);
    const [notes, setNotes] = useState<CoachingNote[]>([]);
    const [noteLoading, setNoteLoading] = useState(false);
    const [savingNote, setSavingNote] = useState(false);
    const [newNoteType, setNewNoteType] = useState('general');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [noteFilter, setNoteFilter] = useState<'all' | 'general' | 'injury' | 'progress' | 'caution'>('all');

    // Attendance stats
    const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);

    useEffect(() => {
        loadData();
    }, [user]);

    async function loadData() {
        if (!user) return;
        setLoading(true);

        try {
            const { data: coachData } = await query('coaches')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (coachData) {
                setCoachId(coachData.id);

                // Get my assigned member IDs (members who booked my sessions)
                const { data: scData } = await query('session_coaches')
                    .select('session_id')
                    .eq('coach_id', coachData.id);

                if (scData && scData.length > 0) {
                    const sessionIds = scData.map((sc: any) => sc.session_id);
                    const { data: bookingData } = await query('bookings')
                        .select('member_id')
                        .in('session_id', sessionIds)
                        .eq('status', 'confirmed');

                    if (bookingData) {
                        const uniqueIds = [...new Set(bookingData.map((b: any) => b.member_id))];
                        setMyMemberIds(uniqueIds as string[]);
                    }
                }
            }

            const { data } = await query('members')
                .select('id, name, email, phone, status, created_at')
                .order('name', { ascending: true });

            if (data) setMembers(data);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') console.error('Members load error:', error);
        }
        setLoading(false);
    }

    const loadNotesAndStats = async (memberId: string) => {
        if (!coachId) return;
        setNoteLoading(true);
        setAttendanceStats(null);

        try {
            // Load notes (multi)
            const { data: noteData } = await query('coaching_notes')
                .select('id, note_type, content, created_at')
                .eq('coach_id', coachId)
                .eq('member_id', memberId)
                .order('created_at', { ascending: false })
                .limit(50);

            setNotes(noteData || []);

            // Load attendance stats
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

            const { count: totalCheckins } = await query('checkins')
                .select('id', { count: 'exact', head: true })
                .eq('member_id', memberId);

            const { count: thisMonthCheckins } = await query('checkins')
                .select('id', { count: 'exact', head: true })
                .eq('member_id', memberId)
                .gte('checkin_time', monthStart)
                .lte('checkin_time', monthEnd + 'T23:59:59');

            // Count this month's bookings as proxy for sessions
            const { count: thisMonthSessions } = await query('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('member_id', memberId)
                .eq('status', 'confirmed')
                .gte('created_at', monthStart)
                .lte('created_at', monthEnd + 'T23:59:59');

            setAttendanceStats({
                totalCheckins: totalCheckins || 0,
                thisMonthCheckins: thisMonthCheckins || 0,
                thisMonthSessions: thisMonthSessions || 0,
            });
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setNotes([]);
        }
        setNoteLoading(false);
    };

    const handleSelectMember = (member: MemberItem) => {
        if (selectedMember?.id === member.id) {
            setSelectedMember(null);
        } else {
            setSelectedMember(member);
            setNewNoteContent('');
            setNewNoteType('general');
            setNoteFilter('all');
            loadNotesAndStats(member.id);
        }
    };

    const handleSaveNote = async () => {
        if (!coachId || !selectedMember || !newNoteContent.trim()) {
            alert('내용을 입력해주세요.');
            return;
        }
        setSavingNote(true);
        try {
            const { data } = await query('coaching_notes').insert({
                coach_id: coachId,
                member_id: selectedMember.id,
                note_type: newNoteType,
                content: newNoteContent.trim()
            }).select('id, note_type, content, created_at').single();

            if (data) {
                setNotes(prev => [data, ...prev]);
                setNewNoteContent('');
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            alert('저장 실패');
        }
        setSavingNote(false);
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('이 노트를 삭제하시겠습니까?')) return;
        try {
            await query('coaching_notes').delete().eq('id', noteId);
            setNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
        }
    };

    const noteTypeConfig: Record<string, { label: string; color: string; emoji: string }> = {
        general: { label: '일반', color: 'var(--app-text-secondary)', emoji: '⚪' },
        injury: { label: '부상', color: '#EF4444', emoji: '🔴' },
        progress: { label: '성장', color: '#22C55E', emoji: '🟢' },
        caution: { label: '주의', color: '#F59E0B', emoji: '🟡' },
    };

    const filteredNotes = noteFilter === 'all' ? notes : notes.filter(n => n.note_type === noteFilter);

    const filteredMembers = members.filter(m => {
        if (filterStatus !== 'all' && m.status !== filterStatus) return false;
        if (filterScope === 'my' && !myMemberIds.includes(m.id)) return false;
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
                    {filterScope === 'my' ? '내 수업 회원 ' : '시설 전체 '}
                    {filteredMembers.length}명 표시 / 전체 {members.length}명
                </p>
            </div>

            {/* Scope Filter */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {(['my', 'all'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilterScope(f)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--app-radius-md)',
                            border: '1px solid var(--app-border)',
                            background: filterScope === f ? 'var(--app-accent)' : 'var(--app-surface)',
                            color: filterScope === f ? '#fff' : 'var(--app-text-secondary)',
                            fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
                        }}
                    >
                        {f === 'my' ? `담당 회원 (${myMemberIds.length})` : '시설 전체'}
                    </button>
                ))}
            </div>
            <p style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {filterScope === 'my'
                    ? '내가 배정된 세션을 예약한 회원만 표시합니다.'
                    : '시설 전체 회원 검색은 코칭 노트 작성과 출결 보조 목적으로만 사용해주세요.'}
            </p>

            {/* Status Filter */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {(['all', 'active', 'inactive'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilterStatus(f)}
                        style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: 'var(--app-radius-sm)',
                            border: '1px solid var(--app-border)',
                            background: filterStatus === f ? 'var(--app-accent-bg)' : 'transparent',
                            color: filterStatus === f ? 'var(--app-accent)' : 'var(--app-text-muted)',
                            fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                        }}
                    >
                        {f === 'all' ? '전체' : f === 'active' ? '활성' : '비활성'}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: '1.5rem' }}>
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
                            className="app-glass-card"
                            style={{
                                padding: '1rem',
                                transition: 'all 0.2s',
                                borderColor: selectedMember?.id === member.id ? 'var(--app-accent)' : undefined,
                            }}
                        >
                            <div onClick={() => handleSelectMember(member)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>
                                            {member.name}
                                        </span>
                                        {myMemberIds.includes(member.id) && (
                                            <span style={{ fontSize: '0.5625rem', padding: '1px 4px', borderRadius: 4, background: 'var(--app-accent-bg)', color: 'var(--app-accent)', fontWeight: 700 }}>담당</span>
                                        )}
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
                                    {/* Basic Info + Attendance Stats */}
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

                                    {/* Attendance Stats */}
                                    {attendanceStats && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <div style={{ textAlign: 'center', padding: '0.625rem', borderRadius: 'var(--app-radius-md)', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                                                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--app-accent)' }}>{attendanceStats.totalCheckins}</div>
                                                <div style={{ fontSize: '0.625rem', color: 'var(--app-text-muted)', fontWeight: 600, marginTop: 2 }}>총 출석</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: '0.625rem', borderRadius: 'var(--app-radius-md)', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                                                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--app-accent)' }}>{attendanceStats.thisMonthCheckins}</div>
                                                <div style={{ fontSize: '0.625rem', color: 'var(--app-text-muted)', fontWeight: 600, marginTop: 2 }}>이달 출석</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: '0.625rem', borderRadius: 'var(--app-radius-md)', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                                                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: attendanceStats.thisMonthSessions > 0 ? '#22C55E' : 'var(--app-text-muted)' }}>
                                                    {attendanceStats.thisMonthSessions > 0 ? Math.round((attendanceStats.thisMonthCheckins / attendanceStats.thisMonthSessions) * 100) : 0}%
                                                </div>
                                                <div style={{ fontSize: '0.625rem', color: 'var(--app-text-muted)', fontWeight: 600, marginTop: 2 }}>출석률</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Coaching Notes */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>코칭 노트 ({notes.length}건)</div>
                                        </div>

                                        {/* Note type filter */}
                                        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                            {(['all', 'general', 'injury', 'progress', 'caution'] as const).map(t => (
                                                <button key={t} onClick={() => setNoteFilter(t)} style={{
                                                    padding: '0.25rem 0.5rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                                                    fontSize: '0.6875rem', fontWeight: 600,
                                                    background: noteFilter === t ? 'var(--app-accent-bg)' : 'var(--app-surface)',
                                                    color: noteFilter === t ? 'var(--app-accent)' : 'var(--app-text-muted)',
                                                }}>
                                                    {t === 'all' ? '전체' : noteTypeConfig[t]?.emoji + ' ' + noteTypeConfig[t]?.label}
                                                </button>
                                            ))}
                                        </div>

                                        {noteLoading ? (
                                            <div className="app-skeleton" style={{ height: 80, borderRadius: 'var(--app-radius-md)' }} />
                                        ) : (
                                            <>
                                                {/* Existing notes list */}
                                                {filteredNotes.length > 0 && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem', maxHeight: 240, overflowY: 'auto' }}>
                                                        {filteredNotes.map(note => {
                                                            const cfg = noteTypeConfig[note.note_type] || noteTypeConfig.general;
                                                            return (
                                                                <div key={note.id} style={{ padding: '0.625rem 0.75rem', borderRadius: 'var(--app-radius-md)', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                            <span style={{ fontSize: '0.75rem' }}>{cfg.emoji}</span>
                                                                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                                                                            <span style={{ fontSize: '0.625rem', color: 'var(--app-text-muted)' }}>
                                                                                {new Date(note.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                                                                            </span>
                                                                        </div>
                                                                        <button onClick={() => handleDeleteNote(note.id)} style={{ background: 'none', border: 'none', color: 'var(--app-text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>✕</button>
                                                                    </div>
                                                                    <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-primary)', lineHeight: 1.5, margin: 0 }}>{note.content}</p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {filteredNotes.length === 0 && notes.length === 0 && (
                                                    <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--app-surface)', borderRadius: 'var(--app-radius-md)', marginBottom: '0.75rem' }}>
                                                        <p style={{ color: 'var(--app-text-muted)', fontSize: '0.8125rem' }}>코칭 노트가 없습니다</p>
                                                    </div>
                                                )}

                                                {/* New note form */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <select
                                                            value={newNoteType}
                                                            onChange={(e) => setNewNoteType(e.target.value)}
                                                            style={{
                                                                padding: '0.5rem', borderRadius: 8, background: 'var(--app-surface)',
                                                                border: '1px solid var(--app-border)', color: 'var(--app-text-primary)',
                                                                fontSize: '0.8125rem', width: 'fit-content'
                                                            }}
                                                        >
                                                            <option value="general">⚪ 일반</option>
                                                            <option value="injury">🔴 부상 이력</option>
                                                            <option value="progress">🟢 성장/성과</option>
                                                            <option value="caution">🟡 주의 사항</option>
                                                        </select>
                                                        <span style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)' }}>새 노트 추가</span>
                                                    </div>
                                                    <textarea
                                                        value={newNoteContent}
                                                        onChange={(e) => setNewNoteContent(e.target.value)}
                                                        placeholder="부상 기록, 특이사항 등을 남겨주세요..."
                                                        style={{
                                                            width: '100%', minHeight: 60, padding: '0.75rem',
                                                            borderRadius: 'var(--app-radius-md)',
                                                            background: 'var(--app-surface)',
                                                            border: '1px solid var(--app-border)',
                                                            color: 'var(--app-text-primary)',
                                                            fontSize: '0.8125rem', resize: 'vertical', outline: 'none',
                                                        }}
                                                    />
                                                    <div style={{ alignSelf: 'flex-end' }}>
                                                        <button
                                                            onClick={handleSaveNote}
                                                            disabled={savingNote || !newNoteContent.trim()}
                                                            style={{
                                                                padding: '0.5rem 1rem', borderRadius: 8,
                                                                background: !newNoteContent.trim() ? 'var(--app-surface)' : 'var(--app-accent)',
                                                                color: !newNoteContent.trim() ? 'var(--app-text-muted)' : '#fff',
                                                                border: 'none', fontWeight: 600, cursor: 'pointer',
                                                                opacity: savingNote ? 0.7 : 1
                                                            }}
                                                        >
                                                            {savingNote ? '저장 중...' : '저장'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Follow-up Timeline (P25) */}
                                    <MemberFollowupTimeline memberId={member.id} memberName={member.name} />

                                    {/* Performance Profile (P25) */}
                                    <MemberPerformanceProfile memberId={member.id} allowRecord />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
