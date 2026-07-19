'use client';

// 시설 컨텍스트 — URL ?facility={id} 우선, 없으면 localStorage 고정값(설치 시 1회 지정).
// docs/05 §6.1: 시설 스코프는 URL + localStorage 단일 소스.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const FACILITY_KEY = 'bcl.class.facility_id';

export function useFacilityContext(): string | null {
  const params = useSearchParams();
  const fromUrl = params?.get('facility') ?? null;
  const [facilityId, setFacilityId] = useState<string | null>(fromUrl);

  useEffect(() => {
    let active = true;
    // 마이크로태스크 이후 상태 전이 — 이펙트 동기 setState 회피(useQuery 규약 준용)
    void Promise.resolve().then(() => {
      if (!active) return;
      if (fromUrl) {
        try {
          window.localStorage.setItem(FACILITY_KEY, fromUrl);
        } catch {
          /* private mode 등 — 무시 */
        }
        setFacilityId(fromUrl);
        return;
      }
      try {
        setFacilityId(window.localStorage.getItem(FACILITY_KEY));
      } catch {
        setFacilityId(null);
      }
    });
    return () => {
      active = false;
    };
  }, [fromUrl]);

  return facilityId;
}
