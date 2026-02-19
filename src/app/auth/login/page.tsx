'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signIn, signInWithOAuth, user, profile, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 이미 로그인된 경우 리다이렉트
    useEffect(() => {
        if (loading) return;
        if (user && profile?.approval_status === 'approved') {
            const redirect = searchParams.get('redirect');
            if (redirect) {
                router.replace(decodeURIComponent(redirect));
            } else if (profile.role === 'admin') {
                router.replace('/admin/dashboard');
            } else if (profile.role === 'coach') {
                router.replace('/coach/dashboard');
            } else {
                router.replace('/apps/dashboard');
            }
        } else if (user && profile?.approval_status === 'pending') {
            router.replace('/auth/pending-approval');
        } else if (user && profile?.approval_status === 'rejected') {
            router.replace('/auth/rejected');
        }
    }, [user, profile, loading, router, searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        const { error: signInError, approvalStatus, role } = await signIn(email, password);

        if (signInError) {
            if (signInError.message?.includes('Invalid login credentials')) {
                setError('이메일 또는 비밀번호가 올바르지 않습니다.');
            } else if (signInError.message?.includes('Email not confirmed')) {
                setError('이메일 인증이 필요합니다. 관리자에게 문의하세요.');
            } else {
                setError(signInError.message || '로그인에 실패했습니다.');
            }
            setSubmitting(false);
            return;
        }

        if (approvalStatus === 'pending') {
            router.replace('/auth/pending-approval');
            return;
        }

        if (approvalStatus === 'rejected') {
            router.replace('/auth/rejected');
            return;
        }

        // 로그인 성공 + 승인 완료 — 적절한 화면으로 리다이렉트
        const redirect = searchParams.get('redirect');
        if (redirect) {
            router.replace(decodeURIComponent(redirect));
        } else if (approvalStatus === 'approved') {
            // signIn이 반환한 role을 직접 사용 (stale closure 방지)
            if (role === 'admin') {
                router.replace('/admin/dashboard');
            } else if (role === 'coach') {
                router.replace('/coach/dashboard');
            } else {
                router.replace('/apps/dashboard');
            }
        }

        setSubmitting(false);
    };

    // 이미 인증 완료된 유저가 리다이렉트 중인 경우에만 스피너 표시
    // loading 중에는 일단 폼을 보여주며, 로딩 완료 후 user가 있으면 useEffect가 리다이렉트 처리
    const isRedirecting = !loading && user && profile;

    if (isRedirecting) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0D0D0E',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        border: '3px solid rgba(255, 255, 255, 0.06)',
                        borderTop: '3px solid #FF6B00',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px',
                    }} />
                    <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 14 }}>리다이렉트 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#0D0D0E',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background Decorations */}
            <div style={{
                position: 'absolute',
                width: 600,
                height: 600,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 107, 0, 0.08) 0%, transparent 70%)',
                top: '-200px',
                left: '-200px',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                width: 400,
                height: 400,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 107, 0, 0.05) 0%, transparent 70%)',
                bottom: '-100px',
                right: '-100px',
                pointerEvents: 'none',
            }} />
            {/* Noise Texture */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
                pointerEvents: 'none',
                opacity: 0.5,
            }} />

            {/* Main Container */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: 440,
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                {/* Brand Logo */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: 40,
                }}>
                    {/* BCL Icon */}
                    <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: 20,
                        background: 'linear-gradient(135deg, #FF6B00 0%, #FF8F3F 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 20,
                        boxShadow: '0 8px 32px rgba(255, 107, 0, 0.25)',
                    }}>
                        <svg width={32} height={32} viewBox="0 0 100 100" fill="none">
                            <path
                                d="M50 10C35 10 25 20 25 35V45C15 50 10 60 10 72C10 85 20 95 50 95C80 95 90 85 90 72C90 60 85 50 75 45V35C75 20 65 10 50 10ZM35 35C35 28 40 22 50 22C60 22 65 28 65 35V42H35V35Z"
                                fill="white"
                            />
                        </svg>
                    </div>
                    <h1 style={{
                        fontSize: 28,
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        margin: 0,
                        color: 'white',
                    }}>
                        BCL <span style={{ color: '#FF6B00' }}>Portal</span>
                    </h1>
                    <p style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase' as const,
                        color: 'rgba(255, 255, 255, 0.3)',
                        marginTop: 6,
                    }}>
                        Crossfit Lounge
                    </p>
                </div>

                {/* Login Card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.12) 0%, rgba(255, 107, 0, 0.03) 40%, rgba(255, 255, 255, 0.03) 100%)',
                    borderRadius: 24,
                    padding: 1,
                }}>
                    <div style={{
                        background: 'rgba(18, 18, 20, 0.95)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        borderRadius: 23,
                        padding: '40px 36px',
                    }}>
                        {/* Header */}
                        <div style={{ marginBottom: 32 }}>
                            <h2 style={{
                                fontSize: 22,
                                fontWeight: 700,
                                color: 'white',
                                margin: '0 0 6px 0',
                            }}>
                                Welcome Back
                            </h2>
                            <p style={{
                                fontSize: 14,
                                color: 'rgba(255, 255, 255, 0.4)',
                                margin: 0,
                            }}>
                                포털에 접속하려면 계정 정보를 입력하세요
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div style={{
                                marginBottom: 24,
                                padding: '12px 16px',
                                borderRadius: 12,
                                fontSize: 13,
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                textAlign: 'center' as const,
                                animation: 'shake 0.4s ease-in-out',
                            }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Email */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    marginBottom: 8,
                                    marginLeft: 2,
                                }}>
                                    이메일
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: 16,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'rgba(255, 255, 255, 0.25)',
                                        display: 'flex',
                                    }}>
                                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="name@example.com"
                                        autoComplete="email"
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: 14,
                                            color: 'white',
                                            padding: '14px 16px 14px 46px',
                                            fontSize: 14,
                                            outline: 'none',
                                            transition: 'border-color 0.3s, background 0.3s',
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'rgba(255, 107, 0, 0.5)';
                                            e.target.style.background = 'rgba(255, 255, 255, 0.06)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                            e.target.style.background = 'rgba(255, 255, 255, 0.04)';
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div style={{ marginBottom: 20 }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 8,
                                    marginLeft: 2,
                                }}>
                                    <label style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: 'rgba(255, 255, 255, 0.5)',
                                    }}>
                                        비밀번호
                                    </label>
                                    <Link
                                        href="/auth/reset-password"
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: '#FF6B00',
                                            textDecoration: 'none',
                                            opacity: 0.8,
                                        }}
                                    >
                                        비밀번호 찾기
                                    </Link>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: 16,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'rgba(255, 255, 255, 0.25)',
                                        display: 'flex',
                                    }}>
                                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" />
                                            <path d="M7 11V7a5 5 0 0110 0v4" />
                                        </svg>
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: 14,
                                            color: 'white',
                                            padding: '14px 48px 14px 46px',
                                            fontSize: 14,
                                            outline: 'none',
                                            transition: 'border-color 0.3s, background 0.3s',
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'rgba(255, 107, 0, 0.5)';
                                            e.target.style.background = 'rgba(255, 255, 255, 0.06)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                            e.target.style.background = 'rgba(255, 255, 255, 0.04)';
                                        }}
                                    />
                                    {/* Toggle Password Visibility */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: 14,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'rgba(255, 255, 255, 0.3)',
                                            display: 'flex',
                                            padding: 4,
                                        }}
                                    >
                                        {showPassword ? (
                                            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: 28,
                                marginLeft: 2,
                            }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    cursor: 'pointer',
                                }}>
                                    <div
                                        onClick={() => setRemember(!remember)}
                                        style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: 5,
                                            border: remember ? '2px solid #FF6B00' : '2px solid rgba(255, 255, 255, 0.15)',
                                            background: remember ? '#FF6B00' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s ease',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {remember && (
                                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <span style={{
                                        fontSize: 13,
                                        color: 'rgba(255, 255, 255, 0.45)',
                                    }}>
                                        로그인 상태 유지
                                    </span>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    width: '100%',
                                    padding: '16px 24px',
                                    background: submitting
                                        ? 'rgba(255, 107, 0, 0.6)'
                                        : 'linear-gradient(135deg, #FF6B00 0%, #FF8F3F 100%)',
                                    border: 'none',
                                    borderRadius: 14,
                                    color: 'white',
                                    fontSize: 15,
                                    fontWeight: 700,
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: submitting ? 'none' : '0 4px 24px rgba(255, 107, 0, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                }}
                                onMouseEnter={(e) => {
                                    if (!submitting) {
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 6px 32px rgba(255, 107, 0, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(255, 107, 0, 0.3)';
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <svg style={{ animation: 'spin 1s linear infinite' }} width={18} height={18} viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                                            <path d="M12 2a10 10 0 019.7 7.5" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                        인증 중...
                                    </>
                                ) : (
                                    '로그인'
                                )}
                            </button>
                        </form>

                        {/* Social Login Divider */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            margin: '28px 0',
                        }}>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.06)' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>OR</span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.06)' }} />
                        </div>

                        {/* Kakao Login Button */}
                        <button
                            type="button"
                            onClick={() => signInWithOAuth('kakao')}
                            disabled={submitting}
                            style={{
                                width: '100%',
                                padding: '14px 24px',
                                background: '#FEE500',
                                border: 'none',
                                borderRadius: 14,
                                color: '#191919',
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                opacity: submitting ? 0.6 : 1,
                            }}
                            onMouseEnter={(e) => {
                                if (!submitting) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(254, 229, 0, 0.3)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {/* Kakao Icon */}
                            <svg width={20} height={20} viewBox="0 0 512 512" fill="#191919">
                                <path d="M255.5 48C299.345 48 339.897 56.5332 377.156 73.5996C414.415 90.666 443.871 113.873 465.522 143.22C487.174 172.566 498 204.577 498 239.252C498 273.926 487.174 305.982 465.522 335.42C443.871 364.857 414.46 388.109 377.291 405.175C340.122 422.241 299.525 430.775 255.5 430.775C241.607 430.775 227.262 429.781 212.467 427.795C177.504 457.237 140.968 479.131 102.858 493.479C96.1702 496.146 89.4849 498.312 82.8023 499.974C78.7692 500.971 75.8161 501.385 73.9432 501.218C71.2365 500.966 69.2067 499.845 67.8539 497.854C66.4169 496.031 65.9878 493.66 66.5668 490.742C66.9792 488.822 68.2525 485.816 70.3866 481.722C72.5207 477.629 74.571 474.293 76.5374 471.714C85.2498 460.263 93.7689 446.662 102.095 430.912C19.3726 388.024 0 331.613 0 239.252C0 204.577 10.8264 172.566 32.4793 143.22C54.1322 113.873 83.5879 90.666 120.847 73.5996C158.106 56.5332 198.66 48 255.5 48ZM255.5 96C222.133 96 190.467 101.867 160.5 113.6C130.533 125.333 106.4 141.867 88.1 163.2C69.8 184.533 60.65 208.133 60.65 234C60.65 259.867 69.8 283.467 88.1 304.8C106.4 326.133 130.533 342.667 160.5 354.4C190.467 366.133 222.133 372 255.5 372C275.773 372 296.047 369.733 316.32 365.2L339.5 360.133L358.167 374.8C375.833 388.267 394.5 399.467 414.167 408.4C407.367 395.067 401.567 381.133 396.767 366.6L386.5 335.2L410.367 316.133C425.967 303.867 438.333 289.333 447.467 272.533C456.6 255.733 461.167 237.6 461.167 218.133C461.167 193.467 452.433 171.2 435.167 151.333C417.9 131.467 394.133 115.733 363.867 104.133C333.6 92.5333 301.133 96 255.5 96Z" />
                            </svg>
                            카카오로 시작하기
                        </button>

                        {/* Signup Link */}
                        <div style={{
                            marginTop: 28,
                            paddingTop: 24,
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            textAlign: 'center' as const,
                        }}>
                            <p style={{
                                fontSize: 13,
                                color: 'rgba(255, 255, 255, 0.4)',
                                margin: 0,
                            }}>
                                아직 계정이 없으신가요?{' '}
                                <Link
                                    href="/auth/signup"
                                    style={{
                                        fontWeight: 700,
                                        color: 'white',
                                        textDecoration: 'none',
                                        marginLeft: 4,
                                        transition: 'color 0.2s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#FF6B00'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = 'white'; }}
                                >
                                    회원가입
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: 40,
                    textAlign: 'center' as const,
                }}>
                    <p style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase' as const,
                        color: 'rgba(255, 255, 255, 0.15)',
                        margin: 0,
                    }}>
                        © 2026 BCL Portal • Premium Authentication System
                    </p>
                </div>
            </div>

            {/* Inline Keyframe Styles */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-6px); }
                    50% { transform: translateX(6px); }
                    75% { transform: translateX(-4px); }
                }
                input::placeholder {
                    color: rgba(255, 255, 255, 0.2) !important;
                }
            `}</style>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0D0D0E',
            }}>
                <div style={{
                    width: 48,
                    height: 48,
                    border: '3px solid rgba(255, 255, 255, 0.06)',
                    borderTop: '3px solid #FF6B00',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
