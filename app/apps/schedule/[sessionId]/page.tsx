"use client";

export const runtime = "edge";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, Users, Shield, Star, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SessionDetailPage() {
    const params = useParams();
    const router = useRouter();

    // Simulated session data
    const session = {
        id: params.sessionId,
        title: "HIIT Cardio Elite",
        coach_name: "Mark Wilson",
        start_time: "2026-01-25T09:00:00",
        end_time: "2026-01-25T10:00:00",
        intensity: "High",
        capacity: 20,
        enrolled: 12,
        description: "High-intensity interval training designed to push your limits and maximize calorie burn. Focus on explosive movements and cardiovascular endurance."
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-500">
            <header className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-3 bg-surface border border-border rounded-2xl text-muted hover:text-fg transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-black tracking-tight">Session Details</h1>
            </header>

            {/* Hero */}
            <div className="relative aspect-[4/3] rounded-[3rem] overflow-hidden bg-primary shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8">
                    <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit mb-4">
                        {session.intensity} Intensity
                    </span>
                    <h2 className="text-3xl font-black text-white leading-tight">{session.title}</h2>
                </div>
                {/* Decorative circle */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Time</p>
                        <p className="text-sm font-black">60 Mins</p>
                    </div>
                </div>
                <div className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-success/10 text-success flex items-center justify-center">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Status</p>
                        <p className="text-sm font-black">{session.capacity - session.enrolled} Left</p>
                    </div>
                </div>
            </div>

            {/* Coach Info */}
            <section className="bg-surface rounded-3xl p-6 border border-border shadow-soft">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted mb-4">Instructor</h3>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center font-black text-xl">
                        M
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p className="font-black text-base">{session.coach_name}</p>
                            <Shield size={14} className="text-primary fill-primary/10" />
                        </div>
                        <p className="text-xs text-muted font-medium">Strength & Conditioning Expert</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <Star size={16} className="text-warning fill-warning" />
                        <span className="text-[10px] font-black">4.9</span>
                    </div>
                </div>
            </section>

            {/* Description */}
            <section className="px-1">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">About the Session</h3>
                <p className="text-sm text-muted font-medium leading-relaxed">
                    {session.description}
                </p>
            </section>

            {/* Bottom CTA */}
            <div className="fixed bottom-6 left-6 right-6 z-50">
                <Link href={`/apps/bookings/new/${session.id}`} className="block w-full bg-primary text-on-primary py-5 rounded-[2rem] font-black text-center shadow-2xl shadow-primary/40 active:scale-95 transition-all">
                    Secure Your Spot
                </Link>
            </div>

            <div className="h-20 md:hidden"></div>
        </div>
    );
}
