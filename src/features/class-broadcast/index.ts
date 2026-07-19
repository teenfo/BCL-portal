// Class Broadcast 원격제어 프로토콜 — 계약 SSOT 배럴 (docs/05 §4)
export {
  consoleChannelName,
  hudChannelName,
  raceChannelName,
  CONSOLE_CMD_EVENT,
  STALE_CMD_MS,
  isCommandForConsole,
  isCommandStale,
} from './contract';
export type {
  ConsoleMode,
  TimerMode,
  TimerCommand,
  ConsoleCmd,
  ConsoleCommandPayload,
} from './contract';
export { useConsoleChannel } from './useConsoleChannel';
export type { RealtimeStatus } from './useConsoleChannel';
export { createConsolePublisher } from './publish';
export type { ConsolePublisher } from './publish';
