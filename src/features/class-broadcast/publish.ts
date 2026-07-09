'use client';

// 발행 측 헬퍼(코치 앱·Admin이 import) — 인증 클라이언트에서만 UI 노출 전제.
// TV는 이 함수를 호출하지 않는다(수신 전용). docs/05 §4.1 계약.
//
// 사용 예(코치 앱):
//   const pub = createConsolePublisher(facilityId);
//   await pub.setMode('timer');
//   await pub.timer({ action: 'configure', mode: 'countdown', seconds: 720 });
//   await pub.timer({ action: 'start' });
//   pub.close();
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  CONSOLE_CMD_EVENT,
  consoleChannelName,
  type ConsoleCommandPayload,
  type ConsoleMode,
  type TimerCommand,
} from './contract';

export interface ConsolePublisher {
  setMode: (mode: ConsoleMode, targetConsoleId?: string | null) => Promise<void>;
  timer: (cmd: TimerCommand, targetConsoleId?: string | null) => Promise<void>;
  refresh: (targetConsoleId?: string | null) => Promise<void>;
  identify: (targetConsoleId?: string | null) => Promise<void>;
  /** 콘솔을 해당 이벤트의 레이스 관전 화면으로 전환(§4b) — DB 미경유, 화면 전환만 */
  openRace: (eventId: string, targetConsoleId?: string | null) => Promise<void>;
  close: () => void;
}

export function createConsolePublisher(
  facilityId: string,
  sender: string = 'coach',
): ConsolePublisher {
  const client = getSupabaseBrowserClient();
  let channel: RealtimeChannel | null = client.channel(consoleChannelName(facilityId));
  channel.subscribe();

  async function send(partial: Omit<ConsoleCommandPayload, 'ts' | 'sender'>): Promise<void> {
    if (!channel) return;
    const payload: ConsoleCommandPayload = { ...partial, ts: Date.now(), sender };
    await channel.send({ type: 'broadcast', event: CONSOLE_CMD_EVENT, payload });
  }

  return {
    setMode: (mode, target = null) =>
      send({ cmd: 'set_mode', mode, target_console_id: target }),
    timer: (cmd, target = null) => send({ cmd: 'timer', timer: cmd, target_console_id: target }),
    refresh: (target = null) => send({ cmd: 'refresh', target_console_id: target }),
    identify: (target = null) => send({ cmd: 'identify', target_console_id: target }),
    openRace: (eventId, target = null) =>
      send({ cmd: 'open_race', event_id: eventId, target_console_id: target }),
    close: () => {
      if (channel) {
        void client.removeChannel(channel);
        channel = null;
      }
    },
  };
}
