'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type TabType = 'wod' | 'pr' | 'stats';
type WodType = 'fortime' | 'amrap' | 'weight' | 'custom';

interface WodRecord {
    id: string;
    session_id?: string;
    session_title?: string;
    wod_type: WodType;
    result_value: string;
    notes?: string;
    created_at: string;
}

interface PRRecord {
    id: string;
    exercise: string;
    value: string;
    unit: string;
    achieved_at: string;
    previous_value?: string;
}

export default function UserRecordsPage() {
    const [tab, setTab] = useState<TabType>('wod');
    const [wodRecords, setWodRecords] = useState<WodRecord[]>([]);
    const [prRecords, setPrRecords] = useState<PRRecord[]>([]);
    const [monthlyStats, setMonthlyStats] = useState<{ month: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [wodType, setWodType] = useState<WodType>('fortime');
    const [resultValue, setResultValue] = useState('');
    const [wodNotes, setWodNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // PR Form
    const [prExercise, setPrExercise] = useState('');
    const [prValue, setPrValue] = useState('');
    const [prUnit, setPrUnit] = useState('kg');
    const [showPrForm, setShowPrForm] = useState(false);

    const loadData = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Load WOD records (using session_feedback or a custom table approach)
        const { data: feedbackData } = await supabase
            .from('session_feedback')
            .select('*, sessions(title)')
            .eq('member_id', user.id)
            .not('wod_result', 'is', null)
            .order('created_at', { ascending: false })
            .limit(30);

        if (feedbackData) {
            setWodRecords(feedbackData.map((f: Record<string, unknown>) => {
                const s = f.sessions as Record<string, unknown> | null;
                return {
                    id: f.id as string,
                    session_title: (s?.title as string) || 'WOD',
                    wod_type: (f.wod_type as WodType) || 'fortime',
                    result_value: (f.wod_result as string) || '',
                    notes: f.comments as string,
                    created_at: f.created_at as string,
                };
            }));
        }

        // Monthly attendance stats from checkins
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const { data: checkinData } = await supabase
            .from('checkins')
            .select('checkin_time')
            .eq('member_id', user.id)
            .gte('checkin_time', sixMonthsAgo.toISOString())
            .order('checkin_time', { ascending: true });

        if (checkinData) {
            const monthMap: Record<string, number> = {};
            checkinData.forEach((c: Record<string, unknown>) => {
                const d = new Date(c.checkin_time as string);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthMap[key] = (monthMap[key] || 0) + 1;
            });
            setMonthlyStats(Object.entries(monthMap).map(([month, count]) => ({ month, count })));
        }

        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    async function saveWod() {
        if (!resultValue.trim() || saving) return;
        setSaving(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        // Store WOD record in session_feedback with wod_result
        const { error } = await supabase.from('session_feedback').insert({
            member_id: user.id,
            rating: 5,
            wod_type: wodType,
            wod_result: resultValue,
            comments: wodNotes || null,
        });

        if (error) {
            alert('기록 저장에 실패했습니다.');
        } else {
            alert('💪 운동 기록이 저장되었습니다!');
            setResultValue(''); setWodNotes('');
            loadData();
        }
        setSaving(false);
    }

    async function savePR() {
        if (!prExercise.trim() || !prValue.trim() || saving) return;
        setSaving(true);
        // PR would ideally be in its own table, but we store as custom feedback
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        const { error } = await supabase.from('session_feedback').insert({
            member_id: user.id,
            rating: 5,
            wod_type: 'weight',
            wod_result: `${prExercise}: ${prValue}${prUnit}`,
            comments: `PR - ${prExercise}`,
        });

        if (error) {
            alert('PR 저장에 실패했습니다.');
        } else {
            alert('🏆 새로운 PR이 기록되었습니다!');
            setPrExercise(''); setPrValue(''); setShowPrForm(false);
            loadData();
        }
        setSaving(false);
    }

    const wodTypeLabels: Record<WodType, { label: string; placeholder: string; icon: string }> = {
        fortime: { label: 'For Time', placeholder: '예: 12:34', icon: '⏱️' },
        amrap: { label: 'AMRAP', placeholder: '예: 8 라운드 + 3 reps', icon: '🔄' },
        weight: { label: 'Weight', placeholder: '예: 100kg', icon: '🏋️' },
        custom: { label: 'Custom', placeholder: '자유 입력', icon: '📝' },
    };

    const commonExercises = ['Back Squat', 'Deadlift', 'Bench Press', 'Clean', 'Snatch', 'Front Squat', 'Overhead Press', 'Clean & Jerk', 'Power Clean', 'Push Jerk'];

    if (loading) return <div className="app-page"><div className="app-skeleton" style={{ height: 40, marginBottom: '1rem' }} /><div className="app-skeleton" style={{ height: 300 }} /></div>;

    return (
        <div className="app-page">
            <Link href="/apps/profile" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← 돌아가기</Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '1rem 0 0.25rem' }}>운동 기록</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem' }}>나의 성장을 기록하고 추적하세요</p>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {([{ k: 'wod' as TabType, l: 'WOD 기록' }, { k: 'pr' as TabType, l: '개인 PR' }, { k: 'stats' as TabType, l: '통계' }] as const).map(t => (
                    <button key={t.k} className={`app-filter-chip ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)} style={{ flex: 1 }}>{t.l}</button>
                ))}
            </div>

            {tab === 'wod' && (
                <div>
                    {/* WOD Input Form */}
                    <div className="app-glass-card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem' }}>오늘의 기록 입력</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                            {(Object.keys(wodTypeLabels) as WodType[]).map(t => (
                                <button key={t} onClick={() => setWodType(t)}
                                    style={{
                                        padding: '0.5rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, textAlign: 'center',
                                        background: wodType === t ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: wodType === t ? '#fff' : 'var(--text-secondary)',
                                        border: wodType === t ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.2s'
                                    }}>
                                    <div style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{wodTypeLabels[t].icon}</div>{wodTypeLabels[t].label}
                                </button>
                            ))}
                        </div>
                        <input type="text" value={resultValue} onChange={e => setResultValue(e.target.value)}
                            placeholder={wodTypeLabels[wodType].placeholder}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '1rem', outline: 'none', fontWeight: 700, marginBottom: '0.5rem' }} />
                        <input type="text" value={wodNotes} onChange={e => setWodNotes(e.target.value)}
                            placeholder="메모 (선택)"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.875rem', outline: 'none', marginBottom: '1rem' }} />
                        <button className="app-btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={!resultValue.trim() || saving} onClick={saveWod}>
                            {saving ? '저장 중...' : '기록 저장 💪'}
                        </button>
                    </div>

                    {/* WOD History */}
                    <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '0.75rem' }}>최근 기록</h3>
                    {wodRecords.length === 0 ? (
                        <div className="app-empty-state"><div className="emoji">📋</div><div className="message">아직 기록이 없습니다</div></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {wodRecords.map(r => (
                                <div key={r.id} className="app-glass-card-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '1.25rem' }}>{wodTypeLabels[r.wod_type]?.icon || '📝'}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9375rem' }}>{r.result_value}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{r.session_title} · {new Date(r.created_at).toLocaleDateString('ko-KR')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'pr' && (
                <div>
                    {!showPrForm ? (
                        <button className="app-btn-primary" style={{ width: '100%', marginBottom: '1.5rem', padding: '0.75rem' }} onClick={() => setShowPrForm(true)}>
                            + 새 PR 기록하기
                        </button>
                    ) : (
                        <div className="app-glass-card" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem' }}>🏆 새 PR 기록</h3>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>종목</label>
                                <select value={prExercise} onChange={e => setPrExercise(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.875rem', outline: 'none' }}>
                                    <option value="">종목 선택</option>
                                    {commonExercises.map(e => (<option key={e} value={e}>{e}</option>))}
                                    <option value="기타">기타 (직접 입력)</option>
                                </select>
                                {prExercise === '기타' && (
                                    <input type="text" placeholder="종목명 입력" onChange={e => setPrExercise(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.875rem', outline: 'none', marginTop: '0.5rem' }} />
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <input type="number" value={prValue} onChange={e => setPrValue(e.target.value)} placeholder="기록"
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '1rem', fontWeight: 700, outline: 'none' }} />
                                <select value={prUnit} onChange={e => setPrUnit(e.target.value)}
                                    style={{ width: 80, padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.875rem', outline: 'none' }}>
                                    <option value="kg">kg</option><option value="lb">lb</option><option value="reps">reps</option><option value="sec">sec</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="app-btn-secondary" style={{ flex: 1 }} onClick={() => setShowPrForm(false)}>취소</button>
                                <button className="app-btn-primary" style={{ flex: 1 }} disabled={!prExercise || !prValue || saving} onClick={savePR}>{saving ? '저장 중...' : 'PR 저장 🏆'}</button>
                            </div>
                        </div>
                    )}

                    {/* PR List */}
                    <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '0.75rem' }}>나의 PR 기록</h3>
                    {wodRecords.filter(r => r.notes?.includes('PR')).length === 0 ? (
                        <div className="app-empty-state"><div className="emoji">🏆</div><div className="message">아직 PR 기록이 없습니다</div></div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {wodRecords.filter(r => r.notes?.includes('PR')).map(r => (
                                <div key={r.id} className="app-glass-card" style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏆</div>
                                    <div style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{r.result_value.split(':')[0]}</div>
                                    <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800 }}>{r.result_value.split(':')[1]?.trim() || r.result_value}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginTop: '0.25rem' }}>{new Date(r.created_at).toLocaleDateString('ko-KR')}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'stats' && (
                <div>
                    {/* Monthly Chart */}
                    <div className="app-glass-card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem' }}>월간 출석 현황</h3>
                        {monthlyStats.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>데이터가 없습니다</p>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 120 }}>
                                {monthlyStats.map(s => {
                                    const maxCount = Math.max(...monthlyStats.map(x => x.count), 1);
                                    const height = (s.count / maxCount) * 100;
                                    return (
                                        <div key={s.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                            <span style={{ fontSize: '0.6875rem', color: '#fff', fontWeight: 600 }}>{s.count}</span>
                                            <div style={{ width: '100%', height: `${height}%`, minHeight: 4, borderRadius: 4, background: 'linear-gradient(to top, var(--primary), #FF8A3D)', transition: 'height 0.5s ease' }} />
                                            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{s.month.split('-')[1]}월</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Summary Stats */}
                    <div className="stats-row" style={{ marginBottom: '1rem' }}>
                        <div className="stat-item accent"><div className="value">{wodRecords.length}</div><div className="label">총 기록 수</div></div>
                        <div className="stat-item"><div className="value">{wodRecords.filter(r => r.notes?.includes('PR')).length}</div><div className="label">PR 달성</div></div>
                    </div>
                    <div className="stats-row">
                        <div className="stat-item"><div className="value">{monthlyStats.reduce((a, b) => a + b.count, 0)}</div><div className="label">6개월 총 출석</div></div>
                        <div className="stat-item accent"><div className="value">{monthlyStats.length > 0 ? Math.round(monthlyStats.reduce((a, b) => a + b.count, 0) / monthlyStats.length) : 0}</div><div className="label">월 평균 출석</div></div>
                    </div>
                </div>
            )}
        </div>
    );
}
