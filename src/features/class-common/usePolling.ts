'use client';

// 무인 내구 폴링 훅 (docs/05 §2 무인 내구성) — 실패 시 직전 데이터 유지 + stale 플래그.
// 성공: data 갱신·error 클리어. 실패: 이전 data 보존, error 세팅, 지수 백오프 재시도.
// setState는 항상 await 이후(마이크로태스크 경계) — cascading render 회피(useQuery 규약 준용).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Envelope } from '@/lib/supabase/query';

export interface PollingState<T> {
  data: T | null;
  /** 마지막 조회가 실패해 화면이 직전 데이터를 표시 중 */
  stale: boolean;
  /** 최초 로드 진행 중(직전 데이터 없음) */
  initialLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * @param fetcher envelope 반환(rpc/query 결과 그대로)
 * @param intervalMs 정상 폴링 주기
 * @param deps 변경 시 즉시 재조회
 */
export function usePolling<T>(
  fetcher: () => Promise<Envelope<T>>,
  intervalMs: number,
  deps: unknown[] = [],
): PollingState<T> {
  const [data, setData] = useState<T | null>(null);
  const [stale, setStale] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });
  const hasDataRef = useRef(false);
  const refetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    let mounted = true;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      let res: Envelope<T>;
      try {
        res = await fetcherRef.current();
      } catch (e) {
        res = { success: false, data: null, error: e instanceof Error ? e.message : '네트워크 오류' };
      }
      if (!mounted) return;

      if (res.success) {
        failures = 0;
        hasDataRef.current = true;
        setData(res.data);
        setError(null);
        setStale(false);
        setInitialLoading(false);
      } else {
        failures += 1;
        setError(res.error ?? '데이터를 불러오지 못했습니다.');
        if (hasDataRef.current) setStale(true);
        else setInitialLoading(false);
      }

      const backoff = failures > 0 ? Math.min(intervalMs * 2 ** failures, 30_000) : intervalMs;
      timer = setTimeout(() => void tick(), backoff);
    };

    refetchRef.current = () => {
      if (timer) clearTimeout(timer);
      void tick();
    };
    void tick();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
    // deps 변경 시 재시작(호출측 지정 제네릭 인자)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = useCallback(() => refetchRef.current(), []);

  return { data, stale, initialLoading, error, refetch };
}
