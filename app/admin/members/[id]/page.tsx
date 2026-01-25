"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Calendar, Shield, CreditCard, Clock, CheckCircle2 } from "lucide-react";

export default function AdminMemberDetailPage() {
    const params = useParams();
    const router = useRouter();

    const member = {
        id: params.id,
        name: "Alice Kim",
        email: "alice@example.com",
        phone: "010-1234-5678",
        joined_date: "Jan 12, 2025",
        status: "Active",
        plan: "Iron Pulse Elite",
        credits: 120,
        history: [
            { id: 1, date: "Jan 25, 2026", activity: "HIIT Cardio", status: "Present" },
            { id: 2, date: "Jan 23, 2026", activity: "Yoga Flow", status: "Present" },
            { id: 3, date: "Jan 21, 2026", activity: "Open Gym", status: "Present" },
        ]
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-3 bg-surface border border-border rounded-2xl text-muted hover:text-fg transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-black tracking-tight">Member Profile</h1>
                    <p className="text-muted text-[10px] font-black uppercase tracking-widest">ID: {member.id}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Summary Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-surface p-8 rounded-[3rem] border border-border shadow-soft text-center relative overflow-hidden">
                        <div className="w-24 h-24 rounded-[2rem] bg-primary-soft text-primary flex items-center justify-center font-black text-3xl mx-auto mb-6 relative z-10">
                            {member.name.charAt(0)}
                        </div>
                        <h2 className="text-2xl font-black tracking-tighter">{member.name}</h2>
                        <p className="text-xs text-muted font-medium mb-8">{member.email}</p>

                        <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-success/10">
                            <CheckCircle2 size={12} />
                            {member.status}
                        </div>

                        <div className="mt-10 pt-10 border-t border-border space-y-4">
                            <div className="flex items-center gap-3 text-left">
                                <Phone size={16} className="text-muted" />
                                <span className="text-xs font-bold">{member.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 text-left">
                                <Calendar size={16} className="text-muted" />
                                <span className="text-xs font-bold text-muted">Joined {member.joined_date}</span>
                            </div>
                        </div>
                    </div>

                    <button className="w-full bg-danger/10 text-danger border border-danger/20 py-4 rounded-2xl font-bold hover:bg-danger/20 transition-all text-sm">
                        Suspend Membership
                    </button>
                </div>

                {/* Right Side: Details & History */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface p-6 rounded-3xl border border-border shadow-soft">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield size={20} className="text-primary" />
                                <p className="text-[10px] font-black text-muted uppercase tracking-widest">Current Plan</p>
                            </div>
                            <p className="text-lg font-black tracking-tight">{member.plan}</p>
                            <button className="text-[10px] font-black text-primary uppercase mt-2 hover:underline">Change Plan →</button>
                        </div>
                        <div className="bg-surface p-6 rounded-3xl border border-border shadow-soft">
                            <div className="flex items-center gap-3 mb-4">
                                <CreditCard size={20} className="text-success" />
                                <p className="text-[10px] font-black text-muted uppercase tracking-widest">Balance</p>
                            </div>
                            <p className="text-lg font-black tracking-tight">{member.credits} Credits</p>
                            <button className="text-[10px] font-black text-success uppercase mt-2 hover:underline">Add Credits →</button>
                        </div>
                    </div>

                    <div className="bg-surface rounded-[2.5rem] border border-border shadow-soft overflow-hidden">
                        <div className="p-6 border-b border-border bg-surface2/30 flex justify-between items-center">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Clock size={16} className="text-muted" />
                                Recent Attendance
                            </h3>
                            <button className="text-[10px] font-black text-primary uppercase">Full Log →</button>
                        </div>
                        <div className="divide-y divide-border">
                            {member.history.map((h) => (
                                <div key={h.id} className="p-5 flex items-center justify-between hover:bg-surface2/30 transition-colors">
                                    <div>
                                        <p className="text-sm font-bold tracking-tight">{h.activity}</p>
                                        <p className="text-[10px] text-muted font-bold uppercase">{h.date}</p>
                                    </div>
                                    <span className="text-[10px] font-black text-success uppercase tracking-widest bg-success/10 px-2 py-0.5 rounded italic">
                                        {h.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
