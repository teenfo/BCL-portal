'use client';

// Race 허브 — /coach/race (docs/04 §3.4)
// 3탭: Live(진행/예정) · History(완료+이벤트별 리더보드) · Devices(PM5 상태).
// 상세 설계(BLE·파이프라인·연출·상태머신)는 15-race-system.md 정본. 여기선 코치 UX 계약만.
//
// 목록: fn_list_coach_race_events(live/history) · 생성: fn_create_coach_race_event(세션 비연동 단독)
// 종료: fn_finish_race_event · 이벤트별 결과: fn_get_race_event_result.
// Devices 는 조회 전용 RPC 부재 → pm5_devices query(RLS 전제) 유지(등록/삭제는 Admin 전용).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, Card, Badge, Button, Input, Select, Modal, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './coach-race.module.css';

interface RaceEvent {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
  race_format: string;
  status: string;
  lobby_status: string;
  target_distance_m: number | null;
  duration_minutes: number | null;
  session_id: string | null;
  created_at: string;
  record_count: number;
}

interface EventResultRow {
  finish_rank: number | null;
  member_name: string | null;
  lane_number: number | null;
  result_distance: number | null;
  result_time_sec: number | null;
  avg_watts: number | null;
  avg_spm: number | null;
  is_pr: boolean;
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

const FORMAT_OPTS = [
  { value: 'individual', label: '개인' },
  { value: 'team', label: '팀' },
  { value: 'group', label: '그룹' },
  { value: 'relay', label: '릴레이' },
];
const TYPE_OPTS = [
  { value: 'rowing', label: '로잉' },
  { value: 'skierg', label: '스키에르그' },
  { value: 'bikeerg', label: '바이크에르그' },
];

export function CoachRaceHub() {
  const router = useRouter();
  const toast = useToast();
  const supabase = getSupabaseBrowserClient();
  const [tab, setTab] = useState('live');

  const live = useQuery<{ events: RaceEvent[] }>(
    () => rpc<{ events: RaceEvent[] }>(supabase, 'fn_list_coach_race_events', { p_scope: 'live' }),
    [],
  );
  const history = useQuery<{ events: RaceEvent[] }>(
    () => rpc<{ events: RaceEvent[] }>(supabase, 'fn_list_coach_race_events', { p_scope: 'history' }),
    [tab === 'history'],
  );
  const devices = useQuery<Record<string, unknown>[]>(
    async () => {
      const res = await rpc<{ devices: Record<string, unknown>[] }>(
        supabase,
        'fn_list_pm5_devices',
        {},
      );
      return res.success
        ? { success: true, data: res.data?.devices ?? [], error: null }
        : { success: false, data: null, error: res.error };
    },
    [tab === 'devices'],
  );

  // 이벤트별 결과(History 인라인)
  const [openResult, setOpenResult] = useState<string | null>(null);
  const result = useQuery<{ name: string; status: string; results: EventResultRow[] }>(
    () =>
      openResult
        ? rpc<{ name: string; status: string; results: EventResultRow[] }>(supabase, 'fn_get_race_event_result', { p_event_id: openResult })
        : Promise.resolve({ success: true, data: null, error: null }),
    [openResult],
  );

  // 세션 비연동 단독 Race 생성
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', race_format: 'individual', event_type: 'rowing', target_distance_m: '', duration_minutes: '' });

  const createEvent = async () => {
    if (!form.name.trim()) { toast.error('이벤트 이름을 입력하세요.'); return; }
    setBusy(true);
    const res = await rpc<{ event_id: string }>(supabase, 'fn_create_coach_race_event', {
      p_payload: {
        name: form.name.trim(),
        race_format: form.race_format,
        event_type: form.event_type,
        target_distance_m: form.target_distance_m || null,
        duration_minutes: form.duration_minutes || null,
      },
    });
    setBusy(false);
    if (!res.success) { toast.error(res.error ?? '이벤트 생성 실패'); return; }
    toast.success('레이스 이벤트를 생성했습니다.');
    setCreateOpen(false);
    setForm({ name: '', race_format: 'individual', event_type: 'rowing', target_distance_m: '', duration_minutes: '' });
    live.refetch();
    if (res.data?.event_id) router.push(`/coach/race/control?event_id=${res.data.event_id}`);
  };

  const finishEvent = async (eventId: string) => {
    const res = await rpc(supabase, 'fn_finish_race_event', { p_event_id: eventId });
    if (!res.success) { toast.error(res.error ?? '종료 처리 실패'); return; }
    toast.success('이벤트를 종료했습니다.');
    live.refetch();
    history.refetch();
  };

  const liveEvents = live.data?.events ?? [];
  const historyEvents = history.data?.events ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>레이스</h1>
        <Button variant="soft" size="sm" onClick={() => setCreateOpen(true)}>새 레이스</Button>
      </header>

      <p className={styles.notice}>
        표준 진입은 세션 보드 → &quot;Race 수업 시작&quot;입니다. 세션 비연동 단독 이벤트는 &quot;새 레이스&quot;로 생성합니다.
      </p>

      <Tabs syncUrl={false} tabs={TABS} value={tab} onChange={setTab} variant="segmented" aria-label="레이스 탭" />

      {tab === 'live' ? (
        live.loading ? (
          <Skeleton variant="rect" height={100} />
        ) : live.error ? (
          <Card><EmptyState variant="error" title="이벤트 로드 실패" description={live.error} onRetry={live.refetch} /></Card>
        ) : liveEvents.length === 0 ? (
          <Card><EmptyState title="진행/예정 이벤트 없음" description="세션 보드에서 Race 수업을 시작하거나 새 레이스를 생성하세요." /></Card>
        ) : (
          <div className={styles.list}>
            {liveEvents.map((e) => (
              <Card key={e.id}>
                <div className={styles.eventRow}>
                  <div className={styles.eventInfo}>
                    <span className={styles.eventName}>{e.name}</span>
                    <div className={styles.eventBadges}>
                      <Badge variant={LOBBY_VARIANT[e.lobby_status] ?? 'neutral'} size="sm">{e.lobby_status}</Badge>
                      <Badge variant="accent" size="sm">{e.race_format}</Badge>
                      {e.session_id ? <Badge variant="info" size="sm">세션 연동</Badge> : null}
                      {e.record_count > 0 ? <Badge variant="neutral" size="sm">{e.record_count}건</Badge> : null}
                    </div>
                  </div>
                  <div className={styles.eventActions}>
                    <Button variant="soft" size="sm" onClick={() => router.push(`/coach/race/control?event_id=${e.id}`)}>
                      컨트롤 룸
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => finishEvent(e.id)}>종료</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === 'history' ? (
        history.loading ? (
          <Skeleton variant="rect" height={120} />
        ) : history.error ? (
          <Card><EmptyState variant="error" title="기록 로드 실패" description={history.error} onRetry={history.refetch} /></Card>
        ) : historyEvents.length === 0 ? (
          <Card><EmptyState title="기록 없음" description="완료된 레이스 이벤트가 없습니다." /></Card>
        ) : (
          <div className={styles.list}>
            {historyEvents.map((e) => (
              <Card key={e.id}>
                <button
                  type="button"
                  className={styles.eventRow}
                  onClick={() => setOpenResult((cur) => (cur === e.id ? null : e.id))}
                >
                  <div className={styles.eventInfo}>
                    <span className={styles.eventName}>{e.name}</span>
                    <div className={styles.eventBadges}>
                      <Badge variant="accent" size="sm">{e.race_format}</Badge>
                      <span className={styles.muted}>{e.event_date}</span>
                    </div>
                  </div>
                  <Badge variant="neutral" size="sm">{openResult === e.id ? '접기' : '결과'}</Badge>
                </button>
                {openResult === e.id ? (
                  result.loading ? (
                    <Skeleton variant="rect" height={80} />
                  ) : result.error ? (
                    <EmptyState variant="error" title="결과 로드 실패" description={result.error} onRetry={result.refetch} />
                  ) : (result.data?.results ?? []).length === 0 ? (
                    <p className={styles.muted}>기록된 결과가 없습니다.</p>
                  ) : (
                    <div className={styles.leaderList}>
                      {(result.data?.results ?? []).map((r, i) => (
                        <div key={i} className={styles.leaderRow}>
                          <span className={styles.leaderRank}>{r.finish_rank ?? '-'}</span>
                          <span className={styles.leaderName}>{r.member_name ?? `레인 ${r.lane_number ?? '?'}`}</span>
                          <b>
                            {r.result_distance ? `${Math.round(r.result_distance)}m` : ''}
                            {r.result_time_sec ? ` · ${Math.round(r.result_time_sec)}s` : ''}
                            {r.is_pr ? ' · PR' : ''}
                          </b>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === 'devices' ? (
        devices.loading ? (
          <Skeleton variant="rect" height={100} />
        ) : devices.error ? (
          <Card><EmptyState variant="error" title="장비 조회 실패" description={devices.error} onRetry={devices.refetch} /></Card>
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="새 레이스 이벤트" size="sm">
        <div className={styles.createForm}>
          <Input label="이벤트 이름" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Select label="포맷" native value={form.race_format} onChange={(v) => setForm((f) => ({ ...f, race_format: v }))} options={FORMAT_OPTS} />
          <Select label="종목" native value={form.event_type} onChange={(v) => setForm((f) => ({ ...f, event_type: v }))} options={TYPE_OPTS} />
          <Input label="목표 거리(m, 선택)" type="number" value={form.target_distance_m} onChange={(e) => setForm((f) => ({ ...f, target_distance_m: e.target.value }))} />
          <Input label="제한 시간(분, 선택)" type="number" value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} />
          <div className={styles.createActions}>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button variant="primary" size="sm" loading={busy} onClick={createEvent}>생성</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
