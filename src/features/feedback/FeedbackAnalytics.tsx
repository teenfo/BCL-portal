'use client';

// 피드백 analytics 탭 — 평점 트렌드/분포 + 코치별 평균 + 저평점 분류 (02-admin §3.12)
// 집계는 session_feedback 직접 조회 후 클라이언트 집계. CSS 막대 게이지만 사용(차트 라이브러리 금지).
// ⏳ 범위 외: 키워드/사유 분포, 급증 알림.
import { useMemo, useState } from 'react';
import { Card, Input, Button, StatCard, Table, Badge, EmptyState } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type FeedbackRow, LOW_RATING_MAX } from './types';
import styles from './feedback.module.css';

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export function FeedbackAnalytics({ onJumpToInbox }: { onJumpToInbox: (id: string) => void }) {
  const [from, setFrom] = useState<string>(daysAgo(29));
  const [to, setTo] = useState<string>(isoDate(new Date()));

  const startISO = `${from}T00:00:00`;
  const endISO = useMemo(() => {
    const d = new Date(`${to}T00:00:00`);
    d.setDate(d.getDate() + 1);
    return `${isoDate(d)}T00:00:00`;
  }, [to]);

  const feedback = useQuery<FeedbackRow[]>(
    () =>
      query<FeedbackRow[]>(getSupabaseBrowserClient(), 'session_feedback', (q) =>
        q
          .select(
            'id, session_id, member_id, coach_id, rating, comment, admin_response, responded_at, created_at, members(name), coaches(name), sessions(title, session_date)',
          )
          .gte('created_at', startISO)
          .lt('created_at', endISO)
          .order('created_at', { ascending: false })
          .limit(5000),
      ),
    [startISO, endISO],
  );

  const rows = useMemo(() => feedback.data ?? [], [feedback.data]);

  const { total, avg, dist, maxDist, lowCount, byCoach } = useMemo(() => {
    const d = [0, 0, 0, 0, 0]; // rating 1..5
    let sum = 0;
    let low = 0;
    const coach = new Map<string, { name: string; sum: number; count: number; low: number }>();
    for (const r of rows) {
      if (r.rating >= 1 && r.rating <= 5) d[r.rating - 1] += 1;
      sum += r.rating;
      if (r.rating <= LOW_RATING_MAX) low += 1;
      const key = r.coach_id ?? '—';
      const name = r.coaches?.name ?? '미배정';
      const c = coach.get(key) ?? { name, sum: 0, count: 0, low: 0 };
      c.sum += r.rating;
      c.count += 1;
      if (r.rating <= LOW_RATING_MAX) c.low += 1;
      coach.set(key, c);
    }
    const coachList = [...coach.values()]
      .map((c) => ({ ...c, avg: c.count ? c.sum / c.count : 0 }))
      .sort((a, b) => a.avg - b.avg);
    return {
      total: rows.length,
      avg: rows.length ? sum / rows.length : 0,
      dist: d,
      maxDist: Math.max(1, ...d),
      lowCount: low,
      byCoach: coachList,
    };
  }, [rows]);

  const lowRows = useMemo(
    () => rows.filter((r) => r.rating <= LOW_RATING_MAX).slice(0, 50),
    [rows],
  );

  const lowColumns: TableColumn<FeedbackRow>[] = [
    { key: 'rating', header: '평점', render: (r) => <span className={styles.stars}>{stars(r.rating)}</span> },
    { key: 'session', header: '수업', render: (r) => r.sessions?.title ?? '—' },
    { key: 'coach', header: '코치', render: (r) => r.coaches?.name ?? '미배정' },
    { key: 'member', header: '회원', render: (r) => r.members?.name ?? '—' },
    { key: 'comment', header: '코멘트', render: (r) => <div className={styles.comment}>{r.comment ?? '—'}</div> },
    {
      key: 'status',
      header: '응대',
      render: (r) =>
        r.admin_response ? <Badge variant="success">완료</Badge> : <Badge variant="warning">미답변</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Button variant="ghost" size="sm" onClick={() => onJumpToInbox(r.id)}>
          응대하기
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.tabPanel}>
      <div className={styles.toolbar}>
        <div className={styles.dateField}>
          <Input label="시작일" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className={styles.dateField}>
          <Input label="종료일" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className={styles.spacer} />
        <Button variant="ghost" onClick={() => feedback.refetch()}>
          새로고침
        </Button>
      </div>

      <div className={styles.summaryGrid}>
        <StatCard label="총 피드백" value={total.toLocaleString('ko-KR')} loading={feedback.loading} />
        <StatCard label="평균 평점" value={total ? avg.toFixed(2) : '—'} hint="5점 만점" loading={feedback.loading} />
        <StatCard
          label="저평점(≤2)"
          value={lowCount.toLocaleString('ko-KR')}
          hint={total ? `${Math.round((lowCount / total) * 100)}%` : undefined}
          loading={feedback.loading}
        />
      </div>

      {feedback.error ? (
        <EmptyState variant="error" title="피드백을 불러오지 못했습니다" description={feedback.error} onRetry={feedback.refetch} />
      ) : total === 0 && !feedback.loading ? (
        <EmptyState title="집계된 피드백이 없습니다" description="선택한 기간에 피드백이 없습니다." />
      ) : (
        <>
          <Card title="평점 분포">
            <div className={styles.bars}>
              {[5, 4, 3, 2, 1].map((rt) => {
                const count = dist[rt - 1];
                const pct = Math.round((count / maxDist) * 100);
                const low = rt <= LOW_RATING_MAX;
                return (
                  <div key={rt} className={styles.barRow}>
                    <span className={styles.barLabel}>
                      <span className={styles.stars}>{stars(rt)}</span>
                    </span>
                    <div className={styles.barTrack}>
                      <div
                        className={`${styles.barFill}${low ? ` ${styles.barFillLow}` : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={styles.barValue}>{count.toLocaleString('ko-KR')}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="코치별 평균 평점 (낮은 순)">
            <div className={styles.bars}>
              {byCoach.map((c, i) => {
                const pct = Math.round((c.avg / 5) * 100);
                return (
                  <div key={i} className={styles.barRow}>
                    <span className={styles.barLabel}>{c.name}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={`${styles.barFill}${c.avg <= LOW_RATING_MAX ? ` ${styles.barFillLow}` : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={styles.barValue}>
                      {c.avg.toFixed(2)} ({c.count})
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="저평점 분류 (≤2) — 클릭 시 응대 탭으로 이동">
            <Table<FeedbackRow>
              columns={lowColumns}
              rows={lowRows}
              rowKey={(r) => r.id}
              empty={{ title: '저평점 피드백이 없습니다', description: '선택한 기간에 저평점(≤2) 피드백이 없습니다.' }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
