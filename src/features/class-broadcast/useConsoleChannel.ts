'use client';

// TV(Class) 측 콘솔 명령 수신 훅 — anon 구독 (docs/05 §4, §6)
// 명령 수신 시 콜백 실행. 스테일·대상 판정은 contract 헬퍼로 강제.
import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  CONSOLE_CMD_EVENT,
  consoleChannelName,
  isCommandForConsole,
  isCommandStale,
  type ConsoleCommandPayload,
} from './contract';

export type RealtimeStatus = 'connecting' | 'connected' | 'error';

interface UseConsoleChannelArgs {
  facilityId: string | null;
  consoleId: string;
  onCommand: (payload: ConsoleCommandPayload) => void;
}

/**
 * class-console:{facility} 채널 구독. 대상·스테일 필터 통과분만 onCommand로 전달.
 * onCommand는 최신 참조를 ref로 고정 — 채널 재구독 없이 콜백 갱신.
 */
export function useConsoleChannel({
  facilityId,
  consoleId,
  onCommand,
}: UseConsoleChannelArgs): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const cbRef = useRef(onCommand);
  useEffect(() => {
    cbRef.current = onCommand;
  });

  useEffect(() => {
    if (!facilityId) return;
    const client = getSupabaseBrowserClient();
    const channel = client.channel(consoleChannelName(facilityId), {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: CONSOLE_CMD_EVENT }, (msg) => {
        const payload = msg.payload as ConsoleCommandPayload;
        if (!payload || typeof payload !== 'object') return;
        if (isCommandStale(payload)) return;
        if (!isCommandForConsole(payload, consoleId)) return;
        cbRef.current(payload);
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') setStatus('connected');
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('error');
        else setStatus('connecting');
      });

    return () => {
      // 무인 24h 구동 — 구독 정리 필수(메모리 누수 게이트 C-5)
      void client.removeChannel(channel);
    };
  }, [facilityId, consoleId]);

  return status;
}
