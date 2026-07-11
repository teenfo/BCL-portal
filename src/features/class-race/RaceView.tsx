'use client';

// 아케이드 레이스 관전 (docs/15 ⑤-b) — 게임쇼 스타일 레이아웃(SuperPark 레퍼런스):
//   상단 HUD 스탯 카드(레인별 거리·페이스·SPM·순위) + REMAINING→GOAL 진행바
//   + 사이드뷰 워터 스테이지(스피드 스트릭·리더 글로우) + 하단 응원 관중 실루엣.
// 테마: data-race-theme(event_type) 1곳 전환(R-11). 위치=실거리 비례(R-3, rAF 애니메이터).
// Display-Safe: 이름·기록만(부상·메모 원천 미포함 — race_live_state/broadcast에 없음).
import { useEffect, useRef, useState } from 'react';
import { StatusStrip } from '@/features/class-common';
import { useRaceEvent } from './useRaceEvent';
import { useRaceRealtime, type LaneMeta } from './useRaceRealtime';
import { useRaceAnimator, type RankRow, type Animator } from './useRaceAnimator';
import {
  themeForEvent,
  characterForDevice,
  defaultDeviceForTheme,
  teamColorVar,
  rowerCharSrc,
  poolLaneX,
  POOL,
} from './device-theme';
import type { DeviceType } from '@/features/race-admin/types';
import styles from './race.module.css';

