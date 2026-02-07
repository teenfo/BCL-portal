"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CoachManagement() {
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoaches();
    }, []);

    const fetchCoaches = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("coaches")
            .select("*");
        if (!error) setCoaches(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>코치 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>전문 코치진 프로필 및 활동 정보를 관리합니다.</p>
                </div>
                <button className="btn-primary">+ 코치 등록</button>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
                {loading ? (
                    <p>로딩 중...</p>
                ) : coaches.length === 0 ? (
                    <div className="premium-card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px" }}>
                        <p style={{ color: "var(--text-secondary)" }}>등록된 코치가 없습니다.</p>
                    </div>
                ) : (
                    coaches.map((coach) => (
                        <div key={coach.id} className="premium-card">
                            <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                                <div style={{
                                    width: "64px",
                                    height: "64px",
                                    borderRadius: "50%",
                                    background: "var(--bg-tertiary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1.5rem"
                                }}>
                                    {"👤"}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem" }}>{coach.name || "이름 없음"}</h3>
                                    <p style={{ color: "var(--brand-primary)", fontSize: "0.85rem", fontWeight: "600" }}>{coach.specialty}</p>
                                </div>
                            </div>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "20px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {coach.bio}
                            </p>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button className="btn-secondary" style={{ flex: 1, fontSize: "0.85rem" }}>상세보기</button>
                                <button className="btn-secondary" style={{ flex: 1, fontSize: "0.85rem" }}>일정관리</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
