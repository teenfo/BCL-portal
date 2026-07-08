'use client';

// CRM support 탭 — 문의 티켓(support_tickets) 상태 관리 + FAQ(faqs) CRUD (02-admin §3.13)
// 직접 UPDATE/INSERT/DELETE(admin RLS). ⏳ audit_logs 기록은 서버 RPC 경로 필요.
import { useMemo, useState } from 'react';
import { Button, Table, Badge, Select, ConfirmModal, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { TicketModal } from './TicketModal';
import { FaqEditModal } from './FaqEditModal';
import {
  type SupportTicket,
  type Faq,
  TICKET_STATUS_LABEL,
  TICKET_CATEGORY_LABEL,
} from './types';
import styles from './crm.module.css';

const TICKET_STATUS_BADGE: Record<SupportTicket['status'], 'warning' | 'info' | 'success' | 'neutral'> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'neutral',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ko-KR');

export function CrmSupport() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('crm', 'edit');
  const canDelete = can('crm', 'delete');

  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [faqEdit, setFaqEdit] = useState<{ open: boolean; row: Faq | null }>({ open: false, row: null });
  const [delFaq, setDelFaq] = useState<Faq | null>(null);
  const [busy, setBusy] = useState(false);

  const tickets = useQuery<SupportTicket[]>(
    () =>
      query<SupportTicket[]>(getSupabaseBrowserClient(), 'support_tickets', (q) =>
        q.select('*, members(name)').order('created_at', { ascending: false }).limit(300),
      ),
    [],
  );

  const faqs = useQuery<Faq[]>(
    () => query<Faq[]>(getSupabaseBrowserClient(), 'faqs', (q) => q.select('*').order('sort_order', { ascending: true }).limit(300)),
    [],
  );

  const ticketRows = useMemo(() => {
    let list = tickets.data ?? [];
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    return list;
  }, [tickets.data, statusFilter]);

  const removeFaq = async () => {
    if (!delFaq) return;
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'faqs', (q) => q.delete().eq('id', delFaq.id));
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '삭제에 실패했습니다.');
      return;
    }
    toast.success('FAQ를 삭제했습니다.');
    setDelFaq(null);
    faqs.refetch();
  };

  const ticketColumns: TableColumn<SupportTicket>[] = [
    { key: 'created', header: '접수', render: (t) => fmtDate(t.created_at) },
    { key: 'subject', header: '제목', render: (t) => t.subject },
    { key: 'member', header: '회원', render: (t) => t.members?.name ?? '—' },
    { key: 'category', header: '분류', render: (t) => <Badge variant="neutral">{TICKET_CATEGORY_LABEL[t.category]}</Badge> },
    { key: 'status', header: '상태', render: (t) => <Badge variant={TICKET_STATUS_BADGE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (t) => (
        <Button variant="ghost" size="sm" onClick={() => setTicket(t)}>
          {canEdit ? '처리' : '보기'}
        </Button>
      ),
    },
  ];

  const faqColumns: TableColumn<Faq>[] = [
    { key: 'order', header: '순서', align: 'right', render: (f) => f.sort_order },
    { key: 'category', header: '분류', render: (f) => <Badge variant="neutral">{f.category}</Badge> },
    { key: 'question', header: '질문', render: (f) => f.question },
    {
      key: 'published',
      header: '노출',
      render: (f) => (f.is_published ? <Badge variant="success">공개</Badge> : <Badge variant="neutral">비공개</Badge>),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (f) => (
        <div className={styles.rowActions}>
          {canEdit ? (
            <Button variant="ghost" size="sm" onClick={() => setFaqEdit({ open: true, row: f })}>
              편집
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="sm" onClick={() => setDelFaq(f)}>
              삭제
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.tabPanel}>
      {/* 문의 티켓 */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>문의 티켓</h2>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.filter}>
            <Select
              label="상태"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'open', label: '접수' },
                { value: 'in_progress', label: '처리 중' },
                { value: 'resolved', label: '완료' },
                { value: 'closed', label: '종료' },
                { value: 'all', label: '전체' },
              ]}
            />
          </div>
          <div className={styles.spacer} />
          <Button variant="ghost" onClick={() => tickets.refetch()}>
            새로고침
          </Button>
        </div>
        <Table<SupportTicket>
          columns={ticketColumns}
          rows={ticketRows}
          rowKey={(t) => t.id}
          loading={tickets.loading}
          empty={
            tickets.error
              ? { variant: 'error', title: '티켓을 불러오지 못했습니다', description: tickets.error, onRetry: tickets.refetch }
              : { title: '문의 티켓이 없습니다', description: '조건에 맞는 티켓이 없습니다.' }
          }
        />
      </section>

      {/* FAQ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>FAQ</h2>
          {canEdit ? (
            <Button variant="primary" size="sm" onClick={() => setFaqEdit({ open: true, row: null })}>
              새 FAQ
            </Button>
          ) : null}
        </div>
        <Table<Faq>
          columns={faqColumns}
          rows={faqs.data ?? []}
          rowKey={(f) => f.id}
          loading={faqs.loading}
          empty={
            faqs.error
              ? { variant: 'error', title: 'FAQ를 불러오지 못했습니다', description: faqs.error, onRetry: faqs.refetch }
              : { title: 'FAQ가 없습니다', description: '자주 묻는 질문을 등록하세요.' }
          }
        />
      </section>

      {ticket ? (
        <TicketModal
          key={ticket.id}
          ticket={ticket}
          readOnly={!canEdit}
          onClose={() => setTicket(null)}
          onSaved={() => {
            setTicket(null);
            tickets.refetch();
          }}
        />
      ) : null}

      {faqEdit.open ? (
        <FaqEditModal
          key={faqEdit.row?.id ?? 'new'}
          faq={faqEdit.row}
          onClose={() => setFaqEdit({ open: false, row: null })}
          onSaved={() => {
            setFaqEdit({ open: false, row: null });
            faqs.refetch();
          }}
        />
      ) : null}

      <ConfirmModal
        open={delFaq != null}
        title="FAQ 삭제"
        message={
          <>
            <strong>{delFaq?.question}</strong> 항목을 삭제합니다. 되돌릴 수 없습니다.
          </>
        }
        confirmLabel="삭제"
        variant="danger"
        loading={busy}
        onConfirm={removeFaq}
        onClose={() => setDelFaq(null)}
      />
    </div>
  );
}
