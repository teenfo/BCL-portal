'use client';

// 원격 명령 수신 (docs/06 §6) — Realtime 채널 `kiosk:{device_id}` 구독.
// 명령: reload(강제 새로고침) / to_idle / maintenance(점검 오버레이) / resume(점검 해제).
// Admin infrastructure 화면이 broadcast로 발행한다.
// ※ 발행 측(Admin) + 채널 인가는 별도 구현/정책 필요 — 수신 셸만 구현. FLAG.
import { useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type RemoteCommand = 'reload' | 'to_idle' | 'maintenance' | 'resume';

export function useRemoteCommands(deviceId: string | null, onCommand: (cmd: RemoteCommand) => void): void {
  const onCommandRef = useRef(onCommand);
  useEffect(() => {
    onCommandRef.current = onCommand;
  });

  useEffect(() => {
    if (!deviceId) return;
    const client = getSupabaseBrowserClient();
    const channel = client.channel(`kiosk:${deviceId}`, { config: { broadcast: { self: false } } });
    channel
      .on('broadcast', { event: 'command' }, (msg: { payload?: { command?: string } }) => {
        const cmd = msg.payload?.command;
        if (cmd === 'reload' || cmd === 'to_idle' || cmd === 'maintenance' || cmd === 'resume') {
          onCommandRef.current(cmd);
        }
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [deviceId]);
}
