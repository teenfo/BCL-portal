'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ModalDefinition, ModalField } from '@/types/widget';
import { createClient } from '@/lib/supabase/client';

interface QuickActionModalProps {
    modal: ModalDefinition;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (refreshWidgets: string[]) => void;
}

/**
 * 동적 모달 렌더러
 * - ModalDefinition JSON을 읽어 필드를 자동 생성
 * - submitAction에 따라 Supabase에 데이터 처리
 */
export default function QuickActionModal({ modal, isOpen, onClose, onSuccess }: QuickActionModalProps) {
    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [submitting, setSubmitting] = useState(false);
    const [selectOptions, setSelectOptions] = useState<Record<string, Array<{ value: string; label: string }>>>({});
    const [searchResults, setSearchResults] = useState<Array<{ id: string; label: string }>>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // 기본값 설정
    useEffect(() => {
        if (isOpen) {
            const defaults: Record<string, unknown> = {};
            modal.fields.forEach(field => {
                if (field.defaultValue !== undefined) {
                    defaults[field.name] = field.defaultValue;
                }
            });
            setFormData(defaults);
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen, modal.fields]);

    // optionsQuery가 있는 select 필드의 옵션 로드
    useEffect(() => {
        if (!isOpen) return;
        const supabase = createClient();

        modal.fields.forEach(async (field) => {
            if (field.type === 'select' && field.optionsQuery && !field.dependsOn) {
                try {
                    const { table, valueField, labelField, filter } = field.optionsQuery;
                    let query = supabase.from(table).select(`${valueField}, ${labelField}`);
                    if (filter) {
                        Object.entries(filter).forEach(([k, v]) => {
                            if (v === 'today') {
                                const today = new Date().toISOString().split('T')[0];
                                query = query.gte(k, today).lte(k, today + 'T23:59:59');
                            } else if (v === 'null') {
                                query = query.is(k, null);
                            } else {
                                query = query.eq(k, v);
                            }
                        });
                    }
                    const { data } = await query.limit(50);
                    if (data) {
                        setSelectOptions(prev => ({
                            ...prev,
                            [field.name]: (data as any[]).map((item) => ({
                                value: String(item[valueField]),
                                label: String(item[labelField]),
                            })),
                        }));
                    }
                } catch (err) {
                    console.error(`Failed to load options for ${field.name}:`, err);
                }
            }
        });
    }, [isOpen, modal.fields]);

    // 의존성 필드 옵션 로드
    useEffect(() => {
        if (!isOpen) return;
        const supabase = createClient();

        modal.fields.forEach(async (field) => {
            if (field.dependsOn && field.optionsQuery && formData[field.dependsOn]) {
                try {
                    const { table, valueField, labelField } = field.optionsQuery;
                    const { data } = await supabase.from(table)
                        .select(`${valueField}, ${labelField}`)
                        .eq('member_id', formData[field.dependsOn])
                        .limit(20);
                    if (data) {
                        setSelectOptions(prev => ({
                            ...prev,
                            [field.name]: (data as any[]).map((item) => ({
                                value: String(item[valueField]),
                                label: String(item[labelField]),
                            })),
                        }));
                    }
                } catch (err) {
                    console.error(`Failed to load dependent options for ${field.name}:`, err);
                }
            }
        });
    }, [isOpen, modal.fields, formData]);

    // 회원 검색
    const handleMemberSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) { setSearchResults([]); return; }
        const supabase = createClient();
        const { data } = await supabase.from('members')
            .select('id, name, phone')
            .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(5);
        if (data) {
            setSearchResults(data.map((m: any) => ({
                id: m.id,
                label: `${m.name} (${m.phone || ''})`,
            })));
        }
    }, []);

    const handleChange = (name: string, value: unknown) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const supabase = createClient();
            const { table, method, successMessage, refreshWidgets } = modal.submitAction;

            // 실제 DB 작업 (시뮬레이션 — 실 연동은 Edge Function 추천)
            switch (method) {
                case 'insert':
                    await supabase.from(table).insert(formData);
                    break;
                case 'update':
                    // id가 formData에 있으면 해당 row 업데이트
                    if (formData.id) {
                        await supabase.from(table).update(formData).eq('id', formData.id);
                    }
                    break;
                case 'delete':
                    if (formData.id || formData.checkin_id) {
                        await supabase.from(table).delete().eq('id', formData.id || formData.checkin_id);
                    }
                    break;
                case 'select':
                    // 검색 결과 내비게이션은 별도 처리
                    break;
            }

            onSuccess(refreshWidgets);
            onClose();
        } catch (err) {
            console.error('Modal submit error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md animate-scale-in" style={{ animationDuration: '0.3s' }}>
                <div className="glass-card p-8 border border-white/10 shadow-2xl">
                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">{modal.title}</h2>
                        <p className="text-[10px] text-white/40 mt-1">{modal.description}</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {modal.fields.map(field => (
                            <div key={field.name} className="space-y-1.5">
                                <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest">
                                    {field.label} {field.required && <span className="text-red-400">*</span>}
                                </label>
                                {renderField(field, formData, handleChange, selectOptions, searchQuery, searchResults, handleMemberSearch)}
                            </div>
                        ))}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-40"
                                style={{
                                    background: 'var(--primary)',
                                    boxShadow: '0 0 20px var(--primary-glow)',
                                }}
                            >
                                {submitting ? '처리 중...' : '확인'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

/**
 * 필드 타입별 렌더러
 */
function renderField(
    field: ModalField,
    formData: Record<string, unknown>,
    onChange: (name: string, value: unknown) => void,
    selectOptions: Record<string, Array<{ value: string; label: string }>>,
    searchQuery: string,
    searchResults: Array<{ id: string; label: string }>,
    onMemberSearch: (q: string) => void,
) {
    const baseInputClass = 'w-full py-2.5 px-4 rounded-xl bg-white/[0.03] border border-white/[0.05] text-sm text-white outline-none focus:border-[var(--primary)]/50 transition-all placeholder:text-white/20';

    switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
        case 'number':
            return (
                <input
                    type={field.type}
                    className={baseInputClass}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={String(formData[field.name] || '')}
                    onChange={e => onChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                />
            );

        case 'date':
        case 'time':
            return (
                <input
                    type={field.type}
                    className={`${baseInputClass} admin-search-input`}
                    required={field.required}
                    value={String(formData[field.name] || '')}
                    onChange={e => onChange(field.name, e.target.value)}
                />
            );

        case 'textarea':
            return (
                <textarea
                    className={`${baseInputClass} resize-none`}
                    rows={3}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={String(formData[field.name] || '')}
                    onChange={e => onChange(field.name, e.target.value)}
                />
            );

        case 'select': {
            const opts = field.options || selectOptions[field.name] || [];
            return (
                <select
                    className={baseInputClass}
                    required={field.required}
                    value={String(formData[field.name] || '')}
                    onChange={e => onChange(field.name, e.target.value)}
                >
                    <option value="" className="bg-[#1a1a1a]">선택하세요</option>
                    {opts.map(o => (
                        <option key={o.value} value={o.value} className="bg-[#1a1a1a]">{o.label}</option>
                    ))}
                </select>
            );
        }

        case 'multi-select': {
            const opts = field.options || [];
            const selected = (formData[field.name] as string[] || []);
            return (
                <div className="flex flex-wrap gap-2">
                    {opts.map(o => (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => {
                                const newVal = selected.includes(o.value)
                                    ? selected.filter(v => v !== o.value)
                                    : [...selected, o.value];
                                onChange(field.name, newVal);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${selected.includes(o.value)
                                ? 'bg-[var(--primary)] text-white border border-[var(--primary)]'
                                : 'bg-white/[0.03] text-white/40 border border-white/[0.05] hover:bg-white/[0.06]'
                                }`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            );
        }

        case 'toggle':
            return (
                <button
                    type="button"
                    onClick={() => onChange(field.name, !formData[field.name])}
                    className={`relative w-12 h-6 rounded-full transition-all ${formData[field.name] ? 'bg-[var(--primary)]' : 'bg-white/10'
                        }`}
                >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${formData[field.name] ? 'left-6' : 'left-0.5'
                        }`} />
                </button>
            );

        case 'member-search':
            return (
                <div className="relative">
                    <input
                        type="text"
                        className={baseInputClass}
                        placeholder={field.placeholder}
                        value={formData[field.name] ? String((formData as any)[`${field.name}_label`] || '') : searchQuery}
                        onChange={e => {
                            if (formData[field.name]) {
                                onChange(field.name, '');
                                onChange(`${field.name}_label`, '');
                            }
                            onMemberSearch(e.target.value);
                        }}
                    />
                    {searchResults.length > 0 && !formData[field.name] && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-xl z-10 overflow-hidden">
                            {searchResults.map(r => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(field.name, r.id);
                                        onChange(`${field.name}_label`, r.label);
                                        onMemberSearch('');
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/[0.05] hover:text-white transition-all"
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            );

        default:
            return <input type="text" className={baseInputClass} />;
    }
}
