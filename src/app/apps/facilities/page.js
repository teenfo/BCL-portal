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
        // Fetching from facility_settings which we used in Admin
        const { data, error } = await supabase.from("facility_settings").select("*");
        if (!error && data) {
            // Ensure data is array
            setFacilities(Array.isArray(data) ? data : [data]);
        }
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
                    <p style={{ color: "var(--text-secondary)" }}>로딩 중...</p>
                ) : facilities.length === 0 ? (
                    <div className="premium-card" style={{ padding: "40px", textAlign: "center" }}>
                        <p style={{ color: "var(--text-secondary)" }}>등록된 지점이 없습니다.</p>
                    </div>
                ) : (
                    facilities.map((facility) => (
                        <div key={facility.id} className="premium-card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                            <div style={{ height: "180px", background: "var(--bg-tertiary)", position: "relative" }}>
                                {/* Image Placeholder or Real Image */}
                                {facility.image_url ? (
                                    <img src={facility.image_url} alt={facility.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                                        이미지 없음
                                    </div>
                                )}
                                <div style={{
                                    position: "absolute",
                                    bottom: "16px",
                                    left: "16px",
                                    background: "rgba(0,0,0,0.6)",
                                    padding: "6px 14px",
                                    borderRadius: "20px",
                                    fontSize: "0.8rem",
                                    fontWeight: "600",
                                    backdropFilter: "blur(4px)",
                                    color: "white"
                                }}>
                                    {facility.open_time} - {facility.close_time}
                                </div>
                            </div>
                            <div style={{ padding: "20px" }}>
                                <h3 style={{ fontSize: "1.2rem", marginBottom: "10px", fontWeight: "700" }}>{facility.name}</h3>
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "16px", lineHeight: "1.5" }}>
                                    {facility.address} <br />
                                    <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>{facility.phone}</span>
                                </p>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span className="badge badge-success">운영 중</span>
                                    <a href={`/apps/facilities/${facility.id}`} className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.9rem", textDecoration: "none" }}>상세 보기</a>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div >
    );
}
