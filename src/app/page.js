"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Simple logic for redirection based on email or metadata
        // In a real scenario, we'd check metadata.role here.
        router.replace("/apps/dashboard");
      } else {
        router.replace("/apps/auth/login");
      }
    };
    checkUser();
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-primary)"
    }}>
      <div className="animate-pulse" style={{ fontSize: "2rem" }}>⚡</div>
    </div>
  );
}
