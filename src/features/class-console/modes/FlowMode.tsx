'use client';

// flow 모드 — 수업 진행 세그먼트 타임라인 (docs/05 §3.2 flow). 코치의 flow 명령(§4)이
// 전달한 세그먼트 플랜+현재 인덱스를 렌더한다(수신 전용 — 진행 제어는 코치 리모컨).
// 좌측 = 오늘의 WOD 보드(+기록 세그먼트에서 라이브 화이트보드 스트립), 우측 = 타이머.
// 우측 타이머는 ConsoleShell 상시 마운트 TimerMode 인스턴스를 flow 슬롯에 배치(rAF 연속성).
// 체크인 수·명단은 기존 fn_get_class_live_board 재사용(신규 공개 표면 없음).
import { usePolling } from '@/features/class-common';
import type { FlowSegment } from '@/features/class-broadcast';
import {
  RX_BADGE_LABEL,
  fetchWodBoard,
  formatBoardScore,
  type WodBoardData,
} from '@/features/class-leaderboard';
import { fetchDisplayWod, fetchLiveBoard } from '../data';
import { WodBoard } from './WodBoard';
import styles from '../console.module.css';

export interface FlowViewState {
  segments: FlowSegment[];
  index: number;
  sessionId: string | null;
}

export function FlowMode({ facilityId, flow }: { facilityId: string; flow: FlowViewState }) {
  const wod = usePolling(() => fetchDisplayWod(facilityId), 60_000, [facilityId]);
  const live = usePolling(() => fetchLiveBoard(facilityId), 60_000, [facilityId]);

  const seg = flow.segments[flow.index] ?? null;
  const boardOn = Boolean(seg?.showBoard && flow.sessionId);
  const board = usePolling<WodBoardData | null>(
    () =>
      boardOn && flow.sessionId
        ? fetchWodBoard(flow.sessionId)
        : Promise.resolve({ success: true, data: null, error: null }),
    20_000, // 기록 유입 반영 — 수업 중 라이브 체감 주기
    [boardOn, flow.sessionId],
  );

  const checkins = live.data?.current?.checkin_count ?? null;
  const rows = boardOn ? (board.data?.results ?? []).slice(0, 6) : [];

  return (
    <div className={styles.flowRoot}>
      <header className={styles.flowStrip}>
        <ol className={styles.flowSegList}>
          {flow.segments.map((s, i) => (
            <li
              key={`${i}-${s.name}`}
              className={styles.flowSeg}
              data-state={i < flow.index ? 'done' : i === flow.index ? 'active' : 'todo'}
            >
              <span className={styles.flowSegNo}>{i + 1}</span>
              <span className={styles.flowSegName}>{s.name}</span>
            </li>
          ))}
        </ol>
        {checkins != null ? (
          <span className={styles.flowCheckin}>체크인 {checkins}명</span>
        ) : null}
      </header>

      <div className={styles.flowLeft}>
        {wod.initialLoading ? (
          <div className={styles.flowWodPane} />
        ) : wod.data ? (
          <WodBoard data={wod.data} className={styles.flowWodPane} />
        ) : (
          <div className={styles.flowWodPane}>
            <div className={styles.wodEmptyTitle}>오늘 등록된 WOD가 없습니다</div>
          </div>
        )}

        {boardOn ? (
          <div className={styles.flowBoard}>
            <span className={styles.flowBoardTag}>LIVE</span>
            {rows.length === 0 ? (
              <span className={styles.flowBoardEmpty}>첫 기록을 기다리는 중</span>
            ) : (
              <ol className={styles.flowBoardList}>
                {rows.map((r) => (
                  <li key={`${r.rank}-${r.member_name}`} className={styles.flowBoardRow}>
                    <span className={styles.flowBoardRank}>{r.rank}</span>
                    <span className={styles.flowBoardName}>{r.member_name}</span>
                    <span className={styles.flowBoardRx} data-rx={r.rx_status}>
                      {RX_BADGE_LABEL[r.rx_status]}
                    </span>
                    <span className={styles.flowBoardScore}>
                      {formatBoardScore(r.score, r.score_type)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
