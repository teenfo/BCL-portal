'use client';

// 시설 미지정 시 안내(무한 스피너·에러 화면 금지 — 인증 계약 §7 준용).
// URL(?facility=) 수동 입력 대신 지점 선택 버튼 제공 — 로그인(authenticated) 시 목록 조회.
//   선택 → ?facility={id} 로 이동하면 useFacilityContext 가 localStorage 에 고정(이후 자동 기억).
//   anon TV(목록 조회 불가)는 URL 안내로 폴백.
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './tv.module.css';

interface FacilityLite {
  id: string;
  name: string;
}

export function SetupNotice() {
  const router = useRouter();
  const pathname = usePathname();

  const facilities = useQuery<FacilityLite[]>(
    () =>
      query<FacilityLite[]>(getSupabaseBrowserClient(), 'facilities', (q) =>
        q.select('id,name').eq('is_active', true).order('name', { ascending: true }),
      ),
    [],
  );

  const list = facilities.data ?? [];
  const pick = (id: string) => router.replace(`${pathname}?facility=${id}`);

  return (
    <div className={styles.setupNotice}>
      <div className={styles.setupTitle}>화면 설정 필요</div>

      {facilities.loading ? (
        <p className={styles.setupBody}>지점 목록을 불러오는 중…</p>
      ) : list.length > 0 ? (
        <>
          <p className={styles.setupBody}>이 TV의 지점을 선택하세요. 선택하면 이후 자동으로 기억됩니다.</p>
          <div className={styles.setupPicker}>
            {list.map((fac) => (
              <Button key={fac.id} variant="primary" onClick={() => pick(fac.id)}>
                {fac.name}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <p className={styles.setupBody}>
          이 TV의 지점을 지정하세요. 관리자 계정으로 로그인하면 목록에서 선택할 수 있습니다. 또는 주소
          끝에 <span className={styles.setupCode}>?facility=&lt;시설ID&gt;</span> 를 붙여 한 번 열면
          이후 자동 기억됩니다.
        </p>
      )}
    </div>
  );
}
