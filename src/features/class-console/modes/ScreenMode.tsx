'use client';

// screen 모드 — 현장 공개 보드(디폴트) (docs/05 §3.2). 시계+수업+WOD 요약+PR 티커.
// Display-Safe(P24 원형): 부상·메모·재등록 위험·정산·연락처 절대 비노출.
// PR 축하는 옵트인 존중(RPC가 celebrate_opt_in 필터). 티커는 공용 PrTicker(단일 정의).
import { TvClock, usePolling } from '@/features/class-common';
import { fetchLiveBoard, fetchDisplayWod, hm } from '../data';
import { PrTicker } from '../PrTicker';
import styles from '../console.module.css';

export function ScreenMode({ facilityId }: { facilityId: string }) {
  const live = usePolling(() => fetchLiveBoard(facilityId), 60_000, [facilityId]);
  const wod = usePolling(() => fetchDisplayWod(facilityId), 60_000, [facilityId]);

  const cur = live.data?.current ?? null;
  const next = live.data?.next ?? null;
  const w = wod.data ?? null;
  const movementCount = Array.isArray(w?.movements_snapshot) ? w!.movements_snapshot.length : 0;

  return (
    <div className={styles.screenGrid}>
      <div className={styles.screenClock}>
        <TvClock large showSeconds={false} />
      </div>

      <div className={styles.screenCards}>
        <div className={styles.screenCard}>
          <div className={styles.screenCardTag}>{cur ? '진행 중' : '다음 수업'}</div>
          {cur ? (
            <>
              <div className={styles.screenCardTitle}>{cur.title}</div>
              <div className={styles.screenCardSub}>
                {hm(cur.start_time)}–{hm(cur.end_time)} · {cur.checkin_count}명 체크인
              </div>
            </>
          ) : next ? (
            <>
              <div className={styles.screenCardTitle}>{next.title}</div>
              <div className={styles.screenCardSub}>
                {hm(next.start_time)}–{hm(next.end_time)}
              </div>
            </>
          ) : (
            <div className={styles.screenCardSub}>예정된 수업 없음</div>
          )}
        </div>

        <div className={styles.screenCard}>
          <div className={styles.screenCardTag}>오늘의 WOD</div>
          {w ? (
            <>
              <div className={styles.screenCardTitle}>{w.title ?? 'WOD'}</div>
              <div className={styles.screenCardSub}>
                {(w.format ?? '').toUpperCase()}
                {movementCount ? ` · ${movementCount} movements` : ''}
                {w.time_cap_minutes ? ` · CAP ${w.time_cap_minutes}′` : ''}
              </div>
            </>
          ) : (
            <div className={styles.screenCardSub}>등록된 WOD 없음</div>
          )}
        </div>
      </div>

      <PrTicker facilityId={facilityId} />
    </div>
  );
}
