'use client';

// 비탭 purchase/success · purchase/fail — Toss 리다이렉트 규약 라우트 (docs/03 §3.6)
// success: confirm-payment Edge Function으로 승인 확정(시뮬·라이브 공통 지점). 서버가 주문
//   확정금액을 재대조하고 성공 시 멤버십을 생성한다. 실패 시 금액 미청구(Fail-to-NOT-charge).
// fail: 사유 표기 + 재시도(처음부터 — 자동 재시도 금지).
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Button, Skeleton } from '@/components/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { StackHeader } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import styles from './purchase.module.css';

export function PurchaseResultScreen({ result }: { result: 'success' | 'fail' }) {
  if (result === 'success') return <PurchaseSuccess />;
  return <PurchaseFail />;
}

type ConfirmState = 'confirming' | 'done' | 'error';

function PurchaseSuccess() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get('orderId');
  const amount = params.get('amount');
  const paymentKey = params.get('paymentKey');
  // orderId 없이 직접 진입 → 일반 완료 화면. orderId 있으면 승인 확정 수행.
  const [state, setState] = useState<ConfirmState>(orderId ? 'confirming' : 'done');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    void (async () => {
      // 마이크로태스크 이후 상태 전이(이펙트 동기 setState 회피)
      await Promise.resolve();
      const client = getSupabaseBrowserClient();
      const { data, error } = await client.functions.invoke('confirm-payment', {
        body: {
          orderId,
          amount: amount != null ? Number(amount) : undefined,
          paymentKey: paymentKey ?? undefined,
        },
      });
      if (!active) return;
      const res = (data ?? null) as { success?: boolean; error?: string } | null;
      if (error || !res?.success) {
        setErrMsg(res?.error ?? error?.message ?? '결제 승인에 실패했습니다.');
        setState('error');
      } else {
        setState('done');
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId, amount, paymentKey]);

  if (state === 'confirming') {
    return (
      <>
        <StackHeader title="결제 승인 중" fallbackHref="/apps/home" />
        <div className={styles.resultWrap}>
          <Skeleton variant="rect" height={72} />
          <p className={screen.muted}>결제를 승인하고 멤버십을 활성화하는 중입니다…</p>
        </div>
      </>
    );
  }

  if (state === 'error') {
    return (
      <>
        <StackHeader title="결제 실패" fallbackHref="/apps/purchase" />
        <div className={styles.resultWrap}>
          <svg className={styles.resultIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="var(--bcl-danger)" strokeWidth="1.6" />
            <path d="M9 9l6 6M15 9l-6 6" stroke="var(--bcl-danger)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <h1 className={screen.pageTitle}>결제가 완료되지 않았습니다</h1>
          <Card>
            <p className={screen.bodyText}>{errMsg ?? '승인되지 않았습니다.'}</p>
          </Card>
          <p className={screen.muted}>금액이 청구되지 않았습니다. 재결제는 처음부터 다시 진행됩니다.</p>
          <Button variant="primary" block onClick={() => router.replace('/apps/purchase')}>
            다시 시도
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <StackHeader title="결제 완료" fallbackHref="/apps/home" />
      <div className={styles.resultWrap}>
        <svg className={styles.resultIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="var(--bcl-success)" strokeWidth="1.6" />
          <path d="M8 12.5l2.5 2.5 5-5.5" stroke="var(--bcl-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className={screen.pageTitle}>결제가 완료되었습니다</h1>
        <p className={screen.muted}>멤버십이 활성화되었습니다.</p>
        <Button variant="primary" block onClick={() => router.replace('/apps/home')}>
          홈으로
        </Button>
      </div>
    </>
  );
}

function PurchaseFail() {
  const router = useRouter();
  const params = useSearchParams();
  const message = params.get('message');
  const code = params.get('code');
  return (
    <>
      <StackHeader title="결제 실패" fallbackHref="/apps/purchase" />
      <div className={styles.resultWrap}>
        <svg className={styles.resultIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="var(--bcl-danger)" strokeWidth="1.6" />
          <path d="M9 9l6 6M15 9l-6 6" stroke="var(--bcl-danger)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <h1 className={screen.pageTitle}>결제가 완료되지 않았습니다</h1>
        <Card>
          <p className={screen.bodyText}>{message ?? '결제가 취소되었거나 승인되지 않았습니다.'}</p>
          {code ? <p className={screen.muted}>오류 코드: {code}</p> : null}
        </Card>
        <p className={screen.muted}>금액이 청구되지 않았습니다. 재결제는 처음부터 다시 진행됩니다.</p>
        <Button variant="primary" block onClick={() => router.replace('/apps/purchase')}>
          다시 시도
        </Button>
      </div>
    </>
  );
}
