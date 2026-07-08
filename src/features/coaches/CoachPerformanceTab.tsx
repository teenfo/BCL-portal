'use client';

// 코치 성과 탭 (02-admin §3.7 performance) — 스테일 /admin/insights/coaches 정식 대체
// 코치별 KPI: 담당 세션 수/평점/담당 회원 수 — fn_get_coach_performance_stats().
// 정산 실행/근거는 /admin/payments?tab=report 딥링크(Admin=정산 실행, Coach=read-only 원칙).
// ⏳ 축소: 월별 상세는 fn_get_coach_monthly_report가 auth.uid() 기반 코치-본인 전용 스코프라
//    Admin이 특정 코치를 지정해 조회할 수 없음(스키마 불일치) → 여기서는 집계 KPI만 제공.
import { useRouter } from 'next/navigation';
import { Card, Table, Badge, StatCard, Button } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  type CoachPerfStat,
  type CoachDisplayState,
  COACH_STATE_LABEL,
  COACH_STATE_BADGE,
  coachDisplayState,
} from './types';
import styles from './coaches.module.css';

export function CoachPerformanceTab() {
  const router = useRouter();
  const stats = useQuery<CoachPerfStat[]>(
    () => rpc<CoachPerfStat[]>(getSupabaseBrowserClient(), 'fn_get_coach_performance_stats'),
    [],
  );

  const list = stats.data ?? [];
  const totalSessions = list.reduce((s, c) => s + (c.total_sessions ?? 0), 0);
  const avgRating =
    list.length > 0
      ? Math.round((list.reduce((s, c) => s + (c.avg_rating ?? 0), 0) / list.length) * 10) / 10
      : 0;

  const columns: TableColumn<CoachPerfStat>[] = [
    {
      key: 'name',
      header: '코치',
      render: (c) => {
        const st: CoachDisplayState = coachDisplayState({ user_id: 'x', status: c.status });
        return (
          <div className={styles.cellStack}>
            <span>{c.name}</span>
            <span className={styles.badgeRow}>
              <Badge variant={COACH_STATE_BADGE[st]}>{COACH_STATE_LABEL[st]}</Badge>
            </span>
          </div>
        );
      },
    },
    {
      key: 'total_sessions',
      header: '담당 세션',
      align: 'right',
      render: (c) => (c.total_sessions ?? 0).toLocaleString('ko-KR'),
    },
    {
      key: 'avg_rating',
      header: '평균 평점',
      align: 'right',
      render: (c) => (c.avg_rating ? `${c.avg_rating.toFixed(1)} / 5` : '-'),
    },
    {
      key: 'total_members',
      header: '담당 회원',
      align: 'right',
      render: (c) => (c.total_members ?? 0).toLocaleString('ko-KR'),
    },
  ];

  return (
    <div className={styles.tabPanel}>
      <div className={styles.perfGrid}>
        <StatCard label="활동 코치" value={list.length.toLocaleString('ko-KR')} loading={stats.loading} />
        <StatCard
          label="총 담당 세션"
          value={totalSessions.toLocaleString('ko-KR')}
          loading={stats.loading}
        />
        <StatCard
          label="평균 평점"
          value={avgRating ? `${avgRating.toFixed(1)} / 5` : '-'}
          loading={stats.loading}
        />
      </div>

      <Card>
        <Table<CoachPerfStat>
          columns={columns}
          rows={list}
          rowKey={(c) => c.id}
          loading={stats.loading}
          empty={
            stats.error
              ? {
                  variant: 'error',
                  title: '성과 통계를 불러오지 못했습니다',
                  description: stats.error,
                  onRetry: stats.refetch,
                }
              : { title: '집계된 코치 성과가 없습니다', description: '활동 중인 코치가 없습니다.' }
          }
        />
      </Card>

      <Card
        title="월 정산"
        action={
          <Button
            variant="soft"
            size="sm"
            onClick={() => router.push('/admin/payments?tab=report')}
          >
            정산 화면으로
          </Button>
        }
      >
        <p className={styles.note}>
          코치 월 정산 실행·확정과 상세 근거(예상 정산 = 기본급 + 정산가능 세션수 × 세션당 수당)는 결제
          화면의 리포트 탭에서 처리합니다. 코치 앱과 동일 수치를 사용합니다.
        </p>
      </Card>
    </div>
  );
}
