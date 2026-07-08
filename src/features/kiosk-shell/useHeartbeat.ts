'use client';

// Heartbeat (docs/06 §6) — 30초 주기 단말 상태 갱신.
// Phase 3.5: 직접 kiosk_devices UPDATE(anon RLS 차단)를 ANON DEFINER RPC fn_kiosk_heartbeat로 교체.
//   RPC가 last_heartbeat/status를 갱신한다. 성공/실패를 네트워크 상태 신호로도 사용한다.
import { useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpc } from '@/lib/supabase/query';

const HEARTBEAT_MS = 30_000;

interface Options {
  deviceId: string | null;
  /** heartbeat 왕복 결과 콜백 — true=성공(온라인), false=실패(오프라인 후보) */
  onResult: (ok: boolean) => void;
}

export function useHeartbeat({ deviceId, onResult }: Options): void {
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;

    const beat = async () => {
      try {
        const client = getSupabaseBrowserClient();
        const res = await rpc(client, 'fn_kiosk_heartbeat', {
          p_device_id: deviceId,
          p_status: 'online',
        });
        if (!cancelled) onResultRef.current(res.success);
      } catch {
        if (!cancelled) onResultRef.current(false);
      }
    };

    void beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [deviceId]);
}
