// rounds_reps 인코딩 계약(src/lib/score.ts) — 작성/해석 왕복 정합
import { describe, expect, it } from 'vitest';
import { decodeRoundsReps, encodeRoundsReps, formatRoundsReps } from '@/lib/score';

describe('rounds_reps 인코딩 계약 — 단일 소스 왕복', () => {
  it('5R+12 ↔ 5.12', () => {
    expect(encodeRoundsReps(5, 12)).toBe(5.12);
    expect(decodeRoundsReps(5.12)).toEqual({ rounds: 5, reps: 12 });
    expect(formatRoundsReps(5.12)).toBe('5R+12');
  });
  it('잔여 reps 0 → R만 표기', () => {
    expect(formatRoundsReps(7)).toBe('7R');
  });
  it('reps 2자리 캡(99) — 인코딩이 라운드 자리를 침범하지 않음', () => {
    expect(encodeRoundsReps(3, 250)).toBe(3.99);
    expect(formatRoundsReps(encodeRoundsReps(3, 250))).toBe('3R+99');
  });
});
