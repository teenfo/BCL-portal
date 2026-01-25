export default function ProfilePage() {
    return (
        <div className="space-y-6">
            <header className="flex flex-col items-center">
                <div className="w-24 h-24 bg-primary-soft rounded-full mb-4 flex items-center justify-center border-4 border-surface shadow-card overflow-hidden">
                    <span className="text-3xl font-bold text-primary">JD</span>
                </div>
                <h1 className="text-2xl font-bold">John Doe</h1>
                <p className="text-muted text-sm">john.doe@example.com</p>
            </header>

            <div className="bg-surface rounded-2xl border border-border divide-y divide-border overflow-hidden shadow-card">
                <div className="p-4 flex justify-between items-center">
                    <span className="text-sm font-medium">My Membership</span>
                    <span className="text-xs text-primary font-bold">Active</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                    <span className="text-sm font-medium">Payment History</span>
                    <span className="text-xs text-muted">→</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                    <span className="text-sm font-medium">Security Settings</span>
                    <span className="text-xs text-muted">→</span>
                </div>
            </div>

            <button className="w-full bg-danger/10 text-danger border border-danger/20 py-3 rounded-2xl font-bold">Log out</button>
        </div>
    );
}
