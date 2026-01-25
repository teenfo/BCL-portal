"use client";

import { useState } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.refresh();
            router.push("/admin/dashboard");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white">
            <div className="w-full max-w-sm bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl">
                <div className="mb-8 text-center text-orange-500">
                    <h1 className="text-2xl font-bold">Admin Portal</h1>
                    <p className="text-slate-400 text-sm mt-1">Authorized Personnel Only</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">Staff ID / Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                            placeholder="admin@bcl.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">Security Key</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-xs px-1 font-medium">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-500 text-white p-3 rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 mt-2"
                    >
                        {loading ? "Verifying..." : "Access System"}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-700 text-center text-[10px] text-slate-500 uppercase tracking-widest">
                    BCL Security Core v1.0
                </div>
            </div>
        </div>
    );
}
