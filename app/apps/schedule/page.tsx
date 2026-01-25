export default function SchedulePage() {
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold">Schedule</h1>
                <p className="text-muted text-sm">Find and book your next session</p>
            </header>
            <div className="bg-surface rounded-2xl border border-border p-8 text-center">
                <div className="w-16 h-16 bg-surface2 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📅</div>
                <h3 className="font-bold">No sessions found</h3>
                <p className="text-muted text-sm mt-1">Check back later or adjust your filters.</p>
            </div>
        </div>
    );
}
