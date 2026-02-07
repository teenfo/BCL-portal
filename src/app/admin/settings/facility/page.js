"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FacilitySettings() {
    const [settings, setSettings] = useState({
        name: "",
        address: "",
        phone: "",
        representative: "",
        open_time: "09:00",
        close_time: "22:00"
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        // Assuming a single row for facility settings or fetching by ID 1
        // For now, let's mock or try to fetch if table exists. 
        // If table doesn't exist, we might need to rely on static initial state or create table.
        // Let's assume a 'facility_info' table exists or we use a 'settings' table.
        // Since we are agile, let's mock the fetch for now as the table might not be set up in SQL yet.
        // But for a "Implement all features" request, I should stick to the pattern.
        // Let's assume we are just managing local state for this demo if backend isn't ready,
        // OR try to fetch and handle error.

        const { data, error } = await supabase.from("facility_settings").select("*").single();
        if (data) setSettings(data);
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        // Upsert logic
        const { error } = await supabase.from("facility_settings").upsert([
            { ...settings, id: 1 } // constant ID for singleton record
        ]);

        if (!error) {
            alert("설정이 저장되었습니다.");
        } else {
            alert("저장 실패: " + error.message);
        }
        setSaving(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>지점/시설 정보</h1>
                <p style={{ color: "var(--text-secondary)" }}>시설의 기본 정보 및 운영 시간을 설정합니다.</p>
            </header>

            <form onSubmit={handleSave} style={{ display: "grid", gap: "24px", maxWidth: "800px" }}>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>기본 정보</h3>
                    <div style={{ display: "grid", gap: "16px" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>지점명</label>
                            <input type="text" value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>주소</label>
                            <input type="text" value={settings.address} onChange={e => setSettings({ ...settings, address: e.target.value })}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>연락처</label>
                                <input type="text" value={settings.phone} onChange={e => setSettings({ ...settings, phone: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>대표자</label>
                                <input type="text" value={settings.representative} onChange={e => setSettings({ ...settings, representative: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>운영 시간</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>오픈 시간</label>
                            <input type="time" value={settings.open_time} onChange={e => setSettings({ ...settings, open_time: e.target.value })}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>마감 시간</label>
                            <input type="time" value={settings.close_time} onChange={e => setSettings({ ...settings, close_time: e.target.value })}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? "저장 중..." : "변경사항 저장"}
                    </button>
                </div>
            </form>
        </div>
    );
}
