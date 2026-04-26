'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { rpc } from '@/lib/supabase/query';
import type {
    MemberAlertFlagRow,
    MemberAlertFlagType,
    MemberAlertSeverity,
    MemberContextPanel as MemberContextData,
    UpsertMemberAlertFlagPayload,
} from '@/types/p1a';

interface MemberContextPanelProps {
    memberId: string;
}

const FLAG_TYPE_LABEL: Record<MemberAlertFlagType, { label: string; emoji: string }> = {
    trial: { label: '체험', emoji: '🎟' },
    injury: { label: '부상', emoji: '🩹' },
    renewal_due: { label: '만기 예정', emoji: '⏳' },
    returning_after_absence: { label: '복귀', emoji: '🔄' },
    vip_attention: { label: 'VIP 주의', emoji: '⭐' },
};

const SEVERITY_STYLE: Record<MemberAlertSeverity, { color: string; bg: string; border: string }> = {
    info: { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)' },
    warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
    critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
};

export default function MemberContextPanel({ memberId }: MemberContextPanelProps) {
    const [data, setData] = useState<MemberContextData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFlagForm, setShowFlagForm] = useState(false);
    const [savingFlag, setSavingFlag] = useState(false);
    const [flagForm, setFlagForm] = useState<{
        flag_type: MemberAlertFlagType;
        severity: MemberAlertSeverity;
        ends_at: string;
        note: string;
    }>({ flag_type: 'trial', severity: 'info', ends_at: '', note: '' });

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: rsp, error: rpcErr } = await rpc('fn_get_member_context_panel', { p_member_id: memberId });
            if (rpcErr) throw new Error(rpcErr.message);
            if (rsp?.success && rsp.data) {
                setData(rsp.data as MemberContextData);
            } else {
                setError(rsp?.error || '회원 컨텍스트를 불러오지 못했습니다.');
            }
        } catch (e: any) {
            setError(e?.message || '회원 컨텍스트 로드 실패');
        }
        setLoading(false);
    }, [memberId]);

    useEffect(() => { void load(); }, [load]);

    const handleAddFlag = async () => {
        setSavingFlag(true);
        try {
            const payload: UpsertMemberAlertFlagPayload = {
                flag_type: flagForm.flag_type,
                severity: flagForm.severity,
                note: flagForm.note.trim() || null,
                ends_at: flagForm.ends_at ? new Date(flagForm.ends_at).toISOString() : null,
            };
            const { data: rsp, error: rpcErr } = await rpc('fn_upsert_member_alert_flag', {
                p_member_id: memberId,
                p_payload: payload,
            });
            if (rpcErr || !rsp?.success) {
                setError(rsp?.error || rpcErr?.message || '플래그 저장 실패');
            } else {
                setShowFlagForm(false);
                setFlagForm({ flag_type: 'trial', severity: 'info', ends_at: '', note: '' });
                await load();
            }
        } catch (e: any) {
            setError(e?.message || '플래그 저장 중 오류');
        }
        setSavingFlag(false);
    };

    const handleResolveFlag = async (flag: MemberAlertFlagRow) => {
        if (!confirm(`'${FLAG_TYPE_LABEL[flag.flag_type].label}' 플래그를 해소합니다. 계속할까요?`)) return;
        try {
            const { data: rsp, error: rpcErr } = await rpc('fn_upsert_member_alert_flag', {
                p_member_id: memberId,
                p_payload: { id: flag.id, resolved: true },
            });
            if (rpcErr || !rsp?.success) {
                setError(rsp?.error || rpcErr?.message || '플래그 해소 실패');
            } else {
                await load();
            }
        } catch (e: any) {
            setError(e?.message || '플래그 해소 중 오류');
        }
    };

    const membershipBadge = useMemo(() => {
        if (!data?.active_membership) return null;
        const days = data.active_membership.days_until_expiry;
        if (days <= 7) return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: `만기 ${days}일 전` };
        if (days <= 30) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: `만기 ${days}일 전` };
        return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', label: `${days}일 남음` };
    }, [data]);

    if (loading) {
        return (
            <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-white/50 text-xs">컨텍스트 로딩 중...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-red-400 text-xs">{error || '데이터 없음'}</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white tracking-wider uppercase">회원 컨텍스트</h3>
                <button onClick={() => setShowFlagForm(v => !v)} className="text-[11px] font-bold px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }}>
                    {showFlagForm ? '취소' : '+ 플래그'}
                </button>
            </div>

            {/* Add flag form */}
            {showFlagForm && (
                <div className="rounded p-3 mb-3 grid grid-cols-2 gap-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <label className="text-[10px] text-white/60">
                        플래그 종류
                        <select value={flagForm.flag_type} onChange={e => setFlagForm(f => ({ ...f, flag_type: e.target.value as MemberAlertFlagType }))} className="w-full mt-1 px-2 py-1 rounded text-xs bg-white/5 border border-white/10 text-white">
                            {Object.entries(FLAG_TYPE_LABEL).map(([key, v]) => (
                                <option key={key} value={key}>{v.emoji} {v.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="text-[10px] text-white/60">
                        심각도
                        <select value={flagForm.severity} onChange={e => setFlagForm(f => ({ ...f, severity: e.target.value as MemberAlertSeverity }))} className="w-full mt-1 px-2 py-1 rounded text-xs bg-white/5 border border-white/10 text-white">
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="critical">Critical</option>
                        </select>
                    </label>
                    <label className="text-[10px] text-white/60 col-span-2">
                        만료일 (선택)
                        <input type="date" value={flagForm.ends_at} onChange={e => setFlagForm(f => ({ ...f, ends_at: e.target.value }))} className="w-full mt-1 px-2 py-1 rounded text-xs bg-white/5 border border-white/10 text-white" />
                    </label>
                    <label className="text-[10px] text-white/60 col-span-2">
                        메모
                        <textarea value={flagForm.note} onChange={e => setFlagForm(f => ({ ...f, note: e.target.value }))} rows={2} className="w-full mt-1 px-2 py-1 rounded text-xs bg-white/5 border border-white/10 text-white resize-y" />
                    </label>
                    <div className="col-span-2 flex justify-end">
                        <button onClick={handleAddFlag} disabled={savingFlag} className="px-3 py-1.5 rounded text-xs font-bold" style={{ background: 'var(--primary)', color: '#000' }}>
                            {savingFlag ? '저장 중...' : '플래그 추가'}
                        </button>
                    </div>
                </div>
            )}

            {/* Active flags */}
            {data.active_flags.length > 0 && (
                <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">활성 플래그 {data.active_flags.length}건</p>
                    <div className="flex flex-col gap-1.5">
                        {data.active_flags.map(f => {
                            const meta = FLAG_TYPE_LABEL[f.flag_type];
                            const sev = SEVERITY_STYLE[f.severity];
                            return (
                                <div key={f.id} className="rounded p-2 flex items-start justify-between gap-2" style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: sev.color }}>
                                            <span>{meta.emoji} {meta.label}</span>
                                            <span className="text-[9px] uppercase opacity-70">{f.severity}</span>
                                            {f.ends_at && (
                                                <span className="text-[9px] text-white/40">~ {new Date(f.ends_at).toLocaleDateString('ko-KR')}</span>
                                            )}
                                        </div>
                                        {f.note && (<div className="text-[11px] text-white/60 mt-0.5 whitespace-pre-wrap">{f.note}</div>)}
                                    </div>
                                    <button onClick={() => handleResolveFlag(f)} className="text-[10px] px-2 py-0.5 rounded text-white/70 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        해소
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <Stat label="총 출석" value={data.attendance.total_checkins.toString()} />
                <Stat label="최근 30일" value={data.attendance.thirty_day_count.toString()} />
                <Stat label="멤버십" value={data.active_membership ? data.active_membership.plan_name : '없음'} accent={membershipBadge?.color} />
            </div>

            {/* Membership detail */}
            {data.active_membership && membershipBadge && (
                <div className="rounded p-2 mb-3 flex items-center justify-between" style={{ background: membershipBadge.bg }}>
                    <span className="text-xs text-white/70">{data.active_membership.plan_name}</span>
                    <span className="text-xs font-bold" style={{ color: membershipBadge.color }}>{membershipBadge.label}</span>
                </div>
            )}

            {/* Recent notes */}
            {data.recent_notes.length > 0 && (
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">최근 코칭 노트</p>
                    <div className="flex flex-col gap-1.5">
                        {data.recent_notes.slice(0, 3).map(n => (
                            <div key={n.id} className="rounded p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="flex items-center justify-between text-[10px] text-white/40 mb-0.5">
                                    <span>{n.author_name || '시스템'}</span>
                                    <span>{new Date(n.created_at).toLocaleDateString('ko-KR')}</span>
                                </div>
                                <p className="text-[11px] text-white/70 whitespace-pre-wrap line-clamp-2">{n.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.attendance.last_checkin && (
                <p className="text-[10px] text-white/30 mt-2">
                    마지막 출석: {new Date(data.attendance.last_checkin).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
            )}
        </div>
    );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <div className="rounded p-2 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="text-sm font-bold" style={{ color: accent || '#fff' }}>{value}</div>
            <div className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">{label}</div>
        </div>
    );
}
