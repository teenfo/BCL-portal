'use client';

import { useEffect, useState, useCallback } from 'react';

export default function UserCheckinPage() {
    const [qrToken, setQrToken] = useState('');
    const [timeLeft, setTimeLeft] = useState(30);
    const [isActive, setIsActive] = useState(true);

    const generateToken = useCallback(() => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = 'BCL-';
        for (let i = 0; i < 16; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        token += '-' + Date.now().toString(36);
        setQrToken(token);
        setTimeLeft(30);
    }, []);

    useEffect(() => {
        generateToken();
    }, [generateToken]);

    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    generateToken();
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isActive, generateToken]);

    const progressPercent = (timeLeft / 30) * 100;

    return (
        <div className="p-4 pb-24 max-w-lg mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6">체크인</h1>

            {/* QR Code Container */}
            <div className="glass-card p-6 rounded-xl text-center mb-6">
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    키오스크에 아래 QR을 스캔하세요
                </p>

                {/* QR Code Visual (ASCII art style as placeholder) */}
                <div className="mx-auto w-48 h-48 rounded-xl flex items-center justify-center mb-4 relative" style={{ background: '#fff' }}>
                    <div className="grid grid-cols-8 gap-0.5 p-3">
                        {Array.from({ length: 64 }, (_, i) => (
                            <div
                                key={i}
                                className="w-4 h-4 rounded-sm"
                                style={{
                                    background: qrToken.charCodeAt(i % qrToken.length) % 3 !== 0 ? '#1A1A1A' : '#FFFFFF',
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Timer */}
                <div className="mb-3">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-3xl font-bold text-white">{timeLeft}</span>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>초 후 갱신</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                                width: `${progressPercent}%`,
                                background: timeLeft <= 5 ? 'var(--error)' : timeLeft <= 10 ? 'var(--warning)' : 'var(--primary)',
                            }}
                        />
                    </div>
                </div>

                <button
                    onClick={() => setIsActive(!isActive)}
                    className="text-sm px-4 py-2 mt-2 rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
                >
                    {isActive ? '⏸ 일시정지' : '▶ 재개'}
                </button>
            </div>

            {/* Instructions */}
            <div className="glass-card p-5 rounded-xl">
                <h3 className="text-white font-semibold mb-3">체크인 안내</h3>
                <div className="space-y-3">
                    {[
                        { step: '1', text: '입구의 키오스크에서 "체크인" 버튼을 터치', icon: '📱' },
                        { step: '2', text: '화면의 QR 코드를 키오스크 스캐너에 비춤', icon: '📷' },
                        { step: '3', text: '"체크인 완료" 메시지가 나오면 입장', icon: '✅' },
                    ].map((item) => (
                        <div key={item.step} className="flex items-center gap-3">
                            <span className="text-lg">{item.icon}</span>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <span className="text-white font-semibold">Step {item.step}.</span> {item.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
