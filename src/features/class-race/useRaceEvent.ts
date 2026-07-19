'use client';

// Race 이벤트 메타 조회 — race_events anon SELECT(§6.1). 테마(event_type)·목표거리·모드.
import { usePolling } from '@/features/class-common';
import { query, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { RaceEvent } from '@/features/race-admin/types';
import type { PacerConfig } from './contract';

/** race_events 행 + pacer_config(§4b.5). RaceEvent(race-admin)에 페이서 필드 확장 */
export type RaceEventWithPacer = RaceEvent & { pacer_config: PacerConfig | null };

function fetchEvent(eventId: string): Promise<Envelope<RaceEventWithPacer | null>> {
  return query<RaceEventWithPacer | null>(getSupabaseBrowserClient(), 'race_events', (q) =>
    q
      .select(
        'id,facility_id,session_id,coach_id,name,event_date,event_type,race_format,course_layout,target_distance_m,duration_minutes,group_target_m,heat_no,description,status,lobby_status,created_at,pacer_config',
      )
      .eq('id', eventId)
      .maybeSingle(),
  );
}

export function useRaceEvent(eventId: string | null) {
  return usePolling<RaceEventWithPacer | null>(
    () =>
      eventId
        ? fetchEvent(eventId)
        : Promise.resolve({ success: true, data: null, error: null }),
    // 10s — 시뮬레이터/관리자가 목표 거리 등 메타를 바꾼 직후 표시 지연 최소화(단일 행 anon SELECT)
    10_000,
    [eventId],
  );
}
