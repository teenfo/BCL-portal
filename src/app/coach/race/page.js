"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function CoachRace() {
    const [status, setStatus] = useState("disconnected");
    const [leaderboard, setLeaderboard] = useState([]);
    const [isRaceActive, setIsRaceActive] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        // In development, you'd point to localhost:8000
        // In production (Docker), the Nginx proxy handles /coach/race/api/
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/coach/race/api/ws/race`;

        const connectWebSocket = () => {
            console.log("Connecting to Race WebSocket:", wsUrl);
            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log("WebSocket Connected");
                setStatus("connected");
            };

            socket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === "leaderboard") {
                    setLeaderboard(message.data);
                }
            };

            socket.onclose = () => {
                console.log("WebSocket Disconnected");
                setStatus("disconnected");
                // Attempt to reconnect after 3 seconds
                setTimeout(connectWebSocket, 3000);
            };

            socketRef.current = socket;
        };

        connectWebSocket();

        return () => {
            if (socketRef.current) socketRef.current.close();
        };
    }, []);

    const toggleRace = () => {
        setIsRaceActive(!isRaceActive);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>레이스 컨트롤 🏁</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        상태: <span style={{ color: status === "connected" ? "var(--status-success)" : "var(--status-error)" }}>
                            {status === "connected" ? "● 연결됨" : "○ 연결 대기 중"}
                        </span>
                    </p>
                </div>
                <button
                    onClick={toggleRace}
                    className={isRaceActive ? "btn-secondary" : "btn-primary"}
                    style={{ padding: "12px 24px" }}
                >
                    {isRaceActive ? "레이스 종료" : "레이스 시작"}
                </button>
            </header>

            {/* Lane Assignment Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", marginBottom: "32px" }}>
                {leaderboard.length === 0 ? (
                    <div className="premium-card" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                        기기 연결을 기다리는 중입니다...
                    </div>
                ) : (
                    leaderboard.map((lane) => (
                        <div key={lane.lane} className="premium-card" style={{ padding: "20px", position: "relative", overflow: "hidden" }}>
                            {/* Visual Progress Bar Background */}
                            <div style={{
                                position: "absolute", top: 0, left: 0, bottom: 0,
                                width: `${Math.min(100, (lane.distance / 500) * 100)}%`,
                                background: "rgba(255, 107, 0, 0.1)",
                                transition: "width 0.5s ease-out",
                                zIndex: 0
                            }} />

                            <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                    <div style={{
                                        width: "40px", height: "40px", borderRadius: "50%",
                                        background: "var(--brand-primary)", display: "flex",
                                        alignItems: "center", justifyContent: "center", fontWeight: "800", color: "white"
                                    }}>
                                        {lane.lane}
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: "1.1rem", fontWeight: "700" }}>{lane.name}</h4>
                                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{lane.speed} m/s | 1:52 / 500m</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <p style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--brand-primary)" }}>{lane.distance}m</p>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>남은 거리: {500 - lane.distance}m</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* System Info */}
            <div className="premium-card" style={{ padding: "20px", background: "rgba(255,255,255,0.02)" }}>
                <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "12px" }}>시스템 정보</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <div>서버 주소: {window.location.host}</div>
                    <div>프로토콜: WebSocket Secure</div>
                    <div>엔진 버전: v1.0.2 (FastAPI)</div>
                    <div>연결 기기: PM5 Simulator x 2</div>
                </div>
            </div>
        </div>
    );
}
