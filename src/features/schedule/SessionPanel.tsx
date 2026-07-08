'use client';

// 세션 통합 패널 (02-admin §3.6) — 세션 클릭 시 우측 슬라이드(Modal lg).
// 헤더: 세션 요약 + 상태 변경 + 편집 + 세션 취소/삭제(파괴적) · 서브탭 roster|waitlist|wod(?tab= 동기).
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Modal, Tabs, Button, Select, Badge, ConfirmModal, useToast } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { RosterTab } from './RosterTab';
import { WaitlistTab } from './WaitlistTab';
import { WodTab } from './WodTab';
import { SessionFormModal } from './SessionFormModal';
import {
  type ScheduleSession,
  type SessionStatus,
  type CoachOption,
  SESSION_STATUS_LABEL,
} from './types';
import styles from './schedule.module.css';

type SubTab = 'roster' | 'waitlist' | 'wod';

interface Props {
  session: ScheduleSession;
  coaches: CoachOption[];
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onChanged: () => void;
}

const STATUS_BADGE: Record<SessionStatus, BadgeVariant> = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

// 비파괴 상태 전환만 (cancelled 는 별도 취소 플로우로만)
const STATUS_OPTIONS = [
  { value: 'scheduled', label: '예정' },
  { value: 'in_progress', label: '진행중' },
  { value: 'completed', label: '완료' },
];

const hhmm = (t: string) => t.slice(0, 5);

export function SessionPanel({ session, coaches, canEdit, canDelete, onClose, onChanged }: Props) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const initial = (searchParams?.get('tab') as SubTab) || 'roster';
  const [subtab, setSubtab] = useState<SubTab>(
    ['roster', 'waitlist', 'wod'].includes(initial) ? initial : 'roster',
  );
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // 예약자 수(파괴적 판단용) — 취소되지 않은 예약
  const bookings = useQuery<{ id: string; status: string }[]>(
    () =>
      query<{ id: string; status: string }[]>(getSupabaseBrowserClient(), 'bookings', (q) =>
        q.select('id, status').eq('session_id', session.id).neq('status', 'cancelled'),
      ),
    [session.id],
  );
  const activeCount = bookings.data?.length ?? 0;

  const coachSummary = useMemo(
    () =>
      [...session.session_coaches]
        .sort((a, b) => a.display_order - b.display_order)
        .map((c) => `${c.coaches?.name ?? '코치'}(${c.assignment_role === 'lead' ? '리드' : '보조'})`)
        .join(', '),
    [session.session_coaches],
  );

  const changeStatus = async (next: string) => {
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'sessions', (q) =>
      q.update({ status: next }).eq('id', session.id),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '상태 변경에 실패했습니다.');
      return;
    }
    toast.success('세션 상태를 변경했습니다.');
    onChanged();
  };

  // 세션 취소 — 예약자 전원 크레딧 복구(fn_cancel_booking_with_credit 반복) 후 status=cancelled
  const cancelSession = async () => {
    setBusy(true);
    const client = getSupabaseBrowserClient();
    const list = bookings.data ?? [];
    let restored = 0;
    for (const b of list) {
      const res = await rpc<{ credit_refunded: boolean }>(client, 'fn_cancel_booking_with_credit', {
        p_booking_id: b.id,
        p_reason: '세션 취소',
      });
      if (res.success && res.data?.credit_refunded) restored += 1;
    }
    const res = await query(client, 'sessions', (q) =>
      q.update({ status: 'cancelled' }).eq('id', session.id),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '세션 취소에 실패했습니다.');
      return;
    }
    toast.success(`세션을 취소했습니다. (크레딧 복구 ${restored}건)`);
    setCancelOpen(false);
    onChanged();
    onClose();
  };

  // 세션 삭제 — 예약자 존재 시 차단(버튼 비활성). 예약 0건일 때만.
  const deleteSession = async () => {
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'sessions', (q) =>
      q.delete().eq('id', session.id),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '삭제에 실패했습니다.');
      return;
    }
    toast.success('세션을 삭제했습니다.');
    setDeleteOpen(false);
    onChanged();
    onClose();
  };

  return (
    <>
      <Modal open onClose={onClose} title={session.title} size="lg">
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelMeta}>
              <Badge variant={STATUS_BADGE[session.status]}>
                {SESSION_STATUS_LABEL[session.status]}
              </Badge>
              <span>
                {session.session_date} · {hhmm(session.start_time)}–{hhmm(session.end_time)}
              </span>
              <span>정원 {session.capacity}</span>
              {coachSummary ? <span>· {coachSummary}</span> : null}
            </div>

            {canEdit ? (
              <div className={styles.panelActions}>
                <div className={styles.statusField}>
                  <Select
                    label="상태"
                    value={session.status === 'cancelled' ? null : session.status}
                    onChange={changeStatus}
                    placeholder="상태 변경"
                    options={STATUS_OPTIONS}
                    disabled={busy || session.status === 'cancelled'}
                  />
                </div>
                <Button variant="soft" size="sm" onClick={() => setEditOpen(true)}>
                  편집
                </Button>
                {session.status !== 'cancelled' ? (
                  <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>
                    세션 취소
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeCount > 0}
                    title={activeCount > 0 ? '예약자가 있어 삭제할 수 없습니다 (취소로 전환)' : undefined}
                    onClick={() => setDeleteOpen(true)}
                  >
                    삭제
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <Tabs
            variant="segmented"
            tabs={[
              { key: 'roster', label: '명단' },
              { key: 'waitlist', label: '대기열' },
              { key: 'wod', label: 'WOD' },
            ]}
            value={subtab}
            onChange={(k) => setSubtab(k as SubTab)}
            aria-label="세션 서브탭"
          />

          {subtab === 'roster' ? (
            <RosterTab
              sessionId={session.id}
              canEdit={canEdit}
              canDelete={canDelete}
              onChanged={() => {
                bookings.refetch();
                onChanged();
              }}
            />
          ) : subtab === 'waitlist' ? (
            <WaitlistTab
              sessionId={session.id}
              facilityId={session.facility_id}
              canEdit={canEdit}
              onChanged={() => {
                bookings.refetch();
                onChanged();
              }}
            />
          ) : (
            <WodTab sessionId={session.id} canEdit={canEdit} onChanged={onChanged} />
          )}
        </div>
      </Modal>

      {editOpen ? (
        <SessionFormModal
          key={session.id}
          open
          session={session}
          defaultDate={session.session_date}
          coaches={coaches}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            onChanged();
          }}
        />
      ) : null}

      {/* 세션 취소 확인 — 영향 인원 + 크레딧 복구 안내 */}
      <ConfirmModal
        open={cancelOpen}
        title="세션 취소"
        message={
          <>
            이 세션을 취소합니다. 예약자 <strong>{activeCount}명</strong>의 예약이 전부 취소되며, 크레딧 차감분은
            서버 규칙에 따라 복구됩니다. (알림 발송은 ⏳ 후속) 되돌릴 수 없습니다.
          </>
        }
        confirmLabel="세션 취소"
        variant="danger"
        loading={busy}
        onConfirm={cancelSession}
        onClose={() => setCancelOpen(false)}
      />

      {/* 세션 삭제 확인 — 예약 0건 전제 */}
      <ConfirmModal
        open={deleteOpen}
        title="세션 삭제"
        message={
          <>
            <strong>{session.title}</strong> 세션을 완전히 삭제합니다. 되돌릴 수 없습니다.
          </>
        }
        confirmLabel="삭제"
        variant="danger"
        loading={busy}
        onConfirm={deleteSession}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
