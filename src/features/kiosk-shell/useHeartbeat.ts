'use client';

// Heartbeat (docs/06 §6) — 30초 주기 kiosk_devices.last_heartbeat UPDATE.
// ※ kiosk_devices RLS는 admin 전용(docs/sql/08 §RLS: "키오스크 단말은 Service Role 사용")이라
//   anon 클라이언트의 UPDATE는 차단된다. 여기서는 best-effort로 시도하고, 성공/실패를
//   네트워크 상태 신호로만 사용한다. 정식 heartbeat 경로(device-token RPC 또는 서버)는 미구현 — FLAG.
import { useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { query } from '@/lib/supabase/query';

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
        const res = await query(client, 'kiosk_devices', (q) =>
          q.update({ last_heartbeat: new Date().toISOString(), status: 'active' }).eq('id', deviceId),
        );
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
