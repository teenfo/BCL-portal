'use client';

// /admin/payments — 결제 거래 관제 + 환불 2단계 워크플로우 (02-admin §3.4, docs/08 §1.2·§1.6)
//  탭: transactions(거래·환불) | refunds(환불 이력). 조회는 query()(admin RLS), 쓰기는 계약 RPC/EF만.
//  Display-Safe: 부상/메모/정산 등 민감정보 비노출 — 거래 요약 필드만 표시.
import { useMemo, useState } from 'react';
import { Table, Badge, Select, Button, Tabs, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { RefundModal } from './RefundModal';
import {
  type TransactionRow,
  type RefundRow,
  type TransactionStatus,
  TX_STATUS_LABEL,
  TX_STATUS_BADGE,
  SOURCE_LABEL,
  REFUND_STATUS_LABEL,
  REFUND_STATUS_BADGE,
  krw,
} from './types';
import styles from './payments.module.css';

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const PERIOD_DAYS: Record<string, number | null> = {
  all: null,
  '7': 7,
  '30': 30,
  '90': 90,
};

export function PaymentsScreen() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canRefund = can('payments', 'approve');

  const [tab, setTab] = useState<'transactions' | 'refunds'>('transactions');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('30');
  const [refundTarget, setRefundTarget] = useState<TransactionRow | null>(null);

  // 기간 필터는 서버(gte)로 — 시각 계산은 fetcher(이펙트) 안에서만 수행(렌더 중 Date.now 금지).
  const transactions = useQuery<TransactionRow[]>(() => {
    const days = PERIOD_DAYS[periodFilter];
    const fromIso = days != null ? new Date(Date.now() - days * 86_400_000).toISOString() : null;
    return query<TransactionRow[]>(getSupabaseBrowserClient(), 'transactions', (q) => {
      let builder = q
        .select(
          'id, member_id, plan_id, membership_id, order_id, amount, status, payment_method, source, toss_status, toss_raw_data, created_at, members(name), membership_plans(name)',
        )
        .order('created_at', { ascending: false })
        .limit(300);
      if (fromIso) builder = builder.gte('created_at', fromIso);
      return builder;
    });
  }, [periodFilter]);

  const refunds = useQuery<RefundRow[]>(
    () =>
      query<RefundRow[]>(getSupabaseBrowserClient(), 'refunds', (q) =>
        q
          .select('id, transaction_id, amount, penalty_amount, reason, status, created_at, completed_at')
          .order('created_at', { ascending: false })
          .limit(300),
      ),
    [],
  );

  const txRows = useMemo(() => {
    const list = transactions.data ?? [];
    return statusFilter === 'all' ? list : list.filter((t) => t.status === statusFilter);
  }, [transactions.data, statusFilter]);

  const txColumns: TableColumn<TransactionRow>[] = [
    {
      key: 'member',
      header: '회원',
      render: (t) => t.members?.name ?? '—',
    },
    {
      key: 'plan',
      header: '요금제',
      render: (t) => t.membership_plans?.name ?? '—',
    },
    {
      key: 'amount',
      header: '금액',
      align: 'right',
      render: (t) => krw(t.amount),
    },
    {
      key: 'status',
      header: '상태',
      render: (t) => (
        <Badge variant={TX_STATUS_BADGE[t.status]}>{TX_STATUS_LABEL[t.status]}</Badge>
      ),
    },
    {
      key: 'method',
      header: '결제수단/모드',
      render: (t) => {
        const mode = t.toss_raw_data?.mode;
        return (
          <div className={styles.methodCell}>
            <Badge variant="neutral" size="sm">
              {SOURCE_LABEL[t.source]}
              {t.payment_method ? ` · ${t.payment_method}` : ''}
            </Badge>
            {mode ? (
              <Badge variant={mode === 'live' ? 'success' : 'warning'} size="sm">
                {mode === 'live' ? '운영' : '시뮬'}
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'created',
      header: '일시',
      render: (t) => (
        <div>
          <div>{fmtDateTime(t.created_at)}</div>
          {t.order_id ? <div className={styles.orderId}>{t.order_id}</div> : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (t) => {
        // 환불 가능 = status='completed' + 멤버십 연결 + approve 권한
        const refundable = t.status === 'completed' && canRefund;
        return refundable ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={!t.membership_id}
            title={!t.membership_id ? '연결된 멤버십이 없어 환불할 수 없습니다' : undefined}
            onClick={() => setRefundTarget(t)}
          >
            환불
          </Button>
        ) : null;
      },
    },
  ];

  const refundColumns: TableColumn<RefundRow>[] = [
    { key: 'created', header: '요청일시', render: (r) => fmtDateTime(r.created_at) },
    { key: 'amount', header: '환불금액', align: 'right', render: (r) => krw(r.amount) },
    { key: 'penalty', header: '위약금', align: 'right', render: (r) => krw(r.penalty_amount) },
    { key: 'reason', header: '사유', render: (r) => r.reason },
    {
      key: 'status',
      header: '상태',
      render: (r) => (
        <Badge variant={REFUND_STATUS_BADGE[r.status]}>{REFUND_STATUS_LABEL[r.status]}</Badge>
      ),
    },
    {
      key: 'completed',
      header: '완료일시',
      render: (r) => (r.completed_at ? fmtDateTime(r.completed_at) : '—'),
    },
  ];

  const statusOptions: { value: string; label: string }[] = [
    { value: 'all', label: '전체' },
    ...(Object.keys(TX_STATUS_LABEL) as TransactionStatus[]).map((s) => ({
      value: s,
      label: TX_STATUS_LABEL[s],
    })),
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>결제</h1>
      </header>

      <Tabs
        aria-label="결제 화면 탭"
        value={tab}
        onChange={(k) => setTab(k as 'transactions' | 'refunds')}
        tabs={[
          { key: 'transactions', label: '거래' },
          { key: 'refunds', label: '환불 이력' },
        ]}
      />

      {tab === 'transactions' ? (
        <>
          <div className={styles.toolbar}>
            <div className={styles.filter}>
              <Select label="상태" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
            </div>
            <div className={styles.filter}>
              <Select
                label="기간"
                value={periodFilter}
                onChange={setPeriodFilter}
                options={[
                  { value: 'all', label: '전체' },
                  { value: '7', label: '최근 7일' },
                  { value: '30', label: '최근 30일' },
                  { value: '90', label: '최근 90일' },
                ]}
              />
            </div>
          </div>

          <Table<TransactionRow>
            columns={txColumns}
            rows={txRows}
            rowKey={(t) => t.id}
            loading={transactions.loading}
            empty={
              transactions.error
                ? {
                    variant: 'error',
                    title: '거래를 불러오지 못했습니다',
                    description: transactions.error,
                    onRetry: transactions.refetch,
                  }
                : { title: '거래가 없습니다', description: '선택한 조건에 해당하는 거래가 없습니다.' }
            }
          />
        </>
      ) : (
        <Table<RefundRow>
          columns={refundColumns}
          rows={refunds.data ?? []}
          rowKey={(r) => r.id}
          loading={refunds.loading}
          empty={
            refunds.error
              ? {
                  variant: 'error',
                  title: '환불 이력을 불러오지 못했습니다',
                  description: refunds.error,
                  onRetry: refunds.refetch,
                }
              : { title: '환불 이력이 없습니다', description: '처리된 환불이 아직 없습니다.' }
          }
        />
      )}

      {refundTarget ? (
        <RefundModal
          transaction={refundTarget}
          onClose={() => setRefundTarget(null)}
          onDone={() => {
            setRefundTarget(null);
            toast.success('환불이 완료되었습니다.');
            transactions.refetch();
            refunds.refetch();
          }}
        />
      ) : null}
    </div>
  );
}
