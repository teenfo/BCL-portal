import { createClient } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 쿼리 헬퍼
 * 
 * TypeScript의 "Type instantiation is excessively deep" 에러를 
 * 구조적으로 우회하는 유틸리티입니다.
 * 
 * @description
 * Supabase의 자동 생성 Database 타입이 테이블 수에 비례하여 
 * 재귀 깊이가 깊어지면 TS2589 에러가 발생합니다.
 * 이 헬퍼를 사용하면 `as any` 캐스팅 없이 쿼리를 작성할 수 있습니다.
 * 
 * @usage
 * ```ts
 * import { query } from '@/lib/supabase/query';
 * const { data, error } = await query('transactions').select('*').eq('source', 'pos');
 * ```
 */

type QueryBuilder = ReturnType<SupabaseClient['from']>;

/**
 * 타입 안전 우회 쿼리 빌더
 * @param table 테이블 이름
 * @param client (선택) Supabase 클라이언트. 기본값: createClient()
 */
export function query(table: string, client?: SupabaseClient): QueryBuilder {
    const supabase = client ?? createClient();
    return (supabase as any).from(table);
}

/**
 * RPC 호출 헬퍼
 * @param fn RPC 함수 이름
 * @param args 인자
 * @param client (선택) Supabase 클라이언트
 */
export function rpc(fn: string, args?: Record<string, any>, client?: SupabaseClient) {
    const supabase = client ?? createClient();
    return (supabase as any).rpc(fn, args);
}
