'use client';

// /admin/lockers — 락커 (02-admin §3.10). KPI + 목록 + 배정/해제/편집/삭제.
// lockers 단일 테이블. 전용 RPC 부재 → 직접 쓰기(admin RLS). ⏳ audit: 배정/해제 audit_logs 미기록.
import { useMemo, useState } from 'react';
import { Button, Table, Badge, Select, StatCard, ConfirmModal, useToast } from '@/components/ui';
import type { TableColumn, BadgeVariant } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { LockerEditModal } from './LockerEditModal';
import { LockerAssignModal } from './LockerAssignModal';
import {
  type Locker,
  type LockerStatus,
  LOCKER_SIZE_LABEL,
  LOCKER_STATUS_LABEL,
  writeError,
  fmtDate,
  daysUntil,
} from './types';
import styles from './lockers.module.css';

const STATUS_BADGE: Record<LockerStatus, BadgeVariant> = {
  available: 'success',
  occupied: 'info',
  maintenance: 'warning',
  disabled: 'neutral',
};

const EXPIRY_SOON_DAYS = 7;

export function LockersScreen() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('lockers', 'edit');
  const canDelete = can('lockers', 'delete');

  const [statusFilter, setStatusFilter] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Locker | null>(null);
  const [assigning, setAssigning] = useState<Locker | null>(null);
  const [releasing, setReleasing] = useState<Locker | null>(null);
  const [deleting, setDeleting] = useState<Locker | null>(null);
  const [busy, setBusy] = useState(false);

  const lockers = useQuery<Locker[]>(
    () =>
      query<Locker[]>(getSupabaseBrowserClient(), 'lockers', (q) =>
        q.select('*, members(name, phone)').order('locker_number'),
      ),
    [],
  );

  const list = useMemo(() => lockers.data ?? [], [lockers.data]);
  const kpi = useMemo(() => {
    let total = 0;
    let occupied = 0;
    let available = 0;
    let soon = 0;
    for (const l of list) {
      total += 1;
      if (l.status === 'occupied') {
        occupied += 1;
        const d = daysUntil(l.assigned_end_date);
        if (d != null && d >= 0 && d <= EXPIRY_SOON_DAYS) soon += 1;
      } else if (l.status === 'available') {
        available += 1;
      }
    }
    return { total, occupied, available, soon };
  }, [list]);

  const rows = useMemo(
    () => (statusFilter === 'all' ? list : list.filter((l) => l.status === statusFilter)),
    [list, statusFilter],
  );

  const openNew = () => {
    setEditing(null);
    setEditOpen(true);
  };
  const openEdit = (l: Locker) => {
    setEditing(l);
    setEditOpen(true);
  };

  const confirmRelease = async () => {
    if (!releasing) return;
    setBusy(true);
    // 해제: status=available + 배정 정보 null (chk_locker_assignment 충족)
    const res = await query(getSupabaseBrowserClient(), 'lockers', (q) =>
      q
        .update({
          status: 'available',
          assigned_member_id: null,
          assigned_start_date: null,
          assigned_end_date: null,
        })
        .eq('id', releasing.id),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(writeError(res.error));
      return;
    }
    toast.success('락커 배정을 해제했습니다.');
    setReleasing(null);
    lockers.refetch();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'lockers', (q) =>
      q.delete().eq('id', deleting.id),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(writeError(res.error));
      return;
    }
    toast.success('락커를 삭제했습니다.');
    setDeleting(null);
    lockers.refetch();
  };

  const columns: TableColumn<Locker>[] = [
    { key: 'number', header: '번호', render: (l) => l.locker_number },
    { key: 'size', header: '크기', render: (l) => LOCKER_SIZE_LABEL[l.size] },
    {
      key: 'fee',
      header: '월 요금',
      align: 'right',
      render: (l) => `${Math.round(l.monthly_fee).toLocaleString('ko-KR')}원`,
    },
    {
      key: 'status',
      header: '상태',
      render: (l) => <Badge variant={STATUS_BADGE[l.status]}>{LOCKER_STATUS_LABEL[l.status]}</Badge>,
    },
    { key: 'member', header: '사용 회원', render: (l) => l.members?.name ?? '-' },
    {
      key: 'period',
      header: '이용 기간',
      render: (l) =>
        l.status === 'occupied'
          ? `${fmtDate(l.assigned_start_date)} ~ ${fmtDate(l.assigned_end_date)}`
          : '-',
    },
    {
      key: 'dday',
      header: '만기',
      align: 'right',
      render: (l) => {
        if (l.status !== 'occupied') return '-';
        const d = daysUntil(l.assigned_end_date);
        if (d == null) return '-';
        if (d < 0) return <Badge variant="danger">만료</Badge>;
        if (d <= EXPIRY_SOON_DAYS) return <Badge variant="warning">{`D-${d}`}</Badge>;
        return `D-${d}`;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (l) => (
        <div className={styles.rowActions}>
          {canEdit && l.status !== 'occupied' && l.status !== 'disabled' ? (
            <Button variant="ghost" size="sm" onClick={() => setAssigning(l)}>
              배정
            </Button>
          ) : null}
          {canEdit && l.status === 'occupied' ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setAssigning(l)}>
                변경
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setReleasing(l)}>
                해제
              </Button>
            </>
          ) : null}
          {canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>
              편집
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={l.status === 'occupied'}
              title={l.status === 'occupied' ? '배정 중인 락커는 삭제할 수 없습니다' : undefined}
              onClick={() => setDeleting(l)}
            >
              삭제
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  if (!can('lockers', 'view')) {
    return (
      <div className={styles.page}>
        <p>이 화면에 접근할 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>락커</h1>
        {canEdit ? (
          <Button variant="primary" onClick={openNew}>
            새 락커
          </Button>
        ) : null}
      </header>

      <div className={styles.kpis}>
        <StatCard label="전체" value={kpi.total.toLocaleString('ko-KR')} loading={lockers.loading} />
        <StatCard label="사용 중" value={kpi.occupied.toLocaleString('ko-KR')} loading={lockers.loading} />
        <StatCard label="가용" value={kpi.available.toLocaleString('ko-KR')} loading={lockers.loading} />
        <StatCard label="만기 임박(D-7)" value={kpi.soon.toLocaleString('ko-KR')} loading={lockers.loading} />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <div className={styles.filter}>
            <Select
              label="상태"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: '전체' },
                { value: 'available', label: '가용' },
                { value: 'occupied', label: '사용 중' },
                { value: 'maintenance', label: '점검' },
                { value: 'disabled', label: '비활성' },
              ]}
            />
          </div>
        </div>
      </div>

      <Table<Locker>
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        loading={lockers.loading}
        empty={
          lockers.error
            ? { variant: 'error', title: '락커를 불러오지 못했습니다', description: lockers.error, onRetry: lockers.refetch }
            : { title: '락커가 없습니다', description: '새 락커를 등록하세요.', action: canEdit ? { label: '새 락커', onClick: openNew } : undefined }
        }
      />

      {editOpen ? (
        <LockerEditModal
          key={editing?.id ?? 'new'}
          locker={editing}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            lockers.refetch();
          }}
        />
      ) : null}

      {assigning ? (
        <LockerAssignModal
          locker={assigning}
          onClose={() => setAssigning(null)}
          onDone={() => {
            setAssigning(null);
            lockers.refetch();
          }}
        />
      ) : null}

      <ConfirmModal
        open={releasing != null}
        title="락커 배정 해제"
        variant="danger"
        confirmLabel="해제"
        loading={busy}
        message={
          <>
            <strong>{releasing?.locker_number}</strong>번 락커의{' '}
            <strong>{releasing?.members?.name ?? '회원'}</strong> 배정을 해제합니다.
          </>
        }
        onConfirm={confirmRelease}
        onClose={() => setReleasing(null)}
      />

      <ConfirmModal
        open={deleting != null}
        title="락커 삭제"
        variant="danger"
        confirmLabel="삭제"
        loading={busy}
        message={
          <>
            <strong>{deleting?.locker_number}</strong>번 락커를 삭제합니다. 되돌릴 수 없습니다.
          </>
        }
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
