'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
    useEffect(() => {
        const handleCallback = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (data?.session) {
                window.location.href = '/apps/dashboard';
            } else {
                window.location.href = '/apps/auth/login';
            }
        };
        handleCallback();
    }, []);

    return <div>Loading authentication...</div>;
}
