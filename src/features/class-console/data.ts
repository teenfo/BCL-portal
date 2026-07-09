'use client';

// Class 공개 RPC 페처 — anon 화이트리스트 3종만 호출 (docs/05 §6.1).
// rpc() 헬퍼 경유(직접 supabase-js 금지). Display-Safe는 RPC 내부에서 강제됨.
import { rpc, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

// ── 반환 타입(RPC data 형태, docs/sql/09_rpc.sql L.1~L.3 / E.10) ──

export interface DisplayWod {
  session_id: string | null;
  session_title: string | null;
  session_date: string | null;
  session_start: string | null;
  session_end: string | null;
  wod_id: string | null;
  title: string | null;
  format: string | null;
  time_cap_minutes: number | null;
  rounds: number | null;
  description: string | null;
  movements_snapshot: WodMovement[] | null;
  class_display_notes: string | null;
  published_at: string | null;
}

export interface WodMovement {
  name?: string;
  reps?: string | number | null;
  target?: string | null;
  rx_male?: string | null;
  rx_female?: string | null;
  /** 컴파운드 세트 그룹 태그. 연속 동일 값 = 한 세트로 묶어 표시. null/부재 = 단독. */
  superset_group?: string | null;
  [k: string]: unknown;
}

export interface LiveSessionCurrent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  coach_names: string[];
  checkin_count: number;
  booked_count: number;
  checked_in_names: string[];
}

export interface LiveSessionNext {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  booked_count: number;
}

export interface LiveBoard {
  server_time: string;
  current: LiveSessionCurrent | null;
  next: LiveSessionNext | null;
}

export interface ScreenPr {
  member_name: string;
  item_label: string;
  result_label: string;
  achieved_at: string;
  source: 'benchmark' | 'race';
}

export function fetchDisplayWod(facilityId: string): Promise<Envelope<DisplayWod | null>> {
  return rpc<DisplayWod | null>(getSupabaseBrowserClient(), 'fn_get_class_display_wod', {
    p_facility_id: facilityId,
  });
}

export function fetchLiveBoard(facilityId: string): Promise<Envelope<LiveBoard>> {
  return rpc<LiveBoard>(getSupabaseBrowserClient(), 'fn_get_class_live_board', {
    p_facility_id: facilityId,
  });
}

export function fetchScreenPrs(facilityId: string, days = 7): Promise<Envelope<ScreenPr[]>> {
  return rpc<ScreenPr[]>(getSupabaseBrowserClient(), 'fn_get_class_screen_prs', {
    p_facility_id: facilityId,
    p_days: days,
  });
}

/** HH:MM:SS → HH:MM 표시 정규화 */
export function hm(t: string | null | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}
