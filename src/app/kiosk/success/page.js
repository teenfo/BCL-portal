"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
    const searchParams = useSearchParams();
    const name = searchParams.get("name") || "회원";
    const type = searchParams.get("type") || "일반";

    useEffect(() => {
        const timer = setTimeout(() => {
            window.location.href = '/kiosk';
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div style={{ background: "#000", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white" }}>
            <div style={{
                width: "120px", height: "120px",
                background: "var(--brand-primary)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "4rem",
                marginBottom: "32px",
                animation: "scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            }}>
                ✅
            </div>

            <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: "2.5rem", marginBottom: "16px" }}>체크인 완료!</h1>
                <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)", marginBottom: "8px" }}>{name}님, 환영합니다.</p>
                <p style={{ fontSize: "1rem", color: "var(--brand-primary)" }}>{type} 멤버십 인증됨</p>
            </div>

            <div style={{ marginTop: "60px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                5초 후 홈 화면으로 돌아갑니다...
            </div>

            <style jsx>{`
                @keyframes scaleUp {
                    from { transform: scale(0); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

export default function KioskSuccessPage() {
    return (
        <Suspense fallback={<div style={{ background: "#000", height: "100vh" }}></div>}>
            <SuccessContent />
        </Suspense>
    );
}
