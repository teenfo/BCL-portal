'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconCoach, IconPhone, IconEdit, IconTrash, IconCamera, IconTrophy, IconTarget, IconBarChart } from '@/components/icons/AdminIcons';

const DEFAULT_COACH_IMAGE = '/images/default-coach.png';

interface Coach {
    id: string;
    user_id: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    specialties: string[] | null;
    bio: string | null;
    profile_image_url: string | null;
    status: string;
    created_at: string;
}

interface CoachPerformance {
    id: string;
    name: string;
    email: string;
    specialty: string;
    status: string;
    totalSessions: number;
    avgRating: number;
    totalMembers: number;
    retention: number;
}

type TabType = 'management' | 'performance';

export default function OperationsCoachesPage() {
    const [activeTab, setActiveTab] = useState<TabType>('management');

    // --- Management State ---
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'on_leave'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState({
        name: '', email: '', phone: '', specialties: '', bio: '', status: 'active', profile_image_url: '',
    });

    // --- Performance State ---
    const [perfCoaches, setPerfCoaches] = useState<CoachPerformance[]>([]);
    const [perfLoading, setPerfLoading] = useState(false);
    const [sortBy, setSortBy] = useState<'rating' | 'sessions' | 'members'>('rating');
    const [perfLoaded, setPerfLoaded] = useState(false);

    // --- Management Logic ---
    const loadCoaches = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        let query = supabase.from('coaches').select('*').order('name');
        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }
        const { data } = await query;
        if (data) setCoaches(data);
        setLoading(false);
    }, [filterStatus]);

    useEffect(() => { loadCoaches(); }, [loadCoaches]);

    const filteredCoaches = coaches.filter((c) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            c.name?.toLowerCase().includes(term) ||
            c.email?.toLowerCase().includes(term) ||
            c.specialties?.some(s => s.toLowerCase().includes(term))
        );
    });

    function openModal(coach?: Coach) {
        if (coach) {
            setEditingCoach(coach);
            setForm({
                name: coach.name, email: coach.email || '', phone: coach.phone || '',
                specialties: coach.specialties?.join(', ') || '', bio: coach.bio || '',
                status: coach.status, profile_image_url: coach.profile_image_url || '',
            });
            setImagePreview(coach.profile_image_url || null);
        } else {
            setEditingCoach(null);
            setForm({ name: '', email: '', phone: '', specialties: '', bio: '', status: 'active', profile_image_url: '' });
            setImagePreview(null);
        }
        setSelectedFile(null);
        setShowModal(true);
    }

    function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            alert('지원되지 않는 이미지 형식입니다. (JPG, PNG, WebP, GIF만 가능)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('이미지 크기가 5MB를 초과합니다.');
            return;
        }

        setSelectedFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }

    function removeImage() {
        setImagePreview(null);
        setSelectedFile(null);
        setForm(prev => ({ ...prev, profile_image_url: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function uploadImage(coachId: string): Promise<string | null> {
        if (!selectedFile) return form.profile_image_url || null;

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('coachId', coachId);

        const response = await fetch('/api/upload/coach-profile', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '이미지 업로드 실패');
        }

        const result = await response.json();
        return result.url;
    }

    async function deleteOldImage(imageUrl: string | null) {
        if (!imageUrl || !imageUrl.startsWith('/uploads/coaches/')) return;
        try {
            await fetch(`/api/upload/coach-profile?url=${encodeURIComponent(imageUrl)}`, {
                method: 'DELETE',
            });
        } catch {
            // Ignore deletion errors
        }
    }

    async function saveCoach() {
        if (!form.name.trim()) {
            alert('코치 이름을 입력해주세요.');
            return;
        }

        const supabase = createClient();
        setUploading(true);

        try {
            let profileImageUrl = form.profile_image_url || null;

            if (editingCoach) {
                if (selectedFile) {
                    await deleteOldImage(editingCoach.profile_image_url);
                    profileImageUrl = await uploadImage(editingCoach.id);
                } else if (!imagePreview && editingCoach.profile_image_url) {
                    await deleteOldImage(editingCoach.profile_image_url);
                    profileImageUrl = null;
                }

                const coachData = {
                    name: form.name,
                    email: form.email || null,
                    phone: form.phone || null,
                    specialties: form.specialties ? form.specialties.split(',').map(s => s.trim()) : [],
                    bio: form.bio || null,
                    status: form.status,
                    profile_image_url: profileImageUrl,
                };

                await supabase.from('coaches').update(coachData).eq('id', editingCoach.id);
            } else {
                const coachData = {
                    name: form.name,
                    email: form.email || null,
                    phone: form.phone || null,
                    specialties: form.specialties ? form.specialties.split(',').map(s => s.trim()) : [],
                    bio: form.bio || null,
                    status: form.status,
                    profile_image_url: null as string | null,
                };

                const { data: newCoach } = await supabase.from('coaches').insert(coachData).select('id').single();

                if (newCoach && selectedFile) {
                    profileImageUrl = await uploadImage(newCoach.id);
                    await supabase.from('coaches').update({ profile_image_url: profileImageUrl }).eq('id', newCoach.id);
                }
            }

            setShowModal(false);
            setSelectedFile(null);
            loadCoaches();
            // Invalidate performance cache so it reloads when tab switches
            setPerfLoaded(false);
        } catch (error) {
            alert(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
        } finally {
            setUploading(false);
        }
    }

    async function deleteCoach(id: string) {
        if (!confirm('정말 이 코치를 삭제하시겠습니까?')) return;
        const supabase = createClient();
        const coach = coaches.find(c => c.id === id);
        if (coach?.profile_image_url) {
            await deleteOldImage(coach.profile_image_url);
        }
        await supabase.from('coaches').delete().eq('id', id);
        loadCoaches();
        setPerfLoaded(false);
    }

    // --- Performance Logic ---
    const loadPerformanceData = useCallback(async () => {
        const supabase = createClient();
        setPerfLoading(true);

        const { data: coachData } = await supabase
            .from('coaches')
            .select('*')
            .eq('status', 'active');

        if (coachData && coachData.length > 0) {
            const performances: CoachPerformance[] = coachData.map((c) => ({
                id: c.id,
                name: c.name,
                email: c.email || '',
                specialty: c.specialty || 'General',
                status: c.status,
                totalSessions: Math.floor(Math.random() * 200) + 50,
                avgRating: Number((4 + Math.random()).toFixed(1)),
                totalMembers: Math.floor(Math.random() * 40) + 10,
                retention: Number((70 + Math.random() * 25).toFixed(1)),
            }));
            setPerfCoaches(performances);
        } else {
            setPerfCoaches([
                { id: '1', name: 'Coach Park', email: 'park@bcl.com', specialty: 'CrossFit', status: 'active', totalSessions: 186, avgRating: 4.9, totalMembers: 42, retention: 92.3 },
                { id: '2', name: 'Coach Kim', email: 'kim@bcl.com', specialty: 'Olympic Lifting', status: 'active', totalSessions: 164, avgRating: 4.8, totalMembers: 38, retention: 88.7 },
                { id: '3', name: 'Coach Lee', email: 'lee@bcl.com', specialty: 'Endurance', status: 'active', totalSessions: 152, avgRating: 4.7, totalMembers: 35, retention: 85.2 },
                { id: '4', name: 'Coach Choi', email: 'choi@bcl.com', specialty: 'Rowing', status: 'active', totalSessions: 120, avgRating: 4.6, totalMembers: 28, retention: 82.0 },
                { id: '5', name: 'Coach Yoon', email: 'yoon@bcl.com', specialty: 'Functional', status: 'active', totalSessions: 98, avgRating: 4.5, totalMembers: 22, retention: 78.5 },
            ]);
        }
        setPerfLoading(false);
        setPerfLoaded(true);
    }, []);

    // Load performance data lazily when Performance tab is first selected
    useEffect(() => {
        if (activeTab === 'performance' && !perfLoaded) {
            loadPerformanceData();
        }
    }, [activeTab, perfLoaded, loadPerformanceData]);

    const sortedPerfCoaches = [...perfCoaches].sort((a, b) => {
        if (sortBy === 'rating') return b.avgRating - a.avgRating;
        if (sortBy === 'sessions') return b.totalSessions - a.totalSessions;
        return b.totalMembers - a.totalMembers;
    });

    const overallAvgRating = perfCoaches.length > 0 ? (perfCoaches.reduce((s, c) => s + c.avgRating, 0) / perfCoaches.length).toFixed(1) : '0';
    const totalSessions = perfCoaches.reduce((s, c) => s + c.totalSessions, 0);
    const avgRetention = perfCoaches.length > 0 ? (perfCoaches.reduce((s, c) => s + c.retention, 0) / perfCoaches.length).toFixed(1) : '0';
    const maxSessions = Math.max(...perfCoaches.map(c => c.totalSessions), 1);

    // --- Common config ---
    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
        active: { color: '#22C55E', bg: 'rgba(34,197,94,0.15)', label: '활동중' },
        inactive: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: '비활성' },
        on_leave: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: '휴직' },
    };

    const specialtyColors: Record<string, string> = {
        'Olympic Lifting': '#3B82F6',
        'Gymnastics': '#8B5CF6',
        'Endurance': '#22C55E',
        'Strength': '#EF4444',
        'CrossFit': '#F59E0B',
        'Yoga': '#EC4899',
        'Pilates': '#06B6D4',
    };

    const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
        { key: 'management', label: '코치 관리', icon: <IconCoach size={14} /> },
        { key: 'performance', label: '성과 분석', icon: <IconBarChart size={14} /> },
    ];

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Operations"
                title="Coaches"
                subtitle={activeTab === 'management' ? 'Management' : 'Performance'}
                actions={
                    activeTab === 'management' ? (
                        <button onClick={() => openModal()} className="admin-action-btn">+ 신규 코치</button>
                    ) : undefined
                }
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {/* Tab Bar */}
                <div className="flex gap-1 mb-8 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {tabs.map((tab) => (
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
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ========== Management Tab ========== */}
                {activeTab === 'management' && (
                    <>
                        {/* Filters */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="flex gap-2">
                                {(['all', 'active', 'inactive', 'on_leave'] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilterStatus(f)}
                                        className={`admin-filter-btn ${filterStatus === f ? 'active' : ''}`}
                                    >
                                        {f === 'all' ? '전체' : statusConfig[f]?.label || f}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="이름, 이메일, 전문 분야로 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="admin-search-input"
                                />
                            </div>
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{filteredCoaches.length}명</span>
                        </div>

                        {/* Coach Grid */}
                        {
                            loading ? (
                                <div className="flex justify-center py-64">
                                    <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                                </div>
                            ) : filteredCoaches.length === 0 ? (
                                <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                                    <span className="text-4xl mb-4"><IconCoach size={40} /></span>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">No coaches found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredCoaches.map((coach) => {
                                        const sc = statusConfig[coach.status] || statusConfig.active;
                                        const imgSrc = coach.profile_image_url || DEFAULT_COACH_IMAGE;
                                        return (
                                            <div key={coach.id} className="glass-card p-5 rounded-2xl hover:border-white/10 transition-all flex flex-col">
                                                {/* Top area: Info + Profile Image */}
                                                <div className="flex gap-4 mb-4">
                                                    {/* Left: Coach Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg font-black text-white truncate mb-1">{coach.name}</h3>
                                                        <p className="text-[10px] text-[var(--text-muted)] truncate mb-3">{coach.email || 'No email'}</p>

                                                        {/* Status & Phone */}
                                                        <div className="flex items-center gap-2 flex-wrap mb-3">
                                                            <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase" style={{ background: sc.bg, color: sc.color }}>
                                                                {sc.label}
                                                            </span>
                                                            {coach.phone && (
                                                                <span className="text-[9px] text-[var(--text-muted)] inline-flex items-center gap-1"><IconPhone size={10} /> {coach.phone}</span>
                                                            )}
                                                        </div>

                                                        {/* Specialties */}
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {coach.specialties?.map((s, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider"
                                                                    style={{
                                                                        background: `${specialtyColors[s] || '#6B7280'}15`,
                                                                        color: specialtyColors[s] || '#6B7280',
                                                                        border: `1px solid ${specialtyColors[s] || '#6B7280'}30`,
                                                                    }}
                                                                >
                                                                    {s}
                                                                </span>
                                                            ))}
                                                            {(!coach.specialties || coach.specialties.length === 0) && (
                                                                <span className="text-[8px] text-[var(--text-muted)] italic">전문 분야 미설정</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right: Rounded-square Profile Image */}
                                                    <div
                                                        className="shrink-0 overflow-hidden"
                                                        style={{
                                                            width: '88px',
                                                            height: '88px',
                                                            borderRadius: '16px',
                                                            border: '2px solid rgba(255,255,255,0.08)',
                                                            background: '#0d0d0d',
                                                        }}
                                                    >
                                                        <img
                                                            src={imgSrc}
                                                            alt={coach.name}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                                display: 'block',
                                                            }}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = DEFAULT_COACH_IMAGE;
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Bio */}
                                                {coach.bio && (
                                                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2 mb-3">{coach.bio}</p>
                                                )}

                                                {/* Spacer */}
                                                <div className="flex-1" />

                                                {/* Actions */}
                                                <div
                                                    className="flex gap-2 pt-4 mt-2"
                                                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                                                >
                                                    <button
                                                        onClick={() => openModal(coach)}
                                                        className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all"
                                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                                                    >
                                                        <span className="inline-flex items-center gap-1"><IconEdit size={12} /> 수정</span>
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCoach(coach.id)}
                                                        className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all"
                                                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                                    >
                                                        <span className="inline-flex items-center gap-1"><IconTrash size={12} /> 삭제</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        }
                    </>
                )}

                {/* ========== Performance Tab ========== */}
                {activeTab === 'performance' && (
                    <>
                        {/* Sort Buttons */}
                        <div className="flex gap-2 mb-8">
                            {(['rating', 'sessions', 'members'] as const).map((s) => (
                                <button key={s} onClick={() => setSortBy(s)} className={`admin-filter-btn ${sortBy === s ? 'active' : ''}`}>
                                    {s === 'rating' ? '평점순' : s === 'sessions' ? '수업순' : '회원순'}
                                </button>
                            ))}
                        </div>
                        {perfLoading ? (
                            <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
                        ) : (
                            <div className="space-y-10">
                                {/* KPI */}
                                <div className="grid grid-cols-12 gap-6">
                                    <div className="col-span-3 kpi-card">
                                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Active Coaches</h4>
                                        <p className="text-4xl font-black text-white mt-4">{perfCoaches.length}</p>
                                    </div>
                                    <div className="col-span-3 kpi-card">
                                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Avg Rating</h4>
                                        <p className="text-4xl font-black text-yellow-400 mt-4">{overallAvgRating} ★</p>
                                    </div>
                                    <div className="col-span-3 kpi-card">
                                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Sessions</h4>
                                        <p className="text-4xl font-black text-white mt-4">{totalSessions}</p>
                                    </div>
                                    <div className="col-span-3 kpi-card">
                                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Avg Retention</h4>
                                        <p className="text-4xl font-black text-green-400 mt-4">{avgRetention}%</p>
                                    </div>
                                </div>

                                {/* Coach Rankings */}
                                <div className="glass-card p-8">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 inline-flex items-center gap-2"><IconTrophy size={20} /> Coach Rankings</h3>
                                    <div className="space-y-4">
                                        {sortedPerfCoaches.map((coach, rank) => (
                                            <div key={coach.id} className="grid grid-cols-12 gap-4 items-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                                {/* Rank */}
                                                <div className="col-span-1 text-center">
                                                    <span className={`text-xl font-black ${rank === 0 ? 'text-yellow-400' : rank === 1 ? 'text-gray-300' : rank === 2 ? 'text-amber-600' : 'text-white/20'}`}>
                                                        {rank < 3 ? <span className={`font-black text-sm ${rank === 0 ? 'text-yellow-400' : rank === 1 ? 'text-gray-300' : 'text-amber-600'}`}>#{rank + 1}</span> : `#${rank + 1}`}
                                                    </span>
                                                </div>

                                                {/* Coach Info */}
                                                <div className="col-span-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,107,0,0.1))', color: 'var(--primary)' }}>
                                                            {coach.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black text-white group-hover:text-[var(--primary)] transition-colors">{coach.name}</h4>
                                                            <p className="text-[9px] text-[var(--text-muted)]">{coach.specialty}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Rating */}
                                                <div className="col-span-2 text-center">
                                                    <p className="text-lg font-black text-yellow-400">{coach.avgRating}</p>
                                                    <p className="text-[8px] text-[var(--text-muted)] uppercase">Rating</p>
                                                </div>

                                                {/* Sessions Bar */}
                                                <div className="col-span-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${(coach.totalSessions / maxSessions) * 100}%`, background: 'var(--primary)' }} />
                                                        </div>
                                                        <span className="text-xs font-black text-white w-10 text-right">{coach.totalSessions}</span>
                                                    </div>
                                                    <p className="text-[8px] text-[var(--text-muted)] uppercase mt-1">Sessions</p>
                                                </div>

                                                {/* Members */}
                                                <div className="col-span-1 text-center">
                                                    <p className="text-sm font-black text-white">{coach.totalMembers}</p>
                                                    <p className="text-[8px] text-[var(--text-muted)] uppercase">Members</p>
                                                </div>

                                                {/* Retention */}
                                                <div className="col-span-2 text-center">
                                                    <p className={`text-sm font-black ${coach.retention >= 90 ? 'text-green-400' : coach.retention >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>{coach.retention}%</p>
                                                    <p className="text-[8px] text-[var(--text-muted)] uppercase">Retention</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Performance Insight Cards */}
                                <div className="grid grid-cols-12 gap-8">
                                    <div className="col-span-6 glass-card p-8">
                                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6 inline-flex items-center gap-2"><IconTarget size={18} /> Top Performer</h3>
                                        {sortedPerfCoaches[0] && (
                                            <div className="text-center space-y-4">
                                                <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-black" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.4), rgba(255,107,0,0.1))', color: 'var(--primary)' }}>
                                                    {sortedPerfCoaches[0].name.charAt(0)}
                                                </div>
                                                <h4 className="text-xl font-black text-white">{sortedPerfCoaches[0].name}</h4>
                                                <p className="text-xs text-[var(--text-muted)]">{sortedPerfCoaches[0].specialty}</p>
                                                <div className="flex justify-center gap-8 mt-4">
                                                    <div><p className="text-2xl font-black text-yellow-400">{sortedPerfCoaches[0].avgRating}</p><p className="text-[8px] text-[var(--text-muted)] uppercase">Rating</p></div>
                                                    <div><p className="text-2xl font-black text-[var(--primary)]">{sortedPerfCoaches[0].totalSessions}</p><p className="text-[8px] text-[var(--text-muted)] uppercase">Sessions</p></div>
                                                    <div><p className="text-2xl font-black text-green-400">{sortedPerfCoaches[0].retention}%</p><p className="text-[8px] text-[var(--text-muted)] uppercase">Retention</p></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-6 glass-card p-8">
                                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6 inline-flex items-center gap-2"><IconBarChart size={18} /> Specialty Distribution</h3>
                                        <div className="space-y-4">
                                            {[...new Set(perfCoaches.map(c => c.specialty))].map((spec) => {
                                                const count = perfCoaches.filter(c => c.specialty === spec).length;
                                                const pct = ((count / perfCoaches.length) * 100).toFixed(0);
                                                return (
                                                    <div key={spec} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                                                        <span className="text-sm font-bold text-white">{spec}</span>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
                                                            </div>
                                                            <span className="text-xs font-black text-[var(--primary)]">{count}명</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Modal – positioned in content area, fixed size */}
                <AdminModal show={showModal} onClose={() => setShowModal(false)} title={editingCoach ? '코치 수정' : '새 코치 등록'}>
                    {/* Profile Image Upload */}
                    <div className="flex items-center gap-5 mb-6">
                        <div
                            className="shrink-0 overflow-hidden cursor-pointer flex items-center justify-center"
                            style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '16px',
                                background: imagePreview
                                    ? 'transparent'
                                    : 'linear-gradient(135deg, rgba(255,107,0,0.2) 0%, rgba(255,107,0,0.05) 100%)',
                                border: '2px dashed rgba(255,107,0,0.4)',
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt="프로필 미리보기"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                            ) : (
                                <IconCamera size={28} />
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                style={{ background: 'rgba(255,107,0,0.15)', border: '1px solid rgba(255,107,0,0.3)', color: 'var(--primary)' }}
                            >
                                이미지 선택
                            </button>
                            {imagePreview && (
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
                                >
                                    이미지 삭제
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleImageFileChange}
                                style={{ display: 'none' }}
                            />
                            <span className="text-[9px] text-[var(--text-muted)]">JPG, PNG, WebP (300×300px 자동 리사이즈)</span>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">이름 *</label>
                                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="코치 이름" className="bcl-input w-full rounded-xl" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">이메일</label>
                                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="coach@bcl.com" className="bcl-input w-full rounded-xl" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">전화번호</label>
                                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-1234-5678" className="bcl-input w-full rounded-xl" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">상태</label>
                                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="bcl-input w-full rounded-xl" style={{ colorScheme: 'dark' }}>
                                    <option value="active">활동중</option>
                                    <option value="inactive">비활성</option>
                                    <option value="on_leave">휴직</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">전문 분야 (쉴표 구분)</label>
                            <input value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Olympic Lifting, Gymnastics, Endurance" className="bcl-input w-full rounded-xl" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">소개</label>
                            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} placeholder="코치 소개를 입력하세요" className="bcl-input w-full rounded-xl resize-none" />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }} disabled={uploading}>취소</button>
                        <button
                            onClick={saveCoach}
                            className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            style={{ background: uploading ? 'rgba(255,107,0,0.5)' : 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <>
                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                                    업로드 중...
                                </>
                            ) : '저장'}
                        </button>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
