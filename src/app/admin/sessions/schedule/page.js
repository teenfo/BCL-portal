"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00

export default function SessionSchedule() {
    const [sessions, setSessions] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('week'); // 'week' | 'list'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [coaches, setCoaches] = useState([]);
    const [newSession, setNewSession] = useState({
        title: "",
        coach_id: "",
        start_time: "",
        duration: 60,
        capacity: 10,
        intensity: "Intermediate"
    });

    useEffect(() => {
        fetchSessions();
        fetchCoaches();
    }, [currentDate]);

    const fetchCoaches = async () => {
        const { data } = await supabase.from("coaches").select("id, name");
        if (data) setCoaches(data);
    };

    const fetchSessions = async () => {
        setLoading(true);
        // Calculate range for fetching
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

    const handleCreateSession = async (e) => {
        e.preventDefault();

        const { error } = await supabase.from("sessions").insert([
            {
                ...newSession,
                start_time: new Date(newSession.start_time).toISOString(),
                enrolled: 0,
                status: 'Scheduled'
            }
        ]);

        if (!error) {
            setIsModalOpen(false);
            fetchSessions();
            setNewSession({
                title: "",
                coach_id: "",
                start_time: "",
                duration: 60,
                capacity: 10,
                intensity: "Intermediate"
            });
        } else {
            alert("Error creating session: " + error.message);
        }
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
            <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <h1 style={{ fontSize: "1.75rem" }}>수업 일정</h1>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-tertiary)", padding: "4px", borderRadius: "8px" }}>
                        <button onClick={() => setViewMode('week')} className={`btn-icon ${viewMode === 'week' ? 'active' : ''}`} style={{ padding: "8px 12px", borderRadius: "6px", background: viewMode === 'week' ? "var(--brand-primary)" : "transparent", color: viewMode === 'week' ? "white" : "var(--text-secondary)", border: "none" }}>주간</button>
                        <button onClick={() => setViewMode('list')} className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`} style={{ padding: "8px 12px", borderRadius: "6px", background: viewMode === 'list' ? "var(--brand-primary)" : "transparent", color: viewMode === 'list' ? "white" : "var(--text-secondary)", border: "none" }}>목록</button>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-tertiary)", padding: "8px 16px", borderRadius: "8px" }}>
                        <button onClick={handlePrevWeek} style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer" }}>◀</button>
                        <span style={{ fontWeight: "600", minWidth: "140px", textAlign: "center" }}>
                            {currentDate.toLocaleDateString()} 주
                        </span>
                        <button onClick={handleNextWeek} style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer" }}>▶</button>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>+ 수업 생성</button>
                </div>
            </header>

            {viewMode === 'week' ? (
                <div className="premium-card" style={{ flex: 1, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                        <div style={{ padding: "12px", borderRight: "1px solid var(--border-subtle)" }}></div>
                        {weekDates.map((date, i) => (
                            <div key={i} style={{ padding: "12px", textAlign: "center", borderRight: i < 6 ? "1px solid var(--border-subtle)" : "none", color: date.toDateString() === new Date().toDateString() ? "var(--brand-primary)" : "var(--text-primary)" }}>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{WEEK_DAYS[i]}</div>
                                <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>{date.getDate()}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", minHeight: "1020px" }}>
                            <div style={{ borderRight: "1px solid var(--border-subtle)" }}>
                                {TIME_SLOTS.map(hour => (
                                    <div key={hour} style={{ height: "60px", borderBottom: "1px solid var(--border-subtle)", padding: "4px 8px", fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "right" }}>
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
                                        .map(session => (
                                            <div key={session.id} style={getSessionStyle(session.start_time, session.duration || 60)}>
                                                <div style={{ fontWeight: "600", fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.title}</div>
                                                <div style={{ fontSize: "0.7rem", color: "var(--text-primary)" }}>{new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                        ))
                                    }
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="premium-card" style={{ padding: 0 }}>
                    <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                        목록 보기 모드입니다. (준비 중)
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div className="premium-card" style={{ width: "400px", padding: "24px", background: "var(--bg-secondary)" }}>
                        <h2 style={{ marginBottom: "20px" }}>새 수업 등록</h2>
                        <form onSubmit={handleCreateSession} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>수업명</label>
                                <input type="text" required value={newSession.title} onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>강사</label>
                                <select required value={newSession.coach_id} onChange={e => setNewSession({ ...newSession, coach_id: e.target.value })}
                                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}>
                                    <option value="">선택하세요</option>
                                    {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>시작 시간</label>
                                    <input type="datetime-local" required value={newSession.start_time} onChange={e => setNewSession({ ...newSession, start_time: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>진행 시간(분)</label>
                                    <input type="number" required value={newSession.duration} onChange={e => setNewSession({ ...newSession, duration: parseInt(e.target.value) })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>정원</label>
                                    <input type="number" required value={newSession.capacity} onChange={e => setNewSession({ ...newSession, capacity: parseInt(e.target.value) })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }} />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>난이도</label>
                                    <select value={newSession.intensity} onChange={e => setNewSession({ ...newSession, intensity: e.target.value })}
                                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-tertiary)", color: "white" }}>
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>취소</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>등록</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
