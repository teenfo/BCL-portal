'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function LogoutPage() {
    useEffect(() => {
        const logout = async () => {
            await supabase.auth.signOut();
            window.location.href = '/';
        };
        logout();
    }, []);

    return <div>Logging out...</div>;
}
