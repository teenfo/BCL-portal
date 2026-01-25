"use client";

import { useState } from "react";
import { ClipboardCheck, Search, Filter, Calendar, MapPin, CheckCircle2, Clock } from "lucide-react";

export default function AdminAttendancePage() {
    const [logs, setLogs] = useState([
        { id: 1, name: "Alice Kim", email: "alice@example.com", time: "09:12 AM", facility: "Central Branch", status: "Present" },
        { id: 2, name: "David Park", email: "david@gmail.com", time: "09:05 AM", facility: "Central Branch", status: "Present" },
        { id: 3, name: "Susie Lee", email: "susie@fit.com", time: "08:50 AM", facility: "West Side Lab", status: "Late" },
        { id: 4, name: "Mark Wilson", email: "mark@coach.com", time: "08:30 AM", facility: "Gangnam Studio", status: "Absent" },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Attendance Logs</h1>
                    <p className="text-muted text-sm font-medium mt-1">Audit daily check-ins and member activity records.</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-3 bg-surface border border-border rounded-xl text-muted hover:text-fg"><Calendar size={18} /></button>
                    <button className="p-3 bg-surface border border-border rounded-xl text-muted hover:text-fg"><Filter size={18} /></button>
                </div>
            </div>

            <div className="bg-surface rounded-3xl border border-border shadow-soft overflow-hidden">
                <div className="p-6 border-b border-border flex flex-wrap gap-4 items-center justify-between bg-surface2/30">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Search logs by name or email..."
                            className="w-full bg-surface border border-border pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Total Entry</p>
                            <p className="text-lg font-black text-primary">124</p>
                        </div>
                        <div className="text-center border-l border-border pl-6">
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest">On Time</p>
                            <p className="text-lg font-black text-success">88%</p>
                        </div>
                    </div>
                </div>

                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-surface2/50 text-muted border-b border-border text-[10px] font-black uppercase tracking-widest italic">
                            <th className="p-5">Member</th>
                            <th className="p-5">Entry Time</th>
                            <th className="p-5">Facility</th>
                            <th className="p-5">Status</th>
                            <th className="p-5 text-right">Verification</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-surface2/30 transition-colors group">
                                <td className="p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-surface2 flex items-center justify-center font-black text-xs border border-border">
                                            {log.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm tracking-tight">{log.name}</p>
                                            <p className="text-[10px] text-muted font-medium">{log.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2 text-muted">
                                        <Clock size={12} className="text-primary" />
                                        <span className="text-xs font-bold">{log.time}</span>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2 text-muted">
                                        <MapPin size={12} />
                                        <span className="text-xs font-medium">{log.facility}</span>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${log.status === 'Present' ? 'bg-success/10 text-success' :
                                            log.status === 'Late' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
                                        }`}>
                                        {log.status}
                                    </span>
                                </td>
                                <td className="p-5 text-right">
                                    <CheckCircle2 size={16} className="text-success ml-auto opacity-50 flex" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
