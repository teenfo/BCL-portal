'use client';

// 비탭 purchase/success · purchase/fail — Toss 리다이렉트 규약 라우트 (docs/03 §3.6)
// success: 서버 승인 확인(fn_confirm_payment) 후 멤버십 활성 안내 — FLAG: 확정 RPC 부재.
// fail: 사유 표기 + 재시도(처음부터 — 자동 재시도 금지).
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Button } from '@/components/ui';
import { StackHeader } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import styles from './purchase.module.css';

export function PurchaseResultScreen({ result }: { result: 'success' | 'fail' }) {
  const router = useRouter();
  const params = useSearchParams();
  const message = params.get('message');
  const code = params.get('code');

  if (result === 'success') {
    return (
      <>
        <StackHeader title="결제 완료" fallbackHref="/apps/home" />
        <div className={styles.resultWrap}>
          <svg className={styles.resultIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="var(--bcl-success)" strokeWidth="1.6" />
            <path d="M8 12.5l2.5 2.5 5-5.5" stroke="var(--bcl-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className={screen.pageTitle}>결제가 접수되었습니다</h1>
          <p className={screen.muted}>서버 승인 확인 후 멤버십이 활성화됩니다.</p>
          <p className={styles.noteBox}>
            결제 승인 확정은 서버 RPC(fn_confirm_payment)가 orderId·paymentKey로 처리합니다.
            멤버십은 승인 성공 시 서버가 생성합니다.
          </p>
          <Button variant="primary" block onClick={() => router.replace('/apps/home')}>
            홈으로
          </Button>
        </div>
      </>
    );
  }

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
