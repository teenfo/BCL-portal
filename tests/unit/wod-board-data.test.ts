// 라이브 화이트보드 데이터 계층 — 정렬 옵션·점수 표기 (Class TV 2.0 플랜 2-1)
import { describe, expect, it } from 'vitest';
import {
  formatBoardScore,
  sortBoardRows,
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
