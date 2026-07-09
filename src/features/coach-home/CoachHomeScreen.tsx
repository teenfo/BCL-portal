'use client';

// Home — /coach/dashboard (docs/04 §3.1)
// "오늘 무엇이 위험한가"를 30초 안에 파악하는 브리핑. 운영 위험 요약 + 오늘 세션 +
// 후속조치 인박스 + KPI 스냅샷 + 다음 세션 CTA.
// 데이터: fn_get_my_coach_dashboard + fn_get_my_followups('open') + fn_get_coach_monthly_report(['kpis'])
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, StatCard, Badge, Button, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { hhmm, followupTypeLabel, flagTypeLabel } from '@/features/coach-home/format';
import styles from './coach-home.module.css';

interface TodaySession {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  has_wod: boolean;
  booked_count: number;
  checkin_count: number;
  waitlist_count: number;
  unchecked_count: number;
}

interface DashboardData {
  today_sessions: TodaySession[];
  today_total_bookings: number;
  today_total_checkins: number;
  week_sessions: number;
  open_followups: number;
  risk_summary: {
    waitlist: number;
    unchecked_confirmed: number;
    starting_soon: number;
  };
}

interface Followup {
  id: string;
  member_id: string;
  member_name: string;
  session_id: string | null;
  followup_type: string;
  priority: 'low' | 'normal' | 'high';
  due_date: string | null;
  note: string | null;
  is_overdue: boolean;
}

interface Kpis {
  total_sessions: number;
  attendance_rate: number;
  no_show_rate: number;
  checkin_count: number;
  payable_session_count: number;
}

interface MemberAlerts {
  flags: { member_id: string; member_name: string; flag_type: string; severity: string }[];
  expiring: { member_id: string; member_name: string; end_date: string | null; remaining_credits: number | null }[];
  absent: { member_id: string; member_name: string; last_checkin: string | null }[];
  total: number;
}

const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('ko-KR');

