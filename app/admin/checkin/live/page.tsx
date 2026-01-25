"use client";

import { Activity, Users, DoorOpen, ShieldCheck, MapPin, Search, Filter } from "lucide-react";
import { useState } from "react";

export default function LiveCheckinMonitor() {
    const [activeMembers, setActiveMembers] = useState([
        { id: 1, name: "Alice Kim", checkin: "09:12 AM", facility: "Central Branch", zone: "Zone A (Weights)", status: "Active" },
        { id: 2, name: "Mark Wilson", checkin: "09:05 AM", facility: "Central Branch", zone: "Zone B (Cardio)", status: "Active" },
        { id: 3, name: "Sarah Chen", checkin: "08:45 AM", facility: "Central Branch", zone: "Yoga Studio", status: "Active" },
        { id: 4, name: "David Park", checkin: "08:30 AM", facility: "Central Branch", zone: "Recovery Hub", status: "Active" },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-black tracking-tight">Real-time Monitor</h1>
                        <span className="flex items-center gap-1.5 text-danger bg-danger/10 px-2 py-0.5 rounded-full text-[10px] font-black uppercase italic">
                            <span className="w-1.5 h-1.5 bg-danger rounded-full animate-pulse"></span>
                            LIVE
                        </span>
                    </div>
                    <p className="text-muted text-sm font-medium">Currently active members across all zones.</p>
                </div>
                <div className="flex items-center gap-4 bg-surface p-2 px-6 rounded-2xl border border-border shadow-soft">
                    <div className="text-center border-r border-border pr-4">
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Active Now</p>
                        <p className="text-xl font-black text-primary">48</p>
                    </div>
                    <div className="text-center pl-4">
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Zone Capacity</p>
                        <p className="text-xl font-black text-fg">62%</p>
                    </div>
                </div>
            </div>

            <div className="bg-surface rounded-3xl border border-border shadow-soft overflow-hidden">
                <div className="p-6 border-b border-border flex flex-wrap gap-4 items-center justify-between bg-surface2/30">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                            <input type="text" placeholder="Filter active members..." className="bg-surface border border-border pl-9 pr-4 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 w-64" />
                        </div>
                        <button className="bg-surface border border-border px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-surface2">
                            <MapPin size={14} />
                            All Zones
                        </button>
                    </div>
                    <button className="p-2.5 border border-border rounded-xl text-muted hover:bg-surface2"><Filter size={18} /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-border border-b border-border">
                    {activeMembers.map((member) => (
                        <div key={member.id} className="p-6 space-y-4 hover:bg-surface2/20 transition-colors group">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center font-black text-lg group-hover:bg-primary group-hover:text-on-primary transition-all">
                                    {member.name.charAt(0)}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tighter text-muted bg-surface2 px-2 py-0.5 rounded italic">
                                    Since {member.checkin}
                                </span>
                            </div>
                            <div>
                                <h3 className="font-extrabold text-sm tracking-tight">{member.name}</h3>
                                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5">{member.zone}</p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                <div className="flex items-center gap-1.5">
                                    <ShieldCheck size={14} className="text-success" />
                                    <span className="text-[10px] font-bold text-success uppercase">Verified</span>
                                </div>
                                <button className="text-[10px] font-black text-primary hover:underline uppercase">Action</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-surface2/10 flex items-center justify-center">
                    <button className="text-muted text-[10px] font-black uppercase tracking-widest hover:text-fg transition-colors">
                        Load More Visitors
                    </button>
                </div>
            </div>
        </div>
    );
}
