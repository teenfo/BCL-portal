'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

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
        <div className="min-h-screen flex items-center justify-center p-4 bcl-blue-glow" style={{
            background: 'var(--background)'
        }}>
            {/* Main Card */}
            <div className="glass-card w-full max-w-md p-8 relative overflow-hidden">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    {/* BCL Circle Logo */}
                    <div className="relative inline-block mb-4">
                        <div className="bcl-logo-circle bcl-logo-glow mx-auto">
                            <span className="text-2xl font-bold text-white">BCL</span>
                        </div>
                    </div>

                    {/* Portal Title */}
                    <h1 className="text-3xl font-bold mb-1">
                        <span className="text-white">BCL </span>
                        <span style={{ color: 'var(--bcl-orange)' }}>Portal</span>
                    </h1>
                    <p className="text-xs font-semibold tracking-wider"
                        style={{ color: 'var(--bcl-orange)' }}>
                        BUNDANG CROSSFIT LOUNGE
                    </p>
                </div>

                {/* Progress Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex-1 flex items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${s === step
                                            ? 'text-white scale-110'
                                            : s < step
                                                ? 'text-white'
                                                : 'text-white/40'
                                        }`}
                                    style={{
                                        background: s === step
                                            ? 'var(--bcl-orange)'
                                            : s < step
                                                ? 'rgba(239, 108, 0, 0.3)'
                                                : 'var(--background-input)'
                                    }}
                                >
                                    {s}
                                </div>
                                {s < 3 && (
                                    <div
                                        className="flex-1 h-1 mx-2 rounded transition-all"
                                        style={{
                                            background: s < step
                                                ? 'rgba(239, 108, 0, 0.5)'
                                                : 'var(--border-color)'
                                        }}
                                    ></div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="text-center">
                        <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                            Step {step} of 3
                        </p>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-lg border"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderColor: 'rgba(239, 68, 68, 0.3)'
                        }}>
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    </div>
                )}

                {/* Step 1: Email & Password */}
                {step === 1 && (
                    <div className="space-y-5">
                        <h3 className="text-xl font-semibold text-white">Account Info</h3>

                        <div>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="Email Address"
                                className="bcl-input w-full"
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                placeholder="Password (min 6 characters)"
                                className="bcl-input w-full"
                                autoComplete="new-password"
                            />
                        </div>

                        <div>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                placeholder="Confirm Password"
                                className="bcl-input w-full"
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            onClick={handleNext}
                            className="bcl-button w-full"
                        >
                            Next
                        </button>
                    </div>
                )}

                {/* Step 2: Personal Info */}
                {step === 2 && (
                    <div className="space-y-5">
                        <h3 className="text-xl font-semibold text-white">Personal Info</h3>

                        <div>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="Full Name"
                                className="bcl-input w-full"
                                autoComplete="name"
                            />
                        </div>

                        <div>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                placeholder="Phone Number"
                                className="bcl-input w-full"
                                autoComplete="tel"
                            />
                        </div>

                        <div>
                            <input
                                type="date"
                                value={formData.birthDate}
                                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                                className="bcl-input w-full"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleBack}
                                className="py-3 px-4 rounded-lg border transition-all"
                                style={{
                                    background: 'var(--background-input)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground)'
                                }}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleNext}
                                className="bcl-button"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Terms & Conditions */}
                {step === 3 && (
                    <div className="space-y-5">
                        <h3 className="text-xl font-semibold text-white">Terms & Privacy</h3>

                        <div className="space-y-4">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.agreeTerms}
                                    onChange={(e) => handleInputChange('agreeTerms', e.target.checked)}
                                    className="mt-1 w-5 h-5 rounded cursor-pointer"
                                    style={{
                                        background: 'var(--background-input)',
                                        borderColor: 'var(--border-color)'
                                    }}
                                />
                                <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                                    I agree to the{' '}
                                    <span className="underline" style={{ color: 'var(--bcl-orange)' }}>
                                        Terms of Service
                                    </span>
                                </span>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.agreePrivacy}
                                    onChange={(e) => handleInputChange('agreePrivacy', e.target.checked)}
                                    className="mt-1 w-5 h-5 rounded cursor-pointer"
                                    style={{
                                        background: 'var(--background-input)',
                                        borderColor: 'var(--border-color)'
                                    }}
                                />
                                <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                                    I agree to the{' '}
                                    <span className="underline" style={{ color: 'var(--bcl-orange)' }}>
                                        Privacy Policy
                                    </span>
                                </span>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.agreeMarketing}
                                    onChange={(e) => handleInputChange('agreeMarketing', e.target.checked)}
                                    className="mt-1 w-5 h-5 rounded cursor-pointer"
                                    style={{
                                        background: 'var(--background-input)',
                                        borderColor: 'var(--border-color)'
                                    }}
                                />
                                <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                    I want to receive marketing emails (optional)
                                </span>
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <button
                                onClick={handleBack}
                                disabled={loading}
                                className="py-3 px-4 rounded-lg border transition-all disabled:opacity-50"
                                style={{
                                    background: 'var(--background-input)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground)'
                                }}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bcl-button disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating...' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer Links */}
                <div className="text-center mt-6">
                    <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                        Already have an account?{' '}
                        <Link
                            href="/auth/login"
                            className="font-semibold transition-colors"
                            style={{ color: 'var(--bcl-orange)' }}
                        >
                            Sign In
                        </Link>
                    </p>
                </div>

                {/* Copyright */}
                <div className="mt-6 text-center">
                    <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                        © 2024 BCL Portal. Sign Up. Premium Dark Mode Experience
                    </p>
                </div>
            </div>
        </div>
    );
}
