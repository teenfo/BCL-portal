// Race Broadcast 메시지 계약 (docs/15 §3.1) — 채널 race:{event_id}.
// Python 브릿지가 발행, Class TV가 anon 구독. 필드 축약형(d/p/spm...)·전체형 모두 수용.
export { raceChannelName } from '@/features/class-broadcast';

/** erg_update — 기기당 0.3s(≈3Hz). 축약 필드 (docs/15 §3.1) */
export interface ErgUpdate {
  device_serial: string;
  device_id?: string;
  lane: number;
  /** distance(m) */
  d: number;
  /** power(W) */
  p: number;
  /** stroke rate(SPM/RPM/CAD) */
  spm: number;
  /** heart rate(bpm) */
  hr?: number | null;
  cal?: number;
  max_w?: number;
  ts?: number;
  /** true = 페이스보트 가상 레인 — 렌더 전용(집계·적재 제외, §4b.5 G-10) */
  virtual_lane?: boolean;
}

export type RaceBroadcastEvent =
  | 'erg_update'
  | 'race_start'
  | 'race_finish'
  | 'race_reset'
  | 'state_snapshot'
  | 'lane_assign'
  | 'team_update'
  | 'heat_advance'
  | 'target_reached';

export interface LaneAssign {
  lane: number;
  device_id?: string;
  member_id?: string | null;
  member_name?: string | null;
  team_id?: string | null;
}
