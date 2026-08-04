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
  | 'race_countdown'
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

/** 페이서 소스(docs/15 §4b.5) — 목표 페이스 기준 */
export type PacerSource = 'coach_split' | 'member_pr' | 'club_record';

/**
 * 버추얼 페이서 설정(G-10, §4b.5) — race_events.pacer_config에 저장.
 * 렌더 전용: 순위·팀합산·race_records 적재 미포함. Class TV가 anon SELECT로 읽어
 * rAF 루프에서 목표 페이스 라인을 그린다. split_500m(초/500m)이 페이스 라인 속도 기준.
 */
export interface PacerConfig {
  enabled: boolean;
  source: PacerSource;
  /** 목표 500m 스플릿(초). 페이스 라인 속도 = 500/split_500m (m/s) */
  split_500m?: number | null;
  member_id?: string | null;
  label?: string | null;
}

/** 애니메이터에 전달하는 실시간 페이서 상태 — race_start 기준 startedAt에서 전진 시작 */
export interface PacerLive {
  /** 목표 500m 스플릿(초, >0) */
  split500: number;
  /** race_start broadcast 수신 시각(ms epoch). null=미출발(라인 숨김) */
  startedAt: number | null;
  label?: string | null;
}
