// 레이스 카메라 연출 순수 로직 (docs/15 §5b) — RaceStage3D rAF 루프에서 분리(단위 테스트 대상).
//   배틀 캠 페어 선정과 피날레 캠 게이트는 표시 전용 판단 — 집계/순위/상태머신 미영향.

export interface DuelRacer {
  serial: string;
  /** 원시 샘플 거리(m) */
  d: number;
  /** 마지막 샘플 수신 시각(ms, Date.now 기준). 없으면 후보 제외 */
  lastAt: number | null;
}

export const DUEL_GAP_M = 4;
/** 페어 후보 최소 전진 거리 — 미출발(0m 부근) 레인 배제 */
export const DUEL_MIN_D = 12;
/** 샘플 신선도(ms) — 초과 시 idle로 보고 후보 제외 */
export const DUEL_IDLE_MS = 6000;

/**
 * 경합 페어 선정 — 활동 중(신선 샘플 + 최소 전진) 레인만 거리 내림차순으로 보고
 * 인접 최소 간격 페어를 반환. 간격이 DUEL_GAP_M 초과면 null(경합 없음).
 * idle·미출발(DNS) 레인이 gap 0으로 항상 선정되던 결함의 방지가 목적.
 */
export function pickDuelPair(
  racers: DuelRacer[],
  now: number,
  target: number | null,
): [string, string] | null {
  const active = racers
    .filter(
      (r) =>
        r.lastAt !== null &&
        now - r.lastAt <= DUEL_IDLE_MS &&
        r.d >= DUEL_MIN_D &&
        (!target || r.d < target - 1),
    )
    .sort((a, b) => b.d - a.d);
  let bestGap = Infinity;
  let pair: [string, string] | null = null;
  for (let i = 0; i + 1 < active.length; i++) {
    const gap = active[i].d - active[i + 1].d;
    if (gap < bestGap) {
      bestGap = gap;
      pair = [active[i].serial, active[i + 1].serial];
    }
  }
  return pair && bestGap <= DUEL_GAP_M ? pair : null;
}

/**
 * 피날레 캠 게이트 — 선두 95% 통과~결승선 도달 전(첫 피니셔 발생 전)까지만.
 * 시간제(target null)는 결승선 개념이 없어 비활성(§4b 시간제 연출은 후속).
 */
export function finaleGate(args: {
  status: string;
  target: number | null;
  leadD: number;
  finishedCount: number;
}): boolean {
  const { status, target, leadD, finishedCount } = args;
  return status === 'racing' && !!target && leadD >= target * 0.95 && finishedCount === 0;
}

/**
 * 코스 진행 스케일 상한 — 목표 거리 없으면(시간제) 선두를 87% 지점에 두는 여유 스케일.
 *   기존 max(1, leadD)는 선두 prog가 항상 1.0이 되어 함대가 피니시에 압축되는 결함.
 */
export function courseScaleMax(target: number | null, leadD: number): number {
  if (target && target > 0) return target;
  return Math.max(1, leadD * 1.15);
}
