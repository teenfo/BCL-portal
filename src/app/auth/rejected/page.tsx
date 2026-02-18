'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';

export default function RejectedPage() {
    const { signOut } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push('/auth/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative bg-[var(--background)] overflow-hidden">
            {/* Background Glow Spots */}
            <div className="bcl-glow-spot w-[600px] h-[600px] -top-48 -left-48 opacity-15" />
            <div className="bcl-glow-spot w-[400px] h-[400px] -bottom-24 -right-24 opacity-10" />

            {/* Main Container */}
            <div className="relative w-full max-w-[480px] animate-fade-in">
                {/* Brand */}
                <div className="flex flex-col items-center mb-10">
                    <Logo size={60} className="mb-8" />
                </div>

                {/* Card */}
                <div className="premium-card p-1">
                    <div className="bg-[#1A1A1A]/40 backdrop-blur-xl rounded-[calc(var(--radius-md)-4px)] p-10 text-center">
                        {/* Rejected Icon */}
                        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '2px solid rgba(239, 68, 68, 0.3)' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M15 9l-6 6" />
                                <path d="M9 9l6 6" />
                            </svg>
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-3">가입이 거절되었습니다</h1>
                        <p className="text-sm text-[var(--text-secondary)] mb-2 leading-relaxed">
                            죄송합니다. 관리자에 의해 회원 가입이 승인되지 않았습니다.
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mb-8 leading-relaxed">
                            자세한 사유는 관리자에게 직접 문의해 주세요.
                        </p>

                        <button
                            onClick={handleSignOut}
                            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:bg-white/[0.06]"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            로그인 화면으로 돌아가기
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-10 text-center">
                    <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">
                        © 2026 BCL PORTAL • ACCESS DENIED
                    </p>
                </div>
            </div>
        </div>
    );
}
