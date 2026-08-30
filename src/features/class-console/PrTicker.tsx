'use client';

// PR 축하 티커 — 공용 컴포넌트 (docs/05 §3.2 screen · flow 하단 스트립 공유).
// fn_get_class_screen_prs(anon, 옵트인 존중) 8s 로테이션. ScreenMode에서 추출(단일 정의).
import { useEffect, useState } from 'react';
import { usePolling } from '@/features/class-common';
import { fetchScreenPrs } from './data';
import styles from './console.module.css';

export function PrTicker({ facilityId, compact = false }: { facilityId: string; compact?: boolean }) {
  const prs = usePolling(() => fetchScreenPrs(facilityId, 7), 60_000, [facilityId]);

  // 8s 로테이션 (docs/05 §3.2 갱신 주기)
  const list = prs.data ?? [];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (list.length === 0) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % list.length), 8000);
    return () => clearInterval(id);
  }, [list.length]);

  const pr = list.length ? list[idx % list.length] : null;

  return (
    <div className={styles.prTicker} data-compact={compact ? '1' : undefined}>
      {pr ? (
        <div key={`${pr.member_name}-${idx}`} className={styles.prItem}>
          <span className={styles.prBadge}>PR</span>
          <span className={styles.prName}>{pr.member_name}</span>
          <span className={styles.prLabel}>
            {pr.item_label} · {pr.result_label}
          </span>
        </div>
      ) : (
        <div className={styles.prIdle}>축하할 신기록을 기다리는 중 🎉</div>
      )}
    </div>
  );
}
