import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

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
