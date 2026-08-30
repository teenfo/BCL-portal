'use client';

// flow 모드 — 수업 진행 세그먼트 타임라인 (docs/05 §3.2 flow). 코치의 flow 명령(§4)이
// 전달한 세그먼트 플랜+현재 인덱스를 렌더한다(수신 전용 — 진행 제어는 코치 리모컨).
// 구성(Class TV 2.0 플랜 목업 정합): 상단 스트립 = SEG n/m·현재 세그먼트·진행 바·체크인 요약,
// 좌측 = 오늘의 WOD 보드, 우측 = 타이머(ConsoleShell timerSlot), 하단 = 상시 티커
// (기록 세그먼트 showBoard → 라이브 화이트보드, 그 외 → PR 축하 티커 공용 컴포넌트).
// 진행 바는 세그먼트 진입 시각 기준 rAF 근사(타이머 일시정지는 미반영 — 연출용 표시).
import { useCallback, useEffect, useRef, useState } from 'react';
import { TvClock, usePolling } from '@/features/class-common';
import { useBoardSignal, type FlowSegment } from '@/features/class-broadcast';
import {
  RX_BADGE_LABEL,
  coopPercent,
  fetchCoopBoard,
  fetchWodBoard,
  formatBoardScore,
  formatCoopValue,
  sortBoardRows,
  type BoardSort,
  type CoopBoardData,
  type WodBoardData,
} from '@/features/class-leaderboard';
import { fetchDisplayWod, fetchLiveBoard, fetchSessionDisplayWod } from '../data';
import { totalDuration, configFromCommand } from '../timer-engine';
import { PrTicker } from '../PrTicker';
import { WodBoard } from './WodBoard';
import { HeatStrip } from './HeatStrip';
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

