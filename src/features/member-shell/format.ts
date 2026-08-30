// 회원 앱 공용 포맷터 (표시 전용 — 토큰/숫자 규약)
import { formatRoundsReps } from '@/lib/score';

export const krw = (n: number | null | undefined): string =>
  `${Math.round(n ?? 0).toLocaleString('ko-KR')}원`;

const WD = ['일', '월', '화', '수', '목', '금', '토'];

/** 'YYYY-MM-DD' → '7월 8일 (화)' */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
}

/** 'HH:MM:SS' | 'HH:MM' → 'HH:MM' */
export function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}

/** ISO datetime → '방금 전 / N분 전 / N시간 전 / M월 D일' */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const d = new Date(then);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 오늘 기준 D-Day: 양수=남음, 0=오늘, 음수=지남 */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
}

/** 초(number) → 'M:SS' (레이스/타임 기록) */
export function secToClock(sec: number | null | undefined): string {
  if (sec == null) return '-';
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** WOD/벤치마크 score_type별 표시 */
export function formatScore(
  value: number | null | undefined,
  scoreType: string | null | undefined,
  unit?: string | null,
): string {
  if (value == null) return '-';
  switch (scoreType) {
    case 'time':
      return secToClock(value);
    case 'rounds_reps':
      // 인코딩 해석은 src/lib/score.ts 계약 단일 소스(TV 화이트보드와 동일)
      return formatRoundsReps(value);
    case 'reps':
      return `${value} reps`;
    case 'weight':
      return `${value}${unit ?? 'kg'}`;
    case 'distance':
      return `${value}${unit ?? 'm'}`;
    case 'calories':
      return `${value} cal`;
    default:
      return unit ? `${value}${unit}` : String(value);
  }
}

export const RX_LABEL: Record<string, string> = {
  rx_plus: 'Rx+',
  rx: 'Rx',
  scaled: 'Scaled',
};
