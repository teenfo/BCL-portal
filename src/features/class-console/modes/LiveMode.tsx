'use client';

// live 모드 — 실시간 수업 현황 (docs/05 §3.2). fn_get_class_live_board(anon) 30s 폴링
// + checkins INSERT Realtime 구독 시 즉시 반영(환영 토스트 연출).
// Display-Safe: 체크인 회원은 "이름만"(RPC가 이름만 반환). 노쇼·위험 플래그 원천 미포함.
import { useEffect, useRef, useState } from 'react';
import { usePolling } from '@/features/class-common';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchLiveBoard, hm, type LiveBoard } from '../data';
import styles from '../console.module.css';

function progressPct(board: LiveBoard | null): number {
  if (!board?.current) return 0;
  const now = new Date(board.server_time).getTime();
  const day = (board.server_time || '').slice(0, 10);
  const start = new Date(`${day}T${board.current.start_time}`).getTime();
  const end = new Date(`${day}T${board.current.end_time}`).getTime();
  if (!(end > start)) return 0;
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

export function LiveMode({ facilityId }: { facilityId: string }) {
  const { data, refetch } = usePolling(() => fetchLiveBoard(facilityId), 30_000, [facilityId]);
  const [welcome, setWelcome] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // checkins INSERT Realtime → 즉시 재조회 + 환영 연출 (수신 전용, 쓰기 0)
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    const ch = client
      .channel(`class-live:${facilityId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'checkins' },
        () => {
          refetch();
          setWelcome('환영합니다!');
          setTimeout(() => setWelcome(null), 4000);
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(ch);
    };
  }, [facilityId, refetch]);

  // 진행 경과 바 — rAF로 부드럽게 갱신
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (barRef.current) barRef.current.style.width = `${progressPct(data)}%`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [data]);

  const cur = data?.current ?? null;
  const next = data?.next ?? null;

  return (
    <div className={styles.liveBoard}>
      <section className={styles.liveCurrent}>
        {cur ? (
          <>
            <div className={styles.liveTag}>진행 중</div>
            <h1 className={styles.liveTitle}>{cur.title}</h1>
            <div className={styles.liveSub}>
              <span>
                {hm(cur.start_time)}–{hm(cur.end_time)}
              </span>
              {cur.coach_names.length ? <span>{cur.coach_names.join(', ')} 코치</span> : null}
            </div>
            <div className={styles.liveCount}>
              <span className={styles.liveCountNum}>{cur.checkin_count}</span>
              <span className={styles.liveCountDen}>
                / {cur.capacity ?? cur.booked_count} 체크인
              </span>
            </div>
            <div className={styles.liveBarTrack}>
              <div ref={barRef} className={styles.liveBarFill} />
            </div>
            <ul className={styles.liveNames}>
              {cur.checked_in_names.map((n, i) => (
                <li key={i} className={styles.liveNameChip}>
                  {n}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className={styles.liveIdle}>현재 진행 중인 수업이 없습니다</div>
        )}
      </section>

      <aside className={styles.liveNext}>
        <div className={styles.liveTag}>다음 수업</div>
        {next ? (
          <>
            <h2 className={styles.liveNextTitle}>{next.title}</h2>
            <div className={styles.liveSub}>
              <span>
                {hm(next.start_time)}–{hm(next.end_time)}
              </span>
              <span>
                {next.booked_count}/{next.capacity ?? '-'} 예약
              </span>
            </div>
          </>
        ) : (
          <div className={styles.liveIdle}>예정된 다음 수업 없음</div>
        )}
      </aside>

      {welcome ? <div className={styles.welcomeToast}>{welcome}</div> : null}
    </div>
  );
}
