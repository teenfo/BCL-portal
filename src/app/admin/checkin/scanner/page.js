"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CheckinScanner() {
    const [userId, setUserId] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSimulateScan = async () => {
        if (!userId) return;
        setLoading(true);
        setResult(null);

        // Simulate finding a user by ID
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
            setResult({ status: "error", message: "존재하지 않는 회원 QR 코드입니다." });
        } else {
            // Create a check-in record
            const { error: checkinError } = await supabase.from("checkins").insert({
                profile_id: userId,
                facility_id: "00000000-0000-0000-0000-000000000001", // Placeholder facility
                type: "facility"
            });

            if (checkinError) {
                setResult({ status: "error", message: "체크인 처리 중 오류가 발생했습니다." });
            } else {
                setResult({
                    status: "success",
                    userName: profile.full_name,
                    message: "체크인이 완료되었습니다. 환영합니다!"
                });
            }
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: "500px", margin: "0 auto" }}>
            <header style={{ marginBottom: "32px", textAlign: "center" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>QR 체크인 스캐너</h1>
                <p style={{ color: "var(--text-secondary)" }}>회원의 QR 코드를 스캔하여 입장을 승인합니다.</p>
            </header>

            <div className="premium-card" style={{ textAlign: "center", padding: "40px" }}>
                <div style={{
                    width: "200px",
                    height: "200px",
                    border: "4px solid var(--brand-primary)",
                    borderRadius: "20px",
                    margin: "0 auto 32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(59, 130, 246, 0.05)",
                    position: "relative",
                    overflow: "hidden"
                }}>
                    <div style={{ fontSize: "4rem" }}>📷</div>
                    <div style={{
                        position: "absolute",
                        width: "100%",
                        height: "2px",
                        background: "var(--brand-primary)",
                        top: "50%",
                        boxShadow: "0 0 10px var(--brand-primary)",
                        animation: "scanMove 2s infinite ease-in-out"
                    }}></div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>회원 ID를 입력하여 스캔을 시뮬레이션하세요.</p>
                    <input
                        type="text"
                        placeholder="회원 UUID 입력"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        style={{
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-subtle)",
                            background: "var(--bg-tertiary)",
                            color: "white",
                            textAlign: "center"
                        }}
                    />
                    <button className="btn-primary" onClick={handleSimulateScan} disabled={loading}>
                        {loading ? "처리 중..." : "QR 스캔 시뮬레이션"}
                    </button>
                </div>

                {result && (
                    <div style={{
                        marginTop: "24px",
                        padding: "16px",
                        borderRadius: "12px",
                        background: result.status === 'success' ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: result.status === 'success' ? "var(--status-success)" : "var(--status-error)",
                        border: `1px solid ${result.status === 'success' ? "var(--status-success)" : "var(--status-error)"}`
                    }}>
                        <p style={{ fontWeight: "700", marginBottom: "4px" }}>
                            {result.status === 'success' ? `✅ ${result.userName}` : "❌ 오류"}
                        </p>
                        <p style={{ fontSize: "0.85rem" }}>{result.message}</p>
                    </div>
                )}
            </div>

            <style jsx>{`
        @keyframes scanMove {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
      `}</style>
        </div>
    );
}
