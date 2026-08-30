// 라이브 화이트보드 데이터 계층 — 정렬 옵션·점수 표기 (Class TV 2.0 플랜 2-1)
import { describe, expect, it } from 'vitest';
import {
  coopAverage,
  coopPercent,
  formatBoardScore,
  formatCoopValue,
  sortBoardRows,
  type CoopBoardData,
  type WodBoardResult,
} from '@/features/class-leaderboard/wod-board-data';

const row = (patch: Partial<WodBoardResult>): WodBoardResult => ({
  rank: 1,
  member_name: '회원',
  score: 100,
  score_type: 'reps',
  rx_status: 'rx',
  ...patch,
});

describe('sortBoardRows — 정렬 3종(경쟁 강도 옵션)', () => {
  const rows = [
    row({ rank: 1, member_name: '나균형', created_at: '2026-08-30T10:00:00Z' }),
    row({ rank: 2, member_name: '가나다', created_at: '2026-08-30T10:20:00Z' }),
    row({ rank: 3, member_name: '다람쥐', created_at: '2026-08-30T10:10:00Z' }),
  ];
  it('rank → 서버 계층 정렬 유지(입력 순서 보존)', () => {
    expect(sortBoardRows(rows, 'rank').map((r) => r.rank)).toEqual([1, 2, 3]);
  });
  it('recent → 최신 기록 우선', () => {
    expect(sortBoardRows(rows, 'recent').map((r) => r.rank)).toEqual([2, 3, 1]);
  });
  it('name → 한국어 이름순', () => {
    expect(sortBoardRows(rows, 'name').map((r) => r.member_name)).toEqual(['가나다', '나균형', '다람쥐']);
  });
  it('원본 배열 비변형(정렬은 사본)', () => {
    sortBoardRows(rows, 'name');
    expect(rows[0].member_name).toBe('나균형');
  });
});

describe('formatBoardScore — score_type별 표기', () => {
  it('time → m:ss', () => {
    expect(formatBoardScore(462, 'time')).toBe('7:42');
  });
  it('rounds_reps → 소수 인코딩 복원(5.12 → 5R+12)', () => {
    expect(formatBoardScore(5.12, 'rounds_reps')).toBe('5R+12');
    expect(formatBoardScore(5, 'rounds_reps')).toBe('5R');
  });
  it('weight/distance/calories 단위', () => {
    expect(formatBoardScore(60, 'weight')).toBe('60kg');
    expect(formatBoardScore(2000, 'distance')).toBe('2000m');
    expect(formatBoardScore(35, 'calories')).toBe('35cal');
  });
});

// ── 협동 모드(2-3) — 합계 표기·달성률 ──
const coop = (patch: Partial<CoopBoardData>): CoopBoardData => ({
  session_id: 's1',
  label: '클래스 합계 로잉',
  unit: 'm',
  target: 5000,
  total: 4000,
  contributors: 2,
  excluded: 0,
  leaders: [],
  ...patch,
});

describe('formatCoopValue — 단위별 합계 표기', () => {
  it('거리·칼로리·중량은 값에 단위를 붙인다(천 단위 구분)', () => {
    expect(formatCoopValue(12345, 'm')).toBe('12,345m');
    expect(formatCoopValue(320, 'cal')).toBe('320cal');
    expect(formatCoopValue(1250, 'kg')).toBe('1,250kg');
  });
  it('reps는 공백을 두어 읽히게 한다', () => {
    expect(formatCoopValue(1500, 'reps')).toBe('1,500 reps');
  });
  it('소수는 반올림(회원 기록이 소수여도 TV는 정수로 읽힌다)', () => {
    expect(formatCoopValue(999.6, 'm')).toBe('1,000m');
  });
});

describe('coopPercent — 목표 대비 달성률', () => {
  it('부분 달성 → 비율', () => {
    expect(coopPercent(coop({ total: 4000, target: 5000 }))).toBe(80);
  });
  it('초과 달성은 100%로 캡(진행 바가 넘치지 않게)', () => {
    expect(coopPercent(coop({ total: 7000, target: 5000 }))).toBe(100);
  });
  it('목표 0/음수는 0% — 0 나눗셈으로 NaN이 화면에 뜨지 않게', () => {
    expect(coopPercent(coop({ target: 0 }))).toBe(0);
    expect(coopPercent(coop({ target: -10 }))).toBe(0);
  });
});

describe('coopAverage — 그룹 평균(계획서 2-3)', () => {
  it('참여 인원으로 나눈 1인 평균', () => {
    expect(coopAverage(coop({ total: 13400, contributors: 8 }))).toBe(1675);
  });
  it('참여 0명이면 null — 0 나눗셈으로 Infinity가 화면에 뜨지 않게', () => {
    expect(coopAverage(coop({ contributors: 0 }))).toBeNull();
  });
});
