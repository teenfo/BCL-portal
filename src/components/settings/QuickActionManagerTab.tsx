'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AIWidgetGenerator from '@/components/dashboard/AIWidgetGenerator';

/* ────────────── Types ────────────── */

interface WidgetRow {
    id: string;
    title: string;
    description: string;
    category: string;
    icon: string;
    icon_color: string;
    default_enabled: boolean;
    default_order: number;
    source: string;
    created_at: string;
}

interface AILogRow {
    id: string;
    prompt: string;
    model_used: string;
    generated_widget_id: string | null;
    generated_modal_ids: string[];
    status: string;
    error_message: string | null;
    created_at: string;
}

/* ────────────── Icons ────────────── */

function IconWidget() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
    );
}

function IconAI() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
    );
}

function IconTrash() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
    );
}

function IconRefresh() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
    );
}

/* ────────────── Category Colors ────────────── */

const CATEGORY_COLORS: Record<string, string> = {
    finance: '#EF4444',
    operations: '#F59E0B',
    crm: '#F97316',
    insights: '#6366F1',
    infrastructure: '#14B8A6',
};

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
    system: { label: '시스템', color: '#3B82F6' },
    ai_generated: { label: 'AI 생성', color: '#A78BFA' },
    custom: { label: '커스텀', color: '#10B981' },
};

const STATUS_COLORS: Record<string, string> = {
    success: '#4ADE80',
    failed: '#F87171',
    pending: '#FBBF24',
    rejected: '#6B7280',
};

/* ────────────── Exported Component ────────────── */

