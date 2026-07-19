'use client';

// 회원 상세 — notes 탭 (02-admin §3.2)
// member_notes 타임라인(author_role admin/coach, note_type) — admin 노트 작성/조회
import { useEffect, useState } from 'react';
import { Card, Button, Badge, Input, Select, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type MemberNote, NOTE_TYPE_LABEL, fmtDateTime } from '../types';
import styles from '../detail.module.css';

const NOTE_TYPE_BADGE: Record<MemberNote['note_type'], 'neutral' | 'danger' | 'info' | 'warning'> = {
  general: 'neutral',
  injury: 'danger',
  progress: 'info',
  caution: 'warning',
  counseling: 'info',
};

interface Props {
  memberId: string;
}

export function NotesTab({ memberId }: Props) {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('members', 'edit');
  const client = getSupabaseBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [noteType, setNoteType] = useState<MemberNote['note_type']>('general');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void client.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const notes = useQuery<MemberNote[]>(
    () =>
      query<MemberNote[]>(client, 'member_notes', (q) =>
        q
          .select('*')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false }),
      ),
    [memberId],
  );

  const submit = async () => {
    if (!content.trim()) return;
    setBusy(true);
    const res = await query(client, 'member_notes', (q) =>
      q.insert({
        member_id: memberId,
        author_id: userId,
        author_role: 'admin',
        note_type: noteType,
        content: content.trim(),
      }),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '노트 저장에 실패했습니다.');
      return;
    }
    toast.success('노트를 저장했습니다.');
    setContent('');
    setNoteType('general');
    notes.refetch();
  };

  return (
    <div className={styles.tabBody}>
      {canEdit ? (
        <Card title="노트 작성">
          <div className={styles.form}>
            <Select
              label="유형"
              value={noteType}
              onChange={(v) => setNoteType(v as MemberNote['note_type'])}
              options={(Object.keys(NOTE_TYPE_LABEL) as MemberNote['note_type'][]).map((k) => ({
                value: k,
                label: NOTE_TYPE_LABEL[k],
              }))}
            />
            <Input
              label="내용"
              multiline
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="상담·주의 등 운영 메모 (회원 비노출)"
            />
            <div className={styles.actionBar}>
              <Button variant="primary" onClick={submit} loading={busy} disabled={!content.trim()}>
                노트 저장
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card title="노트 타임라인">
        {notes.loading ? (
          <Skeleton variant="text" width="100%" height="80px" />
        ) : notes.error ? (
          <EmptyState
            variant="error"
            title="노트를 불러오지 못했습니다"
            description={notes.error}
            onRetry={notes.refetch}
          />
        ) : (notes.data ?? []).length === 0 ? (
          <EmptyState title="작성된 노트가 없습니다" description="상담·코칭 메모를 남겨보세요." />
        ) : (
          <div className={styles.notesList}>
            {(notes.data ?? []).map((n) => (
              <div key={n.id} className={styles.noteItem}>
                <div className={styles.noteHead}>
                  <Badge variant={NOTE_TYPE_BADGE[n.note_type]}>{NOTE_TYPE_LABEL[n.note_type]}</Badge>
                  <Badge variant="neutral">{n.author_role === 'admin' ? '관리자' : '코치'}</Badge>
                  <span className={styles.timelineTime}>{fmtDateTime(n.created_at)}</span>
                </div>
                <span className={styles.noteContent}>{n.content}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
