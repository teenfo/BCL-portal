"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FacilitySettings() {
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFacilities();
    }, []);

    const fetchFacilities = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("facilities").select("*");
        if (!error) setFacilities(data);
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>시설 설정</h1>
                    <p style={{ color: "var(--text-secondary)" }}>지점 및 운동 공간 정보를 관리합니다.</p>
                </div>
                <button className="btn-primary">+ 지점 추가</button>
            </header>

            <div style={{ display: "grid", gap: "20px" }}>
                {loading ? (
                    <p>로딩 중...</p>
                ) : facilities.length === 0 ? (
                    <div className="premium-card" style={{ textAlign: "center", padding: "48px" }}>
                        <p style={{ color: "var(--text-secondary)" }}>등록된 시설이 없습니다.</p>
                    </div>
                ) : (
                    facilities.map((facility) => (
                        <div key={facility.id} className="premium-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <h3 style={{ fontSize: "1.1rem", marginBottom: "4px" }}>{facility.name}</h3>
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{facility.address}</p>
                                <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                                    <span className="badge badge-success">운영 중</span>
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>연락처: {facility.phone}</span>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button className="btn-secondary">수정</button>
                                <button className="btn-secondary" style={{ color: "var(--status-error)" }}>삭제</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
