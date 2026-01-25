"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";
import { Calendar as CalendarIcon, Filter, Clock, Users, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Session {
    id: string;
    title: string;
    coach_name: string;
    start_time: string;
    end_time: string;
    intensity: 'Low' | 'Medium' | 'High';
    capacity: number;
    enrolled: number;
}

export default function SchedulePage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchSessions = async () => {
            setLoading(true);
            // Simulating real sessions data
            const { data, error } = await supabase.from("sessions").select("*");

            if (error) {
                setSessions([
                    { id: '1', title: 'HIIT Cardio Elite', coach_name: 'Mark Wilson', start_time: '2026-01-25T09:00:00', end_time: '2026-01-25T10:00:00', intensity: 'High', capacity: 20, enrolled: 12 },
                    { id: '2', title: 'Vinyasa Flow', coach_name: 'Sarah Chen', start_time: '2026-01-25T11:00:00', end_time: '2026-01-25T12:00:00', intensity: 'Medium', capacity: 15, enrolled: 15 },
                    { id: '3', title: 'Power Lifting Base', coach_name: 'Mark Wilson', start_time: '2026-01-25T14:30:00', end_time: '2026-01-25T15:30:00', intensity: 'High', capacity: 10, enrolled: 4 },
                ]);
            } else {
                setSessions(data || []);
            }
            setLoading(false);
        };
        fetchSessions();
    }, [supabase]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Schedule</h1>
                    <p className="text-muted text-sm font-medium">Find your perfect session</p>
                </div>
                <button className="p-3 bg-surface border border-border rounded-2xl text-muted hover:text-primary transition-colors">
                    <Filter size={18} />
                </button>
            </header>

            {/* Date Carousel Placeholder */}
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1">
                {[25, 26, 27, 28, 29].map((day, i) => (
                    <button key={day} className={`flex-shrink-0 w-16 py-4 rounded-3xl flex flex-col items-center gap-1 transition-all ${i === 0 ? "bg-primary text-on-primary shadow-lg shadow-primary/20" : "bg-surface border border-border text-muted"
                        }`}>
                        <span className="text-[10px] font-bold uppercase opacity-60">{i === 0 ? "Today" : "Jan"}</span>
                        <span className="text-lg font-black">{day}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {loading ? (
                    [1, 2].map(i => <div key={i} className="h-32 bg-surface2 rounded-3xl animate-pulse"></div>)
                ) : (
                    sessions.map((session) => (
                        <Link key={session.id} href={`/apps/schedule/${session.id}`} className="block group">
                            <div className="bg-surface p-5 rounded-[2rem] border border-border shadow-soft flex items-center gap-5 group-hover:border-primary/30 transition-all active:scale-[0.98]">
                                <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex flex-col items-center justify-center border border-primary/5">
                                    <Clock size={20} />
                                    <span className="text-[10px] font-black mt-1">
                                        {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${session.intensity === 'High' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                                            }`}>
                                            {session.intensity} intensity
                                        </span>
                                    </div>
                                    <h3 className="font-exrabold text-base tracking-tight truncate group-hover:text-primary transition-colors">{session.title}</h3>
                                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest">{session.coach_name}</p>

                                    <div className="mt-3 flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-muted">
                                            <Users size={12} />
                                            <span className="text-[10px] font-bold">{session.enrolled}/{session.capacity} Slots</span>
                                        </div>
                                        {session.enrolled >= session.capacity && (
                                            <span className="text-[10px] font-black text-danger uppercase italic">Full</span>
                                        )}
                                    </div>
                                </div>

                                <ChevronRight size={20} className="text-muted opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
