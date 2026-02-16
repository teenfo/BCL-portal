'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

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
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'var(--background)' }}
        >
            {/* Blue Outer Glow Effect */}
            <div className="absolute inset-0 bcl-blue-glow pointer-events-none" />

            {/* Main Card Container */}
            <div className="relative w-full max-w-md">
                {/* Glass Card */}
                <div
                    className="relative rounded-2xl p-10"
                    style={{
                        background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.8) 0%, rgba(20, 20, 20, 0.9) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(20px)'
                    }}
                >
                    {/* Header Section - Logo, Title, Subtitle */}
                    <div className="text-center mb-8">
                        {/* BCL Circle Logo */}
                        <div className="flex justify-center mb-6">
                            <div className="bcl-logo-circle bcl-logo-glow">
                                <span className="text-2xl font-bold text-white">BCL</span>
                            </div>
                        </div>

                        {/* Portal Title */}
                        <h1 className="text-4xl font-bold mb-2">
                            <span className="text-white">BCL </span>
                            <span style={{ color: 'var(--bcl-orange)' }}>Portal</span>
                        </h1>
                        <p
                            className="text-xs font-semibold tracking-wider uppercase"
                            style={{ color: 'var(--bcl-orange)' }}
                        >
                            BUNDANG CROSSFIT LOUNGE
                        </p>
                    </div>

                    {/* Form Section - Inner Dark Box */}
                    <div
                        className="rounded-xl p-8 mb-8"
                        style={{
                            background: 'rgba(10, 10, 10, 0.7)',
                            border: '1px solid rgba(255, 255, 255, 0.02)'
                        }}
                    >
                        {/* Form Title */}
                        <h2 className="text-2xl font-semibold text-white mb-2">Login</h2>
                        <p className="text-sm mb-6" style={{ color: 'var(--foreground-secondary)' }}>
                            Welcome back to BCL Portal
                        </p>

                        {/* Error Message */}
                        {error && (
                            <div
                                className="mb-5 p-3 rounded-lg text-sm text-center"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#F87171'
                                }}
                            >
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email Input */}
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="Email Address"
                                className="bcl-input w-full"
                                autoComplete="email"
                            />

                            {/* Password Input */}
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Password"
                                className="bcl-input w-full"
                                autoComplete="current-password"
                            />

                            {/* Remember Me + Forgot Password */}
                            <div className="flex items-center justify-between text-sm pt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={remember}
                                        onChange={(e) => setRemember(e.target.checked)}
                                        className="w-4 h-4 rounded"
                                        style={{
                                            accentColor: 'var(--bcl-orange)'
                                        }}
                                    />
                                    <span style={{ color: 'var(--foreground-secondary)' }}>
                                        Remember Me
                                    </span>
                                </label>
                                <Link
                                    href="/auth/reset-password"
                                    className="font-medium transition-colors"
                                    style={{ color: 'var(--bcl-orange)' }}
                                >
                                    Forgot Password?
                                </Link>
                            </div>

                            {/* Sign In Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all disabled:opacity-50 mt-6"
                                style={{
                                    background: 'var(--bcl-orange)',
                                    color: '#FFFFFF'
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                                {loading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>

                        {/* Social Login Separator */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t" style={{ borderColor: 'var(--border-color)' }}></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span
                                    className="px-4"
                                    style={{
                                        background: 'rgba(10, 10, 10, 0.7)',
                                        color: 'var(--foreground-secondary)'
                                    }}
                                >
                                    or continue with
                                </span>
                            </div>
                        </div>

                        {/* Social Login Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className="py-3 px-4 rounded-lg border transition-all text-sm font-medium"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-secondary)'
                                }}
                            >
                                Google
                            </button>
                            <button
                                className="py-3 px-4 rounded-lg border transition-all text-sm font-medium"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-secondary)'
                                }}
                            >
                                Kakao
                            </button>
                        </div>

                        {/* Sign Up Link */}
                        <div className="mt-6 text-center text-sm">
                            <span style={{ color: 'var(--foreground-secondary)' }}>
                                Don't have an account?{' '}
                            </span>
                            <Link
                                href="/auth/signup"
                                className="font-semibold transition-colors"
                                style={{ color: 'var(--bcl-orange)' }}
                            >
                                Sign Up
                            </Link>
                        </div>

                        {/* Support Link */}
                        <div className="mt-3 text-center text-sm">
                            <span style={{ color: 'var(--foreground-secondary)' }}>Need help? </span>
                            <a
                                href="#"
                                className="font-medium transition-colors"
                                style={{ color: 'var(--bcl-orange)' }}
                            >
                                Contact Support
                            </a>
                        </div>
                    </div>

                    {/* Footer Section - Copyright */}
                    <div className="text-center">
                        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                            © 2024 BCL Portal. Login. Premium Dark Mode Experience
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
