'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

function SuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const toast = useToast();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('결제 승인 중입니다...');

    useEffect(() => {
        const paymentKey = searchParams.get('paymentKey');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');

        if (!paymentKey || !orderId || !amount) {
            setStatus('error');
            setMessage('결제 정보가 누락되었습니다.');
            return;
        }

        async function verifyPayment() {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    throw new Error('인증 세션이 만료되었습니다. 다시 로그인해주세요.');
                }

                // Call the confirm-payment Edge Function
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/confirm-payment`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                            paymentKey,
                            orderId,
                            amount: Number(amount),
                        }),
                    }
                );

                const result = await response.json();

                if (response.ok && result.success) {
                    setStatus('success');
                    setMessage('🎉 결제가 성공적으로 완료되었습니다!');
                    toast.success('멤버십 구매가 완료되었습니다.');

                    // 3초 후 멤버십 페이지로 이동
                    setTimeout(() => {
                        router.push('/apps/profile/memberships');
                    }, 3000);
                } else {
                    throw new Error(result.error || '결제 승인에 실패했습니다.');
                }
            } catch (err: any) {
                console.error('Payment verification error:', err);
                setStatus('error');
                setMessage(err.message || '처리 중 오류가 발생했습니다.');
                toast.error('결제 처리 오류: ' + err.message);
            }
        }

        verifyPayment();
    }, [searchParams, router, toast]);

    return (
        <div className="app-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
            <div className={`app-glass-card`} style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
                {status === 'loading' && (
                    <>
                        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--app-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>결제 승인 중</h2>
                        <p style={{ color: 'var(--app-text-secondary)', marginTop: '0.5rem' }}>{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '1rem' }}>구매 완료!</h2>
                        <p style={{ color: 'var(--app-text-secondary)', marginBottom: '2rem' }}>{message}</p>
                        <button
                            className="app-btn-primary"
                            style={{ width: '100%' }}
                            onClick={() => router.push('/apps/profile/memberships')}
                        >
                            내 멤버십 확인하기
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FF4D4D', marginBottom: '1rem' }}>결제 실패</h2>
                        <p style={{ color: 'var(--app-text-secondary)', marginBottom: '2rem' }}>{message}</p>
                        <button
                            className="app-btn-primary"
                            style={{ width: '100%' }}
                            onClick={() => router.push('/apps/purchase')}
                        >
                            다시 시도하기
                        </button>
                    </>
                )}
            </div>

            <style jsx>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
