'use client';

// rotation-hud 동기화 — session_rotation_states(anon SELECT 의도적 공개 §6.1) 초기 로드·복원
// + Realtime hud-sync:{session_id} 명령 수신(코치 리모컨, docs/05 §4.2 준거 구현).
// 상태 SSOT는 session_rotation_states — 명령 수신 시 재조회로 복원(새로고침 복원 C-8).
import { useEffect, useRef, useState } from 'react';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { hudChannelName } from '@/features/class-broadcast';

export interface StationAssignment {
  station?: number | string;
  task?: string;
  label?: string;
  members?: string[];
  team?: string;
  [k: string]: unknown;
}

export interface RotationState {
  session_id: string;
  facility_id: string;
  current_round: number;
  total_rounds: number;
  seconds_per_round: number;
  is_running: boolean;
  timer_started_at: string | null;
  paused_remaining_seconds: number | null;
  team_assignments: StationAssignment[];
  updated_at: string;
}

interface RawRow extends Omit<RotationState, 'team_assignments'> {
  team_assignments: unknown;
}

function normalize(row: RawRow | null): RotationState | null {
  if (!row) return null;
  const raw = row.team_assignments;
  let stations: StationAssignment[] = [];
  if (Array.isArray(raw)) stations = raw as StationAssignment[];
  else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.stations)) stations = obj.stations as StationAssignment[];
    else stations = Object.entries(obj).map(([k, v]) => ({ station: k, ...(v as object) }));
  }
  return { ...row, team_assignments: stations };
}

export function useRotationSync(sessionId: string | null) {
  const [state, setState] = useState<RotationState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const reloadRef = useRef<() => void>(() => {});

  // 초기 로드 + 재조회 함수 등록(상태 SSOT는 DB). setState는 await 이후(cascading render 회피).
  useEffect(() => {
    let active = true;
    const doLoad = async () => {
      await Promise.resolve();
      if (!active || !sessionId) return;
      const res = await query<RawRow | null>(
        getSupabaseBrowserClient(),
        'session_rotation_states',
        (q) => q.select('*').eq('session_id', sessionId).maybeSingle(),
      );
      if (!active) return;
      if (res.success) {
        setState(normalize(res.data ?? null));
        setLoaded(true);
      } else {
        setLoaded(true); // 에러 표면화(무한 스피너 금지) — state null 유지
      }
    };
    reloadRef.current = () => void doLoad();
    void doLoad();
    return () => {
      active = false;
    };
  }, [sessionId]);

  // hud-sync:{session_id} — 명령 수신 시 재조회
  useEffect(() => {
    if (!sessionId) return;
    const client = getSupabaseBrowserClient();
    const ch = client
      .channel(hudChannelName(sessionId))
      .on('broadcast', { event: 'hud_cmd' }, () => reloadRef.current())
      .subscribe();
    return () => {
      void client.removeChannel(ch);
    };
  }, [sessionId]);

  return { state, loaded };
}
