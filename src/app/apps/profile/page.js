"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ProfileView() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState({
        name: "",
        phone: "",
        email: ""
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        notifications: true,
        darkMode: true
    });

    useEffect(() => {
        getCurrentUser();
    }, []);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUser(user);
            fetchProfile(user.email);
        } else {
            setLoading(false);
        }
    };

    const fetchProfile = async (email) => {
        const { data } = await supabase
            .from("members")
            .select("*")
            .eq("email", email)
            .single();

        if (data) {
            setProfile({
                name: data.name || "",
                phone: data.phone || "",
                email: data.email || ""
            });
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        const { error } = await supabase
            .from("members")
            .update({
                name: profile.name,
                phone: profile.phone
            })
            .eq("email", profile.email);

        if (!error) {
            alert("프로필이 저장되었습니다.");
        } else {
            alert("저장 실패: " + error.message);
        }
        setSaving(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/apps/auth/login");
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "40px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>설정</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>개인정보 및 앱 설정을 관리하세요.</p>
            </header>

            {loading ? (
                <p style={{ color: "var(--text-secondary)" }}>로딩 중...</p>
            ) : (
                <>
                    {/* Profile Edit */}
                    <div className="premium-card" style={{ padding: "24px", marginBottom: "24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                                👤
                            </div>
                            <div>
                                <h3 style={{ fontSize: "1.2rem", fontWeight: "600" }}>{profile.name || "회원"}</h3>
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{profile.email}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>이름</label>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>전화번호</label>
                                <input
                                    type="tel"
                                    value={profile.phone}
                                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={saving}
                                style={{ marginTop: "8px", padding: "12px" }}
                            >
                                {saving ? "저장 중..." : "프로필 저장"}
                            </button>
                        </form>
                    </div>

                    {/* App Settings */}
                    <div className="premium-card" style={{ padding: "24px", marginBottom: "24px" }}>
                        <h3 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>앱 설정</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span>알림 설정</span>
                                <input
                                    type="checkbox"
                                    checked={settings.notifications}
                                    onChange={e => setSettings({ ...settings, notifications: e.target.checked })}
                                    style={{ accentColor: "var(--brand-primary)", transform: "scale(1.2)" }}
                                />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span>다크 모드</span>
                                <input
                                    type="checkbox"
                                    checked={settings.darkMode}
                                    onChange={e => setSettings({ ...settings, darkMode: e.target.checked })}
                                    readOnly
                                    style={{ accentColor: "var(--brand-primary)", transform: "scale(1.2)" }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <button
                            className="btn-secondary"
                            style={{ padding: "16px", color: "var(--status-error)", borderColor: "var(--status-error)" }}
                            onClick={handleLogout}
                        >
                            로그아웃
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
