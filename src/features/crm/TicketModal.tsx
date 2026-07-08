'use client';

// 문의 티켓 처리 모달 (02-admin §3.13)
// 상태/우선순위/담당자 직접 UPDATE(support_tickets, admin RLS). resolved 전환 시 resolved_at 기록.
// ⏳ audit_logs 기록은 서버 RPC 경로 필요.
// ⚠️ 스키마 불일치: support_tickets에 답변(reply/answer) 컬럼이 없다 — "답변 본문" 저장은
//    reply 컬럼 또는 ticket_replies 테이블 신설 전까지 미지원(상태 관리까지만).
import { useState } from 'react';
import { Modal, Button, Select, Card, Badge } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type SupportTicket, TICKET_CATEGORY_LABEL } from './types';
import styles from './crm.module.css';

interface Props {
  ticket: SupportTicket;
  readOnly: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function TicketModal({ ticket, readOnly, onClose, onSaved }: Props) {
  const [status, setStatus] = useState<SupportTicket['status']>(ticket.status);
  const [priority, setPriority] = useState<SupportTicket['priority']>(ticket.priority);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);

  const doSave = async () => {
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      status,
      priority,
      updated_at: new Date().toISOString(),
    };
    // resolved/closed 전환 시 resolved_at 기록, 재오픈 시 해제
    if ((status === 'resolved' || status === 'closed') && !ticket.resolved_at) {
      payload.resolved_at = new Date().toISOString();
    } else if (status === 'open' || status === 'in_progress') {
      payload.resolved_at = null;
    }
    const res = await query(getSupabaseBrowserClient(), 'support_tickets', (q) => q.update(payload).eq('id', ticket.id));
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? '저장에 실패했습니다.');
      return;
    }
    onSaved();
  };

  const assignToMe = async () => {
    setAssignBusy(true);
    setError(null);
    const client = getSupabaseBrowserClient();
    const { data: userData } = await client.auth.getUser();
    const res = await query(client, 'support_tickets', (q) =>
      q.update({ assigned_to: userData.user?.id ?? null, updated_at: new Date().toISOString() }).eq('id', ticket.id),
    );
    setAssignBusy(false);
    if (!res.success) {
      setError(res.error ?? '담당자 배정에 실패했습니다.');
      return;
    }
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="문의 티켓 처리"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {readOnly ? '닫기' : '취소'}
          </Button>
          {!readOnly ? (
            <Button variant="primary" onClick={doSave} loading={saving}>
              상태 저장
            </Button>
          ) : null}
        </>
      }
    >
      <div className={styles.form}>
        {error ? (
          <Card variant="accent">
            <span className={styles.errorText}>{error}</span>
          </Card>
        ) : null}

        <div className={styles.metaRow}>
          <Badge variant="neutral">{TICKET_CATEGORY_LABEL[ticket.category]}</Badge>
          <span>{ticket.members?.name ?? '—'}</span>
          <span>{new Date(ticket.created_at).toLocaleString('ko-KR')}</span>
        </div>

        <div>
          <strong>{ticket.subject}</strong>
          <p className={styles.ticketBody}>{ticket.content}</p>
        </div>

        {!readOnly ? (
          <>
            <div className={styles.formRow}>
              <Select
                label="상태"
                value={status}
                onChange={(v) => setStatus(v as SupportTicket['status'])}
                options={[
                  { value: 'open', label: '접수' },
                  { value: 'in_progress', label: '처리 중' },
                  { value: 'resolved', label: '완료' },
                  { value: 'closed', label: '종료' },
                ]}
              />
              <Select
                label="우선순위"
                value={priority}
                onChange={(v) => setPriority(v as SupportTicket['priority'])}
                options={[
                  { value: 'urgent', label: '긴급' },
                  { value: 'high', label: '높음' },
                  { value: 'normal', label: '보통' },
                  { value: 'low', label: '낮음' },
                ]}
              />
            </div>

            <Button variant="soft" size="sm" onClick={assignToMe} loading={assignBusy}>
              나에게 배정
            </Button>

            <Card variant="accent">
              <span className={styles.pending}>
                답변 본문 저장은 support_tickets에 답변 컬럼이 없어 미지원입니다. (⏳ reply 컬럼/ticket_replies 신설 필요 — 스키마 불일치)
              </span>
            </Card>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
