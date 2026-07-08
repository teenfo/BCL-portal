'use client';

// FAQ 생성/편집 모달 (02-admin §3.13)
// 직접 INSERT/UPDATE(faqs, admin RLS). ⏳ audit_logs 기록은 서버 RPC 경로 필요.
import { useState } from 'react';
import { Modal, Button, Input, Checkbox, Card } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Faq } from './types';
import styles from './crm.module.css';

interface Props {
  faq: Faq | null;
  onClose: () => void;
  onSaved: () => void;
}

export function FaqEditModal({ faq, onClose, onSaved }: Props) {
  const [category, setCategory] = useState(faq?.category ?? 'general');
  const [question, setQuestion] = useState(faq?.question ?? '');
  const [answer, setAnswer] = useState(faq?.answer ?? '');
  const [sortOrder, setSortOrder] = useState(String(faq?.sort_order ?? 0));
  const [isPublished, setIsPublished] = useState(faq?.is_published ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const doSave = async () => {
    if (!question.trim()) {
      setError('질문을 입력하세요.');
      return;
    }
    if (!answer.trim()) {
      setError('답변을 입력하세요.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      category: category.trim() || 'general',
      question: question.trim(),
      answer: answer.trim(),
      sort_order: Number(sortOrder) || 0,
      is_published: isPublished,
    };
    const client = getSupabaseBrowserClient();
    const res = faq
      ? await query(client, 'faqs', (q) => q.update(payload).eq('id', faq.id))
      : await query(client, 'faqs', (q) => q.insert(payload));
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
      title={faq ? 'FAQ 편집' : '새 FAQ'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={doSave} loading={saving}>
            저장
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

        <div className={styles.formRow}>
          <Input label="분류" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input label="노출 순서" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>

        <Input label="질문" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <Input label="답변" multiline rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} />

        <Checkbox label="공개 (끄면 비노출)" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
      </div>
    </Modal>
  );
}
