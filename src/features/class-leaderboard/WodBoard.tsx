'use client';

// 일일 WOD 화이트보드 모드 (docs/05 §5.3) — fn_get_class_wod_board(anon, Display-Safe).
//   published WOD + 참가자 점수 랭킹(Rx+→Rx→Scaled 정렬) + rx 배지. 개인 메모 미포함.
//   타입·페처·포맷터는 wod-board-data.ts 단일 소스(FlowMode 화이트보드 스트립과 공유).
import { StatusStrip, usePolling } from '@/features/class-common';
import {
  RX_BADGE_LABEL,
  fetchWodBoard,
  formatBoardScore,
  type RxStatus,
  type WodBoardData,
} from './wod-board-data';
import styles from './leaderboard.module.css';

const RX_CLS: Record<RxStatus, string> = {
  rx_plus: styles.rxPlus,
  rx: styles.rx,
  scaled: styles.scaled,
};

export function WodBoard({ sessionId }: { sessionId: string | null }) {
  const { data, initialLoading } = usePolling<WodBoardData | null>(
    () =>
      sessionId
        ? fetchWodBoard(sessionId)
        : Promise.resolve({ success: true, data: null, error: null }),
    120_000, // 2분 폴링 — 화이트보드는 저빈도 갱신
    [sessionId],
  );

  const results = data?.results ?? [];

  return (
    <div className={styles.lbRoot}>
      <StatusStrip realtime={undefined} />
      <header className={styles.lbHead}>
        <div>
          <h1 className={styles.lbTitle}>{data?.wod_title ?? 'WOD'}</h1>
          <div className={styles.lbSub}>
            {data?.session_title ?? '오늘의 WOD'}
            {data?.session_date ? ` · ${data.session_date}` : ''}
            {data?.format ? ` · ${data.format}` : ''}
          </div>
        </div>
      </header>

      {initialLoading ? null : results.length === 0 ? (
        <div className={styles.lbEmpty}>기록된 결과가 없습니다</div>
      ) : (
        <ol className={styles.lbList}>
          {results.map((r) => (
            <li key={`${r.rank}-${r.member_name}`} className={styles.lbRow} data-rank={r.rank}>
              <span className={styles.lbRank}>{r.rank}</span>
              <span className={styles.lbName}>{r.member_name}</span>
              <span className={`${styles.rxBadge} ${RX_CLS[r.rx_status] ?? ''}`}>
                {RX_BADGE_LABEL[r.rx_status] ?? '--'}
              </span>
              <span className={styles.lbScore}>{formatBoardScore(r.score, r.score_type)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
