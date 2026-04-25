'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error: resetError } = await resetPassword(email);

        if (resetError) {
            setError(resetError.message);
            setLoading(false);
        } else {
            setSuccess(true);
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

                    {/* Success Message or Form Section */}
                    {success ? (
                        <>
                            {/* Success Inner Box */}
                            <div
                                className="rounded-xl p-8 mb-8 text-center"
                                style={{
                                    background: 'rgba(10, 10, 10, 0.7)',
                                    border: '1px solid rgba(255, 255, 255, 0.02)'
                                }}
                            >
                                {/* Success Icon */}
                                <div
                                    className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6"
                                    style={{ background: 'rgba(34, 197, 94, 0.15)' }}
                                >
                                    <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>

                                {/* Success Title */}
                                <h3 className="text-2xl font-semibold text-white mb-3">Check Your Email!</h3>
                                <p className="text-sm mb-8" style={{ color: 'var(--foreground-secondary)' }}>
                                    We&apos;ve sent a password reset link to{' '}
                                    <strong style={{ color: 'var(--bcl-orange)' }}>{email}</strong>
                                </p>

                                {/* Back to Login */}
                                <Link
                                    href="/auth/login"
                                    className="inline-flex items-center gap-2 py-3 px-6 rounded-lg font-semibold transition-all"
                                    style={{
                                        background: 'var(--bcl-orange)',
                                        color: '#FFFFFF'
                                    }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back to Login
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Form Section - Inner Dark Box */}
                            <div
                                className="rounded-xl p-8 mb-8"
                                style={{
                                    background: 'rgba(10, 10, 10, 0.7)',
                                    border: '1px solid rgba(255, 255, 255, 0.02)'
                                }}
                            >
                                {/* Form Title */}
                                <h2 className="text-2xl font-semibold text-white mb-2">Reset Password</h2>
                                <p className="text-sm mb-6" style={{ color: 'var(--foreground-secondary)' }}>
                                    Enter your email and we&apos;ll send you a reset link
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
                                <form onSubmit={handleSubmit} className="space-y-6">
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

                                    {/* Send Reset Link Button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all disabled:opacity-50"
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
                                        {loading ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                </form>

                                {/* Footer Links */}
                                <div className="mt-6 text-center text-sm">
                                    <span style={{ color: 'var(--foreground-secondary)' }}>Remember password? </span>
                                    <Link
                                        href="/auth/login"
                                        className="font-semibold transition-colors"
                                        style={{ color: 'var(--bcl-orange)' }}
                                    >
                                        Login
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
                        </>
                    )}

                    {/* Footer Section - Copyright */}
                    <div className="text-center">
                        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                            © 2024 BCL Portal. Password Reset. Premium Dark Mode Experience
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
