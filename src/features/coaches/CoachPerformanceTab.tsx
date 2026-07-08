'use client';

// 코치 성과 탭 (02-admin §3.7 performance) — 스테일 /admin/insights/coaches 정식 대체
// 코치별 KPI: 담당 세션 수/평점/담당 회원 수 — fn_get_coach_performance_stats().
// 정산 실행/확정은 /admin/payments?tab=report 딥링크(Admin=정산 실행, Coach=read-only 원칙).
// 월별 상세(정산 근거): fn_get_coach_monthly_report(p_coach_id) — Admin이 특정 코치를 지정해 조회.
//   (p_coach_id 지정 시 서버가 is_admin() 검증 → coach 앱의 본인 스코프와 동일 수치)
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Table, Badge, StatCard, Button, Select } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import type { Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  type CoachPerfStat,
  type CoachDisplayState,
  COACH_STATE_LABEL,
  COACH_STATE_BADGE,
  coachDisplayState,
  krw,
} from './types';
import styles from './coaches.module.css';

/** fn_get_coach_monthly_report basis 섹션 */
interface MonthlyBasis {
  coach_id: string;
  base_salary: number;
  session_allowance: number;
  payable_session_count: number;
  cancelled_session_count: number;
  completed_session_count: number;
  expected_total_amount: number;
  settlement_snapshot_status: string | null;
}

const SETTLEMENT_LABEL: Record<string, string> = {
  draft: '작성 중',
  confirmed: '확정',
  paid: '지급 완료',
};

// 최근 6개월 YYYY-MM 옵션
function recentMonths(count: number): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ value: ym, label: `${d.getFullYear()}년 ${d.getMonth() + 1}월` });
  }
  return out;
}

export function CoachPerformanceTab() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const stats = useQuery<CoachPerfStat[]>(
    () => rpc<CoachPerfStat[]>(supabase, 'fn_get_coach_performance_stats'),
    [],
  );

  const monthOptions = useMemo(() => recentMonths(6), []);
  const [selected, setSelected] = useState<CoachPerfStat | null>(null);
  const [month, setMonth] = useState<string>(() => monthOptions[0]?.value ?? '');

  // 월별 정산 근거 — 코치 선택 시에만 조회(미선택 시 RPC 미호출)
  const monthly = useQuery<MonthlyBasis | null>(
    () =>
      selected
        ? rpc<{ basis: MonthlyBasis }>(supabase, 'fn_get_coach_monthly_report', {
            p_year_month: month,
            p_sections: ['basis'],
            p_coach_id: selected.id,
          }).then((r) => ({ ...r, data: r.data?.basis ?? null }))
        : Promise.resolve<Envelope<MonthlyBasis | null>>({ success: true, data: null, error: null }),
    [selected?.id, month],
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
    {
      key: 'detail',
      header: '',
      align: 'right',
      render: (c) => (
        <Button
          variant={selected?.id === c.id ? 'soft' : 'ghost'}
          size="sm"
          onClick={() => setSelected(c)}
        >
          월별 상세
        </Button>
      ),
    },
  ];

  const basis = monthly.data;

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

      {/* 월별 정산 근거 — 선택 코치 기준(Admin 지정 조회) */}
      <Card
        title={selected ? `월별 정산 근거 — ${selected.name}` : '월별 정산 근거'}
        action={
          <Select
            label="조회 월"
            value={month}
            onChange={(v) => setMonth(v)}
            options={monthOptions}
            disabled={!selected}
          />
        }
      >
        {!selected ? (
          <p className={styles.note}>표에서 코치의 “월별 상세”를 눌러 해당 월 정산 근거를 확인하세요.</p>
        ) : monthly.error ? (
          <p className={styles.errorText}>{monthly.error}</p>
        ) : basis ? (
          <>
            <div className={styles.perfGrid}>
              <StatCard label="기본급" value={krw(basis.base_salary)} loading={monthly.loading} />
              <StatCard
                label="정산가능 세션"
                value={`${(basis.payable_session_count ?? 0).toLocaleString('ko-KR')}회`}
                loading={monthly.loading}
              />
              <StatCard
                label="세션당 수당"
                value={krw(basis.session_allowance)}
                loading={monthly.loading}
              />
              <StatCard
                label="예상 정산액"
                value={krw(basis.expected_total_amount)}
                loading={monthly.loading}
              />
            </div>
            <p className={styles.note}>
              예상 정산 = 기본급 + 정산가능 세션수 × 세션당 수당. 완료 {basis.completed_session_count ?? 0}회 ·
              취소 {basis.cancelled_session_count ?? 0}회. 정산 스냅샷 상태:{' '}
              {basis.settlement_snapshot_status
                ? (SETTLEMENT_LABEL[basis.settlement_snapshot_status] ?? basis.settlement_snapshot_status)
                : '미생성'}
              . 확정·지급은 결제 화면의 리포트 탭에서 처리합니다(코치 앱과 동일 수치).
            </p>
          </>
        ) : (
          <p className={styles.note}>해당 월의 정산 근거가 없습니다.</p>
        )}
      </Card>

      <Card
        title="월 정산 실행"
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
          코치 월 정산 실행·확정은 결제 화면의 리포트 탭에서 처리합니다. 위 근거와 동일 수치를 사용합니다.
        </p>
      </Card>
    </div>
  );
}
