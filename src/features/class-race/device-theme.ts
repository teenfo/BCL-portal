// 기기 타입별 비주얼 테마 (docs/15 R-11 · §5b.3b) — 표현 계층 전용.
// 위치 계산(실거리 R-3)·집계·상태머신은 전 테마 동일. 여기서는 매핑만 제공.
//
// 2단계 결정 규칙:
//  1) 트랙 테마 = race_events.event_type → data-race-theme(화면 최상위 1곳)
//     테마 토큰(--bcl-race-surface/-trail/-bg-tint)은 tokens.css가 data-race-theme별로 보유.
//  2) 레인 캐릭터 = 각 레인 pm5_devices.device_type (혼합 편성 허용)

import type { RaceEventType, DeviceType } from '@/features/race-admin/types';

export type RaceTheme = 'water' | 'road' | 'snow' | 'track';

/** event_type → 트랙 테마 키 (§5b.3b 표) */
export function themeForEvent(eventType: RaceEventType | null | undefined): RaceTheme {
  switch (eventType) {
    case 'rowing':
      return 'water';
    case 'bike':
      return 'road';
    case 'skierg':
      return 'snow';
    case 'run':
      return 'track';
    default:
      return 'track'; // other 폴백
  }
}

/** device_type → 캐릭터 에셋 키 (race/char-{key}) 및 표시 정보 */
export interface CharacterSpec {
  /** race/char-{assetKey}-{state} 네이밍 규칙 매핑 키 */
  assetKey: 'rower' | 'bike' | 'ski' | 'runner';
  /** 애니메이션 루프 상태(SPM/RPM/CAD)의 단위 라벨 */
  rateLabel: 'SPM' | 'RPM' | 'CAD';
  /** 플레이스홀더 글리프(실 SVG 스프라이트 부재 시 렌더) */
  glyph: string;
}

export function characterForDevice(deviceType: DeviceType | null | undefined): CharacterSpec {
  switch (deviceType) {
    case 'rower':
      return { assetKey: 'rower', rateLabel: 'SPM', glyph: '🚣' };
    case 'bike':
      return { assetKey: 'bike', rateLabel: 'RPM', glyph: '🚴' };
    case 'skierg':
      return { assetKey: 'ski', rateLabel: 'SPM', glyph: '⛷️' };
    case 'treadmill':
      return { assetKey: 'runner', rateLabel: 'CAD', glyph: '🏃' };
    default:
      return { assetKey: 'runner', rateLabel: 'SPM', glyph: '🏃' };
  }
}

/**
 * 스프라이트 애니메이션 재생 주기(초) — 실측 rate 동기 (§5b.3b 주기 공식).
 * rAF 콜백에서 style.animationDuration 직접 갱신용.
 */
export function animationDurationSec(
  deviceType: DeviceType | null | undefined,
  rate: number,
): number {
  switch (deviceType) {
    case 'bike':
      return 60 / Math.max(rate, 20); // 페달 회전(RPM)
    case 'treadmill':
      return 120 / Math.max(rate, 30); // 1루프=2보(케이던스)
    case 'rower':
    case 'skierg':
    default:
      return 60 / Math.max(rate, 6); // 스트로크/더블폴(SPM)
  }
}

/**
 * 로워 캐릭터 컷아웃(public/race/chars — 레퍼런스 원화 분리 자산) 레인 순환 배정.
 * bike/ski/run 컷아웃은 후속 — 현재는 rower만 이미지, 그 외 글리프 폴백(LaneRow).
 */
const ROWER_CHARS = [
  'c1-bald-green',
  'c2-whitecap',
  'c3-leader',
  'c4-yellow-pony',
  'c5-blue',
  'c6-beard-red',
  'c7-red-pony-teal',
] as const;

export function rowerCharSrc(index: number): string {
  return `/race/chars/${ROWER_CHARS[index % ROWER_CHARS.length]}.png`;
}

/**
 * 수영장 아레나 레인 지오메트리 — public/race/pool-bg.jpg 실측(% 좌표, 1264x841).
 * 스테이지 배경은 100%/100% 스트레치라 이미지 %가 곧 스테이지 %.
 * 상단(수면 시작) 출발 → 하단(데크, 도장 레인번호 1~9) 피니시. 원근: 하강할수록 확대.
 */
export const POOL = {
  yTop: 58, // 수면 상단(출발선)
  yBottom: 88, // 데크 직전(피니시) — 레인번호(≈93%)는 노출 유지
  sTop: 0.5,
  sBottom: 1.05,
} as const;

/** 도장 레인번호 k(1..9)의 라인 x% — 하단 간격 11.85%p, 상단 수렴비 0.9(소실점 위) */
export function poolLaneX(laneNo: number): { xt: number; xb: number } {
  const k = ((Math.max(1, Math.round(laneNo)) - 1) % 9) + 1;
  return { xt: 50 + (k - 5) * 10.67, xb: 50 + (k - 5) * 11.85 };
}

/** 팀 컬러 토큰 8색 순환 (--bcl-race-team-1..8) */
export function teamColorVar(index: number): string {
  return `var(--bcl-race-team-${(index % 8) + 1})`;
}

/**
 * 트랙 테마의 기본 기기 타입 — 레인별 device_type이 아직 도착하지 않았을 때의 폴백만 담당.
 * (레인별 device_type은 fn_get_race_lanes anon RPC가 반환 — pm5_devices anon 갭 해소됨.
 *  useRaceRealtime가 LaneMeta.device_type에 병합하고, RaceView/RaceRun이 레인별 캐릭터 구동.)
 */
export function defaultDeviceForTheme(theme: RaceTheme): DeviceType {
  switch (theme) {
    case 'water':
      return 'rower';
    case 'road':
      return 'bike';
    case 'snow':
      return 'skierg';
    case 'track':
    default:
      return 'treadmill';
  }
}
