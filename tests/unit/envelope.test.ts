// query()/rpc() 엔벨로프 헬퍼 — src/lib/supabase/query.ts
// 표준 계약: 모든 DB 접근 결과는 {success, data, error} 1종으로 정규화 (docs/07 §7)
// 라이브 DB 불필요 — SupabaseClient의 rpc/from만 모킹해 순수 정규화 로직을 검증.
import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { rpc, query, type Envelope } from '@/lib/supabase/query';

/** rpc(fn, args)가 반환할 { data, error }를 지정하는 최소 목 클라이언트 */
function mockRpcClient(result: { data: unknown; error: { message: string } | null }): SupabaseClient {
  return {
    rpc: async () => result,
  } as unknown as SupabaseClient;
}

describe('rpc — 서버 함수 호출 정규화', () => {
  it('supabase 오류는 success=false + error 메시지', async () => {
    const client = mockRpcClient({ data: null, error: { message: 'boom' } });
    const res = await rpc<unknown>(client, 'fn_x');
    expect(res).toEqual<Envelope<unknown>>({ success: false, data: null, error: 'boom' });
  });

  it('서버가 이미 envelope를 반환하면 그대로 통과', async () => {
    const envelope = { success: true, data: { id: 42 }, error: null };
    const client = mockRpcClient({ data: envelope, error: null });
    const res = await rpc<{ id: number }>(client, 'fn_x');
    expect(res).toEqual(envelope);
  });

  it('실패 envelope(서버 판정 오류)도 그대로 통과', async () => {
    const envelope = { success: false, data: null, error: 'forbidden' };
    const client = mockRpcClient({ data: envelope, error: null });
    const res = await rpc<unknown>(client, 'fn_x');
    expect(res).toEqual(envelope);
  });

  it('스칼라/비-envelope data는 success=true로 감싼다', async () => {
    const client = mockRpcClient({ data: 7, error: null });
    const res = await rpc<number>(client, 'fn_x');
    expect(res).toEqual<Envelope<number>>({ success: true, data: 7, error: null });
  });

  it('data가 null/undefined면 data=null 정규화', async () => {
    const client = mockRpcClient({ data: null, error: null });
    const res = await rpc<unknown>(client, 'fn_x');
    expect(res).toEqual<Envelope<unknown>>({ success: true, data: null, error: null });
  });
});

// query()는 build 콜백이 넘긴 { data, error }를 정규화하므로 from() 반환값은 사용되지 않는다.
const queryClient = { from: () => ({}) } as unknown as SupabaseClient;

describe('query — 테이블 조회 정규화', () => {
  it('빌더 오류는 success=false + error', async () => {
    const res = await query<unknown>(queryClient, 'members', async () => ({
      data: null,
      error: { message: 'rls' },
    }));
    expect(res).toEqual<Envelope<unknown>>({ success: false, data: null, error: 'rls' });
  });

  it('정상 데이터는 success=true로 래핑', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const res = await query<Array<{ id: number }>>(queryClient, 'members', async () => ({
      data: rows,
      error: null,
    }));
    expect(res).toEqual<Envelope<Array<{ id: number }>>>({ success: true, data: rows, error: null });
  });

  it('null 데이터는 data=null', async () => {
    const res = await query<unknown>(queryClient, 'members', async () => ({ data: null, error: null }));
    expect(res).toEqual<Envelope<unknown>>({ success: true, data: null, error: null });
  });
});
