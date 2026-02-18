'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

interface MemberInfo {
    name: string;
    phone: string | null;
}

interface ReservationInfo {
    class_name: string;
    start_time: string;
}

interface MembershipInfo {
    remaining_sessions: number | null;
    plan_name: string;
}

function SuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const memberId = searchParams.get('member');

    const [member, setMember] = useState<MemberInfo | null>(null);
    const [reservation, setReservation] = useState<ReservationInfo | null>(null);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [countdown, setCountdown] = useState(5);
    const [showContent, setShowContent] = useState(false);

    // 회원 정보 로드
    const loadMemberInfo = useCallback(async () => {
        if (!memberId) return;
        const supabase = createClient();

        // 회원 기본 정보
        const { data: memberData } = await supabase
            .from('members')
            .select('name, phone')
            .eq('id', memberId)
            .single();

        if (memberData) {
            setMember(memberData);
        }

        // 오늘 예약
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const { data: reservationData } = await supabase
            .from('reservations')
            .select('class_name, start_time')
            .eq('member_id', memberId)
            .gte('start_time', `${todayStr}T00:00:00`)
            .lte('start_time', `${todayStr}T23:59:59`)
            .eq('status', 'confirmed')
            .order('start_time', { ascending: true })
            .limit(1);

        if (reservationData && reservationData.length > 0) {
            setReservation(reservationData[0]);
        }

        // 멤버십 잔여 횟수
        const { data: membershipData } = await supabase
            .from('memberships')
            .select('remaining_sessions, plans(name)')
            .eq('member_id', memberId)
            .eq('status', 'active')
            .order('end_date', { ascending: false })
            .limit(1);

        if (membershipData && membershipData.length > 0) {
            const m = membershipData[0] as { remaining_sessions: number | null; plans: { name: string } | null };
            setMembership({
                remaining_sessions: m.remaining_sessions,
                plan_name: m.plans?.name || '일반',
            });
        }
    }, [memberId]);

    useEffect(() => {
        loadMemberInfo();
        // 콘텐츠 표시 애니메이션
        setTimeout(() => setShowContent(true), 100);
    }, [loadMemberInfo]);

    // 카운트다운 (5→0 후 복귀)
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    router.push('/kiosk');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [router]);

    const formatTime = (timeStr: string) => {
        const d = new Date(timeStr);
        return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(160deg, #0a0a0b 0%, #0d1a0e 40%, #0d0d0e 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Lexend', sans-serif",
            overflow: 'hidden',
        }}>
            {/* Green gradient accent */}
            <div style={{
                position: 'absolute',
                top: '10%', left: '30%',
                width: '40vw', height: '40vw',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Main content */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '28px',
                transform: showContent ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                opacity: showContent ? 1 : 0,
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                zIndex: 1,
            }}>
                {/* Success icon */}
                <div style={{
                    position: 'relative',
                    width: '120px', height: '120px',
                }}>
                    {/* Glow */}
                    <div style={{
                        position: 'absolute', inset: '-20px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)',
                    }} />
                    {/* Circle */}
                    <div style={{
                        width: '120px', height: '120px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(34,197,94,0.3)',
                    }}>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20,6 9,17 4,12" />
                        </svg>
                    </div>
                </div>

                {/* Message */}
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '52px',
                        fontWeight: 900,
                        color: 'white',
                        letterSpacing: '-0.03em',
                        lineHeight: 1.1,
                        marginBottom: '12px',
                    }}>
                        체크인 완료!
                    </h1>
                    <p style={{
                        fontSize: '36px',
                        fontWeight: 700,
                        color: '#FF6B00',
                        lineHeight: 1.2,
                    }}>
                        {member?.name || '회원'}님
                    </p>
                    <p style={{
                        fontSize: '20px',
                        fontWeight: 400,
                        color: 'rgba(255,255,255,0.45)',
                        marginTop: '8px',
                    }}>
                        오늘도 좋은 운동 되세요! 💪
                    </p>
                </div>

                {/* Info cards */}
                <div style={{
                    display: 'flex',
                    gap: '20px',
                    marginTop: '8px',
                }}>
                    {/* Today&apos;s reservation */}
                    <div style={{
                        padding: '24px 32px',
                        borderRadius: '20px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(16px)',
                        minWidth: '200px',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            marginBottom: '12px',
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                                오늘 예약
                            </span>
                        </div>
                        {reservation ? (
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: 'white' }}>
                                    {reservation.class_name}
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 500, color: '#FF6B00', marginTop: '4px' }}>
                                    {formatTime(reservation.start_time)}
                                </div>
                            </div>
                        ) : (
                            <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)' }}>
                                오늘 예약 없음
                            </div>
                        )}
                    </div>

                    {/* Remaining sessions */}
                    <div style={{
                        padding: '24px 32px',
                        borderRadius: '20px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(16px)',
                        minWidth: '200px',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            marginBottom: '12px',
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                <polyline points="22,4 12,14.01 9,11.01" />
                            </svg>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                                남은 횟수
                            </span>
                        </div>
                        {membership ? (
                            <div>
                                <div style={{ fontSize: '32px', fontWeight: 900, color: 'white' }}>
                                    {membership.remaining_sessions !== null ? `${membership.remaining_sessions}회` : '무제한'}
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                                    {membership.plan_name}
                                </div>
                            </div>
                        ) : (
                            <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)' }}>
                                멤버십 정보 없음
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Countdown footer */}
            <div style={{
                position: 'absolute',
                bottom: '40px',
                left: 0, right: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
            }}>
                <span style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.3)',
                }}>
                    {countdown}초 후 자동으로 초기 화면으로 돌아갑니다...
                </span>
                {/* Progress bar */}
                <div style={{
                    width: '200px',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        height: '100%',
                        borderRadius: '2px',
                        background: 'linear-gradient(90deg, #22C55E, #16A34A)',
                        width: `${(countdown / 5) * 100}%`,
                        transition: 'width 1s linear',
                    }} />
                </div>
            </div>
        </div>
    );
}

export default function KioskSuccessPage() {
    return (
        <Suspense fallback={
            <div style={{
                position: 'fixed', inset: 0,
                background: '#0a0a0b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Lexend', sans-serif",
                color: 'rgba(255,255,255,0.4)',
                fontSize: '18px',
            }}>
                로딩 중...
            </div>
        }>
            <SuccessContent />
        </Suspense>
    );
}
