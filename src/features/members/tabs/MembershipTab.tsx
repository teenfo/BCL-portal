'use client';

// 회원 상세 — membership 탭 (02-admin §3.2, 통합 UX 핵심)
// 상단=현재 멤버십 카드 + 액션(생성/연장/홀딩/재개/크레딧조정/양도/취소)
// 하단=이력 타임라인(membership_history). 액션 전부 신규 RPC 사용.
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Button,
  Badge,
  StatCard,
  EmptyState,
  Skeleton,
  ConfirmModal,
  useToast,
} from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { MembershipCreateModal, type PlanOption } from '../membership/MembershipCreateModal';
import { MembershipAdjustModal, type AdjustAction } from '../membership/MembershipAdjustModal';
import { MembershipTransferModal } from '../membership/MembershipTransferModal';
import {
  type Membership,
  type MembershipHistoryRow,
  MEMBERSHIP_STATUS_LABEL,
  HISTORY_ACTION_LABEL,
  fmtDate,
  fmtDateTime,
  daysUntil,
  rpcError,
} from '../types';
import styles from '../detail.module.css';

interface Bundle {
  memberships: Membership[];
  history: MembershipHistoryRow[];
}

interface Props {
  memberId: string;
  memberName: string;
}

const STATUS_BADGE: Record<Membership['status'], 'success' | 'info' | 'neutral' | 'danger'> = {
  active: 'success',
  paused: 'info',
  expired: 'neutral',
  cancelled: 'danger',
};

