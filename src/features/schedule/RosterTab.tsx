'use client';

// 세션 통합 패널 — roster 서브탭 (02-admin §3.6)
// 확정 예약 명단 + 출결 판정(일괄/개별 fn_mark_attendance) + 관리자 대리 예약(fn_admin_book_session)
// + 대리 취소(fn_cancel_booking_with_credit, 크레딧 복구 미리보기 confirm) + walk_in(fn_admin_add_walkin).
import { useMemo, useState } from 'react';
import { Table, Button, Select, Badge, Card, Modal, Input, useToast } from '@/components/ui';
import type { TableColumn, BadgeVariant } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  type RosterBooking,
  type MarkAttendanceResult,
  type AttendanceOutcome,
  OUTCOME_LABEL,
} from './types';
import styles from './schedule.module.css';

interface MemberRow {
  id: string;
  name: string;
}
interface Props {
  sessionId: string;
  canEdit: boolean;
  canDelete: boolean;
  onChanged: () => void;
}

const OUTCOME_OPTIONS = [
  { value: 'checked_in', label: '출석' },
  { value: 'no_show', label: '노쇼' },
  { value: 'late_cancel', label: '지각취소' },
  { value: 'coach_excused', label: '인정결석' },
];

const OUTCOME_BADGE: Record<AttendanceOutcome, BadgeVariant> = {
  pending: 'neutral',
  checked_in: 'success',
  no_show: 'danger',
  late_cancel: 'warning',
  coach_excused: 'info',
  walk_in: 'accent',
};

