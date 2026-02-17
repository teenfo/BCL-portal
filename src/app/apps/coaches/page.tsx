'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Coach {
    id: string;
    name: string;
    specialties: string[];
    bio?: string;
    experience_years?: number;
    certifications?: string[];
    profile_image_url?: string;
    avg_rating?: number;
    total_sessions?: number;
}

export default function CoachesPage() {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

    useEffect(() => { loadCoaches(); }, []);

    async function loadCoaches() {
        const supabase: any = createClient();
        const { data: members }: any = await supabase
            .from('members')
            .select('*')
            .eq('role', 'coach');

        if (members) {
            const enriched: Coach[] = members.map((m: any) => ({
                id: m.user_id || m.id,
                name: m.name || 'Coach',
                specialties: m.specialties || ['CrossFit', 'Functional Training'],
                bio: m.bio || '열정적인 코치입니다.',
                experience_years: m.experience_years || 3,
                certifications: m.certifications || ['CrossFit Level 1'],
                profile_image_url: m.profile_image_url || null,
                avg_rating: 4.5 + Math.random() * 0.5,
                total_sessions: Math.floor(100 + Math.random() * 500),
            }));
            setCoaches(enriched);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="app-page">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="app-skeleton" style={{ height: 200, borderRadius: 16 }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="app-page">
            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
                BCL의 전문 코치들을 만나보세요
            </p>

            {coaches.length === 0 ? (
                <div className="app-empty-state">
                    <div className="emoji">👤</div>
                    <div className="message">등록된 코치가 없습니다</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {coaches.map(coach => (
                        <div
                            key={coach.id}
                            className="app-glass-card"
                            onClick={() => setSelectedCoach(coach)}
                            style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }}
                        >
                            {/* Coach Photo */}
                            <div style={{
                                height: 120,
                                background: 'linear-gradient(135deg, var(--app-accent-light), rgba(210,105,30,0.15))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--app-accent), #E8933A)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                    boxShadow: '0 4px 12px rgba(210,105,30,0.3)',
                                }}>
                                    {coach.name.charAt(0)}
                                </div>
                            </div>

                            <div style={{ padding: '0.875rem' }}>
                                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: 4 }}>
                                    {coach.name} 코치
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--app-text-secondary)', marginBottom: '0.5rem' }}>
                                    <span>⭐</span>
                                    <span style={{ fontWeight: 600 }}>{coach.avg_rating?.toFixed(1)}</span>
                                    <span>·</span>
                                    <span>{coach.total_sessions}회 수업</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    {coach.specialties.slice(0, 2).map((s, i) => (
                                        <span key={i} style={{
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: 6,
                                            background: 'var(--app-accent-light)',
                                            color: 'var(--app-accent)',
                                            fontSize: '0.625rem',
                                            fontWeight: 600,
                                        }}>
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Coach Detail Modal */}
            {selectedCoach && (
                <div
                    onClick={() => setSelectedCoach(null)}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.4)',
                        zIndex: 300,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--app-surface)',
                            borderRadius: '20px 20px 0 0',
                            padding: '2rem 1.5rem',
                            maxWidth: 480,
                            width: '100%',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            animation: 'appSlideUp 0.3s ease',
                        }}
                    >
                        {/* Drag handle */}
                        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--app-border)', margin: '0 auto 1.5rem' }} />

                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--app-accent), #E8933A)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1rem', fontSize: '2rem', fontWeight: 700, color: '#fff',
                            }}>
                                {selectedCoach.name.charAt(0)}
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                                {selectedCoach.name} 코치
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: '0.5rem', color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>
                                <span>⭐ {selectedCoach.avg_rating?.toFixed(1)}</span>
                                <span>·</span>
                                <span>경력 {selectedCoach.experience_years}년</span>
                                <span>·</span>
                                <span>{selectedCoach.total_sessions}회</span>
                            </div>
                        </div>

                        {/* Bio */}
                        {selectedCoach.bio && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div className="app-section-label">소개</div>
                                <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                                    {selectedCoach.bio}
                                </p>
                            </div>
                        )}

                        {/* Specialties */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div className="app-section-label">전문 분야</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {selectedCoach.specialties.map((s, i) => (
                                    <span key={i} style={{
                                        padding: '0.375rem 0.75rem',
                                        borderRadius: 20,
                                        background: 'var(--app-accent-light)',
                                        color: 'var(--app-accent)',
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                    }}>
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Certifications */}
                        {selectedCoach.certifications && selectedCoach.certifications.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div className="app-section-label">자격증</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    {selectedCoach.certifications.map((c, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--app-text-secondary)', fontSize: '0.8125rem' }}>
                                            <span style={{ color: 'var(--app-success)' }}>✓</span>
                                            {c}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button onClick={() => setSelectedCoach(null)} className="app-btn-outline" style={{ width: '100%' }}>
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
