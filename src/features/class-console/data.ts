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
  /** 정본 스냅샷 키(WodPanel buildPayload) — 목표 수량/단위·RX 중량 */
  target_value?: string | number | null;
  target_unit?: string | null;
  load_male_rx?: string | null;
  load_female_rx?: string | null;
  /** 구 스냅샷 키 폴백(초기 데이터 호환) */
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
  /** 오늘 생일 회원 이름(활성·옵트인만 — Display-Safe: 이름만, 생년 미노출) */
  today_birthdays?: string[];
}

export interface ScreenPr {
  member_name: string;
  item_label: string;
  result_label: string;
  achieved_at: string;
  source: 'benchmark' | 'race';
}

/** TV(시설) 로컬 날짜 YYYY-MM-DD — 서버 CURRENT_DATE(UTC)와의 시차로 KST 오전에
 *  오늘 세션 WOD가 안 잡히던 결함 방지(날짜는 항상 클라이언트가 명시 전달) */
function localDate(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fetchDisplayWod(facilityId: string): Promise<Envelope<DisplayWod | null>> {
  return rpc<DisplayWod | null>(getSupabaseBrowserClient(), 'fn_get_class_display_wod', {
    p_facility_id: facilityId,
    p_date: localDate(),
  });
}

/** 세션 스코프 WOD 조회 — flow 명령의 session_id 기준. 같은 날 복수 세션이 게시된 시설에서
 *  시설+날짜 조회(최신 세션 우선)가 다른 세션 WOD를 집어오는 것을 방지(화이트보드와 세션 정합) */
export function fetchSessionDisplayWod(sessionId: string): Promise<Envelope<DisplayWod | null>> {
  return rpc<DisplayWod | null>(getSupabaseBrowserClient(), 'fn_get_class_display_wod', {
    p_session_id: sessionId,
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
