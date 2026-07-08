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
