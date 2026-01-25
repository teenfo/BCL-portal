"use client";

import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Calendar, MapPin, ArrowRight, Home, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function BookingConfirmationPage() {
    const params = useParams();
    const router = useRouter();
    const [isBooked, setIsBooked] = useState(false);

    const handleBook = () => {
        setIsBooked(true);
        // Real logic would be a supabase call
    };

    if (isBooked) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-700">
                <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center mb-8 animate-bounce">
                    <CheckCircle2 size={48} />
                </div>
                <h1 className="text-3xl font-black tracking-tighter mb-2">Booking Confirmed!</h1>
                <p className="text-muted text-sm font-medium mb-12 max-w-xs mx-auto">
                    You're all set for the HIIT Cardio Elite. We've added it to your schedule.
                </p>

                <div className="w-full space-y-4">
                    <Link href="/apps/dashboard" className="block w-full bg-primary text-on-primary py-4 rounded-2xl font-black shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">
                        Back to Home
                    </Link>
                    <Link href="/apps/schedule" className="block w-full bg-surface2 text-fg py-4 rounded-2xl font-black active:scale-[0.98] transition-all">
                        Browse more sessions
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-2xl font-black tracking-tight">Confirm Booking</h1>
                <p className="text-muted text-sm font-medium">Review your session details</p>
            </header>

            <div className="bg-surface rounded-3xl border border-border shadow-soft overflow-hidden">
                <div className="p-6 bg-primary/5 border-b border-border">
                    <h2 className="text-lg font-black tracking-tight">HIIT Cardio Elite</h2>
                    <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">Instructor: Mark Wilson</p>
                </div>
                <div className="p-6 space-y-5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-surface2 text-muted flex items-center justify-center">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Date & Time</p>
                            <p className="text-sm font-black">Today, 09:00 AM - 10:00 AM</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-surface2 text-muted flex items-center justify-center">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Location</p>
                            <p className="text-sm font-black">BCL Central Branch, Studio A</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
                <div className="flex items-center gap-3">
                    <Zap className="text-primary fill-primary/20" size={20} />
                    <p className="text-xs font-bold leading-relaxed">
                        1 Credit will be deducted from your <span className="text-primary font-black">Iron Pulse Elite</span> plan.
                    </p>
                </div>
            </div>

            <div className="fixed bottom-6 left-6 right-6">
                <button onClick={handleBook} className="w-full bg-primary text-on-primary py-5 rounded-[2rem] font-black shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-3">
                    Confirm Booking
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
}
