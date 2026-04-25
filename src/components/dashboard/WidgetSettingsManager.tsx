'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { query } from '@/lib/supabase/query';

interface AIWidgetLog {
    id: string;
    prompt: string;
    model_used: string;
    generated_widget_id: string | null;
    generated_modal_ids: string[];
    status: string;
    error_message: string | null;
    created_at: string;
}

interface WidgetSettingsManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * 위젯 설정 관리자 패널
 * - AI 생성 로그 조회
 * - AI 생성 위젯 승인/삭제
 * - 위젯 공장 초기화
 */
export default function WidgetSettingsManager({ isOpen, onClose }: WidgetSettingsManagerProps) {
    const [logs, setLogs] = useState<AIWidgetLog[]>([]);
    const [dbWidgets, setDbWidgets] = useState<Array<{ id: string; title: string; source: string; created_at: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'logs' | 'widgets'>('widgets');

    const fetchData = useCallback(async () => {
        setLoading(true);

        const [logResult, widgetResult] = await Promise.all([
            query('ai_widget_generation_logs')
                .select('id, prompt, model_used, generated_widget_id, generated_modal_ids, status, error_message, created_at')
                .order('created_at', { ascending: false })
                .limit(20),
            query('widget_definitions')
                .select('id, title, source, created_at')
                .order('default_order', { ascending: true }),
        ]);

        if (logResult.data) setLogs(logResult.data as AIWidgetLog[]);
        if (widgetResult.data) setDbWidgets(widgetResult.data as any[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen, fetchData]);

    const handleDeleteWidget = async (widgetId: string) => {
        if (!confirm(`위젯 "${widgetId}"을 삭제하시겠습니까?`)) return;
        await query('widget_definitions').delete().eq('id', widgetId);
        fetchData();
    };

    if (!isOpen) return null;

    const statusColors: Record<string, string> = {
        success: 'text-green-400',
        failed: 'text-red-400',
        pending: 'text-yellow-400',
        rejected: 'text-gray-400',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-3xl animate-scale-in max-h-[80vh]" style={{ animationDuration: '0.3s' }}>
                <div className="glass-card p-8 border border-white/10 shadow-2xl overflow-auto max-h-[80vh] custom-scrollbar">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Widget Management</h2>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">위젯 및 AI 생성 이력 관리</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.05] flex items-center justify-center text-white/40 hover:text-white transition-all"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6">
                        {(['widgets', 'logs'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`admin-filter-btn ${tab === t ? 'active' : ''}`}
                            >
                                {t === 'widgets' ? '위젯 목록' : 'AI 생성 로그'}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="py-16 flex justify-center">
                            <div className="w-8 h-8 rounded-lg border-2 border-white/5 border-t-[var(--primary)] animate-spin" />
                        </div>
                    ) : tab === 'widgets' ? (
                        /* Widget List */
                        <div className="space-y-3">
                            {dbWidgets.map(w => (
                                <div key={w.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${w.source === 'system' ? 'bg-blue-400' :
                                            w.source === 'ai_generated' ? 'bg-purple-400' :
                                                'bg-green-400'
                                            }`} />
                                        <div>
                                            <p className="text-sm font-bold text-white">{w.title}</p>
                                            <p className="text-[9px] text-white/30">
                                                {w.source === 'system' ? '시스템' : w.source === 'ai_generated' ? 'AI 생성' : '커스텀'}
                                                {' · '}{w.id}
                                            </p>
                                        </div>
                                    </div>
                                    {w.source !== 'system' && (
                                        <button
                                            onClick={() => handleDeleteWidget(w.id)}
                                            className="px-3 py-1.5 rounded-lg text-[9px] font-bold text-red-400/60 bg-red-500/5 border border-red-500/10 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                        >
                                            삭제
                                        </button>
                                    )}
                                </div>
                            ))}
                            {dbWidgets.length === 0 && (
                                <p className="text-center text-[10px] text-white/20 py-8">등록된 위젯이 없습니다</p>
                            )}
                        </div>
                    ) : (
                        /* AI Generation Logs */
                        <div className="space-y-3">
                            {logs.map(log => (
                                <div key={log.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white/70 truncate">{log.prompt}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className={`text-[9px] font-black uppercase ${statusColors[log.status] || 'text-white/30'}`}>
                                                    {log.status}
                                                </span>
                                                {log.generated_widget_id && (
                                                    <span className="text-[9px] text-white/20">→ {log.generated_widget_id}</span>
                                                )}
                                                <span className="text-[8px] text-white/10">
                                                    {new Date(log.created_at).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            {log.error_message && (
                                                <p className="text-[9px] text-red-300/60 mt-1 truncate">{log.error_message}</p>
                                            )}
                                        </div>
                                        <span className="text-[8px] text-white/10 shrink-0">{log.model_used}</span>
                                    </div>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <p className="text-center text-[10px] text-white/20 py-8">AI 생성 이력이 없습니다</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
