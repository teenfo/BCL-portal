export default function CheckinPage() {
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold">Check-in</h1>
                <p className="text-muted text-sm">Scan your QR code at the facility</p>
            </header>
            <div className="bg-white p-8 rounded-3xl shadow-card aspect-square max-w-[280px] mx-auto flex flex-col items-center justify-center border border-border">
                <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
                    <span className="text-slate-400 font-mono text-xs text-center px-4">QR CODE PLACEHOLDER</span>
                </div>
                <p className="mt-6 text-sm font-bold text-primary">SCAN ME</p>
            </div>
            <p className="text-center text-muted text-xs px-8">QR code refreshes every 30 seconds for your security.</p>
        </div>
    );
}
