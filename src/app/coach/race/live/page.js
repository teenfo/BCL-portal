"use client";
import { useState, useEffect, useRef } from "react";

export default function LiveRace() {
    const [leaderboard, setLeaderboard] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/coach/race/api/ws/race`;

        const connectWebSocket = () => {
            const socket = new WebSocket(wsUrl);
            socket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === "leaderboard") {
                    setLeaderboard(message.data);
                }
            };
            socket.onclose = () => setTimeout(connectWebSocket, 3000);
            socketRef.current = socket;
        };

        connectWebSocket();
        return () => { if (socketRef.current) socketRef.current.close(); };
    }, []);

    return (
        <div style={{
            minHeight: "100vh", background: "#0a0a0a", color: "white", padding: "40px",
            fontFamily: "var(--font-inter)", display: "flex", flexDirection: "column"
        }}>
            <header style={{ textAlign: "center", marginBottom: "60px" }}>
                <h1 style={{ fontSize: "3rem", fontWeight: "900", color: "var(--brand-primary)", letterSpacing: "-2px" }}>
                    BCL LIVE RACE 🏁
                </h1>
                <p style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.5)" }}>REAL-TIME LEADERBOARD</p>
            </header>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "30px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
                {leaderboard.sort((a, b) => b.distance - a.distance).map((lane, index) => (
                    <div key={lane.lane} style={{
                        background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "30px",
                        borderLeft: `8px solid ${index === 0 ? 'var(--brand-primary)' : 'rgba(255,255,255,0.1)'}`,
                        display: "flex", alignItems: "center", gap: "40px", position: "relative"
                    }}>
                        <div style={{ fontSize: "4rem", fontWeight: "900", opacity: 0.2, width: "80px" }}>
                            {index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "15px" }}>
                                <h2 style={{ fontSize: "2.5rem", fontWeight: "800" }}>{lane.name}</h2>
                                <span style={{ fontSize: "2rem", color: "var(--brand-primary)", fontWeight: "800" }}>{lane.distance}m</span>
                            </div>
                            <div style={{ height: "15px", background: "rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                                <div style={{
                                    width: `${Math.min(100, (lane.distance / 500) * 100)}%`,
                                    height: "100%", background: "var(--brand-primary)",
                                    boxShadow: "0 0 20px rgba(255, 107, 0, 0.5)",
                                    transition: "width 0.5s ease-out"
                                }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
