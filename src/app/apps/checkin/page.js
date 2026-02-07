"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CheckinView() {
    const [user, setUser] = useState(null);
    const [member, setMember] = useState(null);
    const [qrValue, setQrValue] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCurrentUser();
    }, []);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUser(user);
            fetchMemberInfo(user.email);
        } else {
            setLoading(false);
        }
    };

    const fetchMemberInfo = async (email) => {
        const { data: memberData } = await supabase
            .from("members")
            .select("*")
            .eq("email", email)
            .single();

        if (memberData) {
            setMember(memberData);
            // Generate QR Value: JSON string with member ID and timestamp for simple validity check
            // In production, this should be a signed token
            const qrData = JSON.stringify({
                id: memberData.id,
                email: memberData.email,
                ts: Date.now()
            });
            setQrValue(qrData);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "40px", display: "flex", flexDirection: "column", alignItems: "center", minHeight: "80vh", justifyContent: "center" }}>
            <div className="premium-card" style={{ width: "100%", maxWidth: "320px", padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", background: "white", color: "black" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--brand-primary)" }}>BCL Check-in</h2>

                {loading ? (
                    <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <p>로딩 중...</p>
                    </div>
                ) : !member ? (
                    <div style={{ padding: "20px" }}>
                        <p>회원 정보를 찾을 수 없습니다.</p>
                    </div>
                ) : (
                    <>
                        <div style={{
                            width: "200px",
                            height: "200px",
                            background: "white",
                            padding: "10px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                        }}>
                            {qrValue && (
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}`}
                                    alt="Check-in QR Code"
                                    style={{ width: "100%", height: "100%" }}
                                />
                            )}
                        </div>

                        <div>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "4px" }}>{member.name}</h3>
                            <p style={{ color: "#666", fontSize: "0.9rem" }}>{member.phone}</p>
                        </div>

                        <div style={{ width: "100%", height: "1px", background: "#eee" }}></div>

                        <p style={{ color: "#888", fontSize: "0.8rem", lineHeight: "1.5" }}>
                            입장 시 리더기에 QR 코드를 스캔해주세요.<br />
                            QR 코드는 매번 새롭게 생성됩니다.
                        </p>
                    </>
                )}
            </div>

            <p style={{ marginTop: "24px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                도움이 필요하신가요? <span style={{ textDecoration: "underline" }}>데스크 문의</span>
            </p>
        </div>
    );
}
