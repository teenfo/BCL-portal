"use client";

import { useEffect } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const handleAuth = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (data?.session) {
                // Here we could check user claims to decide where to redirect
                // For now, redirecting based on origin or a default
                router.push("/apps/dashboard");
            } else {
                router.push("/apps/auth/login");
            }
        };
        handleAuth();
    }, [router, supabase]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}
