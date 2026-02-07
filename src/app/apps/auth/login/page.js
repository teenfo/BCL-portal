"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UserLoginPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/apps/auth/callback`,
            },
        });

        if (error) {
            setMessage(`에러: ${error.message}`);
        } else {
            setMessage("매직 링크가 발송되었습니다. 이메일을 확인해주세요.");
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
        }}>
            <div className="premium-card animate-fade-in" style={{ width: "100%", maxWidth: "400px" }}>
                <h1 style={{ marginBottom: "8px", fontSize: "1.5rem" }}>BCL 포털 로그인</h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "0.9rem" }}>
                    이메일을 입력하면 로그인 링크를 보내드립니다.
                </p>

                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: "500", color: "var(--text-secondary)" }}>이메일 주소</label>
                        <input
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                padding: "12px",
                                borderRadius: "8px",
                                border: "1px solid var(--border-subtle)",
                                background: "var(--bg-tertiary)",
                                color: "white",
                                outline: "none"
                            }}
                        />
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%" }}>
                        {loading ? "발송 중..." : "매직 링크 발송"}
                    </button>
                </form>

                {message && (
                    <p style={{
                        marginTop: "16px",
                        fontSize: "0.85rem",
                        textAlign: "center",
                        color: message.startsWith("에러") ? "var(--status-error)" : "var(--status-success)"
                    }}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}
