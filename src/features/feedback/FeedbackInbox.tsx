'use client';

// 피드백 inbox 탭 — 개별 피드백 목록(저평점 우선) + 응대 작성 (02-admin §3.12)
// 응대는 session_feedback.admin_response 직접 UPDATE(admin RLS). ⏳ audit_logs 기록은 서버 RPC 경로 필요.
import { useMemo, useState } from 'react';
import { Table, Button, Select, Badge, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { FeedbackResponseModal } from './FeedbackResponseModal';
import { type FeedbackRow, LOW_RATING_MAX } from './types';
import styles from './feedback.module.css';

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

interface Props {
  focusId: string | null; // analytics/딥링크에서 지정한 대상 — 자동 응대 모달 오픈
  onConsumeFocus: () => void;
}

export function FeedbackInbox({ focusId, onConsumeFocus }: Props) {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('feedback', 'edit');
  const [statusFilter, setStatusFilter] = useState<string>('unanswered');
  const [manualTarget, setManualTarget] = useState<FeedbackRow | null>(null);

  const feedback = useQuery<FeedbackRow[]>(
    () =>
      query<FeedbackRow[]>(getSupabaseBrowserClient(), 'session_feedback', (q) =>
        q
          .select(
            'id, session_id, member_id, coach_id, rating, comment, admin_response, responded_at, created_at, members(name), coaches(name), sessions(title, session_date)',
          )
          .order('rating', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(500),
      ),
    [],
  );

  const rows = useMemo(() => {
    let list = feedback.data ?? [];
    if (statusFilter === 'unanswered') list = list.filter((r) => !r.admin_response);
    else if (statusFilter === 'answered') list = list.filter((r) => r.admin_response);
    else if (statusFilter === 'low') list = list.filter((r) => r.rating <= LOW_RATING_MAX);
    return list;
  }, [feedback.data, statusFilter]);

  // focusId 지정 시(analytics/딥링크) 해당 피드백을 응대 모달로 표시 — effect 없이 파생.
  const focusTarget = useMemo(
    () => (focusId ? (feedback.data ?? []).find((r) => r.id === focusId) ?? null : null),
    [focusId, feedback.data],
  );
  const responding = manualTarget ?? focusTarget;
  const closeModal = () => {
    setManualTarget(null);
    if (focusId) onConsumeFocus();
  };

  const columns: TableColumn<FeedbackRow>[] = [
    { key: 'rating', header: '평점', render: (r) => <span className={styles.stars}>{stars(r.rating)}</span> },
    { key: 'session', header: '수업', render: (r) => r.sessions?.title ?? '—' },
    { key: 'coach', header: '코치', render: (r) => r.coaches?.name ?? '미배정' },
    { key: 'member', header: '회원', render: (r) => r.members?.name ?? '—' },
    { key: 'comment', header: '코멘트', render: (r) => <div className={styles.comment}>{r.comment ?? '—'}</div> },
    {
      key: 'status',
      header: '응대',
      render: (r) =>
        r.admin_response ? <Badge variant="success">완료</Badge> : <Badge variant="warning">미답변</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) =>
        canEdit ? (
          <Button variant="ghost" size="sm" onClick={() => setManualTarget(r)}>
            {r.admin_response ? '답변 보기' : '응대'}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className={styles.tabPanel}>
      <div className={styles.toolbar}>
        <div className={styles.filter}>
          <Select
            label="상태"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'unanswered', label: '미답변' },
              { value: 'answered', label: '답변완료' },
              { value: 'low', label: '저평점(≤2)' },
              { value: 'all', label: '전체' },
            ]}
          />
        </div>
        <div className={styles.spacer} />
        <Button variant="ghost" onClick={() => feedback.refetch()}>
          새로고침
        </Button>
      </div>

      <Table<FeedbackRow>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={feedback.loading}
        empty={
          feedback.error
            ? { variant: 'error', title: '피드백을 불러오지 못했습니다', description: feedback.error, onRetry: feedback.refetch }
            : { title: '피드백이 없습니다', description: '조건에 맞는 피드백이 없습니다.' }
        }
      />

      {responding ? (
        <FeedbackResponseModal
          key={responding.id}
          feedback={responding}
          readOnly={!canEdit}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            feedback.refetch();
            toast.success('응대를 저장했습니다.');
          }}
        />
      ) : null}
    </div>
  );
}
