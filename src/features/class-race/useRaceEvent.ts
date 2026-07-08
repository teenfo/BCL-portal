'use client';

// Race 이벤트 메타 조회 — race_events anon SELECT(§6.1). 테마(event_type)·목표거리·모드.
import { usePolling } from '@/features/class-common';
import { query, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { RaceEvent } from '@/features/race-admin/types';

function fetchEvent(eventId: string): Promise<Envelope<RaceEvent | null>> {
  return query<RaceEvent | null>(getSupabaseBrowserClient(), 'race_events', (q) =>
    q
      .select(
        'id,facility_id,session_id,coach_id,name,event_date,event_type,race_format,target_distance_m,duration_minutes,group_target_m,heat_no,description,status,lobby_status,created_at',
      )
      .eq('id', eventId)
      .maybeSingle(),
  );
}

export function useRaceEvent(eventId: string | null) {
  return usePolling<RaceEvent | null>(
    () =>
      eventId
        ? fetchEvent(eventId)
        : Promise.resolve({ success: true, data: null, error: null }),
    30_000,
    [eventId],
  );
}
