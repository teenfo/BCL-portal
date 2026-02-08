"use client";

export default function KioskLayout({ children }) {
    return (
        <div className="kiosk-container" style={{
            minHeight: "100vh",
            background: "var(--bg-primary)",
            color: "white",
            fontFamily: "var(--font-inter)",
            overflow: "hidden"
        }}>
            {children}

            {/* Kiosk Status Bar (Optional) */}
            <footer style={{
                position: "fixed",
                bottom: "20px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.3)",
                zIndex: 1000
            }}>
                BCL KIOSK v1.0 • SYSTEM ACTIVE
            </footer>
        </div>
    );
}
