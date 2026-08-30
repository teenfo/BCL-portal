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
}: {
  data: DisplayWod;
  className?: string;
  pageSize?: number;
  /** 카드 높이를 실측해 들어갈 줄 수를 스스로 정한다(WOD 길이·설명 유무와 무관) */
  autoFit?: boolean;
}) {
  const movements = Array.isArray(data.movements_snapshot) ? data.movements_snapshot : [];
  const groups = segmentMovements(movements);

  // 실측 자동 맞춤 — 목록 시작점부터 카드 바닥까지의 가용 높이 ÷ 행 높이.
  // 헤드는 목록 위에 고정이라 가용 높이는 페이지 줄 수와 무관 → 되먹임 진동 없음.
  const listRef = useRef<HTMLOListElement>(null);
  const [fit, setFit] = useState<number | null>(null);
  useEffect(() => {
    if (!autoFit) return;
    const list = listRef.current;
    const pane = list?.parentElement;
    if (!list || !pane) return;
    const measure = () => {
      const row = list.querySelector('li');
      if (!row) return;
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      const rowH = row.getBoundingClientRect().height + gap;
      if (rowH <= 0) return;
      // 목록 아래 블록(코치 메모)은 '위치'가 아니라 '높이'로 예약한다 —
      // margin-top:auto라 위치는 목록 길이에 따라 움직여 되먹임이 생긴다(높이는 불변).
      const after = list.nextElementSibling as HTMLElement | null;
      const paneStyle = getComputedStyle(pane);
      const reserve = after
        ? after.getBoundingClientRect().height + (parseFloat(paneStyle.rowGap) || 0)
        : 0;
      const avail =
        pane.getBoundingClientRect().bottom -
        (parseFloat(paneStyle.paddingBottom) || 0) -
        list.getBoundingClientRect().top -
        reserve;
      const n = Math.max(1, Math.floor(avail / rowH));
      setFit((prev) => (prev === n ? prev : n));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(pane);
    return () => ro.disconnect();
  }, [autoFit, movements.length, data.description, data.title, data.class_display_notes]);

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

      {data.class_display_notes ? (
        <div className={styles.wodNotes}>{data.class_display_notes}</div>
      ) : null}
    </div>
  );
}
