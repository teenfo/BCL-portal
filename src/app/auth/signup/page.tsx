'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

type SignupStep = 1 | 2 | 3;

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
    const { signUp } = useAuth();
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
        if (!formData.email) return 'Email is required';
        if (!formData.password) return 'Password is required';
        if (formData.password.length < 6) return 'Password must be at least 6 characters';
        if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
        return null;
    };

    const validateStep2 = () => {
        if (!formData.name) return 'Name is required';
        if (!formData.phone) return 'Phone number is required';
        if (!formData.birthDate) return 'Birth date is required';
        return null;
    };

    const validateStep3 = () => {
        if (!formData.agreeTerms) return 'You must agree to the Terms of Service';
        if (!formData.agreePrivacy) return 'You must agree to the Privacy Policy';
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

        setStep((prev) => Math.min(prev + 1, 3) as SignupStep);
        setError('');
    };

    const handleBack = () => {
        setStep((prev) => Math.max(prev - 1, 1) as SignupStep);
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
                phone: formData.phone,
                birth_date: formData.birthDate,
                role: 'member',
            }
        );

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
        } else {
            router.push('/auth/email-verify');
        }
    };

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
                        Membership Registration
                    </span>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h1>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 mb-8 px-1">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                                className={`h-full bg-[var(--primary)] transition-all duration-500 ease-out shadow-[0_0_10px_var(--primary-glow)]`}
                                style={{ width: s <= step ? '100%' : '0%' }}
                            />
                        </div>
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
                                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                className="bcl-input"
                                                placeholder="name@example.com"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">Password</label>
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => handleInputChange('password', e.target.value)}
                                                className="bcl-input"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">Confirm Password</label>
                                            <input
                                                type="password"
                                                value={formData.confirmPassword}
                                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                                className="bcl-input"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <button onClick={handleNext} className="bcl-button-primary w-full py-4 mt-2">
                                        Proceed to Personal Info
                                    </button>
                                </div>
                            )}

                            {/* Step 2: Personal Info */}
                            {step === 2 && (
                                <div className="space-y-5">
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => handleInputChange('name', e.target.value)}
                                                className="bcl-input"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                                className="bcl-input"
                                                placeholder="010-0000-0000"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1">Birth Date</label>
                                            <input
                                                type="date"
                                                value={formData.birthDate}
                                                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                                                className="bcl-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={handleBack} className="bcl-button-ghost flex-1 py-4">Back</button>
                                        <button onClick={handleNext} className="bcl-button-primary flex-[1.5] py-4">Continue</button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Terms */}
                            {step === 3 && (
                                <div className="space-y-6">
                                    <div className="space-y-4 px-1">
                                        {[
                                            { id: 'agreeTerms', label: 'Terms of Service', sub: 'Agree to our service conditions' },
                                            { id: 'agreePrivacy', label: 'Privacy Policy', sub: 'Agree to our data handling policy' },
                                            { id: 'agreeMarketing', label: 'Marketing Communication', sub: 'Receive updates and promotions (Optional)', optional: true },
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
                                    <div className="flex gap-3">
                                        <button onClick={handleBack} className="bcl-button-ghost flex-1 py-4">Back</button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            className="bcl-button-primary flex-[1.5] py-4"
                                        >
                                            {loading ? 'Registering...' : 'Finalize & Join'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-8 border-t border-[var(--border)] text-center">
                            <p className="text-sm text-[var(--text-secondary)]">
                                Already a member?{' '}
                                <Link
                                    href="/auth/login"
                                    className="font-bold text-white hover:text-[var(--primary)] transition-colors ml-1"
                                >
                                    Sign In instead
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-10 text-center">
                    <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">
                        BY JOINING, YOU AGREE TO OUR TERMS AND POLICIES.
                    </p>
                </div>
            </div>
        </div>
    );
}
