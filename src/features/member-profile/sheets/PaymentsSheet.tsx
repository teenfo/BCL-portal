'use client';

// profile §결제 내역 — transactions 본인 read (RLS "transactions own read"). read-only(환불 신청은 지원 경유).
import { Badge, EmptyState, Skeleton } from '@/components/ui';
import { BottomSheet } from '@/features/member-shell';
import { useQuery } from '@/lib/data/useQuery';
import { query, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { krw, formatDate } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import styles from '../profile.module.css';

interface Txn {
  id: string;
  amount: number;
  status: string;
  category: string;
  created_at: string;
  receipt_url: string | null;
}

const STATUS_KO: Record<string, string> = {
  completed: '완료',
  pending: '대기',
  failed: '실패',
  cancelled: '취소',
  refunded: '환불',
  partial_refunded: '부분환불',
};
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
  cancelled: 'neutral',
  refunded: 'danger',
  partial_refunded: 'warning',
};

export function PaymentsSheet({ memberId, onClose }: { memberId: string | null; onClose: () => void }) {
  const data = useQuery<Txn[]>(
    () =>
      memberId
        ? query<Txn[]>(getSupabaseBrowserClient(), 'transactions', (q) =>
            q
              .select('id, amount, status, category, created_at, receipt_url')
              .eq('member_id', memberId)
              .order('created_at', { ascending: false })
              .limit(50),
          )
        : Promise.resolve<Envelope<Txn[]>>({ success: false, data: null, error: '회원 정보가 없습니다.' }),
    [memberId],
  );

  const rows = data.data ?? [];

  return (
    <BottomSheet variant="full" title="결제 내역" onClose={onClose}>
      {data.error ? (
        <EmptyState variant="error" title="결제 내역을 불러오지 못했습니다" description={data.error} onRetry={data.refetch} />
      ) : data.loading && !data.data ? (
        <Skeleton variant="rect" height={200} />
      ) : rows.length === 0 ? (
        <EmptyState title="결제 내역이 없습니다" description="요금제를 구매하면 거래 내역이 표시됩니다." />
      ) : (
        rows.map((t) => (
          <div key={t.id} className={styles.txnRow}>
            <div>
              <p className={screen.strong}>{krw(t.amount)}</p>
              <p className={screen.muted}>{formatDate(t.created_at.slice(0, 10))} · {t.category}</p>
            </div>
            <Badge variant={STATUS_VARIANT[t.status] ?? 'neutral'}>{STATUS_KO[t.status] ?? t.status}</Badge>
          </div>
        ))
      )}
    </BottomSheet>
  );
}
