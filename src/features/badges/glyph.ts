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

// 저장값 처리:
//   · 빈값 → 기본 메달(🏅)
//   · 알려진 아이콘 키('flame' 등) → 매핑 글리프 (기존 시드 데이터 하위호환)
//   · 그 외(관리자가 직접 입력한 이모지 등) → 입력값 그대로 렌더
export function badgeGlyph(key: string | null | undefined): string {
  if (!key) return DEFAULT_GLYPH;
  const k = key.trim();
  if (!k) return DEFAULT_GLYPH;
  return BADGE_GLYPH[k.toLowerCase()] ?? k;
}

/** 관리자 배지 편집 — 빠른 선택용 이모지 팔레트. 직접 입력도 가능. */
export const BADGE_EMOJI_SUGGESTIONS = [
  '🏅', '🥇', '🥈', '🥉', '🔥', '👑', '🏆', '🎖️', '🛡️', '⭐',
  '💪', '🏋️', '🤸', '🏃', '🚣', '⚡', '🎯', '🚀', '💎', '❤️', '👣', '📅',
];
