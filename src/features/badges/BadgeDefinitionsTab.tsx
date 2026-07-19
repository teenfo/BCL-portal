'use client';

// 배지 정의 목록/CRUD (02-admin §3.11 definitions)
// 전용 CRUD RPC 부재 → badge_definitions 직접 쓰기(admin manage RLS). ⏳ audit 미기록.
// 파괴적: 수여 이력 존재 시 삭제 차단 → 비활성만. 조건 변경은 소급 재판정 없음(신규 이벤트부터).
import { useMemo, useState } from 'react';
import { Button, Table, Badge, Select, ConfirmModal, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { BadgeDefEditModal } from './BadgeDefEditModal';
import {
  type BadgeDefinition,
  CATEGORY_LABEL,
  METRIC_TYPE_LABEL,
  writeError,
} from './types';
import styles from './badges.module.css';

export function BadgeDefinitionsTab() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('badges', 'edit');
  const canDelete = can('badges', 'delete');

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<BadgeDefinition | null>(null);
  const [deleting, setDeleting] = useState<BadgeDefinition | null>(null);
  const [busy, setBusy] = useState(false);

  const defs = useQuery<BadgeDefinition[]>(
    () =>
      query<BadgeDefinition[]>(getSupabaseBrowserClient(), 'badge_definitions', (q) =>
        q.select('*').order('sort_order'),
      ),
    [],
  );

  const rows = useMemo(() => {
    const list = defs.data ?? [];
    return categoryFilter === 'all' ? list : list.filter((d) => d.category === categoryFilter);
  }, [defs.data, categoryFilter]);

  const openNew = () => {
    setEditing(null);
    setEditOpen(true);
  };
  const openEdit = (d: BadgeDefinition) => {
    setEditing(d);
    setEditOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const client = getSupabaseBrowserClient();
    // 수여 이력 존재 시 삭제 차단(doc §3.11) — 이력 있으면 비활성만.
    const awardCheck = await query<{ id: string }[]>(client, 'badge_awards', (q) =>
      q.select('id').eq('badge_id', deleting.id).limit(1),
    );
    if (awardCheck.success && (awardCheck.data?.length ?? 0) > 0) {
      setBusy(false);
      toast.error('수여 이력이 있어 삭제할 수 없습니다. 비활성 처리만 가능합니다.');
      setDeleting(null);
      return;
    }
    const res = await query(client, 'badge_definitions', (q) => q.delete().eq('id', deleting.id));
    setBusy(false);
    if (!res.success) {
      toast.error(writeError(res.error));
      return;
    }
    toast.success('배지 정의를 삭제했습니다.');
    setDeleting(null);
    defs.refetch();
  };

  const columns: TableColumn<BadgeDefinition>[] = [
    { key: 'name', header: '이름', render: (d) => d.name },
    { key: 'slug', header: 'slug', render: (d) => <span className={styles.hint}>{d.slug}</span> },
    {
      key: 'category',
      header: '분류',
      render: (d) => <Badge variant="neutral">{CATEGORY_LABEL[d.category]}</Badge>,
    },
    { key: 'metric', header: '조건 유형', render: (d) => METRIC_TYPE_LABEL[d.metric_type] },
    {
      key: 'threshold',
      header: '기준값',
      align: 'right',
      render: (d) => (d.metric_type === 'manual' ? '-' : d.threshold_value.toLocaleString('ko-KR')),
    },
    {
      key: 'active',
      header: '상태',
      render: (d) =>
        d.is_active ? <Badge variant="success">활성</Badge> : <Badge variant="neutral">비활성</Badge>,
    },
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
            <Button variant="ghost" size="sm" onClick={() => setDeleting(d)}>
              삭제
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.tabBody}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <div className={styles.filter}>
            <Select
              label="분류"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: '전체' },
                { value: 'attendance', label: '출석' },
                { value: 'performance', label: '퍼포먼스' },
                { value: 'race', label: '레이스' },
                { value: 'membership', label: '멤버십' },
                { value: 'special', label: '특별' },
              ]}
            />
          </div>
        </div>
        {canEdit ? (
          <Button variant="primary" onClick={openNew}>
            새 배지 정의
          </Button>
        ) : null}
      </div>

      <p className={styles.note}>
        자동 판정 배지는 checkins/benchmark/race/membership 이벤트 트리거(fn_evaluate_badges)로
        수여됩니다. 조건 변경은 소급 재판정되지 않고 신규 이벤트부터 적용됩니다. 조건 시뮬레이션
        미리보기는 ⏳.
      </p>

      <Table<BadgeDefinition>
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        loading={defs.loading}
        empty={
          defs.error
            ? { variant: 'error', title: '배지 정의를 불러오지 못했습니다', description: defs.error, onRetry: defs.refetch }
            : { title: '배지 정의가 없습니다', description: '새 배지 정의를 만드세요.', action: canEdit ? { label: '새 배지 정의', onClick: openNew } : undefined }
        }
      />

      {editOpen ? (
        <BadgeDefEditModal
          key={editing?.id ?? 'new'}
          badge={editing}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            defs.refetch();
          }}
        />
      ) : null}

      <ConfirmModal
        open={deleting != null}
        title="배지 정의 삭제"
        variant="danger"
        confirmLabel="삭제"
        loading={busy}
        message={
          <>
            <strong>{deleting?.name}</strong> 배지 정의를 삭제합니다. 수여 이력이 있으면 삭제되지
            않으며 비활성 처리만 가능합니다.
          </>
        }
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
