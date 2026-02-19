'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /coach/ 접근 시 /coach/dashboard로 리다이렉트
 */
export default function CoachIndexPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/coach/dashboard');
    }, [router]);

    return null;
}
