'use client';

// 탭2 schedule (/apps/schedule) — docs/03 §3.2
// [수업 목록 | 내 예약] 통합. 주간 캘린더 + 세션 목록 → 상세 시트(예약/대기/취소).
// 세션별 잔여/예약/대기 카운트 + 본인 예약상태는 fn_get_member_schedule(DEFINER) 경유
// (member RLS는 타 회원 bookings 집계 불가 → RPC로 Display-Safe 카운트만 수신).
import { useMemo, useState } from 'react';
import { Tabs, Card, Badge, Button, EmptyState, Skeleton, ConfirmModal, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useMemberId, formatDate, formatTime } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import styles from './schedule.module.css';
import { SessionSheet } from './SessionSheet';
import { BOOKING_ERROR_KO, type SessionItem, type MyBookingItem } from './types';

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function mondayOf(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  const day = (c.getDay() + 6) % 7; // 월=0
  c.setDate(c.getDate() - day);
  return c;
}
const DOW = ['월', '화', '수', '목', '금', '토', '일'];

interface WeekData {
  sessions: SessionItem[];
}

async function loadWeek(from: string, to: string): Promise<Envelope<WeekData>> {
  // fn_get_member_schedule: 기간 세션 + 정원/예약/대기 카운트 + 본인 예약상태(current_member_id 스코프)
  const res = await rpc<SessionItem[]>(getSupabaseBrowserClient(), 'fn_get_member_schedule', {
    p_from: from,
    p_to: to,
  });
  if (!res.success) {
    return { success: false, data: null, error: res.error };
  }
  return { success: true, data: { sessions: res.data ?? [] }, error: null };
}

