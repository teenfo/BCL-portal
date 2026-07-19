'use client';

// /class → screen-console 리다이렉트 (docs/05 §1: 진입점을 통합 콘솔로).
// facility 쿼리는 보존하여 전달.
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ClassRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const facility = params?.get('facility');
    const qs = facility ? `?facility=${encodeURIComponent(facility)}` : '';
    router.replace(`/class/screen-console${qs}`);
  }, [router, params]);
  return null;
}

export default function ClassIndexPage() {
  return (
    <Suspense fallback={null}>
      <ClassRedirect />
    </Suspense>
  );
}
