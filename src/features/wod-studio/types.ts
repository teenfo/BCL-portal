// WOD 스튜디오 도메인 타입 — docs/sql/04_wod_runbook.sql 컬럼 반영 (02-admin §3.8)
// 소스: wod_templates / wod_template_movements / movement_library / movement_categories

export type TemplateKind = 'daily' | 'benchmark' | 'skill' | 'strength' | 'conditioning';

export type FormatType =
  | 'for_time'
  | 'amrap'
  | 'emom'
  | 'tabata'
  | 'chipper'
  | 'strength'
  | 'custom'
  | 'station_circuit';

/** 템플릿 스코프 필터 — fn_list_wod_templates(p_scope) 인자
 *  facility 스코프는 시설 컨텍스트(facility_id) 미배선으로 이번 단계 제외(⏳). */
export type TemplateScope = 'all' | 'shared' | 'benchmark';

/** wod_template_movements 라인 (fn_get_wod_template / fn_list_wod_templates.movements) */
export interface TemplateMovement {
  id?: string;
  sort_order?: number;
  movement_id: string | null;
  movement_name_ko?: string | null;
  movement_name_en?: string | null;
  custom_label: string | null;
  target_value: number | null;
  target_unit: string | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  load_male_rx: string | null;
  load_female_rx: string | null;
  rx_notes: string | null;
  scaling_notes: string | null;
}

/** wod_templates + movements (목록·상세 공통) */
export interface WodTemplate {
  id: string;
  facility_id: string | null;
  template_kind: TemplateKind;
  title: string;
  format_type: FormatType | null;
  time_cap_minutes: number | null;
  rounds: number | null;
  description: string | null;
  public_notes: string | null;
  coach_notes: string | null;
  is_shared: boolean;
  is_benchmark: boolean;
  is_member_visible: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  movements: TemplateMovement[];
}

/** fn_search_wod_movements 결과 (경량 검색) */
export interface MovementSearchResult {
  id: string;
  slug: string;
  name_ko: string;
  name_en: string;
  category: string;
  equipment: string[] | null;
  difficulty_level: number;
  primary_muscles: string[] | null;
  coaching_points: string | null;
  thumbnail_url: string | null;
}

/** fn_list_movement_library 결과 (관리용 — 카테고리 조인 + 사용 수) */
export interface MovementLibraryItem {
  id: string;
  slug: string;
  name_ko: string;
  name_en: string;
  category: string;
  equipment: string[] | null;
  difficulty_level: number;
  primary_muscles: string[] | null;
  coaching_points: string | null;
  source_tag: string | null;
  is_active: boolean;
  thumbnail_url: string | null;
  video_url: string | null;
  created_at: string;
  updated_at: string;
  wod_usage_count: number;
  category_name_ko: string | null;
  category_name_en: string | null;
  category_color: string | null;
}

/** movement_categories (동적 카테고리 마스터) */
export interface MovementCategory {
  id: string;
  slug: string;
  name_ko: string;
  name_en: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export const TEMPLATE_KIND_LABEL: Record<TemplateKind, string> = {
  daily: '데일리',
  benchmark: '벤치마크',
  skill: '스킬',
  strength: '스트렝스',
  conditioning: '컨디셔닝',
};

export const FORMAT_TYPE_LABEL: Record<FormatType, string> = {
  for_time: 'For Time',
  amrap: 'AMRAP',
  emom: 'EMOM',
  tabata: 'Tabata',
  chipper: 'Chipper',
  strength: 'Strength',
  custom: 'Custom',
  station_circuit: 'Station Circuit',
};

export const TEMPLATE_KIND_OPTIONS = (Object.keys(TEMPLATE_KIND_LABEL) as TemplateKind[]).map(
  (k) => ({ value: k, label: TEMPLATE_KIND_LABEL[k] }),
);

export const FORMAT_TYPE_OPTIONS = (Object.keys(FORMAT_TYPE_LABEL) as FormatType[]).map((k) => ({
  value: k,
  label: FORMAT_TYPE_LABEL[k],
}));
