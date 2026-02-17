'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AIWidgetGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerated: () => void;
}

/**
 * AI 위젯 생성 다이얼로그
 * - 자연어 프롬프트로 위젯 생성 요청
 * - 미리보기 → 확인 → DB 저장
 */
export default function AIWidgetGenerator({ isOpen, onClose, onGenerated }: AIWidgetGeneratorProps) {
    const [prompt, setPrompt] = useState('');
    const [step, setStep] = useState<'input' | 'preview' | 'saving' | 'done' | 'error'>('input');
    const [preview, setPreview] = useState<any>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const getProjectUrl = useCallback(async () => {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        return { supabase, session };
    }, []);

    // Step 1: 미리보기 요청
    const handlePreview = useCallback(async () => {
        if (prompt.trim().length < 5) return;
        setLoading(true);
        setStep('input');

        try {
            const { supabase, session } = await getProjectUrl();
            if (!session) throw new Error('로그인이 필요합니다.');

            const { data, error } = await supabase.functions.invoke('ai-widget-generator', {
                body: { prompt },
                headers: { 'Content-Type': 'application/json' },
            });

            if (error) throw error;

            // Parse as needed — function may add ?action=preview
            const result = typeof data === 'string' ? JSON.parse(data) : data;

            if (result.preview) {
                setPreview(result.preview);
                setValidationErrors(result.validation_errors || []);
                setStep('preview');
            } else if (result.error) {
                throw new Error(result.error);
            }
        } catch (err: any) {
            setErrorMessage(err.message || '미리보기 생성에 실패했습니다.');
            setStep('error');
        } finally {
            setLoading(false);
        }
    }, [prompt, getProjectUrl]);

    // Step 2: 확정 및 DB 저장
    const handleConfirm = useCallback(async () => {
        setStep('saving');
        try {
            const { supabase, session } = await getProjectUrl();
            if (!session) throw new Error('로그인이 필요합니다.');

            const { data, error } = await supabase.functions.invoke('ai-widget-generator', {
                body: { prompt },
                headers: { 'Content-Type': 'application/json' },
            });

            if (error) throw error;

            const result = typeof data === 'string' ? JSON.parse(data) : data;

            if (result.success) {
                setStep('done');
                setTimeout(() => {
                    onGenerated();
                    handleReset();
                    onClose();
                }, 1500);
            } else {
                throw new Error(result.error || '위젯 저장에 실패했습니다.');
            }
        } catch (err: any) {
            setErrorMessage(err.message || '저장에 실패했습니다.');
            setStep('error');
        }
    }, [prompt, getProjectUrl, onGenerated, onClose]);

    const handleReset = () => {
        setPrompt('');
        setStep('input');
        setPreview(null);
        setValidationErrors([]);
        setErrorMessage('');
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-2xl animate-scale-in" style={{ animationDuration: '0.3s' }}>
                <div className="glass-card p-10 border border-white/10 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                            style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)' }}>
                            🤖
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">AI Widget Generator</h2>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">자연어로 새 위젯을 생성합니다</p>
                        </div>
                    </div>

                    {/* Step: Input */}
                    {step === 'input' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest mb-2">
                                    프롬프트
                                </label>
                                <textarea
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    placeholder="예: 이번 달 출석률이 낮은 회원들을 자동으로 추적하고, 리마인더 알림을 보낼 수 있는 위젯을 만들어줘"
                                    className="w-full py-4 px-5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-sm text-white outline-none focus:border-[var(--primary)]/50 transition-all placeholder:text-white/15 resize-none"
                                    rows={4}
                                />
                                <p className="text-[8px] text-white/20 mt-2 uppercase tracking-widest">
                                    어떤 데이터를 보여주고, 어떤 액션을 수행할 수 있어야 하는지 자유롭게 설명하세요
                                </p>
                            </div>

                            {/* Example prompts */}
                            <div>
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-3">예시 프롬프트</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        '오늘 예약 없는 수업 시간대를 보여주고 임시 수업을 만들 수 있는 위젯',
                                        '최근 30일간 결제 취소/환불 비율을 추적하는 위젯',
                                        '이번 주 코치별 수업 배정 현황과 공석을 관리하는 위젯',
                                        '만료 7일 전 회원 목록과 자동 연장 제안 알림을 보내는 위젯',
                                    ].map((ex, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPrompt(ex)}
                                            className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[9px] text-white/30 text-left hover:bg-white/[0.05] hover:text-white/50 transition-all"
                                        >
                                            {ex}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handlePreview}
                                    disabled={prompt.trim().length < 5 || loading}
                                    className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-30"
                                    style={{
                                        background: 'var(--primary)',
                                        boxShadow: '0 0 20px var(--primary-glow)',
                                    }}
                                >
                                    {loading ? '🤖 생성 중...' : '미리보기 생성'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step: Preview */}
                    {step === 'preview' && preview && (
                        <div className="space-y-6">
                            {/* Widget Preview */}
                            <div className="glass-card p-6 border border-[var(--primary)]/20">
                                <h3 className="text-sm font-black text-white uppercase mb-4">생성된 위젯 미리보기</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{preview.widget?.icon || '📊'}</span>
                                        <div>
                                            <p className="text-sm font-bold text-white">{preview.widget?.title}</p>
                                            <p className="text-[9px] text-white/40">{preview.widget?.description}</p>
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-white/30 space-y-1">
                                        <p>카테고리: <span className="text-white/60">{preview.widget?.category}</span></p>
                                        <p>액션 수: <span className="text-white/60">{preview.widget?.actions?.length || 0}개</span></p>
                                        <p>모달 수: <span className="text-white/60">{preview.modals?.length || 0}개</span></p>
                                        <p>쿼리 키: <span className="text-white/60">{preview.queryKeys?.length || 0}개</span></p>
                                    </div>
                                </div>

                                {/* Modals preview */}
                                {preview.modals?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/[0.05]">
                                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">연결된 모달</p>
                                        {preview.modals.map((m: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2 py-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                                                <span className="text-[9px] text-white/50">{m.title} ({m.fields?.length || 0} fields)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Validation Errors */}
                            {validationErrors.length > 0 && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">검증 오류</p>
                                    {validationErrors.map((err, i) => (
                                        <p key={i} className="text-[9px] text-red-300">{err}</p>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('input')}
                                    className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all"
                                >
                                    ← 수정
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={validationErrors.length > 0}
                                    className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-30"
                                    style={{
                                        background: 'var(--primary)',
                                        boxShadow: '0 0 20px var(--primary-glow)',
                                    }}
                                >
                                    ✓ 위젯 생성 확정
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step: Saving */}
                    {step === 'saving' && (
                        <div className="py-16 text-center">
                            <div className="w-12 h-12 mx-auto rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin mb-6" />
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Saving to Database...</p>
                        </div>
                    )}

                    {/* Step: Done */}
                    {step === 'done' && (
                        <div className="py-16 text-center">
                            <p className="text-4xl mb-4">✅</p>
                            <p className="text-sm font-black text-white uppercase">위젯이 생성되었습니다!</p>
                            <p className="text-[9px] text-white/30 mt-2">대시보드에 위젯을 추가할 수 있습니다</p>
                        </div>
                    )}

                    {/* Step: Error */}
                    {step === 'error' && (
                        <div className="space-y-6">
                            <div className="py-8 text-center">
                                <p className="text-3xl mb-4">⚠️</p>
                                <p className="text-sm font-black text-red-400 uppercase">생성 실패</p>
                                <p className="text-[9px] text-white/30 mt-2 max-w-sm mx-auto">{errorMessage}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleReset}
                                    className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all"
                                >
                                    다시 시도
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-white/[0.05] border border-white/[0.05] hover:bg-white/[0.08] transition-all"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
