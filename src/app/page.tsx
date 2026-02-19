'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/* ─── Role-based dashboard path helper ─── */
function getDashboardPath(role?: string): string {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'coach') return '/coach/dashboard';
    return '/apps/dashboard';
}

function getDashboardLabel(role?: string): string {
    if (role === 'admin') return '관리자';
    if (role === 'coach') return '코치';
    return '내 대시보드';
}
/* ─────────────────────── Types ─────────────────────── */
interface Coach {
    id: string;
    name: string;
    specialties: string[] | null;
    bio: string | null;
    profile_image_url: string | null;
}

interface Plan {
    id: string;
    name: string;
    price: number;
    duration_days: number;
    credit_count: number | null;
    description: string | null;
    is_active: boolean;
}

interface Facility {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    operating_hours: any;
}

/* ─────────────── Scroll Animation Hook ─────────────── */
function useScrollReveal() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisible(true); },
            { threshold: 0.15 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return { ref, visible };
}

/* ═══════════════════════════════════════════════════════
   SECTION COMPONENTS
   ═══════════════════════════════════════════════════════ */

/* ─────── Sticky Navbar ─────── */
function Navbar({ user, profile }: { user: any; profile: any }) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, []);

    const links = [
        { label: 'Features', href: '#features' },
        { label: 'Programs', href: '#programs' },
        { label: 'Coaches', href: '#coaches' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Location', href: '#facility' },
    ];

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            padding: scrolled ? '12px 0' : '20px 0',
            background: scrolled ? 'rgba(10,10,15,0.92)' : 'transparent',
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
            transition: 'all 0.4s cubic-bezier(.4,0,.2,1)',
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <Image src="/images/logo/bcl-logo-white.svg" alt="BCL" width={36} height={36} priority />
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.03em' }}>BCL</span>
                </Link>

                {/* Desktop Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="landing-nav-desktop">
                    {links.map(l => (
                        <a key={l.href} href={l.href} style={{
                            fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)',
                            textDecoration: 'none', transition: 'color 0.2s', letterSpacing: '0.02em',
                        }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                        >{l.label}</a>
                    ))}
                    {user ? (
                        <Link href={getDashboardPath(profile?.role)} style={{
                            fontSize: 13, fontWeight: 700, color: '#0a0a0f', background: 'var(--primary)',
                            padding: '8px 20px', borderRadius: 8, textDecoration: 'none', transition: 'all 0.2s',
                        }}>{getDashboardLabel(profile?.role)}</Link>
                    ) : (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <Link href="/auth/login" style={{
                                fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
                                padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
                                border: '1px solid rgba(255,255,255,0.12)', transition: 'all 0.2s',
                            }}>로그인</Link>
                            <Link href="/auth/signup" style={{
                                fontSize: 13, fontWeight: 700, color: '#0a0a0f', background: 'var(--primary)',
                                padding: '8px 20px', borderRadius: 8, textDecoration: 'none', transition: 'all 0.2s',
                            }}>회원가입</Link>
                        </div>
                    )}
                </div>

                {/* Mobile Hamburger */}
                <button
                    className="landing-nav-mobile-btn"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'white' }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        {mobileOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> :
                            <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
                    </svg>
                </button>
            </div>

            {/* Mobile Dropdown */}
            {mobileOpen && (
                <div className="landing-nav-mobile-menu" style={{
                    padding: '16px 24px', background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                    {links.map(l => (
                        <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                            style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', padding: '8px 0' }}
                        >{l.label}</a>
                    ))}
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        {user ? (
                            <Link href={getDashboardPath(profile?.role)} style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#0a0a0f', background: 'var(--primary)', padding: '10px', borderRadius: 8, textDecoration: 'none' }}>{getDashboardLabel(profile?.role)}</Link>
                        ) : (
                            <>
                                <Link href="/auth/login" style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'white', padding: '10px', borderRadius: 8, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>로그인</Link>
                                <Link href="/auth/signup" style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#0a0a0f', background: 'var(--primary)', padding: '10px', borderRadius: 8, textDecoration: 'none' }}>회원가입</Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}

/* ─────── Hero ─────── */
function HeroSection() {
    return (
        <section style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden', padding: '120px 24px 80px',
        }}>
            {/* BG Gradient Orbs */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,0,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
                <div style={{ position: 'absolute', bottom: '-30%', left: '-15%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,0,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
            </div>

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 800 }}>
                <div style={{
                    display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '0.3em',
                    textTransform: 'uppercase', color: 'var(--primary)', padding: '6px 16px', borderRadius: 999,
                    background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', marginBottom: 32,
                }}>
                    Premium Fitness Experience
                </div>

                <h1 style={{
                    fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 900, color: 'white',
                    lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: 24,
                }}>
                    Bundang<br />
                    <span style={{ color: 'var(--primary)' }}>Crossfit</span>{' '}
                    Lounge
                </h1>

                <p style={{
                    fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.5)',
                    lineHeight: 1.6, maxWidth: 500, margin: '0 auto 40px', fontWeight: 300,
                }}>
                    BCL과 함께 당신의 한계를 넘어서세요.<br />
                    스마트한 예약, QR 체크인, 실시간 기록 관리까지.
                </p>

                <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link href="/auth/signup" style={{
                        fontSize: 15, fontWeight: 700, color: '#0a0a0f', background: 'var(--primary)',
                        padding: '14px 36px', borderRadius: 10, textDecoration: 'none',
                        boxShadow: '0 0 30px rgba(255,107,0,0.3)', transition: 'all 0.25s',
                    }}>무료 체험 신청</Link>
                    <Link href="/auth/login" style={{
                        fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)',
                        padding: '14px 36px', borderRadius: 10, textDecoration: 'none',
                        border: '1px solid rgba(255,255,255,0.15)', transition: 'all 0.25s',
                        background: 'rgba(255,255,255,0.03)',
                    }}>로그인</Link>
                </div>

                {/* Scroll hint */}
                <div style={{ marginTop: 64, animation: 'landing-float 3s ease-in-out infinite' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round">
                        <polyline points="7,13 12,18 17,13" /><line x1="12" y1="6" x2="12" y2="18" />
                    </svg>
                </div>
            </div>
        </section>
    );
}

/* ─────── Features ─────── */
function FeaturesSection() {
    const { ref, visible } = useScrollReveal();

    const features = [
        { icon: '📅', title: '스마트 예약', desc: '실시간 수업 예약 및 대기열 관리. 원하는 시간에 원클릭 예약하세요.' },
        { icon: '📱', title: 'QR 체크인', desc: '1초 터치로 출석 체크. 키오스크 또는 앱으로 빠르게 체크인.' },
        { icon: '📊', title: '기록 관리', desc: '운동 기록 추적 및 리더보드. 나의 성장을 한눈에 확인하세요.' },
        { icon: '🏆', title: '레이스 챌린지', desc: '실시간 로잉 레이스 대결. PM5 기기 연동으로 경쟁하세요.' },
    ];

    return (
        <section id="features" ref={ref} style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', color: 'var(--primary)', textTransform: 'uppercase' }}>Features</span>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginTop: 12 }}>
                    더 스마트한 피트니스 경험
                </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                {features.map((f, i) => (
                    <div key={i} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 16, padding: 32, backdropFilter: 'blur(12px)',
                        transition: 'all 0.4s cubic-bezier(.4,0,.2,1)',
                        transform: visible ? 'translateY(0)' : 'translateY(40px)',
                        opacity: visible ? 1 : 0,
                        transitionDelay: `${i * 0.1}s`,
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,107,0,0.2)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 8, letterSpacing: '-0.02em' }}>{f.title}</h3>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontWeight: 300 }}>{f.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

/* ─────── Programs ─────── */
function ProgramsSection() {
    const { ref, visible } = useScrollReveal();

    const programs = [
        { name: 'CrossFit WOD', desc: '매일 새로운 도전, 기능적 움직임과 고강도 훈련', color: '#ff6b00' },
        { name: 'Strength Training', desc: '체계적인 근력 프로그램으로 강해지는 나', color: '#3b82f6' },
        { name: 'Rowing / Endurance', desc: 'PM5 로잉 머신과 함께하는 유산소 챌린지', color: '#10b981' },
        { name: 'Open Gym', desc: '자유롭게 이용하는 개인 트레이닝 시간', color: '#8b5cf6' },
    ];

    return (
        <section id="programs" ref={ref} style={{
            padding: '100px 24px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(255,107,0,0.02) 50%, transparent 100%)',
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 60 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', color: 'var(--primary)', textTransform: 'uppercase' }}>Programs</span>
                    <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginTop: 12 }}>
                        당신에게 맞는 프로그램
                    </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                    {programs.map((p, i) => (
                        <div key={i} style={{
                            position: 'relative', borderRadius: 16, padding: 32, overflow: 'hidden',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                            transition: 'all 0.4s', transform: visible ? 'translateY(0)' : 'translateY(40px)',
                            opacity: visible ? 1 : 0, transitionDelay: `${i * 0.1}s`, cursor: 'pointer',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = `${p.color}33`; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <div style={{ width: 4, height: 32, borderRadius: 2, background: p.color, marginBottom: 20 }} />
                            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: 8 }}>{p.name}</h3>
                            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontWeight: 300 }}>{p.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────── Coaches (DB) ─────── */
function CoachesSection({ coaches }: { coaches: Coach[] }) {
    const { ref, visible } = useScrollReveal();

    return (
        <section id="coaches" ref={ref} style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', color: 'var(--primary)', textTransform: 'uppercase' }}>Coaches</span>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginTop: 12 }}>
                    최고의 코치진
                </h2>
            </div>

            {coaches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                    곧 코치 정보가 업데이트됩니다.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                    {coaches.map((c, i) => (
                        <div key={c.id} style={{
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 16, padding: 28, textAlign: 'center',
                            transition: 'all 0.4s', transform: visible ? 'translateY(0)' : 'translateY(30px)',
                            opacity: visible ? 1 : 0, transitionDelay: `${i * 0.08}s`,
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,107,0,0.2)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
                                background: c.profile_image_url ? `url(${c.profile_image_url}) center/cover` : 'linear-gradient(135deg, var(--primary), #ff8a3d)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid rgba(255,107,0,0.2)', fontSize: 24, fontWeight: 800, color: 'white',
                            }}>
                                {!c.profile_image_url && c.name.charAt(0)}
                            </div>
                            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 6 }}>{c.name}</h3>
                            {c.specialties && c.specialties.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                                    {c.specialties.slice(0, 3).map(s => (
                                        <span key={s} style={{
                                            fontSize: 10, fontWeight: 600, color: 'var(--primary)', padding: '3px 8px',
                                            borderRadius: 6, background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.15)',
                                        }}>{s}</span>
                                    ))}
                                </div>
                            )}
                            {c.bio && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{c.bio}</p>}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

/* ─────── Pricing (DB) ─────── */
function PricingSection({ plans }: { plans: Plan[] }) {
    const { ref, visible } = useScrollReveal();
    const activePlans = plans.filter(p => p.is_active);

    return (
        <section id="pricing" ref={ref} style={{
            padding: '100px 24px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(255,107,0,0.02) 50%, transparent 100%)',
        }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 60 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', color: 'var(--primary)', textTransform: 'uppercase' }}>Pricing</span>
                    <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginTop: 12 }}>
                        투명한 요금제
                    </h2>
                </div>

                {activePlans.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                        곧 요금 정보가 업데이트됩니다.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                        {activePlans.map((p, i) => {
                            const isPopular = i === Math.floor(activePlans.length / 2);
                            return (
                                <div key={p.id} style={{
                                    position: 'relative', borderRadius: 16, padding: 32,
                                    background: isPopular ? 'rgba(255,107,0,0.06)' : 'rgba(255,255,255,0.03)',
                                    border: isPopular ? '1px solid rgba(255,107,0,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                    transition: 'all 0.4s', transform: visible ? 'translateY(0)' : 'translateY(40px)',
                                    opacity: visible ? 1 : 0, transitionDelay: `${i * 0.1}s`,
                                }}>
                                    {isPopular && (
                                        <div style={{
                                            position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                                            fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                                            color: '#0a0a0f', background: 'var(--primary)', padding: '4px 14px', borderRadius: 999,
                                        }}>인기</div>
                                    )}
                                    <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 4, letterSpacing: '-0.02em' }}>{p.name}</h3>
                                    <div style={{ marginBottom: 20 }}>
                                        <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>{(p.price / 10000).toFixed(0)}</span>
                                        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}> 만원</span>
                                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}> / {p.duration_days}일</span>
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24 }}>
                                        {p.credit_count && (
                                            <li style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                ✓ 크레딧 {p.credit_count}회
                                            </li>
                                        )}
                                        <li style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            ✓ {p.duration_days}일 이용권
                                        </li>
                                        {p.description && (
                                            <li style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', padding: '6px 0' }}>
                                                ✓ {p.description}
                                            </li>
                                        )}
                                    </ul>
                                    <Link href="/auth/signup" style={{
                                        display: 'block', textAlign: 'center', fontSize: 14, fontWeight: 700,
                                        padding: '12px', borderRadius: 10, textDecoration: 'none', transition: 'all 0.2s',
                                        color: isPopular ? '#0a0a0f' : 'white',
                                        background: isPopular ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                                        border: isPopular ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                    }}>지금 시작하기</Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}

/* ─────── Facility (DB) ─────── */
function FacilitySection({ facilities }: { facilities: Facility[] }) {
    const { ref, visible } = useScrollReveal();

    return (
        <section id="facility" ref={ref} style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', color: 'var(--primary)', textTransform: 'uppercase' }}>Location</span>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginTop: 12 }}>
                    지점 안내
                </h2>
            </div>

            {facilities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>곧 지점 정보가 업데이트됩니다.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                    {facilities.map((f, i) => (
                        <div key={f.id} style={{
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 16, padding: 32, transition: 'all 0.4s',
                            transform: visible ? 'translateY(0)' : 'translateY(30px)',
                            opacity: visible ? 1 : 0, transitionDelay: `${i * 0.1}s`,
                        }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 16, letterSpacing: '-0.02em' }}>{f.name}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {f.address && (
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
                                        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{f.address}</span>
                                    </div>
                                )}
                                {f.phone && (
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <span style={{ fontSize: 16, flexShrink: 0 }}>📞</span>
                                        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{f.phone}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                    {['🅿️ 주차', '🚿 샤워', '🔐 락커'].map(tag => (
                                        <span key={tag} style={{
                                            fontSize: 11, color: 'rgba(255,255,255,0.4)', padding: '4px 10px',
                                            borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                                        }}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

/* ─────── CTA Banner ─────── */
function CTABanner() {
    const { ref, visible } = useScrollReveal();
    return (
        <section ref={ref} style={{
            padding: '80px 24px', margin: '40px 24px', borderRadius: 24, maxWidth: 1200, marginLeft: 'auto', marginRight: 'auto',
            background: 'linear-gradient(135deg, rgba(255,107,0,0.1) 0%, rgba(255,107,0,0.03) 100%)',
            border: '1px solid rgba(255,107,0,0.15)', textAlign: 'center',
            transform: visible ? 'scale(1)' : 'scale(0.95)', opacity: visible ? 1 : 0, transition: 'all 0.6s cubic-bezier(.4,0,.2,1)',
        }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: 16 }}>
                지금 BCL 멤버가 되어보세요
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: 32, fontWeight: 300 }}>
                첫 방문 시 무료 체험 수업을 제공합니다.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/auth/signup" style={{
                    fontSize: 15, fontWeight: 700, color: '#0a0a0f', background: 'var(--primary)',
                    padding: '14px 36px', borderRadius: 10, textDecoration: 'none',
                    boxShadow: '0 0 30px rgba(255,107,0,0.3)',
                }}>회원가입</Link>
                <a href="#features" style={{
                    fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
                    padding: '14px 36px', borderRadius: 10, textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)',
                }}>둘러보기</a>
            </div>
        </section>
    );
}

/* ─────── Footer ─────── */
function Footer() {
    return (
        <footer style={{
            padding: '60px 24px 40px', borderTop: '1px solid rgba(255,255,255,0.06)',
            marginTop: 40,
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 40 }}>
                    {/* Brand */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <Image src="/images/logo/bcl-logo-white.svg" alt="BCL" width={28} height={28} />
                            <span style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>BCL</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
                            Bundang Crossfit Lounge<br />
                            프리미엄 피트니스 경험
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>서비스</h4>
                        {['수업 예약', 'QR 체크인', '기록 관리', '레이스'].map(s => (
                            <div key={s} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', padding: '4px 0' }}>{s}</div>
                        ))}
                    </div>

                    <div>
                        <h4 style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>고객지원</h4>
                        {['자주 묻는 질문', '1:1 문의', '이용약관', '개인정보처리방침'].map(s => (
                            <div key={s} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', padding: '4px 0' }}>{s}</div>
                        ))}
                    </div>

                    <div>
                        <h4 style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Connect</h4>
                        {['Instagram', 'YouTube', 'KakaoTalk'].map(s => (
                            <div key={s} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', padding: '4px 0' }}>{s}</div>
                        ))}
                    </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
                        © 2026 BCL (Bundang Crossfit Lounge). All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}


/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */
export default function HomePage() {
    const { user, profile } = useAuth();
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [facilities, setFacilities] = useState<Facility[]>([]);

    useEffect(() => {
        const supabase = createClient();

        // Fetch public data (anon RLS enabled)
        const fetchData = async () => {
            const [coachRes, planRes, facilityRes] = await Promise.all([
                supabase.from('coaches').select('id, name, specialties, bio, profile_image_url').limit(8) as any,
                supabase.from('membership_plans').select('id, name, price, duration_days, credit_count, description, is_active').eq('is_active', true).order('price', { ascending: true }) as any,
                supabase.from('facilities').select('id, name, address, phone, operating_hours') as any,
            ]);

            if (coachRes.data) setCoaches(coachRes.data);
            if (planRes.data) setPlans(planRes.data);
            if (facilityRes.data) setFacilities(facilityRes.data);
        };

        fetchData();
    }, []);

    return (
        <>
            <style>{`
                @keyframes landing-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(8px); }
                }
                .landing-nav-mobile-btn { display: none; }
                .landing-nav-mobile-menu { display: none; }
                @media (max-width: 768px) {
                    .landing-nav-desktop { display: none !important; }
                    .landing-nav-mobile-btn { display: block !important; }
                    .landing-nav-mobile-menu { display: flex !important; }
                }
            `}</style>
            <Navbar user={user} profile={profile} />
            <HeroSection />
            <FeaturesSection />
            <ProgramsSection />
            <CoachesSection coaches={coaches} />
            <PricingSection plans={plans} />
            <FacilitySection facilities={facilities} />
            <CTABanner />
            <Footer />
        </>
    );
}
