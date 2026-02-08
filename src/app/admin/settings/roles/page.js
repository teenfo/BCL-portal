"use client";
export default function RoleManagementPage() {
    const roles = [
        { id: 1, name: "Super Admin", count: 2, description: "모든 시스템 기능 및 설정 접근권한" },
        { id: 2, name: "Manager", count: 5, description: "회원 및 수업 관리 접근권한" },
        { id: 3, name: "Coach", count: 12, description: "코치 전용 앱 및 본인 수업 관리" }
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>역할 및 권한 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>시스템 사용자별 역할(Role)과 세부 접근 권한을 정의합니다.</p>
                </div>
                <button className="btn-primary">+ 역할 추가</button>
            </header>

            <div style={{ display: "grid", gap: "20px" }}>
                {roles.map(r => (
                    <div key={r.id} className="premium-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                                <h3 style={{ fontSize: "1.2rem" }}>{r.name}</h3>
                                <span className="badge badge-neutral">{r.count}명 배정됨</span>
                            </div>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{r.description}</p>
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button className="btn-secondary">권한 편집</button>
                            <button className="btn-secondary">회원 보기</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
