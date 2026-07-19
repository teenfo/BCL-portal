// Admin 배지 도메인 타입 — badge_definitions/badge_awards (docs/sql/07_performance_badges.sql)

export type BadgeCategory = 'attendance' | 'performance' | 'race' | 'membership' | 'special';
export type BadgeMetricType =
  | 'checkin_count'
  | 'checkin_streak_weeks'
  | 'pr_count'
  | 'race_count'
  | 'race_podium_count'
  | 'membership_days'
  | 'manual';

export interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: BadgeCategory;
  metric_type: BadgeMetricType;
  threshold_value: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

/** badge_awards + members(name) + badge_definitions(name,slug,category) join */
export interface BadgeAwardRow {
  id: string;
  member_id: string;
  badge_id: string;
  source: 'auto' | 'manual';
  progress_value: number | null;
  awarded_at: string;
  members: { name: string } | null;
  badge_definitions: { name: string; slug: string; category: BadgeCategory } | null;
}

export const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  attendance: '출석',
  performance: '퍼포먼스',
  race: '레이스',
  membership: '멤버십',
  special: '특별',
};

export const METRIC_TYPE_LABEL: Record<BadgeMetricType, string> = {
  checkin_count: '출석 누적(회)',
  checkin_streak_weeks: '연속 출석(주)',
  pr_count: 'PR 달성(회)',
  race_count: 'Race 완주(회)',
  race_podium_count: 'Race 입상(회, 3위 이내)',
  membership_days: '멤버십 지속(일)',
  manual: '수동 수여 전용',
};

export function writeError(code: string | null): string {
  if (!code) return '요청에 실패했습니다.';
  if (/duplicate|unique/i.test(code)) return '이미 존재하는 값입니다 (slug 중복 또는 이미 보유).';
  if (/row-level security|permission|policy/i.test(code)) return '권한이 없습니다.';
  return code;
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? '-'
    : d.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
}
