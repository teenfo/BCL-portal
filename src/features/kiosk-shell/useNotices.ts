'use client';

// 지점 공지 로드 (docs/06 §3.1) — 유휴 화면 게시 공지.
// Phase 3.5: 직접 notices 조회(anon RLS 차단)를 ANON DEFINER RPC fn_get_kiosk_notices로 교체.
//   RPC는 게시·미만료 공지의 안전 컬럼(title/body 등)만 반환. 실패/빈 결과는 조용히 무시(idle는 시계 중심).
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpc } from '@/lib/supabase/query';

export interface KioskNotice {
  id: string;
  title: string;
  content: string;
}

/** fn_get_kiosk_notices data 원소 — body(=본문) 키. is_pinned/published_at 정렬은 서버가 처리 */
interface KioskNoticeRow {
  id: string;
  title: string;
  body: string | null;
}

export function useNotices(facilityId: string | null): KioskNotice[] {
  const [notices, setNotices] = useState<KioskNotice[]>([]);

  useEffect(() => {
    if (!facilityId) return;
    let cancelled = false;
    void (async () => {
      try {
        const client = getSupabaseBrowserClient();
        const res = await rpc<KioskNoticeRow[]>(client, 'fn_get_kiosk_notices', {
          p_facility_id: facilityId,
        });
        if (!cancelled && res.success && Array.isArray(res.data)) {
          setNotices(
            res.data
              .slice(0, 5)
              .map((n) => ({ id: n.id, title: n.title, content: n.body ?? '' })),
          );
        }
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
