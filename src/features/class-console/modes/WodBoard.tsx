'use client';

// WOD 보드 표시 전용 컴포넌트 (docs/05 §3.2) — 데이터 페치 없음(순수 프레젠테이션).
// WodMode(전체화면)와 SplitMode(좌측 페인)가 공유한다. Display-Safe: 공개 스냅샷만.
import type { DisplayWod, WodMovement } from '../data';
import { useEffect, useRef, useState } from 'react';
import styles from '../console.module.css';

const FORMAT_LABEL: Record<string, string> = {
  for_time: 'FOR TIME',
  amrap: 'AMRAP',
  emom: 'EMOM',
  tabata: 'TABATA',
  chipper: 'CHIPPER',
  strength: 'STRENGTH',
  custom: 'CUSTOM',
  station_circuit: 'STATION CIRCUIT',
};

function fmtLabel(f: string | null): string {
  if (!f) return 'WOD';
  return FORMAT_LABEL[f] ?? f.toUpperCase();
}

function movementLine(m: WodMovement): { name: string; detail: string; rx: string } {
  const name = String(m.name ?? m.movement ?? '').trim();
  // 정본 스냅샷 키(WodPanel: target_value/target_unit·load_*_rx) 우선, 구 키(reps/target·rx_*) 폴백
  //   — 키 불일치로 TV에서 수량·중량이 통째로 빠지던 결함 수정
  const tv =
    m.target_value != null && String(m.target_value).trim() !== ''
      ? `${m.target_value}${m.target_unit ?? ''}`
      : '';
  const reps = m.reps != null ? String(m.reps) : '';
  const target = m.target ? String(m.target) : '';
  const detail = tv || [reps, target].filter(Boolean).join(' · ');
  const loadM = m.load_male_rx ?? m.rx_male;
  const loadF = m.load_female_rx ?? m.rx_female;
  const rx = [loadM ? `♂ ${loadM}` : '', loadF ? `♀ ${loadF}` : ''].filter(Boolean).join('   ');
  return { name, detail, rx };
}

/** 연속 동일 superset_group 을 하나의 세그먼트로 묶는다. null 그룹은 단독 세그먼트. */
interface Segment {
  group: string | null;
  items: WodMovement[];
}
function segmentMovements(movements: WodMovement[]): Segment[] {
  const segs: Segment[] = [];
  for (const m of movements) {
    const raw = typeof m.superset_group === 'string' ? m.superset_group.trim() : '';
    const group = raw || null;
    const last = segs[segs.length - 1];
    if (group && last && last.group === group) {
      last.items.push(m);
    } else {
      segs.push({ group, items: [m] });
    }
  }
  return segs;
}

/** 코칭 포인트 한 줄 문자열을 표시용 항목으로 분해(줄바꿈 → 문장 순). 최대 3개. */
function demoPoints(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const parts = lines.length > 1 ? lines : text.split(/(?<=[.。])\s+/);
  return parts
    .map((s) => s.trim().replace(/[.。]$/, ''))
    .filter(Boolean)
    .slice(0, 3);
}

/** WOD 보드 마크업. className으로 컨테이너 배치 제어(전체화면 vs 좌측 페인) */
/**
 * WOD 보드.
 * @param pageSize 한 화면에 보일 줄 수 — 넘치면 8초 간격 페이지 로테이션(TV는 스크롤이 없어
 *                 잘린 동작이 영영 안 보인다). 미지정=전량 표시(전체화면 모드).
 */
