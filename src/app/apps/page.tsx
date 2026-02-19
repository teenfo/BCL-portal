'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /apps/ 접근 시 /apps/dashboard로 리다이렉트
 */
export default function AppsIndexPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/apps/dashboard');
    }, [router]);

    return null;
}
