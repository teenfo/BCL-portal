"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CheckinLive() {
    const [liveCheckins, setLiveCheckins] = useState([]);
    const [stats, setStats] = useState({ today: 0, current: 0 });

    useEffect(() => {
        fetchTodayCheckins();

        // Subscribe to real-time check-ins
        const channel = supabase
            .channel('realtime_checkins')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins' }, payload => {
                console.log('New check-in received!', payload);
                fetchTodayCheckins(); // Refresh list on new entry
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchTodayCheckins = async () => {
        const todaySearch = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from("checkins")
            .select("*, member:members(name, avatar_url, membership_type)")
            .gte("timestamp", todaySearch)
            .order("timestamp", { ascending: false });

        if (data) {
            setLiveCheckins(data);
            setStats({
                today: data.length,
                current: data.filter(c => {
                    const checkinTime = new Date(c.timestamp);
                    const now = new Date();
                    return (now - checkinTime) < 3600000; // Stay in 'current' for 1 hour
                }).length
            });
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>실시간 체크인 현황</h1>
                    <p style={{ color: "var(--text-secondary)" }}>오늘 센터에 방문한 회원님들을 실시간으로 모니터링합니다.</p>
                </div>
                <div style={{ display: "flex", gap: "20px" }}>
                    <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>오늘 총 입장</p>
                        <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--brand-primary)" }}>{stats.today}명</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>현재 이용 중</p>
                        <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--status-success)" }}>{stats.current}명</p>
                    </div>
                </div>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                {liveCheckins.length === 0 ? (
                    <div className="premium-card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px" }}>
                        <p style={{ color: "var(--text-secondary)" }}>아직 오늘 입실한 회원이 없습니다.</p>
                    </div>
                ) : (
                    liveCheckins.map((checkin, idx) => (
                        <div key={checkin.id} className="premium-card animate-slide-up" style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            animationDelay: `${idx * 0.05}s`,
                            borderLeft: "4px solid var(--brand-primary)"
                        }}>
                            <div style={{
                                width: "48px", height: "48px", borderRadius: "50%",
                                background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center",
                                overflow: "hidden", fontSize: "1.2rem", border: "1px solid var(--border-subtle)"
                            }}>
                                {checkin.member?.avatar_url ? <img src={checkin.member.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: "1rem", marginBottom: "2px" }}>{checkin.member?.name || "알수없음"}</h3>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                        {new Date(checkin.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,107,0,0.1)", color: "var(--brand-primary)" }}>
                                        {checkin.method === 'kiosk_qr' ? '키오스크' : '데스크'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
