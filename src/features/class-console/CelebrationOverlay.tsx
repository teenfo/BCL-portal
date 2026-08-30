'use client';

// 인클래스 셀레브레이션 오버레이 (기획서 2-2) — 수업 중 방금 나온 PR·배지를 TV 전면에 띄운다.
// 데이터는 anon RPC(fn_get_class_celebrations, 최근 N분·옵트인 존중)가 정본이다.
//   · Broadcast로 축하 내용을 실어 보내지 않는다 — anon 발행이 가능한 채널이라
//     남의 이름으로 가짜 축하를 띄울 수 있기 때문(신호는 board_dirty 재조회 트리거로만 사용).
//   · TV 부팅 시점의 과거 이벤트는 '이미 본 것'으로 표시만 하고 띄우지 않는다
//     (재부팅할 때마다 30분치 축하가 쏟아지는 것 방지).
import { useCallback, useEffect, useState } from 'react';
import { usePolling } from '@/features/class-common';
import { useBoardSignal } from '@/features/class-broadcast';
import { badgeGlyph } from '@/features/badges/glyph';
import { fetchCelebrations, type Celebration } from './data';
import styles from './console.module.css';

/** 조회 범위(분) — 폴링 간격보다 넉넉히 잡아 신호 유실 시에도 놓치지 않는다 */
const WINDOW_MIN = 15;
const POLL_MS = 20_000;
/** 한 건 노출 시간 — 수업 흐름을 끊지 않는 길이 */
const SHOW_MS = 7_000;

const KIND_TAG: Record<Celebration['kind'], string> = {
  pr: 'NEW PR',
  race: 'RACE PR',
  badge: 'BADGE',
};

/** 표시 키 — 같은 이벤트를 두 번 띄우지 않기 위한 식별자(id 미노출 표면이라 값 조합) */
function keyOf(c: Celebration): string {
  return `${c.kind}|${c.member_name}|${c.item_label}|${c.achieved_at}`;
}

export function CelebrationOverlay({
  facilityId,
  sessionId = null,
}: {
  facilityId: string;
  /** 진행 중 세션 — 회원 기록 저장 신호를 받아 폴링을 기다리지 않고 즉시 조회 */
  sessionId?: string | null;
}) {
  const feed = usePolling(() => fetchCelebrations(facilityId, WINDOW_MIN), POLL_MS, [facilityId]);
  const refetch = feed.refetch;
  const onDirty = useCallback(() => refetch(), [refetch]);
  useBoardSignal(sessionId, onDirty);

  // 조회 결과 → 큐 반영은 렌더 중 파생 상태로 처리한다(effect 안 setState 금지 규칙 —
  // React "props 변화에 맞춘 state 조정" 패턴). 최초 조회분은 전량 '본 것'으로만 기록.
  const [seenKeys, setSeenKeys] = useState<string[] | null>(null);
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [lastList, setLastList] = useState<Celebration[] | null>(null);
  const list = feed.data;
  if (list && list !== lastList) {
    setLastList(list);
    const seen = new Set(seenKeys ?? []);
    const fresh = list.filter((c) => !seen.has(keyOf(c)));
    if (fresh.length > 0) {
      // 창(15분)×상한(10건)보다 넉넉한 꼬리만 유지 — 무한 증가 방지
      setSeenKeys((prev) => [...(prev ?? []), ...fresh.map(keyOf)].slice(-200));
      // 최초 조회(seenKeys=null)는 과거분이므로 띄우지 않는다. 이후엔 오래된 것부터 축하
      if (seenKeys != null) setQueue((q) => [...q, ...fresh.slice().reverse()]);
    } else if (seenKeys == null) {
      setSeenKeys([]);
    }
  }

  // 큐 소비 — 맨 앞 한 건을 SHOW_MS 동안 노출한 뒤 제거(타이머 콜백에서 상태 전이)
  const current = queue[0] ?? null;
  const currentKey = current ? keyOf(current) : null;
  useEffect(() => {
    if (!currentKey) return;
    const id = setTimeout(() => setQueue((q) => q.slice(1)), SHOW_MS);
    return () => clearTimeout(id);
  }, [currentKey]);

  if (!current) return null;

  const glyph = current.kind === 'badge' ? badgeGlyph(current.icon) : current.icon;
  return (
    <div className={styles.celebrateLayer} role="status" aria-live="polite">
      <div className={styles.celebrateCard} data-kind={current.kind}>
        <span className={styles.celebrateGlyph} aria-hidden="true">
          {glyph}
        </span>
        <div className={styles.celebrateBody}>
          <span className={styles.celebrateTag}>{KIND_TAG[current.kind]}</span>
          <span className={styles.celebrateName}>{current.member_name}</span>
          <span className={styles.celebrateItem}>
            {current.item_label}
            {current.result_label ? ` · ${current.result_label}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
