// ============================================================================
// Class 원격제어 Broadcast 프로토콜 — 계약 SSOT (docs/05 §4.1)
// ----------------------------------------------------------------------------
// 이 파일이 채널명·메시지 스키마의 단일 소스다. 코치 앱(/coach)·Admin은
// 이 모듈을 import 하여 발행하고, Class TV는 구독한다. (수정 시 양측 동시 반영)
//
// 전송 수단: Supabase Realtime "Broadcast" 전용 — DB 미경유(상태 저장 없음).
//   → query()/rpc() 헬퍼 우회가 아니다: Broadcast는 테이블 쓰기가 아니라
//     클라이언트 간 메시지 전달이므로 supabase client.channel() 사용이 허용된다
//     (CLAUDE.md 데이터 규칙은 테이블 접근에 한함).
// 보안 한계(docs/05 §4.1): anon 발행이 기술적으로 가능 — 위험 표면은 "화면 모드
//   전환" 수준(데이터 접근 아님)으로 수용. 채널명에 facility_id 포함 + 코치 UI에서만
//   발행 노출 + 향후 Realtime Authorization(private channel)로 승격 여지(⏳).
// ============================================================================

/** 콘솔 원격제어 채널 — 시설 내 모든 TV 콘솔이 구독한다 */
export function consoleChannelName(facilityId: string): string {
  return `class-console:${facilityId}`;
}

/** rotation-hud 리모컨 채널 — 세션 단위(as-is 검증 패턴 승계, docs/05 §4.2) */
export function hudChannelName(sessionId: string): string {
  return `hud-sync:${sessionId}`;
}

/** Race 실시간 채널 — 이벤트 단위(docs/15 §3.1, 다중시설 자연 분리) */
export function raceChannelName(eventId: string): string {
  return `race:${eventId}`;
}

/** 콘솔 명령 Broadcast 이벤트명(고정) */
export const CONSOLE_CMD_EVENT = 'console_cmd' as const;

/** ts 기준 이 시간(ms)을 초과한 명령은 스테일로 무시 — 재접속 시 과거 명령 재생 방지 */
export const STALE_CMD_MS = 5_000;

// ── 명령 페이로드 계약 ──────────────────────────────────────────────────────

export type ConsoleMode = 'wod' | 'live' | 'timer' | 'screen';

export type TimerMode = 'countdown' | 'countup' | 'emom' | 'tabata';

export interface TimerCommand {
  action: 'configure' | 'start' | 'pause' | 'reset';
  mode?: TimerMode;
  /** countdown: 총 초 */
  seconds?: number;
  /** emom: 인터벌 초 */
  intervalSeconds?: number;
  /** emom: 총 라운드 */
  totalRounds?: number;
  /** tabata: work 초 */
  workSeconds?: number;
  /** tabata: rest 초 */
  restSeconds?: number;
  /** tabata: 세트 수(옵션) */
  totalSets?: number;
}

export type ConsoleCmd = 'set_mode' | 'timer' | 'refresh' | 'identify';

export interface ConsoleCommandPayload {
  cmd: ConsoleCmd;
  /** null | 미지정 = 시설 전체. 특정 TV만 제어 시 대상 콘솔 ID 지정 */
  target_console_id?: string | null;
  /** cmd=set_mode */
  mode?: ConsoleMode;
  /** cmd=timer */
  timer?: TimerCommand;
  /** 발행 시각(ms epoch) — 스테일 판정 기준 */
  ts: number;
  /** 발행 주체(감사·표시용) */
  sender?: 'coach' | 'admin' | string;
}

/**
 * 수신 콘솔이 명령 대상인지 판정.
 * target_console_id 미지정/null = 시설 전체 → 항상 참.
 */
export function isCommandForConsole(
  payload: ConsoleCommandPayload,
  consoleId: string,
): boolean {
  if (payload.target_console_id == null) return true;
  return payload.target_console_id === consoleId;
}

/** ts 기준 스테일 여부 — now-ts > STALE_CMD_MS 이면 무시 */
export function isCommandStale(payload: ConsoleCommandPayload, now = Date.now()): boolean {
  if (typeof payload.ts !== 'number') return false; // ts 없으면 관대하게 수용
  return now - payload.ts > STALE_CMD_MS;
}