export function RosterTab({ sessionId, canEdit, canDelete, onChanged }: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [addMemberId, setAddMemberId] = useState<string | null>(null);
  const [outcomeDraft, setOutcomeDraft] = useState<Record<string, string>>({});
  const [cancelTarget, setCancelTarget] = useState<RosterBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const roster = useQuery<RosterBooking[]>(
    () =>
      query<RosterBooking[]>(getSupabaseBrowserClient(), 'bookings', (q) =>
        q
          .select('id, member_id, status, attendance_outcome, credit_used, created_at, members(name)')
          .eq('session_id', sessionId)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: true }),
      ),
    [sessionId],
  );

  const members = useQuery<MemberRow[]>(
    () =>
      query<MemberRow[]>(getSupabaseBrowserClient(), 'members', (q) =>
        q.select('id, name').eq('status', 'active').order('name').limit(1000),
      ),
    [],
  );

  const memberOptions = useMemo(
    () => (members.data ?? []).map((m) => ({ value: m.id, label: m.name })),
    [members.data],
  );

  const reload = () => {
    roster.refetch();
    onChanged();
  };

  const markOne = async (memberId: string, action: string) => {
    setBusy(true);
    const res = await rpc<MarkAttendanceResult>(getSupabaseBrowserClient(), 'fn_mark_attendance', {
      p_session_id: sessionId,
      p_items: [{ member_id: memberId, action }],
    });
    setBusy(false);
    if (!res.success || (res.data && res.data.failure_count > 0)) {
      const detail = res.data?.results?.find((r) => !r.success)?.error;
      toast.error(detail ?? res.error ?? '출결 처리에 실패했습니다.');
      return;
    }
    toast.success('출결을 처리했습니다.');
    reload();
  };

  const markAllPresent = async () => {
    const items = (roster.data ?? []).map((b) => ({ member_id: b.member_id, action: 'checked_in' }));
    if (items.length === 0) return;
    setBusy(true);
    const res = await rpc<MarkAttendanceResult>(getSupabaseBrowserClient(), 'fn_mark_attendance', {
      p_session_id: sessionId,
      p_items: items,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '일괄 출석 처리에 실패했습니다.');
      return;
    }
    toast.success(`전원 출석 처리 (성공 ${res.data?.success_count ?? 0}건)`);
    reload();
  };

  const addBooking = async (walkin: boolean) => {
    if (!addMemberId) {
      toast.error('회원을 선택하세요.');
      return;
    }
    setBusy(true);
    const fn = walkin ? 'fn_admin_add_walkin' : 'fn_admin_book_session';
    const res = await rpc(getSupabaseBrowserClient(), fn, {
      p_session_id: sessionId,
      p_member_id: addMemberId,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '처리에 실패했습니다.');
      return;
    }
    toast.success(walkin ? '워크인을 추가했습니다.' : '대리 예약을 완료했습니다.');
    setAddMemberId(null);
    reload();
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    const res = await rpc<{ credit_refunded: boolean; late_cancel: boolean }>(
      getSupabaseBrowserClient(),
      'fn_cancel_booking_with_credit',
      { p_booking_id: cancelTarget.id, p_reason: cancelReason.trim() || null },
    );
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '취소에 실패했습니다.');
      return;
    }
    toast.success(res.data?.credit_refunded ? '취소 완료 — 크레딧 1회 복구됨.' : '예약을 취소했습니다.');
    setCancelTarget(null);
    setCancelReason('');
    reload();
  };

  const columns: TableColumn<RosterBooking>[] = [
    { key: 'name', header: '회원', render: (b) => b.members?.name ?? '—' },
    {
      key: 'outcome',
      header: '출결',
      render: (b) => (
        <Badge variant={OUTCOME_BADGE[b.attendance_outcome]}>
          {OUTCOME_LABEL[b.attendance_outcome]}
        </Badge>
      ),
    },
    {
      key: 'credit',
      header: '크레딧',
      render: (b) => (b.credit_used ? <Badge variant="neutral">차감됨</Badge> : '—'),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (b) =>
        canEdit ? (
          <div className={styles.rowActions}>
            <div className={styles.statusField}>
              <Select
                label=""
                value={outcomeDraft[b.id] ?? ''}
                onChange={(v) => setOutcomeDraft((d) => ({ ...d, [b.id]: v }))}
                placeholder="판정 선택"
                options={OUTCOME_OPTIONS}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy || !outcomeDraft[b.id]}
              onClick={() => markOne(b.member_id, outcomeDraft[b.id])}
            >
              적용
            </Button>
            {canDelete ? (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setCancelTarget(b)}>
                취소
              </Button>
            ) : null}
          </div>
        ) : null,
    },
  ];

  return (
    <div className={styles.tabPanel}>
      {canEdit ? (
        <div className={styles.addRow}>
          <Select
            label="회원 대리 예약 / 워크인"
            value={addMemberId}
            onChange={setAddMemberId}
            searchable
            placeholder={members.loading ? '회원 불러오는 중…' : '회원 검색'}
            options={memberOptions}
          />
          <Button variant="soft" disabled={busy} onClick={() => addBooking(false)}>
            대리 예약
          </Button>
          <Button variant="soft" disabled={busy} onClick={() => addBooking(true)}>
            워크인
          </Button>
        </div>
      ) : null}

      {canEdit && (roster.data?.length ?? 0) > 0 ? (
        <div className={styles.rowActions}>
          <Button variant="ghost" size="sm" disabled={busy} onClick={markAllPresent}>
            전원 출석 처리
          </Button>
        </div>
      ) : null}

      <Table<RosterBooking>
        columns={columns}
        rows={roster.data ?? []}
        rowKey={(b) => b.id}
        loading={roster.loading}
        empty={
          roster.error
            ? { variant: 'error', title: '명단을 불러오지 못했습니다', description: roster.error, onRetry: roster.refetch }
            : { title: '확정 예약이 없습니다', description: '이 세션에 확정된 예약이 아직 없습니다.' }
        }
      />

      {/* 대리 취소 — 크레딧 복구 미리보기 confirm (§3.6 파괴적) */}
      <Modal
        open={cancelTarget != null}
        onClose={() => {
          setCancelTarget(null);
          setCancelReason('');
        }}
        title="예약 대리 취소"
        size="sm"
        closeOnOverlay={false}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setCancelTarget(null);
                setCancelReason('');
              }}
              disabled={busy}
            >
              닫기
            </Button>
            <Button variant="danger" onClick={doCancel} loading={busy}>
              취소 확정
            </Button>
          </>
        }
      >
        <Card variant="accent">
          <span className={styles.hint}>
            <strong>{cancelTarget?.members?.name}</strong> 님의 예약을 취소합니다.
            {cancelTarget?.credit_used
              ? ' 크레딧 차감 예약이므로 취소 마감(정책) 이전이면 서버가 크레딧 1회를 복구합니다.'
              : ' 크레딧 차감이 없는 예약입니다.'}
          </span>
        </Card>
        <div className={styles.form}>
          <Input
            label="취소 사유 (선택)"
            multiline
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
