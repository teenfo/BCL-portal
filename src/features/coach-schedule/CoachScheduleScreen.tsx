'use client';

// Schedule — /coach/schedule (docs/04 §3.2, 중앙 강조 탭)
// 일간/주간 일정 뷰 + 세션 카드. 세션 탭 → ?session_id= 딥링크로 세션 운영 보드 전면 전환.
// 진행 중/임박 세션이 있으면 자동으로 보드 오픈(중앙 탭 "1탭 직행" CTA 계약).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, Card, Badge, Button, EmptyState, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { hhmm } from '@/features/coach-home/format';
import { SessionBoard } from './SessionBoard';
import { today, addDays, weekStart, labelDate, shortDate } from './date-utils';
import type { ScheduleSession } from './types';
import styles from './coach-schedule.module.css';

const VIEW_TABS = [
  { key: 'day', label: '일간' },
  { key: 'week', label: '주간' },
];

export function CoachScheduleScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = getSupabaseBrowserClient();

  const selectedSession = params.get('session_id');
  const [view, setView] = useState<'day' | 'week'>('day');
  const [anchor, setAnchor] = useState<string>(today());

  const [from, to] = useMemo(() => {
    if (view === 'day') return [anchor, anchor];
    const ws = weekStart(anchor);
    return [ws, addDays(ws, 6)];
  }, [view, anchor]);

  const schedule = useQuery<ScheduleSession[]>(
    () => rpc<ScheduleSession[]>(supabase, 'fn_get_coach_schedule', { p_from: from, p_to: to }),
    [from, to],
  );

  // 진행 중/임박 세션 자동 오픈 (당일 뷰 최초 진입 시). ref 가드 — setState 없이 네비게이션만.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current || selectedSession || view !== 'day' || anchor !== today()) return;
    const list = schedule.data;
    if (!list) return;
    const live = list.find((s) => s.status === 'in_progress');
    if (live) {
      autoOpenedRef.current = true;
      router.replace(`/coach/schedule?session_id=${live.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.data]);

  // 주간 뷰: 날짜별 그룹 (모든 훅은 조기 반환 이전에 호출)
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleSession[]>();
    for (const s of schedule.data ?? []) {
      const arr = map.get(s.session_date) ?? [];
      arr.push(s);
      map.set(s.session_date, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [schedule.data]);

  const openBoard = (id: string) => router.push(`/coach/schedule?session_id=${id}`);
  const closeBoard = () => router.push('/coach/schedule');

  if (selectedSession) {
    return <SessionBoard sessionId={selectedSession} onClose={closeBoard} />;
  }

  const step = view === 'day' ? 1 : 7;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>일정</h1>
        <Tabs syncUrl={false} tabs={VIEW_TABS} value={view} onChange={(k) => setView(k as 'day' | 'week')} variant="segmented" aria-label="일정 뷰" />
      </header>

      <div className={styles.dateNav}>
        <Button variant="ghost" size="sm" onClick={() => setAnchor(addDays(anchor, -step))} aria-label="이전">◀</Button>
        <span className={styles.dateLabel}>
          {view === 'day' ? labelDate(anchor) : `${shortDate(from)} – ${shortDate(to)}`}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setAnchor(addDays(anchor, step))} aria-label="다음">▶</Button>
        <Button variant="soft" size="sm" onClick={() => setAnchor(today())}>오늘</Button>
      </div>

      {schedule.loading ? (
        <Skeleton variant="rect" height={72} />
      ) : schedule.error ? (
        <Card>
          <EmptyState variant="error" title="일정을 불러오지 못했습니다" description={schedule.error} onRetry={schedule.refetch} />
        </Card>
      ) : (schedule.data ?? []).length === 0 ? (
        <Card>
          <EmptyState title="배정된 수업이 없습니다" description="이 기간에 배정된 세션이 없습니다." />
        </Card>
      ) : (
        <div className={styles.groups}>
          {grouped.map(([date, sessions]) => (
            <section key={date} className={styles.group}>
              {view === 'week' ? <h2 className={styles.groupDate}>{shortDate(date)}</h2> : null}
              <div className={styles.list}>
                {sessions.map((s) => (
                  <button key={s.id} type="button" className={styles.card} onClick={() => openBoard(s.id)}>
                    <div className={styles.cardTime}>
                      <span className={styles.cardHour}>{hhmm(s.start_time)}</span>
                      <span className={styles.cardEnd}>–{hhmm(s.end_time)}</span>
                    </div>
                    <div className={styles.cardMain}>
                      <div className={styles.cardTitleRow}>
                        <span className={styles.cardName}>{s.title}</span>
                        {s.status === 'in_progress' ? <Badge variant="success" size="sm">진행 중</Badge> : null}
                        {s.status === 'cancelled' ? <Badge variant="danger" size="sm">취소</Badge> : null}
                        {s.has_wod ? <Badge variant="info" size="sm">WOD</Badge> : null}
                        {s.race_linked ? <Badge variant="accent" size="sm">Race</Badge> : null}
                      </div>
                      <div className={styles.cardMeta}>
                        체크인 {s.checkin_count}/{s.booked_count}
                        {s.waitlist_count > 0 ? ` · 대기 ${s.waitlist_count}` : ''}
                        {s.no_show_count > 0 ? ` · 노쇼 ${s.no_show_count}` : ''}
                        {s.late_cancel_count > 0 ? ` · 지각취소 ${s.late_cancel_count}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
