// 수업 플로우 플랜 유도 — 순수 로직 (docs/05 §3.2 flow · §4.2 코치 제어)
// 게시 WOD 메타(포맷·타임캡·라운드)에서 ① 단일 타이머 프리셋(wodTimerConfig — 기존
// ScreenControlPanel 매핑 이관, 단일 정의) ② 기본 세그먼트 플랜(deriveFlowSegments)을 만든다.
// 저장된 session_wods.segments가 있으면 그것이 우선 — 이 파일은 미설정 시 자동 제안 폴백.
import type { FlowSegment, TimerCommand } from '@/features/class-broadcast';

export interface WodTimerMeta {
  title?: string | null;
  format: string | null;
  time_cap_minutes: number | null;
  rounds: number | null;
}

/** 세그먼트 진입 시 전환 여유용 준비 카운트다운(초) — READY 3-2-1-GO */
export const FLOW_PRE_SECONDS = 10;

/** 게시 WOD 포맷 → TV 타이머 구성(docs/05 §4.1 TimerCommand). 포맷별 기본값 포함 */
export function wodTimerConfig(wod: WodTimerMeta): { cmd: TimerCommand; label: string } {
  const cap = wod.time_cap_minutes ?? null;
  switch (wod.format) {
    case 'emom': {
      const rounds = wod.rounds ?? cap ?? 10;
      return {
        cmd: { action: 'configure', mode: 'emom', intervalSeconds: 60, totalRounds: rounds, typeLabel: 'EMOM' },
        label: `EMOM ${rounds}R`,
      };
    }
    case 'tabata': {
      const sets = wod.rounds ?? 8;
      return {
        cmd: { action: 'configure', mode: 'tabata', workSeconds: 20, restSeconds: 10, totalSets: sets, typeLabel: 'TABATA' },
        label: `TABATA 20/10 ×${sets}`,
      };
    }
    case 'amrap': {
      const min = cap ?? 20;
      return {
        cmd: { action: 'configure', mode: 'countdown', seconds: min * 60, typeLabel: 'AMRAP' },
        label: `AMRAP ${min}분`,
      };
    }
    default:
      // for_time·chipper·strength·custom — 타임캡 있으면 카운트업+캡 자동 종료, 없으면 카운트업
      return cap
        ? {
            cmd: {
              action: 'configure',
              mode: 'countup',
              capSeconds: cap * 60,
              typeLabel: (wod.format ?? 'for_time').replace('_', ' ').toUpperCase(),
            },
            label: `${(wod.format ?? 'WOD').toUpperCase()} CAP ${cap}분`,
          }
        : { cmd: { action: 'configure', mode: 'countup' }, label: '카운트업' };
  }
}

/**
 * 기본 세그먼트 플랜 자동 제안 — 브리핑 → 웜업 → 본운동(포맷 타이머, 라이브 화이트보드 ON)
 * → 쿨다운. 코치가 WodPanel에서 저장한 플랜이 없을 때의 폴백(수정 없이 바로 수업 시작 가능).
 */
export function deriveFlowSegments(wod: WodTimerMeta | null): FlowSegment[] {
  const main = wod
    ? wodTimerConfig(wod)
    : { cmd: { action: 'configure', mode: 'countup' } as TimerCommand, label: '카운트업' };
  return [
    { name: '브리핑', timer: null },
    {
      name: '웜업',
      timer: {
        action: 'configure',
        mode: 'countdown',
        seconds: 8 * 60,
        preSeconds: FLOW_PRE_SECONDS,
        typeLabel: '웜업',
      },
    },
    {
      name: wod?.title?.trim() || '본운동',
      timer: { ...main.cmd, preSeconds: FLOW_PRE_SECONDS },
      showBoard: true,
    },
    {
      name: '쿨다운',
      timer: { action: 'configure', mode: 'countdown', seconds: 5 * 60, typeLabel: '쿨다운' },
    },
  ];
}

/** 세그먼트의 타이머를 사람이 읽는 짧은 라벨로(코치 패널 칩 표시용) */
export function describeSegmentTimer(seg: FlowSegment): string {
  const t = seg.timer;
  if (!t || !t.mode) return '시계';
  switch (t.mode) {
    case 'countdown':
      return `${Math.round((t.seconds ?? 0) / 60)}분`;
    case 'countup':
      return t.capSeconds ? `카운트업 CAP ${Math.round(t.capSeconds / 60)}분` : '카운트업';
    case 'emom':
      return `EMOM ${t.intervalSeconds ?? 60}s×${t.totalRounds ?? 10}`;
    case 'tabata':
      return `TABATA ${t.workSeconds ?? 20}/${t.restSeconds ?? 10}×${t.totalSets ?? 8}`;
    case 'interval':
      return `인터벌 ${t.workSeconds ?? 60}/${t.restSeconds ?? 30}×${t.totalRounds ?? 5}`;
  }
}
