"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AccessControlPage() {
    const [roles, setRoles] = useState([
        { id: 1, name: "Super Admin", count: 2, description: "모든 권한을 가진 시스템 관리자" },
        { id: 2, name: "Manager", count: 5, description: "지점 운영 및 회원 관리 권한" },
        { id: 3, name: "Coach", count: 12, description: "세션 관리 및 출결 처리 권한" }
    ]);
    const [loading, setLoading] = useState(false);

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>권한 및 접근 제어</h1>
                <p style={{ color: "var(--text-secondary)" }}>사용자 역할별 접근 권한을 관리하고 부여합니다.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "40px" }}>
                {roles.map((role) => (
                    <div key={role.id} className="premium-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h3 style={{ fontSize: "1.1rem" }}>{role.name}</h3>
                            <span className="badge badge-primary">{role.count}명</span>
                        </div>
                        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
                            {role.description}
                        </p>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button className="btn-secondary" style={{ flex: 1, fontSize: "0.85rem" }}>권한 수정</button>
                            <button className="btn-secondary" style={{ flex: 1, fontSize: "0.85rem" }}>사용자 매핑</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="premium-card">
                <h3 style={{ marginBottom: "20px" }}>시스템 전역 보안 설정</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                        <div>
                            <div style={{ fontWeight: "600" }}>2단계 인증 (2FA) 강제</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>관리자 계정에 대해 2단계 인증을 필수화합니다.</div>
                        </div>
                        <div className="badge badge-success">활성화</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                        <div>
                            <div style={{ fontWeight: "600" }}>IP 접근 제한</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>특정 IP 대역에서만 관리자 페이지 접근을 허용합니다.</div>
                        </div>
                        <div className="badge badge-secondary">비활성화</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                        <div>
                            <div style={{ fontWeight: "600" }}>세션 타임아웃</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>미활동 시 세션을 자동으로 종료합니다. (현재 30분)</div>
                        </div>
                        <button className="btn-secondary" style={{ padding: "4px 12px", fontSize: "0.8rem" }}>변경</button>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: "24px", textAlign: "right" }}>
                <button className="btn-primary" onClick={() => window.location.href = '/admin/settings/roles'}>
                    고급 역할 정책 설정 바로가기
                </button>
            </div>
        </div>
    );
}
