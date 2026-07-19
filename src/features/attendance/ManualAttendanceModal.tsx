'use client';

// 수동 출석 처리 (02-admin §3.3 live 탭)
// 세션·회원 선택 후 fn_mark_attendance(p_session_id, p_items[]) — 출결 판정.
// 판정 enum: checked_in / no_show / late_cancel / coach_excused / walk_in.
import { useMemo, useState } from 'react';
import { Modal, Button, Select, Card, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './attendance.module.css';

interface SessionRow {
  id: string;
  title: string;
  start_time: string;
}
interface MemberRow {
  id: string;
  name: string;
}

interface MarkResult {
  success_count: number;
  failure_count: number;
  results: { member_id: string; action: string; success: boolean; error: string | null }[];
}

const ACTION_OPTIONS = [
  { value: 'checked_in', label: '출석 (checked_in)' },
  { value: 'walk_in', label: '현장 참여 (walk_in)' },
  { value: 'no_show', label: '노쇼 (no_show)' },
  { value: 'late_cancel', label: '지각 취소 (late_cancel)' },
  { value: 'coach_excused', label: '코치 인정 결석 (coach_excused)' },
];

interface Props {
  open: boolean;
  date: string; // yyyy-mm-dd
  onClose: () => void;
  onDone: () => void;
}

export function ManualAttendanceModal({ open, date, onClose, onDone }: Props) {
  const toast = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [action, setAction] = useState<string>('checked_in');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessions = useQuery<SessionRow[]>(
    () =>
      open
        ? query<SessionRow[]>(getSupabaseBrowserClient(), 'sessions', (q) =>
            q
              .select('id, title, start_time')
              .eq('session_date', date)
              .order('start_time', { ascending: true }),
          )
        : Promise.resolve({ success: true, data: [], error: null }),
    [open, date],
  );

  const members = useQuery<MemberRow[]>(
    () =>
      open
        ? query<MemberRow[]>(getSupabaseBrowserClient(), 'members', (q) =>
            q.select('id, name').eq('status', 'active').order('name', { ascending: true }).limit(1000),
          )
        : Promise.resolve({ success: true, data: [], error: null }),
    [open],
  );

  const sessionOptions = useMemo(
    () =>
      (sessions.data ?? []).map((s) => ({
        value: s.id,
        label: `${s.start_time?.slice(0, 5) ?? ''} ${s.title}`.trim(),
      })),
    [sessions.data],
  );
  const memberOptions = useMemo(
    () => (members.data ?? []).map((m) => ({ value: m.id, label: m.name })),
    [members.data],
  );

  const submit = async () => {
    if (!sessionId) {
      setError('세션을 선택하세요.');
      return;
    }
    if (!memberId) {
      setError('회원을 선택하세요.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await rpc<MarkResult>(getSupabaseBrowserClient(), 'fn_mark_attendance', {
      p_session_id: sessionId,
      p_items: [{ member_id: memberId, action }],
    });
    setBusy(false);
    if (!res.success) {
      const detail = res.data?.results?.find((r) => !r.success)?.error;
      setError(detail ?? res.error ?? '출석 처리에 실패했습니다.');
      return;
    }
    toast.success('출석 처리를 완료했습니다.');
    setMemberId(null);
    onDone();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="수동 출석 처리"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            취소
          </Button>
          <Button variant="primary" onClick={submit} loading={busy}>
            처리
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {error ? (
          <Card variant="accent">{error}</Card>
        ) : null}
        <Select
          label={`세션 (${date})`}
          value={sessionId}
          onChange={setSessionId}
          searchable
          placeholder={sessions.loading ? '세션 불러오는 중…' : '세션 선택'}
          options={sessionOptions}
        />
        <Select
          label="회원"
          value={memberId}
          onChange={setMemberId}
          searchable
          placeholder={members.loading ? '회원 불러오는 중…' : '회원 검색'}
          options={memberOptions}
        />
        <Select label="판정" value={action} onChange={setAction} options={ACTION_OPTIONS} />
      </div>
    </Modal>
  );
}
