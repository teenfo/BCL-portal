'use client';

// Race 실시간 수신 (docs/15 §3.1·§3.4) — 3경로 중 경로1(Broadcast) 소비 + 경로2(스냅샷) 복원.
//  1) mount: race_live_state SELECT(anon 허용 §6.1)로 스냅샷 즉시 반영(거리 점프 복원 3-4)
//  2) Broadcast race:{event_id} 구독 → erg_update를 ref Map에 축적(rAF 애니메이터가 소비)
//  3) Broadcast 장애 시 /api/race/live 0.3s 폴링 폴백(옵션 — 서비스 URL 있을 때만)
// 가상 레인(virtual_lane)은 렌더 전용 — meta에 플래그 보관, 순위/집계에서 제외(§4b.5).
import { useEffect, useRef, useState } from 'react';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { DeviceType } from '@/features/race-admin/types';
import { raceChannelName, type ErgUpdate, type LaneAssign } from './contract';
import { planSerialPromotion } from './serial-promotion';

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
  /** 레인별 기기 타입 — R-11 캐릭터 테마 구동(fn_get_race_lanes anon). null=트랙 테마 폴백 */
  device_type: DeviceType | null;
}

/** fn_get_race_lanes(p_event_id) anon 응답 — 레인별 이름+device_type(Display-Safe) */
interface RaceLaneRow {
  lane_number: number;
  member_name: string | null;
  device_type: DeviceType | null;
  connection_status: string;
  distance_m: number;
  power_w: number;
  stroke_rate_spm: number;
}
interface RaceLanesData {
  event_id: string;
  lanes: RaceLaneRow[];
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
  // lane_number → {이름, 기기타입} — fn_get_race_lanes(anon) 병합 소스(R-11 레인 캐릭터)
  const laneMetaByNumberRef = useRef<Map<number, { member_name: string | null; device_type: DeviceType | null }>>(
    new Map(),
  );

  function upsertSample(u: ErgUpdate) {
    const serial = u.device_serial;
    // [serial 승격] 스냅샷 dev:{device_id}·lane_assign device_id 대체 키를 브릿지 실시리얼로
    //   치환(감사 P1 — 중도 접속 화면 동결). 매핑이 이미 실시리얼이면 no-op(기기당 1회).
    const promo = planSerialPromotion(u.device_id, serial, serialByDeviceRef.current.get(u.device_id ?? ''));
    if (promo && u.device_id) {
      serialByDeviceRef.current.set(u.device_id, serial);
      promo.staleKeys.forEach((k) => samplesRef.current.delete(k));
      setLanes((prevLanes) =>
        prevLanes.some((l) => promo.staleKeys.includes(l.serial))
          ? prevLanes.map((l) => (promo.staleKeys.includes(l.serial) ? { ...l, serial } : l))
          : prevLanes,
      );
    }
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

  // ── 0) 이벤트 전환 정리 — 같은 마운트에서 ?event=A→B 이동 시 이전 이벤트의 샘플/매핑 잔존이
  //   고스트 레인·고스트 순위를 만드는 결함 방지(감사 반영). setState는 effect 본문 금지 규약에
  //   따라 ref만 즉시 비우고, 표시 상태는 후속 스냅샷/브로드캐스트가 재구성한다.
  useEffect(() => {
    const samples = samplesRef.current;
    const serialByDevice = serialByDeviceRef.current;
    const laneMetaByNumber = laneMetaByNumberRef.current;
    return () => {
      samples.clear();
      serialByDevice.clear();
      laneMetaByNumber.clear();
    };
  }, [eventId]);

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
        // 스냅샷엔 serial 부재 → device_id 대체 키(M-2). 단 브로드캐스트가 먼저 도착해 이미
        //   실시리얼로 승격된 기기는 매핑을 따른다 — 늦은 스냅샷이 dev: 고스트 키를 재생성해
        //   화면을 DB 시점 값으로 되돌리는 것을 방지(감사 P1).
        const serial = serialByDeviceRef.current.get(row.device_id) ?? `dev:${row.device_id}`;
        serialByDeviceRef.current.set(row.device_id, serial);
        if (!samplesRef.current.has(serial)) {
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
        }
        const laneMeta = laneMetaByNumberRef.current.get(row.lane_number);
        nextLanes.push({
          lane: row.lane_number,
          serial,
          device_id: row.device_id,
          member_id: row.member_id,
          // 이름: fn_get_race_lanes(anon) 병합 → 없으면 lane_assign broadcast 수신 시 채움
          member_name: laneMeta?.member_name ?? null,
          team_id: row.team_id,
          virtual: false,
          device_type: laneMeta?.device_type ?? null,
        });
      }
      nextLanes.sort((a, b) => a.lane - b.lane);
      setLanes(nextLanes);
      // 스냅샷에 이미 전진 기록이 있으면 진행 중 레이스 — 대기실 오버레이 대신 racing 복원
      if (res.data.some((r) => (Number(r.distance_m) || 0) > 0)) {
        setLobbyStatus((s) => (s === 'lobby' ? 'racing' : s));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // ── 1b) 레인 메타 병합(anon RPC) ──
  //   fn_get_race_lanes: 레인별 실명 + device_type(pm5_devices anon 갭 해소). 저빈도 폴링.
  //   실패 시 직전 lanes 유지(graceful degradation) — device_type 없으면 트랙 테마 폴백.
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    const load = async () => {
      const res = await rpc<RaceLanesData>(getSupabaseBrowserClient(), 'fn_get_race_lanes', {
        p_event_id: eventId,
      });
      if (cancelled || !res.success || !res.data) return; // 실패=직전 유지
      const byNum = laneMetaByNumberRef.current;
      for (const row of res.data.lanes) {
        byNum.set(row.lane_number, { member_name: row.member_name, device_type: row.device_type });
      }
      setLanes((prev) =>
        prev.map((l) => {
          const meta = byNum.get(l.lane);
          if (!meta) return l;
          return {
            ...l,
            // lane_assign broadcast(실시간)이 이미 채운 이름 우선, 없으면 RPC 실명
            member_name: l.member_name ?? meta.member_name,
            device_type: meta.device_type ?? l.device_type,
          };
        }),
      );
    };
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [eventId]);

