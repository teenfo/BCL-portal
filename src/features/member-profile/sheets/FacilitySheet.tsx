'use client';

// profile §지점 정보 (as-is facilities 흡수) — 주소/운영시간/약관·환불규정 열람.
import { EmptyState, Skeleton } from '@/components/ui';
import { BottomSheet } from '@/features/member-shell';
import { useQuery } from '@/lib/data/useQuery';
import { query, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import screen from '@/features/member-shell/screen.module.css';
import styles from '../profile.module.css';
import type { FacilityInfo } from '../types';

const DOW = ['월', '화', '수', '목', '금', '토', '일'];
const DOW_KEY = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function FacilitySheet({ facilityId, onClose }: { facilityId: string | null; onClose: () => void }) {
  const data = useQuery<FacilityInfo>(
    () =>
      facilityId
        ? query<FacilityInfo>(getSupabaseBrowserClient(), 'facilities', (q) =>
            q
              .select('id, name, address, phone, operating_hours, terms_of_service, refund_policy')
              .eq('id', facilityId)
              .single(),
          )
        : Promise.resolve<Envelope<FacilityInfo>>({ success: false, data: null, error: '소속 지점 정보가 없습니다.' }),
    [facilityId],
  );

  const f = data.data;

  return (
    <BottomSheet variant="full" title="지점 정보" onClose={onClose}>
      {data.error ? (
        <EmptyState variant="error" title="지점 정보를 불러오지 못했습니다" description={data.error} onRetry={data.refetch} />
      ) : data.loading && !data.data ? (
        <Skeleton variant="rect" height={200} />
      ) : f ? (
        <>
          <div className={screen.section}>
            <h3 className={screen.sectionTitle}>{f.name}</h3>
            {f.address ? <p className={screen.bodyText}>{f.address}</p> : null}
            {f.phone ? <p className={screen.muted}>{f.phone}</p> : null}
          </div>

          {f.operating_hours ? (
            <div className={screen.section}>
              <h3 className={screen.sectionTitle}>운영 시간</h3>
              {DOW_KEY.map((k, i) => {
                const h = f.operating_hours?.[k];
                return (
                  <div key={k} className={screen.rowBetween}>
                    <span className={screen.muted}>{DOW[i]}</span>
                    <span className={screen.bodyText}>{h?.open ? `${h.open} – ${h.close ?? ''}` : '휴무'}</span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {f.refund_policy ? (
            <div className={screen.section}>
              <h3 className={screen.sectionTitle}>환불 규정</h3>
              <p className={styles.policyText}>{f.refund_policy}</p>
            </div>
          ) : null}
          {f.terms_of_service ? (
            <div className={screen.section}>
              <h3 className={screen.sectionTitle}>이용 약관</h3>
              <p className={styles.policyText}>{f.terms_of_service}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </BottomSheet>
  );
}
