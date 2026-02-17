'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/ui/Logo';

interface Session {
    id: string;
    name: string;
    coach_id: string;
    start_time: string;
    end_time: string;
    capacity: number;
    current_bookings: number;
}

export default function SchedulePage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const loadSessions = useCallback(async () => {
        const supabase = createClient();
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .gte('start_time', startOfDay.toISOString())
            .lte('start_time', endOfDay.toISOString())
            .order('start_time', { ascending: true });

        if (error) {
            console.error('Error loading sessions:', error);
        } else {
            setSessions(data || []);
        }
        setLoading(false);
    }, [selectedDate]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    return (
        <div className="p-8 lg:p-12 transition-all duration-700">
            <header className="flex items-end justify-between mb-12 animate-premium-fade">
                <div className="space-y-4">
                    <Logo size={28} className="opacity-80" collapsed={true} />
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_15px_var(--primary-glow)]"></span>
                            <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em] italic">Operations</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight leading-none uppercase">
                            Class Schedule <span className="opacity-20 font-light ml-2">Management</span>
                        </h1>
                    </div>
                </div>
                <div className="text-right">
                    <input
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        onChange={(e) => setSelectedDate(new Date(e.target.value))}
                        className="bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2 text-sm font-bold text-white outline-none focus:border-[var(--primary)]/50 transition-all"
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-64">
                    <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    {sessions.length === 0 ? (
                        <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                            <span className="text-4xl mb-4">📅</span>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">No sessions scheduled for this date</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {sessions.map((session) => (
                                <div key={session.id} className="grid grid-cols-12 gap-6 items-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                    <div className="col-span-2 text-lg font-black text-white">
                                        {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </div>
                                    <div className="col-span-4">
                                        <h4 className="text-sm font-bold text-white group-hover:text-[var(--primary)] transition-colors uppercase tracking-tight">{session.name}</h4>
                                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">Coach ID: {session.coach_id}</p>
                                    </div>
                                    <div className="col-span-3">
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                                            <div
                                                className="h-full bg-[var(--primary)]"
                                                style={{ width: `${(session.current_bookings / session.capacity) * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                                            {session.current_bookings} / {session.capacity} RESERVED
                                        </p>
                                    </div>
                                    <div className="col-span-3 text-right">
                                        <button className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-[9px] font-black text-white hover:border-[var(--primary)]/50 transition-all uppercase tracking-widest">
                                            Edit Session
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
