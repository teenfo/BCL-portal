// Class Broadcast 계약 순수 판정 — 대상/스테일 헬퍼 (docs/05 §4.1)
import { describe, expect, it } from 'vitest';
import {
  STALE_CMD_MS,
  consoleChannelName,
  isCommandForConsole,
  isCommandStale,
  type ConsoleCommandPayload,
} from '@/features/class-broadcast';

const base: ConsoleCommandPayload = { cmd: 'refresh', ts: 1_000_000 };

describe('isCommandForConsole — 대상 판정', () => {
  it('target 미지정/null → 시설 전체(항상 수신)', () => {
    expect(isCommandForConsole(base, 'tv-1')).toBe(true);
    expect(isCommandForConsole({ ...base, target_console_id: null }, 'tv-1')).toBe(true);
  });
  it('target 지정 → 일치 콘솔만 수신', () => {
    expect(isCommandForConsole({ ...base, target_console_id: 'tv-1' }, 'tv-1')).toBe(true);
    expect(isCommandForConsole({ ...base, target_console_id: 'tv-2' }, 'tv-1')).toBe(false);
  });
});

describe('isCommandStale — 재접속 시 과거 명령 재생 방지', () => {
  it('STALE_CMD_MS 이내 → 수용', () => {
    expect(isCommandStale(base, base.ts + STALE_CMD_MS)).toBe(false);
  });
  it('STALE_CMD_MS 초과 → 스테일 무시', () => {
    expect(isCommandStale(base, base.ts + STALE_CMD_MS + 1)).toBe(true);
  });
  it('ts 비정상(숫자 아님) → 관대 수용', () => {
    const p = { ...base, ts: undefined as unknown as number };
    expect(isCommandStale(p, 9_999_999)).toBe(false);
  });
});

describe('consoleChannelName — 채널명 규약', () => {
  it('class-console:{facilityId}', () => {
    expect(consoleChannelName('fac-1')).toBe('class-console:fac-1');
  });
});
