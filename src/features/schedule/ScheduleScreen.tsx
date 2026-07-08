'use client';

// /admin/schedule — 스케줄 (세션 통합 패널) (02-admin §3.6)
// 뷰 토글 week|day(버튼 토글, Tabs 아님) + 코치 색상 필터 + 세션 생성 Modal + 세션 클릭 통합 패널.
// 진입 가드·권한 컨텍스트는 admin/layout(AuthGuard+PermissionsProvider)에서 처리.
import { useMemo, useState } from 'react';
import { Card, Button, EmptyState } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ScheduleCalendar, type DayCol, type SessionCounts } from './ScheduleCalendar';
import { SessionPanel } from './SessionPanel';
import { SessionFormModal } from './SessionFormModal';
import { type ScheduleSession, type BookingCountRow, type CoachOption } from './types';
import styles from './schedule.module.css';

type View = 'week' | 'day';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => new Date(`${s}T00:00:00`);
const todayStr = () => fmt(new Date());

function mondayOf(dateStr: string): Date {
  const d = parse(dateStr);
  const wd = (d.getDay() + 6) % 7; // 월=0
  d.setDate(d.getDate() - wd);
  return d;
}

export function ScheduleScreen() {
  const { can } = useMyPermissions();
  const canView = can('schedule', 'view');
  const canCreate = can('schedule', 'create');
  const canEdit = can('schedule', 'edit');
  const canDelete = can('schedule', 'delete');

  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState<string>(todayStr());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [coachFilter, setCoachFilter] = useState<Set<string>>(new Set());

  // 표시 범위(days) + 조회 범위(rangeStart..rangeEnd)
  const { days, rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    const today = todayStr();
    if (view === 'day') {
      const d = parse(anchor);
      const idx = (d.getDay() + 6) % 7;
      const day: DayCol = {
        date: anchor,
        label: WEEKDAYS[idx],
        dayNum: String(d.getDate()),
        isToday: anchor === today,
      };
      return { days: [day], rangeStart: anchor, rangeEnd: anchor, rangeLabel: anchor };
    }
    const mon = mondayOf(anchor);
    const list: DayCol[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const ds = fmt(d);
      list.push({ date: ds, label: WEEKDAYS[i], dayNum: String(d.getDate()), isToday: ds === today });
    }
    return {
      days: list,
      rangeStart: list[0].date,
      rangeEnd: list[6].date,
      rangeLabel: `${list[0].date} ~ ${list[6].date}`,
    };
  }, [view, anchor]);

  const sessions = useQuery<ScheduleSession[]>(
    () =>
      query<ScheduleSession[]>(getSupabaseBrowserClient(), 'sessions', (q) =>
        q
          .select(
            'id, facility_id, title, session_date, start_time, end_time, capacity, status, session_coaches(coach_id, assignment_role, display_order, coaches(name))',
          )
          .gte('session_date', rangeStart)
          .lte('session_date', rangeEnd)
          .order('session_date', { ascending: true })
          .order('start_time', { ascending: true }),
      ),
    [rangeStart, rangeEnd],
  );

  const coaches = useQuery<CoachOption[]>(
    () =>
      query<CoachOption[]>(getSupabaseBrowserClient(), 'coaches', (q) =>
        q.select('id, name, status').order('name'),
      ),
    [],
  );

  // 세션 id 목록 → 예약 수 집계 (취소 제외)
  const idsKey = useMemo(
    () => (sessions.data ?? []).map((s) => s.id).sort().join(','),
    [sessions.data],
  );
  const bookingCounts = useQuery<BookingCountRow[]>(
    () => {
      const ids = idsKey ? idsKey.split(',') : [];
      if (ids.length === 0) return Promise.resolve({ success: true, data: [], error: null });
      return query<BookingCountRow[]>(getSupabaseBrowserClient(), 'bookings', (q) =>
        q.select('session_id, status').in('session_id', ids).neq('status', 'cancelled'),
      );
    },
    [idsKey],
  );

  const counts = useMemo(() => {
    const m = new Map<string, SessionCounts>();
    for (const row of bookingCounts.data ?? []) {
      const cur = m.get(row.session_id) ?? { confirmed: 0, waitlisted: 0 };
      if (row.status === 'confirmed') cur.confirmed += 1;
      else if (row.status === 'waitlisted') cur.waitlisted += 1;
      m.set(row.session_id, cur);
    }
    return m;
  }, [bookingCounts.data]);

  // 코치 색상 클래스 (Race 팀 색 토큰 8종 순환)
  const coachColorMap = useMemo(() => {
    const m = new Map<string, string>();
    (coaches.data ?? []).forEach((c, i) => m.set(c.id, `c${(i % 8) + 1}`));
    return m;
  }, [coaches.data]);
  const coachColorClass = (coachId: string) => coachColorMap.get(coachId) ?? 'c1';

  // 코치 필터 적용 + 날짜별 그룹
  const sessionsByDate = useMemo(() => {
    const m = new Map<string, ScheduleSession[]>();
    for (const s of sessions.data ?? []) {
      if (
        coachFilter.size > 0 &&
        !s.session_coaches.some((c) => coachFilter.has(c.coach_id))
      ) {
        continue;
      }
      const arr = m.get(s.session_date) ?? [];
      arr.push(s);
      m.set(s.session_date, arr);
    }
    return m;
  }, [sessions.data, coachFilter]);

  // 열린 패널의 세션은 id로 파생(재조회 결과 자동 최신화 — 삭제 시 자동 닫힘)
  const selected = useMemo(
    () => (selectedId ? (sessions.data ?? []).find((s) => s.id === selectedId) ?? null : null),
    [selectedId, sessions.data],
  );

  const shift = (dir: number) => {
    const d = parse(anchor);
    d.setDate(d.getDate() + dir * (view === 'week' ? 7 : 1));
    setAnchor(fmt(d));
  };

  const toggleCoach = (id: string) =>
    setCoachFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const reload = () => {
    sessions.refetch();
    bookingCounts.refetch();
  };

  if (!canView) {
    return (
      <div className={styles.page}>
        <Card>
          <p>이 화면에 접근할 권한이 없습니다.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>스케줄</h1>
        {canCreate ? (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            세션 생성
          </Button>
        ) : null}
      </header>

      <div className={styles.toolbar}>
        <div className={styles.viewToggle}>
          <Button variant={view === 'week' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('week')}>
            주간
          </Button>
          <Button variant={view === 'day' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('day')}>
            일간
          </Button>
        </div>
        <div className={styles.navBtns}>
          <Button variant="ghost" size="sm" onClick={() => shift(-1)}>
            ‹
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(todayStr())}>
            오늘
          </Button>
          <Button variant="ghost" size="sm" onClick={() => shift(1)}>
            ›
          </Button>
        </div>
        <span className={styles.rangeLabel}>{rangeLabel}</span>
        <div className={styles.spacer} />
        <Button variant="ghost" size="sm" onClick={reload}>
          새로고침
        </Button>
      </div>

      {/* 코치 색상 필터 */}
      {(coaches.data?.length ?? 0) > 0 ? (
        <div className={styles.coachFilter}>
          {(coaches.data ?? []).map((c) => {
            const active = coachFilter.has(c.id);
            return (
              <Button
                key={c.id}
                variant={active ? 'soft' : 'ghost'}
                size="sm"
                onClick={() => toggleCoach(c.id)}
              >
                <span className={`${styles.coachDot} ${coachColorClass(c.id)}`} />
                {c.name}
              </Button>
            );
          })}
          {coachFilter.size > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setCoachFilter(new Set())}>
              필터 해제
            </Button>
          ) : null}
        </div>
      ) : null}

      {sessions.error ? (
        <Card>
          <EmptyState
            variant="error"
            title="세션을 불러오지 못했습니다"
            description={sessions.error}
            onRetry={sessions.refetch}
          />
        </Card>
      ) : sessions.loading ? (
        <Card>
          <p className={styles.hint}>세션을 불러오는 중…</p>
        </Card>
      ) : (
        <ScheduleCalendar
          view={view}
          days={days}
          sessionsByDate={sessionsByDate}
          counts={counts}
          coachColorClass={coachColorClass}
          onSelect={(s) => setSelectedId(s.id)}
        />
      )}

      {createOpen ? (
        <SessionFormModal
          open
          session={null}
          defaultDate={view === 'day' ? anchor : rangeStart}
          coaches={coaches.data ?? []}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            reload();
          }}
        />
      ) : null}

      {selected ? (
        <SessionPanel
          session={selected}
          coaches={coaches.data ?? []}
          canEdit={canEdit}
          canDelete={canDelete}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
        />
      ) : null}
    </div>
  );
}
