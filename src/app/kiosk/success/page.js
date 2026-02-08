"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function SuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [member, setMember] = useState(null);
    const userId = searchParams.get("id");

    useEffect(() => {
        if (userId) {
            handleCheckin(userId);
        }

        const timer = setTimeout(() => {
            router.push("/kiosk");
        }, 5000);

        return () => clearTimeout(timer);
    }, [userId]);

    const handleCheckin = async (id) => {
        try {
            // 1. Fetch Member Info
            const { data, error } = await supabase
                .from("members")
                .select("id, name, remaining_sessions")
                .eq("id", id)
                .single();

            if (data) {
                setMember(data);
                // 2. Insert Check-in Log
                await supabase.from("checkins").insert({
                    member_id: id,
                    method: "kiosk_qr",
                    timestamp: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error("Checkin error:", err);
        }
    };

    return (
        <div style={{
            height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px"
        }}>
            <div className="animate-fade-in">
                <div style={{ fontSize: "8rem", marginBottom: "20px", color: "var(--status-success)" }}>✅</div>
                <h2 style={{ fontSize: "3.5rem", fontWeight: "900", marginBottom: "15px" }}>
                    {member ? `${member.name}님, 환영합니다!` : "체크인 완료!"}
                </h2>
                <p style={{ fontSize: "1.5rem", color: "var(--text-secondary)", marginBottom: "40px" }}>
                    오늘도 즐거운 운동 되세요!
                </p>

                {member && (
                    <div className="premium-card" style={{ padding: "20px 60px", display: "inline-block" }}>
                        <p style={{ fontSize: "1.25rem" }}>
                            남은 세션: <span style={{ color: "var(--brand-primary)", fontWeight: "800" }}>{member.remaining_sessions}회</span>
                        </p>
                    </div>
                )}
            </div>

            <p style={{ position: "absolute", bottom: "40px", color: "var(--text-secondary)" }}>
                5초 후 메인 화면으로 이동합니다...
            </p>
        </div>
    );
}

export default function KioskSuccess() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
