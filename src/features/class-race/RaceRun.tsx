'use client';

// ERG 데이터 그리드(서브 스크린) (docs/15 §5.2) — 레인 타일, rAF 숫자 트윈(애니메이터 text 등록).
// 팀전=race_teams 이름·컬러 동적 매핑(하드코딩 금지 M-5). Display-Safe: 이름·기록만.
import { useEffect, useRef } from 'react';
import { StatusStrip } from '@/features/class-common';
import { useRaceEvent } from './useRaceEvent';
import { useRaceRealtime, type LaneMeta } from './useRaceRealtime';
import { useRaceAnimator } from './useRaceAnimator';
import { themeForEvent, defaultDeviceForTheme, characterForDevice, teamColorVar } from './device-theme';
import styles from './race.module.css';

export function RaceRun({ eventId }: { eventId: string | null }) {
  const event = useRaceEvent(eventId);
  const rt = useRaceRealtime(eventId);
  const theme = themeForEvent(event.data?.event_type);
  // 헤더 라벨은 트랙 테마 기본 rate — 타일별 실제 라벨은 레인 device_type로 개별 산정.
  const headerRateLabel = characterForDevice(defaultDeviceForTheme(theme)).rateLabel;
  const animator = useRaceAnimator(rt.samplesRef, {
    targetDistance: event.data?.target_distance_m ?? null,
    startedAt: rt.startedAt,
  });

  return (
    <div className={styles.runRoot} data-race-theme={theme}>
      <StatusStrip realtime={rt.connected ? 'connected' : 'connecting'} polling={rt.mode === 'polling'} />
      <header className={styles.topbar}>
        <div className={styles.topbarName}>{event.data?.name ?? 'RACE'}</div>
        <div className={styles.topbarMeta}>{headerRateLabel} · 실시간</div>
      </header>
      <div className={styles.grid} data-count={rt.lanes.length}>
        {rt.lanes.map((l, i) => {
          // R-11: 레인별 device_type이 캐릭터/rate 라벨 구동. 없으면 트랙 테마 폴백.
          const deviceType = l.device_type ?? defaultDeviceForTheme(theme);
          const rateLabel = characterForDevice(deviceType).rateLabel;
          return (
            <GridTile
              key={l.serial}
              meta={l}
              index={i}
              rateLabel={rateLabel}
              deviceType={deviceType}
              register={animator.registerKart}
              unregister={animator.unregister}
            />
          );
        })}
      </div>
    </div>
  );
}

function GridTile({
  meta,
  index,
  rateLabel,
  deviceType,
  register,
  unregister,
}: {
  meta: LaneMeta;
  index: number;
  rateLabel: string;
  deviceType: ReturnType<typeof defaultDeviceForTheme>;
  register: ReturnType<typeof useRaceAnimator>['registerKart'];
  unregister: ReturnType<typeof useRaceAnimator>['unregister'];
}) {
  const dRef = useRef<HTMLSpanElement>(null);
  const pRef = useRef<HTMLSpanElement>(null);
  const spmRef = useRef<HTMLSpanElement>(null);
  const hrRef = useRef<HTMLSpanElement>(null);
  const paceRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    register(meta.serial, {
      deviceType,
      text: {
        d: dRef.current,
        p: pRef.current,
        spm: spmRef.current,
        hr: hrRef.current,
        pace: paceRef.current,
      },
    });
    return () => unregister(meta.serial);
  }, [meta.serial, deviceType, register, unregister]);

  return (
    <div className={styles.tile} style={{ borderColor: teamColorVar(index) }}>
      <div className={styles.tileHead}>
        <span className={styles.tileLane}>{index + 1}</span>
        <span className={styles.tileName}>{meta.member_name ?? `레인 ${index + 1}`}</span>
      </div>
      <div className={styles.tileMain}>
        <span ref={dRef} className={styles.tileDist}>
          0
        </span>
        <span className={styles.tileUnit}>m</span>
      </div>
      <div className={styles.tileStats}>
        <span>
          <b ref={paceRef}>--:--</b> /500m
        </span>
        <span>
          <b ref={pRef}>0</b> W
        </span>
        <span>
          <b ref={spmRef}>0</b> {rateLabel}
        </span>
        <span>
          ❤ <b ref={hrRef}>--</b>
        </span>
      </div>
    </div>
  );
}
