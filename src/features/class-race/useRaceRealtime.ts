'use client';

// Race 실시간 수신 (docs/15 §3.1·§3.4) — 3경로 중 경로1(Broadcast) 소비 + 경로2(스냅샷) 복원.
//  1) mount: race_live_state SELECT(anon 허용 §6.1)로 스냅샷 즉시 반영(거리 점프 복원 3-4)
//  2) Broadcast race:{event_id} 구독 → erg_update를 ref Map에 축적(rAF 애니메이터가 소비)
//  3) Broadcast 장애 시 /api/race/live 0.3s 폴링 폴백(옵션 — 서비스 URL 있을 때만)
// 가상 레인(virtual_lane)은 렌더 전용 — meta에 플래그 보관, 순위/집계에서 제외(§4b.5).
import { useEffect, useRef, useState } from 'react';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { raceChannelName, type ErgUpdate, type LaneAssign } from './contract';

export type LobbyStatus = 'setup' | 'lobby' | 'countdown' | 'racing' | 'finished';
export type ConnectionMode = 'broadcast' | 'polling';

/** 애니메이터가 읽는 원시 샘플(LERP 목표값) */
export interface RawSample {
  serial: string;
  lane: number;
  d: number;
  p: number;
  spm: number;
  hr: number | null;
  maxW: number;
  virtual: boolean;
  /** 마지막 수신 시각(ms) — 단절 판정 */
  lastAt: number;
  connection: string;
}

export interface LaneMeta {
  lane: number;
  serial: string;
  device_id: string | null;
  member_id: string | null;
  member_name: string | null;
  team_id: string | null;
  virtual: boolean;
}

interface LiveStateRow {
  device_id: string;
  lane_number: number;
  member_id: string | null;
  team_id: string | null;
  distance_m: number;
  power_w: number;
  stroke_rate_spm: number;
  hr_bpm: number | null;
  max_watts: number;
  connection_status: string;
}

export interface RaceRealtime {
  /** 애니메이터 소비용 — serial 키 원시 샘플 */
  samplesRef: React.MutableRefObject<Map<string, RawSample>>;
  /** 레인 편성 메타(저빈도, 순위 스택·HUD 라벨용) */
  lanes: LaneMeta[];
  lobbyStatus: LobbyStatus;
  mode: ConnectionMode;
  connected: boolean;
  /** race_start broadcast 수신 시각(신호등·GO 동기, 로컬 타이머 금지 3-8) */
  startedAt: number | null;
}

const RACE_SERVICE_URL =
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_RACE_SERVICE_URL ?? '' : '';

