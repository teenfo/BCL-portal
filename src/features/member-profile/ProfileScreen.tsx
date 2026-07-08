'use client';

// 탭5 profile (/apps/profile) — docs/03 §3.5 [하위 5라우트 → 단일 설정 시트]
// 요약 카드 + 섹션 행(시트 전환, 페이지 내비게이션 0회). 본인 행 수정은 RLS own update/manage 정책 경유.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge, EmptyState, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth';
import { useMemberId, daysUntil } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import styles from './profile.module.css';
import { ProfileInfoSheet } from './sheets/ProfileInfoSheet';
import { NotificationPrefSheet } from './sheets/NotificationPrefSheet';
import { AppSettingsSheet } from './sheets/AppSettingsSheet';
import { PaymentsSheet } from './sheets/PaymentsSheet';
import { MembershipSheet } from './sheets/MembershipSheet';
import { FacilitySheet } from './sheets/FacilitySheet';
import { SupportSheet } from './sheets/SupportSheet';
import type { ProfileSummary } from './types';

const chev = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.chev}>
    <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type SheetKey = 'info' | 'membership' | 'payments' | 'notif' | 'app' | 'facility' | 'support' | null;

export function ProfileScreen() {
  const router = useRouter();
  const { profile: authProfile, signOut } = useAuth();
  const memberId = useMemberId();
  const [sheet, setSheet] = useState<SheetKey>(null);

  const data = useQuery<ProfileSummary>(
    () =>
      memberId
        ? loadSummary(memberId)
        : Promise.resolve<Envelope<ProfileSummary>>({ success: false, data: null, error: '회원 정보가 없습니다.' }),
    [memberId],
  );

  const m = data.data?.member;
  const ms = data.data?.membership;
  const dday = daysUntil(ms?.end_date);
  const initial = (m?.name ?? '회')[0];

  const rows: { key: Exclude<SheetKey, null>; label: string; value?: string }[] = [
    { key: 'info', label: '내 정보', value: m?.phone ?? undefined },
    { key: 'membership', label: '멤버십', value: ms?.plan_name ?? '없음' },
    { key: 'payments', label: '결제 내역' },
    { key: 'notif', label: '알림 설정' },
    { key: 'app', label: '앱 설정' },
    { key: 'facility', label: '지점 정보', value: data.data?.facility?.name ?? undefined },
    { key: 'support', label: '지원 (문의·FAQ)' },
  ];

  return (
    <div className={screen.page}>
      <header className={screen.pageHeader}>
        <h1 className={screen.pageTitle}>프로필</h1>
      </header>

      {data.error ? (
        <Card>
          <EmptyState variant="error" title="프로필을 불러오지 못했습니다" description={data.error} onRetry={data.refetch} />
        </Card>
      ) : data.loading && !data.data ? (
        <Skeleton variant="rect" height={96} />
      ) : (
        <>
          <Card>
            <div className={styles.summary}>
              {m?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar_url} alt="" className={styles.avatar} />
              ) : (
                <span className={`${styles.avatar} ${styles.avatarFallback}`}>{initial}</span>
              )}
              <div>
                <p className={styles.name}>{m?.name ?? '회원'}</p>
                <p className={screen.muted}>{authProfile?.email ?? ''}</p>
                {ms ? (
                  <div className={screen.metaRow}>
                    <Badge variant="neutral" size="sm">{ms.plan_name ?? '멤버십'}</Badge>
                    {dday !== null ? (
                      <Badge variant={dday <= 7 ? 'warning' : 'success'} size="sm">
                        {dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day' : '만료'}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <div className={styles.rows}>
              {rows.map((r) => (
                <button key={r.key} type="button" className={styles.row} onClick={() => setSheet(r.key)}>
                  <span className={styles.rowLabel}>{r.label}</span>
                  <span className={styles.rowValue}>
                    {r.value ? <span>{r.value}</span> : null}
                    {chev}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Button variant="soft" block onClick={() => router.push('/apps/feedback')}>
            수업 피드백 바로가기
          </Button>
          <Button variant="ghost" block onClick={() => void signOut()}>
            로그아웃
          </Button>
        </>
      )}

      {sheet === 'info' && m ? (
        <ProfileInfoSheet member={m} onClose={() => setSheet(null)} onSaved={data.refetch} />
      ) : null}
      {sheet === 'membership' ? (
        <MembershipSheet memberId={memberId} onClose={() => setSheet(null)} onPurchase={() => router.push('/apps/purchase')} />
      ) : null}
      {sheet === 'payments' ? <PaymentsSheet memberId={memberId} onClose={() => setSheet(null)} /> : null}
      {sheet === 'notif' ? <NotificationPrefSheet onClose={() => setSheet(null)} /> : null}
      {sheet === 'app' && m ? <AppSettingsSheet member={m} onClose={() => setSheet(null)} onSaved={data.refetch} /> : null}
      {sheet === 'facility' ? <FacilitySheet facilityId={m?.facility_id ?? null} onClose={() => setSheet(null)} /> : null}
      {sheet === 'support' ? <SupportSheet facility={data.data?.facility ?? null} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}

async function loadSummary(memberId: string): Promise<Envelope<ProfileSummary>> {
  const sb = getSupabaseBrowserClient();
  const memberRes = await query<ProfileSummary['member']>(sb, 'members', (q) =>
    q
      .select('id, name, phone, birthday, emergency_contact, avatar_url, facility_id, preferences')
      .eq('id', memberId)
      .single(),
  );
  if (!memberRes.success || !memberRes.data) {
    return { success: false, data: null, error: memberRes.error ?? '회원 정보를 불러오지 못했습니다.' };
  }
  const member = memberRes.data;

  const [msRes, facilityRes] = await Promise.all([
    query<{ end_date: string | null; remaining_credits: number | null; membership_plans: { name: string | null } | null }[]>(
      sb,
      'memberships',
      (q) =>
        q
          .select('end_date, remaining_credits, membership_plans(name)')
          .eq('member_id', memberId)
          .eq('status', 'active')
          .order('end_date', { ascending: true, nullsFirst: false })
          .limit(1),
    ),
    member.facility_id
      ? query<ProfileSummary['facility']>(sb, 'facilities', (q) =>
          q
            .select('id, name, address, phone, operating_hours, terms_of_service, refund_policy')
            .eq('id', member.facility_id as string)
            .single(),
        )
      : Promise.resolve<Envelope<ProfileSummary['facility']>>({ success: true, data: null, error: null }),
  ]);

  const msRow = msRes.data?.[0];
  return {
    success: true,
    data: {
      member,
      membership: msRow
        ? {
            plan_name: msRow.membership_plans?.name ?? null,
            end_date: msRow.end_date,
            remaining_credits: msRow.remaining_credits,
          }
        : null,
      facility: facilityRes.data ?? null,
    },
    error: null,
  };
}
