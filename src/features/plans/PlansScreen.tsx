'use client';

// /admin/plans — 요금제 목록 + 편집 (02-admin §3.5)
// 목록 Table + 필터(plan_kind·판매상태) + 편집 모달 + 보관(숨김) (활성 구독 있으면 서버가 차단).
// 보관은 물리 삭제가 아니라 fn_archive_membership_plan(is_active=false) — 감사 동반.
import { useMemo, useState } from 'react';
import {
  Card,
  Button,
  Table,
  Badge,
  Select,
  ConfirmModal,
  useToast,
} from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { PlanEditModal } from './PlanEditModal';
import {
  type MembershipPlan,
  type PlanKind,
  PLAN_TYPE_LABEL,
  PLAN_KIND_LABEL,
} from './types';
import styles from './plans.module.css';

const KIND_BADGE: Record<PlanKind, 'neutral' | 'info' | 'accent'> = {
  standard: 'neutral',
  drop_in: 'info',
  trial: 'accent',
};

const krw = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

export function PlansScreen() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('plans', 'edit');
  const canDelete = can('plans', 'delete');

  const [kindFilter, setKindFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<MembershipPlan | null>(null);
  const [archiving, setArchiving] = useState<MembershipPlan | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const plans = useQuery<MembershipPlan[]>(
    () =>
      query<MembershipPlan[]>(getSupabaseBrowserClient(), 'membership_plans', (q) =>
        q.select('*').order('created_at', { ascending: false }),
      ),
    [],
  );

  // 요금제별 활성 구독 수 — memberships status='active' 집계(클라이언트 tally)
  const activeCounts = useQuery<{ plan_id: string | null }[]>(
    () =>
      query<{ plan_id: string | null }[]>(getSupabaseBrowserClient(), 'memberships', (q) =>
        q.select('plan_id').eq('status', 'active'),
      ),
    [],
  );

  const countByPlan = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of activeCounts.data ?? []) {
      if (row.plan_id) m.set(row.plan_id, (m.get(row.plan_id) ?? 0) + 1);
    }
    return m;
  }, [activeCounts.data]);

  const rows = useMemo(() => {
    let list = plans.data ?? [];
    if (kindFilter !== 'all') list = list.filter((p) => p.plan_kind === kindFilter);
    if (statusFilter === 'active') list = list.filter((p) => p.is_active);
    else if (statusFilter === 'hidden') list = list.filter((p) => !p.is_active);
    return list;
  }, [plans.data, kindFilter, statusFilter]);

  const reload = () => {
    plans.refetch();
    activeCounts.refetch();
  };

  const openNew = () => {
    setEditing(null);
    setEditOpen(true);
  };
  const openEdit = (p: MembershipPlan) => {
    setEditing(p);
    setEditOpen(true);
  };

  const confirmArchive = async () => {
    if (!archiving) return;
    setArchiveBusy(true);
    const res = await rpc(getSupabaseBrowserClient(), 'fn_archive_membership_plan', {
      p_plan_id: archiving.id,
    });
    setArchiveBusy(false);
    if (!res.success) {
      toast.error(
        res.error === 'has_active_subscriptions'
          ? '활성 구독이 있어 보관할 수 없습니다'
          : res.error === 'forbidden'
            ? '권한이 없습니다.'
            : res.error ?? '보관에 실패했습니다.',
      );
      return;
    }
    toast.success('요금제를 보관(숨김) 처리했습니다.');
    setArchiving(null);
    reload();
  };

  const columns: TableColumn<MembershipPlan>[] = [
    { key: 'name', header: '이름', render: (p) => p.name },
    {
      key: 'type',
      header: '유형',
      render: (p) => <Badge variant="neutral">{PLAN_TYPE_LABEL[p.type]}</Badge>,
    },
    {
      key: 'kind',
      header: '구분',
      render: (p) => <Badge variant={KIND_BADGE[p.plan_kind]}>{PLAN_KIND_LABEL[p.plan_kind]}</Badge>,
    },
    { key: 'price', header: '가격', align: 'right', render: (p) => krw(p.price) },
    {
      key: 'unit',
      header: '기간/횟수',
      align: 'right',
      render: (p) =>
        p.type === 'period' ? `${p.duration_days ?? 0}일` : `${p.credit_count ?? 0}회`,
    },
    {
      key: 'subs',
      header: '활성 구독',
      align: 'right',
      render: (p) => (countByPlan.get(p.id) ?? 0).toLocaleString('ko-KR'),
    },
    {
      key: 'status',
      header: '판매상태',
      render: (p) =>
        p.is_active ? <Badge variant="success">활성</Badge> : <Badge variant="neutral">숨김</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => {
        const activeSubs = countByPlan.get(p.id) ?? 0;
        return (
          <div className={styles.rowActions}>
            {canEdit ? (
              <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                편집
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={activeSubs > 0}
                title={activeSubs > 0 ? '활성 구독이 있어 보관할 수 없습니다' : undefined}
                onClick={() => setArchiving(p)}
              >
                보관
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  if (!can('plans', 'view')) {
    return (
      <div className={styles.page}>
        <Card>
          <p>이 화면에 접근할 권한이 없습니다.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>요금제</h1>
        {canEdit ? (
          <Button variant="primary" onClick={openNew}>
            새 요금제
          </Button>
        ) : null}
      </header>

      <div className={styles.toolbar}>
        <div className={styles.filter}>
          <Select
            label="구분"
            value={kindFilter}
            onChange={setKindFilter}
            options={[
              { value: 'all', label: '전체' },
              { value: 'standard', label: '정규' },
              { value: 'drop_in', label: '드롭인' },
              { value: 'trial', label: '체험' },
            ]}
          />
        </div>
        <div className={styles.filter}>
          <Select
            label="판매상태"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: '전체' },
              { value: 'active', label: '활성' },
              { value: 'hidden', label: '숨김' },
            ]}
          />
        </div>
      </div>

      <Table<MembershipPlan>
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        loading={plans.loading}
        empty={
          plans.error
            ? { variant: 'error', title: '요금제를 불러오지 못했습니다', description: plans.error, onRetry: plans.refetch }
            : { title: '요금제가 없습니다', description: '새 요금제를 만들어 판매를 시작하세요.', action: canEdit ? { label: '새 요금제', onClick: openNew } : undefined }
        }
      />

      {editOpen ? (
        <PlanEditModal
          key={editing?.id ?? 'new'}
          open
          plan={editing}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            reload();
          }}
        />
      ) : null}

      <ConfirmModal
        open={archiving != null}
        title="요금제 보관(숨김)"
        message={
          <>
            <strong>{archiving?.name}</strong> 요금제를 보관 처리합니다. 판매 목록에서 숨겨지며,
            기존 판매분은 유지됩니다. (물리 삭제 아님)
          </>
        }
        confirmLabel="보관"
        variant="danger"
        loading={archiveBusy}
        onConfirm={confirmArchive}
        onClose={() => setArchiving(null)}
      />
    </div>
  );
}