export function useRaceRealtime(eventId: string | null): RaceRealtime {
  const samplesRef = useRef<Map<string, RawSample>>(new Map());
  const [lanes, setLanes] = useState<LaneMeta[]>([]);
  const [lobbyStatus, setLobbyStatus] = useState<LobbyStatus>('lobby');
  const [mode, setMode] = useState<ConnectionMode>('broadcast');
  const [connected, setConnected] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  // serial↔lane 매핑(device_id 기준 복원, M-2)
  const serialByDeviceRef = useRef<Map<string, string>>(new Map());

  function upsertSample(u: ErgUpdate) {
    const serial = u.device_serial;
    const prev = samplesRef.current.get(serial);
    samplesRef.current.set(serial, {
      serial,
      lane: u.lane ?? prev?.lane ?? 0,
      d: u.d ?? prev?.d ?? 0,
      p: u.p ?? prev?.p ?? 0,
      spm: u.spm ?? prev?.spm ?? 0,
      hr: u.hr ?? prev?.hr ?? null,
      maxW: u.max_w ?? prev?.maxW ?? 0,
      virtual: u.virtual_lane ?? prev?.virtual ?? false,
      lastAt: Date.now(),
      connection: 'racing',
    });
  }

  // ── 1) 스냅샷 복원(경로2) ──
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    void query<LiveStateRow[]>(getSupabaseBrowserClient(), 'race_live_state', (q) =>
      q
        .select(
          'device_id,lane_number,member_id,team_id,distance_m,power_w,stroke_rate_spm,hr_bpm,max_watts,connection_status',
        )
        .eq('event_id', eventId),
    ).then((res) => {
      if (cancelled || !res.success || !res.data) return;
      const nextLanes: LaneMeta[] = [];
      for (const row of res.data) {
        const serial = `dev:${row.device_id}`; // 스냅샷엔 serial 부재 → device_id 대체 키(M-2)
        serialByDeviceRef.current.set(row.device_id, serial);
        samplesRef.current.set(serial, {
          serial,
          lane: row.lane_number,
          d: Number(row.distance_m) || 0,
          p: Number(row.power_w) || 0,
          spm: Number(row.stroke_rate_spm) || 0,
          hr: row.hr_bpm,
          maxW: Number(row.max_watts) || 0,
          virtual: false,
          lastAt: Date.now(),
          connection: row.connection_status,
        });
        nextLanes.push({
          lane: row.lane_number,
          serial,
          device_id: row.device_id,
          member_id: row.member_id,
          member_name: null, // FLAG: race_live_state에 이름 없음 — lane_assign 수신 시 채움
          team_id: row.team_id,
          virtual: false,
        });
      }
      nextLanes.sort((a, b) => a.lane - b.lane);
      setLanes(nextLanes);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // ── 2) Broadcast 구독(경로1) ──
  useEffect(() => {
    if (!eventId) return;
    const client = getSupabaseBrowserClient();
    const channel = client.channel(raceChannelName(eventId));

    channel
      .on('broadcast', { event: 'erg_update' }, (m) => upsertSample(m.payload as ErgUpdate))
      .on('broadcast', { event: 'state_snapshot' }, (m) => {
        const arr = (m.payload as { lanes?: ErgUpdate[] })?.lanes;
        if (Array.isArray(arr)) arr.forEach(upsertSample);
      })
      .on('broadcast', { event: 'lane_assign' }, (m) => {
        const a = m.payload as LaneAssign;
        setLanes((prev) => {
          const next = prev.map((l) =>
            l.lane === a.lane
              ? { ...l, member_id: a.member_id ?? l.member_id, member_name: a.member_name ?? l.member_name, team_id: a.team_id ?? l.team_id }
              : l,
          );
          return next;
        });
      })
      .on('broadcast', { event: 'race_start' }, () => {
        setLobbyStatus('racing');
        setStartedAt(Date.now());
      })
      .on('broadcast', { event: 'race_finish' }, () => setLobbyStatus('finished'))
      .on('broadcast', { event: 'race_reset' }, () => {
        setLobbyStatus('lobby');
        setStartedAt(null);
        samplesRef.current.clear();
      })
      .subscribe((s) => {
        setConnected(s === 'SUBSCRIBED');
        if (s === 'SUBSCRIBED') setMode('broadcast');
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [eventId]);

  // ── 3) 폴백 폴링(경로1 장애 시, 서비스 URL 있을 때만) ──
  useEffect(() => {
    if (!eventId || connected || !RACE_SERVICE_URL) return;
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch(`${RACE_SERVICE_URL}/api/race/live`, { cache: 'no-store' });
        const j = (await r.json()) as { data?: ErgUpdate[] };
        if (!stop && Array.isArray(j.data)) j.data.forEach(upsertSample);
      } catch {
        /* 유지 */
      }
      if (!stop) setTimeout(() => void poll(), 300);
    };
    // 마이크로태스크 이후 mode 전이 — 이펙트 동기 setState 회피
    void Promise.resolve().then(() => {
      if (stop) return;
      setMode('polling');
      void poll();
    });
    return () => {
      stop = true;
    };
  }, [eventId, connected]);

  return { samplesRef, lanes, lobbyStatus, mode, connected, startedAt };
}
