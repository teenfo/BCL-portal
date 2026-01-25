export default function AdminDashboard() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface p-6 rounded-2xl border border-border shadow-card">
                    <h3 className="text-muted text-sm font-medium">Total Members</h3>
                    <p className="text-3xl font-bold mt-2">1,234</p>
                </div>
                <div className="bg-surface p-6 rounded-2xl border border-border shadow-card">
                    <h3 className="text-muted text-sm font-medium">Daily Check-ins</h3>
                    <p className="text-3xl font-bold mt-2">89</p>
                </div>
                <div className="bg-surface p-6 rounded-2xl border border-border shadow-card">
                    <h3 className="text-muted text-sm font-medium">Revenue (MTD)</h3>
                    <p className="text-3xl font-bold mt-2">$45,670</p>
                </div>
            </div>

            <div className="bg-surface rounded-2xl border border-border shadow-card p-6">
                <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                        <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs">JD</div>
                        <div>
                            <p className="font-medium text-sm">John Doe checked in</p>
                            <p className="text-xs text-muted">2 mins ago</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