  // ── 2) Broadcast 구독(경로1) ──
  useEffect(() => {
    if (!eventId) return;
    const client = getSupabaseBrowserClient();
    const channel = client.channel(raceChannelName(eventId));

    // race_start는 1회성 방송 — 이미 시작된 레이스에 늦게 접속하면 놓친다.
    //   실제 전진(거리>0) 프레임이 오면 lobby→racing 으로 전이해 "참가자 대기중" 오버레이를 해제한다
    //   (거리 0 유휴 프레임은 무시 → GO 전 대기실 오인 방지). 시뮬·실기기 공통 복원력.
    //   startedAt도 미수신이면 최초 전진 감지 시각으로 근사(타이머/페이스 0:00 고착 방지).
    const markRacingIfMoving = (moving: boolean) => {
      if (moving) {
        setLobbyStatus((s) => (s === 'lobby' ? 'racing' : s));
        setStartedAt((t) => t ?? Date.now());
      }
    };

    channel
      .on('broadcast', { event: 'erg_update' }, (m) => {
        const u = m.payload as ErgUpdate;
        upsertSample(u);
        markRacingIfMoving((u.d ?? 0) > 0);
      })
      .on('broadcast', { event: 'state_snapshot' }, (m) => {
        const arr = (m.payload as { lanes?: ErgUpdate[] })?.lanes;
        if (Array.isArray(arr)) {
          arr.forEach(upsertSample);
          markRacingIfMoving(arr.some((u) => (u.d ?? 0) > 0));
        }
      })
      .on('broadcast', { event: 'lane_assign' }, (m) => {
        const a = m.payload as LaneAssign;
        setLanes((prev) => {
          const exists = prev.some((l) => l.lane === a.lane);
          if (exists) {
            return prev.map((l) =>
              l.lane === a.lane
                ? { ...l, member_id: a.member_id ?? l.member_id, member_name: a.member_name ?? l.member_name, team_id: a.team_id ?? l.team_id }
                : l,
            );
          }
          // 스냅샷(race_live_state)에 없는 레인 — Broadcast만으로 편성.
          //   실기기 없이 시뮬레이션하거나, 스냅샷 장애 시에도 화면이 레인을 그리게 한다.
          //   serial 은 erg_update.device_serial 과 일치해야 애니메이터가 카트를 매칭한다
          //   → 승격 매핑(실시리얼) > device_id > `lane:{n}` (시뮬레이터가 동일 규칙으로 프레임 발행).
          const serial =
            (a.device_id ? serialByDeviceRef.current.get(a.device_id) : undefined) ??
            a.device_id ??
            `lane:${a.lane}`;
          const meta = laneMetaByNumberRef.current.get(a.lane);
          const added: LaneMeta = {
            lane: a.lane,
            serial,
            device_id: a.device_id ?? null,
            member_id: a.member_id ?? null,
            member_name: a.member_name ?? meta?.member_name ?? null,
            team_id: a.team_id ?? null,
            virtual: false,
            device_type: meta?.device_type ?? null,
          };
          return [...prev, added].sort((x, y) => x.lane - y.lane);
        });
      })
      .on('broadcast', { event: 'race_countdown' }, () => {
        // 브릿지 control('countdown') — 신호등 3·2·1 + 승선 연출 진입(데모와 동등).
        //   이미 racing/finished면 스테일 방송으로 무시(재접속 시 과거 상태 역행 방지)
        setLobbyStatus((s) => (s === 'racing' || s === 'finished' ? s : 'countdown'));
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

  // ── 2b) 샘플 기반 레인 생성 폴백 ──
  //   스냅샷이 비어 있고 lane_assign 방송을 놓친 경우(예: 배정 후 디스플레이 접속·시뮬레이션)에도
  //   erg_update 샘플이 흐르면 레인을 만들어 HUD/캐릭터가 반드시 그려지게 한다.
  //   이름/기기타입은 fn_get_race_lanes(1b)·lane_assign 수신 시 병합. 저빈도(1s) 폴링, 변경시에만 setState.
  useEffect(() => {
    if (!eventId) return;
    const id = setInterval(() => {
      const samples = samplesRef.current;
      if (samples.size === 0) return;
      setLanes((prev) => {
        const knownSerial = new Set(prev.map((l) => l.serial));
        const knownLane = new Set(prev.map((l) => l.lane));
        const missing: LaneMeta[] = [];
        for (const s of samples.values()) {
          if (s.virtual) continue; // 가상 페이서는 렌더 전용 — 레인 편성 제외(§4b.5)
          if (knownSerial.has(s.serial)) continue;
          if (s.lane >= 1 && knownLane.has(s.lane)) continue; // 스냅샷 dev: 키와 중복 방지
          const meta = laneMetaByNumberRef.current.get(s.lane);
          missing.push({
            lane: s.lane,
            serial: s.serial,
            device_id: null,
            member_id: null,
            member_name: meta?.member_name ?? null,
            team_id: null,
            virtual: false,
            device_type: meta?.device_type ?? null,
          });
        }
        if (missing.length === 0) return prev;
        return [...prev, ...missing].sort((a, b) => a.lane - b.lane);
      });
    }, 1000);
    return () => clearInterval(id);
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
