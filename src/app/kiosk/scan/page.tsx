'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ── 간단한 QR 디코더 유틸 ────────────────────────────
// 실제 환경에서는 @aspect/qrcode-reader 나 jsQR 등 라이브러리를 사용합니다.
// 데모용으로 화면 내 "QR 입력" 기능도 제공합니다.
async function decodeQR(imageData: ImageData): Promise<string | null> {
    // jsQR 등 외부 라이브러리와 연결하는 지점
    // 현재는 null 반환 (수동 입력 모드 사용)
    void imageData;
    return null;
}

type ScanState = 'scanning' | 'processing' | 'error';

export default function KioskScanPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [errorMessage, setErrorMessage] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [currentTime, setCurrentTime] = useState('');
    const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // 시각
    useEffect(() => {
        const update = () => {
            setCurrentTime(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }));
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, []);

    // 카메라 시작
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setCameraReady(true);
            }
        } catch {
            console.warn('카메라 접근 불가, 수동 입력 모드로 전환');
            setManualMode(true);
        }
    }, []);

    // 카메라 중지
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    // 프레임 스캔
    useEffect(() => {
        if (!cameraReady || scanState !== 'scanning') return;

        const scan = () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            decodeQR(imageData).then(code => {
                if (code) {
                    processQRCode(code);
                }
            });
        };

        scanIntervalRef.current = setInterval(scan, 300);
        return () => {
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraReady, scanState]);

    // QR 코드 처리
    const processQRCode = async (code: string) => {
        setScanState('processing');
        stopCamera();

        try {
            const supabase = createClient();

            // QR 코드에서 회원 정보 찾기
            const { data: qrData, error: qrError } = await supabase
                .from('qr_codes')
                .select('member_id, facility_id')
                .eq('code', code)
                .eq('is_active', true)
                .single();

            if (qrError || !qrData) {
                setScanState('error');
                setErrorMessage('유효하지 않은 QR 코드입니다');
                setTimeout(() => {
                    setScanState('scanning');
                    setErrorMessage('');
                    startCamera();
                }, 3000);
                return;
            }

            // 체크인 기록
            const { error: checkInError } = await supabase
                .from('check_ins')
                .insert({
                    member_id: qrData.member_id,
                    facility_id: qrData.facility_id,
                    method: 'kiosk',
                    checked_in_at: new Date().toISOString(),
                });

            if (checkInError) {
                setScanState('error');
                setErrorMessage('체크인 처리 중 오류가 발생했습니다');
                setTimeout(() => {
                    setScanState('scanning');
                    setErrorMessage('');
                    startCamera();
                }, 3000);
                return;
            }

            // 성공 → 성공 화면으로 이동
            router.push(`/kiosk/success?member=${qrData.member_id}`);

        } catch {
            setScanState('error');
            setErrorMessage('시스템 오류가 발생했습니다');
            setTimeout(() => {
                setScanState('scanning');
                setErrorMessage('');
                startCamera();
            }, 3000);
        }
    };

    // 수동 입력 처리
    const handleManualSubmit = () => {
        if (manualCode.trim()) {
            processQRCode(manualCode.trim());
        }
    };

    // 취소 → 대기 화면
    const handleCancel = () => {
        stopCamera();
        router.push('/kiosk');
    };

    // 자동 복귀 (30초 무동작)
    useEffect(() => {
        const timeout = setTimeout(() => {
            stopCamera();
            router.push('/kiosk');
        }, 30000);
        return () => clearTimeout(timeout);
    }, [router, stopCamera]);

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

                <div style={{ fontSize: '28px', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
                    {currentTime}
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
                {/* Camera preview */}
                {!manualMode && (
                    <div style={{
                        position: 'relative',
                        width: '500px', height: '500px',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        background: '#111',
                    }}>
                        <video
                            ref={videoRef}
                            style={{
                                width: '100%', height: '100%',
                                objectFit: 'cover',
                                transform: 'scaleX(-1)',
                            }}
                            playsInline
                            muted
                        />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />

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
