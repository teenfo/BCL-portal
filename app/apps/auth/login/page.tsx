"use client";

import { useState } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";
import { useRouter } from "next/navigation";

export default function AppsLoginPage() {
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
            router.push("/apps/dashboard");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg text-fg">
            <div className="w-full max-w-sm bg-surface p-8 rounded-2xl border border-border shadow-card">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-primary">BCL Login</h1>
                    <p className="text-muted text-sm mt-1">Welcome back, Member!</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-xl border border-border bg-bg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="name@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-xl border border-border bg-bg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-danger text-xs px-1 font-medium">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-on-primary p-3 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-muted">
                    <a href="#" className="hover:text-primary transition-colors">Forgot password?</a>
                </div>
            </div>
        </div>
    );
}
