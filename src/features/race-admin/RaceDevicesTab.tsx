'use client';

// PM5 기기 목록/상태 모니터 (02-admin §3.9 devices)
// 시리얼넘버=주 식별자. 전용 RPC 부재 → pm5_devices 직접 쓰기(admin RLS). ⏳ audit 미기록.
// Web BT 등록(현장/코치 경로)은 ⏳ — 여기선 레지스트리 관리·상태 모니터.
import { useState } from 'react';
import { Button, Table, Badge, StatCard, ConfirmModal, useToast } from '@/components/ui';
import type { TableColumn, BadgeVariant } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Pm5DeviceEditModal } from './Pm5DeviceEditModal';
import {
  type Pm5Device,
  type DeviceStatus,
  DEVICE_TYPE_LABEL,
  DEVICE_STATUS_LABEL,
  DEVICE_MODE_LABEL,
  writeError,
  fmtDate,
} from './types';
import styles from './race-admin.module.css';

const STATUS_BADGE: Record<DeviceStatus, BadgeVariant> = {
  online: 'success',
  offline: 'neutral',
  maintenance: 'warning',
};

export function RaceDevicesTab() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('race', 'edit');
  const canDelete = can('race', 'delete');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Pm5Device | null>(null);
  const [deleting, setDeleting] = useState<Pm5Device | null>(null);
  const [busy, setBusy] = useState(false);

  const devices = useQuery<Pm5Device[]>(
    () =>
      query<Pm5Device[]>(getSupabaseBrowserClient(), 'pm5_devices', (q) =>
        q.select('*').order('serial_number'),
      ),
    [],
  );

  const list = devices.data ?? [];
  const total = list.length;
  const online = list.filter((d) => d.status === 'online').length;
  const racing = list.filter((d) => d.current_mode === 'racing').length;

  const openNew = () => {
    setEditing(null);
    setEditOpen(true);
  };
  const openEdit = (d: Pm5Device) => {
    setEditing(d);
    setEditOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'pm5_devices', (q) =>
      q.delete().eq('id', deleting.id),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(writeError(res.error));
      return;
    }
    toast.success('기기를 삭제했습니다.');
    setDeleting(null);
    devices.refetch();
  };

  const columns: TableColumn<Pm5Device>[] = [
    { key: 'serial', header: '시리얼', render: (d) => d.serial_number },
    {
      key: 'type',
      header: '종류',
      render: (d) => <Badge variant="neutral">{DEVICE_TYPE_LABEL[d.device_type]}</Badge>,
    },
    {
      key: 'status',
      header: '상태',
      render: (d) => <Badge variant={STATUS_BADGE[d.status]}>{DEVICE_STATUS_LABEL[d.status]}</Badge>,
    },
    {
      key: 'mode',
      header: '모드',
      render: (d) => (
        <Badge variant={d.current_mode === 'racing' ? 'warning' : 'info'}>
          {DEVICE_MODE_LABEL[d.current_mode]}
        </Badge>
      ),
    },
    { key: 'ble', header: 'BLE 이름', render: (d) => d.ble_name ?? '-' },
    { key: 'fw', header: '펌웨어', render: (d) => d.firmware_version ?? '-' },
    { key: 'sync', header: '마지막 동기화', render: (d) => fmtDate(d.last_sync_at) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (d) => (
        <div className={styles.rowActions}>
          {canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
              편집
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={d.current_mode === 'racing'}
              title={d.current_mode === 'racing' ? '레이싱 중에는 삭제할 수 없습니다' : undefined}
              onClick={() => setDeleting(d)}
            >
              삭제
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.tabBody}>
      <div className={styles.kpis}>
        <StatCard label="전체 기기" value={total.toLocaleString('ko-KR')} loading={devices.loading} />
        <StatCard label="온라인" value={online.toLocaleString('ko-KR')} loading={devices.loading} />
        <StatCard label="레이싱 중" value={racing.toLocaleString('ko-KR')} loading={devices.loading} />
      </div>

      <div className={styles.toolbar}>
        <p className={styles.note}>
          Python 브릿지(REST /api/ble/status) 연결 상태·실시간 mode 동기화는 ⏳ (브릿지 연동
          후속).
        </p>
        {canEdit ? (
          <Button variant="primary" onClick={openNew}>
            기기 등록
          </Button>
        ) : null}
      </div>

      <Table<Pm5Device>
        columns={columns}
        rows={list}
        rowKey={(d) => d.id}
        loading={devices.loading}
        empty={
          devices.error
            ? { variant: 'error', title: '기기를 불러오지 못했습니다', description: devices.error, onRetry: devices.refetch }
            : { title: '등록된 기기가 없습니다', description: 'PM5 기기를 등록하세요.', action: canEdit ? { label: '기기 등록', onClick: openNew } : undefined }
        }
      />

      {editOpen ? (
        <Pm5DeviceEditModal
          key={editing?.id ?? 'new'}
          device={editing}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            devices.refetch();
          }}
        />
      ) : null}

      <ConfirmModal
        open={deleting != null}
        title="PM5 기기 삭제"
        variant="danger"
        confirmLabel="삭제"
        loading={busy}
        message={
          <>
            시리얼 <strong>{deleting?.serial_number}</strong> 기기를 삭제합니다. 되돌릴 수 없습니다.
          </>
        }
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