export function WodBoard({
  data,
  className,
  pageSize,
  autoFit,
  movementIdx,
}: {
  data: DisplayWod;
  className?: string;
  pageSize?: number;
  /** 카드 높이를 실측해 들어갈 줄 수를 스스로 정한다(WOD 길이·설명 유무와 무관) */
  autoFit?: boolean;
  /**
   * 표시할 동작 인덱스(movements_snapshot 기준). 미지정/빈 배열 = 전체.
   * 지정 시 그 동작만 보이고, 첫 동작의 시범 자료(영상·코칭 포인트)가 아래 붙는다
   * — 수업 세그먼트별 콘텐츠 바인딩(기획서 1-1).
   */
  movementIdx?: number[];
}) {
  const all = Array.isArray(data.movements_snapshot) ? data.movements_snapshot : [];
  // 인덱스 필터 — 범위 밖/중복은 버린다. 결과가 비면 필터를 무시(전체 표시)해 빈 화면 방지
  const focusIdx = Array.isArray(movementIdx)
    ? [...new Set(movementIdx)].filter((i) => Number.isInteger(i) && i >= 0 && i < all.length)
    : [];
  const focused = focusIdx.length > 0;
  const movements = focused ? focusIdx.map((i) => all[i]) : all;
  const groups = segmentMovements(movements);

  // 시범 자료 — 바인딩된 첫 동작 기준(전체 표시 중에는 띄우지 않는다: 무엇의 시범인지 모호)
  const demoOf = focused ? movements[0] : null;
  const demo =
    demoOf && (demoOf.demo_video_url || demoOf.demo_thumb_url || demoOf.demo_points)
      ? {
          name: String(demoOf.name ?? '').trim(),
          video: demoOf.demo_video_url ?? null,
          thumb: demoOf.demo_thumb_url ?? null,
          points: demoOf.demo_points ? demoPoints(demoOf.demo_points) : [],
        }
      : null;

  // 실측 자동 맞춤 — 목록에 배분된 높이 ÷ 행 높이.
  // 목록은 카드 안에서 유일한 가변(flex:1) 블록이라 배분 높이가 '남은 공간'과 같고,
  // 표시 줄 수와 무관하다(줄을 줄여도 배분은 그대로) → 되먹임 진동이 생기지 않는다.
  // 헤드·시범 카드·메모 같은 고정 블록이 늘거나 줄면 배분이 바뀌므로 ResizeObserver가 잡는다.
  const listRef = useRef<HTMLOListElement>(null);
  const [fit, setFit] = useState<number | null>(null);
  // 카드가 좁아 동작 한 줄도 못 넣으면 시범 카드를 접는다(우선순위: 동작 목록 > 시범 자료).
  // 한 번 접으면 같은 구성에서는 다시 펴지 않는다 — 펴는 순간 공간이 다시 모자라 접히는
  // 왕복이 생기기 때문. 대신 '좁다'는 판정은 레이아웃이 안정된 뒤(SETTLE_MS) 재확인한다:
  // 모드 전환·카드 리사이즈 중의 한순간을 보고 영구히 접어버리는 것 방지.
  const [demoHidden, setDemoHidden] = useState(false);
  const demoSig = `${movements.length}|${demo?.name ?? ''}`;
  const [lastDemoSig, setLastDemoSig] = useState(demoSig);
  if (lastDemoSig !== demoSig) {
    setLastDemoSig(demoSig);
    setDemoHidden(false);
  }
  useEffect(() => {
    if (!autoFit) return;
    const list = listRef.current;
    const pane = list?.parentElement;
    if (!list || !pane) return;
    const SETTLE_MS = 600; // 모드 크로스페이드(400ms)보다 길게 — 전환 중 측정으로 접지 않도록
    let settle = 0;
    /** 목록에 배분된 높이가 한 줄도 안 되는지 */
    const tooTight = (): boolean | null => {
      const row = list.querySelector('li');
      if (!row) return null;
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      const rowH = row.getBoundingClientRect().height + gap;
      if (rowH <= 0) return null;
      const avail = list.getBoundingClientRect().height + gap; // 마지막 행 뒤 gap은 없다
      const n = Math.max(1, Math.floor(avail / rowH));
      setFit((prev) => (prev === n ? prev : n));
      return avail < rowH;
    };
    const measure = () => {
      const tight = tooTight();
      if (tight === true) {
        if (!settle) {
          settle = window.setTimeout(() => {
            settle = 0;
            if (tooTight() === true) setDemoHidden(true); // 안정된 뒤에도 좁으면 접는다
          }, SETTLE_MS);
        }
      } else if (settle) {
        clearTimeout(settle);
        settle = 0;
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(pane);
    ro.observe(list);
    return () => {
      ro.disconnect();
      if (settle) clearTimeout(settle);
    };
  }, [
    autoFit,
    movements.length,
    data.description,
    data.title,
    data.class_display_notes,
    demo?.name,
    demo?.points.length,
  ]);

  const limit = fit ?? (pageSize && pageSize > 0 ? pageSize : null);
  const size = limit && limit > 0 ? limit : groups.length || 1;
  const pages = Math.max(1, Math.ceil(groups.length / size));
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (pages <= 1) return;
    const id = setInterval(() => setPage((v) => (v + 1) % pages), 8000);
    return () => clearInterval(id);
  }, [pages]);
  const cur = page % pages;
  const shown = groups.slice(cur * size, cur * size + size);

  return (
    <div className={className ?? styles.wodBoard}>
      <div className={styles.wodHead}>
        <span className={styles.wodFormat}>{fmtLabel(data.format)}</span>
        <h1 className={styles.wodTitle}>{data.title ?? '오늘의 WOD'}</h1>
        <div className={styles.wodMeta}>
          {data.time_cap_minutes ? <span>TIME CAP {data.time_cap_minutes}′</span> : null}
          {data.rounds ? <span>{data.rounds} ROUNDS</span> : null}
          {focused ? (
            // 일부만 띄우고 있음을 명시 — 회원이 "오늘 WOD가 이게 다인가"로 오해하지 않도록
            <span className={styles.wodFocusTag}>이 구간 {movements.length}동작</span>
          ) : null}
          {pages > 1 ? (
            <span className={styles.wodPageTag}>
              {cur + 1}/{pages}
            </span>
          ) : null}
        </div>
      </div>

      {data.description ? <p className={styles.wodDesc}>{data.description}</p> : null}

      <ol ref={listRef} className={styles.wodList}>
        {shown.map((seg, si) => {
          if (seg.group == null) {
            const line = movementLine(seg.items[0]);
            return (
              <li key={si} className={styles.wodItem}>
                <span className={styles.wodItemName}>{line.name}</span>
                {line.detail ? <span className={styles.wodItemDetail}>{line.detail}</span> : null}
                {line.rx ? <span className={styles.wodItemRx}>{line.rx}</span> : null}
              </li>
            );
          }
          return (
            <li key={si} className={styles.wodGroup}>
              <span className={styles.wodGroupTag}>세트 {seg.group}</span>
              <div className={styles.wodGroupItems}>
                {seg.items.map((m, mi) => {
                  const line = movementLine(m);
                  return (
                    <div key={mi} className={styles.wodItem}>
                      <span className={styles.wodItemName}>{line.name}</span>
                      {line.detail ? <span className={styles.wodItemDetail}>{line.detail}</span> : null}
                      {line.rx ? <span className={styles.wodItemRx}>{line.rx}</span> : null}
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      {/* 시범 자료(기획서 1-1) — 영상이 있으면 무음 루프 재생, 없으면 썸네일/코칭 포인트만.
          TV는 조작 주체가 없으므로 컨트롤 없이 자동 재생한다(muted 필수 — 자동재생 정책). */}
      {demo && !demoHidden ? (
        <div className={styles.wodDemo}>
          {demo.video ? (
            <video
              className={styles.wodDemoMedia}
              src={demo.video}
              poster={demo.thumb ?? undefined}
              autoPlay
              muted
              loop
              playsInline
            />
          ) : demo.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element -- TV 전용 원격 URL(도메인 미고정)
            <img className={styles.wodDemoMedia} src={demo.thumb} alt="" />
          ) : null}
          <div className={styles.wodDemoBody}>
            <span className={styles.wodDemoTag}>시범 · {demo.name}</span>
            {demo.points.length > 0 ? (
              <ul className={styles.wodDemoPoints}>
                {demo.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {data.class_display_notes ? (
        <div className={styles.wodNotes}>{data.class_display_notes}</div>
      ) : null}
    </div>
  );
}
