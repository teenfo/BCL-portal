'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import { useToast } from '@/components/ui/Toast';
import { IconCreditCard, IconLock, IconCheck, IconAlertCircle } from '@/components/icons/AdminIcons';

interface PGSettings {
    test_client_key: string;
    live_client_key: string;
    payment_mode: 'simulation' | 'live';
    is_active: boolean;
}

export default function PGSettings() {
    const [settings, setSettings] = useState<PGSettings>({
        test_client_key: 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm',
        live_client_key: '',
        payment_mode: 'simulation',
        is_active: true
    });
    const [keys, setKeys] = useState({
        test_secret: '',
        live_secret: '',
        webhook_secret: '',
        pos_api_key: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<any>(null);
    const { success, error: toastError } = useToast();
    const env = process.env.NEXT_PUBLIC_SUPABASE_ENV || 'dev';

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        const supabase = createClient();
        setLoading(true);
        try {
            const { data, error } = await query('pg_settings')
                
                .select('*')
                .eq('is_active', true)
                .limit(1)
                .single();

            if (data) {
                setSettings({
                    test_client_key: data.test_client_key,
                    live_client_key: data.live_client_key || '',
                    payment_mode: data.payment_mode,
                    is_active: data.is_active
                });
            }
        } catch (e) {
            console.error('No PG settings found or error:', e);
        }
        setLoading(false);
    }

    async function handleSave() {
        setSaving(true);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            // Call sync-pg-settings Edge Function
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-pg-settings`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        test_client_key: settings.test_client_key,
                        test_secret_key: keys.test_secret,
                        live_client_key: settings.live_client_key,
                        live_secret_key: keys.live_secret,
                        webhook_secret: keys.webhook_secret,
                        payment_mode: settings.payment_mode
                    })
                }
            );

            const result = await response.json();
            if (response.ok) {
                success('PG 설정이 암호화되어 저장되었습니다.');
                setKeys({ test_secret: '', live_secret: '', webhook_secret: '', pos_api_key: '' }); // Clear secrets from memory
                loadSettings();
            } else {
                throw new Error(result.error || '저장 실패');
            }
        } catch (err: any) {
            toastError(err.message);
        }
        setSaving(false);
    }

    if (loading) return <div className="h-64 flex items-center justify-center opacity-30"><div className="w-6 h-6 border-2 border-white/10 border-t-white animate-spin rounded-full"></div></div>;

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-xl text-white/50"><IconCreditCard size={20} /></span>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight text-glow-sm">PG Payment (Toss)</h3>
                </div>

                <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <button
                        onClick={() => setSettings({ ...settings, payment_mode: 'simulation' })}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${settings.payment_mode === 'simulation' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'text-white/40 border border-transparent hover:text-white/60'}`}
                    >
                        Simulation
                    </button>
                    <button
                        onClick={() => setSettings({ ...settings, payment_mode: 'live' })}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${settings.payment_mode === 'live' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-white/40 border border-transparent hover:text-white/60'}`}
                    >
                        Live
                    </button>
                </div>
            </div>

            {/* Environmental Warning */}
            {env !== 'prod' && settings.payment_mode === 'live' && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3 items-center">
                    <IconAlertCircle size={18} className="text-orange-400 shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold text-orange-200">현재 서버 환경이 PROD(운영)가 아닙니다.</p>
                        <p className="text-[9px] text-orange-400/80">운영 모드를 선택했더라도 안전을 위해 시뮬레이션 키가 강제 적용됩니다.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Simulation Keys */}
                <div className="glass-card rounded-2xl p-6 border-l-4 border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Simulation Keys</h4>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[8px] font-black text-white/40 uppercase mb-1.5 ml-1">Test Client Key</label>
                            <input
                                value={settings.test_client_key}
                                onChange={e => setSettings({ ...settings, test_client_key: e.target.value })}
                                className="admin-search-input w-full font-mono text-xs"
                                placeholder="test_gck_..."
                            />
                        </div>
                        <div>
                            <label className="block text-[8px] font-black text-white/40 uppercase mb-1.5 ml-1 inline-flex items-center gap-1">
                                <IconLock size={8} /> Test Secret Key
                            </label>
                            <input
                                type="password"
                                value={keys.test_secret}
                                onChange={e => setKeys({ ...keys, test_secret: e.target.value })}
                                className="admin-search-input w-full font-mono text-xs"
                                placeholder="••••••••••••"
                            />
                        </div>
                    </div>
                </div>

                {/* Live Keys */}
                <div className="glass-card rounded-2xl p-6 border-l-4 border-green-500/30">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Live Keys</h4>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[8px] font-black text-white/40 uppercase mb-1.5 ml-1">Live Client Key</label>
                            <input
                                value={settings.live_client_key}
                                onChange={e => setSettings({ ...settings, live_client_key: e.target.value })}
                                className="admin-search-input w-full font-mono text-xs"
                                placeholder="live_gck_..."
                            />
                        </div>
                        <div>
                            <label className="block text-[8px] font-black text-white/40 uppercase mb-1.5 ml-1 inline-flex items-center gap-1">
                                <IconLock size={8} /> Live Secret Key
                            </label>
                            <input
                                type="password"
                                value={keys.live_secret}
                                onChange={e => setKeys({ ...keys, live_secret: e.target.value })}
                                className="admin-search-input w-full font-mono text-xs"
                                placeholder="••••••••••••"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-2xl p-6 bg-white/[0.01]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                    <div>
                        <label className="block text-[8px] font-black text-white/40 uppercase mb-1.5 ml-1 inline-flex items-center gap-1">
                            <IconLock size={8} /> Webhook Secret
                        </label>
                        <input
                            type="password"
                            value={keys.webhook_secret}
                            onChange={e => setKeys({ ...keys, webhook_secret: e.target.value })}
                            className="admin-search-input w-full font-mono text-xs"
                            placeholder="Toss Webhook Secret"
                        />
                        <p className="text-[8px] text-white/30 mt-2 ml-1 italic">Webhook 서명 검증을 위해 반드시 필요합니다.</p>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="admin-action-btn w-40 flex items-center justify-center gap-2"
                        >
                            {saving ? <div className="w-3 h-3 border border-white/20 border-t-white animate-spin rounded-full"></div> : <IconCheck size={16} />}
                            {saving ? 'Saving...' : '저장하기'}
                        </button>
                    </div>
                </div>
            </div>

            {/* POS Integration */}
            <div className="glass-card rounded-2xl p-6 border-l-4 border-amber-500/30">
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">POS 매출 연동</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[8px] font-black text-white/40 uppercase mb-1.5 ml-1 inline-flex items-center gap-1">
                            <IconLock size={8} /> POS API Key (Toss)
                        </label>
                        <input
                            type="password"
                            value={keys.pos_api_key}
                            onChange={e => setKeys({ ...keys, pos_api_key: e.target.value })}
                            className="admin-search-input w-full font-mono text-xs"
                            placeholder="POS API Secret Key"
                        />
                        <p className="text-[8px] text-white/30 mt-2 ml-1 italic">Toss POS Open API 키. 테스트 키로 개발 가능합니다.</p>
                    </div>
                    <div className="flex flex-col justify-end gap-3">
                        <button
                            onClick={async () => {
                                setSyncing(true);
                                setSyncResult(null);
                                try {
                                    const supabase = createClient();
                                    const { data: { session } } = await supabase.auth.getSession();
                                    if (!session) throw new Error('Not authenticated');

                                    const { data: fac } = await query('facilities')
                                        
                                        .select('id')
                                        .limit(1)
                                        .single();

                                    const resp = await fetch(
                                        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-pos-sales`,
                                        {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${session.access_token}`
                                            },
                                            body: JSON.stringify({ facility_id: fac?.id })
                                        }
                                    );
                                    const result = await resp.json();
                                    setSyncResult(result);
                                    if (result.success) {
                                        success(`POS 동기화 완료: ${result.result?.new_inserted || 0}건 추가`);
                                    } else {
                                        toastError(result.result?.errors?.[0] || result.error || '동기화 실패');
                                    }
                                } catch (err: any) {
                                    toastError(err.message);
                                }
                                setSyncing(false);
                            }}
                            disabled={syncing}
                            className="admin-filter-btn flex items-center justify-center gap-2"
                        >
                            {syncing ? <div className="w-3 h-3 border border-white/20 border-t-amber-400 animate-spin rounded-full"></div> : '🔄'}
                            {syncing ? '동기화 중...' : 'POS 매출 수동 동기화'}
                        </button>
                        {syncResult && (
                            <div className={`p-3 rounded-xl text-[9px] font-mono ${syncResult.success ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                                {syncResult.success
                                    ? `✅ Fetched: ${syncResult.result?.total_fetched}, New: ${syncResult.result?.new_inserted}, Exists: ${syncResult.result?.already_exists}`
                                    : `❌ ${syncResult.result?.errors?.[0] || syncResult.error}`}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .text-glow-sm {
                    text-shadow: 0 0 10px rgba(255,255,255,0.2);
                }
            `}</style>
        </section>
    );
}
