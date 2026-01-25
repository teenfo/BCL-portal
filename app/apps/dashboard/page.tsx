import Link from "next/link";
import { Zap, Clock, CheckCircle2, Star, ChevronRight } from "lucide-react";

export default function AppsDashboard() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Link href="/apps/membership" className="block group">
                <section className="bg-primary rounded-[2rem] p-6 text-on-primary shadow-lg overflow-hidden relative transition-transform active:scale-[0.98]">
                    <div className="relative z-10">
                        <h2 className="text-sm font-medium opacity-80">Good Morning,</h2>
                        <p className="text-2xl font-black">Member</p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <span className="p-1 px-3 rounded-full bg-white/20 backdrop-blur-sm">Monthly Plan</span>
                            <span className="opacity-80">12 Days Left</span>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                </section>
            </Link>

            <section className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-lg font-black tracking-tight">Today's Session</h3>
                    <Link href="/apps/schedule" className="text-[10px] font-black uppercase text-primary tracking-widest">View All</Link>
                </div>
                <div className="bg-surface p-4 rounded-3xl border border-border shadow-soft flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-surface2 flex flex-col items-center justify-center border border-border">
                        <span className="text-[10px] font-bold text-primary uppercase">Jan</span>
                        <span className="text-lg font-black">25</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-sm tracking-tight truncate">HIIT Cardio Elite</p>
                        <p className="text-[10px] text-muted font-bold uppercase">09:00 AM • Mark</p>
                    </div>
                    <Link href="/apps/checkin" className="bg-primary text-on-primary p-2.5 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all">
                        Check-in
                    </Link>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-4">
                <Link href="/apps/checkin/history" className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex flex-col items-center gap-3 active:scale-[0.98] transition-transform">
                    <div className="w-10 h-10 rounded-2xl bg-success/10 text-success flex items-center justify-center">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-muted font-black uppercase tracking-tighter">Attendance</p>
                        <p className="font-black text-lg">95%</p>
                    </div>
                </Link>
                <Link href="/apps/membership" className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex flex-col items-center gap-3 active:scale-[0.98] transition-transform">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <Star size={20} />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-muted font-black uppercase tracking-tighter">Credits</p>
                        <p className="font-black text-lg">120</p>
                    </div>
                </Link>
            </section>

            {/* Latest Notice Shortcut */}
            <Link href="/apps/notices" className="block p-4 border border-border rounded-3xl bg-surface2/30 active:scale-[0.98] transition-transform">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest px-1">
                    <span className="flex items-center gap-2 text-primary">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping"></span>
                        LATEST NOTICE
                    </span>
                    <ChevronRight size={12} />
                </div>
            </Link>
        </div>
    );
}
