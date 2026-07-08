'use client';

// 회원 상세 — performance 탭 (02-admin §3.2)
// fn_get_member_performance_profile(p_member_id) 요약(벤치마크·PR) + 보유 배지(badge_awards ⏳)
import { Card, Badge, StatCard, EmptyState, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fmtDate } from '../types';
import styles from '../detail.module.css';

interface BenchmarkBest {
  benchmark_id: string;
  name: string;
  metric_type: string;
  unit: string | null;
  best_value: number | null;
  attempt_count: number;
  last_recorded_at: string | null;
}

interface PerformanceProfile {
  member_id: string;
  benchmark_bests: BenchmarkBest[];
  race_records: unknown[];
  benchmark_pr_count: number;
  race_pr_count: number;
}

interface BadgeAward {
  id: string;
  awarded_at: string;
  source: 'auto' | 'manual';
  badge_definitions: { name: string; icon: string | null; category: string } | null;
}

interface Props {
  memberId: string;
}

export function PerformanceTab({ memberId }: Props) {
  const client = getSupabaseBrowserClient();

  const profile = useQuery<PerformanceProfile>(
    () => rpc<PerformanceProfile>(client, 'fn_get_member_performance_profile', { p_member_id: memberId }),
    [memberId],
  );

  const badges = useQuery<BadgeAward[]>(
    () =>
      query<BadgeAward[]>(client, 'badge_awards', (q) =>
        q
          .select('id,awarded_at,source,badge_definitions(name,icon,category)')
          .eq('member_id', memberId)
          .order('awarded_at', { ascending: false }),
      ),
    [memberId],
  );

  const p = profile.data;
  const bests = p?.benchmark_bests ?? [];

  return (
    <div className={styles.tabBody}>
      <Card title="퍼포먼스 요약">
        {profile.loading ? (
          <Skeleton variant="text" width="100%" height="60px" />
        ) : profile.error ? (
          <EmptyState
            variant="error"
            title="퍼포먼스를 불러오지 못했습니다"
            description={profile.error}
            onRetry={profile.refetch}
          />
        ) : (
          <div className={styles.summaryGrid}>
            <StatCard label="벤치마크 PR" value={`${p?.benchmark_pr_count ?? 0}회`} />
            <StatCard label="Race PR" value={`${p?.race_pr_count ?? 0}회`} />
            <StatCard label="벤치마크 종목" value={`${bests.length}종`} />
          </div>
        )}
      </Card>

      <Card title="벤치마크 기록">
        {profile.loading ? (
          <Skeleton variant="text" width="100%" height="60px" />
        ) : bests.length === 0 ? (
          <EmptyState title="기록된 벤치마크가 없습니다" description="세션·Race에서 기록이 쌓이면 표시됩니다." />
        ) : (
          <div className={styles.perfList}>
            {bests.map((b) => (
              <div key={b.benchmark_id} className={styles.perfRow}>
                <div className={styles.field}>
                  <span className={styles.perfName}>{b.name}</span>
                  <span className={styles.fieldLabel}>
                    {b.attempt_count}회 시도 · 최근 {fmtDate(b.last_recorded_at)}
                  </span>
                </div>
                <span className={styles.perfValue}>
                  {b.best_value ?? '-'} {b.unit ?? ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="보유 배지">
        {badges.loading ? (
          <Skeleton variant="text" width="100%" height="60px" />
        ) : badges.error || (badges.data ?? []).length === 0 ? (
          <EmptyState
            title="보유한 배지가 없습니다"
            description="배지 스키마 도입 후 자동/수동 수여 시 표시됩니다."
          />
        ) : (
          <div className={styles.badgeGrid}>
            {(badges.data ?? []).map((a) => (
              <div key={a.id} className={styles.badgeCard}>
                <span className={styles.perfName}>{a.badge_definitions?.name ?? '배지'}</span>
                <Badge variant={a.source === 'manual' ? 'accent' : 'success'}>
                  {a.source === 'manual' ? '수동' : '자동'}
                </Badge>
                <span className={styles.fieldLabel}>{fmtDate(a.awarded_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
