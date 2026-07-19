'use client';

// 설정 · 감사 탭 (02-admin §3.14 audit) — 권한 그룹 'audit'
// audit_logs 조회(최근순, 필터: user/action/table). old/new_values diff 뷰. 읽기 전용(append-only).
import { useMemo, useState } from 'react';
import { Card, Table, Input, Select, Badge, Modal, Button } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type AuditLogRow, fmtDateTime } from './types';
import styles from './settings.module.css';

interface ProfileLite {
  id: string;
  name: string | null;
  email: string | null;
}

const PAGE_SIZE = 20;

export function AuditTab() {
  const { can } = useMyPermissions();
  const client = getSupabaseBrowserClient();

  const logs = useQuery<AuditLogRow[]>(
    () =>
      query<AuditLogRow[]>(client, 'audit_logs', (q) =>
        q
          .select('id,user_id,action,table_name,record_id,old_values,new_values,created_at')
          .order('created_at', { ascending: false })
          .limit(300),
      ),
    [],
  );

  const profiles = useQuery<ProfileLite[]>(
    () =>
      query<ProfileLite[]>(client, 'profiles', (q) => q.select('id,name,email')),
    [],
  );

  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditLogRow | null>(null);

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileLite>();
    for (const p of profiles.data ?? []) m.set(p.id, p);
    return m;
  }, [profiles.data]);

  const tableOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs.data ?? []) if (l.table_name) set.add(l.table_name);
    return [{ value: 'all', label: '전체 테이블' }, ...Array.from(set).sort().map((t) => ({ value: t, label: t }))];
  }, [logs.data]);

  const filtered = useMemo(() => {
    let list = logs.data ?? [];
    if (actionFilter.trim()) {
      const q = actionFilter.trim().toLowerCase();
      list = list.filter((l) => l.action.toLowerCase().includes(q));
    }
    if (tableFilter !== 'all') list = list.filter((l) => l.table_name === tableFilter);
    return list;
  }, [logs.data, actionFilter, tableFilter]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  if (!can('audit', 'view')) {
    return (
      <div className={styles.tabPanel}>
        <Card>
          <p className={styles.note}>감사 로그 조회 권한이 없습니다.</p>
        </Card>
      </div>
    );
  }

  const columns: TableColumn<AuditLogRow>[] = [
    { key: 'created_at', header: '시각', render: (l) => <span className={styles.cellSub}>{fmtDateTime(l.created_at)}</span> },
    {
      key: 'user',
      header: '행위자',
      render: (l) => {
        const p = l.user_id ? profileMap.get(l.user_id) : null;
        return <span className={styles.cellSub}>{p?.name ?? p?.email ?? l.user_id ?? '시스템'}</span>;
      },
    },
    { key: 'action', header: '액션', render: (l) => <Badge variant="neutral">{l.action}</Badge> },
    { key: 'table', header: '대상', render: (l) => <span className={styles.cellSub}>{l.table_name ?? '-'}</span> },
    {
      key: 'detail',
      header: '',
      align: 'right',
      render: (l) => (
        <Button variant="ghost" size="sm" onClick={() => setDetail(l)}>
          상세
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.tabPanel}>
      <div className={styles.toolbar}>
        <div className={styles.filter}>
          <Input
            label="액션 검색"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            placeholder="예: PROMOTE"
          />
        </div>
        <div className={styles.filter}>
          <Select
            label="테이블"
            value={tableFilter}
            onChange={(v) => {
              setTableFilter(v);
              setPage(1);
            }}
            options={tableOptions}
          />
        </div>
      </div>

      <Table<AuditLogRow>
        columns={columns}
        rows={paged}
        rowKey={(l) => l.id}
        loading={logs.loading}
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
        empty={
          logs.error
            ? { variant: 'error', title: '감사 로그를 불러오지 못했습니다', description: logs.error, onRetry: logs.refetch }
            : { title: '감사 로그가 없습니다', description: '기록된 감사 이벤트가 없습니다.' }
        }
      />

      {detail ? (
        <Modal
          open
          onClose={() => setDetail(null)}
          title={`감사 상세 · ${detail.action}`}
          size="lg"
          footer={
            <Button variant="ghost" onClick={() => setDetail(null)}>
              닫기
            </Button>
          }
        >
          <div className={styles.form}>
            <p className={styles.note}>
              {fmtDateTime(detail.created_at)} · 대상: {detail.table_name ?? '-'} ·
              레코드: {detail.record_id ?? '-'}
            </p>
            <div className={styles.diff}>
              <div className={styles.diffCol}>
                <h4 className={styles.sectionTitle}>이전 값</h4>
                <pre className={styles.pre}>
                  {detail.old_values ? JSON.stringify(detail.old_values, null, 2) : '(없음)'}
                </pre>
              </div>
              <div className={styles.diffCol}>
                <h4 className={styles.sectionTitle}>이후 값</h4>
                <pre className={styles.pre}>
                  {detail.new_values ? JSON.stringify(detail.new_values, null, 2) : '(없음)'}
                </pre>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
