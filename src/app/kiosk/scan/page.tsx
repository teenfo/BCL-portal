'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';

type ScanState = 'scanning' | 'processing' | 'error';

export default function KioskScanPage() {
    const router = useRouter();
    const scannerRef = useRef<any>(null);
    const scannerContainerId = 'qr-scanner-container';
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [errorMessage, setErrorMessage] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [currentTime, setCurrentTime] = useState('');
    const processingRef = useRef(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const facingModeRef = useRef<'user' | 'environment'>('user');

    // 시각
    useEffect(() => {
        const update = () => {
            setCurrentTime(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }));
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, []);

    // html5-qrcode 초기화
    const startScanner = useCallback(async () => {
        try {
            // Dynamic import to avoid SSR issues
            const { Html5Qrcode } = await import('html5-qrcode');

            const scanner = new Html5Qrcode(scannerContainerId, /* verbose= */ false);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: facingModeRef.current },
                {
                    fps: 10,
                    qrbox: { width: 280, height: 280 },
                    aspectRatio: 1.0,
                    disableFlip: false,
                },
                // onScanSuccess
                (decodedText: string) => {
                    if (!processingRef.current) {
                        processingRef.current = true;
                        processQRCode(decodedText);
                    }
                },
                // onScanFailure - silent (continuously scanning)
                () => { }
            );

            setCameraReady(true);
        } catch (err) {
            console.warn('카메라 접근 불가, 수동 입력 모드로 전환:', err);
            setManualMode(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 스캐너 중지
    const stopScanner = useCallback(async () => {
        try {
            if (scannerRef.current) {
                const state = scannerRef.current.getState?.();
                // Html5QrcodeScannerState.SCANNING = 2
                if (state === 2) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
                scannerRef.current = null;
            }
        } catch (err) {
            console.warn('Scanner stop error:', err);
        }
    }, []);

    useEffect(() => {
        startScanner();
        return () => { stopScanner(); };
    }, [startScanner, stopScanner]);

    // 에러 후 재시작
    const restartScanner = useCallback(() => {
        processingRef.current = false;
        setScanState('scanning');
        setErrorMessage('');
        startScanner();
    }, [startScanner]);

    // 카메라 전환 (전면 ↔ 후면)
    const toggleCamera = useCallback(async () => {
        await stopScanner();
        const newMode = facingModeRef.current === 'user' ? 'environment' : 'user';
        facingModeRef.current = newMode;
        setFacingMode(newMode);
        setCameraReady(false);
        startScanner();
    }, [stopScanner, startScanner]);

    // QR 코드 처리 — JSON { mid, fid, ts, v } 파싱 + 체크인 분기
    const processQRCode = async (code: string) => {
        setScanState('processing');
        await stopScanner();

        try {

            // 1. JSON 파싱
            let parsed: { mid: string; fid: string; ts: number; v: number };
            try {
                parsed = JSON.parse(code);
            } catch {
                setScanState('error');
                setErrorMessage('유효하지 않은 QR 코드입니다');
                setTimeout(restartScanner, 3000);
                return;
            }

            const { mid, fid, ts } = parsed;
            if (!mid || !fid || !ts) {
                setScanState('error');
                setErrorMessage('유효하지 않은 QR 코드입니다');
                setTimeout(restartScanner, 3000);
                return;
            }

            // 2. 타임스탬프 검증 (5분 = 300초 이내)
            const now = Math.floor(Date.now() / 1000);
            if (now - ts > 300) {
                setScanState('error');
                setErrorMessage('QR 코드가 만료되었습니다.\n앱에서 새로 생성해주세요.');
                setTimeout(restartScanner, 4000);
                return;
            }

            // 3. 회원 존재 확인
            const { data: memberData, error: memberErr } = await query('members')
                
                .select('id, user_id, name')
                .eq('id', mid)
                .single();

            if (memberErr || !memberData) {
                setScanState('error');
                setErrorMessage('등록되지 않은 회원입니다');
                setTimeout(restartScanner, 3000);
                return;
            }

            // 4. 중복 체크인 방지 (5분 이내 동일 회원)
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { data: recentCheckin } = await query('checkins')
                
                .select('id')
                .eq('member_id', mid)
                .gte('checkin_time', fiveMinAgo)
                .limit(1);

            if (recentCheckin && recentCheckin.length > 0) {
                setScanState('error');
                setErrorMessage(`${memberData.name || '회원'}님은\n이미 체크인 되었습니다`);
                setTimeout(restartScanner, 3000);
                return;
            }

            // 5. 오늘 수업 예약 확인 (현재 시간 ±30분 이내)
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            let bookingId: string | null = null;
            let sessionId: string | null = null;
            let sessionName = '';
            let sessionTime = '';
            let coachName = '';

            const { data: bookings } = await query('bookings')
                
                .select(`
                    id,
                    session_id,
                    sessions (
                        id,
                        session_date,
                        start_time,
                        end_time,
                        classes ( name ),
                        coaches ( name )
                    )
                `)
                .eq('member_id', mid)
                .eq('status', 'booked')
                .limit(5);

            if (bookings && bookings.length > 0) {
                // 오늘 날짜 + 현재 시간 ±30분 이내 수업 찾기
                const nowMinutes = today.getHours() * 60 + today.getMinutes();

                for (const booking of bookings) {
                    const session = booking.sessions as any;
                    if (!session) continue;

                    // 오늘 날짜인지 확인
                    if (session.session_date !== todayStr) continue;

                    // 수업 시작 시간 ±30분 이내인지 확인
                    if (session.start_time) {
                        const [h, m] = session.start_time.split(':').map(Number);
                        const sessionMinutes = h * 60 + m;
                        if (Math.abs(nowMinutes - sessionMinutes) <= 30) {
                            bookingId = booking.id;
                            sessionId = session.id;
                            sessionName = session.classes?.name || '수업';
                            sessionTime = session.start_time?.slice(0, 5) || '';
                            coachName = session.coaches?.name || '';
                            break;
                        }
                    }
                }
            }

            // 6. 체크인 기록 삽입
            const checkinData: any = {
                member_id: mid,
                facility_id: fid,
                checkin_time: new Date().toISOString(),
                checkin_method: 'kiosk',
            };

            if (bookingId && sessionId) {
                // 수업 체크인
                checkinData.booking_id = bookingId;
                checkinData.session_id = sessionId;
                checkinData.notes = `수업 체크인: ${sessionName}`;
            } else {
                // 시설 출석 체크인
                checkinData.notes = '시설 출석 체크인';
            }

            const { error: checkInError } = await query('checkins')
                
                .insert(checkinData);

            if (checkInError) {
                console.error('Check-in error:', checkInError);
                setScanState('error');
                setErrorMessage('체크인 처리 중 오류가 발생했습니다');
                setTimeout(restartScanner, 3000);
                return;
            }

            // 7. 수업 체크인이면 booking 상태 업데이트
            if (bookingId) {
                await query('bookings')
                    
                    .update({ status: 'attended' })
                    .eq('id', bookingId);
            }

            // 8. 성공 화면으로 이동 (회원 이름 + 체크인 유형 전달)
            const params = new URLSearchParams({
                member: mid,
                name: memberData.name || '',
                type: bookingId ? 'class' : 'facility',
            });
            if (sessionName) params.set('class', sessionName);
            if (sessionTime) params.set('time', sessionTime);
            if (coachName) params.set('coach', coachName);

            router.push(`/kiosk/success?${params.toString()}`);

        } catch (err) {
            console.error('QR processing error:', err);
            setScanState('error');
            setErrorMessage('시스템 오류가 발생했습니다');
            setTimeout(restartScanner, 3000);
        }
    };

    // 수동 입력 처리
    const handleManualSubmit = () => {
        if (manualCode.trim()) {
            processQRCode(manualCode.trim());
        }
    };

    // 취소 → 대기 화면
    const handleCancel = async () => {
        await stopScanner();
        router.push('/kiosk');
    };

    // 자동 복귀 (30초 무동작)
    useEffect(() => {
        const timeout = setTimeout(async () => {
            await stopScanner();
            router.push('/kiosk');
        }, 30000);
        return () => clearTimeout(timeout);
    }, [router, stopScanner]);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#0a0a0b',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Lexend', sans-serif",
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '24px 40px',
                zIndex: 10,
            }}>
                <button
                    onClick={handleCancel}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '14px 28px',
                        borderRadius: '14px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(12px)',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '16px',
                        fontWeight: 600,
                        fontFamily: "'Lexend', sans-serif",
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5" /><polyline points="12,19 5,12 12,5" />
                    </svg>
                    취소
                </button>

                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    color: 'white',
                    letterSpacing: '-0.01em',
                }}>QR 체크인</h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {!manualMode && (
                        <button
                            onClick={toggleCamera}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 20px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                backdropFilter: 'blur(12px)',
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: '13px',
                                fontWeight: 600,
                                fontFamily: "'Lexend', sans-serif",
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
                                <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
                                <polyline points="16 3 19 6 16 9" /><polyline points="8 15 5 18 8 21" />
                            </svg>
                            {facingMode === 'user' ? '후면' : '전면'}
                        </button>
                    )}
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
                        {currentTime}
                    </div>
                </div>
            </div>

            {/* Camera / Scan Area */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
            }}>
                {/* Camera preview via html5-qrcode */}
                {!manualMode && (
                    <div style={{
                        position: 'relative',
                        width: '500px', height: '500px',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        background: '#111',
                    }}>
                        <div
                            id={scannerContainerId}
                            style={{
                                width: '100%', height: '100%',
                                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                                transition: 'transform 0.3s ease',
                            }}
                        />

                        {/* QR Guide overlay */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {/* Corner brackets */}
                            <div style={{ position: 'relative', width: '280px', height: '280px' }}>
                                {/* Top-Left */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0,
                                    width: '40px', height: '40px',
                                    borderTop: '4px solid #FF6B00', borderLeft: '4px solid #FF6B00',
                                    borderRadius: '4px 0 0 0',
                                }} />
                                {/* Top-Right */}
                                <div style={{
                                    position: 'absolute', top: 0, right: 0,
                                    width: '40px', height: '40px',
                                    borderTop: '4px solid #FF6B00', borderRight: '4px solid #FF6B00',
                                    borderRadius: '0 4px 0 0',
                                }} />
                                {/* Bottom-Left */}
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0,
                                    width: '40px', height: '40px',
                                    borderBottom: '4px solid #FF6B00', borderLeft: '4px solid #FF6B00',
                                    borderRadius: '0 0 0 4px',
                                }} />
                                {/* Bottom-Right */}
                                <div style={{
                                    position: 'absolute', bottom: 0, right: 0,
                                    width: '40px', height: '40px',
                                    borderBottom: '4px solid #FF6B00', borderRight: '4px solid #FF6B00',
                                    borderRadius: '0 0 4px 0',
                                }} />

                                {/* Scan line animation */}
                                <div style={{
                                    position: 'absolute',
                                    left: '8px', right: '8px',
                                    height: '2px',
                                    background: 'linear-gradient(90deg, transparent, #FF6B00, transparent)',
                                    animation: 'scanLine 2s ease-in-out infinite',
                                    boxShadow: '0 0 12px rgba(255,107,0,0.5)',
                                }} />
                            </div>
                        </div>

                        {/* Processing overlay */}
                        {scanState === 'processing' && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0.7)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column', gap: '16px',
                            }}>
                                <div style={{
                                    width: '48px', height: '48px',
                                    border: '3px solid rgba(255,255,255,0.2)',
                                    borderTopColor: '#FF6B00',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                }} />
                                <span style={{ color: 'white', fontSize: '18px', fontWeight: 600 }}>처리 중...</span>
                            </div>
                        )}

                        {/* Error overlay */}
                        {scanState === 'error' && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(220,38,38,0.15)',
                                border: '2px solid rgba(220,38,38,0.3)',
                                borderRadius: '24px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column', gap: '16px',
                            }}>
                                <div style={{
                                    width: '64px', height: '64px',
                                    borderRadius: '50%',
                                    background: 'rgba(220,38,38,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </div>
                                <span style={{ color: '#ef4444', fontSize: '20px', fontWeight: 700 }}>{errorMessage}</span>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>잠시 후 다시 시도합니다...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Manual mode */}
                {manualMode && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
                        padding: '48px',
                        borderRadius: '24px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(16px)',
                    }}>
                        <div style={{
                            width: '80px', height: '80px',
                            borderRadius: '50%',
                            background: 'rgba(255,107,0,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="3" height="3" />
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>수동 코드 입력</h2>
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>카메라를 사용할 수 없습니다. 코드를 직접 입력해주세요.</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                                placeholder="QR 코드 입력..."
                                style={{
                                    padding: '16px 24px',
                                    borderRadius: '14px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    fontSize: '18px',
                                    fontFamily: "'Lexend', sans-serif",
                                    width: '320px',
                                    outline: 'none',
                                }}
                            />
                            <button
                                onClick={handleManualSubmit}
                                style={{
                                    padding: '16px 32px',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #FF6B00, #FF8A3D)',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '18px',
                                    fontWeight: 700,
                                    fontFamily: "'Lexend', sans-serif",
                                    cursor: 'pointer',
                                }}
                            >확인</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom guidance */}
            <div style={{
                padding: '24px 40px 36px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
            }}>
                <p style={{ fontSize: '18px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>
                    회원앱에서 QR 코드를 표시해주세요
                </p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>
                    인식이 안될 경우 밝기를 높여주세요
                </p>

                {!manualMode && (
                    <button
                        onClick={() => setManualMode(true)}
                        style={{
                            marginTop: '8px',
                            padding: '10px 24px',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.35)',
                            fontSize: '13px',
                            fontFamily: "'Lexend', sans-serif",
                            cursor: 'pointer',
                        }}
                    >
                        수동 입력으로 전환
                    </button>
                )}

                {scanState === 'scanning' && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        marginTop: '4px',
                    }}>
                        <div style={{
                            width: '8px', height: '8px',
                            borderRadius: '50%',
                            background: '#FF6B00',
                            animation: 'blink 1.5s ease-in-out infinite',
                        }} />
                        <span style={{ fontSize: '13px', color: '#FF6B00', fontWeight: 600 }}>스캔 중...</span>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes scanLine {
                    0% { top: 8px; }
                    50% { top: calc(100% - 10px); }
                    100% { top: 8px; }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </div>
    );
}
