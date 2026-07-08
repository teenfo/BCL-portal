'use client';

// 일일 WOD 화이트보드 모드 (docs/05 §5.3) — fn_get_class_wod_board(anon, Display-Safe).
//   published WOD + 참가자 점수 랭킹(Rx+→Rx→Scaled 정렬) + rx 배지. 개인 메모 미포함.
//   구 fn_get_class_leaderboard 에 없던 daily_wod 스코프를 이 anon RPC로 대체.
import { StatusStrip, usePolling } from '@/features/class-common';
import { rpc, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './leaderboard.module.css';

type RxStatus = 'rx_plus' | 'rx' | 'scaled';
type ScoreType = 'time' | 'reps' | 'rounds_reps' | 'weight' | 'distance' | 'calories';

interface WodResult {
  rank: number;
  member_name: string;
  score: number;
  score_type: ScoreType;
  rx_status: RxStatus;
}

interface WodBoardData {
  session_id: string;
  session_title: string | null;
  session_date: string | null;
  wod_title: string | null;
  format: string | null;
  results: WodResult[];
}

const RX_BADGE: Record<RxStatus, { label: string; cls: string }> = {
  rx_plus: { label: 'RX+', cls: styles.rxPlus },
  rx: { label: 'RX', cls: styles.rx },
  scaled: { label: 'SC', cls: styles.scaled },
};

function formatScore(score: number, type: ScoreType): string {
  switch (type) {
    case 'time': {
      const m = Math.floor(score / 60);
      const s = Math.floor(score % 60);
      return `${m}:${s < 10 ? '0' + s : s}`;
    }
    case 'weight':
      return `${score}kg`;
    case 'distance':
      return `${Math.round(score)}m`;
    case 'calories':
      return `${Math.round(score)}cal`;
    case 'rounds_reps':
      return `${score} rd`;
    case 'reps':
    default:
      return `${score} reps`;
  }
}

function fetchBoard(sessionId: string): Promise<Envelope<WodBoardData>> {
  return rpc<WodBoardData>(getSupabaseBrowserClient(), 'fn_get_class_wod_board', {
    p_session_id: sessionId,
  });
}

export function WodBoard({ sessionId }: { sessionId: string | null }) {
  const { data, initialLoading } = usePolling<WodBoardData | null>(
    () =>
      sessionId
        ? fetchBoard(sessionId)
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
          {results.map((r) => {
            const badge = RX_BADGE[r.rx_status];
            return (
              <li key={`${r.rank}-${r.member_name}`} className={styles.lbRow} data-rank={r.rank}>
                <span className={styles.lbRank}>{r.rank}</span>
                <span className={styles.lbName}>{r.member_name}</span>
                <span className={`${styles.rxBadge} ${badge?.cls ?? ''}`}>{badge?.label ?? '--'}</span>
                <span className={styles.lbScore}>{formatScore(r.score, r.score_type)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
