import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for Client-Side Rendering (CSR).
 * This client respects RLS and uses the anon key.
 */
export const createClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        console.warn("Supabase credentials missing. Using placeholder client.");
    }

    return createBrowserClient(
        url!,
        anonKey!
    );
};
