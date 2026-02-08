"use client";
import { useRouter } from "next/navigation";

export default function SecuritySettings() {
    const router = useRouter();

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    ← 뒤로 가기
                </button>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>계정 및 보안</h2>
            </header>

            <div className="premium-card" style={{ padding: "24px", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "20px" }}>보안 관리</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <p style={{ fontWeight: "500" }}>로그인 비밀번호</p>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>정기적인 비밀번호 변경을 권장합니다.</p>
                        </div>
                        <button className="btn-secondary" style={{ fontSize: "0.8rem" }}>변경</button>
                    </div>
                    <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <p style={{ fontWeight: "500" }}>2단계 인증</p>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>계정 보안을 더욱 강화합니다.</p>
                        </div>
                        <button className="btn-secondary" style={{ fontSize: "0.8rem" }}>설정</button>
                    </div>
                </div>
            </div>

            <div className="premium-card" style={{ padding: "24px", border: "1px solid rgba(231, 76, 60, 0.3)" }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "20px", color: "var(--status-error)" }}>계정 삭제</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
                    계정을 삭제하면 모든 회원 데이터와 결제 내역이 영구적으로 삭제되며 복구할 수 없습니다.
                </p>
                <button className="btn-secondary" style={{ width: "100%", color: "var(--status-error)", borderColor: "var(--status-error)" }}>
                    회원 탈퇴하기
                </button>
            </div>
        </div>
    );
}
