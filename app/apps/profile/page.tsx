"use client";

import { useUser } from "@/assets/theme/hooks/user-context";

export default function ProfilePage() {
    const { user, signOut } = useUser();

    const handleLogout = async () => {
        await signOut();
        window.location.href = "/apps/auth/login";
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col items-center">
                <div className="w-24 h-24 bg-primary-soft rounded-full mb-4 flex items-center justify-center border-4 border-surface shadow-card overflow-hidden">
                    <span className="text-3xl font-bold text-primary">
                        {user?.email?.charAt(0).toUpperCase() || "U"}
                    </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                    {user?.email?.split('@')[0] || "Member"}
                </h1>
                <p className="text-muted text-sm font-medium opacity-80">{user?.email}</p>
            </header>

            <div className="bg-surface rounded-2xl border border-border divide-y divide-border overflow-hidden shadow-card">
                <div className="p-4 flex justify-between items-center hover:bg-surface2 transition-colors cursor-pointer">
                    <span className="text-sm font-medium">My Membership</span>
                    <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-full uppercase">Standard</span>
                </div>
                <div className="p-4 flex justify-between items-center hover:bg-surface2 transition-colors cursor-pointer">
                    <span className="text-sm font-medium">Payment History</span>
                    <span className="text-xs text-muted">→</span>
                </div>
                <div className="p-4 flex justify-between items-center hover:bg-surface2 transition-colors cursor-pointer">
                    <span className="text-sm font-medium">Security Settings</span>
                    <span className="text-xs text-muted">→</span>
                </div>
            </div>

            <button
                onClick={handleLogout}
                className="w-full bg-danger/10 text-danger border border-danger/20 py-4 rounded-2xl font-bold hover:bg-danger/20 transition-all active:scale-[0.98]"
            >
                Sign Out
            </button>

            <p className="text-center text-[10px] text-muted uppercase tracking-widest opacity-50">BCL Mobile Core v1.0</p>
        </div>
    );
}
