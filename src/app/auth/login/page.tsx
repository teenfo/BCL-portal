'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function LoginPage() {
    const router = useRouter();
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error: signInError } = await signIn(email, password);

        if (signInError) {
            setError(signInError.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative bg-[var(--background)] overflow-hidden">
            {/* Background Glow Spots */}
            <div className="bcl-glow-spot w-[600px] h-[600px] -top-48 -left-48 opacity-20" />
            <div className="bcl-glow-spot w-[400px] h-[400px] -bottom-24 -right-24 opacity-10" />

            {/* Main Container */}
            <div className="relative w-full max-w-[420px] animate-fade-in">
                {/* Brand Logo & Header */}
                <div className="flex flex-col items-center mb-10">
                    <Logo size={60} className="mb-8" />
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                        <span className="text-white">Portal</span>
                        <span className="text-[var(--primary)] ml-1">.</span>
                    </h1>
                </div>

                {/* Login Card */}
                <div className="premium-card p-1">
                    <div className="bg-[#1A1A1A]/40 backdrop-blur-xl rounded-[calc(var(--radius-md)-4px)] p-8">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Enter your credentials to access the portal
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-red-400 text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="name@example.com"
                                    className="bcl-input"
                                    autoComplete="email"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                                        Password
                                    </label>
                                    <Link
                                        href="/auth/reset-password"
                                        className="text-[11px] font-medium text-[var(--primary)] hover:underline opacity-80"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="bcl-input"
                                    autoComplete="current-password"
                                />
                            </div>

                            <div className="flex items-center gap-2 px-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={remember}
                                            onChange={(e) => setRemember(e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-4 h-4 rounded border border-[var(--border)] peer-checked:bg-[var(--primary)] peer-checked:border-[var(--primary)] transition-all" />
                                        <svg className="absolute inset-0 w-3 h-3 text-white m-auto opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-xs text-[var(--text-secondary)] group-hover:text-white transition-colors">
                                        Remember this session
                                    </span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="bcl-button-primary w-full py-4 mt-4"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Authenticating...
                                    </span>
                                ) : (
                                    'Sign In to Portal'
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-8 border-t border-[var(--border)] text-center">
                            <p className="text-sm text-[var(--text-secondary)]">
                                New to BCL?{' '}
                                <Link
                                    href="/auth/signup"
                                    className="font-bold text-white hover:text-[var(--primary)] transition-colors ml-1"
                                >
                                    Create Account
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-10 text-center">
                    <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">
                        © 2026 BCL PORTAL • PREMIUM AUTHENTICATION SYSTEM
                    </p>
                </div>
            </div>
        </div>
    );
}
