'use client';

// 경량 비동기 데이터 훅 — 화면이 로딩/에러/재조회 패턴을 재발명하지 않도록 (rpc/query 헬퍼 위)
// 규약(12 §4.11 / 01-auth F-5): 로딩은 유한(8s safety) → 초과 시 error로 전이(무한 스켈레톤 금지).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Envelope } from '@/lib/supabase/query';

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const SAFETY_TIMEOUT_MS = 8_000; // 네트워크 여유(RPC는 무거울 수 있음) — 초과 시 에러 표면화

/**
 * fetcher는 표준 envelope({success,data,error})를 반환한다(rpc()/query() 헬퍼 결과 그대로).
 * deps 변경 시 자동 재조회. reqId 가드로 stale 응답 차단.
 */
export function useQuery<T>(fetcher: () => Promise<Envelope<T>>, deps: unknown[] = []): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);

  // 최신 fetcher 참조 갱신은 렌더 중이 아닌 이펙트에서 (react-hooks/refs)
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const reqId = ++reqRef.current;
    // 마이크로태스크 이후 상태 전이 — 이펙트 동기 setState(cascading render) 회피
    await Promise.resolve();
    if (!mountedRef.current || reqId !== reqRef.current) return;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      if (mountedRef.current && reqId === reqRef.current) {
        setLoading(false);
        setError('응답이 지연되고 있습니다. 다시 시도해주세요.');
      }
    }, SAFETY_TIMEOUT_MS);

    let res: Envelope<T>;
    try {
      res = await fetcherRef.current();
    } catch (e) {
      res = { success: false, data: null, error: e instanceof Error ? e.message : '요청 실패' };
    }
    clearTimeout(timer);
    if (!mountedRef.current || reqId !== reqRef.current) return;

    if (!res.success) {
      setError(res.error ?? '데이터를 불러오지 못했습니다.');
      setData(null);
    } else {
      setData(res.data);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void run();
    // deps 변경 시 재조회 — run은 안정(useCallback []). deps는 호출측이 지정하는 제네릭 인자.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: run };
}
