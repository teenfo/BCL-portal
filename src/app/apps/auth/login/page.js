"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function UserLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setMessage(`에러: ${error.message}`);
        } else {
            router.push("/apps/dashboard");
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
                    이메일과 비밀번호를 입력하여 로그인하세요.
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

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: "500", color: "var(--text-secondary)" }}>비밀번호</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                        {loading ? "로그인 중..." : "로그인"}
                    </button>

                    <div style={{ position: "relative", margin: "16px 0", textAlign: "center" }}>
                        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "var(--border-subtle)", zIndex: 0 }}></div>
                        <span style={{ position: "relative", background: "var(--bg-secondary)", padding: "0 12px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>또는</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => supabase.auth.signInWithOAuth({
                            provider: 'kakao',
                            options: { redirectTo: `${window.location.origin}/apps/auth/callback` }
                        })}
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "none",
                            background: "#FEE500",
                            color: "#000000",
                            fontWeight: "600",
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            cursor: "pointer",
                            transition: "opacity 0.2s"
                        }}
                    >
                        <span>🟡</span> 카카오로 시작하기
                    </button>
                </form>

                {message && (
                    <p style={{
                        marginTop: "16px",
                        fontSize: "0.85rem",
                        textAlign: "center",
                        color: "var(--status-error)"
                    }}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}
