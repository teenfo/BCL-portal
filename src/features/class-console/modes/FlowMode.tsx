'use client';

// flow 모드 — 수업 진행 세그먼트 타임라인 (docs/05 §3.2 flow). 코치의 flow 명령(§4)이
// 전달한 세그먼트 플랜+현재 인덱스를 렌더한다(수신 전용 — 진행 제어는 코치 리모컨).
// 구성(Class TV 2.0 플랜 목업 정합): 상단 스트립 = SEG n/m·현재 세그먼트·진행 바·체크인 요약,
// 좌측 = 오늘의 WOD 보드, 우측 = 타이머(ConsoleShell timerSlot), 하단 = 상시 티커
// (기록 세그먼트 showBoard → 라이브 화이트보드, 그 외 → PR 축하 티커 공용 컴포넌트).
// 진행 바는 세그먼트 진입 시각 기준 rAF 근사(타이머 일시정지는 미반영 — 연출용 표시).
import { useEffect, useRef, useState } from 'react';
import { usePolling } from '@/features/class-common';
import type { FlowSegment } from '@/features/class-broadcast';
import {
  RX_BADGE_LABEL,
  fetchWodBoard,
  formatBoardScore,
  sortBoardRows,
  type BoardSort,
  type WodBoardData,
} from '@/features/class-leaderboard';
import { fetchDisplayWod, fetchLiveBoard } from '../data';
import { totalDuration, configFromCommand } from '../timer-engine';
import { PrTicker } from '../PrTicker';
import { WodBoard } from './WodBoard';
import styles from '../console.module.css';

export interface FlowViewState {
  segments: FlowSegment[];
  index: number;
  sessionId: string | null;
  /** 라이브 화이트보드 정렬(코치 선택 — 2-1) */
  boardSort: BoardSort;
}

/** 세그먼트 타이머의 전체 길이(초) — 진행 바 분모. 타이머 없음/무제한이면 null */
function segmentDuration(seg: FlowSegment | null): number | null {
  if (!seg?.timer?.mode) return null;
  return totalDuration(configFromCommand(seg.timer, seg.timer.mode));
}

export function FlowMode({ facilityId, flow }: { facilityId: string; flow: FlowViewState }) {
  const wod = usePolling(() => fetchDisplayWod(facilityId), 60_000, [facilityId]);
  const live = usePolling(() => fetchLiveBoard(facilityId), 60_000, [facilityId]);

  const seg = flow.segments[flow.index] ?? null;
  const nextSeg = flow.segments[flow.index + 1] ?? null;
  const boardOn = Boolean(seg?.showBoard && flow.sessionId);
  const board = usePolling<WodBoardData | null>(
    () =>
      boardOn && flow.sessionId
        ? fetchWodBoard(flow.sessionId)
        : Promise.resolve({ success: true, data: null, error: null }),
    20_000, // 기록 유입 반영 — 수업 중 라이브 체감 주기
    [boardOn, flow.sessionId],
  );

  // 세그먼트 진행 바 — 진입 시각 기준 rAF 직접 갱신(리렌더 우회, docs/05 §2)
  const barRef = useRef<HTMLDivElement>(null);
  const enteredAtRef = useRef(0);
  const durationRef = useRef<number | null>(null);
  useEffect(() => {
    enteredAtRef.current = performance.now();
    durationRef.current = segmentDuration(seg);
    // 진입 즉시 0으로 리셋(직전 세그먼트 잔상 제거)
    if (barRef.current) barRef.current.style.width = '0%';
  }, [flow.index, seg]);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = barRef.current;
      if (el) {
        const dur = durationRef.current;
        const pct = dur
          ? Math.min(100, ((performance.now() - enteredAtRef.current) / 1000 / dur) * 100)
          : 0;
        el.style.width = `${pct}%`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const checkinCount = live.data?.current?.checkin_count ?? null;
  const names = live.data?.current?.checked_in_names ?? [];
  const birthdays = live.data?.today_birthdays ?? [];
  const checkinLabel =
    checkinCount == null
      ? null
      : names.length > 0
        ? `체크인 ${checkinCount} · ${names[0]}${names.length > 1 ? ' 외' : ''}`
        : `체크인 ${checkinCount}`;

  // 정렬(코치 선택) + 넘침 자동 로테이션(8s 페이지 — auto-scroll 등가, 2-1)
  const PAGE = 4;
  const allRows = boardOn ? sortBoardRows(board.data?.results ?? [], flow.boardSort) : [];
  const pages = Math.max(1, Math.ceil(allRows.length / PAGE));
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (pages <= 1) return;
    const id = setInterval(() => setPage((v) => (v + 1) % pages), 8000);
    return () => clearInterval(id);
  }, [pages]);
  const rows = allRows.slice((page % pages) * PAGE, (page % pages) * PAGE + PAGE);

  return (
    <div className={styles.flowRoot}>
      <header className={styles.flowStrip}>
        <div className={styles.flowSegNow}>
          <span className={styles.flowSegCount}>
            SEG {flow.index + 1}/{flow.segments.length}
          </span>
          <span className={styles.flowSegDot}>·</span>
          <span className={styles.flowSegTitle}>{seg?.name ?? '—'}</span>
          {nextSeg ? <span className={styles.flowSegNext}>다음 · {nextSeg.name}</span> : null}
        </div>
        <div className={styles.flowBarTrack} aria-hidden="true">
          <div ref={barRef} className={styles.flowBarFill} />
        </div>
        {checkinLabel ? <span className={styles.flowCheckin}>{checkinLabel}</span> : null}
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
      </div>

      {/* 하단 상시 티커 — 기록 세그먼트: 라이브 화이트보드 / 그 외: PR 축하(목업 정합) */}
      <div className={styles.flowTicker}>
        {boardOn ? (
          <>
            <span className={styles.flowBoardTag}>
              LIVE{pages > 1 ? ` ${(page % pages) + 1}/${pages}` : ''}
            </span>
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
          </>
        ) : (
          <>
            <PrTicker facilityId={facilityId} compact />
            {birthdays.length > 0 ? (
              <span className={styles.flowBirthday}>
                오늘 생일: {birthdays.join(', ')} 🎂
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
