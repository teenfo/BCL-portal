'use client';

// profile §멤버십 — 현재 플랜/기간/잔여 크레딧/홀딩 이력 + 재구매 CTA → /apps/purchase.
import { Button, Badge, EmptyState, Skeleton } from '@/components/ui';
import { BottomSheet } from '@/features/member-shell';
import { useQuery } from '@/lib/data/useQuery';
import { query, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatDate, daysUntil } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import styles from '../profile.module.css';

interface MembershipRow {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  remaining_credits: number | null;
  membership_plans: { name: string | null; type: string | null } | null;
}

const STATUS_KO: Record<string, string> = {
  active: '이용 중',
  paused: '일시정지',
  expired: '만료',
  cancelled: '취소',
};

export function MembershipSheet({
  memberId,
  onClose,
  onPurchase,
}: {
  memberId: string | null;
  onClose: () => void;
  onPurchase: () => void;
}) {
  const data = useQuery<MembershipRow[]>(
    () =>
      memberId
        ? query<MembershipRow[]>(getSupabaseBrowserClient(), 'memberships', (q) =>
            q
              .select('id, status, start_date, end_date, remaining_credits, membership_plans(name, type)')
              .eq('member_id', memberId)
              .order('start_date', { ascending: false })
              .limit(20),
          )
        : Promise.resolve<Envelope<MembershipRow[]>>({ success: false, data: null, error: '회원 정보가 없습니다.' }),
    [memberId],
  );

  const rows = data.data ?? [];

  return (
    <BottomSheet
      variant="full"
      title="멤버십"
      onClose={onClose}
      footer={
        <Button variant="primary" block onClick={onPurchase}>
          멤버십 구매·연장
        </Button>
      }
    >
      {data.error ? (
        <EmptyState variant="error" title="멤버십을 불러오지 못했습니다" description={data.error} onRetry={data.refetch} />
      ) : data.loading && !data.data ? (
        <Skeleton variant="rect" height={160} />
      ) : rows.length === 0 ? (
        <EmptyState title="멤버십 내역이 없습니다" description="요금제를 구매해 운동을 시작해보세요." />
      ) : (
        rows.map((r) => {
          const dday = daysUntil(r.end_date);
          return (
            <div key={r.id} className={styles.txnRow}>
              <div>
                <p className={screen.strong}>{r.membership_plans?.name ?? '멤버십'}</p>
                <p className={screen.muted}>
                  {formatDate(r.start_date)} ~ {r.end_date ? formatDate(r.end_date) : '무기한'}
                  {r.remaining_credits != null ? ` · 잔여 ${r.remaining_credits}회` : ''}
                </p>
              </div>
              <div className={screen.metaRow}>
                {r.status === 'active' && dday !== null && dday <= 7 ? (
                  <Badge variant="warning" size="sm">{dday > 0 ? `D-${dday}` : 'D-Day'}</Badge>
                ) : null}
                <Badge variant={r.status === 'active' ? 'success' : 'neutral'} size="sm">
                  {STATUS_KO[r.status] ?? r.status}
                </Badge>
              </div>
            </div>
          );
        })
      )}
    </BottomSheet>
  );
}