export function MembershipTab({ memberId, memberName }: Props) {
  const router = useRouter();
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('members', 'edit');
  const canDelete = can('members', 'delete');
  const client = getSupabaseBrowserClient();

  const bundle = useQuery<Bundle>(
    async () => {
      const msRes = await query<Membership[]>(client, 'memberships', (q) =>
        q
          .select('*, membership_plans(name,type,max_pauses,duration_days,credit_count)')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false }),
      );
      if (!msRes.success) return { success: false, data: null, error: msRes.error };
      const memberships = msRes.data ?? [];
      const ids = memberships.map((m) => m.id);
      let history: MembershipHistoryRow[] = [];
      if (ids.length > 0) {
        const hRes = await query<MembershipHistoryRow[]>(client, 'membership_history', (q) =>
          q.select('*').in('membership_id', ids).order('created_at', { ascending: false }),
        );
        if (hRes.success) history = hRes.data ?? [];
      }
      return { success: true, data: { memberships, history }, error: null };
    },
    [memberId],
  );

  const plans = useQuery<PlanOption[]>(
    () =>
      query<PlanOption[]>(client, 'membership_plans', (q) =>
        q
          .select('id,name,type,duration_days,credit_count,price')
          .eq('is_active', true)
          .order('name', { ascending: true }),
      ),
    [],
  );

  // 모달 상태
  const [createOpen, setCreateOpen] = useState(false);
  const [adjust, setAdjust] = useState<{ membership: Membership; action: AdjustAction } | null>(null);
  const [transfer, setTransfer] = useState<Membership | null>(null);
  const [cancelling, setCancelling] = useState<Membership | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const history = bundle.data?.history ?? [];

  const current = useMemo(
    () =>
      (bundle.data?.memberships ?? []).filter(
        (m) => m.status === 'active' || m.status === 'paused',
      ),
    [bundle.data],
  );

  const doCancel = async () => {
    if (!cancelling) return;
    setCancelBusy(true);
    const res = await rpc(client, 'fn_admin_adjust_membership', {
      p_membership_id: cancelling.id,
      p_action: 'cancel',
      p_payload: { reason: '관리자 중도 해지' },
    });
    setCancelBusy(false);
    if (!res.success) {
      toast.error(rpcError(res.error));
      return;
    }
    toast.success('멤버십을 취소했습니다. 환불은 결제 화면에서 진행하세요.', {
      label: '결제로 이동',
      onClick: () => router.push('/admin/payments?tab=transactions'),
    });
    setCancelling(null);
    bundle.refetch();
  };

  const onDone = () => {
    setCreateOpen(false);
    setAdjust(null);
    setTransfer(null);
    bundle.refetch();
  };

  return (
    <div className={styles.tabBody}>
      {/* 현재 멤버십 */}
      <Card
        title="현재 멤버십"
        action={
          canEdit ? (
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              멤버십 발급
            </Button>
          ) : undefined
        }
      >
        {bundle.loading ? (
          <Skeleton variant="text" width="100%" height="80px" />
        ) : bundle.error ? (
          <EmptyState
            variant="error"
            title="멤버십을 불러오지 못했습니다"
            description={bundle.error}
            onRetry={bundle.refetch}
          />
        ) : current.length === 0 ? (
          <EmptyState
            title="활성 멤버십이 없습니다"
            description="새 멤버십을 발급하세요."
            action={canEdit ? { label: '멤버십 발급', onClick: () => setCreateOpen(true) } : undefined}
          />
        ) : (
          <div className={styles.tabBody}>
            {current.map((m) => {
              const dday = daysUntil(m.end_date);
              return (
                <div key={m.id} className={styles.msCard}>
                  <div className={styles.msTop}>
                    <span className={styles.msName}>{m.membership_plans?.name ?? '요금제 미상'}</span>
                    <Badge variant={STATUS_BADGE[m.status]}>{MEMBERSHIP_STATUS_LABEL[m.status]}</Badge>
                  </div>
                  <div className={styles.summaryGrid}>
                    <StatCard label="시작일" value={fmtDate(m.start_date)} />
                    <StatCard
                      label="종료일"
                      value={m.end_date ? fmtDate(m.end_date) : '무기한'}
                      hint={dday != null ? (dday >= 0 ? `D-${dday}` : `만료 ${-dday}일 경과`) : undefined}
                    />
                    <StatCard
                      label="잔여 크레딧"
                      value={m.remaining_credits != null ? `${m.remaining_credits}회` : '해당 없음'}
                    />
                    <StatCard
                      label="홀딩 사용"
                      value={`${m.pause_count} / ${m.membership_plans?.max_pauses ?? 0}회`}
                    />
                  </div>
                  {canEdit ? (
                    <div className={styles.actionBar}>
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => setAdjust({ membership: m, action: 'extend' })}
                      >
                        연장
                      </Button>
                      {m.status === 'active' ? (
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => setAdjust({ membership: m, action: 'hold' })}
                        >
                          홀딩
                        </Button>
                      ) : (
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => setAdjust({ membership: m, action: 'resume' })}
                        >
                          재개
                        </Button>
                      )}
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => setAdjust({ membership: m, action: 'credit_adjust' })}
                      >
                        크레딧 조정
                      </Button>
                      {canDelete ? (
                        <>
                          <Button variant="soft" size="sm" onClick={() => setTransfer(m)}>
                            양도
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setCancelling(m)}>
                            취소
                          </Button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 이력 타임라인 */}
      <Card title="변경 이력">
        {bundle.loading ? (
          <Skeleton variant="text" width="100%" height="80px" />
        ) : history.length === 0 ? (
          <EmptyState title="변경 이력이 없습니다" description="멤버십 생성·조정 시 이력이 기록됩니다." />
        ) : (
          <div className={styles.timeline}>
            {history.map((h) => (
              <div key={h.id} className={styles.timelineItem}>
                <span className={styles.timelineDot} aria-hidden="true" />
                <div className={styles.timelineMain}>
                  <div className={styles.timelineHead}>
                    <Badge variant="neutral">
                      {HISTORY_ACTION_LABEL[h.action_type] ?? h.action_type}
                    </Badge>
                    <span className={styles.timelineTime}>{fmtDateTime(h.created_at)}</span>
                  </div>
                  {h.notes ? <span className={styles.timelineNote}>{h.notes}</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {createOpen ? (
        <MembershipCreateModal
          memberId={memberId}
          plans={plans.data ?? []}
          onClose={() => setCreateOpen(false)}
          onDone={onDone}
        />
      ) : null}

      {adjust ? (
        <MembershipAdjustModal
          membership={adjust.membership}
          action={adjust.action}
          onClose={() => setAdjust(null)}
          onDone={onDone}
        />
      ) : null}

      {transfer ? (
        <MembershipTransferModal
          membership={transfer}
          sourceMemberName={memberName}
          onClose={() => setTransfer(null)}
          onDone={onDone}
        />
      ) : null}

      {/* 취소 = 2단계(환급 안내 → '취소' 타이핑) */}
      <ConfirmModal
        open={cancelling != null}
        title="멤버십 취소 (중도 해지)"
        variant="danger"
        confirmLabel="멤버십 취소"
        requireTyping="취소"
        loading={cancelBusy}
        message={
          <>
            <strong>{memberName}</strong>님의 멤버십을 중도 해지합니다. 환급액은 결제 화면에서 서버
            계산 후 환불 승인 절차로 처리됩니다(요금제 환불 정책 기준). 되돌릴 수 없습니다. 계속하려면
            아래에 <strong>취소</strong>를 입력하세요.
          </>
        }
        onConfirm={doCancel}
        onClose={() => setCancelling(null)}
      />
    </div>
  );
}
