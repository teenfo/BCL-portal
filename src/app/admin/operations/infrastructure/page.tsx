'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Facility {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
}

export default function InfrastructurePage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            const { data } = await supabase.from('facilities').select('*').order('name');
            if (data) setFacilities(data);
            setLoading(false);
        }
        load();
    }, []);

    const kiosks = [
        { id: '1', name: 'Kiosk-01', branch: 'Main Center', status: 'active', lastPing: '2026-02-17 13:15' },
        { id: '2', name: 'Kiosk-02', branch: 'Gangnam', status: 'active', lastPing: '2026-02-17 13:14' },
        { id: '3', name: 'Kiosk-03', branch: 'Main Center', status: 'offline', lastPing: '2026-02-16 22:00' },
    ];

    return (
        <div className="p-8 lg:p-12">
            <header className="mb-12">
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
                    <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em]">Operations</span>
                </div>
                <h1 className="text-4xl font-black text-white uppercase">Infrastructure <span className="opacity-20 font-light ml-2">Control</span></h1>
            </header>

            {loading ? (
                <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
            ) : (
                <div className="space-y-12">
                    <section>
                        <h3 className="text-xl font-black text-white uppercase mb-6">📱 QR 코드 관리</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {facilities.map((f) => (
                                <div key={f.id} className="glass-card p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-white/[0.03] border border-white/5">🏢</div>
                                        <div><h4 className="text-sm font-black text-white">{f.name}</h4><p className="text-[9px] text-[var(--text-muted)]">{f.address || '-'}</p></div>
                                    </div>
                                    <button className="w-full py-2.5 rounded-xl text-[9px] font-black uppercase bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-all">QR 코드 생성</button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-black text-white uppercase mb-6">🖥️ 키오스크 원격 제어</h3>
                        <div className="space-y-3">
                            {kiosks.map((k) => (
                                <div key={k.id} className="grid grid-cols-12 gap-4 items-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all">
                                    <div className="col-span-3"><h4 className="text-sm font-black text-white">{k.name}</h4><p className="text-[9px] text-[var(--text-muted)]">{k.branch}</p></div>
                                    <div className="col-span-3 flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${k.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                        <span className={`text-[9px] font-black uppercase ${k.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>{k.status}</span>
                                    </div>
                                    <div className="col-span-3"><p className="text-[10px] text-white">{k.lastPing}</p></div>
                                    <div className="col-span-3 text-right">
                                        <button className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase ${k.status === 'active' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
                                            {k.status === 'active' ? '중지' : '시작'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
