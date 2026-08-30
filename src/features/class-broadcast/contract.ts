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

/**
 * 기록 보드 갱신 신호 채널 — 세션 단위.
 * 회원 앱이 WOD 기록을 저장한 직후 "다시 읽어라"는 신호만 보내고(데이터 미포함),
 * TV는 기존 anon RPC(fn_get_class_wod_board)로 재조회한다. 신규 데이터 표면이 늘지 않는다
 * — 폴링(20s) 대기 없이 즉시 반영하기 위한 최소 장치(기획서 2-1).
 */
export function boardChannelName(sessionId: string): string {
  return `wod-board:${sessionId}`;
}

/** 보드 갱신 신호 이벤트명(고정) — 페이로드는 ts뿐(기록 내용은 싣지 않는다) */
export const BOARD_DIRTY_EVENT = 'board_dirty' as const;

/** 콘솔 명령 Broadcast 이벤트명(고정) */
export const CONSOLE_CMD_EVENT = 'console_cmd' as const;

/** ts 기준 이 시간(ms)을 초과한 명령은 스테일로 무시 — 재접속 시 과거 명령 재생 방지 */
export const STALE_CMD_MS = 5_000;

// ── 명령 페이로드 계약 ──────────────────────────────────────────────────────

export type ConsoleMode = 'wod' | 'live' | 'timer' | 'screen' | 'split' | 'flow';

export type TimerMode = 'countdown' | 'countup' | 'emom' | 'tabata' | 'interval';

export interface TimerCommand {
  action: 'configure' | 'start' | 'pause' | 'reset';
  mode?: TimerMode;
  /** countdown: 총 초 */
  seconds?: number;
  /** countup: 자동 종료 타임캡 초(미지정/0 = 무제한) */
  capSeconds?: number;
  /** emom: 인터벌 초 */
  intervalSeconds?: number;
  /** emom·interval: 총 라운드 */
  totalRounds?: number;
  /** tabata·interval: work 초 */
  workSeconds?: number;
  /** tabata·interval: rest 초 */
  restSeconds?: number;
  /** tabata: 세트 수(옵션) */
  totalSets?: number;
  /** 시작 전 준비 카운트다운 초(미지정/0 = 즉시 본 타이머) — "READY 3-2-1-GO" */
  preSeconds?: number;
  /** 표시용 타이머 타입명(예: AMRAP·FOR TIME) — 미지정 시 TV가 mode에서 유도(EMOM 등) */
  typeLabel?: string;
}

// ── 수업 플로우(세그먼트 타임라인) — docs/05 §3.2 flow 모드 ──────────────────
//   코치가 세그먼트 배열+현재 인덱스를 통째로 재전송한다(멱등 — TV는 수신 상태만
//   렌더, 중간 합류/재접속 TV도 다음 명령에서 동기화). 플랜 영속은 session_wods.segments.

/**
 * 히트(조) 시차 출발 플랜 — waterfall start (기획서 1-3).
 * 장비가 인원보다 적은 수업에서 조를 나눠 stagger 간격으로 순차 출발시킨다.
 * TV는 세그먼트 타이머와 같은 시계 위에서 각 조의 출발 카운트다운/경과를 함께 표시한다
 * (별도 타이머 엔진 없음 — 조 h의 출발 시각 = preSeconds + h × staggerSeconds).
 */
export interface HeatPlan {
  /** 조 수(2 이상에서 의미 있음) */
  count: number;
  /** 조 간 출발 간격(초) */
  staggerSeconds: number;
  /** 조 이름(미지정/부족분은 'HEAT n') */
  labels?: string[];
}

export interface FlowSegment {
  /** 표시 이름(예: 브리핑·웜업·METCON·쿨다운) */
  name: string;
  /** 세그먼트 진입 시 적용할 타이머 구성(action은 무시하고 configure로 적용). null=시계 유지 */
  timer?: TimerCommand | null;
  /** 타이머 자동 시작 여부(기본 true — 진입 즉시 preSeconds 카운트다운부터 구동) */
  autoStart?: boolean;
  /** 라이브 화이트보드(기록 랭킹 스트립) 표시 여부(기본 false — 기록 세그먼트에서만) */
  showBoard?: boolean;
  /**
   * 화이트보드 표시 방식(showBoard=true일 때만): rank=개인 순위(기본) ·
   * coop=클래스 합산 목표 진행(협동 모드, 기획서 2-3 — 목표는 session_wods.coop_*)
   */
  boardView?: 'rank' | 'coop';
  /**
   * 이 구간에 띄울 WOD 동작 인덱스(movements_snapshot 기준, 기획서 1-1 콘텐츠 바인딩).
   * 미지정/빈 배열 = 오늘 WOD 전체 표시(종전 동작). 지정 시 해당 동작만 좌측에 뜨고,
   * 첫 동작의 시범 자료(영상·코칭 포인트)가 함께 표시된다.
   */
  movementIdx?: number[];
  /** 시차 출발(waterfall) 플랜 — 미지정/count<2 = 전원 동시 출발(종전 동작) */
  heats?: HeatPlan | null;
}

export interface FlowCommand {
  /** start=플로우 개시(첫 세그먼트) · set=세그먼트 이동/재동기 · stop=플로우 종료 */
  action: 'start' | 'set' | 'stop';
  /** start·set: 전체 세그먼트 플랜(통째 재전송 — TV 무상태 수신) */
  segments?: FlowSegment[];
  /** start·set: 현재 세그먼트 인덱스(start 미지정 시 0) */
  index?: number;
  /** 화이트보드 조회 대상 세션(showBoard 세그먼트에서 fn_get_class_wod_board 호출용) */
  session_id?: string | null;
  /** 라이브 화이트보드 정렬(2-1 경쟁 강도 옵션): rank=점수순(기본) · recent=기록순 · name=이름순 */
  board_sort?: 'rank' | 'recent' | 'name';
}

export type ConsoleCmd = 'set_mode' | 'timer' | 'flow' | 'refresh' | 'identify' | 'open_race';

export interface ConsoleCommandPayload {
  cmd: ConsoleCmd;
  /** null | 미지정 = 시설 전체. 특정 TV만 제어 시 대상 콘솔 ID 지정 */
  target_console_id?: string | null;
  /** cmd=set_mode */
  mode?: ConsoleMode;
  /** cmd=timer */
  timer?: TimerCommand;
  /** cmd=flow — 수업 플로우 상태(전체 플랜+인덱스) */
  flow?: FlowCommand;
  /** cmd=open_race — 관전할 race_events.id (콘솔이 관전 화면으로 전환) */
  event_id?: string;
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
