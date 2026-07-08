'use client';

// 공지 생성/편집 모달 (02-admin §3.13)
// 직접 INSERT/UPDATE(notices, admin RLS). ⏳ audit_logs 기록은 서버 RPC 경로 필요.
import { useState } from 'react';
import { Modal, Button, Input, Select, Checkbox, Card } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Notice } from './types';
import { toLocalInput, toIsoOrNull } from './datetime';
import styles from './crm.module.css';

interface Props {
  notice: Notice | null;
  onClose: () => void;
  onSaved: () => void;
}

export function NoticeEditModal({ notice, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(notice?.title ?? '');
  const [content, setContent] = useState(notice?.content ?? '');
  const [category, setCategory] = useState<Notice['category']>(notice?.category ?? 'general');
  const [priority, setPriority] = useState<Notice['priority']>(notice?.priority ?? 'normal');
  const [isPinned, setIsPinned] = useState(notice?.is_pinned ?? false);
  const [isPublished, setIsPublished] = useState(notice?.is_published ?? false);
  const [publishedAt, setPublishedAt] = useState(toLocalInput(notice?.published_at ?? null));
  const [expiresAt, setExpiresAt] = useState(toLocalInput(notice?.expires_at ?? null));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const doSave = async () => {
    if (!title.trim()) {
      setError('제목을 입력하세요.');
      return;
    }
    if (!content.trim()) {
      setError('내용을 입력하세요.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title: title.trim(),
      content: content.trim(),
      category,
      priority,
      is_pinned: isPinned,
      is_published: isPublished,
      // 게시 상태인데 게시일 미지정 시 현재 시각으로 자동
      published_at: toIsoOrNull(publishedAt) ?? (isPublished ? new Date().toISOString() : null),
      expires_at: toIsoOrNull(expiresAt),
    };
    const client = getSupabaseBrowserClient();
    const res = notice
      ? await query(client, 'notices', (q) => q.update(payload).eq('id', notice.id))
      : await query(client, 'notices', (q) => q.insert(payload));
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
      title={notice ? '공지 편집' : '새 공지'}
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

        <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="내용" multiline rows={5} value={content} onChange={(e) => setContent(e.target.value)} />

        <div className={styles.formRow}>
          <Select
            label="분류"
            value={category}
            onChange={(v) => setCategory(v as Notice['category'])}
            options={[
              { value: 'general', label: '일반' },
              { value: 'schedule', label: '일정' },
              { value: 'event', label: '이벤트' },
              { value: 'maintenance', label: '점검' },
              { value: 'emergency', label: '긴급' },
            ]}
          />
          <Select
            label="우선순위"
            value={priority}
            onChange={(v) => setPriority(v as Notice['priority'])}
            options={[
              { value: 'urgent', label: '긴급' },
              { value: 'high', label: '높음' },
              { value: 'normal', label: '보통' },
              { value: 'low', label: '낮음' },
            ]}
          />
        </div>

        <div className={styles.formRow}>
          <Input label="게시 시작" type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
          <Input label="게시 종료 (선택)" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>

        <Checkbox label="상단 고정" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
        <Checkbox label="게시 (끄면 비공개)" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
      </div>
    </Modal>
  );
}
