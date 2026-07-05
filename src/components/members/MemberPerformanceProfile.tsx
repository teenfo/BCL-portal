'use client';

import { useCallback, useEffect, useState } from 'react';

import { rpc } from '@/lib/supabase/query';
import {
    formatBenchmarkValue,
    type BenchmarkDefinition,
    type MemberPerformanceProfile as ProfileData,
} from '@/types/p2';

interface MemberPerformanceProfileProps {
    memberId: string;
    /** true면 벤치마크 기록 추가 폼 노출 (coach/admin 화면 전용) */
    allowRecord?: boolean;
}

const inputStyle: React.CSSProperties = {
    padding: '0.5rem', borderRadius: 8,
    background: 'var(--app-surface)', border: '1px solid var(--app-border)',
    color: 'var(--app-text-primary)', fontSize: '0.8125rem', outline: 'none',
};

/** 회원 퍼포먼스 프로필 — 벤치마크 베스트 + 최근 기록 + Race 이력 (P25) */
export default function MemberPerformanceProfile({ memberId, allowRecord }: MemberPerformanceProfileProps) {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    // 기록 추가 폼
    const [showForm, setShowForm] = useState(false);
    const [benchmarks, setBenchmarks] = useState<BenchmarkDefinition[]>([]);
    const [benchmarkId, setBenchmarkId] = useState('');
    const [valueInput, setValueInput] = useState('');
    const [minutesInput, setMinutesInput] = useState('');
    const [secondsInput, setSecondsInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<{ is_pr: boolean } | null>(null);

    const selectedBenchmark = benchmarks.find(b => b.id === benchmarkId) || null;

    const load = useCallback(async () => {
        try {
            const { data } = await rpc('fn_get_member_performance_profile', { p_member_id: memberId });
            setProfile(data?.success ? data.data : null);
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setProfile(null);
        }
        setLoading(false);
    }, [memberId]);

    useEffect(() => {
        setLoading(true);
        load();
    }, [load]);

    const openForm = async () => {
        setShowForm(true);
        setLastResult(null);
        if (benchmarks.length === 0) {
            const { data } = await rpc('fn_list_benchmark_definitions', {});
            if (data?.success && Array.isArray(data.data)) setBenchmarks(data.data);
        }
    };

    const handleRecord = async () => {
        if (!benchmarkId || !selectedBenchmark) {
            setFormError('벤치마크를 선택해주세요.');
            return;
        }
        let resultValue: number;
        if (selectedBenchmark.metric_type === 'time') {
            resultValue = (parseInt(minutesInput) || 0) * 60 + (parseFloat(secondsInput) || 0);
        } else {
            resultValue = parseFloat(valueInput) || 0;
        }
        if (resultValue <= 0) {
            setFormError('기록 값을 입력해주세요.');
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            const { data, error } = await rpc('fn_record_member_benchmark_result', {
                p_member_id: memberId,
                p_benchmark_id: benchmarkId,
                p_result_value: resultValue,
            });
            if (error || !data?.success) {
                setFormError(data?.error || error?.message || '기록 저장에 실패했습니다.');
            } else {
                setLastResult({ is_pr: !!data.data?.is_pr });
                setValueInput('');
                setMinutesInput('');
                setSecondsInput('');
                await load();
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error(e);
            setFormError('오류가 발생했습니다.');
        }
        setSaving(false);
    };

    if (loading) {
        return <div className="app-skeleton" style={{ height: 80, borderRadius: 'var(--app-radius-md)', marginTop: '1rem' }} />;
    }

    if (!profile) return null;

    const hasAny = profile.benchmark_bests.length > 0 || profile.race_records.length > 0;

    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                    퍼포먼스
                    {(profile.benchmark_pr_count + profile.race_pr_count) > 0 && (
                        <span style={{ marginLeft: 6, fontSize: '0.6875rem', color: '#F59E0B', fontWeight: 700 }}>
                            🏆 PR {profile.benchmark_pr_count + profile.race_pr_count}
                        </span>
                    )}
                </div>
                {allowRecord && !showForm && (
                    <button onClick={openForm} style={{
                        padding: '0.25rem 0.625rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontSize: '0.6875rem', fontWeight: 700,
                        background: 'var(--app-accent)', color: '#fff',
                    }}>
                        + 벤치마크 기록
                    </button>
                )}
            </div>

            {/* 기록 추가 폼 */}
            {allowRecord && showForm && (
                <div style={{
                    padding: '0.75rem', marginBottom: '0.75rem',
                    background: 'var(--app-surface)', border: '1px solid var(--app-border)',
                    borderRadius: 'var(--app-radius-md)',
                    display: 'flex', flexDirection: 'column', gap: '0.5rem',
                }}>
                    <select
                        value={benchmarkId}
                        onChange={e => { setBenchmarkId(e.target.value); setLastResult(null); }}
                        style={inputStyle}
                    >
                        <option value="">벤치마크 선택...</option>
                        {benchmarks.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.metric_type === 'time' ? '시간' : b.unit})</option>
                        ))}
                    </select>
                    {selectedBenchmark && (
                        selectedBenchmark.metric_type === 'time' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <input type="number" placeholder="분" min="0" value={minutesInput}
                                    onChange={e => setMinutesInput(e.target.value)}
                                    style={{ ...inputStyle, width: 64, textAlign: 'center' }} />
                                <span style={{ color: 'var(--app-text-primary)', fontWeight: 700 }}>:</span>
                                <input type="number" placeholder="초" min="0" max="59.9" step="0.1" value={secondsInput}
                                    onChange={e => setSecondsInput(e.target.value)}
                                    style={{ ...inputStyle, width: 72, textAlign: 'center' }} />
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <input type="number" placeholder="기록" min="0" step="0.5" value={valueInput}
                                    onChange={e => setValueInput(e.target.value)}
                                    style={{ ...inputStyle, width: 110, textAlign: 'center' }} />
                                <span style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)' }}>{selectedBenchmark.unit}</span>
                            </div>
                        )
                    )}
                    {formError && (
                        <div style={{ fontSize: '0.75rem', color: '#EF4444' }}>{formError}</div>
                    )}
                    {lastResult && (
                        <div style={{ fontSize: '0.75rem', color: lastResult.is_pr ? '#F59E0B' : '#22C55E', fontWeight: 700 }}>
                            {lastResult.is_pr ? '🏆 신기록(PR) 저장!' : '✅ 기록 저장 완료'}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowForm(false)} style={{
                            padding: '0.375rem 0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'var(--app-bg)', color: 'var(--app-text-secondary)', fontSize: '0.75rem', fontWeight: 600,
                        }}>
                            닫기
                        </button>
                        <button onClick={handleRecord} disabled={saving} style={{
                            padding: '0.375rem 0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'var(--app-accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                            opacity: saving ? 0.7 : 1,
                        }}>
                            {saving ? '저장 중...' : '기록 저장'}
                        </button>
                    </div>
                </div>
            )}

            {!hasAny ? (
                <div style={{
                    background: 'var(--app-surface)', padding: '1rem', borderRadius: 12,
                    border: '1px solid var(--app-border)', textAlign: 'center',
                }}>
                    <p style={{ color: 'var(--app-text-muted)', fontSize: '0.8125rem' }}>
                        아직 기록된 퍼포먼스가 없습니다.
                    </p>
                </div>
            ) : (
                <>
                    {/* 벤치마크 베스트 */}
                    {profile.benchmark_bests.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.75rem' }}>
                            {profile.benchmark_bests.map(b => (
                                <div key={b.benchmark_id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.5rem 0.75rem',
                                    background: 'var(--app-surface)', border: '1px solid var(--app-border)',
                                    borderRadius: 'var(--app-radius-md)',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>{b.name}</div>
                                        <div style={{ fontSize: '0.625rem', color: 'var(--app-text-muted)' }}>
                                            {b.attempt_count}회 시도 · 최근 {new Date(b.last_recorded_at).toLocaleDateString('ko-KR')}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--app-accent)' }}>
                                        {formatBenchmarkValue(Number(b.best_value), b.metric_type, b.unit)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Race 이력 */}
                    {profile.race_records.length > 0 && (
                        <div>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: 6 }}>
                                🏁 Race 이력 (최근 {profile.race_records.length}건)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                {profile.race_records.map(r => (
                                    <div key={r.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '0.5rem 0.75rem',
                                        background: 'rgba(255,106,0,0.04)', border: '1px solid rgba(255,106,0,0.15)',
                                        borderRadius: 'var(--app-radius-md)',
                                    }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--app-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {r.event_name}
                                            </div>
                                            <div style={{ fontSize: '0.625rem', color: 'var(--app-text-muted)' }}>
                                                {new Date(r.event_date).toLocaleDateString('ko-KR')}
                                                {r.finish_rank ? ` · ${r.finish_rank}위` : ''}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--app-text-primary)' }}>
                                                {r.result_time_sec
                                                    ? formatBenchmarkValue(Number(r.result_time_sec), 'time', 'sec')
                                                    : r.result_distance ? `${r.result_distance}m` : '-'}
                                            </div>
                                            {r.is_pr && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#F59E0B' }}>🏆 PR</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
