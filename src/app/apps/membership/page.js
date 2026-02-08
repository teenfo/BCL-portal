"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function MembershipView() {
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchMemberInfo();
    }, []);

    const fetchMemberInfo = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from("members").select("*").eq("email", user.email).single();
            setMember(data);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>멤버십 및 이용권</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>나의 현재 플랜과 잔여 횟수를 확인하세요.</p>
            </header>

            {loading ? (
                <p>로딩 중...</p>
            ) : !member ? (
                <p>회원 정보를 찾을 수 없습니다.</p>
            ) : (
                <>
                    <div className="premium-card" style={{ padding: "32px", marginBottom: "24px", background: "linear-gradient(135deg, var(--brand-primary) 0%, #FF9100 100%)", border: "none" }}>
                        <div style={{ marginBottom: "24px" }}>
                            <span style={{ fontSize: "0.85rem", background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: "20px", color: "white" }}>
                                {member.membership_type || "기본 플랜"}
                            </span>
                            <h3 style={{ fontSize: "2rem", fontWeight: "900", marginTop: "12px", color: "white" }}>
                                {member.remaining_sessions} <span style={{ fontSize: "1.2rem", fontWeight: "600" }}>회 남음</span>
                            </h3>
                        </div>
                        <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.8)" }}>
                            만료일: 2026.05.07 (90일 남음)
                        </p>
                    </div>

                    <div className="premium-card" style={{ padding: "24px", marginBottom: "32px" }}>
                        <h4 style={{ fontSize: "1.1rem", marginBottom: "20px" }}>이용 혜택</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}>
                                <span style={{ color: "var(--brand-primary)" }}>✓</span> 모든 센터 그룹 클래스 참여 가능
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}>
                                <span style={{ color: "var(--brand-primary)" }}>✓</span> 1:1 코칭 상담 서비스 포함
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}>
                                <span style={{ color: "var(--brand-primary)" }}>✓</span> 전용 락커 및 운동복 제공
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push("/apps/membership/plans")}
                        className="btn-primary"
                        style={{ width: "100%", padding: "16px", fontSize: "1.1rem" }}
                    >
                        멤버십 연장 및 업그레이드
                    </button>

                    <p style={{ textAlign: "center", marginTop: "20px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        환불 관련 문의는 <span style={{ color: "var(--brand-primary)", cursor: "pointer" }} onClick={() => router.push("/apps/support")}>고객센터</span>를 이용해주세요.
                    </p>
                </>
            )}
        </div>
    );
}
