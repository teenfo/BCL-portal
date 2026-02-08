"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

export default function CheckinView() {
    const [user, setUser] = useState(null);
    const [member, setMember] = useState(null);
    const [qrValue, setQrValue] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCurrentUser();
    }, []);

    // Refresh QR every 30 seconds
    useEffect(() => {
        if (!member) return;

        const generateQR = () => {
            const now = Math.floor(Date.now() / 1000);
            const data = `BCL_CHK:${member.id}:${now}`;
            setQrValue(data);
        };

        generateQR();
        const interval = setInterval(generateQR, 30000);
        return () => clearInterval(interval);
    }, [member]);

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
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "40px", display: "flex", flexDirection: "column", alignItems: "center", minHeight: "80vh", justifyContent: "center" }}>
            <div className="premium-card" style={{ width: "100%", maxWidth: "340px", padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", background: "white", color: "black", borderRadius: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--brand-primary)", letterSpacing: "-0.5px" }}>BCL CHECK-IN</h2>

                {loading ? (
                    <div style={{ height: "240px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div className="loader"></div>
                    </div>
                ) : !member ? (
                    <div style={{ padding: "40px 20px" }}>
                        <p style={{ color: "#888" }}>회원 정보를 찾을 수 없습니다.</p>
                    </div>
                ) : (
                    <>
                        <div style={{
                            padding: "24px",
                            background: "#f8f9fa",
                            borderRadius: "24px",
                            border: "1px solid #eee",
                            position: "relative"
                        }}>
                            {qrValue && (
                                <QRCodeSVG
                                    value={qrValue}
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                    imageSettings={{
                                        src: "/favicon.ico",
                                        x: undefined,
                                        y: undefined,
                                        height: 30,
                                        width: 30,
                                        excavate: true,
                                    }}
                                />
                            )}
                        </div>

                        <div>
                            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "4px" }}>{member.name}님</h3>
                            <p style={{ color: "#666", fontSize: "0.95rem" }}>{member.membership_type} 회원</p>
                        </div>

                        <div style={{ width: "100%", height: "1px", background: "#f0f0f0" }}></div>

                        <p style={{ color: "#999", fontSize: "0.85rem", lineHeight: "1.6" }}>
                            태블릿 전면 카메라를 향해 QR을 가뿐히 들어주세요.<br />
                            보안을 위해 QR은 30초마다 갱신됩니다.
                        </p>
                    </>
                )}
            </div>

            <p style={{ marginTop: "32px", color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
                출입이 안 되시나요? <span style={{ color: "white", textDecoration: "underline", cursor: "pointer" }}>문의하기</span>
            </p>
        </div>
    );
}
