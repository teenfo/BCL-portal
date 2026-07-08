'use client';

// §2 랭킹 (docs/03 §3.4) — [레이스 | 벤치마크] 시설 스코프 리더보드 + 내 행 강조.
//  · 레이스: 누적거리 기준(fn_get_class_leaderboard)
//  · 벤치마크: 종목별 베스트 기준(fn_get_benchmark_leaderboard, rx/rx_plus만) — 종목 선택 제공
import { useMemo, useState } from 'react';
import { Card, Badge, EmptyState, Skeleton, Button, Select } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatScore, RX_LABEL } from '@/features/member-shell';
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

interface BenchmarkDef {
  id: string;
  name: string;
  metric_type: string;
  unit: string | null;
}
interface BenchLbEntry {
  rank: number;
  member_name: string;
  best_value: number;
  unit: string | null;
  rx_status: string;
}
interface BenchLeaderboard {
  benchmark: string;
  metric_type: string;
  unit: string | null;
  scope: string;
  entries: BenchLbEntry[];
}

const SCOPES = [
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'all', label: '전체' },
];
const MODES = [
  { key: 'race', label: '레이스' },
  { key: 'benchmark', label: '벤치마크' },
];

export function LeaderboardTab({ facilityId, myName }: { facilityId: string | null; myName: string | null }) {
  const [mode, setMode] = useState('race');
  const [scope, setScope] = useState('month');
  const [benchmark, setBenchmark] = useState<string | null>(null);

  const lb = useQuery<LbRow[]>(
    () =>
      facilityId
        ? rpc(getSupabaseBrowserClient(), 'fn_get_class_leaderboard', { p_facility_id: facilityId, p_scope: scope })
        : Promise.resolve<Envelope<LbRow[]>>({ success: false, data: null, error: '소속 지점 정보가 없습니다.' }),
    [facilityId, scope],
  );

  const defs = useQuery<BenchmarkDef[]>(
    () => rpc<BenchmarkDef[]>(getSupabaseBrowserClient(), 'fn_list_benchmark_definitions'),
    [],
  );

  // 종목 미선택 시 첫 종목 자동 선택
  const effBenchmark = benchmark ?? defs.data?.[0]?.name ?? null;

  const benchLb = useQuery<BenchLeaderboard>(
    () =>
      effBenchmark
        ? rpc(getSupabaseBrowserClient(), 'fn_get_benchmark_leaderboard', {
            p_benchmark: effBenchmark,
            p_scope: scope,
          })
        : Promise.resolve<Envelope<BenchLeaderboard>>({ success: false, data: null, error: '종목을 선택해주세요.' }),
    [effBenchmark, scope],
  );

  const benchOptions = useMemo(
    () => (defs.data ?? []).map((b) => ({ value: b.name, label: b.unit ? `${b.name} (${b.unit})` : b.name })),
    [defs.data],
  );

  return (
    <>
      <div className={styles.segRow}>
        {MODES.map((m) => (
          <Button key={m.key} variant={mode === m.key ? 'soft' : 'ghost'} size="sm" onClick={() => setMode(m.key)}>
            {m.label}
          </Button>
        ))}
      </div>

      <div className={styles.segRow}>
        {SCOPES.map((s) => (
          <Button key={s.key} variant={scope === s.key ? 'soft' : 'ghost'} size="sm" onClick={() => setScope(s.key)}>
            {s.label}
          </Button>
        ))}
      </div>

      {mode === 'race' ? (
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
      ) : (
        <>
          {defs.error ? (
            <Card>
              <EmptyState variant="error" title="종목을 불러오지 못했습니다" description={defs.error} onRetry={defs.refetch} />
            </Card>
          ) : (
            <Select
              label="벤치마크 종목"
              native
              placeholder="종목 선택"
              value={effBenchmark}
              onChange={(v) => setBenchmark(v)}
              options={benchOptions}
            />
          )}

          <Card title={effBenchmark ?? '벤치마크 랭킹'} action={<Badge variant="info" size="sm">베스트 기록</Badge>}>
            {benchLb.error ? (
              <EmptyState variant="error" title="랭킹을 불러오지 못했습니다" description={benchLb.error} onRetry={benchLb.refetch} />
            ) : (benchLb.loading && !benchLb.data) || defs.loading ? (
              <>
                <Skeleton variant="text" />
                <Skeleton variant="text" />
                <Skeleton variant="text" />
              </>
            ) : (benchLb.data?.entries.length ?? 0) === 0 ? (
              <EmptyState title="집계된 랭킹이 없습니다" description="Rx 이상 기록이 쌓이면 순위가 표시됩니다." />
            ) : (
              (benchLb.data?.entries ?? []).map((e) => {
                const me = myName != null && e.member_name === myName;
                return (
                  <div key={`${e.rank}-${e.member_name}-${e.rx_status}`} className={`${styles.rankRow} ${me ? styles.rankMe : ''}`}>
                    <span className={styles.rankNum}>{e.rank}</span>
                    <span className={styles.rankMain}>
                      <span className={styles.recordName}>{e.member_name}{me ? ' (나)' : ''}</span>
                      <span className={screen.muted}>{RX_LABEL[e.rx_status] ?? e.rx_status}</span>
                    </span>
                    <span className={styles.recordValue}>
                      {formatScore(e.best_value, benchLb.data?.metric_type, e.unit ?? benchLb.data?.unit)}
                    </span>
                  </div>
                );
              })
            )}
          </Card>
        </>
      )}
    </>
  );
}
