'use client';

// 리더보드 (docs/05 §5.3) — fn_get_class_leaderboard(anon §6.1). 이름+기록 랭킹(생체 지표 제외).
// 스코프 탭(week/month/all). 일일 WOD 화이트보드 모드(?session)는 WodBoard(fn_get_class_wod_board)로 분기.
// Display-Safe: 이름·기록·PR/승수만.
import { useState } from 'react';
import { StatusStrip, usePolling } from '@/features/class-common';
import { rpc, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { WodBoard } from './WodBoard';
import styles from './leaderboard.module.css';

type Scope = 'week' | 'month' | 'all';

interface Entry {
  rank: number;
  member_name: string;
  total_distance_m: number | null;
  race_count: number;
  wins: number;
  pr_count: number;
}

interface LeaderboardData {
  scope: string;
  since: string;
  entries: Entry[];
}

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'week', label: '주간' },
  { key: 'month', label: '월간' },
  { key: 'all', label: '전체' },
];

function fetchLeaderboard(facilityId: string, scope: Scope): Promise<Envelope<LeaderboardData>> {
  return rpc<LeaderboardData>(getSupabaseBrowserClient(), 'fn_get_class_leaderboard', {
    p_facility_id: facilityId,
    p_scope: scope,
  });
}

export function Leaderboard({
  facilityId,
  sessionId = null,
}: {
  facilityId: string | null;
  /** 지정 시 일일 WOD 화이트보드 모드(fn_get_class_wod_board)로 렌더 */
  sessionId?: string | null;
}) {
  // 화이트보드 모드: ?session 제공 시 daily-WOD 보드로 분기(별도 훅 트리 — hooks 규칙 준수).
  if (sessionId) {
    return <WodBoard sessionId={sessionId} />;
  }
  return <RaceLeaderboard facilityId={facilityId} />;
}

function RaceLeaderboard({ facilityId }: { facilityId: string | null }) {
  const [scope, setScope] = useState<Scope>('month');
  const { data, initialLoading } = usePolling<LeaderboardData | null>(
    () =>
      facilityId
        ? fetchLeaderboard(facilityId, scope)
        : Promise.resolve({ success: true, data: null, error: null }),
    300_000, // 5분 폴링(저빈도 충분)
    [facilityId, scope],
  );

  const entries = data?.entries ?? [];

  return (
    <div className={styles.lbRoot}>
      <StatusStrip realtime={undefined} />
      <header className={styles.lbHead}>
        <h1 className={styles.lbTitle}>LEADERBOARD</h1>
        <div className={styles.scopeTabs}>
          {SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`${styles.scopeTab} ${scope === s.key ? styles.scopeTabActive : ''}`}
              onClick={() => setScope(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      {initialLoading ? null : entries.length === 0 ? (
        <div className={styles.lbEmpty}>집계된 기록이 없습니다</div>
      ) : (
        <ol className={styles.lbList}>
          {entries.map((e) => (
            <li key={e.rank} className={styles.lbRow} data-rank={e.rank}>
              <span className={styles.lbRank}>{e.rank}</span>
              <span className={styles.lbName}>{e.member_name}</span>
              <span className={styles.lbDist}>
                {Math.round(e.total_distance_m ?? 0).toLocaleString()}m
              </span>
              <span className={styles.lbMeta}>
                {e.race_count}회
                {e.wins > 0 ? ` · ${e.wins}승` : ''}
                {e.pr_count > 0 ? ` · PR ${e.pr_count}` : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
