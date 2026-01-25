export default function AppsDashboard() {
    return (
        <div className="space-y-6">
            <section className="bg-primary rounded-2xl p-6 text-on-primary shadow-lg overflow-hidden relative">
                <div className="relative z-10">
                    <h2 className="text-sm font-medium opacity-80">Good Morning,</h2>
                    <p className="text-2xl font-bold">John Doe</p>
                    <div className="mt-4 flex items-center gap-2 text-sm">
                        <span className="p-1 px-2 rounded-full bg-white/20">Monthly Plan</span>
                        <span className="opacity-80">Expires in 12 days</span>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            </section>

            <section className="space-y-4">
                <h3 className="text-lg font-bold px-1">Upcoming Sessions</h3>
                <div className="bg-surface p-4 rounded-2xl border border-border shadow-card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface2 flex flex-col items-center justify-center border border-border">
                        <span className="text-[10px] font-bold text-primary uppercase">Jan</span>
                        <span className="text-lg font-bold">25</span>
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-sm">HIIT Cardio Elite</p>
                        <p className="text-xs text-muted">09:00 AM • Coach Mark</p>
                    </div>
                    <button className="bg-primary-soft text-primary p-2 px-4 rounded-xl text-xs font-bold">Check-in</button>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-4 pt-6 rounded-2xl border border-border shadow-card flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center">✓</div>
                    <p className="text-xs text-muted">Attendance</p>
                    <p className="font-bold">95%</p>
                </div>
                <div className="bg-surface p-4 pt-6 rounded-2xl border border-border shadow-card flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">★</div>
                    <p className="text-xs text-muted">Credits</p>
                    <p className="font-bold">120</p>
                </div>
            </section>
        </div>
    );
}
