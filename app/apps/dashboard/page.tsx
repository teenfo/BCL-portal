"use client";

import { Bell, QrCode, Calendar, ChevronRight, Zap } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/assets/theme/hooks/user-context";

export default function UserDashboard() {
    const { user } = useUser();

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header Greeting */}
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-xs text-muted font-bold uppercase tracking-wider mb-1">Welcome back</p>
                    <h1 className="text-2xl font-black tracking-tight">{user?.email?.split('@')[0] || "Member"}</h1>
                </div>
                <div className="w-10 h-10 rounded-full bg-surface2 border border-border flex items-center justify-center font-bold text-sm">
                    {user?.email?.charAt(0).toUpperCase() || "M"}
                </div>
            </div>

            {/* Quick Check-in Card */}
            <div className="bg-primary text-on-primary rounded-3xl p-6 shadow-xl shadow-primary/30 relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                        <QrCode size={32} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black tracking-tight">Tap to Check-in</h2>
                        <p className="text-white/80 text-xs font-medium mt-1">Scan for entry at the desk</p>
                    </div>
                </div>
            </div>

            {/* Today's Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex flex-col justify-between h-32">
                    <div className="w-8 h-8 rounded-xl bg-surface2 flex items-center justify-center text-primary">
                        <Calendar size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Next Session</p>
                        <p className="font-exrabold text-sm mt-1">HIIT Cardio</p>
                        <p className="text-[10px] text-muted">19:00 • Studio A</p>
                    </div>
                </div>
                <div className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex flex-col justify-between h-32">
                    <div className="w-8 h-8 rounded-xl bg-surface2 flex items-center justify-center text-success">
                        <Zap size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Membership</p>
                        <p className="font-exrabold text-sm mt-1">Active</p>
                        <p className="text-[10px] text-muted">24 Days Left</p>
                    </div>
                </div>
            </div>

            {/* Recent Notices */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-sm font-bold">Latest Updates</h3>
                    <Link href="/apps/notices" className="text-[10px] font-black text-primary uppercase">View All</Link>
                </div>
                <div className="bg-surface rounded-3xl border border-border p-5 shadow-soft space-y-4">
                    <div className="flex gap-4 items-start pb-4 border-b border-border/50">
                        <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0"></div>
                        <div>
                            <p className="text-xs font-bold leading-tight">Holiday Operating Hours Update</p>
                            <p className="text-[10px] text-muted mt-1">Gym will close at 6 PM on...</p>
                        </div>
                    </div>
                    <div className="flex gap-4 items-start">
                        <div className="w-2 h-2 mt-2 rounded-full bg-muted shrink-0"></div>
                        <div>
                            <p className="text-xs font-bold leading-tight">New Yoga Class Added</p>
                            <p className="text-[10px] text-muted mt-1">Join Coach Sarah every Tue...</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-surface2/30 rounded-3xl p-6 text-center">
                <p className="text-xs font-bold text-muted mb-4">Quick Links</p>
                <div className="flex justify-around">
                    <Link href="/apps/schedule" className="flex flex-col items-center gap-2 group">
                        <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center group-hover:border-primary/50 transition-colors">
                            <Calendar size={20} className="text-muted group-hover:text-primary" />
                        </div>
                        <span className="text-[10px] font-bold text-muted">Book</span>
                    </Link>
                    <Link href="/apps/membership" className="flex flex-col items-center gap-2 group">
                        <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center group-hover:border-primary/50 transition-colors">
                            <Zap size={20} className="text-muted group-hover:text-primary" />
                        </div>
                        <span className="text-[10px] font-bold text-muted">Plan</span>
                    </Link>
                    <Link href="/apps/support" className="flex flex-col items-center gap-2 group">
                        <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center group-hover:border-primary/50 transition-colors">
                            <Bell size={20} className="text-muted group-hover:text-primary" />
                        </div>
                        <span className="text-[10px] font-bold text-muted">Support</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
