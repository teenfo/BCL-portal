'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

type SignupStep = 1 | 2 | 3 | 'complete';

interface SignupForm {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    phone: string;
    birthDate: string;
    agreeTerms: boolean;
    agreePrivacy: boolean;
    agreeMarketing: boolean;
}

export default function SignupPage() {
    const router = useRouter();
    const { signUp, signInWithOAuth } = useAuth();
    const [step, setStep] = useState<SignupStep>(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<SignupForm>({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        phone: '',
        birthDate: '',
        agreeTerms: false,
        agreePrivacy: false,
        agreeMarketing: false,
    });

    const handleInputChange = (field: keyof SignupForm, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const validateStep1 = () => {
        if (!formData.email) return '이메일을 입력해주세요';
        if (!formData.password) return '비밀번호를 입력해주세요';
        if (formData.password.length < 6) return '비밀번호는 6자 이상이어야 합니다';
        if (formData.password !== formData.confirmPassword) return '비밀번호가 일치하지 않습니다';
        return null;
    };

    const validateStep2 = () => {
        if (!formData.name) return '이름을 입력해주세요';
        if (!formData.phone) return '전화번호를 입력해주세요';
        return null;
    };

    const validateStep3 = () => {
        if (!formData.agreeTerms) return '서비스 이용약관에 동의해주세요';
        if (!formData.agreePrivacy) return '개인정보 처리방침에 동의해주세요';
        return null;
    };

    const handleNext = () => {
        let validationError = null;

        if (step === 1) validationError = validateStep1();
        else if (step === 2) validationError = validateStep2();

        if (validationError) {
            setError(validationError);
            return;
        }

        setStep((prev) => {
            if (typeof prev === 'number') return Math.min(prev + 1, 3) as SignupStep;
            return prev;
        });
        setError('');
    };

    const handleBack = () => {
        setStep((prev) => {
            if (typeof prev === 'number') return Math.max(prev - 1, 1) as SignupStep;
            return prev;
        });
        setError('');
    };

    const handleSubmit = async () => {
        const validationError = validateStep3();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError('');

        const { error: signUpError } = await signUp(
            formData.email,
            formData.password,
            {
                name: formData.name,
                full_name: formData.name,
                phone: formData.phone,
                birth_date: formData.birthDate,
                role: 'member',
            }
        );

        if (signUpError) {
            if (signUpError.message?.includes('already registered')) {
                setError('이미 가입된 이메일입니다.');
            } else {
                setError(signUpError.message || '회원가입에 실패했습니다.');
            }
            setLoading(false);
        } else {
            // 성공 — 승인 대기 안내 화면 표시
            setStep('complete');
            setLoading(false);
        }
    };

    // 완료 화면
    if (step === 'complete') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 relative bg-[var(--background)] overflow-hidden">
                <div className="bcl-glow-spot w-[600px] h-[600px] -top-48 -right-48 opacity-15" />
                <div className="bcl-glow-spot w-[400px] h-[400px] -bottom-24 -left-24 opacity-10" />

                <div className="relative w-full max-w-[480px] animate-fade-in">
                    <div className="flex flex-col items-center mb-8">
                        <Logo size={48} className="mb-6" />
                    </div>

                    <div className="premium-card p-1">
                        <div className="bg-[#1A1A1A]/40 backdrop-blur-xl rounded-[calc(var(--radius-md)-4px)] p-10 text-center">
                            {/* Success Icon */}
                            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                                style={{ background: 'rgba(34, 197, 94, 0.15)', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M9 12l2 2 4-4" />
                                </svg>
                            </div>

                            <h1 className="text-2xl font-bold text-white mb-3">가입 신청 완료!</h1>
                            <p className="text-sm text-[var(--text-secondary)] mb-2 leading-relaxed">
                                회원가입이 성공적으로 접수되었습니다.
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mb-8 leading-relaxed">
                                관리자가 회원님의 가입을 검토 후 승인합니다.<br />
                                승인이 완료되면 로그인하실 수 있습니다.
                            </p>

                            {/* Info Box */}
                            <div className="mb-8 p-4 rounded-xl text-left space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div>
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">이메일</p>
                                    <p className="text-sm text-white font-medium">{formData.email}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">이름</p>
                                    <p className="text-sm text-white font-medium">{formData.name}</p>
                                </div>
                            </div>

                            <Link
                                href="/auth/login"
                                className="block w-full py-3.5 rounded-xl text-sm font-semibold text-white text-center transition-all"
                                style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.2)' }}
                            >
                                로그인 화면으로 가기
                            </Link>
                        </div>
                    </div>

                    <div className="mt-10 text-center">
                        <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">
                            승인은 일반적으로 24시간 이내에 처리됩니다
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative bg-[var(--background)] overflow-hidden">
            {/* Background Glow Spots */}
            <div className="bcl-glow-spot w-[600px] h-[600px] -top-48 -right-48 opacity-15" />
            <div className="bcl-glow-spot w-[400px] h-[400px] -bottom-24 -left-24 opacity-10" />

            {/* Main Container */}
            <div className="relative w-full max-w-[440px] animate-fade-in">
                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                    <Logo size={48} className="mb-6" />
                    <span className="inline-block text-[10px] font-bold tracking-[0.4em] text-[var(--primary)] uppercase mb-2">
                        회원 가입
                    </span>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">계정 만들기</h1>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 mb-8 px-1">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                                className={`h-full bg-[var(--primary)] transition-all duration-500 ease-out shadow-[0_0_10px_var(--primary-glow)]`}
                                style={{ width: typeof step === 'number' && s <= step ? '100%' : '0%' }}
                            />
                        </div>
                    ))}
                </div>

                {/* Step Labels */}
                <div className="flex justify-between mb-6 px-2">
                    {['계정 정보', '개인 정보', '약관 동의'].map((label, i) => (
                        <span key={i} className={`text-[10px] font-semibold tracking-wide transition-colors ${typeof step === 'number' && i + 1 <= step ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                            {label}
                        </span>
                    ))}
                </div>

                {/* Signup Card */}
                <div className="premium-card p-1">
                    <div className="bg-[#1A1A1A]/40 backdrop-blur-xl rounded-[calc(var(--radius-md)-4px)] p-8">
                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-red-400 text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Step 1: Account Info */}
                            {step === 1 && (
                                <div className="space-y-5">
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">이메일</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                className="bcl-input"
                                                placeholder="name@example.com"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">비밀번호</label>
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => handleInputChange('password', e.target.value)}
                                                className="bcl-input"
                                                placeholder="6자 이상 입력"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">비밀번호 확인</label>
                                            <input
                                                type="password"
                                                value={formData.confirmPassword}
                                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                                className="bcl-input"
                                                placeholder="비밀번호 재입력"
                                            />
                                        </div>
                                    </div>
                                    <button onClick={handleNext} className="bcl-button-primary w-full py-4 mt-2">
                                        다음 단계로
                                    </button>
                                </div>
                            )}

                            {/* Step 2: Personal Info */}
                            {step === 2 && (
                                <div className="space-y-5">
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">이름 *</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => handleInputChange('name', e.target.value)}
                                                className="bcl-input"
                                                placeholder="홍길동"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">전화번호 *</label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                                className="bcl-input"
                                                placeholder="010-0000-0000"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">생년월일 (선택)</label>
                                            <input
                                                type="date"
                                                value={formData.birthDate}
                                                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                                                className="bcl-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={handleBack} className="bcl-button-ghost flex-1 py-4">이전</button>
                                        <button onClick={handleNext} className="bcl-button-primary flex-[1.5] py-4">다음</button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Terms */}
                            {step === 3 && (
                                <div className="space-y-6">
                                    <div className="space-y-4 px-1">
                                        {[
                                            { id: 'agreeTerms', label: '서비스 이용약관', sub: '서비스 이용 조건에 동의합니다 (필수)' },
                                            { id: 'agreePrivacy', label: '개인정보 처리방침', sub: '개인정보 수집 및 이용에 동의합니다 (필수)' },
                                            { id: 'agreeMarketing', label: '마케팅 정보 수신', sub: '이벤트 및 프로모션 안내를 받습니다 (선택)', optional: true },
                                        ].map((item) => (
                                            <label key={item.id} className="flex items-center gap-4 cursor-pointer group p-3 rounded-xl hover:bg-white/5 transition-colors">
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData[item.id as keyof SignupForm] as boolean}
                                                        onChange={(e) => handleInputChange(item.id as keyof SignupForm, e.target.checked)}
                                                        className="peer sr-only"
                                                    />
                                                    <div className="w-5 h-5 rounded border border-[var(--border)] peer-checked:bg-[var(--primary)] peer-checked:border-[var(--primary)] transition-all" />
                                                    <svg className="absolute inset-0 w-3.5 h-3.5 text-white m-auto opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-white group-hover:text-[var(--primary)] transition-colors">
                                                        {item.label}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-secondary)]">
                                                        {item.sub}
                                                    </span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>

                                    {/* 관리자 승인 안내 */}
                                    <div className="p-3 rounded-lg text-xs text-center leading-relaxed"
                                        style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
                                        💡 가입 후 관리자 승인이 필요합니다. 승인 완료 후 이용 가능합니다.
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={handleBack} className="bcl-button-ghost flex-1 py-4">이전</button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            className="bcl-button-primary flex-[1.5] py-4"
                                        >
                                            {loading ? '가입 중...' : '가입 신청'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Kakao 간편 가입 - Step 1에서만 표시 */}
                        {step === 1 && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '28px 0', }}>                                    <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.06)' }} />
                                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>OR</span>
                                    <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.06)' }} />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => signInWithOAuth('kakao')}
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '14px 24px',
                                        background: '#FEE500',
                                        border: 'none',
                                        borderRadius: 14,
                                        color: '#191919',
                                        fontSize: 15,
                                        fontWeight: 700,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 10,
                                        opacity: loading ? 0.6 : 1,
                                    }}
                                >
                                    <svg width={20} height={20} viewBox="0 0 512 512" fill="#191919">
                                        <path d="M255.5 48C299.345 48 339.897 56.5332 377.156 73.5996C414.415 90.666 443.871 113.873 465.522 143.22C487.174 172.566 498 204.577 498 239.252C498 273.926 487.174 305.982 465.522 335.42C443.871 364.857 414.46 388.109 377.291 405.175C340.122 422.241 299.525 430.775 255.5 430.775C241.607 430.775 227.262 429.781 212.467 427.795C177.509 457.547 138.204 479.143 94.5518 492.582C85.8498 495.399 76.33 497.762 66 499.669C63.8358 500.124 61.4464 500.535 58.8318 500.9C56.2172 501.266 53.9426 500.262 51.9792 497.89C50.016 495.519 49.9518 492.693 51.7871 489.414C53.6224 486.135 56.546 481.867 60.5579 476.61C64.5698 471.353 67.8543 466.955 70.4112 463.421C72.9682 459.887 76.664 454.819 81.4991 448.219C86.3341 441.618 89.8189 436.421 91.9533 432.628C74.0553 418.188 58.8398 401.939 46.3067 383.879C33.7735 365.819 24.0176 346.448 17.039 325.765C10.0604 305.083 6.5718 283.629 6.5718 261.402C6.5718 239.176 10.0604 218.487 17.039 199.335C24.0176 180.183 33.7735 163.023 46.3067 147.854C58.8398 132.686 74.0553 119.601 91.9533 108.6C109.851 97.598 129.661 89.0424 151.383 82.9332C173.105 76.824 195.746 73.0548 219.305 71.6624L255.5 48Z" />
                                    </svg>
                                    카카오로 간편 가입
                                </button>
                            </>
                        )}

                        <div className="mt-8 pt-8 border-t border-[var(--border)] text-center">
                            <p className="text-sm text-[var(--text-secondary)]">
                                이미 계정이 있나요?{' '}
                                <Link
                                    href="/auth/login"
                                    className="font-bold text-white hover:text-[var(--primary)] transition-colors ml-1"
                                >
                                    로그인하기
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-10 text-center">
                    <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">
                        가입 시 이용약관 및 개인정보 처리방침에 동의하게 됩니다
                    </p>
                </div>
            </div>
        </div>
    );
}
