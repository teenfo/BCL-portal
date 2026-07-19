'use client';

// Race 화면 시뮬레이터 — PM5/Python 브릿지 없이 Class 관전 화면을 구동한다(운영 데모·QA).
//   Broadcast 전용: race:{event_id} 채널에 브릿지와 동일한 메시지(lane_assign·race_start·
//   state_snapshot·race_finish)를 발행한다. DB 미경유 → race_records/race_live_state 미저장
//   (화면 전용, 비파괴). CLAUDE.md 데이터 규칙은 테이블 접근에 한하므로 client.channel() 허용
//   (class-broadcast/contract.ts 동일 근거).
//
// 매칭 규약(useRaceRealtime): 스냅샷 없는 이벤트는 lane_assign(device_id 없음)이 레인을 추가하며
//   serial = `lane:{n}`. erg 프레임의 device_serial 도 동일해야 애니메이터가 카트를 매칭한다.
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { raceChannelName } from '@/features/class-broadcast';
import type { ErgUpdate, LaneAssign } from '@/features/class-race';

export interface SimLane {
  lane: number;
  name: string;
  /** 기준 500m 스플릿(초). 작을수록 빠름. 페이스 = 500/split500 (m/s) */
  split500: number;
}

export interface RaceSimConfig {
  targetDistance: number; // m
  lanes: SimLane[];
  /** 프레임 간격(ms). 기본 300(≈3Hz, 브릿지와 동일) */
  tickMs?: number;
  /** 틱마다 페이스 지터 비율(0~1). 기본 0.06 */
  variance?: number;
}

export interface SimLaneState {
  lane: number;
  name: string;
  serial: string;
  distance: number;
  finished: boolean;
  spm: number;
  power: number;
}

export type SimStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface RaceSimCallbacks {
  onTick?: (lanes: SimLaneState[], elapsedMs: number) => void;
  onStatus?: (status: SimStatus) => void;
}

export interface RaceSimulator {
  start: (config: RaceSimConfig) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  close: () => void;
  status: () => SimStatus;
}

const laneSerial = (lane: number) => `lane:${lane}`;

/** Concept2 근사: watts = 2.80 / (초/미터)^3 */
function wattsForSplit(split500: number): number {
  const secPerMeter = split500 / 500;
  if (secPerMeter <= 0) return 0;
  return Math.round(2.8 / secPerMeter ** 3);
}

export function createRaceSimulator(
  eventId: string,
  cb: RaceSimCallbacks = {},
): RaceSimulator {
  const client = getSupabaseBrowserClient();
  let channel: RealtimeChannel | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let status: SimStatus = 'idle';
  let cfg: RaceSimConfig | null = null;
  let states: SimLaneState[] = [];
  let startAt = 0;
  // 직전 틱 시각 — dt는 실측 경과로 계산(백그라운드 탭 setInterval 스로틀링에도 실시간 속도 유지)
  let lastTickAt = 0;

  function setStatus(s: SimStatus) {
    status = s;
    cb.onStatus?.(s);
  }

  function send(event: string, payload: unknown) {
    if (!channel) return;
    void channel.send({ type: 'broadcast', event, payload });
  }

  function ensureChannel(onReady: () => void) {
    if (channel) {
      onReady();
      return;
    }
    channel = client.channel(raceChannelName(eventId));
    channel.subscribe((s) => {
      if (s === 'SUBSCRIBED') onReady();
    });
  }

  function clearTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function tick() {
    if (!cfg) return;
    // dt = 실측 경과(초) — 고정 tickMs 가정 금지. 백그라운드 탭에서 setInterval이 1s+로
    // 스로틀링돼도 진행 속도(=스플릿)는 실시간 유지(프레임 빈도만 감소). 복귀 점프는 10s 캡.
    const now = performance.now();
    const dt = Math.min(10, Math.max(0, (now - lastTickAt) / 1000));
    lastTickAt = now;
    const variance = cfg.variance ?? 0.06;
    const frames: ErgUpdate[] = [];
    let allDone = true;

    for (const st of states) {
      if (!st.finished) {
        // 페이스 지터: base 속도에 ±variance 무작위 변동
        const jitter = 1 + (Math.random() * 2 - 1) * variance;
        const baseSpeed = 500 / findSplit(st.lane); // m/s
        const speed = Math.max(0, baseSpeed * jitter);
        st.distance = Math.min(cfg.targetDistance, st.distance + speed * dt);
        st.spm = Math.round(24 + Math.random() * 8); // 24~32
        // 순시 스플릿(속도 기반) → 순시 watts
        const instSplit = speed > 0 ? 500 / speed : 9999;
        st.power = wattsForSplit(instSplit);
        if (st.distance >= cfg.targetDistance) st.finished = true;
      }
      if (!st.finished) allDone = false;

      frames.push({
        device_serial: st.serial,
        lane: st.lane,
        d: Math.round(st.distance),
        p: st.power,
        spm: st.spm,
        hr: null,
        max_w: st.power,
        virtual_lane: false,
      });
    }

    // 한 틱 = 1 메시지(state_snapshot 배치) — 클라이언트가 lanes.forEach(upsertSample)
    send('state_snapshot', { lanes: frames });
    cb.onTick?.(states.map((s) => ({ ...s })), Date.now() - startAt);

    if (allDone) {
      clearTimer();
      send('race_finish', { event_id: eventId });
      setStatus('finished');
    }
  }

  function findSplit(lane: number): number {
    const l = cfg?.lanes.find((x) => x.lane === lane);
    return l && l.split500 > 0 ? l.split500 : 120;
  }

  return {
    start(config) {
      clearTimer();
      cfg = config;
      states = config.lanes
        .slice()
        .sort((a, b) => a.lane - b.lane)
        .map((l) => ({
          lane: l.lane,
          name: l.name,
          serial: laneSerial(l.lane),
          distance: 0,
          finished: false,
          spm: 0,
          power: 0,
        }));
      ensureChannel(() => {
        // 초기화 → 레인 편성 → 출발 신호
        send('race_reset', { event_id: eventId });
        for (const st of states) {
          const assign: LaneAssign = { lane: st.lane, member_name: st.name };
          send('lane_assign', assign);
        }
        send('race_start', { event_id: eventId });
        startAt = Date.now();
        lastTickAt = performance.now();
        setStatus('running');
        clearTimer();
        timer = setInterval(tick, config.tickMs ?? 300);
      });
    },
    pause() {
      if (status !== 'running') return;
      clearTimer();
      setStatus('paused');
    },
    resume() {
      if (status !== 'paused' || !cfg) return;
      lastTickAt = performance.now(); // 일시정지 구간을 dt에 포함하지 않음
      setStatus('running');
      timer = setInterval(tick, cfg.tickMs ?? 300);
    },
    reset() {
      clearTimer();
      for (const st of states) {
        st.distance = 0;
        st.finished = false;
        st.spm = 0;
        st.power = 0;
      }
      send('race_reset', { event_id: eventId });
      cb.onTick?.(states.map((s) => ({ ...s })), 0);
      setStatus('idle');
    },
    close() {
      clearTimer();
      if (channel) {
        void client.removeChannel(channel);
        channel = null;
      }
      setStatus('idle');
    },
    status() {
      return status;
    },
  };
}
