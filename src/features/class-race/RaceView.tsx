'use client';

// 아케이드 레이스 관전 (docs/15 ⑤-b) — 게임쇼 스타일 레이아웃(SuperPark 레퍼런스):
//   상단 HUD 스탯 카드(레인별 거리·페이스·SPM·순위)
//   + 수영장 아레나 스테이지(상단 출발→하단 피니시, 스피드 스트릭·리더 글로우).
// 테마: data-race-theme(event_type) 1곳 전환(R-11). 위치=실거리 비례(R-3, rAF 애니메이터).
// Display-Safe: 이름·기록만(부상·메모 원천 미포함 — race_live_state/broadcast에 없음).
import { useEffect, useRef, useState } from 'react';
import { StatusStrip } from '@/features/class-common';
import { useRaceEvent } from './useRaceEvent';
import { useRaceRealtime, type LaneMeta } from './useRaceRealtime';
import { useRaceAnimator, type RankRow, type Animator } from './useRaceAnimator';
import { useDemoRace, DEMO_EVENT_ID } from './useDemoRace';
import { RaceStage3D } from './RaceStage3D';
import { themeForEvent, defaultDeviceForTheme, teamColorVar, poolLaneX } from './device-theme';
import type { DeviceType } from '@/features/race-admin/types';
import styles from './race.module.css';

export function RaceView({ eventId }: { eventId: string | null }) {
  // 데모 모드(?event=demo) — Supabase 없이 로컬 드라이버로 구동(QA·쇼룸)
  const isDemo = eventId === DEMO_EVENT_ID;
  const event = useRaceEvent(isDemo ? null : eventId);
  const realRt = useRaceRealtime(isDemo ? null : eventId);
  const demo = useDemoRace(isDemo);
  const rt = isDemo ? demo.rt : realRt;
  const theme = isDemo ? 'water' : themeForEvent(event.data?.event_type);
  const target = isDemo ? demo.target : (event.data?.target_distance_m ?? null);

  // 버추얼 페이서(§4b.5) — split_500m 있고 enabled일 때만 페이스 라인 렌더(렌더 전용).
  const pacerCfg = event.data?.pacer_config ?? null;
  const pacerLive =
    pacerCfg?.enabled && pacerCfg.split_500m && pacerCfg.split_500m > 0
      ? { split500: pacerCfg.split_500m, startedAt: rt.startedAt, label: pacerCfg.label }
      : null;

  // 가로 코스 비교 모드(?course=h) — SSR 마크업과의 hydration 불일치를 피해 마운트 후 반영
  //   (effect 본문 직접 setState 금지 규약 — 비동기 콜백에서만)
  const [courseH, setCourseH] = useState(false);
  useEffect(() => {
    const id = setTimeout(
      () => setCourseH(new URLSearchParams(window.location.search).get('course') === 'h'),
      0,
    );
    return () => clearTimeout(id);
  }, []);

  const [ranks, setRanks] = useState<RankRow[]>([]);
  const animator = useRaceAnimator(rt.samplesRef, {
    targetDistance: target,
    startedAt: rt.startedAt,
    onRankChange: setRanks,
    pacer: pacerLive,
  });

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

  // START 배너 — 카운트다운 → 레이싱 전환 순간 2초(FINAL STRETCH 동형)
  const [startBanner, setStartBanner] = useState(false);
  const prevStatusRef = useRef(rt.lobbyStatus);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = rt.lobbyStatus;
    if (prev === 'countdown' && rt.lobbyStatus === 'racing') {
      setStartBanner(true);
      const t = setTimeout(() => setStartBanner(false), 2000);
      return () => clearTimeout(t);
    }
  }, [rt.lobbyStatus]);

  // 도착 순서(등수) — 원시 샘플 d ≥ target-1 최초 도달 순. 동시 도달은 d 내림차순.
  //   리셋(로비 복귀) 시 초기화. setState는 interval 콜백에서만(규약).
  const [finishOrder, setFinishOrder] = useState<string[]>([]);
  useEffect(() => {
    const t = setInterval(() => {
      setFinishOrder((prev) => {
        if (rt.lobbyStatus === 'lobby' || rt.lobbyStatus === 'countdown') {
          return prev.length ? [] : prev;
        }
        if (!target || lanes.length === 0) return prev;
        const newly = lanes
          .filter(
            (l) =>
              !prev.includes(l.serial) &&
              (rt.samplesRef.current.get(l.serial)?.d ?? 0) >= target - 1,
          )
          .sort(
            (a, b) =>
              (rt.samplesRef.current.get(b.serial)?.d ?? 0) -
              (rt.samplesRef.current.get(a.serial)?.d ?? 0),
          )
          .map((l) => l.serial);
        return newly.length ? [...prev, ...newly] : prev;
      });
    }, 300);
    return () => clearInterval(t);
  }, [target, lanes, rt.lobbyStatus, rt.samplesRef]);

  return (
    <div className={styles.raceRoot} data-race-theme={theme} data-course={courseH ? 'h' : 'v'}>
      <StatusStrip realtime={rt.connected ? 'connected' : 'connecting'} polling={rt.mode === 'polling'} />

      {/* 톱바 — 스타디움 라이트 + 중앙 타이틀 + 경과 타이머 */}
      <header className={styles.topbar}>
        <span className={styles.lights} aria-hidden="true">
          <i className={styles.light} />
          <i className={styles.light} />
          <i className={styles.light} />
          <i className={styles.light} />
        </span>
        <div className={styles.topbarName}>{event.data?.name ?? (isDemo ? 'DEMO RACE' : 'RACE')}</div>
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
            place={finishOrder.indexOf(l.serial) + 1 || null}
          />
        ))}
      </div>

      {/* 수영장 아레나 스테이지 — 상단(수면 시작) 출발 → 하단(데크) 피니시.
          캐릭터/이펙트는 three.js 캔버스(RaceStage3D)가 렌더 — 지오메트리는 poolLaneX/POOL 공유 */}
      <div className={styles.stage}>
        <div className={styles.stageCrowd} aria-hidden />
        <RaceStage3D
          lanes={lanes}
          samplesRef={rt.samplesRef}
          target={target}
          lobbyStatus={rt.lobbyStatus}
          defaultDevice={defaultDeviceForTheme(theme)}
          finishOrder={finishOrder}
        />
        {/* 배지 레일 — 세로: 상단 가로 레일 / 가로 코스: 우측 데크 타일 밴드에 레인별 세로 정렬 */}
        <div className={styles.badgeRail}>
          {lanes.map((l, i) => (
            <RailBadge key={l.serial} meta={l} index={i} count={lanes.length} animator={animator} courseH={courseH} />
          ))}
        </div>
      </div>

      {/* 응원 관중 실루엣 */}
      <div className={styles.crowd} aria-hidden />

      {/* START 배너 — 카운트다운 종료 직후 2초 */}
      {startBanner ? (
        <div className={styles.finalBanner} data-kind="start" aria-hidden>
          START!
        </div>
      ) : null}

      {/* FINAL STRETCH 배너 — racing 상태에서만 노출(비racing 잔존값 게이트) */}
      {rt.lobbyStatus === 'racing' && finalStretch && !startBanner ? (
        <div className={styles.finalBanner} aria-hidden>
          FINAL STRETCH!
        </div>
      ) : null}

      {/* 상태 오버레이 */}
      {rt.lobbyStatus === 'lobby' ? <StateOverlay label="STARTING PEN" sub="참가자 대기 중" /> : null}
      {rt.lobbyStatus === 'countdown' ? <CountdownOverlay /> : null}
      {rt.lobbyStatus === 'finished' ? <StateOverlay label="FINISH" sub="결과 집계 중" kind="finish" /> : null}
    </div>
  );
}

