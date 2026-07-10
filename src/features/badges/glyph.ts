// 배지 아이콘 키 → 표시 글리프(이모지) 매핑.
//   badge_definitions.icon 은 아이콘 키 문자열(예: 'flame')을 저장한다. UI는 이 키를 글리프로 변환해 렌더.
//   미지정/미매핑 키는 기본 메달(🏅)로 폴백 — 빈 아이콘 방지.
const BADGE_GLYPH: Record<string, string> = {
  footprints: '👣',
  flame: '🔥',
  fire: '🔥',
  crown: '👑',
  calendar: '📅',
  'calendar-check': '📅',
  trophy: '🏆',
  rowing: '🚣',
  medal: '🥇',
  shield: '🛡️',
  'shield-star': '🎖️',
  star: '⭐',
  dumbbell: '🏋️',
  kettlebell: '🏋️',
  bolt: '⚡',
  heart: '❤️',
  target: '🎯',
  rocket: '🚀',
  gem: '💎',
};

const DEFAULT_GLYPH = '🏅';

export function badgeGlyph(key: string | null | undefined): string {
  if (!key) return DEFAULT_GLYPH;
  return BADGE_GLYPH[key.trim().toLowerCase()] ?? DEFAULT_GLYPH;
}

/** 관리자 배지 정의 편집용 아이콘 선택지(키 + 글리프 미리보기). */
export const BADGE_ICON_OPTIONS: { value: string; label: string }[] = Object.entries(BADGE_GLYPH)
  // 동일 글리프 중복 키(fire=flame 등)는 대표 키만 노출
  .filter(([key]) => !['fire', 'calendar-check', 'kettlebell'].includes(key))
  .map(([key, glyph]) => ({ value: key, label: `${glyph}  ${key}` }));
