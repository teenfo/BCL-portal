'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /class/ 접근 시 /class/timer로 리다이렉트
 */
export default function ClassIndexPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/class/timer');
    }, [router]);

    return null;
}
