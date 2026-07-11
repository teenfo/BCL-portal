'use client';

// rAF 단일 루프 애니메이터 (docs/15 §5b.6) — 검증 LERP 계수 승계(x:0.08 / p:0.15 / spm:0.1).
// 원시 샘플(useRaceRealtime.samplesRef)을 프레임마다 보간 후 DOM transform/animationDuration
// 직접 조작으로 React 리렌더 우회. 순위 변동 등 저빈도 UI만 콜백으로 setState 유도.
// 러버밴딩 없음(R-3): 위치는 항상 실거리 비례 — LERP는 지연 보정일 뿐 거리 왜곡 없음.
import { useEffect, useRef } from 'react';
import { animationDurationSec } from './device-theme';
import type { DeviceType } from '@/features/race-admin/types';
import type { RawSample } from './useRaceRealtime';
import type { PacerLive } from './contract';

const LERP_X = 0.08;
const LERP_P = 0.15;
const LERP_SPM = 0.1;
const STALE_MS = 1500; // 이후 [Reconnecting] — Mock 등속(연출), 순위 미영향

export interface AnimatedLane {
  serial: string;
  d: number;
  p: number;
  spm: number;
  hr: number | null;
  maxW: number;
  lane: number;
  virtual: boolean;
  rank: number;
  stale: boolean;
  offline: boolean;
}

export interface RankRow {
  serial: string;
  lane: number;
  rank: number;
  d: number;
  virtual: boolean;
}

interface KartRegistration {
  kart?: HTMLElement | null;
  /** true면 위치 이동 안 함(고정 슬롯 구도) — 어트리뷰트/스프라이트 주기만 갱신 */
  fixedPos?: boolean;
  sprite?: HTMLElement | null;
  /** HUD 스탯 카드 — data-rank/-offline/-stale 어트리뷰트만 갱신(정적 위치) */
  card?: HTMLElement | null;
  /** 카트 머리 위 ERG 배지의 거리 숫자(textContent 갱신) */
  kartD?: HTMLElement | null;
  /** run 그리드 셀/HUD 카드 텍스트 갱신용 */
  text?: Partial<Record<'d' | 'p' | 'spm' | 'hr' | 'pace', HTMLElement | null>>;
  deviceType: DeviceType | null;
}

/** 진행바(REMAINING → GOAL) DOM 등록 — 선두 기준 fill/잔여거리 rAF 직접 갱신 */
export interface ProgressRegistration {
  fill?: HTMLElement | null;
  remain?: HTMLElement | null;
}

interface AnimatorOptions {
  /** 목표 거리(m) — 진행률 정규화 기준. 없으면 현재 선두 거리 기준 동적 스케일 */
  targetDistance?: number | null;
  /** 순위 변동 시 저빈도 콜백(순위 스택 갱신용) */
  onRankChange?: (rows: RankRow[]) => void;
  /**
   * 버추얼 페이서(G-10, §4b.5) — 렌더 전용 목표 페이스 라인.
   * startedAt(race_start) 기준 등속 전진: dist = (500/split500) * 경과초.
   * null=페이서 없음(라인 숨김). 순위·집계·karts DOM에는 일절 영향 없음.
   */
  pacer?: PacerLive | null;
}

/** 페이서 라인 DOM 등록(트랙 라인 + 미니맵 도트 + 라벨). RaceView가 ref로 주입 */
export interface PacerRegistration {
  /** 트랙 위 수직 페이스 라인 — left% 직접 조작 */
  line?: HTMLElement | null;
  /** 미니맵 페이서 도트 — left% 직접 조작 */
  minimapDot?: HTMLElement | null;
  /** 페이서 거리 라벨(textContent 갱신) */
  label?: HTMLElement | null;
}

export interface Animator {
  /** 동일 serial 재호출 시 병합 — 카트(LaneRow)와 HUD 카드가 각자 부분 등록 가능 */
  registerKart: (serial: string, reg: KartRegistration) => void;
  unregister: (serial: string) => void;
  /** 페이서 라인 DOM 등록/해제(null=해제). 렌더 전용, karts와 독립 */
  registerPacer: (reg: PacerRegistration | null) => void;
  /** 진행바 DOM 등록/해제(null=해제) — 선두 거리 기준 */
  registerProgress: (reg: ProgressRegistration | null) => void;
  /** HUD 포커스 게이지 등 즉시 조회용 스냅샷 */
  getLane: (serial: string) => AnimatedLane | undefined;
}