async function loadMyBookings(memberId: string): Promise<Envelope<MyBookingItem[]>> {
  return query<MyBookingItem[]>(getSupabaseBrowserClient(), 'bookings', (q) =>
    q
      .select('id, session_id, status, attendance_outcome, sessions!inner(title, session_date, start_time, end_time)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(60),
  );
}

export function ScheduleScreen() {
  const memberId = useMemberId();
  const toast = useToast();
  const [tab, setTab] = useState('list');
  const [weekBase, setWeekBase] = useState(() => mondayOf(new Date()));
  const [selected, setSelected] = useState<SessionItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MyBookingItem | null>(null);

  const monday = weekBase;
  const sunday = useMemo(() => {
    const s = new Date(monday);
    s.setDate(s.getDate() + 6);
    return s;
  }, [monday]);

  const week = useQuery<WeekData>(
    () =>
      memberId
        ? loadWeek(isoOf(monday), isoOf(sunday))
        : Promise.resolve<Envelope<WeekData>>({ success: false, data: null, error: '회원 정보가 없습니다.' }),
    [memberId, isoOf(monday), isoOf(sunday)],
  );

  const mine = useQuery<MyBookingItem[]>(
    () =>
      memberId
        ? loadMyBookings(memberId)
        : Promise.resolve<Envelope<MyBookingItem[]>>({ success: false, data: null, error: '회원 정보가 없습니다.' }),
    [memberId],
  );

  // 세션→본인 활성 예약 매핑 — 상세 시트 취소에 필요한 booking id 확보(내 예약 RLS 가시)
  const bookingBySession = useMemo(() => {
    const m = new Map<string, MyBookingItem>();
    (mine.data ?? []).forEach((b) => {
      if (b.status !== 'cancelled') m.set(b.session_id, b);
    });
    return m;
  }, [mine.data]);

  const byDay = useMemo(() => {
    const groups = new Map<string, SessionItem[]>();
    (week.data?.sessions ?? []).forEach((s) => {
      const arr = groups.get(s.session_date) ?? [];
      arr.push(s);
      groups.set(s.session_date, arr);
    });
    return groups;
  }, [week.data]);

  const refetchAll = () => {
    week.refetch();
    mine.refetch();
  };

  const shiftWeek = (delta: number) => {
    const n = new Date(monday);
    n.setDate(n.getDate() + delta * 7);
    setWeekBase(n);
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    const res = await rpc<{ late_cancel: boolean; credit_refunded: boolean }>(
      getSupabaseBrowserClient(),
      'fn_cancel_booking_with_credit',
      { p_booking_id: cancelTarget.id, p_reason: null },
    );
    setCancelTarget(null);
    if (!res.success) {
      toast.error(BOOKING_ERROR_KO[res.error ?? ''] ?? res.error ?? '취소에 실패했습니다.');
      return;
    }
    if (res.data?.late_cancel && !res.data.credit_refunded) toast.warning('취소 마감 이후 취소로 크레딧이 복구되지 않았습니다.');
    else toast.success('예약이 취소되었습니다.');
    refetchAll();
  };

  const upcoming = (b: MyBookingItem) => {
    const d = b.sessions?.session_date;
    return d ? d >= isoOf(new Date()) : false;
  };

  return (
    <div className={screen.page}>
      <header className={screen.pageHeader}>
        <h1 className={screen.pageTitle}>수업</h1>
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        variant="segmented"
        syncUrl={false}
        tabs={[
          { key: 'list', label: '수업 목록' },
          { key: 'mine', label: '내 예약' },
        ]}
        aria-label="수업 탭"
      />

      {tab === 'list' ? (
        <>
          <div className={styles.weekBar}>
            <button type="button" className={styles.weekNav} onClick={() => shiftWeek(-1)} aria-label="이전 주">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className={styles.weekLabel}>
              {monday.getMonth() + 1}.{monday.getDate()} – {sunday.getMonth() + 1}.{sunday.getDate()}
            </span>
            <button type="button" className={styles.weekNav} onClick={() => shiftWeek(1)} aria-label="다음 주">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          {week.error ? (
            <Card><EmptyState variant="error" title="수업을 불러오지 못했습니다" description={week.error} onRetry={week.refetch} /></Card>
          ) : week.loading && !week.data ? (
            <><Skeleton variant="rect" height={64} /><Skeleton variant="rect" height={64} /><Skeleton variant="rect" height={64} /></>
          ) : (week.data?.sessions.length ?? 0) === 0 ? (
            <Card><EmptyState title="이번 주 수업이 없습니다" description="다른 주를 확인해보세요." /></Card>
          ) : (
            Array.from({ length: 7 }).map((_, i) => {
              const day = new Date(monday);
              day.setDate(day.getDate() + i);
              const iso = isoOf(day);
              const list = byDay.get(iso) ?? [];
              if (list.length === 0) return null;
              return (
                <div key={iso} className={styles.dayGroup}>
                  <p className={styles.dayHead}>{DOW[i]} · {day.getMonth() + 1}.{day.getDate()}</p>
                  {list.map((s) => {
                    const coach = (s.coach_names ?? [])[0];
                    const full = s.remaining <= 0;
                    return (
                      <button key={s.id} type="button" className={styles.sessionRow} onClick={() => setSelected(s)}>
                        <span className={styles.sessionTime}>{formatTime(s.start_time)}</span>
                        <span className={styles.sessionMain}>
                          <span className={styles.sessionTitle}>{s.title}</span>
                          <span className={styles.sessionMeta}>
                            {coach ? `${coach} · ` : ''}
                            {full
                              ? `정원 마감${s.waitlist_count > 0 ? ` · 대기 ${s.waitlist_count}명` : ''}`
                              : `잔여 ${s.remaining}/${s.capacity}명`}
                          </span>
                        </span>
                        {s.my_booking_status ? (
                          <Badge variant={s.my_booking_status === 'confirmed' ? 'success' : 'warning'} size="sm">
                            {s.my_booking_status === 'confirmed' ? '예약' : '대기'}
                          </Badge>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </>
      ) : (
        <>
          {mine.error ? (
            <Card><EmptyState variant="error" title="예약을 불러오지 못했습니다" description={mine.error} onRetry={mine.refetch} /></Card>
          ) : mine.loading && !mine.data ? (
            <><Skeleton variant="rect" height={72} /><Skeleton variant="rect" height={72} /></>
          ) : (mine.data?.length ?? 0) === 0 ? (
            <Card><EmptyState title="예약 내역이 없습니다" description="수업 목록에서 원하는 수업을 예약해보세요." /></Card>
          ) : (
            <div className={screen.list}>
              {(mine.data ?? []).map((b) => (
                <Card key={b.id}>
                  <div className={screen.rowBetween}>
                    <div>
                      <p className={screen.strong}>{b.sessions?.title ?? '수업'}</p>
                      <p className={screen.muted}>
                        {formatDate(b.sessions?.session_date)} · {formatTime(b.sessions?.start_time)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        b.status === 'confirmed' ? 'success' : b.status === 'waitlisted' ? 'warning' : 'neutral'
                      }
                    >
                      {b.status === 'confirmed' ? '확정' : b.status === 'waitlisted' ? '대기' : '취소'}
                    </Badge>
                  </div>
                  {upcoming(b) && b.status !== 'cancelled' ? (
                    <div className={styles.sheetSection}>
                      <Button variant="ghost" size="sm" onClick={() => setCancelTarget(b)}>
                        예약 취소
                      </Button>
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {selected ? (
        <SessionSheet
          session={selected}
          myBookingId={bookingBySession.get(selected.id)?.id ?? null}
          myBookingStatus={selected.my_booking_status ?? bookingBySession.get(selected.id)?.status ?? null}
          onClose={() => setSelected(null)}
          onChanged={refetchAll}
        />
      ) : null}

      <ConfirmModal
        open={!!cancelTarget}
        title="예약을 취소할까요?"
        message="취소 마감 이후에는 크레딧이 복구되지 않을 수 있습니다."
        confirmLabel="예약 취소"
        variant="danger"
        onConfirm={doCancel}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}
