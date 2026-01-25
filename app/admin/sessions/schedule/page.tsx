export default function SessionsPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Session Schedule</h1>
                <button className="bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold shadow-card">New Session</button>
            </div>

            <div className="bg-surface rounded-2xl border border-border shadow-card p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="text-4xl mb-4">🗓️</div>
                    <p className="text-muted text-sm font-medium">Calendar visualization will go here.</p>
                </div>
            </div>
        </div>
    );
}
