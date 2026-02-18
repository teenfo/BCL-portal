'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';

export default function PendingApprovalPage() {
    const { signOut, user, profile } = useAuth();
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
                        {/* Pending Icon */}
                        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                            style={{ background: 'rgba(245, 158, 11, 0.15)', border: '2px solid rgba(245, 158, 11, 0.3)' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                            </svg>
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-3">승인 대기 중</h1>
                        <p className="text-sm text-[var(--text-secondary)] mb-2 leading-relaxed">
                            회원님의 계정이 아직 관리자의 승인을 기다리고 있습니다.
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mb-8 leading-relaxed">
                            승인이 완료되면 로그인하실 수 있습니다.<br />
                            관리자에게 직접 문의하시면 더 빠른 승인이 가능합니다.
                        </p>

                        {/* User Info */}
                        {user && (
                            <div className="mb-8 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-xs text-[var(--text-muted)] mb-1">가입 이메일</p>
                                <p className="text-sm text-white font-medium">{user.email}</p>
                            </div>
                        )}

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
                        © 2026 BCL PORTAL • ACCOUNT PENDING REVIEW
                    </p>
                </div>
            </div>
        </div>
    );
}
