'use client';

// CRM notifications 탭 — 자동 규칙(notification_rules) 조회·편집 + 발송 이력(notification_logs) 조회 + Compose (02-admin §3.13)
// 규칙은 직접 INSERT/UPDATE(admin RLS, ⏳ audit). 실제 발송(pg_net/EF/cron)은 서버 경로 — 화면은 규칙·이력·작성 UI까지만.
import { useMemo, useState } from 'react';
import { Button, Table, Badge, Select, ConfirmModal, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { NotificationRuleModal } from './NotificationRuleModal';
import { ComposeModal } from './ComposeModal';
import { type NotificationRule, type NotificationLog, TRIGGER_TYPE_LABEL } from './types';
import styles from './crm.module.css';

const LOG_STATUS_BADGE: Record<NotificationLog['status'], 'neutral' | 'success' | 'danger' | 'info'> = {
  pending: 'neutral',
  sent: 'success',
  failed: 'danger',
  read: 'info',
};

const fmtDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ko-KR') : '—');

export function CrmNotifications() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('crm', 'edit');
  const canDelete = can('crm', 'delete');

  const [ruleEdit, setRuleEdit] = useState<{ open: boolean; row: NotificationRule | null }>({ open: false, row: null });
  const [delRule, setDelRule] = useState<NotificationRule | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [logStatus, setLogStatus] = useState<string>('all');
  const [busy, setBusy] = useState(false);

  const rules = useQuery<NotificationRule[]>(
    () =>
      query<NotificationRule[]>(getSupabaseBrowserClient(), 'notification_rules', (q) =>
        q.select('*').order('created_at', { ascending: false }).limit(200),
      ),
    [],
  );

  const logs = useQuery<NotificationLog[]>(
    () =>
      query<NotificationLog[]>(getSupabaseBrowserClient(), 'notification_logs', (q) =>
        q.select('*').order('created_at', { ascending: false }).limit(300),
      ),
    [],
  );

  const logRows = useMemo(() => {
    let list = logs.data ?? [];
    if (logStatus !== 'all') list = list.filter((l) => l.status === logStatus);
    return list;
  }, [logs.data, logStatus]);

  const removeRule = async () => {
    if (!delRule) return;
    if (delRule.is_active) {
      toast.error('활성 규칙은 먼저 비활성화한 뒤 삭제하세요.');
      setDelRule(null);
      return;
    }
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'notification_rules', (q) => q.delete().eq('id', delRule.id));
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '삭제에 실패했습니다.');
      return;
    }
    toast.success('규칙을 삭제했습니다.');
    setDelRule(null);
    rules.refetch();
  };

  const toggleActive = async (rule: NotificationRule) => {
    const res = await query(getSupabaseBrowserClient(), 'notification_rules', (q) =>
      q.update({ is_active: !rule.is_active, updated_at: new Date().toISOString() }).eq('id', rule.id),
    );
    if (!res.success) {
      toast.error(res.error ?? '상태 변경에 실패했습니다.');
      return;
    }
    toast.success(rule.is_active ? '규칙을 비활성화했습니다.' : '규칙을 활성화했습니다.');
    rules.refetch();
  };

  const ruleColumns: TableColumn<NotificationRule>[] = [
    { key: 'name', header: '이름', render: (r) => r.name },
    { key: 'trigger', header: '트리거', render: (r) => <Badge variant="neutral">{TRIGGER_TYPE_LABEL[r.trigger_type]}</Badge> },
    { key: 'channels', header: '채널', render: (r) => r.channels.join(', ') },
    {
      key: 'active',
      header: '상태',
      render: (r) => (r.is_active ? <Badge variant="success">활성</Badge> : <Badge variant="neutral">비활성</Badge>),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div className={styles.rowActions}>
          {canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => toggleActive(r)}>
              {r.is_active ? '비활성화' : '활성화'}
            </Button>
          ) : null}
          {canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => setRuleEdit({ open: true, row: r })}>
              편집
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="sm" onClick={() => setDelRule(r)}>
              삭제
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const logColumns: TableColumn<NotificationLog>[] = [
    { key: 'created', header: '생성', render: (l) => fmtDateTime(l.created_at) },
    { key: 'channel', header: '채널', render: (l) => <Badge variant="neutral">{l.channel}</Badge> },
    { key: 'status', header: '상태', render: (l) => <Badge variant={LOG_STATUS_BADGE[l.status]}>{l.status}</Badge> },
    { key: 'sent', header: '발송시각', render: (l) => fmtDateTime(l.sent_at) },
    { key: 'error', header: '오류', render: (l) => l.error_message ?? '—' },
  ];

  return (
    <div className={styles.tabPanel}>
      {/* 자동 규칙 */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>자동 알림 규칙</h2>
          <div className={styles.rowActions}>
            {canEdit ? (
              <Button variant="soft" size="sm" onClick={() => setComposeOpen(true)}>
                수동 발송
              </Button>
            ) : null}
            {canEdit ? (
              <Button variant="primary" size="sm" onClick={() => setRuleEdit({ open: true, row: null })}>
                새 규칙
              </Button>
            ) : null}
          </div>
        </div>
        <Table<NotificationRule>
          columns={ruleColumns}
          rows={rules.data ?? []}
          rowKey={(r) => r.id}
          loading={rules.loading}
          empty={
            rules.error
              ? { variant: 'error', title: '규칙을 불러오지 못했습니다', description: rules.error, onRetry: rules.refetch }
              : { title: '자동 규칙이 없습니다', description: '수업 리마인더·만기 알림 등 자동 규칙을 만드세요.' }
          }
        />
      </section>

      {/* 발송 이력 */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>발송 이력</h2>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filter}>
            <Select
              label="상태"
              value={logStatus}
              onChange={setLogStatus}
              options={[
                { value: 'all', label: '전체' },
                { value: 'pending', label: '대기' },
                { value: 'sent', label: '발송' },
                { value: 'failed', label: '실패' },
                { value: 'read', label: '읽음' },
              ]}
            />
          </div>
          <div className={styles.spacer} />
          <Button variant="ghost" onClick={() => logs.refetch()}>
            새로고침
          </Button>
        </div>
        <Table<NotificationLog>
          columns={logColumns}
          rows={logRows}
          rowKey={(l) => l.id}
          loading={logs.loading}
          empty={
            logs.error
              ? { variant: 'error', title: '발송 이력을 불러오지 못했습니다', description: logs.error, onRetry: logs.refetch }
              : { title: '발송 이력이 없습니다', description: '조건에 맞는 발송 로그가 없습니다.' }
          }
        />
        <p className={styles.hint}>실패 재발송은 서버 발송 경로(pg_net/Edge Function)로만 실행됩니다. (⏳ 화면 직접 발송 금지)</p>
      </section>

      {ruleEdit.open ? (
        <NotificationRuleModal
          key={ruleEdit.row?.id ?? 'new'}
          rule={ruleEdit.row}
          onClose={() => setRuleEdit({ open: false, row: null })}
          onSaved={() => {
            setRuleEdit({ open: false, row: null });
            rules.refetch();
          }}
        />
      ) : null}

      {composeOpen ? <ComposeModal onClose={() => setComposeOpen(false)} /> : null}

      <ConfirmModal
        open={delRule != null}
        title="규칙 삭제"
        message={
          <>
            <strong>{delRule?.name}</strong> 규칙을 삭제합니다. 활성 규칙은 먼저 비활성화해야 합니다.
          </>
        }
        confirmLabel="삭제"
        variant="danger"
        loading={busy}
        onConfirm={removeRule}
        onClose={() => setDelRule(null)}
      />
    </div>
  );
}
