"use client";

import { Calendar as CalendarIcon, Clock, Users, Plus, MoreVertical, MapPin, Filter } from "lucide-react";
import { useState } from "react";

export default function AdminSessionSchedulePage() {
    const [view, setView] = useState('Week');

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const sessions = [
        { id: 1, title: 'HIIT Cardio', time: '09:00 AM', coach: 'Mark Wilson', room: 'Studio A', enrolled: 12, capacity: 20 },
        { id: 2, title: 'Yoga Flow', time: '11:00 AM', coach: 'Sarah Chen', room: 'Yoga Lab', enrolled: 15, capacity: 15 },
        { id: 3, title: 'Strength Pro', time: '14:30 PM', coach: 'Mark Wilson', room: 'Weights Floor', enrolled: 8, capacity: 10 },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Main Schedule</h1>
                    <p className="text-muted text-sm font-medium mt-1">Manage and assign instructors to gym sessions.</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-surface border border-border rounded-xl p-1 flex gap-1">
                        {['Day', 'Week', 'Month'].map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-muted hover:text-fg'
                                    }`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                    <button className="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2">
                        <Plus size={18} />
                        Add Session
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 border-b border-border pb-4">
                {days.map((day, i) => (
                    <div key={day} className={`text-center py-4 rounded-3xl ${i === 0 ? 'bg-primary/5 border border-primary/20' : ''}`}>
                        <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{day}</p>
                        <p className={`text-lg font-black mt-1 ${i === 0 ? 'text-primary' : ''}`}>
                            {25 + i}
                        </p>
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <Clock size={16} className="text-primary" />
                        Today&apos;s Agenda
                    </h3>
                    <button className="p-2 border border-border rounded-lg text-muted"><Filter size={16} /></button>
                </div>

                {sessions.map((session) => (
                    <div key={session.id} className="bg-surface rounded-3xl border border-border shadow-soft p-5 flex items-center gap-6 hover:border-primary/20 transition-all group">
                        <div className="flex flex-col items-center justify-center w-20 py-3 rounded-2xl bg-surface2 border border-border/50">
                            <span className="text-sm font-black text-primary">{session.time.split(' ')[0]}</span>
                            <span className="text-[10px] font-bold text-muted uppercase">{session.time.split(' ')[1]}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-sm tracking-tight">{session.title}</h4>
                            <div className="flex items-center gap-4 mt-1">
                                <div className="flex items-center gap-1.5 text-muted">
                                    <MapPin size={12} />
                                    <span className="text-[10px] font-bold">{session.room}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-muted">
                                    <Users size={12} />
                                    <span className="text-[10px] font-bold">{session.enrolled}/{session.capacity} Booked</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-muted text-sm">Select dates to view scheduled classes or click &quot;Add Session&quot; to create a new one.</p>
                                <p className="text-xs font-black">{session.coach}</p>
                            </div>
                            <button className="p-2 text-muted hover:bg-surface2 rounded-xl transition-colors">
                                <MoreVertical size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
