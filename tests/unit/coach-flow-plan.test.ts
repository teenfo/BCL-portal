// 수업 플로우 플랜 유도 — 순수 로직 검증 (docs/05 §3.2 flow · §4.2)
import { describe, expect, it } from 'vitest';
import { deriveFlowSegments, wodTimerConfig } from '@/features/coach-race/flow-plan';

describe('wodTimerConfig — 포맷 → 타이머 구성(동적 적용)', () => {
  it('emom + rounds → 60초 인터벌 × rounds', () => {
    const { cmd } = wodTimerConfig({ format: 'emom', time_cap_minutes: null, rounds: 12 });
    expect(cmd.mode).toBe('emom');
    expect(cmd.totalRounds).toBe(12);
  });
  it('emom + rounds 없음 → cap 분을 라운드로 폴백', () => {
    const { cmd } = wodTimerConfig({ format: 'emom', time_cap_minutes: 14, rounds: null });
    expect(cmd.totalRounds).toBe(14);
  });
  it('amrap → 타임캡 카운트다운(AMRAP 의미론)', () => {
    const { cmd } = wodTimerConfig({ format: 'amrap', time_cap_minutes: 12, rounds: null });
    expect(cmd.mode).toBe('countdown');
    expect(cmd.seconds).toBe(720);
  });
  it('for_time + cap → 카운트업 + capSeconds 자동 종료(For Time 의미론)', () => {
    const { cmd, label } = wodTimerConfig({ format: 'for_time', time_cap_minutes: 15, rounds: null });
    expect(cmd.mode).toBe('countup');
    expect(cmd.capSeconds).toBe(900);
    expect(label).toContain('CAP');
  });
  it('cap 없는 기본 포맷 → 무제한 카운트업', () => {
    const { cmd } = wodTimerConfig({ format: 'strength', time_cap_minutes: null, rounds: null });
    expect(cmd.mode).toBe('countup');
    expect(cmd.capSeconds).toBeUndefined();
  });
});

describe('deriveFlowSegments — 기본 플랜 자동 제안', () => {
  it('브리핑→웜업→본운동→쿨다운 4세그먼트, 본운동만 라이브 화이트보드 ON', () => {
    const segs = deriveFlowSegments({ title: 'Fran', format: 'for_time', time_cap_minutes: 10, rounds: null });
    expect(segs.map((s) => Boolean(s.showBoard))).toEqual([false, false, true, false]);
    expect(segs[0].timer).toBeNull();
    expect(segs[2].name).toBe('Fran');
    expect(segs[2].timer?.preSeconds).toBeGreaterThan(0);
  });
  it('WOD 없음 → 본운동 카운트업 폴백(수업 시작 가능 유지)', () => {
    const segs = deriveFlowSegments(null);
    expect(segs).toHaveLength(4);
    expect(segs[2].timer?.mode).toBe('countup');
  });
});
