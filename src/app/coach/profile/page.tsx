'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface CoachInfo {
    id: string;
    name: string;
    specialties: string[] | null;
    bio: string | null;
    phone: string | null;
    email: string | null;
    profile_image_url: string | null;
}

interface SessionStats {
    totalSessions: number;
    thisMonthSessions: number;
}

interface Settlement {
    id: string;
    year_month: string;
    base_salary: number;
    session_count: number;
    session_allowance: number;
    total_amount: number;
    status: string;
}

export default function CoachProfilePage() {
    const { user, profile, signOut } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [coachInfo, setCoachInfo] = useState<CoachInfo | null>(null);
    const [stats, setStats] = useState<SessionStats>({ totalSessions: 0, thisMonthSessions: 0 });
    const [loading, setLoading] = useState(true);

    // Edit mode
    const [isEditing, setIsEditing] = useState(false);
    const [editBio, setEditBio] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editSpecialties, setEditSpecialties] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Settlement
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [showSettlements, setShowSettlements] = useState(false);
    const [settlementsLoading, setSettlementsLoading] = useState(false);

    useEffect(() => {
        loadCoachProfile();
    }, [user]);

    async function loadCoachProfile() {
        if (!user) return;

        try {
            const { data: coachData } = await query('coaches')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (coachData) {
                setCoachInfo(coachData);
                setEditBio(coachData.bio || '');
                setEditPhone(coachData.phone || '');
                setEditSpecialties((coachData.specialties || []).join(', '));

                // 총 수업 수
                const { data: allSessionCoaches } = await query('session_coaches')
                    .select('session_id')
                    .eq('coach_id', coachData.id);

                const totalSessions = allSessionCoaches?.length || 0;

                // 이번 달
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

                let thisMonthSessions = 0;
                if (allSessionCoaches && allSessionCoaches.length > 0) {
                    const sessionIds = allSessionCoaches.map((sc: any) => sc.session_id);
                    const { count } = await query('sessions')
                        .select('id', { count: 'exact', head: true })
                        .in('id', sessionIds)
                        .gte('session_date', monthStart)
                        .lte('session_date', monthEnd);
                    thisMonthSessions = count || 0;
                }

                setStats({ totalSessions, thisMonthSessions });
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') console.error('Coach profile load error:', error);
        }
        setLoading(false);
    }

    async function handleSaveProfile() {
        if (!coachInfo) return;
        setSaving(true);
        try {
            const specialtiesArr = editSpecialties.split(',').map(s => s.trim()).filter(Boolean);
            const { error } = await query('coaches')
                .update({
                    bio: editBio.trim() || null,
                    phone: editPhone.trim() || null,
                    specialties: specialtiesArr.length > 0 ? specialtiesArr : null,
                })
                .eq('id', coachInfo.id);

            if (!error) {
                setCoachInfo(prev => prev ? {
                    ...prev,
                    bio: editBio.trim() || null,
                    phone: editPhone.trim() || null,
                    specialties: specialtiesArr.length > 0 ? specialtiesArr : null,
                } : null);
                setIsEditing(false);
            } else {
                alert('저장에 실패했습니다.');
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            alert('오류가 발생했습니다.');
        }
        setSaving(false);
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !coachInfo) return;
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('5MB 이하의 파일만 업로드 가능합니다.');
            return;
        }

        setUploadingImage(true);
        try {
            const supabase = createClient();
            const ext = file.name.split('.').pop();
            const filePath = `coaches/${coachInfo.id}/profile.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('profiles')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(filePath);
            const publicUrl = urlData.publicUrl + '?t=' + Date.now();

            const { error: updateError } = await query('coaches')
                .update({ profile_image_url: publicUrl })
                .eq('id', coachInfo.id);

            if (!updateError) {
                setCoachInfo(prev => prev ? { ...prev, profile_image_url: publicUrl } : null);
            }
        } catch (err) {
            if (process.env.NODE_ENV === 'development') console.error(err);
            alert('이미지 업로드에 실패했습니다.');
        }
        setUploadingImage(false);
    }

    async function loadSettlements() {
        if (!coachInfo) return;
        setSettlementsLoading(true);
        try {
            const { data } = await query('coach_settlements')
                .select('*')
                .eq('coach_id', coachInfo.id)
                .order('year_month', { ascending: false })
                .limit(12);

            setSettlements(data || []);
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
        }
        setSettlementsLoading(false);
    }

    async function handleLogout() {
        await signOut();
        router.push('/auth/login');
    }

    const formatWon = (n: number) => n.toLocaleString('ko-KR') + '원';

    const statusLabel: Record<string, { text: string; color: string }> = {
        pending: { text: '대기', color: '#F59E0B' },
        confirmed: { text: '확정', color: '#3B82F6' },
        paid: { text: '지급완료', color: '#22C55E' },
    };

    if (loading) {
        return (
            <div className="app-page">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                    <div className="app-skeleton" style={{ width: 80, height: 80, borderRadius: '50%', marginBottom: 16 }} />
                    <div className="app-skeleton" style={{ width: '40%', height: 24, marginBottom: 8 }} />
                    <div className="app-skeleton" style={{ width: '30%', height: 14 }} />
                </div>
                <div className="app-skeleton" style={{ height: 100, borderRadius: 16, marginBottom: 12 }} />
                <div className="app-skeleton" style={{ height: 100, borderRadius: 16 }} />
            </div>
        );
    }

    return (
        <div className="app-page">
            {/* Profile Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    {coachInfo?.profile_image_url ? (
                        <img
                            src={coachInfo.profile_image_url}
                            alt={coachInfo.name}
                            style={{
                                width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                                border: '3px solid var(--app-accent)',
                            }}
                        />
                    ) : (
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: 'var(--app-accent-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2rem', fontWeight: 800, color: 'var(--app-accent)',
                        }}>
                            {coachInfo?.name?.charAt(0) || profile?.full_name?.charAt(0) || '?'}
                        </div>
                    )}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        style={{
                            position: 'absolute', bottom: -4, right: -4,
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'var(--app-accent)', border: '2px solid var(--app-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#fff', fontSize: '0.75rem',
                        }}
                    >
                        {uploadingImage ? '...' : '📷'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', marginTop: '1rem' }}>
                    {coachInfo?.name || profile?.full_name || '코치'}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginTop: 4 }}>
                    {user?.email}
                </p>
                {coachInfo?.specialties && coachInfo.specialties.length > 0 && !isEditing && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.375rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        {coachInfo.specialties.map((s, i) => (
                            <span key={i} style={{
                                padding: '0.25rem 0.625rem', borderRadius: 'var(--app-radius-full)',
                                background: 'var(--app-accent-bg)', color: 'var(--app-accent)',
                                fontSize: '0.6875rem', fontWeight: 600,
                            }}>
                                {s}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Profile */}
            {isEditing ? (
                <div className="app-glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '1rem' }}>프로필 수정</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-muted)', display: 'block', marginBottom: 4 }}>전문 분야 (콤마 구분)</label>
                            <input
                                value={editSpecialties} onChange={e => setEditSpecialties(e.target.value)}
                                placeholder="CrossFit, Olympic Lifting, Endurance"
                                style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem', outline: 'none' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-muted)', display: 'block', marginBottom: 4 }}>연락처</label>
                            <input
                                value={editPhone} onChange={e => setEditPhone(e.target.value)}
                                placeholder="010-0000-0000"
                                style={{ width: '100%', padding: '0.625rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem', outline: 'none' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-muted)', display: 'block', marginBottom: 4 }}>자기소개</label>
                            <textarea
                                value={editBio} onChange={e => setEditBio(e.target.value)}
                                placeholder="코치 소개를 입력하세요..."
                                style={{ width: '100%', minHeight: 80, padding: '0.625rem', borderRadius: 8, background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)', fontSize: '0.875rem', resize: 'vertical', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsEditing(false)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--app-surface)', color: 'var(--app-text-primary)', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleSaveProfile} disabled={saving} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--app-accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                                {saving ? '저장 중...' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsEditing(true)}
                    style={{
                        width: '100%', padding: '0.75rem', borderRadius: 'var(--app-radius-lg)',
                        background: 'var(--app-accent-bg)', color: 'var(--app-accent)',
                        border: 'none', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem',
                    }}
                >
                    ✏️ 프로필 수정
                </button>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="app-glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--app-accent)' }}>
                        {stats.thisMonthSessions}
                    </div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        이번 달 수업
                    </div>
                </div>
                <div className="app-glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--app-accent)' }}>
                        {stats.totalSessions}
                    </div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        총 수업
                    </div>
                </div>
            </div>

            {/* Bio */}
            {coachInfo?.bio && !isEditing && (
                <div className="app-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        소개
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--app-text-primary)', lineHeight: 1.6 }}>
                        {coachInfo.bio}
                    </p>
                </div>
            )}

            {/* Salary / Settlements */}
            <div className="app-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <div onClick={() => { if (!showSettlements) { setShowSettlements(true); loadSettlements(); } else { setShowSettlements(false); } }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        💰 급여/수당 조회
                    </h4>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-muted)" strokeWidth="2" style={{ transform: showSettlements ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>

                {showSettlements && (
                    <div style={{ marginTop: '1rem' }}>
                        {settlementsLoading ? (
                            <div className="app-skeleton" style={{ height: 60, borderRadius: 'var(--app-radius-md)' }} />
                        ) : settlements.length === 0 ? (
                            <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-muted)', textAlign: 'center', padding: '1rem 0' }}>정산 내역이 없습니다</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {settlements.map(s => {
                                    const sl = statusLabel[s.status] || statusLabel.pending;
                                    return (
                                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: 'var(--app-radius-md)', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                                            <div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>{s.year_month}</div>
                                                <div style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)', marginTop: 2 }}>
                                                    기본급 {formatWon(s.base_salary)} + {s.session_count}회 × {formatWon(s.session_allowance)}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--app-accent)' }}>
                                                    {formatWon(s.total_amount)}
                                                </div>
                                                <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: sl.color + '20', color: sl.color }}>
                                                    {sl.text}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Menu Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                {[
                    { icon: '📅', label: '내 수업 일정', href: '/coach/schedule' },
                    { icon: '👥', label: '회원 관리', href: '/coach/members' },
                    { icon: '🏁', label: 'Race 관리', href: '/coach/race' },
                ].map(item => (
                    <a
                        key={item.label}
                        href={item.href}
                        className="app-glass-card"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '1rem', textDecoration: 'none',
                        }}
                    >
                        <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                        <span style={{ flex: 1, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>
                            {item.label}
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-muted)" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </a>
                ))}
            </div>

            {/* Logout */}
            <button
                onClick={handleLogout}
                style={{
                    width: '100%', padding: '0.875rem', borderRadius: 'var(--app-radius-lg)',
                    border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)',
                    color: '#EF4444', fontWeight: 600, fontSize: '0.9375rem',
                    cursor: 'pointer', transition: 'all 0.2s', marginBottom: '5rem',
                }}
            >
                로그아웃
            </button>
        </div>
    );
}
