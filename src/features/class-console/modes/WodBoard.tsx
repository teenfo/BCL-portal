'use client';

// WOD 보드 표시 전용 컴포넌트 (docs/05 §3.2) — 데이터 페치 없음(순수 프레젠테이션).
// WodMode(전체화면)와 SplitMode(좌측 페인)가 공유한다. Display-Safe: 공개 스냅샷만.
import type { DisplayWod, WodMovement } from '../data';
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
  const reps = m.reps != null ? String(m.reps) : '';
  const target = m.target ? String(m.target) : '';
  const detail = [reps, target].filter(Boolean).join(' · ');
  const rxM = m.rx_male ? `♂ ${m.rx_male}` : '';
  const rxF = m.rx_female ? `♀ ${m.rx_female}` : '';
  const rx = [rxM, rxF].filter(Boolean).join('   ');
  return { name, detail, rx };
}

/** WOD 보드 마크업. className으로 컨테이너 배치 제어(전체화면 vs 좌측 페인) */
export function WodBoard({ data, className }: { data: DisplayWod; className?: string }) {
  const movements = Array.isArray(data.movements_snapshot) ? data.movements_snapshot : [];

  return (
    <div className={className ?? styles.wodBoard}>
      <div className={styles.wodHead}>
        <span className={styles.wodFormat}>{fmtLabel(data.format)}</span>
        <h1 className={styles.wodTitle}>{data.title ?? '오늘의 WOD'}</h1>
        <div className={styles.wodMeta}>
          {data.time_cap_minutes ? <span>TIME CAP {data.time_cap_minutes}′</span> : null}
          {data.rounds ? <span>{data.rounds} ROUNDS</span> : null}
        </div>
      </div>

      {data.description ? <p className={styles.wodDesc}>{data.description}</p> : null}

      <ol className={styles.wodList}>
        {movements.map((m, i) => {
          const line = movementLine(m);
          return (
            <li key={i} className={styles.wodItem}>
              <span className={styles.wodItemName}>{line.name}</span>
              {line.detail ? <span className={styles.wodItemDetail}>{line.detail}</span> : null}
              {line.rx ? <span className={styles.wodItemRx}>{line.rx}</span> : null}
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
