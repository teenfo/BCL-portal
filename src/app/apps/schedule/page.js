"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00

export default function ScheduleView() {
    const [sessions, setSessions] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null); // For booking modal
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [myBookings, setMyBookings] = useState([]);

    useEffect(() => {
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (user) {
            fetchSessions();
            fetchMyBookings();
        }
    }, [currentDate, user]);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };

    const fetchMyBookings = async () => {
        if (!user) return;
        const { data } = await supabase
            .from("reservations")
            .select("session_id")
            .eq("member_id", user.id) // Assuming member_id is user.id or we need to fetch member profile first. 
        // In typical setup, member table links to auth.users.id. 
        // Let's assume for now we use auth.uid() or similar if RLS allows, 
        // or we fetch the member ID. For simplicity, let's assume member_id column stores auth user id or email match.
        // Actually, in the dashboard I used email match. Let's do the same or fetch member ID.
        // Best practice: fetch member ID first.

        // Re-fetch member to get ID
        const { data: memberData } = await supabase.from("members").select("id").eq("email", user.email).single();
        if (memberData) {
            const { data: bookings } = await supabase.from("reservations").select("session_id").eq("member_id", memberData.id);
            if (bookings) setMyBookings(bookings.map(b => b.session_id));
        }
    };

    const fetchSessions = async () => {
        setLoading(true);
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const { data, error } = await supabase
            .from("sessions")
            .select("*")
            .gte('start_time', startOfWeek.toISOString())
            .lt('start_time', endOfWeek.toISOString());

        if (!error) setSessions(data || []);
        setLoading(false);
    };

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const handleSessionClick = (session) => {
        router.push(`/apps/schedule/${session.id}`);
    };

    const getSessionStyle = (start, duration) => {
        const startDate = new Date(start);
        const startHour = startDate.getHours();
        const startMin = startDate.getMinutes();
        const top = (startHour - 6) * 60 + startMin;
        const height = duration;

        return {
            top: `${top}px`,
            height: `${height}px`,
            position: 'absolute',
            width: '94%',
            left: '3%',
            borderRadius: '4px',
            background: 'rgba(255, 107, 0, 0.15)',
            borderLeft: '3px solid var(--brand-primary)',
            padding: '4px 6px',
            fontSize: '0.75rem',
            overflow: 'hidden',
            cursor: 'pointer',
            zIndex: 10
        };
    };

    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(currentDate);
        d.setDate(currentDate.getDate() - currentDate.getDay() + i);
        return d;
    });

    return (
        <div className="animate-fade-in" style={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
            <header style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>수업 예약</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>원하는 수업을 선택해주세요.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-tertiary)", padding: "8px 16px", borderRadius: "8px" }}>
                    <button onClick={handlePrevWeek} style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer" }}>◀</button>
                    <span style={{ fontWeight: "600", minWidth: "100px", textAlign: "center", fontSize: "0.9rem" }}>
                        {currentDate.toLocaleDateString()}
                    </span>
                    <button onClick={handleNextWeek} style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer" }}>▶</button>
                </div>
            </header>

            <div className="premium-card" style={{ flex: 1, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Header Row */}
                <div style={{ display: "grid", gridTemplateColumns: "50px repeat(7, 1fr)", borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)", minWidth: "600px" }}>
                    <div style={{ padding: "12px", borderRight: "1px solid var(--border-subtle)" }}></div>
                    {weekDates.map((date, i) => (
                        <div key={i} style={{ padding: "8px 4px", textAlign: "center", borderRight: i < 6 ? "1px solid var(--border-subtle)" : "none", color: date.toDateString() === new Date().toDateString() ? "var(--brand-primary)" : "var(--text-primary)" }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{WEEK_DAYS[i]}</div>
                            <div style={{ fontSize: "1rem", fontWeight: "600" }}>{date.getDate()}</div>
                        </div>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", position: "relative" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "50px repeat(7, 1fr)", minHeight: "1020px", minWidth: "600px" }}>
                        <div style={{ borderRight: "1px solid var(--border-subtle)" }}>
                            {TIME_SLOTS.map(hour => (
                                <div key={hour} style={{ height: "60px", borderBottom: "1px solid var(--border-subtle)", padding: "4px 8px", fontSize: "0.7rem", color: "var(--text-secondary)", textAlign: "right" }}>
                                    {hour}:00
                                </div>
                            ))}
                        </div>

                        {weekDates.map((date, colIndex) => (
                            <div key={colIndex} style={{ position: "relative", borderRight: colIndex < 6 ? "1px solid var(--border-subtle)" : "none", borderBottom: "1px solid var(--border-subtle)" }}>
                                {TIME_SLOTS.map(hour => (
                                    <div key={hour} style={{ height: "60px", borderBottom: "1px solid var(--border-subtle)" }}></div>
                                ))}

                                {sessions
                                    .filter(s => new Date(s.start_time).toDateString() === date.toDateString())
                                    .map(session => {
                                        const isBooked = myBookings.includes(session.id);
                                        const isFull = session.enrolled >= session.capacity;
                                        return (
                                            <div key={session.id}
                                                onClick={() => handleSessionClick(session)}
                                                style={{
                                                    ...getSessionStyle(session.start_time, session.duration || 60),
                                                    background: isBooked ? "rgba(46, 204, 113, 0.2)" : isFull ? "rgba(231, 76, 60, 0.1)" : "rgba(255, 107, 0, 0.15)",
                                                    borderLeft: `3px solid ${isBooked ? "#2ecc71" : isFull ? "#e74c3c" : "var(--brand-primary)"}`
                                                }}>
                                                <div style={{ fontWeight: "600", fontSize: "0.75rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.title}</div>
                                                <div style={{ fontSize: "0.7rem", color: "var(--text-primary)" }}>
                                                    {isBooked ? "✅ 예약됨" : isFull ? "⛔ 마감" : `${session.enrolled}/${session.capacity}`}
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}
