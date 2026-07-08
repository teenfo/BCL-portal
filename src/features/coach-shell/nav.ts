// 코치 하단탭 IA (docs/04 §2) — 5탭, 중앙(3번째) Schedule 강조.
// 슬롯: Home · Members · [Schedule 중앙강조] · Race · Profile

export interface CoachTab {
  href: string;
  label: string;
  /** 중앙 강조 슬롯(세션 운영 보드 직행 CTA) */
  emphasis?: boolean;
  icon: string;
}

export const COACH_TABS: CoachTab[] = [
  { href: '/coach/dashboard', label: '홈', icon: '⌂' },
  { href: '/coach/members', label: '회원', icon: '◎' },
  { href: '/coach/schedule', label: '세션', icon: '▦', emphasis: true },
  { href: '/coach/race', label: '레이스', icon: '⚑' },
  { href: '/coach/profile', label: '프로필', icon: '☰' },
];