export function RaceView({ eventId }: { eventId: string | null }) {
  const event = useRaceEvent(eventId);
  const rt = useRaceRealtime(eventId);
  const theme = themeForEvent(event.data?.event_type);
  const target = event.data?.target_distance_m ?? null;

  // 버추얼 페이서(§4b.5) — split_500m 있고 enabled일 때만 페이스 라인 렌더(렌더 전용).
  const pacerCfg = event.data?.pacer_config ?? null;
  const pacerLive =
    pacerCfg?.enabled && pacerCfg.split_500m && pacerCfg.split_500m > 0
      ? { split500: pacerCfg.split_500m, startedAt: rt.startedAt, label: pacerCfg.label }
      : null;

  const [ranks, setRanks] = useState<RankRow[]>([]);
  const animator = useRaceAnimator(rt.samplesRef, {
    targetDistance: target,
    onRankChange: setRanks,
    pacer: pacerLive,
  });

  // 진행바(REMAINING → GOAL) DOM 등록 — 선두 기준 rAF 직접 갱신
  const progressFillRef = useRef<HTMLDivElement>(null);
  const progressRemainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    animator.registerProgress({
      fill: progressFillRef.current,
      remain: progressRemainRef.current,
    });
    return () => animator.registerProgress(null);
  }, [animator]);

  // 경과 타이머 — race_start(startedAt) 기준, ref 직접 갱신(리렌더 없음)
  const timerRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!rt.startedAt || rt.lobbyStatus !== 'racing') return;
    const started = rt.startedAt;
    const tick = () => {
      const s = Math.max(0, Math.floor((Date.now() - started) / 1000));
      const mm = Math.floor(s / 60);
      const ss = s % 60;
      if (timerRef.current) timerRef.current.textContent = `${mm}:${ss < 10 ? '0' + ss : ss}`;
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [rt.startedAt, rt.lobbyStatus]);

  // FINAL STRETCH 배너 — 선두가 목표의 85% 돌파 시(1초 저빈도 폴링, 렌더는 racing 게이트).
  //   setState는 interval 콜백에서만(비동기) — effect 본문 직접 setState 금지 규약 준수.
  const [finalStretch, setFinalStretch] = useState(false);
  useEffect(() => {
    if (rt.lobbyStatus !== 'racing' || !target || ranks.length === 0) return;
    const leadSerial = ranks[0].serial;
    const t = setInterval(() => {
      const lead = animator.getLane(leadSerial);
      if (lead) setFinalStretch(lead.d / target >= 0.85);
    }, 1000);
    return () => clearInterval(t);
  }, [rt.lobbyStatus, target, ranks, animator]);

  const lanes = rt.lanes;

  return (
    <div className={styles.raceRoot} data-race-theme={theme}>
      <StatusStrip realtime={rt.connected ? 'connected' : 'connecting'} polling={rt.mode === 'polling'} />

      {/* 톱바 — 스타디움 라이트 + 중앙 타이틀 + 경과 타이머 */}
      <header className={styles.topbar}>
        <span className={styles.lights} aria-hidden="true">
          <i className={styles.light} />
          <i className={styles.light} />
          <i className={styles.light} />
          <i className={styles.light} />
        </span>
        <div className={styles.topbarName}>{event.data?.name ?? 'RACE'}</div>
        <div className={styles.topbarMeta}>
          {event.data?.heat_no && event.data.heat_no > 1 ? (
            <span className={styles.heatBadge}>HEAT {event.data.heat_no}</span>
          ) : null}
          {target ? <span>목표 {target}m</span> : null}
          <span className={styles.topbarTimer} ref={timerRef}>
            0:00
          </span>
        </div>
      </header>

      {/* HUD 스탯 카드 — 레인별 거리·페이스·SPM·순위 (rAF 직접 갱신) */}
      <div className={styles.hudRow} data-count={lanes.length}>
        {lanes.map((l, i) => (
          <HudCard
            key={l.serial}
            meta={l}
            index={i}
            animator={animator}
            deviceType={l.device_type ?? defaultDeviceForTheme(theme)}
          />
        ))}
      </div>

      {/* 진행바 — REMAINING → GOAL */}
      {target ? (
        <div className={styles.progressBar}>
          <span className={styles.progressLabel}>
            남은 거리 <b ref={progressRemainRef}>--</b>m
          </span>
          <div className={styles.progressTrack}>
            <div ref={progressFillRef} className={styles.progressFill} />
          </div>
          <span className={styles.progressGoal}>{target}m GOAL</span>
        </div>
      ) : null}

      {/* 수영장 아레나 스테이지 — 상단(수면 시작) 출발 → 하단(데크 레인번호) 피니시.
          레인 = 배경 도장 번호 1~9 라인, 위치는 실거리 비례(poolLaneX + POOL, rAF 이동) */}
      <div className={styles.stage}>
        <div className={styles.stageCrowd} aria-hidden />
        <div className={styles.badgeRail}>
          {lanes.map((l, i) => (
            <RailBadge key={l.serial} meta={l} index={i} animator={animator} />
          ))}
        </div>
        {lanes.map((l, i) => {
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
              waiting={rt.lobbyStatus === 'lobby' || rt.lobbyStatus === 'countdown'}
            />
          );
        })}
      </div>

      {/* 응원 관중 실루엣 */}
      <div className={styles.crowd} aria-hidden />

      {/* FINAL STRETCH 배너 — racing 상태에서만 노출(비racing 잔존값 게이트) */}
      {rt.lobbyStatus === 'racing' && finalStretch ? (
        <div className={styles.finalBanner} aria-hidden>
          FINAL STRETCH!
        </div>
      ) : null}

      {/* 상태 오버레이 */}
      {rt.lobbyStatus === 'lobby' ? <StateOverlay label="STARTING PEN" sub="참가자 대기 중" /> : null}
      {rt.lobbyStatus === 'countdown' ? <CountdownOverlay /> : null}
      {rt.lobbyStatus === 'finished' ? <StateOverlay label="FINISH" sub="결과 집계 중" /> : null}
    </div>
  );
}

