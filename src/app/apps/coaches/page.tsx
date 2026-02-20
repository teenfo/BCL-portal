'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';

interface Coach {
    id: string;
    name: string;
    email: string;
    specialty: string | null;
    status: string | null;
    joined_date: string | null;
}

export default function CoachesPage() {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

    useEffect(() => { loadCoaches(); }, []);

    async function loadCoaches() {

        // coaches 테이블에서 직접 조회 (active 상태인 코치만)
        const { data, error }: any = await query('coaches')
            .select('*')
            .eq('status', 'active')
            .order('name', { ascending: true });

        if (data && !error) {
            setCoaches(data);
        }
        setLoading(false);
    }

    // specialty 문자열을 배열로 변환 (쉼표 구분)
    function getSpecialties(coach: Coach): string[] {
        if (!coach.specialty) return ['CrossFit'];
        return coach.specialty.split(',').map(s => s.trim()).filter(Boolean);
    }

    // 코치 경력 년수 계산
    function getExperienceYears(coach: Coach): number {
        if (!coach.joined_date) return 1;
        const joined = new Date(coach.joined_date);
        const now = new Date();
        return Math.max(1, Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24 * 365)));
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
                                    <span>💼</span>
                                    <span>경력 {getExperienceYears(coach)}년</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    {getSpecialties(coach).slice(0, 2).map((s, i) => (
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
                                <span>💼 경력 {getExperienceYears(selectedCoach)}년</span>
                                <span>·</span>
                                <span>📧 {selectedCoach.email}</span>
                            </div>
                        </div>

                        {/* Specialties */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div className="app-section-label">전문 분야</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {getSpecialties(selectedCoach).map((s, i) => (
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

                        {/* Coach Info */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div className="app-section-label">코치 정보</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                {selectedCoach.joined_date && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--app-text-secondary)', fontSize: '0.8125rem' }}>
                                        <span style={{ color: 'var(--app-success)' }}>✓</span>
                                        합류일: {new Date(selectedCoach.joined_date).toLocaleDateString('ko-KR')}
                                    </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--app-text-secondary)', fontSize: '0.8125rem' }}>
                                    <span style={{ color: 'var(--app-success)' }}>✓</span>
                                    이메일: {selectedCoach.email}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--app-text-secondary)', fontSize: '0.8125rem' }}>
                                    <span style={{ color: 'var(--app-success)' }}>✓</span>
                                    상태: {selectedCoach.status === 'active' ? '활동중' : '비활동'}
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setSelectedCoach(null)} className="app-btn-outline" style={{ width: '100%' }}>
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
