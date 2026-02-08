"use client";
import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "@/lib/supabase";

export default function KioskScanPage() {
    const [scanResult, setScanResult] = useState(null);
    const scannerRef = useRef(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner("reader", {
            fps: 10,
            qrbox: { width: 250, height: 250 },
        });

        scanner.render(
            async (decodedText) => {
                scanner.clear();
                setScanResult(decodedText);

                try {
                    const parts = decodedText.split(":");
                    if (parts[0] !== "BCL_CHK") throw new Error("Invalid QR Format");

                    const memberId = parts[1];
                    const expiry = parseInt(parts[2]);
                    const now = Math.floor(Date.now() / 1000);

                    if (expiry < now) throw new Error("QR Expired");

                    // Verify member and record check-in
                    const { data: member, error: mError } = await supabase
                        .from("members")
                        .select("id, name, membership_type")
                        .eq("id", memberId)
                        .single();

                    if (mError || !member) throw new Error("Member not found");

                    // Insert check-in log
                    await supabase.from("checkins").insert({
                        member_id: member.id,
                        checkin_time: new Date().toISOString()
                    });

                    // Redirect to success with member data
                    window.location.href = `/kiosk/success?name=${encodeURIComponent(member.name)}&type=${encodeURIComponent(member.membership_type)}`;
                } catch (err) {
                    console.error("Scan error:", err);
                    alert("인증 실패: " + err.message);
                    window.location.href = '/kiosk';
                }
            },
            (error) => {
                // Console error is fine for development
            }
        );

        return () => {
            scanner.clear().catch(err => console.error("Failed to clear scanner", err));
        };
    }, []);

    return (
        <div style={{ background: "#000", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white" }}>
            <div style={{ marginBottom: "40px", textAlign: "center" }}>
                <h1 style={{ fontSize: "2rem", marginBottom: "12px" }}>QR 코드를 스캔해 주세요</h1>
                <p style={{ color: "var(--text-secondary)" }}>체크인 전용 QR 코드를 원 안에 맞춰주세요.</p>
            </div>

            <div style={{ width: "100%", maxWidth: "400px", borderRadius: "24px", overflow: "hidden", border: "2px solid var(--brand-primary)" }}>
                <div id="reader" style={{ width: "100%" }}></div>
            </div>

            {scanResult && (
                <div style={{ marginTop: "24px", color: "var(--brand-primary)", fontWeight: "700" }}>
                    스캔 완료: 처리 중...
                </div>
            )}

            <button
                onClick={() => window.location.href = '/kiosk'}
                style={{ marginTop: "60px", background: "none", border: "none", color: "var(--text-secondary)", textDecoration: "underline", cursor: "pointer", fontSize: "1.1rem" }}
            >
                취소하고 홈으로
            </button>

            <style jsx global>{`
                #reader__scan_region {
                    background: #1a1a1a !important;
                }
                #reader__dashboard_section_csr button {
                    background: var(--brand-primary) !important;
                    color: white !important;
                    border: none !important;
                    padding: 8px 16px !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                }
                #reader__status_span {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
