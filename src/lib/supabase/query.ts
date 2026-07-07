// query()/rpc() 헬퍼 — DB 접근은 이 두 함수 경유만 (직접 supabase-js from()/rpc() 호출 금지)
// envelope 표준 {success, data, error} 1종 (계약 §3, docs/07 §7)
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/** 표준 RPC 호출 — 서버 함수가 envelope를 반환한다(미반환 시 통신 오류로 취급) */
export async function rpc<T>(
  client: SupabaseClient,
  fn: string,
  args?: Record<string, unknown>,
): Promise<Envelope<T>> {
  const { data, error } = await client.rpc(fn, args);
  if (error) {
    return { success: false, data: null, error: error.message };
  }
  if (data && typeof data === 'object' && 'success' in data) {
    return data as Envelope<T>;
  }
  return { success: true, data: (data ?? null) as T | null, error: null };
}

/** 단순 테이블 조회 래퍼 — RLS 전제. 쓰기·복합 로직은 반드시 RPC로 */
export async function query<T>(
  client: SupabaseClient,
  table: string,
  build: (q: ReturnType<SupabaseClient['from']>) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<Envelope<T>> {
  const { data, error } = await build(client.from(table));
  if (error) {
    return { success: false, data: null, error: error.message };
  }
  return { success: true, data: (data ?? null) as T | null, error: null };
}
