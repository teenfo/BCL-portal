"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FacilitySettings() {
    const [facility, setFacility] = useState({
        name: "BCL 메인 센터",
        address: "서울시 강남구 테헤란로 123 B1",
        phone: "02-1234-5678",
        business_hours: "평일 06:00 - 23:00 / 토요일 09:00 - 18:00 (일요일 휴무)",
        instagram: "@bcl_official",
        kakao_channel: "BCL강남"
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchFacilityInfo();
    }, []);

    const fetchFacilityInfo = async () => {
        const { data } = await supabase.from("facility_settings").select("*").single();
        if (data) setFacility(data);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        // Save to Supabase
        const { error } = await supabase.from("facility_settings").upsert(facility);
        if (!error) alert("시설 정보가 저장되었습니다.");
        setSaving(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>지점 및 시설 정보 관리</h1>
                <p style={{ color: "var(--text-secondary)" }}>사용자 앱에 표시되는 센터의 기본 정보와 운영 정책을 설정합니다.</p>
            </header>

            <form onSubmit={handleSave} className="premium-card" style={{ maxWidth: "800px", padding: "32px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                    <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>지안 명칭</label>
                        <input
                            type="text"
                            value={facility.name}
                            onChange={e => setFacility({ ...facility, name: e.target.value })}
                            className="input-field"
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "white" }}
                        />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>주소</label>
                        <input
                            type="text"
                            value={facility.address}
                            onChange={e => setFacility({ ...facility, address: e.target.value })}
                            className="input-field"
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "white" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>대표 번호</label>
                        <input
                            type="text"
                            value={facility.phone}
                            onChange={e => setFacility({ ...facility, phone: e.target.value })}
                            className="input-field"
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "white" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>운영 시간 (설명)</label>
                        <input
                            type="text"
                            value={facility.business_hours}
                            onChange={e => setFacility({ ...facility, business_hours: e.target.value })}
                            className="input-field"
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "white" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>인스타그램</label>
                        <input
                            type="text"
                            value={facility.instagram}
                            onChange={e => setFacility({ ...facility, instagram: e.target.value })}
                            className="input-field"
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "white" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>카카오 채널</label>
                        <input
                            type="text"
                            value={facility.kakao_channel}
                            onChange={e => setFacility({ ...facility, kakao_channel: e.target.value })}
                            className="input-field"
                            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "white" }}
                        />
                    </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                    <button type="submit" className="btn-primary" disabled={saving} style={{ padding: "12px 32px" }}>
                        {saving ? "저장 중..." : "정보 업데이트"}
                    </button>
                </div>
            </form>
        </div>
    );
}
