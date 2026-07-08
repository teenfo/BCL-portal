'use client';

// 회원 상세 — activity 탭 (02-admin §3.2)
// 예약·출석 이력(bookings+checkins) + 결제 이력(transactions 요약 + payments 딥링크)
import { useRouter } from 'next/navigation';
import { Card, Button, Badge, Table, StatCard } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fmtDate, fmtDateTime } from '../types';
import styles from '../detail.module.css';

interface BookingRow {
  id: string;
  status: 'confirmed' | 'waitlisted' | 'cancelled';
  attendance_outcome: string;
  created_at: string;
  sessions: { title: string; session_date: string; start_time: string } | null;
}

interface TxRow {
  id: string;
  amount: number;
  status: string;
  category: string;
  order_id: string | null;
  created_at: string;
}

const OUTCOME_LABEL: Record<string, string> = {
  pending: '대기',
  checked_in: '출석',
  no_show: '노쇼',
  late_cancel: '지각취소',
  coach_excused: '사유결석',
  walk_in: '워크인',
};

const OUTCOME_BADGE: Record<string, 'success' | 'danger' | 'warning' | 'neutral' | 'info'> = {
  pending: 'neutral',
  checked_in: 'success',
  no_show: 'danger',
  late_cancel: 'warning',
  coach_excused: 'info',
  walk_in: 'success',
};

const TX_STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  completed: '완료',
  failed: '실패',
  cancelled: '취소',
  refunded: '환불',
  partial_refunded: '부분환불',
};

const krw = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

interface Props {
  memberId: string;
}

export function ActivityTab({ memberId }: Props) {
  const router = useRouter();
  const client = getSupabaseBrowserClient();

  const bookings = useQuery<BookingRow[]>(
    () =>
      query<BookingRow[]>(client, 'bookings', (q) =>
        q
          .select('id,status,attendance_outcome,created_at,sessions(title,session_date,start_time)')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false })
          .limit(30),
      ),
    [memberId],
  );

  const transactions = useQuery<TxRow[]>(
    () =>
      query<TxRow[]>(client, 'transactions', (q) =>
        q
          .select('id,amount,status,category,order_id,created_at')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false })
          .limit(30),
      ),
    [memberId],
  );

  const txData = transactions.data ?? [];
  const totalPaid = txData
    .filter((t) => t.status === 'completed')
    .reduce((s, t) => s + Number(t.amount), 0);

  const bookingCols: TableColumn<BookingRow>[] = [
    {
      key: 'session',
      header: '세션',
      render: (b) => (
        <div className={styles.field}>
          <span className={styles.fieldValue}>{b.sessions?.title ?? '세션 미상'}</span>
          <span className={styles.fieldLabel}>
            {b.sessions ? `${fmtDate(b.sessions.session_date)} ${b.sessions.start_time?.slice(0, 5) ?? ''}` : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: '예약',
      render: (b) => (
        <Badge variant={b.status === 'cancelled' ? 'neutral' : b.status === 'waitlisted' ? 'warning' : 'info'}>
          {b.status === 'confirmed' ? '확정' : b.status === 'waitlisted' ? '대기' : '취소'}
        </Badge>
      ),
    },
    {
      key: 'outcome',
      header: '출결',
      render: (b) => (
        <Badge variant={OUTCOME_BADGE[b.attendance_outcome] ?? 'neutral'}>
          {OUTCOME_LABEL[b.attendance_outcome] ?? b.attendance_outcome}
        </Badge>
      ),
    },
  ];

  const txCols: TableColumn<TxRow>[] = [
    {
      key: 'date',
      header: '일시',
      render: (t) => <span className={styles.fieldLabel}>{fmtDateTime(t.created_at)}</span>,
    },
    { key: 'category', header: '구분', render: (t) => t.category },
    { key: 'amount', header: '금액', align: 'right', render: (t) => krw(t.amount) },
    {
      key: 'status',
      header: '상태',
      render: (t) => (
        <Badge variant={t.status === 'completed' ? 'success' : t.status === 'refunded' ? 'neutral' : 'warning'}>
          {TX_STATUS_LABEL[t.status] ?? t.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className={styles.tabBody}>
      <Card title="예약·출석 이력">
        <Table<BookingRow>
          columns={bookingCols}
          rows={bookings.data ?? []}
          rowKey={(b) => b.id}
          loading={bookings.loading}
          empty={
            bookings.error
              ? {
                  variant: 'error',
                  title: '이력을 불러오지 못했습니다',
                  description: bookings.error,
                  onRetry: bookings.refetch,
                }
              : { title: '예약·출석 이력이 없습니다' }
          }
        />
      </Card>

      <Card
        title="결제 이력"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/payments?tab=transactions')}
          >
            결제 화면
          </Button>
        }
      >
        <div className={styles.cardStack}>
          <div className={styles.summaryGrid}>
            <StatCard label="누적 결제(완료)" value={krw(totalPaid)} loading={transactions.loading} />
            <StatCard label="거래 건수" value={`${txData.length}건`} loading={transactions.loading} />
          </div>
          <Table<TxRow>
          columns={txCols}
          rows={txData}
          rowKey={(t) => t.id}
          loading={transactions.loading}
          empty={
            transactions.error
              ? {
                  variant: 'error',
                  title: '결제 이력을 불러오지 못했습니다',
                  description: transactions.error,
                  onRetry: transactions.refetch,
                }
              : { title: '결제 이력이 없습니다' }
          }
          />
        </div>
      </Card>
    </div>
  );
}
