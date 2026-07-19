'use client';

// Race 이벤트 목록/CRUD (02-admin §3.9 events)
// 전용 CRUD RPC 부재 → race_events 직접 쓰기(admin RLS: staff insert/update, admin delete).
// ⏳ audit: race_events 쓰기는 audit_logs 미기록 — 전용 RPC 도입 시 감사 래핑 필요.
// 세션 연동(session_id)은 fn_prepare_race_session(코치앱 경로) 소관 → 여기선 미설정(⏳).
import { useMemo, useState } from 'react';
import { Button, Table, Badge, Select, ConfirmModal, useToast } from '@/components/ui';
import type { TableColumn, BadgeVariant } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { RaceEventEditModal } from './RaceEventEditModal';
import {
  type RaceEvent,
  type RaceStatus,
  EVENT_TYPE_LABEL,
  RACE_FORMAT_LABEL,
  RACE_STATUS_LABEL,
  LOBBY_STATUS_LABEL,
  writeError,
  fmtDate,
} from './types';
import styles from './race-admin.module.css';

const STATUS_BADGE: Record<RaceStatus, BadgeVariant> = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'neutral',
};

export function RaceEventsTab() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('race', 'edit');
  const canDelete = can('race', 'delete');

  const [statusFilter, setStatusFilter] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RaceEvent | null>(null);
  const [deleting, setDeleting] = useState<RaceEvent | null>(null);
  const [busy, setBusy] = useState(false);

  const events = useQuery<RaceEvent[]>(
    () =>
      query<RaceEvent[]>(getSupabaseBrowserClient(), 'race_events', (q) =>
        q.select('*').order('event_date', { ascending: false }).limit(200),
      ),
    [],
  );

  const rows = useMemo(() => {
    const list = events.data ?? [];
    return statusFilter === 'all' ? list : list.filter((e) => e.status === statusFilter);
  }, [events.data, statusFilter]);

  const openNew = () => {
    setEditing(null);
    setEditOpen(true);
  };
  const openEdit = (e: RaceEvent) => {
    setEditing(e);
    setEditOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'race_events', (q) =>
      q.delete().eq('id', deleting.id),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(writeError(res.error));
      return;
    }
    toast.success('이벤트를 삭제했습니다.');
    setDeleting(null);
    events.refetch();
  };

  const columns: TableColumn<RaceEvent>[] = [
    { key: 'name', header: '이름', render: (e) => e.name },
    { key: 'date', header: '일자', render: (e) => fmtDate(e.event_date) },
    {
      key: 'type',
      header: '종목',
      render: (e) => <Badge variant="neutral">{EVENT_TYPE_LABEL[e.event_type]}</Badge>,
    },
    {
      key: 'format',
      header: '포맷',
      render: (e) => (
        <Badge variant="info">
          {RACE_FORMAT_LABEL[e.race_format]}
          {e.race_format === 'group' && e.heat_no > 1 ? ` H${e.heat_no}` : ''}
        </Badge>
      ),
    },
    {
      key: 'target',
      header: '목표',
      align: 'right',
      render: (e) =>
        e.group_target_m
          ? `${e.group_target_m.toLocaleString('ko-KR')}m(공동)`
          : e.target_distance_m
            ? `${e.target_distance_m.toLocaleString('ko-KR')}m`
            : e.duration_minutes
              ? `${e.duration_minutes}분`
              : '-',
    },
    {
      key: 'status',
      header: '상태',
      render: (e) => <Badge variant={STATUS_BADGE[e.status]}>{RACE_STATUS_LABEL[e.status]}</Badge>,
    },
    {
      key: 'lobby',
      header: '진행',
      render: (e) => (
        <span className={styles.note}>{LOBBY_STATUS_LABEL[e.lobby_status]}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (e) => (
        <div className={styles.rowActions}>
          {canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
              편집
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="sm" onClick={() => setDeleting(e)}>
              삭제
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const isRacing = deleting?.status === 'in_progress';

  return (
    <div className={styles.tabBody}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <div className={styles.filter}>
            <Select
              label="상태"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: '전체' },
                { value: 'scheduled', label: '예정' },
                { value: 'in_progress', label: '진행 중' },
                { value: 'completed', label: '완료' },
                { value: 'cancelled', label: '취소' },
              ]}
            />
          </div>
        </div>
        {canEdit ? (
          <Button variant="primary" onClick={openNew}>
            새 이벤트
          </Button>
        ) : null}
      </div>

      <Table<RaceEvent>
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        loading={events.loading}
        empty={
          events.error
            ? { variant: 'error', title: '이벤트를 불러오지 못했습니다', description: events.error, onRetry: events.refetch }
            : { title: '이벤트가 없습니다', description: '새 Race 이벤트를 만들어 시작하세요.', action: canEdit ? { label: '새 이벤트', onClick: openNew } : undefined }
        }
      />

      {editOpen ? (
        <RaceEventEditModal
          key={editing?.id ?? 'new'}
          event={editing}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            events.refetch();
          }}
        />
      ) : null}

      <ConfirmModal
        open={deleting != null}
        title="Race 이벤트 삭제"
        variant="danger"
        confirmLabel="삭제"
        loading={busy}
        requireTyping={isRacing ? '삭제' : undefined}
        message={
          <>
            <strong>{deleting?.name}</strong> 이벤트를 삭제합니다.
            {isRacing ? (
              <>
                {' '}이 이벤트는 <strong>진행 중(racing)</strong>이며 라이브 데이터가 유실됩니다.
                계속하려면 &quot;삭제&quot;를 입력하세요.
              </>
            ) : (
              ' 되돌릴 수 없습니다.'
            )}
          </>
        }
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
