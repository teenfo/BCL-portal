'use client';

// 기록 보드 갱신 신호 (docs/05 §4.1 부속) — 회원 앱 기록 저장 → TV 즉시 재조회.
// Broadcast 신호만 오가고 데이터는 싣지 않는다. TV는 신호를 받으면 기존 anon RPC로
// 다시 읽는다(신규 공개 표면 없음). 실패해도 20초 폴링이 그대로 백업으로 남는다.
import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { BOARD_DIRTY_EVENT, boardChannelName } from './contract';

/** 기록 저장 직후 호출 — 해당 세션 TV들에 재조회를 알린다(실패는 삼킨다: 기록 흐름 우선) */
export async function publishBoardDirty(sessionId: string): Promise<void> {
  if (!sessionId) return;
  const client = getSupabaseBrowserClient();
  const channel = client.channel(boardChannelName(sessionId));
  try {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') done();
      });
      // 구독이 늦거나 실패해도 기록 저장 UX를 막지 않는다
      setTimeout(done, 1200);
    });
    await channel.send({
      type: 'broadcast',
      event: BOARD_DIRTY_EVENT,
      payload: { ts: Date.now() },
    });
  } catch {
    /* 신호 실패 = 폴링으로 반영됨 — 사용자에게 알리지 않는다 */
  } finally {
    void client.removeChannel(channel);
  }
}

/** TV 측 구독 — 신호가 오면 onDirty()로 재조회를 트리거한다 */
export function useBoardSignal(sessionId: string | null, onDirty: () => void): void {
  useEffect(() => {
    if (!sessionId) return;
    const client = getSupabaseBrowserClient();
    const channel = client.channel(boardChannelName(sessionId));
    channel.on('broadcast', { event: BOARD_DIRTY_EVENT }, () => onDirty()).subscribe();
    return () => {
      void client.removeChannel(channel);
    };
    // onDirty는 호출부에서 안정 참조(usePolling.refetch)를 넘긴다
  }, [sessionId, onDirty]);
}