// HUD 스탯 카드 — 애니메이터에 text/card 부분 등록(카트와 병합, rAF 직접 갱신)
function HudCard({
  meta,
  index,
  animator,
  deviceType,
  place,
}: {
  meta: LaneMeta;
  index: number;
  animator: Animator;
  deviceType: DeviceType;
  /** 도착 등수(1~) — 미도착 null. 표시는 도착 순서 고정(현재 순위와 별개) */
  place: number | null;
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
      data-finished={place != null ? 'true' : undefined}
      style={{ ['--team-color' as string]: teamColorVar(index) }}
    >
      {place != null ? (
        <span className={styles.hudPlace} data-place={Math.min(place, 4)}>
          {place}위
        </span>
      ) : null}
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

// 상단 배지 레일 슬롯 — 출발선(레인 상단 x)에 정렬, kartD(거리)만 부분 등록
function RailBadge({
  meta,
  index,
  count,
  animator,
  courseH,
}: {
  meta: LaneMeta;
  index: number;
  count: number;
  animator: Animator;
  courseH: boolean;
}) {
  const dRef = useRef<HTMLElement>(null);
  useEffect(() => {
    animator.registerKart(meta.serial, { kartD: dRef.current, deviceType: null });
  }, [meta.serial, animator]);
  if (meta.virtual) return null;
  const { xt } = poolLaneX(index, count);
  // 가로 코스: 우측 데크 타일 밴드(x 96.5%)에 레인 행(y 16~89% — RaceStage3D POOL_H와 동기) 정렬
  const laneY = 16 + (count > 1 ? (89 - 16) / (count - 1) : 0) * index;
  const pos = courseH ? { left: '95%', top: `${laneY}%` } : { left: `${xt}%` };
  return (
    <span
      className={styles.railBadge}
      style={{ ...pos, ['--team-color' as string]: teamColorVar(index) }}
    >
      <em>ERG {meta.lane}</em>
      <b ref={dRef}>0m</b>
    </span>
  );
}

function StateOverlay({ label, sub, kind }: { label: string; sub: string; kind?: 'finish' }) {
  return (
    <div className={styles.stateOverlay} data-kind={kind}>
      <div className={styles.stateLabel}>{label}</div>
      <div className={styles.stateSub}>{sub}</div>
    </div>
  );
}

// 신호등 카운트다운 3·2·1 — race_start broadcast 기준(로컬 타이머 금지 3-8): 여기선 표시 연출만.
//   시작(START) 표시는 racing 전환 시 START 배너가 담당.
function CountdownOverlay() {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n <= 1) return;
    const t = setTimeout(() => setN((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <div className={styles.countdownOverlay}>
      <div className={styles.trafficLight} data-n={n}>
        {n}
      </div>
    </div>
  );
}
