"use client";
import { useRouter } from "next/navigation";

export default function KioskHome() {
    const router = useRouter();

    return (
        <div
            onClick={() => router.push("/kiosk/scan")}
            style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px",
                background: "linear-gradient(135deg, var(--bg-primary) 0%, #1a1a1a 100%)",
                cursor: "pointer",
                textAlign: "center"
            }}
        >
            <div className="animate-pulse" style={{ marginBottom: "60px" }}>
                <h1 style={{ fontSize: "4rem", fontWeight: "900", lineHeight: "1.1", marginBottom: "20px" }}>
                    BODY CHALLENGE <br />
                    <span style={{ color: "var(--brand-primary)" }}>LOGS</span>
                </h1>
                <p style={{ fontSize: "1.5rem", color: "var(--text-secondary)" }}>
                    당신의 도전을 기록하세요
                </p>
            </div>

            <div style={{
                padding: "30px 60px",
                borderRadius: "50px",
                background: "var(--brand-primary)",
                color: "white",
                fontSize: "2rem",
                fontWeight: "800",
                boxShadow: "0 10px 30px rgba(255, 107, 0, 0.4)",
                animation: "bounce 2s infinite"
            }}>
                터치하여 체크인 시작
            </div>

            <p style={{ position: "absolute", bottom: "40px", color: "rgba(255,255,255,0.2)", fontSize: "0.9rem" }}>
                BCL Kiosk System v1.0
            </p>

            <style jsx>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-pulse {
                    animation: pulse 4s infinite ease-in-out;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.9; transform: scale(1.02); }
                }
            `}</style>
        </div>
    );
}
