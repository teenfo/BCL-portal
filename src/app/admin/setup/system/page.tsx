'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconDatabase, IconCreditCard, IconBell, IconRadio, IconSettings, IconLink, IconEdit } from '@/components/icons/AdminIcons';
import { useToast } from '@/components/ui/Toast';
import PGSettings from './PGSettings';

interface SystemConfig {
    id: string;
    config_key: string;
    config_value: string;
    category: string;
    description: string | null;
    is_secret: boolean;
    created_at: string;
    updated_at: string;
}

// Hardcoded fallback settings (for env vars not stored in DB)
const ENV_CONFIGS = [
    { category: 'Supabase', key: 'Project URL', value: typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set' : '-', description: 'Supabase 프로젝트 URL', editable: false },
    { category: 'Supabase', key: 'Anon Key', value: '••••••••••••', description: '클라이언트용 Anon Key', editable: false },
];

export default function SystemPage() {
    const [dbConfigs, setDbConfigs] = useState<SystemConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
    const [editForm, setEditForm] = useState({ config_value: '', description: '' });
    const [saving, setSaving] = useState(false);
    const { success, error: toastError, info } = useToast();
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ config_key: '', config_value: '', category: 'General', description: '', is_secret: false });
    const [connectionTests, setConnectionTests] = useState<Record<string, { status: 'idle' | 'testing' | 'success' | 'error'; message?: string }>>({});

    const loadConfigs = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('system_config')
                .select('*')
                .order('category')
                .order('config_key');
            if (!error && data) {
                setDbConfigs(data as SystemConfig[]);
            } else if (error) {
                console.error('Error loading system_config:', error);
            }
        } catch (e) {
            console.error('Error loading configs:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadConfigs(); }, [loadConfigs]);

    function openEditModal(config: SystemConfig) {
        setEditingConfig(config);
        setEditForm({ config_value: config.is_secret ? '' : config.config_value, description: config.description || '' });
        setShowEditModal(true);
    }

    async function saveConfig() {
        if (!editingConfig) return;
        setSaving(true);
        const supabase = createClient();
        const updates: any = {
            updated_at: new Date().toISOString(),
            description: editForm.description
        };

        // Only update value if it's not a secret being left empty
        if (!editingConfig.is_secret || editForm.config_value) {
            updates.config_value = editForm.config_value;
        }

        const { error } = await supabase
            .from('system_config')
            .update(updates)
            .eq('id', editingConfig.id);

        setSaving(false);
        if (!error) {
            setShowEditModal(false);
            success('설정이 저장되었습니다.');
            loadConfigs();
        } else {
            toastError(`저장 실패: ${error.message}`);
        }
    }

    async function addConfig() {
        if (!addForm.config_key.trim()) return;
        setSaving(true);
        const supabase = createClient();
        const { error } = await supabase.from('system_config').insert({
            config_key: addForm.config_key,
            config_value: addForm.config_value,
            category: addForm.category,
            description: addForm.description || null,
            is_secret: addForm.is_secret,
        });
        setSaving(false);
        if (!error) {
            setShowAddModal(false);
            setAddForm({ config_key: '', config_value: '', category: 'General', description: '', is_secret: false });
            success('새 설정이 추가되었습니다.');
            loadConfigs();
        } else {
            toastError(`추가 실패: ${error.message}`);
        }
    }

    async function deleteConfig(id: string) {
        if (!confirm('이 설정을 삭제하시겠습니까?')) return;
        const supabase = createClient();
        const { error } = await supabase.from('system_config').delete().eq('id', id);
        if (error) {
            toastError(`삭제 실패: ${error.message}`);
        } else {
            success('설정이 삭제되었습니다.');
            loadConfigs();
        }
    }

    async function testConnection(service: string) {
        setConnectionTests(prev => ({ ...prev, [service]: { status: 'testing' } }));

        try {
            if (service === 'supabase') {
                const supabase = createClient();
                const { error: err } = await supabase.from('facilities').select('id', { count: 'exact', head: true });
                if (err) throw err;
                setConnectionTests(prev => ({ ...prev, [service]: { status: 'success', message: '연결 성공 ✓' } }));
                success('Supabase 연결에 성공했습니다.');
            } else if (service === 'pg') {
                const supabase = createClient();
                const { data, error: err } = await supabase.from('pg_settings').select('id, payment_mode').eq('is_active', true).maybeSingle();
                if (err) throw err;
                if (!data) throw new Error('활성화된 PG 설정이 없습니다.');

                const statusMsg = data.payment_mode === 'simulation' ? '시뮬레이션 모드 활성 ✓' : '운영(Live) 모드 활성 ✓';
                setConnectionTests(prev => ({ ...prev, [service]: { status: 'success', message: statusMsg } }));
                success(`결제 서비스 상태: ${data.payment_mode === 'simulation' ? 'Simulation' : 'Live'}`);
            } else if (service === 'pm5') {
                // Check if pm5_api_endpoint exists in configs
                const endpoint = dbConfigs.find(c => c.config_key === 'pm5_api_endpoint')?.config_value || 'http://localhost:8001';

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);

                    await fetch(`${endpoint}/health`, { mode: 'no-cors', signal: controller.signal });
                    clearTimeout(timeoutId);

                    setConnectionTests(prev => ({ ...prev, [service]: { status: 'success', message: '시뮬레이터 활성 ✓' } }));
                    info(`PM5 시뮬레이터 서버(${endpoint}) 연결됨.`);
                } catch (e) {
                    throw new Error('시뮬레이터 서버 응답 없음 (CORS/Offline)');
                }
            }
        } catch (err: any) {
            setConnectionTests(prev => ({ ...prev, [service]: { status: 'error', message: err.message || '연결 실패' } }));
            toastError(`테스트 실패: ${err.message}`);
        }

        setTimeout(() => {
            setConnectionTests(prev => ({ ...prev, [service]: { status: 'idle' } }));
        }, 8000);
    }

    const dbCategories = [...new Set(dbConfigs.map(c => c.category))];

    const categoryIcons: Record<string, React.ReactNode> = {
        Supabase: <IconDatabase size={20} />,
        PG: <IconCreditCard size={20} />,
        Notifications: <IconBell size={20} />,
        PM5: <IconRadio size={20} />,
        General: <IconSettings size={20} />,
    };

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Infrastructure"
                title="System"
                subtitle="Configuration"
                actions={<button onClick={() => setShowAddModal(true)} className="admin-action-btn">+ 설정 추가</button>}
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {loading ? (
                    <div className="flex justify-center py-64">
                        <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Environment Variables (Read-only) */}
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-xl"><IconDatabase size={20} /></span>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">Environment</h3>
                                <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">Read-only</span>
                            </div>
                            <div className="glass-card rounded-2xl overflow-hidden">
                                {ENV_CONFIGS.map((config, i) => (
                                    <div key={i} className={`grid grid-cols-12 gap-4 items-center p-5 ${i < ENV_CONFIGS.length - 1 ? 'border-b border-white/[0.03]' : ''}`}>
                                        <div className="col-span-3">
                                            <p className="text-xs font-black text-white uppercase">{config.key}</p>
                                            <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{config.description}</p>
                                        </div>
                                        <div className="col-span-7 overflow-hidden">
                                            <code className="text-xs text-[var(--primary)] px-3 py-1.5 rounded-lg font-mono block truncate" style={{ background: 'rgba(255,255,255,0.03)' }}>{config.value}</code>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <span className="text-[8px] text-white/20 uppercase">Env Var</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* DB Configs */}
                        {dbCategories.length > 0 ? (
                            dbCategories.map((cat) => (
                                <section key={cat}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-xl">{categoryIcons[cat] || <IconSettings size={20} />}</span>
                                        <h3 className="text-lg font-black text-white uppercase tracking-tight">{cat}</h3>
                                    </div>
                                    <div className="glass-card rounded-2xl overflow-hidden">
                                        {dbConfigs.filter(c => c.category === cat).map((config, i, arr) => (
                                            <div key={config.id} className={`grid grid-cols-12 gap-4 items-center p-5 ${i < arr.length - 1 ? 'border-b border-white/[0.03]' : ''} group`}>
                                                <div className="col-span-3">
                                                    <p className="text-xs font-black text-white uppercase">{config.config_key}</p>
                                                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{config.description || '-'}</p>
                                                </div>
                                                <div className="col-span-6 overflow-hidden">
                                                    <code className="text-xs text-[var(--primary)] px-3 py-1.5 rounded-lg font-mono block truncate" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                        {config.is_secret ? '••••••••••••' : config.config_value}
                                                    </code>
                                                </div>
                                                <div className="col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEditModal(config)}
                                                        className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-white/[0.03] border border-white/5 text-white hover:border-[var(--primary)]/50 transition-all">
                                                        <IconEdit size={12} />
                                                    </button>
                                                    <button onClick={() => deleteConfig(config.id)}
                                                        className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))
                        ) : (
                            <div className="glass-card p-16 flex flex-col items-center justify-center opacity-40 rounded-2xl">
                                <IconSettings size={40} />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4">DB에 저장된 설정이 없습니다</p>
                                <p className="text-[9px] text-white/30 mt-2">+ 설정 추가 버튼으로 새 설정을 등록하세요</p>
                            </div>
                        )}

                        {/* PG Settings (Toss) */}
                        <PGSettings />

                        {/* Connection Test */}
                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                            <h3 className="text-sm font-black text-white uppercase mb-4 inline-flex items-center gap-2"><IconLink size={16} /> Connection Test</h3>
                            <div className="flex gap-3">
                                {[
                                    { key: 'supabase', label: 'Supabase', cssColor: 'green' },
                                    { key: 'pg', label: 'PG 결제', cssColor: 'blue' },
                                    { key: 'pm5', label: 'PM5 WebSocket', cssColor: 'purple' },
                                ].map(({ key, label, cssColor }) => {
                                    const test = connectionTests[key];
                                    const colorMap: Record<string, string> = { green: '34,197,94', blue: '59,130,246', purple: '139,92,246' };
                                    const rgb = colorMap[cssColor] || '107,114,128';
                                    const textColorMap: Record<string, string> = { green: '#22C55E', blue: '#3B82F6', purple: '#8B5CF6' };
                                    const textColor = textColorMap[cssColor] || '#6B7280';
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => testConnection(key)}
                                            disabled={test?.status === 'testing'}
                                            className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                            style={{
                                                background: test?.status === 'success' ? 'rgba(34,197,94,0.15)' : test?.status === 'error' ? 'rgba(239,68,68,0.15)' : `rgba(${rgb},0.1)`,
                                                border: `1px solid ${test?.status === 'success' ? 'rgba(34,197,94,0.3)' : test?.status === 'error' ? 'rgba(239,68,68,0.3)' : `rgba(${rgb},0.2)`}`,
                                                color: test?.status === 'success' ? '#22C55E' : test?.status === 'error' ? '#EF4444' : textColor,
                                            }}
                                        >
                                            {test?.status === 'testing' ? '테스트 중...' : test?.message || `${label} 연결 테스트`}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Config Modal */}
            <AdminModal show={showEditModal} onClose={() => setShowEditModal(false)} title={`설정 수정 — ${editingConfig?.config_key || ''}`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">값</label>
                        <input
                            value={editForm.config_value}
                            onChange={(e) => setEditForm({ ...editForm, config_value: e.target.value })}
                            placeholder={editingConfig?.is_secret ? '새 값 입력 (비워두면 유지)' : '값 입력'}
                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none font-mono transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">설명</label>
                        <input
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                    <button onClick={saveConfig} disabled={saving} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-50" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>{saving ? '저장 중...' : '저장'}</button>
                </div>
            </AdminModal>

            {/* Add Config Modal */}
            <AdminModal show={showAddModal} onClose={() => setShowAddModal(false)} title="새 설정 추가">
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">키</label>
                        <input value={addForm.config_key} onChange={(e) => setAddForm({ ...addForm, config_key: e.target.value })} placeholder="예: pm5_api_endpoint" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none font-mono transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">값</label>
                        <input value={addForm.config_value} onChange={(e) => setAddForm({ ...addForm, config_value: e.target.value })} placeholder="설정 값" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none font-mono transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">카테고리</label>
                            <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <option value="General">General</option>
                                <option value="Supabase">Supabase</option>
                                <option value="PG">PG</option>
                                <option value="Notifications">Notifications</option>
                                <option value="PM5">PM5</option>
                            </select>
                        </div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={addForm.is_secret} onChange={(e) => setAddForm({ ...addForm, is_secret: e.target.checked })} className="w-4 h-4 rounded accent-[var(--primary)]" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">비밀 값</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">설명</label>
                        <input value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} placeholder="설정에 대한 설명" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                    <button onClick={addConfig} disabled={saving || !addForm.config_key.trim()} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-50" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>{saving ? '추가 중...' : '추가'}</button>
                </div>
            </AdminModal>
        </div>
    );
}
