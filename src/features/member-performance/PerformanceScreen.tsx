'use client';

// 탭4 performance 허브 (/apps/performance) — docs/03 §3.4 [내 기록 | 랭킹 | 배지] 3섹션 통합
// 딥링크 ?tab=records|leaderboard|badges (as-is 3라우트 리다이렉트 매핑).
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs } from '@/components/ui';
import { query, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useQuery } from '@/lib/data/useQuery';
import { useMemberId } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import { RecordsTab } from './RecordsTab';
import { LeaderboardTab } from './LeaderboardTab';
import { BadgesTab } from './BadgesTab';

const TAB_KEYS = ['records', 'leaderboard', 'badges'];

export function PerformanceScreen() {
  const memberId = useMemberId();
  const params = useSearchParams();
  const initial = params.get('tab');
  const [tab, setTab] = useState(initial && TAB_KEYS.includes(initial) ? initial : 'records');

  const member = useQuery<{ name: string | null; facility_id: string | null }>(
    () =>
      memberId
        ? query(getSupabaseBrowserClient(), 'members', (q) =>
            q.select('name, facility_id').eq('id', memberId).single(),
          )
        : Promise.resolve<Envelope<{ name: string | null; facility_id: string | null }>>({
            success: false,
            data: null,
            error: '회원 정보가 없습니다.',
          }),
    [memberId],
  );

  const facilityId = member.data?.facility_id ?? null;
  const myName = member.data?.name ?? null;
  const memoTab = useMemo(() => tab, [tab]);

  return (
    <div className={screen.page}>
      <header className={screen.pageHeader}>
        <h1 className={screen.pageTitle}>내 성과</h1>
      </header>

      <Tabs
        value={memoTab}
        onChange={setTab}
        variant="segmented"
        queryKey="tab"
        tabs={[
          { key: 'records', label: '내 기록' },
          { key: 'leaderboard', label: '랭킹' },
          { key: 'badges', label: '배지' },
        ]}
        aria-label="성과 탭"
      />

      {tab === 'records' ? <RecordsTab memberId={memberId} /> : null}
      {tab === 'leaderboard' ? <LeaderboardTab facilityId={facilityId} myName={myName} /> : null}
      {tab === 'badges' ? <BadgesTab /> : null}
    </div>
  );
}