function pace500(distance: number, seconds: number): string {
  if (distance <= 0 || seconds <= 0) return '--:--';
  const per500 = (seconds / distance) * 500;
  const m = Math.floor(per500 / 60);
  const s = Math.floor(per500 % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
}

export function useRaceAnimator(
  samplesRef: React.MutableRefObject<Map<string, RawSample>>,
  options: AnimatorOptions = {},
): Animator {
  const animatedRef = useRef<Map<string, AnimatedLane>>(new Map());
  const regRef = useRef<Map<string, KartRegistration>>(new Map());
  const pacerRegRef = useRef<PacerRegistration | null>(null);
  const progressRegRef = useRef<ProgressRegistration | null>(null);
  const lastOrderRef = useRef<string>('');
  const optRef = useRef(options);
  useEffect(() => {
    optRef.current = options;
  });
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = performance.now();
    let raf = 0;
    const loop = () => {
      const now = Date.now();
      const samples = samplesRef.current;
      const animated = animatedRef.current;

      // 1) 보간 갱신
      for (const [serial, s] of samples) {
        let a = animated.get(serial);
        if (!a) {
          a = {
            serial,
            d: s.d,
            p: s.p,
            spm: s.spm,
            hr: s.hr,
            maxW: s.maxW,
            lane: s.lane,
            virtual: s.virtual,
            rank: 0,
            stale: false,
            offline: false,
          };
          animated.set(serial, a);
        }
        const age = now - s.lastAt;
        a.stale = age > STALE_MS && s.connection === 'racing';
        a.offline = s.connection === 'offline' || s.connection === 'disconnected';
        a.lane = s.lane;
        a.virtual = s.virtual;
        a.hr = s.hr;
        a.maxW = s.maxW;

        if (a.offline) {
          // 단절: LERP 스킵(현행) — 위치 고정
        } else if (a.stale) {
          // Mock 등속 전진(연출) — 마지막 속도로 추정, 순위엔 실측만 사용하므로 d는 유지
          a.p += (s.p - a.p) * LERP_P;
          a.spm += (s.spm - a.spm) * LERP_SPM;
          a.d += (s.d - a.d) * LERP_X;
        } else {
          a.d += (s.d - a.d) * LERP_X;
          a.p += (s.p - a.p) * LERP_P;
          a.spm += (s.spm - a.spm) * LERP_SPM;
        }
      }

      // 2) 순위 산정(실거리 내림차순, 가상 레인 제외) — R-3
      const ranked = [...animated.values()]
        .filter((a) => !a.virtual)
        .sort((x, y) => y.d - x.d || y.maxW - x.maxW);
      ranked.forEach((a, i) => (a.rank = i + 1));

      // 3) 진행률 스케일
      const target = optRef.current.targetDistance;
      const maxD = target && target > 0 ? target : Math.max(1, ...ranked.map((a) => a.d));

      // 4) DOM 직접 조작
      const elapsed = (performance.now() - startRef.current) / 1000;
      for (const [serial, reg] of regRef.current) {
        const a = animated.get(serial);
        if (!a) continue;
        const xPct = Math.min(100, (a.d / maxD) * 100);
        if (reg.kart) {
          if (!reg.fixedPos) reg.kart.style.transform = `translate3d(${xPct}%, 0, 0)`;
          reg.kart.setAttribute('data-rank', String(a.rank));
          if (a.offline) reg.kart.setAttribute('data-offline', 'true');
          else reg.kart.removeAttribute('data-offline');
          if (a.stale) reg.kart.setAttribute('data-stale', 'true');
          else reg.kart.removeAttribute('data-stale');
        }
        if (reg.card) {
          reg.card.setAttribute('data-rank', String(a.rank));
          if (a.offline) reg.card.setAttribute('data-offline', 'true');
          else reg.card.removeAttribute('data-offline');
        }
        if (reg.sprite) {
          const dur = animationDurationSec(reg.deviceType, a.spm);
          reg.sprite.style.animationDuration = `${dur.toFixed(2)}s`;
          // 캐릭터 컷아웃(.charImg) 스트로크 로킹이 상속받는 주기(실측 SPM)
          reg.sprite.style.setProperty('--stroke-dur', `${dur.toFixed(2)}s`);
          reg.sprite.setAttribute('data-idle', a.spm < 6 ? 'true' : 'false');
        }
        if (reg.kartD) reg.kartD.textContent = `${Math.round(a.d)}`;
        if (reg.text) {
          if (reg.text.d) reg.text.d.textContent = `${Math.round(a.d)}`;
          if (reg.text.p) reg.text.p.textContent = `${Math.round(a.p)}`;
          if (reg.text.spm) reg.text.spm.textContent = `${Math.round(a.spm)}`;
          if (reg.text.hr) reg.text.hr.textContent = a.hr != null ? `${a.hr}` : '--';
          if (reg.text.pace) reg.text.pace.textContent = pace500(a.d, elapsed);
        }
      }

      // 4b) 버추얼 페이서 라인(§4b.5, 렌더 전용 — 순위·집계 미영향)
      const preg = pacerRegRef.current;
      if (preg) {
        const pacer = optRef.current.pacer;
        if (pacer && pacer.split500 > 0 && pacer.startedAt != null) {
          const pElapsed = Math.max(0, (now - pacer.startedAt) / 1000);
          const pDist = (500 / pacer.split500) * pElapsed;
          const pPct = Math.min(100, (pDist / maxD) * 100);
          if (preg.line) {
            // 카트 지오메트리(lane 내 left:4% width:92%)와 정렬 — 절대 left%로 환산
            preg.line.style.left = `${(4 + pPct * 0.92).toFixed(2)}%`;
            preg.line.setAttribute('data-active', 'true');
          }
          if (preg.minimapDot) {
            preg.minimapDot.style.left = `${pPct.toFixed(2)}%`;
            preg.minimapDot.setAttribute('data-active', 'true');
          }
          if (preg.label) preg.label.textContent = `PACER ${Math.round(pDist)}m`;
        } else {
          preg.line?.setAttribute('data-active', 'false');
          preg.minimapDot?.setAttribute('data-active', 'false');
        }
      }

      // 4c) 진행바(REMAINING → GOAL) — 선두 거리 기준 fill/잔여 직접 갱신
      const progReg = progressRegRef.current;
      if (progReg && ranked.length > 0) {
        const lead = ranked[0].d;
        const pct = Math.min(100, (lead / maxD) * 100);
        if (progReg.fill) progReg.fill.style.width = `${pct.toFixed(2)}%`;
        if (progReg.remain) {
          progReg.remain.textContent = target && target > 0
            ? `${Math.max(0, Math.round(target - lead))}`
            : `${Math.round(lead)}`;
        }
      }

      // 5) 순위 변동 시에만 콜백(저빈도 setState)
      const orderKey = ranked.map((a) => a.serial).join(',');
      if (orderKey !== lastOrderRef.current) {
        lastOrderRef.current = orderKey;
        optRef.current.onRankChange?.(
          ranked.map((a) => ({ serial: a.serial, lane: a.lane, rank: a.rank, d: a.d, virtual: a.virtual })),
        );
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [samplesRef]);

  return {
    // 병합 등록 — 카트(LaneRow)·HUD 카드·배지 레일이 같은 serial에 각자 부분 등록.
    //   deviceType은 null 등록이 기존 값을 덮지 않도록 보존(등록 순서 무관).
    registerKart: (serial, reg) => {
      const prev = regRef.current.get(serial);
      regRef.current.set(serial, {
        ...prev,
        ...reg,
        deviceType: reg.deviceType ?? prev?.deviceType ?? null,
      });
    },
    unregister: (serial) => regRef.current.delete(serial),
    registerPacer: (reg) => {
      pacerRegRef.current = reg;
    },
    registerProgress: (reg) => {
      progressRegRef.current = reg;
    },
    getLane: (serial) => animatedRef.current.get(serial),
  };
}
