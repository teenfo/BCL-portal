'use client';

// Race 허브 — /coach/race (docs/04 §3.4)
// 3탭: Live(진행/예정) · History(완료+리더보드) · Devices(PM5 상태).
// 상세 설계(BLE·파이프라인·연출·상태머신)는 15-race-system.md 정본. 여기선 코치 UX 계약만.
//
// ⚠ FLAG(RPC 갭): 코치용 race_events 목록/종료/세션 미연동 수동 생성, pm5_devices 조회,
// 이벤트별 리더보드 RPC가 sql/09에 없음. 표준 진입은 세션 보드 → "Race 수업 시작"(원칙 ①).
// 목록은 race_events query()(RLS 전제)로, 리더보드는 fn_get_class_leaderboard(시설 단위)로 대체.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, Card, Badge, Button, EmptyState, Skeleton } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { useQuery } from '@/lib/data/useQuery';
import { rpc, query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './coach-race.module.css';

interface RaceEvent {
  id: string;
  name: string;
  event_date: string;
  race_format: string;
  status: string;
  lobby_status: string;
  session_id: string | null;
  facility_id: string | null;
}

interface LeaderRow {
  rank: number;
  member_name: string;
  total_distance_m: number | null;
  race_count: number;
  pr_count: number;
}

const TABS = [
  { key: 'live', label: 'Live' },
  { key: 'history', label: '기록' },
  { key: 'devices', label: '장비' },
];

const LOBBY_VARIANT: Record<string, 'neutral' | 'info' | 'warning' | 'success'> = {
  setup: 'neutral',
  lobby: 'info',
  countdown: 'warning',
  racing: 'success',
  finished: 'neutral',
};

export function CoachRaceHub() {
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [tab, setTab] = useState('live');

  const events = useQuery<RaceEvent[]>(
    () =>
      query<RaceEvent[]>(supabase, 'race_events', (q) =>
        q
          .select('id,name,event_date,race_format,status,lobby_status,session_id,facility_id')
          .order('event_date', { ascending: false })
          .limit(40),
      ),
    [],
  );

  const facilityId = (profile as { facility_id?: string } | null)?.facility_id ?? null;
  const leaderboard = useQuery<LeaderRow[]>(
    () =>
      facilityId
        ? rpc<LeaderRow[]>(supabase, 'fn_get_class_leaderboard', { p_facility_id: facilityId, p_scope: 'month' })
        : Promise.resolve({ success: true, data: [], error: null }),
    [facilityId, tab === 'history'],
  );

  const devices = useQuery<Record<string, unknown>[]>(
    () => query<Record<string, unknown>[]>(supabase, 'pm5_devices', (q) => q.select('*').limit(50)),
    [tab === 'devices'],
  );

  const all = events.data ?? [];
  const live = all.filter((e) => e.status !== 'completed' && e.status !== 'cancelled');
  const history = all.filter((e) => e.status === 'completed');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>레이스</h1>
      </header>

      <p className={styles.notice}>
        표준 진입은 세션 보드 → &quot;Race 수업 시작&quot;입니다. 허브는 조회·진입 전용.
      </p>

      <Tabs syncUrl={false} tabs={TABS} value={tab} onChange={setTab} variant="segmented" aria-label="레이스 탭" />

      {tab === 'live' ? (
        events.loading ? (
          <Skeleton variant="rect" height={100} />
        ) : events.error ? (
          <Card><EmptyState variant="error" title="이벤트 로드 실패" description={events.error} onRetry={events.refetch} /></Card>
        ) : live.length === 0 ? (
          <Card><EmptyState title="진행/예정 이벤트 없음" description="세션 보드에서 Race 수업을 시작하세요." /></Card>
        ) : (
          <div className={styles.list}>
            {live.map((e) => (
              <Card key={e.id}>
                <div className={styles.eventRow}>
                  <div className={styles.eventInfo}>
                    <span className={styles.eventName}>{e.name}</span>
                    <div className={styles.eventBadges}>
                      <Badge variant={LOBBY_VARIANT[e.lobby_status] ?? 'neutral'} size="sm">{e.lobby_status}</Badge>
                      <Badge variant="accent" size="sm">{e.race_format}</Badge>
                      {e.session_id ? <Badge variant="info" size="sm">세션 연동</Badge> : null}
                    </div>
                  </div>
                  <Button variant="soft" size="sm" onClick={() => router.push(`/coach/race/control?event_id=${e.id}`)}>
                    컨트롤 룸
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === 'history' ? (
        <div className={styles.list}>
          <p className={styles.notice}>이벤트별 리더보드 RPC 부재 — 시설 월간 리더보드로 대체 표시(FLAG).</p>
          {leaderboard.loading ? (
            <Skeleton variant="rect" height={120} />
          ) : leaderboard.error ? (
            <Card><EmptyState variant="error" title="리더보드 로드 실패" description={leaderboard.error} onRetry={leaderboard.refetch} /></Card>
          ) : (leaderboard.data ?? []).length === 0 ? (
            <Card><EmptyState title="기록 없음" description="완료된 레이스 기록이 없습니다." /></Card>
          ) : (
            <Card title="시설 월간 리더보드">
              {(leaderboard.data ?? []).map((r) => (
                <div key={r.rank} className={styles.leaderRow}>
                  <span className={styles.leaderRank}>{r.rank}</span>
                  <span className={styles.leaderName}>{r.member_name}</span>
                  <b>{r.total_distance_m ? `${Math.round(r.total_distance_m)}m` : '—'}</b>
                </div>
              ))}
            </Card>
          )}
          {history.length > 0 ? (
            <Card title="완료 이벤트">
              {history.map((e) => (
                <div key={e.id} className={styles.leaderRow}>
                  <span className={styles.leaderName}>{e.name}</span>
                  <span className={styles.muted}>{e.event_date}</span>
                </div>
              ))}
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'devices' ? (
        devices.loading ? (
          <Skeleton variant="rect" height={100} />
        ) : devices.error ? (
          <Card><EmptyState variant="error" title="장비 조회 실패" description={`${devices.error} (전용 RPC 부재 — FLAG)`} onRetry={devices.refetch} /></Card>
        ) : (devices.data ?? []).length === 0 ? (
          <Card><EmptyState title="등록된 장비 없음" description="기기 등록/삭제는 Admin 전용입니다." /></Card>
        ) : (
          <div className={styles.list}>
            <p className={styles.notice}>기기 등록/삭제는 Admin 전용. 코치는 상태 확인만.</p>
            {(devices.data ?? []).map((dev, i) => {
              const serial = (dev.serial ?? dev.serial_number ?? dev.id ?? `장비 ${i + 1}`) as string;
              const st = (dev.status ?? 'unknown') as string;
              return (
                <Card key={i}>
                  <div className={styles.eventRow}>
                    <span className={styles.eventName}>{String(serial)}</span>
                    <Badge variant={st === 'online' ? 'success' : st === 'offline' ? 'danger' : 'neutral'} size="sm">{String(st)}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}
