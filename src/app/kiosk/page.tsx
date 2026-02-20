'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';

export default function KioskIdlePage() {
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState('');
    const [currentDate, setCurrentDate] = useState('');
    const [displayMessage, setDisplayMessage] = useState('화면을 터치하여 체크인하세요');
    const [notices, setNotices] = useState<string[]>([]);
    const [noticeIndex, setNoticeIndex] = useState(0);
    const touchAreaRef = useRef<HTMLDivElement>(null);

    // 시간 업데이트
    useEffect(() => {
        const update = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }));
            setCurrentDate(now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }));
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, []);

    // DB에서 키오스크 메시지, 공지 불러오기
    const loadData = useCallback(async () => {

        // 키오스크 메시지
        const { data: kioskData } = await query('kiosk_devices')
            
            .select('display_message')
            .eq('status', 'active')
            .not('display_message', 'is', null)
            .limit(1);

        if (kioskData && kioskData.length > 0 && kioskData[0].display_message) {
            setDisplayMessage(kioskData[0].display_message);
        }

        // 공지사항
        const { data: noticeData } = await query('notices')
            
            .select('title')
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(5);

        if (noticeData && noticeData.length > 0) {
            setNotices(noticeData.map((n: { title: string }) => n.title));
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // 공지 자동 슬라이드
    useEffect(() => {
        if (notices.length <= 1) return;
        const interval = setInterval(() => {
            setNoticeIndex((prev) => (prev + 1) % notices.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [notices]);

    // Heartbeat (30초 간격)
    useEffect(() => {
        const heartbeat = async () => {
            await query('kiosk_devices')
                
                .update({ last_heartbeat: new Date().toISOString() })
                .eq('status', 'active')
                .limit(1);
        };
        heartbeat();
        const timer = setInterval(heartbeat, 30000);
        return () => clearInterval(timer);
    }, []);

    const handleTouch = () => {
        router.push('/kiosk/scan');
    };

    return (
        <div
            ref={touchAreaRef}
            onClick={handleTouch}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'linear-gradient(160deg, #0a0a0b 0%, #111113 40%, #0d0d0e 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                fontFamily: "'Lexend', sans-serif",
                overflow: 'hidden',
            }}
        >
            {/* Background accents */}
            <div style={{
                position: 'absolute',
                top: '-20%', left: '-10%',
                width: '60vw', height: '60vw',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,107,0,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-20%', right: '-10%',
                width: '50vw', height: '50vw',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,107,0,0.04) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Header: Logo + Time */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '40px 60px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #FF6B00, #FF8A3D)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', fontWeight: 900, color: 'white',
                    }}>B</div>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em' }}>BCL FITNESS</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '48px', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {currentTime}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                        {currentDate}
                    </div>
                </div>
            </div>

            {/* Main: Touch Icon + Message */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '32px',
                zIndex: 1,
            }}>
                {/* Pulsing Touch Icon */}
                <div style={{
                    position: 'relative',
                    width: '140px', height: '140px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {/* Pulse rings */}
                    <div className="kiosk-pulse-ring" style={{
                        position: 'absolute', inset: '-20px',
                        borderRadius: '50%',
                        border: '2px solid rgba(255,107,0,0.15)',
                        animation: 'kioskPulse 2s ease-in-out infinite',
                    }} />
                    <div className="kiosk-pulse-ring" style={{
                        position: 'absolute', inset: '-40px',
                        borderRadius: '50%',
                        border: '1px solid rgba(255,107,0,0.08)',
                        animation: 'kioskPulse 2s ease-in-out infinite 0.5s',
                    }} />
                    {/* Icon circle */}
                    <div style={{
                        width: '120px', height: '120px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(255,107,0,0.15) 0%, rgba(255,107,0,0.05) 100%)',
                        border: '2px solid rgba(255,107,0,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'kioskFloat 3s ease-in-out infinite',
                    }}>
                        {/* Touch hand SVG */}
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 11V6a2 2 0 00-4 0v5" />
                            <path d="M14 10V4a2 2 0 00-4 0v6" />
                            <path d="M10 10.5V6a2 2 0 00-4 0v8" />
                            <path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.76 0-3.77-1-6-4l-1.25-2a2 2 0 013.46-2L6 15" />
                        </svg>
                    </div>
                </div>

                {/* Main message */}
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '44px',
                        fontWeight: 800,
                        color: 'white',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                        marginBottom: '16px',
                    }}>
                        {displayMessage}
                    </h1>
                    <p style={{
                        fontSize: '20px',
                        fontWeight: 400,
                        color: 'rgba(255,255,255,0.4)',
                        letterSpacing: '0.02em',
                    }}>
                        QR 코드를 준비해주세요
                    </p>
                </div>
            </div>

            {/* Footer: Notices */}
            <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                padding: '32px 60px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        영업시간
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>
                        06:00 - 23:00
                    </span>
                </div>

                {notices.length > 0 && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        maxWidth: '500px',
                    }}>
                        <span style={{
                            fontSize: '10px', fontWeight: 800,
                            color: '#FF6B00',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            flexShrink: 0,
                        }}>공지</span>
                        <span style={{
                            fontSize: '13px',
                            color: 'rgba(255,255,255,0.5)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {notices[noticeIndex]}
                        </span>
                    </div>
                )}
            </div>

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes kioskPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.15); opacity: 0.3; }
                }
                @keyframes kioskFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
            `}</style>
        </div>
    );
}
