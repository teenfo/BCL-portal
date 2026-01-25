"use client";

import { useState } from "react";
import {
    BarChart3,
    Calendar,
    Users,
    TrendingUp,
    ArrowUpRight,
    Filter,
    Download,
    Activity,
    UserCheck
} from "lucide-react";

export default function AttendanceReportsPage() {
    const [timeRange, setTimeRange] = useState("Last 7 Days");

    const stats = [
        { name: "Avg. Daily Check-ins", value: "142", change: "+5.4%", icon: UserCheck },
        { name: "Peak Hour", value: "07:00 PM", sub: "85% Capacity", icon: Activity },
        { name: "Retained Members", value: "92%", change: "+2.1%", icon: Users },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Attendance Analytics</h1>
                    <p className="text-muted text-sm font-medium mt-1">Deep dive into member activity and facility usage.</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="bg-surface border border-border px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                        <option>This Quarter</option>
                    </select>
                    <button className="p-2.5 bg-surface border border-border rounded-xl text-muted hover:text-fg transition-all">
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-surface p-6 rounded-3xl border border-border shadow-soft">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 rounded-2xl bg-surface2 text-primary">
                                <stat.icon size={20} />
                            </div>
                            {stat.change && (
                                <span className="text-[10px] font-black text-success bg-success/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                    <ArrowUpRight size={10} />
                                    {stat.change}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">{stat.name}</p>
                        <p className="text-2xl font-black mt-1">{stat.value}</p>
                        {stat.sub && <p className="text-[10px] text-muted font-medium mt-1 italic">{stat.sub}</p>}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Placeholder */}
                <div className="lg:col-span-2 bg-surface p-8 rounded-3xl border border-border shadow-soft min-h-[400px] flex flex-col">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-8">
                        <BarChart3 size={18} className="text-primary" />
                        Daily Check-in Trends
                    </h3>
                    <div className="flex-1 border-b border-l border-border/50 relative flex items-end justify-around pb-4">
                        {[40, 65, 30, 85, 45, 95, 70].map((val, i) => (
                            <div key={i} className="group relative w-full px-2 lg:px-4">
                                <div
                                    style={{ height: `${val}%` }}
                                    className="bg-primary/20 group-hover:bg-primary rounded-t-lg transition-all duration-500 cursor-pointer relative"
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-fg text-bg text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {val}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Labels */}
                        <div className="absolute top-full left-0 right-0 pt-4 flex justify-around text-[10px] font-bold text-muted uppercase italic">
                            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                        </div>
                    </div>
                </div>

                {/* Distribution / Branch Status */}
                <div className="bg-surface p-8 rounded-3xl border border-border shadow-soft">
                    <h3 className="text-sm font-bold mb-8">Occupancy by Branch</h3>
                    <div className="space-y-6">
                        {[
                            { name: "Central Branch", val: 82, color: "bg-primary" },
                            { name: "West Side Lab", val: 45, color: "bg-success" },
                            { name: "Gangnam Studio", val: 91, color: "bg-danger" },
                        ].map((branch) => (
                            <div key={branch.name} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                    <span>{branch.name}</span>
                                    <span className="text-muted">{branch.val}%</span>
                                </div>
                                <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${branch.val}%` }}
                                        className={`h-full ${branch.color} transition-all duration-1000 shadow-sm`}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-5 bg-surface2/30 rounded-2xl border border-border border-dashed text-center">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Upcoming Peak</p>
                        <p className="text-sm font-black mt-1">Today, 07:30 PM</p>
                        <p className="text-[10px] text-muted font-medium mt-1">Based on historical data</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
