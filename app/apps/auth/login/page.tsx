"use client";

import { useState } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";
import { useRouter } from "next/navigation";
import { ArrowRight, MessageCircle } from "lucide-react";

export default function UserLoginPage() {
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
            router.push("/apps/dashboard");
        }
    };

    const handleKakaoLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'kakao',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) setError(error.message);
    };

    return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
            <div className="w-full max-w-sm space-y-8">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-primary/30">
                        <span className="text-3xl font-black text-on-primary">B</span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter">Welcome Back</h1>
                    <p className="text-muted text-sm font-medium">Sign in to manage your fitness journey</p>
                </div>

                <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-2xl space-y-6">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-surface2 border border-border rounded-xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted/50"
                                placeholder="Email Address"
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-surface2 border border-border rounded-xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted/50"
                                placeholder="Password"
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-danger text-xs font-bold px-2">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 group"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-surface px-4 text-muted font-bold tracking-widest">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={handleKakaoLogin}
                        type="button"
                        className="w-full bg-[#FEE500] text-[#000000] py-4 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                        <MessageCircle size={18} fill="currentColor" />
                        Kakao Login
                    </button>
                </div>

                <p className="text-center text-xs text-muted font-medium">
                    New Member? <span className="text-primary font-bold cursor-pointer hover:underline">Register at Front Desk</span>
                </p>
            </div>
        </div>
    );
}
