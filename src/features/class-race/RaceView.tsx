'use client';

// 2.5D 카트레이싱 관전 (docs/15 ⑤-b) — CSS3D 트랙 + 레인 카트 + HUD.
// 테마: data-race-theme(event_type) 1곳 전환(R-11). 위치=실거리 비례(R-3, 애니메이터).
// Display-Safe: 이름·기록만(부상·메모 원천 미포함 — race_live_state/broadcast에 없음).
import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusStrip } from '@/features/class-common';
import { useRaceEvent } from './useRaceEvent';
import { useRaceRealtime, type LaneMeta } from './useRaceRealtime';
import { useRaceAnimator, type RankRow } from './useRaceAnimator';
import {
  themeForEvent,
  characterForDevice,
  defaultDeviceForTheme,
  teamColorVar,
} from './device-theme';
import styles from './race.module.css';

export function RaceView({ eventId }: { eventId: string | null }) {
  const event = useRaceEvent(eventId);
  const rt = useRaceRealtime(eventId);
  const theme = themeForEvent(event.data?.event_type);
  const target = event.data?.target_distance_m ?? null;

  const [ranks, setRanks] = useState<RankRow[]>([]);
  const animator = useRaceAnimator(rt.samplesRef, {
    targetDistance: target,
    onRankChange: setRanks,
  });

  const lanes = rt.lanes;
  const laneBySerial = useMemo(() => {
    const m = new Map<string, LaneMeta>();
    lanes.forEach((l) => m.set(l.serial, l));
    return m;
  }, [lanes]);

  return (
    <div className={styles.raceRoot} data-race-theme={theme}>
      <StatusStrip realtime={rt.connected ? 'connected' : 'connecting'} polling={rt.mode === 'polling'} />

      {/* 톱바 */}
      <header className={styles.topbar}>
        <div className={styles.topbarName}>{event.data?.name ?? 'RACE'}</div>
        <div className={styles.topbarMeta}>
          {event.data?.heat_no && event.data.heat_no > 1 ? (
            <span className={styles.heatBadge}>HEAT {event.data.heat_no}</span>
          ) : null}
          {target ? <span>목표 {target}m</span> : null}
        </div>
      </header>

      {/* 트랙 + 순위 스택 */}
      <div className={styles.stage}>
        <aside className={styles.rankStack}>
          {ranks.slice(0, 8).map((r) => {
            const meta = laneBySerial.get(r.serial);
            const lead = ranks[0]?.d ?? 0;
            return (
              <div key={r.serial} className={styles.rankRow} data-rank={r.rank}>
                <span className={styles.rankNum}>{r.rank}</span>
                <span
                  className={styles.rankDot}
                  style={{ background: teamColorVar(r.lane - 1) }}
                />
                <span className={styles.rankName}>
                  {meta?.member_name ?? `레인 ${r.lane}`}
                </span>
                <span className={styles.rankGap}>
                  {r.rank === 1 ? '선두' : `-${Math.round(lead - r.d)}m`}
                </span>
              </div>
            );
          })}
        </aside>

        <div className={styles.track}>
          <div className={styles.trackSky} />
          <div className={styles.trackSurface}>
            {lanes.map((l, i) => {
              // R-11: 레인별 device_type이 캐릭터 테마를 구동(혼합 편성). 없으면 트랙 테마 폴백.
              const deviceType = l.device_type ?? defaultDeviceForTheme(theme);
              const character = characterForDevice(deviceType);
              return (
                <LaneRow
                  key={l.serial}
                  meta={l}
                  index={i}
                  glyph={character.glyph}
                  register={animator.registerKart}
                  unregister={animator.unregister}
                  deviceType={deviceType}
                />
              );
            })}
          </div>
          <div className={styles.finishLine} aria-hidden />
        </div>
      </div>

      {/* 미니맵 */}
      <div className={styles.minimap}>
        <div className={styles.minimapTrack}>
          {ranks.map((r) => (
            <span
              key={r.serial}
              className={styles.minimapDot}
              style={{
                left: `${Math.min(100, (r.d / (target || Math.max(1, ranks[0]?.d ?? 1))) * 100)}%`,
                background: teamColorVar(r.lane - 1),
              }}
            />
          ))}
        </div>
      </div>

      {/* 상태 오버레이 */}
      {rt.lobbyStatus === 'lobby' ? <StateOverlay label="STARTING PEN" sub="참가자 대기 중" /> : null}
      {rt.lobbyStatus === 'countdown' ? <CountdownOverlay /> : null}
      {rt.lobbyStatus === 'finished' ? <StateOverlay label="FINISH" sub="결과 집계 중" /> : null}
    </div>
  );
}

function LaneRow({
  meta,
  index,
  glyph,
  deviceType,
  register,
  unregister,
}: {
  meta: LaneMeta;
  index: number;
  glyph: string;
  deviceType: ReturnType<typeof defaultDeviceForTheme>;
  register: ReturnType<typeof useRaceAnimator>['registerKart'];
  unregister: ReturnType<typeof useRaceAnimator>['unregister'];
}) {
  const kartRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    register(meta.serial, { kart: kartRef.current, sprite: spriteRef.current, deviceType });
    return () => unregister(meta.serial);
  }, [meta.serial, deviceType, register, unregister]);

  return (
    <div className={styles.lane}>
      <span className={styles.laneLabel}>{index + 1}</span>
      <div ref={kartRef} className={styles.kart} data-virtual={meta.virtual ? 'true' : 'false'}>
        <div
          ref={spriteRef}
          className={styles.kartSprite}
          style={{ ['--team-color' as string]: teamColorVar(index) }}
        >
          {glyph}
        </div>
        <span className={styles.kartName}>{meta.virtual ? 'PACER' : meta.member_name ?? `레인 ${index + 1}`}</span>
      </div>
    </div>
  );
}

function StateOverlay({ label, sub }: { label: string; sub: string }) {
  return (
    <div className={styles.stateOverlay}>
      <div className={styles.stateLabel}>{label}</div>
      <div className={styles.stateSub}>{sub}</div>
    </div>
  );
}

// 신호등 카운트다운 — race_start broadcast 기준(로컬 타이머 금지 3-8): 여기선 표시 연출만.
function CountdownOverlay() {
  const [n, setN] = useState(5);
  useEffect(() => {
    if (n <= 0) return;
    const t = setTimeout(() => setN((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <div className={styles.countdownOverlay}>
      <div className={styles.trafficLight} data-n={n}>
        {n > 0 ? n : 'GO'}
      </div>
    </div>
  );
}
