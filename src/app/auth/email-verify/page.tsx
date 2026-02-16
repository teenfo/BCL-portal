'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function EmailVerifyPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        if (!user) {
            // 로그인하지 않은 경우 로그인 페이지로
            router.push('/auth/login');
            return;
        }

        // 3초 카운트다운
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // 역할 기반 리다이렉트
                    const role = user.user_metadata?.role || 'member';
                    if (role === 'admin') router.push('/admin');
                    else if (role === 'coach') router.push('/coach');
                    else router.push('/apps');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [user, router]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-black to-gray-900">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse"></div>
            </div>

            {/* Success Card */}
            <div className="relative w-full max-w-md text-center">
                {/* Glassmorphism Card */}
                <div className="backdrop-blur-xl bg-white/5 rounded-3xl p-12 shadow-2xl border border-white/10">
                    {/* Success Icon with Glow */}
                    <div className="relative inline-block mb-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto">
                            <svg
                                className="w-14 h-14 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        {/* Glow Effect - 애니메이션 효과 추가 */}
                        <div className="absolute inset-0 bg-green-500/40 rounded-full blur-3xl animate-pulse"></div>
                    </div>

                    {/* Success Message */}
                    <h1 className="text-3xl font-bold text-white mb-4">
                        Email Verified!
                    </h1>
                    <p className="text-white/60 text-base mb-8">
                        Your email has been successfully verified.
                        <br />
                        Redirecting you to the portal...
                    </p>

                    {/* Countdown */}
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/10">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-white/80 text-sm font-medium">
                            Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-8 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-1000"
                            style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* Card Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-green-400/10 rounded-3xl blur-2xl -z-10 animate-pulse"></div>
            </div>
        </div>
    );
}
