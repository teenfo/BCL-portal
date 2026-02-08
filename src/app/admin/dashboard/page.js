"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
    // KPI State
    const [counts, setCounts] = useState({
        members: 0,
        sessions: 0,
        checkins: 0,
        notices: 0
    });
    // Visual Analytics State
    const [weeklyTrend, setWeeklyTrend] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [facilitiesStatus, setFacilitiesStatus] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            // 1. KPI Counts
            const [members, sessions, checkinsCount, notices] = await Promise.all([
                supabase.from("members").select("count", { count: "exact" }),
                supabase.from("sessions").select("count", { count: "exact" }),
                supabase.from("checkins").select("count", { count: "exact" }).gte("time", todayStart.toISOString()),
                supabase.from("notices").select("count", { count: "exact" })
            ]);

            setCounts({
                members: members.count || 0,
                sessions: sessions.count || 0,
                checkins: checkinsCount.count || 0,
                notices: notices.count || 0
            });

            // 2. Weekly Trend (Last 7 Days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 6);
            weekAgo.setHours(0, 0, 0, 0);

            const { data: trendData } = await supabase
                .from("checkins")
                .select("time")
                .gte("time", weekAgo.toISOString())
                .order("time", { ascending: true });

            // Process trend data: Group by day
            const trendMap = {};
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            // Initialize last 7 days keys
            for (let i = 0; i < 7; i++) {
                const d = new Date(weekAgo);
                d.setDate(d.getDate() + i);
                const dayKey = days[d.getDay()];
                trendMap[dayKey] = 0;
            }

            if (trendData) {
                trendData.forEach(item => {
                    const d = new Date(item.time);
                    const dayKey = days[d.getDay()];
                    if (trendMap[dayKey] !== undefined) trendMap[dayKey]++;
                });
            }
            // Sort by day order logic is tricky if week wraps, just keep order of "last 7 days"
            const trendArray = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(weekAgo);
                d.setDate(d.getDate() + i);
                const dayKey = days[d.getDay()];
                trendArray.push({ label: dayKey, value: trendMap[dayKey] });
            }
            setWeeklyTrend(trendArray);


            // 3. Notifications (Recent Check-ins & Notices mixed)
            // Fetch recent checkins
            const { data: recentCheckins } = await supabase
                .from("checkins")
                .select("member_name, facility, time")
                .order("time", { ascending: false })
                .limit(5);

            // Fetch recent notices
            const { data: recentNotices } = await supabase
                .from("notices")
                .select("title, date")
                .order("date", { ascending: false })
                .limit(2);

            // Merge & Sort
            const combinedNotifs = [];
            if (recentCheckins) {
                recentCheckins.forEach(c => {
                    combinedNotifs.push({
                        type: 'checkin',
                        text: `${c.member_name || '회원'}님 ${c.facility || '센터'} 입장`,
                        time: c.time,
                        displayTime: new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                });
            }
            if (recentNotices) {
                recentNotices.forEach(n => {
                    // Start of day for notice date
                    const d = new Date(n.date);
                    // To compare with checkin time (which has hours), we might just treat notice as happening at 9AM
                    d.setHours(9, 0, 0);
                    combinedNotifs.push({
                        type: 'notice',
                        text: `📢 새 공지: ${n.title}`,
                        time: d.toISOString(),
                        displayTime: new Date(n.date).toLocaleDateString()
                    });
                });
            }
            // Sort Descending
            combinedNotifs.sort((a, b) => new Date(b.time) - new Date(a.time));
            setNotifications(combinedNotifs.slice(0, 5));


            // 4. Today's Schedule
            const { data: scheduleData } = await supabase
                .from("sessions")
                .select("*")
                .gte("start_time", todayStart.toISOString())
                .lte("start_time", todayEnd.toISOString())
                .order("start_time", { ascending: true })
                .limit(5);
            setTodaySchedule(scheduleData || []);

            // 5. Facility Status
            const { data: facilities } = await supabase
                .from("facilities")
                .select("name");

            // Just simulate status for now as we don't have real status column
            const mappedFacilities = (facilities || []).map(f => ({
                name: f.name,
                status: "운영 중", // Default
                statusColor: "badge-success"
            }));
            if (mappedFacilities.length === 0) {
                // Fallback if empty
                mappedFacilities.push({ name: "메인 센터", status: "운영 중", statusColor: "badge-success" });
            }
            setFacilitiesStatus(mappedFacilities);

        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
        }
        setLoading(false);
    };

    const stats = [
        { label: "총 회원 수", value: `${counts.members}명`, icon: "👥", trend: "전체" },
        { label: "전체 세션", value: `${counts.sessions}개`, icon: "📅", trend: "활성" },
        { label: "오늘의 체크인", value: `${counts.checkins}건`, icon: "✅", trend: "0시 기준" },
        { label: "등록된 공지", value: `${counts.notices}건`, icon: "📣", trend: "게시됨" },
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>관리자 대시보드</h1>
                <p style={{ color: "var(--text-secondary)" }}>오늘의 주요 지표와 플랫폼 상태입니다.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
                {stats.map((stat) => (
                    <div key={stat.label} className="premium-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                            <span style={{ fontSize: "1.5rem" }}>{stat.icon}</span>
                            <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>{stat.trend}</span>
                        </div>
                        <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "4px" }}>{stat.label}</h3>
                        <p style={{ fontSize: "1.8rem", fontWeight: "700" }}>{loading ? "..." : stat.value}</p>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {/* Weekly Trend Chart */}
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                        📈 주간 방문자 추이
                    </h3>
                    <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "12px", padding: "20px 0" }}>
                        {loading ? (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>로딩 중...</div>
                        ) : (
                            weeklyTrend.map((day, i) => {
                                // Calculate simple ratio for height (max 100%)
                                const maxVal = Math.max(...weeklyTrend.map(d => d.value), 10); // avoid div/0
                                const heightPercent = (day.value / maxVal) * 100;

                                return (
                                    <div key={i} style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "flex-end" }}>
                                        <div style={{
                                            width: "100%",
                                            height: `${Math.max(heightPercent, 5)}%`, // min height 5%
                                            background: i === 6 ? "var(--brand-primary)" : "rgba(255, 107, 0, 0.2)",
                                            borderRadius: "4px 4px 0 0",
                                            transition: "height 0.5s ease-out"
                                        }}></div>
                                        <div style={{
                                            position: "absolute", bottom: "-24px", left: "50%", transform: "translateX(-50%)",
                                            fontSize: "0.7rem", color: "var(--text-secondary)", whiteSpace: "nowrap"
                                        }}>
                                            {day.label}
                                        </div>
                                        {/* Value Label */}
                                        <div style={{
                                            position: "absolute", bottom: `${Math.max(heightPercent, 5) + 5}%`, left: "50%", transform: "translateX(-50%)",
                                            fontSize: "0.7rem", color: "white", fontWeight: "bold"
                                        }}>
                                            {day.value > 0 ? day.value : ""}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Real-time Notifications */}
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>🔔 실시간 알림</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {loading ? (
                            <div className="animate-pulse">로딩 중...</div>
                        ) : notifications.length > 0 ? (
                            notifications.map((item, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", alignItems: "center" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <span style={{ fontSize: "1.2rem" }}>{item.type === 'notice' ? '📢' : '🏃'}</span>
                                        <span>{item.text}</span>
                                    </div>
                                    <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>{item.displayTime}</span>
                                </div>
                            ))
                        ) : (
                            <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "20px" }}>최근 알림이 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                {/* Today's Schedule */}
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>🗓️ 오늘의 수업 일정</h3>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        {loading ? "데이터를 불러오는 중입니다..." : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-subtle)" }}>
                                        <th style={{ padding: "12px 8px" }}>수업명</th>
                                        <th style={{ padding: "12px 8px" }}>시간</th>
                                        <th style={{ padding: "12px 8px" }}>예약</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todaySchedule.length > 0 ? (
                                        todaySchedule.map(session => {
                                            const start = new Date(session.start_time);
                                            const end = new Date(session.end_time);
                                            const timeStr = `${start.getHours()}:${String(start.getMinutes()).padStart(2, '0')} - ${end.getHours()}:${String(end.getMinutes()).padStart(2, '0')}`;
                                            return (
                                                <tr key={session.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                                    <td style={{ padding: "12px 8px" }}>{session.title}</td>
                                                    <td style={{ padding: "12px 8px" }}>{timeStr}</td>
                                                    <td style={{ padding: "12px 8px" }}>
                                                        <span className={`badge ${session.enrolled >= session.capacity ? 'badge-error' : 'badge-success'}`}>
                                                            {session.enrolled || 0}/{session.capacity || 20}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="3" style={{ padding: "20px", textAlign: "center" }}>오늘 예정된 수업이 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Facility Status */}
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>🏥 시설 상태</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {loading ? (
                            <div>로딩 중...</div>
                        ) : (
                            facilitiesStatus.map((fac, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.9rem" }}>{fac.name}</span>
                                    <span className={`badge ${fac.statusColor}`}>{fac.status}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
