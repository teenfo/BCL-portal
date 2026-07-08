'use client';

// §3 배지 (docs/03 §3.4) — 획득/미획득 그리드 + 진행률 (fn_get_my_badges).
import { Card, Badge, EmptyState, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import screen from '@/features/member-shell/screen.module.css';
import styles from './performance.module.css';

interface BadgeItem {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  threshold_value: number | null;
  current_value: number | null;
  earned: boolean;
}
interface BadgesData {
  earned_count: number;
  badges: BadgeItem[];
}

export function BadgesTab() {
  const badges = useQuery<BadgesData>(
    () => rpc(getSupabaseBrowserClient(), 'fn_get_my_badges'),
    [],
  );

  return (
    <>
      {badges.error ? (
        <Card>
          <EmptyState variant="error" title="배지를 불러오지 못했습니다" description={badges.error} onRetry={badges.refetch} />
        </Card>
      ) : badges.loading && !badges.data ? (
        <Skeleton variant="rect" height={200} />
      ) : (badges.data?.badges.length ?? 0) === 0 ? (
        <Card>
          <EmptyState title="배지가 아직 없습니다" description="출석·PR·레이스 활동으로 배지를 획득할 수 있어요." />
        </Card>
      ) : (
        <>
          <div className={screen.rowBetween}>
            <h2 className={screen.sectionTitle}>내 배지</h2>
            <Badge variant="accent">획득 {badges.data?.earned_count ?? 0}</Badge>
          </div>
          <div className={styles.badgeGrid}>
            {(badges.data?.badges ?? []).map((b) => {
              const pct =
                !b.earned && b.threshold_value && b.current_value != null
                  ? Math.min(100, Math.round((b.current_value / b.threshold_value) * 100))
                  : null;
              return (
                <div key={b.id} className={styles.badgeCell}>
                  <span className={`${styles.badgeIcon} ${b.earned ? '' : styles.badgeLocked}`}>
                    {b.icon ?? '🏅'}
                  </span>
                  <span className={styles.badgeName}>{b.name}</span>
                  {b.earned ? (
                    <Badge variant="success" size="sm">획득</Badge>
                  ) : pct != null ? (
                    <span className={styles.badgeProg}>{pct}%</span>
                  ) : (
                    <span className={styles.badgeProg}>미획득</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
