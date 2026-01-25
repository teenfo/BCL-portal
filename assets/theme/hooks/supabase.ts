import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for Client-Side Rendering (CSR).
 * This client respects RLS and uses the anon key.
 */
export const createClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey || url.includes("your-supabase-url")) {
        console.warn("Supabase credentials missing or invalid. Auth will be limited.");
        // We still create the client but it will fail on actual calls, which is better than a null pointer crash
        return createBrowserClient(
            url || 'https://placeholder.supabase.co',
            anonKey || 'placeholder'
        );
    }

    return createBrowserClient(
        url,
        anonKey
    );
};
