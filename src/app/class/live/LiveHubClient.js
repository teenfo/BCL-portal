"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function LiveHubClient() {
    const [attendees, setAttendees] = useState([
        { id: 1, name: "김철수", status: "Checked-in", avatar: "👤" },
        { id: 2, name: "이영희", status: "Checked-in", avatar: "👤" },
        { id: 3, name: "박민준", status: "Checked-in", avatar: "👤" },
        { id: 4, name: "최서연", status: "Waiting", avatar: "👤" },
    ]);

    const workout = {
        title: "FRAN",
        type: "21-15-9",
        movements: [
            { name: "Thrusters", weight: "95 lbs" },
            { name: "Pull-ups", weight: "Bodyweight" }
        ],
        timeCap: "10:00"
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", height: "100%", overflow: "hidden" }}>
            {/* Left Side: Live Cockpit */}
            <div style={{ padding: "40px", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: "30px" }}>
                <div className="premium-card" style={{ background: "rgba(255, 107, 0, 0.05)", borderColor: "var(--brand-primary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <span style={{ fontSize: "0.9rem", color: "var(--brand-primary)", fontWeight: "800", textTransform: "uppercase" }}>Current Session</span>
                            <h2 style={{ fontSize: "2.5rem", fontWeight: "900", margin: "10px 0" }}>Evening CrossFit A</h2>
                            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.1rem" }}>Lead Coach: <strong>Mark Henderson</strong> • Room: <strong>Zone 1</strong></p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "1rem", color: "rgba(255,255,255,0.4)" }}>Phase</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "var(--status-warning)" }}>MAIN WORKOUT</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", flex: 1 }}>
                    {/* WOD Highlights */}
                    <div className="premium-card" style={{ display: "flex", flexDirection: "column" }}>
                        <h3 style={{ fontSize: "1.2rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                            📋 <span>TODAY'S WOD: {workout.title}</span>
                        </h3>
                        <div style={{ fontSize: "1.1rem", lineHeight: "1.6" }}>
                            <div style={{ fontSize: "1.8rem", fontWeight: "800", marginBottom: "20px", color: "var(--brand-secondary)" }}>
                                {workout.type} REPS FOR TIME
                            </div>
                            <ul style={{ listStyle: "none", padding: 0 }}>
                                {workout.movements.map((move, idx) => (
                                    <li key={idx} style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontWeight: "700" }}>{move.name}</span>
                                        <span style={{ color: "rgba(255,255,255,0.5)" }}>{move.weight}</span>
                                    </li>
                                ))}
                            </ul>
                            <div style={{ marginTop: "20px", padding: "15px", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "0.9rem", color: "rgba(255,255,255,0.4)" }}>
                                💡 Scaling: Use a weight that allows for 10+ unbroken thrusters.
                            </div>
                        </div>
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
                                <p>📢 Next session starts at 19:30.</p>
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
                                {person.avatar}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: "600", fontSize: "1rem" }}>{person.name}</div>
                                <div style={{ fontSize: "0.75rem", color: person.status === 'Checked-in' ? "var(--status-success)" : "rgba(255,255,255,0.3)" }}>
                                    {person.status}
                                </div>
                            </div>
                            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: person.status === 'Checked-in' ? "var(--status-success)" : "transparent", border: person.status !== 'Checked-in' ? "1px solid rgba(255,255,255,0.2)" : "none" }}></div>
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
