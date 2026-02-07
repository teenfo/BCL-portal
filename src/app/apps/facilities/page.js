"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FacilitiesView() {
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
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>지점 안내</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>전국의 BCL 지점을 확인해보세요.</p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {loading ? (
                    <p>로딩 중...</p>
                ) : (
                    facilities.map((facility) => (
                        <div key={facility.id} className="premium-card" style={{ padding: "0", overflow: "hidden" }}>
                            <div style={{ height: "160px", background: "var(--bg-tertiary)", position: "relative" }}>
                                <div style={{
                                    position: "absolute",
                                    bottom: "16px",
                                    left: "16px",
                                    background: "rgba(0,0,0,0.6)",
                                    padding: "4px 12px",
                                    borderRadius: "20px",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    backdropFilter: "blur(4px)"
                                }}>
                                    {facility.phone}
                                </div>
                            </div>
                            <div style={{ padding: "20px" }}>
                                <h3 style={{ fontSize: "1.1rem", marginBottom: "8px" }}>{facility.name}</h3>
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "16px", lineHeight: "1.4" }}>
                                    {facility.address}
                                </p>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span className="badge badge-success">운영 중</span>
                                    <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>지도 보기</button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