export default function QuickActionManagerTab() {
    const [activeSubTab, setActiveSubTab] = useState<'widgets' | 'ai-logs'>('widgets');
    const [widgets, setWidgets] = useState<WidgetRow[]>([]);
    const [logs, setLogs] = useState<AILogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
    const [filter, setFilter] = useState<'all' | 'system' | 'ai_generated' | 'custom'>('all');

    /* ── Fetch Data ── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();

        const [widgetRes, logRes] = await Promise.all([
            supabase
                .from('widget_definitions')
                .select('id, title, description, category, icon, icon_color, default_enabled, default_order, source, created_at')
                .order('default_order', { ascending: true }),
            supabase
                .from('ai_widget_generation_logs')
                .select('id, prompt, model_used, generated_widget_id, generated_modal_ids, status, error_message, created_at')
                .order('created_at', { ascending: false })
                .limit(50),
        ]);

        if (widgetRes.data) setWidgets(widgetRes.data as WidgetRow[]);
        if (logRes.data) setLogs(logRes.data as AILogRow[]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    /* ── Actions ── */
    const handleDeleteWidget = async (widgetId: string, title: string) => {
        if (!confirm(`"${title}" 위젯을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
        const supabase = createClient();
        await supabase.from('widget_definitions').delete().eq('id', widgetId);
        fetchAll();
    };

    const handleToggleEnabled = async (widgetId: string, current: boolean) => {
        const supabase = createClient();
        await supabase.from('widget_definitions').update({ default_enabled: !current }).eq('id', widgetId);
        fetchAll();
    };

    /* ── Filtered Widgets ── */
    const filteredWidgets = filter === 'all' ? widgets : widgets.filter(w => w.source === filter);

    const systemCount = widgets.filter(w => w.source === 'system').length;
    const aiCount = widgets.filter(w => w.source === 'ai_generated').length;
    const customCount = widgets.filter(w => w.source === 'custom').length;

    /* ═══ RENDER ═══ */
    return (
        <div className="max-w-[900px] animate-premium-fade">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)' }}>
                        <span style={{ color: '#FF6B00' }}><IconWidget /></span>
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight text-left">Quick Action Manager</h2>
                        <p className="text-[11px] text-white/30 text-left">대시보드 위젯 생성, 관리 및 AI 자동 생성</p>
                    </div>
                </div>
                <button
                    onClick={() => setAiGeneratorOpen(true)}
                    className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                    style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#A78BFA' }}
                >
                    <IconAI /> AI 위젯 생성
                </button>
            </div>

            {/* Sub Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveSubTab('widgets')}
                    className={`admin-filter-btn ${activeSubTab === 'widgets' ? 'active' : ''}`}
                >
                    위젯 목록 ({widgets.length})
                </button>
                <button
                    onClick={() => setActiveSubTab('ai-logs')}
                    className={`admin-filter-btn ${activeSubTab === 'ai-logs' ? 'active' : ''}`}
                >
                    AI 생성 로그 ({logs.length})
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-24">
                    <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin" />
                </div>
            ) : activeSubTab === 'widgets' ? (
                /* ═══ Widgets Tab ═══ */
                <div className="space-y-4">
                    {/* Filter Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setFilter('all')}
                            className={`admin-filter-btn ${filter === 'all' ? 'active' : ''}`}>
                            전체 ({widgets.length})
                        </button>
                        <button onClick={() => setFilter('system')}
                            className={`admin-filter-btn ${filter === 'system' ? 'active' : ''}`}>
                            시스템 ({systemCount})
                        </button>
                        <button onClick={() => setFilter('ai_generated')}
                            className={`admin-filter-btn ${filter === 'ai_generated' ? 'active' : ''}`}>
                            AI 생성 ({aiCount})
                        </button>
                        <button onClick={() => setFilter('custom')}
                            className={`admin-filter-btn ${filter === 'custom' ? 'active' : ''}`}>
                            커스텀 ({customCount})
                        </button>
                        <div className="flex-1" />
                        <button onClick={fetchAll} className="px-3 py-1.5 rounded-lg text-[9px] text-white/30 hover:text-white/50 transition-all">
                            <IconRefresh />
                        </button>
                    </div>

                    {/* Widget List */}
                    {filteredWidgets.length === 0 ? (
                        <div className="py-16 text-center rounded-xl bg-white/[0.01] border border-white/[0.03]">
                            <p className="text-3xl opacity-20 mb-3">🧩</p>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                                {filter === 'all' ? '등록된 위젯이 없습니다' : `${SOURCE_LABELS[filter]?.label || ''} 위젯이 없습니다`}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredWidgets.map(w => {
                                const srcInfo = SOURCE_LABELS[w.source] || SOURCE_LABELS.system;
                                const catColor = CATEGORY_COLORS[w.category] || '#6366F1';

                                return (
                                    <div key={w.id}
                                        className="flex items-center gap-4 p-5 rounded-xl transition-all hover:border-white/[0.08]"
                                        style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}
                                    >
                                        {/* Icon */}
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: `${w.icon_color}15`, border: `1px solid ${w.icon_color}25` }}>
                                            <span className="text-lg" style={{ color: w.icon_color }}>
                                                {w.icon === 'IconMembers' ? '👥' :
                                                    w.icon === 'IconCalendar' ? '📅' :
                                                        w.icon === 'IconFaceId' ? '✅' :
                                                            w.icon === 'IconDollar' ? '💰' :
                                                                w.icon === 'IconMegaphone' ? '📢' :
                                                                    w.icon === 'IconCreditCard' ? '💳' :
                                                                        w.icon === 'IconHand' ? '🤝' : '⚙️'}
                                            </span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[13px] font-bold text-white truncate">{w.title}</span>
                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                                                    style={{ background: `${srcInfo.color}15`, color: srcInfo.color, border: `1px solid ${srcInfo.color}25` }}>
                                                    {srcInfo.label}
                                                </span>
                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                                                    style={{ background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}25` }}>
                                                    {w.category}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-white/30 truncate">{w.description}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[8px] text-white/15 font-mono">{w.id}</span>
                                                <span className="text-[8px] text-white/10">
                                                    순서: {w.default_order}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Default toggle */}
                                        <button
                                            onClick={() => handleToggleEnabled(w.id, w.default_enabled)}
                                            className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                                            style={{
                                                background: w.default_enabled ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                                                border: w.default_enabled ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.05)',
                                                color: w.default_enabled ? '#4ADE80' : 'rgba(255,255,255,0.3)',
                                            }}
                                        >
                                            {w.default_enabled ? 'ON' : 'OFF'}
                                        </button>

                                        {/* Delete (only non-system) */}
                                        {w.source !== 'system' && (
                                            <button
                                                onClick={() => handleDeleteWidget(w.id, w.title)}
                                                className="px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1"
                                                style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(248,113,113,0.6)' }}
                                            >
                                                <IconTrash /> 삭제
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="p-4 rounded-xl mt-6" style={{ background: 'rgba(255,107,0,0.03)', border: '1px solid rgba(255,107,0,0.1)' }}>
                        <div className="flex items-start gap-2">
                            <span className="text-[14px] mt-0.5">💡</span>
                            <div className="space-y-1">
                                <p className="text-[11px] text-white/30 leading-relaxed">
                                    <strong className="text-white/50">기본 표시 (ON/OFF)</strong>: 새 사용자가 처음 로그인할 때 대시보드에 자동 표시할 위젯을 결정합니다.
                                </p>
                                <p className="text-[11px] text-white/30 leading-relaxed">
                                    <strong className="text-white/50">삭제</strong>: AI 생성 또는 커스텀 위젯만 영구 삭제 가능합니다. 시스템 위젯은 삭제할 수 없습니다.
                                </p>
                                <p className="text-[11px] text-white/30 leading-relaxed">
                                    <strong className="text-white/50">대시보드 위젯 관리</strong>: 대시보드에서 개인별 위젯 추가/제거는 대시보드 화면에서 직접 수행합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ═══ AI Logs Tab ═══ */
                <div className="space-y-3">
                    {logs.length === 0 ? (
                        <div className="py-16 text-center rounded-xl bg-white/[0.01] border border-white/[0.03]">
                            <p className="text-3xl opacity-20 mb-3">🤖</p>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">AI 생성 이력이 없습니다</p>
                            <p className="text-[9px] text-white/10 mt-2">위 &quot;AI 위젯 생성&quot; 버튼을 통해 새 위젯을 만들어보세요</p>
                        </div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id}
                                className="p-5 rounded-xl transition-all"
                                style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] text-white/70 mb-2 leading-relaxed">{log.prompt}</p>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
                                                style={{
                                                    background: `${STATUS_COLORS[log.status] || '#6B7280'}15`,
                                                    color: STATUS_COLORS[log.status] || '#6B7280',
                                                    border: `1px solid ${STATUS_COLORS[log.status] || '#6B7280'}25`,
                                                }}>
                                                {log.status}
                                            </span>
                                            {log.generated_widget_id && (
                                                <span className="text-[9px] text-white/20 font-mono">
                                                    → {log.generated_widget_id}
                                                </span>
                                            )}
                                            {log.generated_modal_ids?.length > 0 && (
                                                <span className="text-[9px] text-white/15">
                                                    + {log.generated_modal_ids.length} modals
                                                </span>
                                            )}
                                            <span className="text-[8px] text-white/10 font-mono">
                                                {new Date(log.created_at).toLocaleString('ko-KR', {
                                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        {log.error_message && (
                                            <p className="text-[9px] text-red-300/50 mt-2 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                                                {log.error_message}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[8px] text-white/10 shrink-0 font-mono">{log.model_used}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* AI Widget Generator Modal */}
            <AIWidgetGenerator
                isOpen={aiGeneratorOpen}
                onClose={() => setAiGeneratorOpen(false)}
                onGenerated={fetchAll}
            />
        </div>
    );
}
