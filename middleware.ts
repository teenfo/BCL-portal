import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    let res = NextResponse.next({
        request: {
            headers: req.headers,
        },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-supabase-url")) {
        return res; // Bypass auth logic if credentials are not configured
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return req.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    req.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    res = NextResponse.next({
                        request: {
                            headers: req.headers,
                        },
                    });
                    res.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    req.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    res = NextResponse.next({
                        request: {
                            headers: req.headers,
                        },
                    });
                    res.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    const {
        data: { session },
    } = await supabase.auth.getSession();

    const url = req.nextUrl.clone();

    // Protect /admin routes
    if (url.pathname.startsWith('/admin')) {
        // Exclude login page itself from redirection
        if (!url.pathname.startsWith('/admin/auth') && !session) {
            url.pathname = '/admin/auth/login';
            return NextResponse.redirect(url);
        }
    }

    // Protect /apps routes
    if (url.pathname.startsWith('/apps')) {
        // Exclude login and callback pages
        if (!url.pathname.startsWith('/apps/auth') && !url.pathname.startsWith('/auth/callback') && !session) {
            url.pathname = '/apps/auth/login';
            return NextResponse.redirect(url);
        }
    }

    return res;
}

export const config = {
    matcher: ['/admin/:path*', '/apps/:path*'],
};
