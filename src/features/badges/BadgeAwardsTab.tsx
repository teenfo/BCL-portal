'use client';

// 배지 수여 현황 (02-admin §3.11 awards) — 조회 위주 + 수동 부여/회수(간략).
// 자동 수여는 fn_evaluate_badges(트리거) 경유. 수동은 badge_awards 직접 쓰기(admin manage RLS).
// ⏳ audit: 수동 부여/회수 audit_logs 미기록. 회수 사유는 스키마에 저장 컬럼 없음(⏳).
import { useEffect, useMemo, useState } from 'react';
import { Button, Table, Badge, Select, Modal, Input, Card, ConfirmModal, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  type BadgeAwardRow,
  type BadgeDefinition,
  CATEGORY_LABEL,
  writeError,
  fmtDateTime,
} from './types';
import styles from './badges.module.css';

interface MemberHit {
  id: string;
  name: string;
  phone: string | null;
}

export function BadgeAwardsTab() {
  const toast = useToast();
  const client = getSupabaseBrowserClient();
  const { can } = useMyPermissions();
  const canEdit = can('badges', 'edit');
  const canDelete = can('badges', 'delete');

  const [sourceFilter, setSourceFilter] = useState('all');
  const [awardOpen, setAwardOpen] = useState(false);
  const [revoking, setRevoking] = useState<BadgeAwardRow | null>(null);
  const [busy, setBusy] = useState(false);

  const awards = useQuery<BadgeAwardRow[]>(
    () =>
      query<BadgeAwardRow[]>(client, 'badge_awards', (q) =>
        q
          .select(
            'id,member_id,badge_id,source,progress_value,awarded_at,members(name),badge_definitions(name,slug,category)',
          )
          .order('awarded_at', { ascending: false })
          .limit(200),
      ),
    [],
  );

  const rows = useMemo(() => {
    const list = awards.data ?? [];
    return sourceFilter === 'all' ? list : list.filter((a) => a.source === sourceFilter);
  }, [awards.data, sourceFilter]);

  const confirmRevoke = async () => {
    if (!revoking) return;
    setBusy(true);
    const res = await query(client, 'badge_awards', (q) => q.delete().eq('id', revoking.id));
    setBusy(false);
    if (!res.success) {
      toast.error(writeError(res.error));
      return;
    }
    toast.success('배지를 회수했습니다.');
    setRevoking(null);
    awards.refetch();
  };

  const columns: TableColumn<BadgeAwardRow>[] = [
    { key: 'member', header: '회원', render: (a) => a.members?.name ?? '(미연결)' },
    { key: 'badge', header: '배지', render: (a) => a.badge_definitions?.name ?? a.badge_id },
    {
      key: 'category',
      header: '분류',
      render: (a) =>
        a.badge_definitions ? (
          <Badge variant="neutral">{CATEGORY_LABEL[a.badge_definitions.category]}</Badge>
        ) : (
          '-'
        ),
    },
    {
      key: 'source',
      header: '수여 경로',
      render: (a) =>
        a.source === 'manual' ? (
          <Badge variant="warning">수동</Badge>
        ) : (
          <Badge variant="info">자동</Badge>
        ),
    },
    {
      key: 'progress',
      header: '지표값',
      align: 'right',
      render: (a) => (a.progress_value != null ? a.progress_value.toLocaleString('ko-KR') : '-'),
    },
    { key: 'at', header: '수여 시각', render: (a) => fmtDateTime(a.awarded_at) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (a) =>
        canDelete ? (
          <div className={styles.rowActions}>
            <Button variant="ghost" size="sm" onClick={() => setRevoking(a)}>
              회수
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className={styles.tabBody}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <div className={styles.filter}>
            <Select
              label="수여 경로"
              value={sourceFilter}
              onChange={setSourceFilter}
              options={[
                { value: 'all', label: '전체' },
                { value: 'auto', label: '자동' },
                { value: 'manual', label: '수동' },
              ]}
            />
          </div>
        </div>
        {canEdit ? (
          <Button variant="primary" onClick={() => setAwardOpen(true)}>
            수동 수여
          </Button>
        ) : null}
      </div>

      <Table<BadgeAwardRow>
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        loading={awards.loading}
        empty={
          awards.error
            ? { variant: 'error', title: '수여 내역을 불러오지 못했습니다', description: awards.error, onRetry: awards.refetch }
            : { title: '수여 내역이 없습니다', description: '자동 판정 또는 수동 수여 시 표시됩니다.' }
        }
      />

      {awardOpen ? (
        <ManualAwardModal
          onClose={() => setAwardOpen(false)}
          onDone={() => {
            setAwardOpen(false);
            awards.refetch();
          }}
        />
      ) : null}

      <ConfirmModal
        open={revoking != null}
        title="배지 회수"
        variant="danger"
        confirmLabel="회수"
        loading={busy}
        message={
          <>
            <strong>{revoking?.members?.name ?? '회원'}</strong>님의{' '}
            <strong>{revoking?.badge_definitions?.name ?? '배지'}</strong>를 회수합니다. 회원 앱에서
            즉시 사라집니다.
          </>
        }
        onConfirm={confirmRevoke}
        onClose={() => setRevoking(null)}
      />
    </div>
  );
}

// 수동 수여 모달 — 회원 검색 + 배지 선택 → badge_awards insert(source=manual, awarded_by)
function ManualAwardModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const client = getSupabaseBrowserClient();

  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [target, setTarget] = useState<MemberHit | null>(null);
  const [badgeId, setBadgeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const defs = useQuery<BadgeDefinition[]>(
    () =>
      query<BadgeDefinition[]>(client, 'badge_definitions', (q) =>
        q.select('*').eq('is_active', true).order('sort_order'),
      ),
    [],
  );

  const search = useQuery<MemberHit[]>(
    () => {
      if (!debounced) return Promise.resolve({ success: true, data: [], error: null });
      const esc = debounced.replace(/[%,()]/g, ' ');
      return query<MemberHit[]>(client, 'members', (q) =>
        q.select('id,name,phone').or(`name.ilike.%${esc}%,phone.ilike.%${esc}%`).limit(8),
      );
    },
    [debounced],
  );
  const results = search.data ?? [];

  const doAward = async () => {
    if (!target) {
      setError('회원을 선택하세요.');
      return;
    }
    if (!badgeId) {
      setError('배지를 선택하세요.');
      return;
    }
    setBusy(true);
    setError(null);
    // 수여자 기록(awarded_by) — auth 세션에서 uid 조회(DB 아님)
    const { data: userData } = await client.auth.getUser();
    const res = await query(client, 'badge_awards', (q) =>
      q.insert({
        member_id: target.id,
        badge_id: badgeId,
        source: 'manual',
        awarded_by: userData?.user?.id ?? null,
      }),
    );
    setBusy(false);
    if (!res.success) {
      setError(writeError(res.error));
      return;
    }
    toast.success('배지를 수동 수여했습니다.');
    onDone();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="배지 수동 수여"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            취소
          </Button>
          <Button variant="primary" onClick={doAward} loading={busy} disabled={!target || !badgeId}>
            수여
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {error ? (
          <Card variant="accent">
            <span className={styles.errorText}>{error}</span>
          </Card>
        ) : null}

        <Input
          label="회원 검색 (이름·전화)"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="수여할 회원"
        />
        {results.length > 0 ? (
          <div className={styles.searchResults}>
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`${styles.searchItem}${target?.id === r.id ? ` ${styles.searchItemActive}` : ''}`}
                onClick={() => setTarget(r)}
              >
                <span>{r.name}</span>
                <span className={styles.hint}>{r.phone ?? '-'}</span>
              </button>
            ))}
          </div>
        ) : null}
        {target ? (
          <p className={styles.note}>
            선택된 회원: <strong>{target.name}</strong>
          </p>
        ) : null}

        <Select
          label="배지"
          value={badgeId}
          onChange={(v) => setBadgeId(v)}
          searchable
          placeholder={defs.loading ? '배지 불러오는 중…' : '배지 선택'}
          options={(defs.data ?? []).map((d) => ({ value: d.id, label: `${d.name} (${d.slug})` }))}
        />

        <p className={styles.note}>
          동일 회원에게 같은 배지는 1회만 수여됩니다(중복 차단). 회수 사유 저장 컬럼은 미도입(⏳).
        </p>
      </div>
    </Modal>
  );
}
