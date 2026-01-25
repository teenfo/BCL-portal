"use client";

import { useEffect } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const handleLogout = async () => {
            await supabase.auth.signOut();
            router.refresh();
            router.push("/");
        };
        handleLogout();
    }, [router, supabase]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg text-fg">
            <div className="bg-surface p-8 rounded-2xl border border-border shadow-card text-center max-w-sm w-full mx-4">
                <h1 className="text-xl font-bold mb-2">Logging out...</h1>
                <p className="text-muted text-sm mb-6">We're securely signing you out of BCL Portal.</p>
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
        </div>
    );
}