export function CoachHomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const supabase = getSupabaseBrowserClient();

  const dash = useQuery<DashboardData>(
    () => rpc<DashboardData>(supabase, 'fn_get_my_coach_dashboard'),
    [],
  );
  const followups = useQuery<Followup[]>(
    () => rpc<Followup[]>(supabase, 'fn_get_my_followups', { p_status: 'open' }),
    [],
  );
  const kpi = useQuery<{ kpis: Kpis }>(
    () =>
      rpc<{ kpis: Kpis }>(supabase, 'fn_get_coach_monthly_report', {
        p_sections: ['kpis'],
      }),
    [],
  );
  const alerts = useQuery<MemberAlerts>(
    () => rpc<MemberAlerts>(supabase, 'fn_get_coach_member_alerts'),
    [],
  );

  const [busyFollowup, setBusyFollowup] = useState<string | null>(null);
  const [showAllFollowups, setShowAllFollowups] = useState(false);

  const d = dash.data;
  const risk = d?.risk_summary;

  const openBoard = (sessionId: string) =>
    router.push(`/coach/schedule?session_id=${sessionId}`);

  // 다음 세션 CTA — 진행 중/임박 세션이 없으면 가장 가까운 세션
  const nextSession = useMemo(() => {
    if (!d?.today_sessions?.length) return null;
    const notDone = d.today_sessions.filter((s) => s.status !== 'completed' && s.status !== 'cancelled');
    return (notDone[0] ?? d.today_sessions[0]) ?? null;
  }, [d]);

  const sortedFollowups = useMemo(() => {
    const list = followups.data ?? [];
    return [...list].sort((a, b) => Number(b.is_overdue) - Number(a.is_overdue));
  }, [followups.data]);

  const visibleFollowups = showAllFollowups ? sortedFollowups : sortedFollowups.slice(0, 3);

  const resolveFollowup = async (id: string, status: 'completed' | 'dismissed') => {
    setBusyFollowup(id);
    const res = await rpc(supabase, 'fn_complete_followup', {
      p_followup_id: id,
      p_status: status,
    });
    setBusyFollowup(null);
    if (!res.success) {
      toast.error(res.error ?? '처리에 실패했습니다.');
      return;
    }
    toast.success(status === 'completed' ? '완료 처리했습니다.' : '해제했습니다.');
    followups.refetch();
    dash.refetch();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>오늘의 브리핑</h1>
        <p className={styles.subtitle}>이번 주 {num(d?.week_sessions)}개 수업 · 오늘 체크인 {num(d?.today_total_checkins)}/{num(d?.today_total_bookings)}</p>
      </header>

      {dash.error ? (
        <Card>
          <EmptyState
            variant="error"
            title="대시보드를 불러오지 못했습니다"
            description={dash.error}
            onRetry={dash.refetch}
          />
        </Card>
      ) : null}

      {/* 1. 운영 위험 요약 */}
      {!dash.error ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>운영 위험 요약</h2>
          <div className={styles.statRow}>
            <StatCard label="60분 내 시작" value={num(risk?.starting_soon)} loading={dash.loading} />
            <StatCard label="진행 중 미체크인" value={num(risk?.unchecked_confirmed)} loading={dash.loading} />
            <StatCard label="대기열 합계" value={num(risk?.waitlist)} loading={dash.loading} />
          </div>
        </section>
      ) : null}

      {/* 2. 오늘의 수업 리스트 */}
      {!dash.error ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>오늘의 수업</h2>
          {dash.loading ? (
            <Skeleton variant="rect" height={72} />
          ) : !d?.today_sessions?.length ? (
            <Card>
              <EmptyState
                title="오늘 배정 수업 없음"
                description="배정된 수업이 없습니다. 주간 일정을 확인해보세요."
                action={{ label: '주간 일정 보기', onClick: () => router.push('/coach/schedule') }}
              />
            </Card>
          ) : (
            <div className={styles.sessionList}>
              {d.today_sessions.map((s) => (
                <button key={s.id} type="button" className={styles.sessionCard} onClick={() => openBoard(s.id)}>
                  <div className={styles.sessionTime}>
                    <span className={styles.sessionHour}>{hhmm(s.start_time)}</span>
                    <span className={styles.sessionDash}>–{hhmm(s.end_time)}</span>
                  </div>
                  <div className={styles.sessionMain}>
                    <div className={styles.sessionTitleRow}>
                      <span className={styles.sessionName}>{s.title}</span>
                      {s.status === 'in_progress' ? <Badge variant="success">진행 중</Badge> : null}
                      {s.has_wod ? <Badge variant="info" size="sm">WOD</Badge> : null}
                    </div>
                    <div className={styles.sessionMeta}>
                      체크인 {num(s.checkin_count)}/{num(s.booked_count)}
                      {s.waitlist_count > 0 ? ` · 대기 ${num(s.waitlist_count)}` : ''}
                      {s.unchecked_count > 0 ? ` · 미체크인 ${num(s.unchecked_count)}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* 3. 회원 경고 — 담당 회원 flags/만료임박/장기미출석 집계 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          회원 경고{alerts.data && alerts.data.total > 0 ? ` (${alerts.data.total})` : ''}
        </h2>
        {alerts.error ? (
          <Card>
            <EmptyState variant="error" title="경고 집계를 불러오지 못했습니다" description={alerts.error} onRetry={alerts.refetch} />
          </Card>
        ) : alerts.loading ? (
          <Skeleton variant="rect" height={64} />
        ) : !alerts.data || alerts.data.total === 0 ? (
          <Card>
            <EmptyState title="주의 필요 회원 없음" description="담당 회원 중 주의가 필요한 회원이 없습니다." />
          </Card>
        ) : (
          <div className={styles.alertList}>
            {alerts.data.flags.map((a, i) => (
              <button
                key={`flag-${a.member_id}-${i}`}
                type="button"
                className={styles.alertRow}
                onClick={() => router.push(`/coach/members?member_id=${a.member_id}`)}
              >
                <span className={styles.alertName}>{a.member_name}</span>
                <Badge variant={a.severity === 'critical' ? 'danger' : 'warning'} size="sm">
                  {flagTypeLabel(a.flag_type)}
                </Badge>
              </button>
            ))}
            {alerts.data.expiring.map((a, i) => (
              <button
                key={`exp-${a.member_id}-${i}`}
                type="button"
                className={styles.alertRow}
                onClick={() => router.push(`/coach/members?member_id=${a.member_id}`)}
              >
                <span className={styles.alertName}>{a.member_name}</span>
                <Badge variant="warning" size="sm">
                  {a.remaining_credits != null ? `잔여 ${a.remaining_credits}회` : a.end_date ? `만료 ${a.end_date.slice(0, 10)}` : '만기 임박'}
                </Badge>
              </button>
            ))}
            {alerts.data.absent.map((a, i) => (
              <button
                key={`abs-${a.member_id}-${i}`}
                type="button"
                className={styles.alertRow}
                onClick={() => router.push(`/coach/members?member_id=${a.member_id}`)}
              >
                <span className={styles.alertName}>{a.member_name}</span>
                <Badge variant="neutral" size="sm">
                  {a.last_checkin ? `${a.last_checkin.slice(0, 10)} 이후 미출석` : '장기 미출석'}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 4. 미완료 후속조치 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>미완료 후속조치</h2>
        {followups.error ? (
          <Card>
            <EmptyState variant="error" title="후속조치를 불러오지 못했습니다" description={followups.error} onRetry={followups.refetch} />
          </Card>
        ) : followups.loading ? (
          <Skeleton variant="rect" height={64} />
        ) : sortedFollowups.length === 0 ? (
          <Card>
            <EmptyState title="미완료 후속조치 없음" description="모든 후속조치를 처리했습니다." />
          </Card>
        ) : (
          <div className={styles.followupList}>
            {visibleFollowups.map((f) => (
              <Card key={f.id} variant={f.is_overdue ? 'accent' : 'default'}>
                <div className={styles.followupRow}>
                  <div className={styles.followupBody}>
                    <div className={styles.followupTop}>
                      <span className={styles.followupMember}>{f.member_name}</span>
                      <Badge variant={f.priority === 'high' ? 'danger' : f.priority === 'normal' ? 'warning' : 'neutral'} size="sm">
                        {followupTypeLabel(f.followup_type)}
                      </Badge>
                      {f.is_overdue ? <Badge variant="danger" size="sm">기한 초과</Badge> : null}
                    </div>
                    {f.note ? <p className={styles.followupNote}>{f.note}</p> : null}
                    {f.due_date ? <span className={styles.followupDue}>기한 {f.due_date}</span> : null}
                  </div>
                  <div className={styles.followupActions}>
                    <Button variant="soft" size="sm" loading={busyFollowup === f.id} onClick={() => resolveFollowup(f.id, 'completed')}>
                      완료
                    </Button>
                    <Button variant="ghost" size="sm" disabled={busyFollowup === f.id} onClick={() => resolveFollowup(f.id, 'dismissed')}>
                      해제
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {sortedFollowups.length > 3 ? (
              <Button variant="ghost" size="sm" block onClick={() => setShowAllFollowups((v) => !v)}>
                {showAllFollowups ? '접기' : `${sortedFollowups.length - 3}건 더 보기`}
              </Button>
            ) : null}
          </div>
        )}
      </section>

      {/* 5. KPI 스냅샷 (이달) */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>이달 KPI</h2>
        {kpi.error ? (
          <Card>
            <EmptyState variant="error" title="KPI를 불러오지 못했습니다" description={kpi.error} onRetry={kpi.refetch} />
          </Card>
        ) : (
          <div className={styles.statRow}>
            <StatCard label="진행 수업" value={num(kpi.data?.kpis?.total_sessions)} loading={kpi.loading} />
            <StatCard label="출석률" value={`${kpi.data?.kpis?.attendance_rate ?? 0}%`} loading={kpi.loading} />
            <StatCard label="노쇼율" value={`${kpi.data?.kpis?.no_show_rate ?? 0}%`} loading={kpi.loading} invert />
          </div>
        )}
      </section>

      {/* 6. 다음 세션 CTA */}
      {nextSession ? (
        <div className={styles.ctaBar}>
          <Button variant="primary" block onClick={() => openBoard(nextSession.id)}>
            {nextSession.status === 'in_progress' ? '진행 중 세션 보드 열기' : `다음 세션 · ${hhmm(nextSession.start_time)} ${nextSession.title}`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
