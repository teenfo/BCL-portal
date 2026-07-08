'use client';

// /admin/members/[id] — 회원 상세 (02-admin §3.2 B)
// Tabs(overview|membership|activity|notes|performance) — ?tab= URL 동기
import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, Button, Tabs, Badge, EmptyState, Skeleton } from '@/components/ui';
import type { TabItem } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { OverviewTab } from './tabs/OverviewTab';
import { MembershipTab } from './tabs/MembershipTab';
import { ActivityTab } from './tabs/ActivityTab';
import { NotesTab } from './tabs/NotesTab';
import { PerformanceTab } from './tabs/PerformanceTab';
import { type MemberDetail, MEMBER_STATUS_LABEL } from './types';
import styles from './detail.module.css';

const TAB_KEYS = ['overview', 'membership', 'activity', 'notes', 'performance'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TABS: TabItem[] = [
  { key: 'overview', label: '개요' },
  { key: 'membership', label: '멤버십' },
  { key: 'activity', label: '활동' },
  { key: 'notes', label: '노트' },
  { key: 'performance', label: '성과' },
];

export function MemberDetailScreen() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { can } = useMyPermissions();
  const memberId = params.id;

  const initialTab = searchParams?.get('tab');
  const [tab, setTab] = useState<TabKey>(
    TAB_KEYS.includes(initialTab as TabKey) ? (initialTab as TabKey) : 'overview',
  );

  const member = useQuery<MemberDetail>(
    () =>
      query<MemberDetail>(getSupabaseBrowserClient(), 'members', (q) =>
        q.select('*').eq('id', memberId).single(),
      ),
    [memberId],
  );

  if (!can('members', 'view')) {
    return (
      <div className={styles.page}>
        <Card>
          <p>이 화면에 접근할 권한이 없습니다.</p>
        </Card>
      </div>
    );
  }

  const m = member.data;

  return (
    <div className={styles.page}>
      <div className={styles.backRow}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/members')}>
          ← 회원 목록
        </Button>
      </div>

      {member.error ? (
        <Card>
          <EmptyState
            variant="error"
            title="회원 정보를 불러오지 못했습니다"
            description={member.error}
            onRetry={member.refetch}
            secondaryAction={{ label: '목록으로', onClick: () => router.push('/admin/members') }}
          />
        </Card>
      ) : (
        <>
          <header className={styles.header}>
            <div className={styles.titleWrap}>
              <div className={styles.titleRow}>
                {member.loading || !m ? (
                  <Skeleton variant="text" width="180px" height="calc(28px * var(--bcl-font-scale))" />
                ) : (
                  <>
                    <h1 className={styles.title}>{m.name}</h1>
                    <Badge variant={m.status === 'active' ? 'success' : 'neutral'}>
                      {MEMBER_STATUS_LABEL[m.status]}
                    </Badge>
                    {m.is_blacklisted ? <Badge variant="danger">블랙리스트</Badge> : null}
                    {m.user_id == null ? <Badge variant="neutral">계정 미연결</Badge> : null}
                  </>
                )}
              </div>
              {m ? (
                <p className={styles.subtitle}>
                  {m.phone ?? '연락처 없음'} · {m.email ?? '이메일 없음'}
                </p>
              ) : null}
            </div>
          </header>

          <Tabs tabs={TABS} value={tab} onChange={(k) => setTab(k as TabKey)} aria-label="회원 상세 탭" />

          <div className={styles.tabBody}>
            {tab === 'overview' ? (
              <OverviewTab
                memberId={memberId}
                member={m}
                loading={member.loading}
                onMemberChanged={member.refetch}
              />
            ) : null}
            {tab === 'membership' ? <MembershipTab memberId={memberId} memberName={m?.name ?? ''} /> : null}
            {tab === 'activity' ? <ActivityTab memberId={memberId} /> : null}
            {tab === 'notes' ? <NotesTab memberId={memberId} /> : null}
            {tab === 'performance' ? <PerformanceTab memberId={memberId} /> : null}
          </div>
        </>
      )}
    </div>
  );
}