// HUD 스탯 카드 — 애니메이터에 text/card 부분 등록(카트와 병합, rAF 직접 갱신)
function HudCard({
  meta,
  index,
  animator,
  deviceType,
}: {
  meta: LaneMeta;
  index: number;
  animator: Animator;
  deviceType: DeviceType;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dRef = useRef<HTMLElement>(null);
  const paceRef = useRef<HTMLElement>(null);
  const spmRef = useRef<HTMLElement>(null);

  useEffect(() => {
    animator.registerKart(meta.serial, {
      card: cardRef.current,
      text: { d: dRef.current, pace: paceRef.current, spm: spmRef.current },
      deviceType,
    });
    // 카드만 해제(카트 등록은 LaneRow 소유) — 화면 단위 unmount라 전체 해제로 충분
  }, [meta.serial, deviceType, animator]);

  return (
    <div
      ref={cardRef}
      className={styles.hudCard}
      style={{ ['--team-color' as string]: teamColorVar(index) }}
    >
      <div className={styles.hudHead}>
        <span className={styles.hudLane}>ERG {meta.lane}</span>
        <span className={styles.hudName}>{meta.member_name ?? `레인 ${meta.lane}`}</span>
      </div>
      <div className={styles.hudMain}>
        <b ref={dRef}>0</b>
        <span className={styles.hudUnit}>m</span>
      </div>
      <div className={styles.hudSub}>
        <span>
          <b ref={paceRef}>--:--</b>/500m
        </span>
        <span>
          <b ref={spmRef}>--</b> SPM
        </span>
      </div>
    </div>
  );
}

// 상단 배지 레일 슬롯 — 출발선(레인 라인 상단 x)에 정렬, kartD(거리)만 부분 등록
function RailBadge({
  meta,
  index,
  animator,
}: {
  meta: LaneMeta;
  index: number;
  animator: Animator;
}) {
  const dRef = useRef<HTMLElement>(null);
  useEffect(() => {
    animator.registerKart(meta.serial, { kartD: dRef.current, deviceType: null });
  }, [meta.serial, animator]);
  if (meta.virtual) return null;
  const { xt } = poolLaneX(meta.lane ?? index + 1);
  return (
    <span
      className={styles.railBadge}
      style={{ left: `${xt}%`, ['--team-color' as string]: teamColorVar(index) }}
    >
      <em>ERG {meta.lane}</em>
      <b ref={dRef}>0</b>m
    </span>
  );
}

function LaneRow({
  meta,
  index,
  glyph,
  deviceType,
  register,
  unregister,
  waiting,
}: {
  meta: LaneMeta;
  index: number;
  glyph: string;
  deviceType: DeviceType;
  register: Animator['registerKart'];
  unregister: Animator['unregister'];
  /** 출발 대기(로비·카운트다운) — 정면 대기 스프라이트 + 모션 연출 정지 */
  waiting: boolean;
}) {
  const kartRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const lane = poolLaneX(meta.lane ?? index + 1);

  useEffect(() => {
    register(meta.serial, {
      kart: kartRef.current,
      lanePath: poolLaneX(meta.lane ?? index + 1),
      sprite: spriteRef.current,
      deviceType,
    });
    return () => unregister(meta.serial);
  }, [meta.serial, meta.lane, index, deviceType, register, unregister]);

  return (
    <div
      ref={kartRef}
      className={styles.kart}
      data-virtual={meta.virtual ? 'true' : 'false'}
      style={{
        ['--team-color' as string]: teamColorVar(index),
        // 초기(로비/출발 전) 위치 = 출발선 — 첫 rAF 프레임 전 표시용
        left: `${lane.xt}%`,
        top: `${POOL.yTop}%`,
        transform: `translate(-50%, -100%) scale(${POOL.sTop})`,
      }}
    >
      {/* 밴드 회전 상쇄 — 스프라이트/이름은 화면 기준 수직 */}
      <span className={styles.kartLift}>
        {/* data-idle 초기값 true — 첫 샘플 전(출발 대기) 스트릭/물보라/로킹 정지, 이후 애니메이터가 갱신 */}
        <div ref={spriteRef} className={styles.kartSprite} data-idle="true">
          {deviceType === 'rower' ? (
            // 레퍼런스 원화 컷아웃(레인 순환) — 대기=정면 뷰, 레이스=3/4 로잉 뷰(SPM 로킹)
            // eslint-disable-next-line @next/next/no-img-element -- rAF 스테이지 자산, next/image 불필요
            <img
              src={rowerCharSrc(index, waiting ? 'wait' : 'race')}
              alt=""
              className={styles.charImg}
              data-wait={waiting ? 'true' : 'false'}
              draggable={false}
            />
          ) : (
            glyph
          )}
        </div>
        <span className={styles.kartName}>
          {meta.virtual ? 'PACER' : meta.member_name ?? `레인 ${index + 1}`}
        </span>
      </span>
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
