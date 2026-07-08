'use client';

// §2 랭킹 (docs/03 §3.4) — 시설 스코프 레이스 리더보드(fn_get_class_leaderboard) + 내 행 강조.
// FLAG: 벤치마크별 리더보드 RPC 부재(fn_get_class_leaderboard는 레이스 누적거리 기준) — 아래는 레이스 랭킹.
import { useState } from 'react';
import { Card, Badge, EmptyState, Skeleton, Button } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import screen from '@/features/member-shell/screen.module.css';
import styles from './performance.module.css';

interface LbRow {
  rank: number;
  member_name: string;
  total_distance_m: number | null;
  race_count: number;
  wins: number;
  pr_count: number;
}

const SCOPES = [
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'all', label: '전체' },
];

export function LeaderboardTab({ facilityId, myName }: { facilityId: string | null; myName: string | null }) {
  const [scope, setScope] = useState('month');

  const lb = useQuery<LbRow[]>(
    () =>
      facilityId
        ? rpc(getSupabaseBrowserClient(), 'fn_get_class_leaderboard', { p_facility_id: facilityId, p_scope: scope })
        : Promise.resolve<Envelope<LbRow[]>>({ success: false, data: null, error: '소속 지점 정보가 없습니다.' }),
    [facilityId, scope],
  );

  return (
    <>
      <div className={styles.segRow}>
        {SCOPES.map((s) => (
          <Button
            key={s.key}
            variant={scope === s.key ? 'soft' : 'ghost'}
            size="sm"
            onClick={() => setScope(s.key)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <Card title="레이스 랭킹" action={<Badge variant="info" size="sm">누적 거리</Badge>}>
        {lb.error ? (
          <EmptyState variant="error" title="랭킹을 불러오지 못했습니다" description={lb.error} onRetry={lb.refetch} />
        ) : lb.loading && !lb.data ? (
          <>
            <Skeleton variant="text" />
            <Skeleton variant="text" />
            <Skeleton variant="text" />
          </>
        ) : (lb.data?.length ?? 0) === 0 ? (
          <EmptyState title="집계된 랭킹이 없습니다" description="레이스 이벤트가 진행되면 순위가 표시됩니다." />
        ) : (
          (lb.data ?? []).map((r) => {
            const me = myName != null && r.member_name === myName;
            return (
              <div key={`${r.rank}-${r.member_name}`} className={`${styles.rankRow} ${me ? styles.rankMe : ''}`}>
                <span className={styles.rankNum}>{r.rank}</span>
                <span className={styles.rankMain}>
                  <span className={styles.recordName}>{r.member_name}{me ? ' (나)' : ''}</span>
                  <span className={screen.muted}>
                    {r.race_count}회 · 우승 {r.wins} · PR {r.pr_count}
                  </span>
                </span>
                <span className={styles.recordValue}>
                  {r.total_distance_m ? `${Math.round(r.total_distance_m).toLocaleString('ko-KR')}m` : '-'}
                </span>
              </div>
            );
          })
        )}
      </Card>
    </>
  );
}
