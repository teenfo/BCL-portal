"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function LiveHubClient() {
    const [attendees, setAttendees] = useState([]);
    const [session, setSession] = useState(null);
    const [todayWod, setTodayWod] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchInitialData() {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];

            // 1. Fetch Today's WOD
            const { data: wodData } = await supabase
                .from('wods')
                .select('*')
                .eq('date', today)
                .maybeSingle();
            if (wodData) setTodayWod(wodData);

            // 2. Fetch Current Active Session
            const now = new Date().toISOString();
            const { data: sData } = await supabase
                .from("sessions")
                .select("*")
                .lte('start_time', now)
                .gte('end_time', now)
                .limit(1)
                .maybeSingle();

            if (sData) {
                setSession(sData);
            } else {
                // If no active session, get the next upcoming one
                const { data: nextS } = await supabase
                    .from("sessions")
                    .select("*")
                    .gte('start_time', now)
                    .order('start_time', { ascending: true })
                    .limit(1)
                    .maybeSingle();
                if (nextS) setSession(nextS);
            }

            await fetchAttendees();
            setLoading(false);
        }

        fetchInitialData();

        // Subscribe to check-ins
        const channel = supabase
            .channel('live-hub')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins' }, () => {
                fetchAttendees();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchAttendees = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from("checkins")
            .select(`
                id,
                time,
                member_name,
                status
            `)
            .gte('time', today + 'T00:00:00')
            .lte('time', today + 'T23:59:59')
            .order('time', { ascending: false });

        if (data) {
            setAttendees(data.map(d => ({
                id: d.id,
                name: d.member_name || "Unknown",
                status: d.status || "Checked-in",
                checkinTime: d.time
            })));
        }
    };

    if (loading) return <div style={{ padding: '60px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Synchronizing Live Hub...</div>;

    const workout = todayWod || {
        title: "NO WOD TODAY",
        metcon: { type: "N/A", format: "Rest Day", movements: [] }
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", height: "100%", overflow: "hidden" }}>
            {/* Left Side: Live Cockpit */}
            <div style={{ padding: "40px", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: "30px" }}>
                <div className="premium-card" style={{ background: "rgba(255, 107, 0, 0.05)", borderColor: "var(--brand-primary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <span style={{ fontSize: "0.9rem", color: "var(--brand-primary)", fontWeight: "800", textTransform: "uppercase" }}>Current Session</span>
                            <h2 style={{ fontSize: "2.5rem", fontWeight: "900", margin: "10px 0" }}>{session?.title || "No Active Session"}</h2>
                            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.1rem" }}>Lead Coach: <strong>{session?.coach_name || "TBD"}</strong> • Room: <strong>Zone 1</strong></p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "1rem", color: "rgba(255,255,255,0.4)" }}>Phase</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "var(--status-warning)" }}>{session ? "IN PROGRESS" : "WAITING"}</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", flex: 1 }}>
                    {/* WOD Highlights */}
                    <div className="premium-card" style={{ display: "flex", flexDirection: "column" }}>
                        <h3 style={{ fontSize: "1.2rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                            📋 <span>TODAY'S WOD: {workout.title}</span>
                        </h3>
                        {workout.metcon && (
                            <div style={{ fontSize: "1.1rem", lineHeight: "1.6" }}>
                                <div style={{ fontSize: "1.8rem", fontWeight: "800", marginBottom: "20px", color: "var(--brand-secondary)" }}>
                                    {workout.metcon.format}
                                </div>
                                <ul style={{ listStyle: "none", padding: 0 }}>
                                    {workout.metcon.movements?.map((move, idx) => (
                                        <li key={idx} style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ fontWeight: "700" }}>{move.name}</span>
                                            <span style={{ color: "rgba(255,255,255,0.5)" }}>{move.rx}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Quick Controls */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div className="premium-card" style={{ background: "rgba(0,0,0,0.3)", textAlign: "center", padding: "40px" }}>
                            <div style={{ fontSize: "1rem", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>QUICK TIMER</div>
                            <div style={{ fontSize: "4rem", fontWeight: "900", fontFamily: "monospace", letterSpacing: "2px" }}>00:00</div>
                            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
                                <button className="btn-primary" style={{ padding: "10px 20px" }}>START</button>
                                <button className="btn-secondary" style={{ padding: "10px 20px" }}>RESET</button>
                            </div>
                        </div>
                        <div className="premium-card" style={{ flex: 1 }}>
                            <h3 style={{ fontSize: "1.1rem", marginBottom: "15px" }}>Live Announcements</h3>
                            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95rem" }}>
                                <p style={{ marginBottom: "10px" }}>📢 Please sanitize equipment after the set.</p>
                                <p>📢 {attendees.length > 0 ? `${attendees.length} members checked in.` : "Waiting for check-ins..."}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Attendees */}
            <div style={{ background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "30px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <h3 style={{ fontSize: "1.1rem", display: "flex", justifyContent: "space-between" }}>
                        <span>ATTENDEES</span>
                        <span style={{ color: "var(--brand-primary)" }}>{attendees.length}</span>
                    </h3>
                </div>
                <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                    {attendees.map((person) => (
                        <div key={person.id} style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "15px",
                            padding: "15px",
                            borderRadius: "12px",
                            background: "rgba(255,255,255,0.03)",
                            marginBottom: "10px",
                            border: "1px solid rgba(255,255,255,0.02)"
                        }}>
                            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255, 107, 0, 0.1)", display: "flex", alignItems: "center", justifyItems: "center", fontSize: "1.2rem", justifyContent: "center" }}>
                                👤
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: "600", fontSize: "1rem" }}>{person.name}</div>
                                <div style={{ fontSize: "0.75rem", color: person.status === 'Checked-in' || person.status === 'Present' ? "var(--status-success)" : "rgba(255,255,255,0.3)" }}>
                                    {new Date(person.checkinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: person.status === 'Checked-in' || person.status === 'Present' ? "var(--status-success)" : "transparent", border: (person.status !== 'Checked-in' && person.status !== 'Present') ? "1px solid rgba(255,255,255,0.2)" : "none" }}></div>
                        </div>
                    ))}
                </div>
                <div style={{ padding: "20px", background: "rgba(0,0,0,0.2)" }}>
                    <button className="btn-secondary" style={{ width: "100%", fontSize: "0.9rem" }}>OPEN CHECK-IN MODE</button>
                </div>
            </div>
        </div>
    );
}
