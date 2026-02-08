import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FacilitySettingsPage() {
    const [info, setInfo] = useState({
        name: "",
        address: "",
        phone: "",
        openTime: "",
        closeTime: ""
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFacilityInfo();
    }, []);

    const fetchFacilityInfo = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("facility_settings").select("*").single();
        if (data) {
            setInfo({
                name: data.name || "BCL 피트니스 광화문점",
                address: data.address || "서울시 종로구 세종대로 123",
                phone: data.phone || "02-123-4567",
                openTime: data.open_time || "06:00",
                closeTime: data.close_time || "23:00"
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        const { error } = await supabase.from("facility_settings").upsert({
            id: 1, // Assume single facility for now
            name: info.name,
            address: info.address,
            phone: info.phone,
            open_time: info.openTime,
            close_time: info.closeTime
        });
        if (error) alert("Error saving settings: " + error.message);
        else alert("설정이 저장되었습니다.");
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>로딩 중...</div>;

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>지점 정보 관리</h1>
                <p style={{ color: "var(--text-secondary)" }}>현재 시설의 기본 정보와 운영 시간을 설정합니다.</p>
            </header>

            <div className="premium-card" style={{ maxWidth: "600px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem" }}>지점명</label>
                        <input type="text" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })}
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem" }}>주소</label>
                        <input type="text" value={info.address} onChange={e => setInfo({ ...info, address: e.target.value })}
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem" }}>오픈 시간</label>
                            <input type="time" value={info.openTime} onChange={e => setInfo({ ...info, openTime: e.target.value })}
                                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem" }}>마감 시간</label>
                            <input type="time" value={info.closeTime} onChange={e => setInfo({ ...info, closeTime: e.target.value })}
                                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                        </div>
                    </div>
                    <button onClick={handleSave} className="btn-primary" style={{ marginTop: "10px" }}>저장하기</button>
                </div>
            </div>
        </div>
    );
}
