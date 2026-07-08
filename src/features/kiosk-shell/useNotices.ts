'use client';

// 지점 공지 로드 (docs/06 §3.1) — notices(is_published) facility 스코프.
// ※ notices RLS는 authenticated 전용(anon 불가, docs/sql/08). 키오스크가 공용 지점 계정
//   로그인 없이 anon으로 뜨면 조회가 비어 온다 — 실패/빈 결과는 조용히 무시(idle는 시계 중심). FLAG.
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { query } from '@/lib/supabase/query';

export interface KioskNotice {
  id: string;
  title: string;
  content: string;
}

export function useNotices(facilityId: string | null): KioskNotice[] {
  const [notices, setNotices] = useState<KioskNotice[]>([]);

  useEffect(() => {
    if (!facilityId) return;
    let cancelled = false;
    void (async () => {
      try {
        const client = getSupabaseBrowserClient();
        const res = await query<KioskNotice[]>(client, 'notices', (q) =>
          q
            .select('id, title, content')
            .eq('facility_id', facilityId)
            .eq('is_published', true)
            .order('is_pinned', { ascending: false })
            .order('published_at', { ascending: false })
            .limit(5),
        );
        if (!cancelled && res.success && res.data) setNotices(res.data);
      } catch {
        /* anon 조회 불가/네트워크 — idle은 공지 없이도 동작 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facilityId]);

  return notices;
}
