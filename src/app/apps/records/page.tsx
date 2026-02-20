'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import { useToast } from '@/components/ui/Toast';

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
    const toast = useToast();
    const [wodRecords, setWodRecords] = useState<WodRecord[]>([]);
    const [prRecords, setPrRecords] = useState<PRRecord[]>([]);
    const [monthlyStats, setMonthlyStats] = useState<{ month: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    const [wodType, setWodType] = useState<WodType>('fortime');
    const [resultValue, setResultValue] = useState('');
    const [wodNotes, setWodNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const [prExercise, setPrExercise] = useState('');
    const [prValue, setPrValue] = useState('');
    const [prUnit, setPrUnit] = useState('kg');
    const [showPrForm, setShowPrForm] = useState(false);

    const loadData = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // auth user.id → members.id 변환
        const { data: memberRow }: any = await query('members')
            .select('id').eq('user_id', user.id).single();
        const memberId = memberRow?.id;
        if (!memberId) { setLoading(false); return; }

        const { data: feedbackData }: any = await query('session_feedback')
            
            .select('*, sessions(title)')
            .eq('member_id', memberId)
            .not('comment', 'is', null)
            .order('created_at', { ascending: false })
            .limit(30);

        if (feedbackData) {
            setWodRecords(feedbackData.map((f: Record<string, unknown>) => {
                const s = f.sessions as Record<string, unknown> | null;
                return {
                    id: f.id as string,
                    session_title: (s?.title as string) || 'WOD',
                    wod_type: (f.wod_type as WodType) || 'fortime',
                    result_value: (f.comment as string) || '',
                    notes: '',
                    created_at: f.created_at as string,
                };
            }));
        }

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const { data: checkinData }: any = await query('checkins')
            
            .select('time')
            .eq('member_id', memberId)
            .gte('time', sixMonthsAgo.toISOString())
            .order('time', { ascending: true });

        if (checkinData) {
            const monthMap: Record<string, number> = {};
            checkinData.forEach((c: Record<string, unknown>) => {
                const d = new Date(c.time as string);
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

        // auth user.id → members.id 변환
        const { data: memberRow }: any = await query('members')
            .select('id').eq('user_id', user.id).single();
        const memberId = memberRow?.id;
        if (!memberId) { setSaving(false); toast.error('회원 정보를 찾을 수 없습니다.'); return; }

        const { error }: any = await query('session_feedback').insert({
            member_id: memberId,
            rating: 5,
            comment: `[WOD:${wodType}] ${resultValue}${wodNotes ? ' | ' + wodNotes : ''}`,
        });

        if (error) {
            toast.error('기록 저장에 실패했습니다.');
        } else {
            toast.success('💪 운동 기록이 저장되었습니다!');
            setResultValue(''); setWodNotes('');
            loadData();
        }
        setSaving(false);
    }

    async function savePR() {
        if (!prExercise.trim() || !prValue.trim() || saving) return;
        setSaving(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        // auth user.id → members.id 변환
        const { data: memberRow }: any = await query('members')
            .select('id').eq('user_id', user.id).single();
        const memberId = memberRow?.id;
        if (!memberId) { setSaving(false); toast.error('회원 정보를 찾을 수 없습니다.'); return; }

        const { error }: any = await query('session_feedback').insert({
            member_id: memberId,
            rating: 5,
            comment: `[PR] ${prExercise}: ${prValue}${prUnit}`,
        });

        if (error) {
            toast.error('PR 저장에 실패했습니다.');
        } else {
            toast.success('🏆 새로운 PR이 기록되었습니다!');
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
            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem' }}>나의 성장을 기록하고 추적하세요</p>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {([{ k: 'wod' as TabType, l: 'WOD 기록' }, { k: 'pr' as TabType, l: '개인 PR' }, { k: 'stats' as TabType, l: '통계' }] as const).map(t => (
                    <button key={t.k} className={`app-filter-chip ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)} style={{ flex: 1 }}>{t.l}</button>
                ))}
            </div>

            {tab === 'wod' && (
                <div>
                    <div className="app-glass-card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ color: 'var(--app-text-primary)', fontWeight: 600, marginBottom: '1rem' }}>오늘의 기록 입력</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                            {(Object.keys(wodTypeLabels) as WodType[]).map(t => (
                                <button key={t} onClick={() => setWodType(t)}
                                    style={{
                                        padding: '0.5rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, textAlign: 'center',
                                        background: wodType === t ? 'var(--app-accent)' : 'var(--app-surface)', color: wodType === t ? '#fff' : 'var(--app-text-secondary)',
                                        border: wodType === t ? '1px solid var(--app-accent)' : '1px solid var(--app-border)', cursor: 'pointer', transition: 'all 0.2s'
                                    }}>
                                    <div style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{wodTypeLabels[t].icon}</div>{wodTypeLabels[t].label}
                                </button>
                            ))}
                        </div>
                        <input type="text" value={resultValue} onChange={e => setResultValue(e.target.value)}
                            placeholder={wodTypeLabels[wodType].placeholder}
                            aria-label="운동 결과"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '1rem', outline: 'none', fontWeight: 700, marginBottom: '0.5rem' }} />
                        <input type="text" value={wodNotes} onChange={e => setWodNotes(e.target.value)}
                            placeholder="메모 (선택)"
                            aria-label="메모"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '0.875rem', outline: 'none', marginBottom: '1rem' }} />
                        <button className="app-btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={!resultValue.trim() || saving} onClick={saveWod}>
                            {saving ? '저장 중...' : '기록 저장 💪'}
                        </button>
                    </div>

                    <h3 style={{ color: 'var(--app-text-primary)', fontWeight: 600, marginBottom: '0.75rem' }}>최근 기록</h3>
                    {wodRecords.length === 0 ? (
                        <div className="app-empty-state"><div className="emoji">📋</div><div className="message">아직 기록이 없습니다</div></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {wodRecords.map(r => (
                                <div key={r.id} className="app-glass-card-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '1.25rem' }}>{wodTypeLabels[r.wod_type]?.icon || '📝'}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: 'var(--app-text-primary)', fontWeight: 600, fontSize: '0.9375rem' }}>{r.result_value}</div>
                                        <div style={{ color: 'var(--app-text-secondary)', fontSize: '0.75rem' }}>{r.session_title} · {new Date(r.created_at).toLocaleDateString('ko-KR')}</div>
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
                            <h3 style={{ color: 'var(--app-text-primary)', fontWeight: 600, marginBottom: '1rem' }}>🏆 새 PR 기록</h3>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginBottom: '0.375rem' }}>종목</label>
                                <select value={prExercise} onChange={e => setPrExercise(e.target.value)}
                                    aria-label="종목 선택"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }}>
                                    <option value="">종목 선택</option>
                                    {commonExercises.map(e => (<option key={e} value={e}>{e}</option>))}
                                    <option value="기타">기타 (직접 입력)</option>
                                </select>
                                {prExercise === '기타' && (
                                    <input type="text" placeholder="종목명 입력" onChange={e => setPrExercise(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 8, fontSize: '0.875rem', outline: 'none', marginTop: '0.5rem' }} />
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <input type="number" value={prValue} onChange={e => setPrValue(e.target.value)} placeholder="기록"
                                    aria-label="기록 수치"
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: 8, fontSize: '1rem', fontWeight: 700, outline: 'none' }} />
                                <select value={prUnit} onChange={e => setPrUnit(e.target.value)}
                                    aria-label="단위"
                                    style={{ width: 80, padding: '0.75rem', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }}>
                                    <option value="kg">kg</option><option value="lb">lb</option><option value="reps">reps</option><option value="sec">sec</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="app-btn-secondary" style={{ flex: 1 }} onClick={() => setShowPrForm(false)}>취소</button>
                                <button className="app-btn-primary" style={{ flex: 1 }} disabled={!prExercise || !prValue || saving} onClick={savePR}>{saving ? '저장 중...' : 'PR 저장 🏆'}</button>
                            </div>
                        </div>
                    )}

                    <h3 style={{ color: 'var(--app-text-primary)', fontWeight: 600, marginBottom: '0.75rem' }}>나의 PR 기록</h3>
                    {wodRecords.filter(r => r.notes?.includes('PR')).length === 0 ? (
                        <div className="app-empty-state"><div className="emoji">🏆</div><div className="message">아직 PR 기록이 없습니다</div></div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {wodRecords.filter(r => r.notes?.includes('PR')).map(r => (
                                <div key={r.id} className="app-glass-card" style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏆</div>
                                    <div style={{ color: 'var(--app-accent)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{r.result_value.split(':')[0]}</div>
                                    <div style={{ color: 'var(--app-text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>{r.result_value.split(':')[1]?.trim() || r.result_value}</div>
                                    <div style={{ color: 'var(--app-text-muted)', fontSize: '0.6875rem', marginTop: '0.25rem' }}>{new Date(r.created_at).toLocaleDateString('ko-KR')}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'stats' && (
                <div>
                    <div className="app-glass-card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ color: 'var(--app-text-primary)', fontWeight: 600, marginBottom: '1rem' }}>월간 출석 현황</h3>
                        {monthlyStats.length === 0 ? (
                            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>데이터가 없습니다</p>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 120 }}>
                                {monthlyStats.map(s => {
                                    const maxCount = Math.max(...monthlyStats.map(x => x.count), 1);
                                    const height = (s.count / maxCount) * 100;
                                    return (
                                        <div key={s.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                            <span style={{ fontSize: '0.6875rem', color: 'var(--app-text-primary)', fontWeight: 600 }}>{s.count}</span>
                                            <div style={{ width: '100%', height: `${height}%`, minHeight: 4, borderRadius: 4, background: 'linear-gradient(to top, var(--app-accent), #E8933A)', transition: 'height 0.5s ease' }} />
                                            <span style={{ fontSize: '0.625rem', color: 'var(--app-text-muted)' }}>{s.month.split('-')[1]}월</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

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
