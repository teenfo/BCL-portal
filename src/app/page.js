"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        // Simple logic for redirection based on email or metadata could be added here
        router.push("/apps/dashboard");
      } else {
        router.push("/apps/auth/login");
      }
    };
    checkUser();
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyItems: "center" }}>
    </div>
  );
}
