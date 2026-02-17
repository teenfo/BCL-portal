'use client';

import { useState } from 'react';

interface SystemConfig {
    id: string;
    category: string;
    key: string;
    value: string;
    description: string;
}

export default function SystemPage() {
    const [configs] = useState<SystemConfig[]>([
        { id: '1', category: 'Supabase', key: 'Project URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set', description: 'Supabase 프로젝트 URL' },
        { id: '2', category: 'Supabase', key: 'Anon Key', value: '••••••••••••', description: '클라이언트용 Anon Key' },
        { id: '3', category: 'PG', key: 'PG Provider', value: 'Toss Payments (Test)', description: '결제 게이트웨이' },
        { id: '4', category: 'PG', key: 'API Key', value: '••••••••••••', description: 'PG API Key' },
        { id: '5', category: 'Notifications', key: 'Push Service', value: 'Firebase FCM', description: 'Push 알림 서비스' },
        { id: '6', category: 'Notifications', key: 'SMS Provider', value: 'NHN Cloud', description: 'SMS 발송 서비스' },
        { id: '7', category: 'PM5', key: 'API Endpoint', value: 'ws://localhost:8080', description: 'PM5 WebSocket 연결' },
        { id: '8', category: 'PM5', key: 'Connection Status', value: 'Disconnected', description: 'PM5 연결 상태' },
    ]);

    const categories = [...new Set(configs.map(c => c.category))];

    const categoryIcons: Record<string, string> = { Supabase: '🟢', PG: '💳', Notifications: '🔔', PM5: '📡' };

    return (
        <div className="p-8 lg:p-12">
            <header className="mb-12">
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
                    <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em]">Infrastructure</span>
                </div>
                <h1 className="text-4xl font-black text-white uppercase">System <span className="opacity-20 font-light ml-2">Link</span></h1>
            </header>

            <div className="space-y-8">
                {categories.map((cat) => (
                    <section key={cat}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xl">{categoryIcons[cat] || '⚙️'}</span>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">{cat}</h3>
                        </div>
                        <div className="glass-card rounded-2xl overflow-hidden">
                            {configs.filter(c => c.category === cat).map((config, i, arr) => (
                                <div key={config.id} className={`grid grid-cols-12 gap-4 items-center p-5 ${i < arr.length - 1 ? 'border-b border-white/[0.03]' : ''}`}>
                                    <div className="col-span-3"><p className="text-xs font-black text-white uppercase">{config.key}</p><p className="text-[9px] text-[var(--text-muted)] mt-0.5">{config.description}</p></div>
                                    <div className="col-span-7">
                                        <code className="text-xs text-[var(--primary)] bg-white/[0.03] px-3 py-1.5 rounded-lg font-mono">{config.value}</code>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <button className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-white/[0.03] border border-white/5 text-white hover:border-[var(--primary)]/50 transition-all">Edit</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {/* Connection Test */}
            <div className="mt-12 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                <h3 className="text-sm font-black text-white uppercase mb-4">🔗 Connection Test</h3>
                <div className="flex gap-3">
                    <button className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all">Supabase 연결 테스트</button>
                    <button className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">PG 연결 테스트</button>
                    <button className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all">PM5 연결 테스트</button>
                </div>
            </div>
        </div>
    );
}
