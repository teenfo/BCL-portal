"use client";

import { Calendar, Filter, MapPin, Users, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function UserSchedulePage() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const [selectedDay, setSelectedDay] = useState(0);

    const sessions = [
        { id: 1, title: 'HIIT Cardio', time: '09:00', coach: 'Mark', duration: '50m', spots: 5 },
        { id: 2, title: 'Yoga Flow', time: '11:00', coach: 'Sarah', duration: '60m', spots: 12 },
        { id: 3, title: 'Strength Pro', time: '14:30', coach: 'Mark', duration: '90m', spots: 2 },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-24">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-black tracking-tight">Schedule</h1>
                <button className="p-2 border border-border rounded-xl text-muted hover:bg-surface2"><Filter size={20} /></button>
            </header>

            {/* Date Scroller */}
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                {days.map((day, i) => (
                    <button
                        key={day}
                        onClick={() => setSelectedDay(i)}
                        className={`flex-shrink-0 w-14 h-20 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 transition-all ${i === selectedDay
                            ? 'bg-primary text-on-primary shadow-lg shadow-primary/30 scale-105'
                            : 'bg-surface border border-border text-muted'
                            }`}
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{day}</span>
                        <span className="text-lg font-black">{25 + i}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted uppercase tracking-widest pl-1">Available Classes</h3>
                {sessions.map((s) => (
                    <div key={s.id} className="bg-surface rounded-3xl p-5 border border-border shadow-soft flex items-center justify-between group active:scale-[0.98] transition-transform">
                        <div className="flex gap-5 items-center">
                            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-surface2 border border-border/50">
                                <span className="text-xs font-black text-fg">{s.time}</span>
                            </div>
                            <div>
                                <h4 className="font-extrabold text-sm tracking-tight">{s.title}</h4>
                                <div className="flex items-center gap-3 mt-1.5 text-muted">
                                    <div className="flex items-center gap-1">
                                        <Users size={12} />
                                        <span className="text-[10px] font-bold">{s.spots} left</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MapPin size={12} />
                                        <span className="text-[10px] font-bold">Studio A</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted group-hover:bg-primary group-hover:text-on-primary group-hover:border-primary transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
