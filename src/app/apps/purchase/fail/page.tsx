'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function FailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const message = searchParams.get('message') || '결제가 취소되었거나 오류가 발생했습니다.';
    const code = searchParams.get('code');

    return (
        <div className="app-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
            <div className="app-glass-card" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😔</div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FF4D4D', marginBottom: '1rem' }}>결제 실패</h2>
                <div style={{ background: 'rgba(255, 77, 77, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                    <p style={{ color: 'var(--app-text-primary)', fontSize: '0.9375rem', fontWeight: 500 }}>{message}</p>
                    {code && <p style={{ color: 'var(--app-text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>에러 코드: {code}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                        className="app-btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => router.push('/apps/purchase')}
                    >
                        결제 화면으로 돌아가기
                    </button>
                    <button
                        className="app-btn-secondary"
                        style={{ width: '100%', background: 'transparent', border: '1px solid var(--app-border)', color: 'var(--app-text-secondary)' }}
                        onClick={() => router.push('/apps/dashboard')}
                    >
                        홈으로 이동
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function FailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <FailContent />
        </Suspense>
    );
}
