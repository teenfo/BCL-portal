// 키오스크 체크인 프로토콜 배럴 (docs/06 §4·§5·§7)
export {
  submitScan,
  resubmitPayload,
  submitManualCheckin,
  submitGuestCheckin,
  lookupMembers,
} from './checkin';
export { parsePayload, isExpired, isFacilityMismatch } from './payload';
export { useScanner } from './useScanner';
export type { CameraState } from './useScanner';
export { queueSize, purgeExpired } from './offline-queue';
export { setSuccessResult, takeSuccessResult } from './result-store';
export type { SuccessResult } from './result-store';
export {
  KIOSK_ERROR_MESSAGE,
  type QrPayload,
  type KioskCheckinData,
  type KioskDuplicateData,
  type KioskCandidate,
  type KioskErrorCode,
  type ScanOutcome,
} from './types';
