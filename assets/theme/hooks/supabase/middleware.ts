import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Basic Guard: If no user, redirect to login for protected routes
    // Protected routes: /apps/* (except auth), /admin/* (except auth)
    const path = request.nextUrl.pathname;
    const isProtectedUser = path.startsWith("/apps") && !path.startsWith("/apps/auth");
    const isProtectedAdmin = path.startsWith("/admin") && !path.startsWith("/admin/auth");

    if (!user && (isProtectedUser || isProtectedAdmin)) {
        const url = request.nextUrl.clone();
        if (isProtectedAdmin) {
            url.pathname = "/admin/auth/login";
        } else {
            url.pathname = "/apps/auth/login";
        }
        return NextResponse.redirect(url);
    }

    // Admin Guard: If user exists but not authorized? 
    // For MVP we assume all logged in users are members. 
    // Admin separation ideally needs a role check here, but standard Supabase checks usually happen in RLS or explicit role table query.
    // For now, we allow auth users to access, assuming specific admin accounts are seeded/managed separately.

    return response;
}
