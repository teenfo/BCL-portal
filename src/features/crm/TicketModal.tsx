'use client';

// 문의 티켓 처리 모달 (02-admin §3.13)
// 답변 본문 + 상태 = 서버 전용 RPC(fn_reply_support_ticket — is_admin 게이트 + reply/replied_at/
//   replied_by 기록 + resolved_at 전환 + audit_logs). 우선순위/담당자는 직접 UPDATE(트리거 자동 audit).
import { useState } from 'react';
import { Modal, Button, Select, Input, Card, Badge } from '@/components/ui';
import { query, rpc } from '@/lib/supabase/query';
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
  const [reply, setReply] = useState(ticket.reply ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);

  const doSave = async () => {
    setSaving(true);
    setError(null);
    const client = getSupabaseBrowserClient();
    // 답변 본문 + 상태(+ resolved_at) = 서버 RPC. 빈 답변은 기존 답변 유지(RPC 내부 처리).
    const res = await rpc(client, 'fn_reply_support_ticket', {
      p_ticket_id: ticket.id,
      p_reply: reply.trim() || null,
      p_status: status,
    });
    if (!res.success) {
      setSaving(false);
      setError(res.error ?? '저장에 실패했습니다.');
      return;
    }
    // 우선순위는 RPC 범위 밖 — 변경 시에만 직접 UPDATE(트리거로 자동 audit).
    if (priority !== ticket.priority) {
      const pRes = await query(client, 'support_tickets', (q) =>
        q.update({ priority, updated_at: new Date().toISOString() }).eq('id', ticket.id),
      );
      if (!pRes.success) {
        setSaving(false);
        setError(pRes.error ?? '우선순위 저장에 실패했습니다.');
        return;
      }
    }
    setSaving(false);
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
              답변·상태 저장
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

            <Input
              label="답변 본문"
              multiline
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="회원에게 전달할 답변을 입력하세요. 비워두면 기존 답변이 유지됩니다."
            />
          </>
        ) : ticket.reply ? (
          <div>
            <strong>답변</strong>
            <p className={styles.ticketBody}>{ticket.reply}</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
