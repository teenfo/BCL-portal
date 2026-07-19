'use client';

// 출석 report 탭 — 요일×시간 Heatmap + 기간 필터 + 요약 카드 (02-admin §3.3)
// 집계는 checkins 직접 조회 후 클라이언트 집계(요일/시간은 로컬 기준).
// ⏳ 범위 외: 세션유형·코치별 출석률 / 노쇼율 추이 / 노쇼 페널티 집행 현황(G-5) / CSV 내보내기.
import { useMemo, useState } from 'react';
import { Card, Input, Button, StatCard, EmptyState } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './attendance.module.css';

interface CheckinTime {
  checkin_time: string;
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 월~일
const DAY_LABEL: Record<number, string> = { 0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토' };
const HOURS = Array.from({ length: 24 }, (_, h) => h);

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

export function AttendanceReport() {
  const [from, setFrom] = useState<string>(daysAgo(29));
  const [to, setTo] = useState<string>(isoDate(new Date()));

  const startISO = `${from}T00:00:00`;
  const endISO = useMemo(() => {
    const d = new Date(`${to}T00:00:00`);
    d.setDate(d.getDate() + 1);
    return `${isoDate(d)}T00:00:00`;
  }, [to]);

  const checkins = useQuery<CheckinTime[]>(
    () =>
      query<CheckinTime[]>(getSupabaseBrowserClient(), 'checkins', (q) =>
        q
          .select('checkin_time')
          .gte('checkin_time', startISO)
          .lt('checkin_time', endISO)
          .limit(20000),
      ),
    [startISO, endISO],
  );

  const { grid, max, total, busiest } = useMemo(() => {
    const g = new Map<string, number>(); // `${day}-${hour}` → count
    let mx = 0;
    let busy: { day: number; hour: number; count: number } | null = null;
    for (const row of checkins.data ?? []) {
      const dt = new Date(row.checkin_time);
      const key = `${dt.getDay()}-${dt.getHours()}`;
      const next = (g.get(key) ?? 0) + 1;
      g.set(key, next);
      if (next > mx) mx = next;
      if (!busy || next > busy.count) busy = { day: dt.getDay(), hour: dt.getHours(), count: next };
    }
    return { grid: g, max: mx, total: checkins.data?.length ?? 0, busiest: busy };
  }, [checkins.data]);

  const rangeDays = useMemo(() => {
    const a = new Date(`${from}T00:00:00`).getTime();
    const b = new Date(`${to}T00:00:00`).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }, [from, to]);

  const avgPerDay = total > 0 ? (total / rangeDays).toFixed(1) : '0';

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
        <Button variant="ghost" onClick={() => checkins.refetch()}>
          새로고침
        </Button>
      </div>

      <div className={styles.summaryGrid}>
        <StatCard label="총 체크인" value={total.toLocaleString('ko-KR')} loading={checkins.loading} />
        <StatCard label="일 평균" value={avgPerDay} hint={`${rangeDays}일 기준`} loading={checkins.loading} />
        <StatCard
          label="최다 시간대"
          value={busiest ? `${DAY_LABEL[busiest.day]} ${busiest.hour}시` : '—'}
          hint={busiest ? `${busiest.count}건` : undefined}
          loading={checkins.loading}
        />
      </div>

      <Card title="요일 × 시간 히트맵">
        {checkins.error ? (
          <EmptyState variant="error" title="집계를 불러오지 못했습니다" description={checkins.error} onRetry={checkins.refetch} />
        ) : total === 0 && !checkins.loading ? (
          <EmptyState title="집계된 체크인이 없습니다" description="선택한 기간에 체크인 기록이 없습니다." />
        ) : (
          <>
            <div className={styles.heatScroll}>
              <div className={styles.heat}>
                {/* 헤더: 코너 + 시간 라벨 */}
                <div className={styles.heatHeadCell} />
                {HOURS.map((h) => (
                  <div key={`h-${h}`} className={styles.heatHeadCell}>
                    {h}
                  </div>
                ))}
                {/* 요일 행 */}
                {DAY_ORDER.map((day) => (
                  <Row key={`d-${day}`} day={day} grid={grid} max={max} />
                ))}
              </div>
            </div>
            <div className={styles.legend}>
              <span>적음</span>
              <span className={styles.legendSwatch} aria-hidden="true" />
              <span>많음 (최대 {max}건)</span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function Row({ day, grid, max }: { day: number; grid: Map<string, number>; max: number }) {
  return (
    <>
      <div className={styles.heatDayLabel}>{DAY_LABEL[day]}</div>
      {HOURS.map((h) => {
        const count = grid.get(`${day}-${h}`) ?? 0;
        const on = count > 0;
        const opacity = on ? 0.18 + 0.82 * (count / Math.max(1, max)) : 1;
        return (
          <div
            key={`${day}-${h}`}
            className={`${styles.heatCell}${on ? ` ${styles.heatCellOn}` : ''}`}
            style={on ? { opacity } : undefined}
            title={`${DAY_LABEL[day]} ${h}시 · ${count}건`}
          />
        );
      })}
    </>
  );
}