export function FlowMode({
  facilityId,
  flow,
  getTimerElapsed,
}: {
  facilityId: string;
  flow: FlowViewState;
  /** 세그먼트 타이머 경과 초 — 시차 출발 조 패널이 같은 시계를 읽는다(셸이 주입) */
  getTimerElapsed?: () => number;
}) {
  // 좌측 WOD — flow가 지정한 세션 기준(화이트보드와 동일 세션 보장). 세션 미지정 시 시설+오늘 폴백
  const wodSessionId = flow.sessionId;
  const wod = usePolling(
    () => (wodSessionId ? fetchSessionDisplayWod(wodSessionId) : fetchDisplayWod(facilityId)),
    60_000,
    [facilityId, wodSessionId],
  );
  const live = usePolling(() => fetchLiveBoard(facilityId), 60_000, [facilityId]);

  const seg = flow.segments[flow.index] ?? null;
  const nextSeg = flow.segments[flow.index + 1] ?? null;
  const boardOn = Boolean(seg?.showBoard && flow.sessionId);
  // 협동 모드(2-3): 개인 순위 대신 클래스 합산 목표를 띄우는 세그먼트
  const coopOn = boardOn && seg?.boardView === 'coop';
  const board = usePolling<WodBoardData | null>(
    () =>
      boardOn && !coopOn && flow.sessionId
        ? fetchWodBoard(flow.sessionId)
        : Promise.resolve({ success: true, data: null, error: null }),
    20_000, // 기록 유입 반영 — 수업 중 라이브 체감 주기
    [boardOn, coopOn, flow.sessionId],
  );
  const coop = usePolling<CoopBoardData | null>(
    () =>
      coopOn && flow.sessionId
        ? fetchCoopBoard(flow.sessionId)
        : Promise.resolve({ success: true, data: null, error: null }),
    20_000,
    [coopOn, flow.sessionId],
  );

  // 회원이 기록을 저장하면 폴링(20s)을 기다리지 않고 즉시 재조회 (기능 2-1).
  // 두 보드가 같은 신호를 쓰므로 구독은 하나로 묶는다(같은 채널 중복 구독 방지)
  const boardRefetch = board.refetch;
  const coopRefetch = coop.refetch;
  const onBoardDirty = useCallback(() => {
    boardRefetch();
    coopRefetch();
  }, [boardRefetch, coopRefetch]);
  useBoardSignal(boardOn ? flow.sessionId : null, onBoardDirty);

  // 수업 전체 타임라인 진행 바 (기능 1-1) — 분모는 플랜 전체다.
  // 세그먼트 길이를 알면 그 비중대로, 모르면(타이머 없는 구간) 세그먼트 1칸을 균등 배분해
  // 누적 진행률을 만든다. 단계가 바뀌어도 0%로 되돌아가지 않는다.
  const segSig = `${flow.index}|${seg?.timer ? JSON.stringify(seg.timer) : ''}`;
  const segDur = segmentDuration(seg);
  const durations = flow.segments.map((s) => segmentDuration(s));
  // 길이 미상 구간의 대체 가중치 — 알려진 구간 평균(전부 미상이면 균등 분할)
  const known = durations.filter((d): d is number => d != null && d > 0);
  const fallbackDur = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 1;
  const weights = durations.map((d) => (d != null && d > 0 ? d : fallbackDur));
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  const doneWeight = weights.slice(0, flow.index).reduce((a, b) => a + b, 0);
  const curWeight = weights[flow.index] ?? fallbackDur;

  const barRef = useRef<HTMLDivElement>(null);
  const enteredAtRef = useRef(0);
  const progressRef = useRef({ done: 0, cur: 0, total: 1, dur: null as number | null });
  useEffect(() => {
    enteredAtRef.current = performance.now();
    progressRef.current = { done: doneWeight, cur: curWeight, total: totalWeight, dur: segDur };
  }, [segSig, segDur, doneWeight, curWeight, totalWeight]);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = barRef.current;
      if (el) {
        const { done, cur, total, dur } = progressRef.current;
        // 현재 구간 내 진행분 — 타이머가 있으면 경과/길이, 없으면 0(구간 시작점 고정)
        const frac = dur ? Math.min(1, (performance.now() - enteredAtRef.current) / 1000 / dur) : 0;
        const pct = Math.min(100, ((done + cur * frac) / total) * 100);
        el.style.width = `${pct}%`;
        if (dur) delete el.dataset.idle;
        else el.dataset.idle = '1'; // 길이 미상 구간은 저채도(진행 중이나 계측 불가 표시)
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 체크인 명단 스트립 (기능 1-4) — 인원수 + 이름 칩. 축하 아이콘은 칩에 직접 붙인다.
  const checkinCount = live.data?.current?.checkin_count ?? null;
  const names = live.data?.current?.checked_in_names ?? [];
  const birthdays = live.data?.today_birthdays ?? [];
  const anniversaries = live.data?.today_anniversaries ?? [];
  const anniversaryYears = new Map(anniversaries.map((a) => [a.name, a.years]));
  const ROSTER_MAX = 3; // 스트립 폭 한계 — 나머지는 +N으로 접는다(4칩부터 마지막 칩이 잘린다)
  const rosterShown = names.slice(0, ROSTER_MAX);
  const rosterRest = Math.max(0, names.length - rosterShown.length);

  // 정렬(코치 선택) + 넘침 자동 로테이션(8s 페이지 — auto-scroll 등가, 2-1).
  // 기록 세그먼트에서도 축하(PR·생일)가 사라지지 않도록 마지막에 축하 페이지를 한 장 끼운다
  // — 목업의 "하단 한 줄에 PR·생일 축하" 요구를 라이브 보드와 번갈아 충족.
  // 협동 모드는 한 장(합산 밴드)만 쓰고 축하 페이지와 번갈아 돈다.
  const PAGE = 4;
  const allRows = boardOn && !coopOn ? sortBoardRows(board.data?.results ?? [], flow.boardSort) : [];
  const boardPages = coopOn ? 1 : Math.max(1, Math.ceil(allRows.length / PAGE));
  const pages = boardOn ? boardPages + 1 : 1; // +1 = 축하 페이지
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (pages <= 1) return;
    const id = setInterval(() => setPage((v) => (v + 1) % pages), 8000);
    return () => clearInterval(id);
  }, [pages]);
  const cur = page % pages;
  const onCelebratePage = boardOn && cur === boardPages; // 마지막 장 = 축하
  const rows = allRows.slice(cur * PAGE, cur * PAGE + PAGE);

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
        {checkinCount != null ? (
          <div className={styles.flowCheckin}>
            <span className={styles.flowCheckinCount}>체크인 {checkinCount}</span>
            {rosterShown.length > 0 ? (
              <ul className={styles.flowRoster}>
                {rosterShown.map((n) => {
                  const years = anniversaryYears.get(n);
                  return (
                    <li key={n} className={styles.flowRosterChip}>
                      {n}
                      {birthdays.includes(n) ? (
                        <span className={styles.flowRosterMark} title="오늘 생일">
                          🎂
                        </span>
                      ) : null}
                      {years ? (
                        <span className={styles.flowRosterMark} title={`가입 ${years}주년`}>
                          🎉
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {/* +N은 목록 밖에 둔다 — 목록이 넘쳐 잘려도 남은 인원수는 항상 보이도록 */}
            {rosterRest > 0 ? <span className={styles.flowRosterMore}>+{rosterRest}</span> : null}
          </div>
        ) : null}
      </header>

      {/* 타이머 없는 세그먼트(브리핑 등) — 우측 카드는 대형 현재 시각(잔여 타이머 잔상 방지) */}
      {!seg?.timer ? (
        <div className={styles.flowClockCard} data-heats={seg?.heats ? '1' : undefined}>
          <TvClock large showSeconds={false} />
        </div>
      ) : null}

      <div className={styles.flowLeft}>
        {wod.initialLoading ? (
          <div className={styles.flowWodPane} />
        ) : wod.data ? (
          // autoFit: 카드 높이를 실측해 들어갈 줄만 표시, 초과분은 8초 페이지 로테이션
          // movementIdx: 이 세그먼트에 바인딩된 동작만(미설정이면 전체) + 시범 자료
          <WodBoard
            data={wod.data}
            className={styles.flowWodPane}
            autoFit
            movementIdx={seg?.movementIdx}
          />
        ) : wod.error ? (
          // 로딩 실패는 '미게시'로 위장하지 않고 표면화(CLAUDE.md 에러 표면화 규칙)
          <div className={styles.flowWodPane}>
            <div className={styles.flowWodEmpty}>
              <div className={styles.flowWodEmptyTitle}>WOD를 불러오지 못했습니다</div>
              <div className={styles.flowWodEmptySub}>{wod.error}</div>
            </div>
          </div>
        ) : (
          <div className={styles.flowWodPane}>
            <div className={styles.flowWodEmpty}>
              <div className={styles.flowWodEmptyTitle}>오늘 등록된 WOD가 없습니다</div>
              <div className={styles.flowWodEmptySub}>코치 앱에서 WOD를 게시하면 이 자리에 표시됩니다</div>
            </div>
          </div>
        )}
      </div>

      {/* 시차 출발(waterfall) — 우측 타이머 카드 아래 밴드(같은 시계를 쓰므로 시계 옆에 둔다).
          좌측 WOD 카드에 붙이면 동작 목록·시범 자료와 높이를 다투어 둘 다 잘린다. */}
      {seg?.heats && getTimerElapsed ? (
        <div className={styles.flowHeatBand}>
          <HeatStrip
            plan={seg.heats}
            preSeconds={seg.timer?.preSeconds ?? 0}
            getElapsed={getTimerElapsed}
          />
        </div>
      ) : null}

      {/* 하단 상시 티커 — 기록 세그먼트: 라이브 화이트보드 / 그 외: PR 축하(목업 정합) */}
      <div className={styles.flowTicker}>
        {coopOn && !onCelebratePage ? (
          <CoopBand data={coop.data} />
        ) : boardOn && !onCelebratePage ? (
          <>
            <span className={styles.flowBoardTag}>
              LIVE {cur + 1}/{boardPages}
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

/**
 * 협동 모드 밴드(2-3) — "우리 반이 함께 얼마나 채웠나". 개인 순위 대신 합계·진행률·상위 기여자.
 * 목표 미설정(data=null)이면 안내만 — 코치가 세그먼트만 켜고 목표를 안 넣은 경우를 숨기지 않는다.
 */
function CoopBand({ data }: { data: CoopBoardData | null }) {
  if (!data) {
    return (
      <>
        <span className={styles.flowBoardTag}>협동</span>
        <span className={styles.flowBoardEmpty}>
          WOD에 클래스 합산 목표가 설정되지 않았습니다
        </span>
      </>
    );
  }
  const pct = coopPercent(data);
  const top = data.leaders[0] ?? null;
  return (
    <>
      <span className={styles.flowBoardTag}>협동</span>
      {/* 한 줄 밴드라 정보는 우선순위대로: 합계·목표·달성률 > 참여 인원 > 선두.
          이름 나열은 개인 순위 보드가 맡는다(여기서 여러 명을 넣으면 끝이 잘린다) */}
      <div className={styles.coopBand}>
        <div className={styles.coopHead}>
          <span className={styles.coopLabel}>{data.label}</span>
          <span className={styles.coopTotal}>
            {formatCoopValue(data.total, data.unit)}
            <em className={styles.coopTarget}> / {formatCoopValue(data.target, data.unit)}</em>
          </span>
          <span className={styles.coopPct}>{Math.round(pct)}%</span>
          <span className={styles.coopMeta}>
            {data.contributors}명 참여
            {data.excluded > 0 ? ` · 단위 불일치 ${data.excluded}건 제외` : ''}
            {top ? ` · 선두 ${top.member_name} ${formatCoopValue(top.value, data.unit)}` : ''}
          </span>
        </div>
        <div className={styles.coopTrack} aria-hidden="true">
          <div className={styles.coopFill} style={{ width: `${pct}%` }} data-full={pct >= 100 ? '1' : undefined} />
        </div>
      </div>
    </>
  );
}
