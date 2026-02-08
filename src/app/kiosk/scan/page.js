"use client";
import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function KioskScan() {
    const scannerRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = scanner;

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
            }
        };
    }, []);

    async function onScanSuccess(decodedText) {
        console.log(`Code matched = ${decodedText}`);

        if (!decodedText.startsWith("BCL_CHK:")) {
            alert("유효하지 않은 QR 코드입니다.");
            return;
        }

        const parts = decodedText.split(":");
        const userId = parts[1];
        const timestamp = parts[2];

        // Expiry Check (5 min)
        const now = Math.floor(Date.now() / 1000);
        if (now - parseInt(timestamp) > 300) {
            alert("만료된 QR 코드입니다.");
            return;
        }

        router.push(`/kiosk/success?id=${userId}`);
    }

    function onScanFailure(error) {
        // Ignored
    }

    return (
        <div style={{
            height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", background: "var(--bg-primary)"
        }}>
            <h1 style={{ fontSize: "2.5rem", fontWeight: "900", marginBottom: "40px", textAlign: "center" }}>
                QR 코드를 <br /> <span style={{ color: "var(--brand-primary)" }}>스캔해주세요</span>
            </h1>

            <div id="reader" style={{
                width: "100%", maxWidth: "500px", borderRadius: "24px", overflow: "hidden", border: "4px solid var(--brand-primary)", boxShadow: "0 0 40px rgba(255, 107, 0, 0.3)"
            }}></div>

            <p style={{ marginTop: "30px", color: "var(--text-secondary)" }}>
                태블릿 전면 카메라를 향해 QR 코드를 보여주세요.
            </p>

            <button
                onClick={() => router.push("/kiosk")}
                style={{ marginTop: "40px", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.2rem" }}
            >
                취소하고 돌아가기
            </button>
        </div>
    );
}
