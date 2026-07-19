'use client';

// 피드백 응대 모달 (02-admin §3.12)
// admin_response 직접 UPDATE(admin RLS). responded_by=현재 사용자, responded_at=now.
// ⏳ audit_logs 기록은 서버 RPC 경로가 필요(직접 쓰기라 감사 미동반).
import { useState } from 'react';
import { Modal, Button, Input, Card, Badge } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { FeedbackRow } from './types';
import styles from './feedback.module.css';

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

interface Props {
  feedback: FeedbackRow;
  readOnly: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function FeedbackResponseModal({ feedback, readOnly, onClose, onSaved }: Props) {
  const [response, setResponse] = useState(feedback.admin_response ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const doSave = async () => {
    if (!response.trim()) {
      setError('답변 내용을 입력하세요.');
      return;
    }
    setSaving(true);
    setError(null);
    const client = getSupabaseBrowserClient();
    // 응대자 식별 — auth(비 DB 호출). 직접 UPDATE는 admin RLS로 게이트.
    const { data: userData } = await client.auth.getUser();
    const res = await query(client, 'session_feedback', (q) =>
      q
        .update({
          admin_response: response.trim(),
          responded_by: userData.user?.id ?? null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', feedback.id),
    );
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? '저장에 실패했습니다.');
      return;
    }
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="피드백 응대"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {readOnly ? '닫기' : '취소'}
          </Button>
          {!readOnly ? (
            <Button variant="primary" onClick={doSave} loading={saving}>
              응대 저장
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

        <div className={styles.readback}>
          <div className={styles.readMeta}>
            <span className={styles.stars}>{stars(feedback.rating)}</span>
            <span>{feedback.sessions?.title ?? '—'}</span>
            <Badge variant="neutral">{feedback.coaches?.name ?? '미배정'}</Badge>
            <span>{feedback.members?.name ?? '—'}</span>
          </div>
          <div className={styles.readComment}>{feedback.comment ?? '(코멘트 없음)'}</div>
        </div>

        <Input
          label="관리자 답변 (회원 앱에 노출)"
          multiline
          rows={5}
          value={response}
          disabled={readOnly}
          onChange={(e) => setResponse(e.target.value)}
        />
      </div>
    </Modal>
  );
}
