'use client';

// 세션 통합 패널 — waitlist 서브탭 (02-admin §3.6)
// 대기열 순번(status=waitlisted) + 수동 승격 + 노쇼 통제 정책 표시(facilities.booking_policy — 하드코딩 금지).
// ⏳ 승격은 bookings.status 직접 갱신(admin RLS FOR ALL) — 크레딧 재차감 없음(전용 승격 RPC 신설 시 이관).
//    빈자리 자동 승격은 trg_notify_waitlist_on_vacancy(서버 트리거)와 병행.
import { useMemo, useState } from 'react';
import { Table, Button, Card, ConfirmModal, useToast } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type RosterBooking, type BookingPolicy } from './types';
import styles from './schedule.module.css';

interface Props {
  sessionId: string;
  facilityId: string;
  canEdit: boolean;
  onChanged: () => void;
}

interface FacilityPolicyRow {
  booking_policy: BookingPolicy | null;
}

export function WaitlistTab({ sessionId, facilityId, canEdit, onChanged }: Props) {
  const toast = useToast();
  const [promoteTarget, setPromoteTarget] = useState<RosterBooking | null>(null);
  const [busy, setBusy] = useState(false);

  const waitlist = useQuery<RosterBooking[]>(
    () =>
      query<RosterBooking[]>(getSupabaseBrowserClient(), 'bookings', (q) =>
        q
          .select('id, member_id, status, attendance_outcome, credit_used, created_at, members(name)')
          .eq('session_id', sessionId)
          .eq('status', 'waitlisted')
          .order('created_at', { ascending: true }),
      ),
    [sessionId],
  );

  const facility = useQuery<FacilityPolicyRow[]>(
    () =>
      query<FacilityPolicyRow[]>(getSupabaseBrowserClient(), 'facilities', (q) =>
        q.select('booking_policy').eq('id', facilityId).limit(1),
      ),
    [facilityId],
  );

  const policy = facility.data?.[0]?.booking_policy ?? null;
  const noshow = policy?.noshow_penalty;

  const promote = async () => {
    if (!promoteTarget) return;
    setBusy(true);
    const res = await query(getSupabaseBrowserClient(), 'bookings', (q) =>
      q.update({ status: 'confirmed', waitlist_promoted_at: new Date().toISOString() }).eq('id', promoteTarget.id),
    );
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '승격에 실패했습니다.');
      return;
    }
    toast.success('대기자를 확정으로 승격했습니다.');
    setPromoteTarget(null);
    waitlist.refetch();
    onChanged();
  };

  const columns: TableColumn<RosterBooking>[] = useMemo(
    () => [
      {
        key: 'order',
        header: '순번',
        width: 60,
        render: (b) => String((waitlist.data ?? []).findIndex((w) => w.id === b.id) + 1),
      },
      { key: 'name', header: '회원', render: (b) => b.members?.name ?? '—' },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (b) =>
          canEdit ? (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setPromoteTarget(b)}>
              승격
            </Button>
          ) : null,
      },
    ],
    [waitlist.data, canEdit, busy],
  );

  return (
    <div className={styles.tabPanel}>
      {/* 노쇼 통제 정책 표시 (booking_policy 단일 소스 — 편집은 settings?tab=branch) */}
      <Card title="예약·노쇼 정책" variant="default">
        {facility.loading ? (
          <span className={styles.hint}>정책 불러오는 중…</span>
        ) : !policy ? (
          <span className={styles.hint}>
            지점 예약 정책이 설정되지 않았습니다. 기본 안내: 취소 마감·주간 상한·노쇼 페널티는 지점 설정에서
            정의합니다. (설정 → 지점)
          </span>
        ) : (
          <div className={styles.policyList}>
            <div className={styles.policyRow}>
              <span className={styles.policyLabel}>예약 오픈</span>
              <span>D-{policy.booking_open_days ?? '—'}</span>
            </div>
            <div className={styles.policyRow}>
              <span className={styles.policyLabel}>취소 마감</span>
              <span>{policy.cancel_deadline_hours != null ? `${policy.cancel_deadline_hours}시간 전` : '—'}</span>
            </div>
            <div className={styles.policyRow}>
              <span className={styles.policyLabel}>주간 예약 상한</span>
              <span>{policy.weekly_booking_cap != null ? `${policy.weekly_booking_cap}회` : '무제한'}</span>
            </div>
            <div className={styles.policyRow}>
              <span className={styles.policyLabel}>노쇼 페널티</span>
              <span>
                {noshow
                  ? `월 ${noshow.monthly_threshold ?? '—'}회 초과 시 ${noshow.restrict_days ?? '—'}일 제한` +
                    (noshow.credit_forfeit ? ' · 크레딧 몰수' : '')
                  : '—'}
              </span>
            </div>
          </div>
        )}
      </Card>

      <Table<RosterBooking>
        columns={columns}
        rows={waitlist.data ?? []}
        rowKey={(b) => b.id}
        loading={waitlist.loading}
        empty={
          waitlist.error
            ? { variant: 'error', title: '대기열을 불러오지 못했습니다', description: waitlist.error, onRetry: waitlist.refetch }
            : { title: '대기자가 없습니다', description: '이 세션의 대기열이 비어 있습니다.' }
        }
      />

      <ConfirmModal
        open={promoteTarget != null}
        title="대기자 승격"
        message={
          <>
            <strong>{promoteTarget?.members?.name}</strong> 님을 확정 예약으로 승격합니다. 정원 초과 여부를
            확인하세요. (크레딧 재차감은 발생하지 않습니다.)
          </>
        }
        confirmLabel="승격"
        variant="primary"
        loading={busy}
        onConfirm={promote}
        onClose={() => setPromoteTarget(null)}
      />
    </div>
  );
}
