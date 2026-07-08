// Admin 사이드바 네비게이션 구성 — 계약 §5 IA / 02-admin §2.1 (14메뉴, 그룹 1단)
// 권한 게이트: 각 항목의 group에 view 없으면 미노출(비활성 아님) — fn_my_permissions 기준.

export interface NavItem {
  href: string;
  label: string;
  /** fn_my_permissions 권한 그룹 키 (view 보유 시에만 렌더) */
  group: string;
}

export interface NavGroup {
  /** 시각 구분용 헤더 — URL 세그먼트 아님. null = 최상위(대시보드) */
  header: string | null;
  items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
  { header: null, items: [{ href: '/admin/dashboard', label: '대시보드', group: 'dashboard' }] },
  {
    header: '운영',
    items: [
      { href: '/admin/members', label: '회원', group: 'members' },
      { href: '/admin/attendance', label: '출석', group: 'attendance' },
      { href: '/admin/schedule', label: '스케줄', group: 'schedule' },
      { href: '/admin/coaches', label: '코치', group: 'coaches' },
    ],
  },
  {
    header: '매출',
    items: [
      { href: '/admin/payments', label: '결제', group: 'payments' },
      { href: '/admin/plans', label: '요금제', group: 'plans' },
    ],
  },
  {
    header: '프로그램',
    items: [
      { href: '/admin/wod-studio', label: 'WOD 스튜디오', group: 'wod' },
      { href: '/admin/race', label: 'Race', group: 'race' },
      { href: '/admin/badges', label: '배지', group: 'badges' },
    ],
  },
  {
    header: '고객',
    items: [
      { href: '/admin/feedback', label: '피드백', group: 'feedback' },
      { href: '/admin/crm', label: 'CRM', group: 'crm' },
    ],
  },
  { header: '시설', items: [{ href: '/admin/lockers', label: '락커', group: 'lockers' }] },
  { header: null, items: [{ href: '/admin/settings', label: '설정', group: 'settings' }] },
];
