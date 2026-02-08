"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

export default function FacilityDetailClient() {
    const { id } = useParams();
    const router = useRouter();
    const [facility, setFacility] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchFacility();
    }, [id]);

    const fetchFacility = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("facility_settings")
            .select("*")
            .eq("id", id)
            .single();

        if (data) setFacility(data);
        else console.error(error);
        setLoading(false);
    };

    if (loading) return <div className="animate-fade-in" style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>로딩 중...</div>;
    if (!facility) return <div className="animate-fade-in" style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>지점 정보를 찾을 수 없습니다.</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "40px" }}>
            <div style={{ position: "relative", height: "240px", marginBottom: "24px", borderRadius: "0 0 24px 24px", overflow: "hidden", margin: "-20px -20px 24px -20px" }}>
                {facility.image_url ? (
                    <img src={facility.image_url} alt={facility.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                    <div style={{ width: "100%", height: "100%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        이미지 없음
                    </div>
                )}
                <button onClick={() => router.back()} style={{
                    position: "absolute",
                    top: "20px",
                    left: "20px",
                    background: "rgba(0,0,0,0.5)",
                    border: "none",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backdropFilter: "blur(4px)"
                }}>
                    ←
                </button>
            </div>

            <div style={{ padding: "0 4px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>{facility.name}</h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "0.95rem" }}>{facility.address}</p>

                <div className="premium-card" style={{ marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>운영 정보</h3>
                    <div style={{ display: "grid", gap: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>연락처</span>
                            <span style={{ fontWeight: "500" }}>{facility.phone}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>운영 시간</span>
                            <span style={{ fontWeight: "500" }}>{facility.open_time} - {facility.close_time}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>대표자</span>
                            <span style={{ fontWeight: "500" }}>{facility.representative}</span>
                        </div>
                    </div>
                </div>

                <div className="premium-card" style={{ marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>편의 시설</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        <span className="badge badge-neutral">주차 가능</span>
                        <span className="badge badge-neutral">샤워실</span>
                        <span className="badge badge-neutral">락커룸</span>
                        <span className="badge badge-neutral">운동복 지급</span>
                        <span className="badge badge-neutral">Wi-Fi</span>
                    </div>
                </div>

                <button className="btn-primary" style={{ width: "100%", padding: "16px", fontSize: "1rem" }}>
                    이 지점 수업 예약하기
                </button>
            </div>
        </div>
    );
}
