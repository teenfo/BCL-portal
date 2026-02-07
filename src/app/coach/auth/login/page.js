"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function CoachLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert("로그인 실패: " + error.message);
        } else {
            router.push("/coach/dashboard");
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "var(--bg-primary)"
        }}>
            <div className="premium-card" style={{ width: "100%", maxWidth: "400px", padding: "40px 32px" }}>
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--brand-primary)", marginBottom: "8px" }}>BCL COACH</h1>
                    <p style={{ color: "var(--text-secondary)" }}>코치 전용 포털에 로그인하세요.</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>이메일</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="coach@example.com"
                            required
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ padding: "14px", marginTop: "8px" }}
                    >
                        {loading ? "로그인 중..." : "로그인"}
                    </button>
                </form>

                <div style={{ marginTop: "24px", textAlign: "center" }}>
                    <a href="/apps/auth/login" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textDecoration: "none" }}>
                        회원이신가요? <span style={{ color: "var(--brand-primary)" }}>회원 앱으로 이동</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
