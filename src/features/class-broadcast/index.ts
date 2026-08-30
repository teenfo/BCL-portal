// Class Broadcast 원격제어 프로토콜 — 계약 SSOT 배럴 (docs/05 §4)
export {
  consoleChannelName,
  hudChannelName,
  raceChannelName,
  boardChannelName,
  CONSOLE_CMD_EVENT,
  BOARD_DIRTY_EVENT,
  STALE_CMD_MS,
  isCommandForConsole,
  isCommandStale,
} from './contract';
export type {
  ConsoleMode,
  TimerMode,
  TimerCommand,
  FlowSegment,
  HeatPlan,
  FlowCommand,
  ConsoleCmd,
  ConsoleCommandPayload,
} from './contract';
export { useConsoleChannel } from './useConsoleChannel';
export type { RealtimeStatus } from './useConsoleChannel';
export { createConsolePublisher } from './publish';
export type { ConsolePublisher } from './publish';
export { publishBoardDirty, useBoardSignal } from './board-signal';
