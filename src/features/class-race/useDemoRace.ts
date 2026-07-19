'use client';

// 데모 레이스 드라이버 — Supabase 없이 관전 화면(3D 스테이지·HUD)을 로컬 구동.
//   /class/race/view?event=demo 로 진입(QA·쇼룸·오프라인 데모). 비파괴: 네트워크/DB 미사용.
//   대기(3s) → 카운트다운(3s, 승선 연출) → 레이스 → 전원 피니시 → 5s 후 리셋 루프.
import { useEffect, useRef, useState } from 'react';
import type { RaceRealtime, RawSample, LaneMeta, LobbyStatus } from './useRaceRealtime';

export const DEMO_EVENT_ID = 'demo';
const DEMO_TARGET_M = 300;
const NAMES = ['김도현', '이서준', '박민재', '정하윤', '최유나', '강태오'];
const TICK_MS = 300;
const LOBBY_MS = 3000;
const COUNTDOWN_MS = 3000;
const RESET_MS = 5000;

export function useDemoRace(enabled: boolean): { rt: RaceRealtime; target: number } {
  const samplesRef = useRef<Map<string, RawSample>>(new Map());
  // enabled(?event=demo)는 페이지 수명 동안 불변 — 편성은 초기값으로 구성(effect setState 금지 규약)
  const [lanes] = useState<LaneMeta[]>(() =>
    enabled
      ? NAMES.map((name, i) => ({
          lane: i + 1,
          serial: `demo:${i + 1}`,
          device_id: null,
          member_id: null,
          member_name: name,
          team_id: null,
          virtual: false,
          device_type: 'rower' as const,
        }))
      : [],
  );
  const [lobbyStatus, setLobbyStatus] = useState<LobbyStatus>('lobby');
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const samples = samplesRef.current;

    // ?glow=1 — 페이스 티어 오로라 검수 모드: 레인별 고정 페이스(없음/파랑/초록/노랑/빨강×2)
    const glowDemo = new URLSearchParams(window.location.search).has('glow');
    // 레인별 스플릿(빠른 데모 페이스) — 선두 경쟁 연출
    const splits = glowDemo ? [110, 103, 97, 92, 87, 84] : NAMES.map((_, i) => 40 + i * 2.4);
    const dist = NAMES.map(() => 0);
    const spurtUntil = NAMES.map(() => 0); // 랜덤 스퍼트(급가속) — 부스터 연출 확인용
    let phase: 'lobby' | 'countdown' | 'racing' | 'finished' = 'lobby';
    let phaseAt = Date.now();
    let last = performance.now();

    const timer = setInterval(() => {
      const now = Date.now();
      const t = performance.now();
      const dt = Math.min(2, (t - last) / 1000);
      last = t;

      if (phase === 'lobby' && now - phaseAt >= LOBBY_MS) {
        phase = 'countdown';
        phaseAt = now;
        setLobbyStatus('countdown');
      } else if (phase === 'countdown' && now - phaseAt >= COUNTDOWN_MS) {
        phase = 'racing';
        phaseAt = now;
        setLobbyStatus('racing');
        setStartedAt(now);
      } else if (phase === 'racing') {
        let allDone = true;
        dist.forEach((d, i) => {
          if (d < DEMO_TARGET_M) {
            if (!glowDemo && spurtUntil[i] <= now && d > 30 && Math.random() < 0.012)
              spurtUntil[i] = now + 2500;
            const spurt = spurtUntil[i] > now ? 1.55 : 1;
            const jitter = glowDemo ? 1 : 1 + (Math.random() * 2 - 1) * 0.07;
            dist[i] = Math.min(DEMO_TARGET_M, d + (500 / splits[i]) * spurt * jitter * dt);
          }
          if (dist[i] < DEMO_TARGET_M) allDone = false;
        });
        if (allDone) {
          phase = 'finished';
          phaseAt = now;
          setLobbyStatus('finished');
        }
      } else if (phase === 'finished' && now - phaseAt >= RESET_MS) {
        phase = 'lobby';
        phaseAt = now;
        dist.fill(0);
        samples.clear();
        setLobbyStatus('lobby');
        setStartedAt(null);
        return;
      }

      if (phase !== 'lobby') {
        NAMES.forEach((_, i) => {
          const racing = phase === 'racing' && dist[i] < DEMO_TARGET_M;
          samples.set(`demo:${i + 1}`, {
            serial: `demo:${i + 1}`,
            lane: i + 1,
            d: Math.round(dist[i] * 10) / 10,
            p: racing ? 180 + Math.round(Math.random() * 60) : 0,
            spm: racing ? 26 + Math.round(Math.random() * 6) + (spurtUntil[i] > now ? 5 : 0) : 0,
            hr: null,
            maxW: 260,
            virtual: false,
            lastAt: now,
            connection: 'racing',
          });
        });
      }
    }, TICK_MS);

    return () => {
      clearInterval(timer);
      samples.clear();
    };
  }, [enabled]);

  return {
    rt: { samplesRef, lanes, lobbyStatus, mode: 'broadcast', connected: true, startedAt },
    target: DEMO_TARGET_M,
  };
}
