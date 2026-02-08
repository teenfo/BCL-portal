"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { labelStyle, inputStyle } from "./styles";

export default function MemberDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [member, setMember] = useState(null);
    const [checkins, setCheckins] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [workoutLogs, setWorkoutLogs] = useState([]);
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState("");
    const [newWorkoutLog, setNewWorkoutLog] = useState(""); // For new workout log input
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [savingNote, setSavingNote] = useState(false);

    useEffect(() => {
        if (id) fetchAllData();
    }, [id]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // Fetch Member Profile
            const { data: memberData, error: memberError } = await supabase
                .from("members")
                .select("*")
                .eq("id", id)
                .single();
            if (memberError) throw memberError;
            setMember(memberData);

            // Fetch Checkins
            const { data: checkinData } = await supabase
                .from("checkins")
                .select("*")
                .eq("member_id", id)
                .order("time", { ascending: false });
            setCheckins(checkinData || []);

            // Fetch Bookings
            const { data: bookingData } = await supabase
                .from("bookings")
                .select("*, sessions(title, start_time)")
                .eq("user_id", id)
                .order("created_at", { ascending: false });
            setBookings(bookingData || []);

            // Fetch Transactions
            const { data: transactionData } = await supabase
                .from("transactions")
                .select("*")
                .eq("member_id", id)
                .order("date", { ascending: false });
            setTransactions(transactionData || []);

            // Fetch Workout Logs
            const { data: workoutData } = await supabase
                .from("workout_logs")
                .select("*")
                .eq("member_id", id)
                .order("date", { ascending: false });
            setWorkoutLogs(workoutData || []);

            // Fetch Notes
            const { data: noteData } = await supabase
                .from("member_notes")
                .select("*")
                .eq("member_id", id)
                .order("created_at", { ascending: false });
            setNotes(noteData || []);

        } catch (error) {
            console.error("Error fetching member data:", error);
            alert("정보를 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateMember = async (updates) => {
        try {
            const { error } = await supabase
                .from("members")
                .update(updates)
                .eq("id", id);

            if (error) throw error;
            setMember({ ...member, ...updates });
            alert("정보가 업데이트되었습니다.");
        } catch (err) {
            alert(`업데이트 실패: ${err.message}`);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setSavingNote(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from("member_notes")
                .insert([{
                    member_id: id,
                    author_id: user.id,
                    content: newNote
                }])
                .select()
                .single();

            if (error) throw error;
            setNotes([data, ...notes]);
            setNewNote("");
        } catch (err) {
            alert(`노트 저장 실패: ${err.message}`);
        }
        setSavingNote(false);
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>로딩 중...</div>;
    if (!member) return <div style={{ padding: "40px", textAlign: "center" }}>회원을 찾을 수 없습니다.</div>;

    const tabs = [
        { id: "dashboard", label: "대시보드", icon: "📊" },
        { id: "membership", label: "멤버십 & 결제", icon: "💳" },
        { id: "history", label: "히스토리", icon: "📜" },
        { id: "notes", label: "상담/코칭 노트", icon: "📝" },
        { id: "settings", label: "설정 & 보안", icon: "⚙️" }
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", alignItems: "center", gap: "20px" }}>
                <button onClick={() => router.back()} className="btn-secondary" style={{ padding: "8px 12px" }}>← 목록</button>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "4px" }}>{member.name} 회원 상세</h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{member.email} • ID: {member.id}</p>
                </div>
            </header>

            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "32px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1px" }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: "12px 20px",
                            background: activeTab === tab.id ? "var(--bg-secondary)" : "transparent",
                            color: activeTab === tab.id ? "var(--brand-primary)" : "var(--text-secondary)",
                            border: "none",
                            borderBottom: activeTab === tab.id ? "2px solid var(--brand-primary)" : "2px solid transparent",
                            cursor: "pointer",
                            fontSize: "0.95rem",
                            fontWeight: activeTab === tab.id ? "600" : "400",
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            borderRadius: "8px 8px 0 0"
                        }}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="premium-card" style={{ padding: "32px" }}>
                {activeTab === "dashboard" && (
                    <div className="animate-fade-in">
                        {/* Stats Row */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px", marginBottom: "32px" }}>
                            <div className="inner-card" style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px" }}>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>현재 상태</p>
                                <span className={`badge ${member.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>{member.status}</span>
                            </div>
                            <div className="inner-card" style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px" }}>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>잔여 횟수</p>
                                <p style={{ fontSize: "1.75rem", fontWeight: "700" }}>{member.credits || 0}회</p>
                            </div>
                            <div className="inner-card" style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px" }}>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>배정 락커</p>
                                <p style={{ fontSize: "1.75rem", fontWeight: "700" }}>{member.locker_number || "없음"}</p>
                                {member.locker_end_date && <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>~ {member.locker_end_date}</p>}
                            </div>
                            <div className="inner-card" style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px" }}>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>최근 방문</p>
                                <p style={{ fontSize: "1.1rem", fontWeight: "600" }}>{checkins[0] ? new Date(checkins[0].time).toLocaleDateString() : "없음"}</p>
                            </div>
                        </div>

                        {/* Middle Row: Profile & Quick Activity */}
                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "32px", marginBottom: "40px" }}>
                            {/* Profile Section */}
                            <div>
                                <h3 style={{ marginBottom: "16px", fontSize: "1.1rem" }}>기본 정보</h3>
                                <div style={{ padding: "24px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                                    <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
                                        <div style={{
                                            width: "100px", height: "100px",
                                            borderRadius: "50%",
                                            background: "var(--bg-tertiary)",
                                            border: "2px solid var(--border-subtle)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            overflow: "hidden", flexShrink: 0
                                        }}>
                                            {member.profile_image ? (
                                                <img src={member.profile_image} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            ) : (
                                                <span style={{ fontSize: "2.5rem" }}>👤</span>
                                            )}
                                        </div>

                                        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                            <div>
                                                <label style={labelStyle}>이름</label>
                                                <input value={member.name} disabled style={{ ...inputStyle, opacity: 0.6 }} />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>연락처</label>
                                                <input
                                                    value={member.phone || ""}
                                                    onChange={(e) => handleUpdateMember({ phone: e.target.value })}
                                                    style={inputStyle}
                                                />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>생년월일</label>
                                                <input
                                                    type="date"
                                                    value={member.birthdate || ""}
                                                    onChange={(e) => handleUpdateMember({ birthdate: e.target.value })}
                                                    style={inputStyle}
                                                />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>성별</label>
                                                <select
                                                    value={member.gender || ""}
                                                    onChange={(e) => handleUpdateMember({ gender: e.target.value })}
                                                    style={inputStyle}
                                                >
                                                    <option value="">선택 안함</option>
                                                    <option value="Male">남성</option>
                                                    <option value="Female">여성</option>
                                                </select>
                                            </div>
                                            <div style={{ gridColumn: "1 / -1" }}>
                                                <label style={labelStyle}>프로필 이미지 URL</label>
                                                <input
                                                    value={member.profile_image || ""}
                                                    onChange={(e) => handleUpdateMember({ profile_image: e.target.value })}
                                                    placeholder="https://..."
                                                    style={inputStyle}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity Mini */}
                            <div>
                                <h3 style={{ marginBottom: "16px", fontSize: "1.1rem" }}>최근 활동</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {checkins.length > 0 ? (
                                        <div style={{ padding: "16px", background: "rgba(255,255,255,0.01)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>최근 방문</p>
                                            <p style={{ fontWeight: "600" }}>{checkins[0].facility || "Main Center"}</p>
                                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{new Date(checkins[0].time).toLocaleString()}</p>
                                        </div>
                                    ) : <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>방문 기록 없음</p>}

                                    {bookings.filter(b => b.status === 'confirmed').length > 0 ? (
                                        <div style={{ padding: "16px", background: "rgba(79,70,229,0.05)", borderRadius: "8px", border: "1px solid rgba(79,70,229,0.2)" }}>
                                            <p style={{ fontSize: "0.8rem", color: "var(--brand-primary)", marginBottom: "4px" }}>다음 예약</p>
                                            <p style={{ fontWeight: "600" }}>{bookings[0].sessions?.title}</p>
                                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{new Date(bookings[0].sessions?.start_time).toLocaleString()}</p>
                                        </div>
                                    ) : <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>예정된 수업 없음</p>}
                                </div>
                            </div>
                        </div>

                        {/* Workout Logs Section */}
                        <div>
                            <h3 style={{ marginBottom: "20px" }}>운동 일지 & 피드백</h3>
                            <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
                                <textarea
                                    value={newWorkoutLog}
                                    onChange={(e) => setNewWorkoutLog(e.target.value)}
                                    placeholder="금일 진행한 운동 내용이나 피드백을 기록하세요..."
                                    style={{
                                        flex: 1, minHeight: "60px", background: "var(--bg-tertiary)",
                                        border: "1px solid var(--border-subtle)", borderRadius: "8px",
                                        padding: "12px", color: "white", outline: "none", fontSize: "0.9rem"
                                    }}
                                />
                                <button
                                    onClick={async () => {
                                        if (!newWorkoutLog.trim()) return;
                                        try {
                                            const { error } = await supabase
                                                .from("workout_logs")
                                                .insert([{
                                                    member_id: id,
                                                    content: newWorkoutLog,
                                                    date: new Date().toISOString().split('T')[0]
                                                }]);
                                            if (error) throw error;
                                            alert("운동 일지가 등록되었습니다.");
                                            setNewWorkoutLog("");
                                            fetchAllData(); // Refresh
                                        } catch (err) {
                                            alert(`등록 실패: ${err.message}`);
                                        }
                                    }}
                                    className="btn-primary"
                                    style={{ height: "fit-content", padding: "10px 20px", fontSize: "0.9rem" }}
                                >
                                    등록
                                </button>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {workoutLogs.slice(0, 3).map(log => (
                                    <div key={log.id} style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                            <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>{log.date}</span>
                                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                                {log.coach_feedback ? "피드백 완료" : "피드백 대기"}
                                            </span>
                                        </div>
                                        <p style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>{log.content}</p>
                                        {log.coach_feedback && (
                                            <div style={{ marginTop: "10px", padding: "10px", background: "rgba(79,70,229,0.1)", borderRadius: "6px" }}>
                                                <p style={{ fontSize: "0.8rem", color: "var(--brand-primary)", fontWeight: "600", marginBottom: "2px" }}>Coach Feedback</p>
                                                <p style={{ fontSize: "0.85rem" }}>{log.coach_feedback}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {workoutLogs.length === 0 && (
                                    <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px", fontSize: "0.9rem" }}>등록된 운동 일지가 없습니다.</p>
                                )}
                                {workoutLogs.length > 3 && (
                                    <button
                                        onClick={() => setActiveTab("workouts_history")} // Simple view toggle could be implemented if needed
                                        style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-secondary)", cursor: "pointer" }}
                                    >
                                        이전 기록 더보기 ({workoutLogs.length - 3}개)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "membership" && (
                    <div className="animate-fade-in">
                        <h3 style={{ marginBottom: "24px" }}>멤버십 상세 관리</h3>

                        {/* Membership Info */}
                        <div style={{ padding: "24px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid var(--border-subtle)", marginBottom: "24px" }}>
                            <h4 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "var(--brand-primary)" }}>이용권 정보</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                                <div>
                                    <label style={labelStyle}>현재 플랜</label>
                                    <div style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "8px" }}>{member.plan || "플랜 없음"}</div>
                                    <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                                        잔여 횟수: <span style={{ color: "var(--brand-primary)", fontWeight: "600" }}>{member.credits || 0}회</span>
                                    </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div>
                                        <label style={labelStyle}>시작일</label>
                                        <input
                                            type="date"
                                            value={member.membership_start_date || ""}
                                            onChange={(e) => handleUpdateMember({ membership_start_date: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>만료일</label>
                                        <input
                                            type="date"
                                            value={member.membership_end_date || ""}
                                            onChange={(e) => handleUpdateMember({ membership_end_date: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Locker Info */}
                        <div style={{ padding: "24px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                            <h4 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "var(--brand-primary)" }}>락커 관리</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                                <div>
                                    <label style={labelStyle}>락커 번호</label>
                                    <input
                                        type="text"
                                        value={member.locker_number || ""}
                                        onChange={(e) => handleUpdateMember({ locker_number: e.target.value })}
                                        placeholder="배정된 락커 없음"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>락커 만료일</label>
                                    <input
                                        type="date"
                                        value={member.locker_end_date || ""}
                                        onChange={(e) => handleUpdateMember({ locker_end_date: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "history" && (
                    <div className="animate-fade-in">
                        <h3 style={{ marginBottom: "20px" }}>통합 히스토리</h3>

                        <h4 style={{ fontSize: "1rem", marginBottom: "12px", color: "var(--text-secondary)" }}>결제 내역</h4>
                        <div style={{ overflowX: "auto", marginBottom: "32px" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", textAlign: "left" }}>
                                        <th style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>일시</th>
                                        <th style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>내용/금액</th>
                                        <th style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                            <td style={{ padding: "12px", fontSize: "0.9rem" }}>{new Date(t.date).toLocaleDateString()}</td>
                                            <td style={{ padding: "12px", fontSize: "0.9rem" }}>
                                                {Number(t.amount).toLocaleString()}원
                                            </td>
                                            <td style={{ padding: "12px" }}><span className={`badge ${t.status === 'completed' ? 'badge-success' : 'badge-secondary'}`}>{t.status}</span></td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>결제 내역이 없습니다.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <h4 style={{ fontSize: "1rem", marginBottom: "12px", color: "var(--text-secondary)" }}>활동 로그 (출석/예약)</h4>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", textAlign: "left" }}>
                                        <th style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>일시</th>
                                        <th style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>유형</th>
                                        <th style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>상세</th>
                                        <th style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checkins.map(c => (
                                        <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                            <td style={{ padding: "12px", fontSize: "0.9rem" }}>{new Date(c.time).toLocaleString()}</td>
                                            <td style={{ padding: "12px", fontSize: "0.9rem" }}>체크인</td>
                                            <td style={{ padding: "12px", fontSize: "0.9rem" }}>{c.facility}</td>
                                            <td style={{ padding: "12px" }}><span className="badge badge-success">{c.status}</span></td>
                                        </tr>
                                    ))}
                                    {bookings.map(b => (
                                        <tr key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                            <td style={{ padding: "12px", fontSize: "0.9rem" }}>{new Date(b.created_at).toLocaleString()}</td>
                                            <td style={{ padding: "12px", fontSize: "0.9rem" }}>예약</td>
                                            <td style={{ padding: "12px", fontSize: "0.9rem" }}>{b.sessions?.title}</td>
                                            <td style={{ padding: "12px" }}><span className={`badge ${b.status === 'confirmed' ? 'badge-primary' : 'badge-secondary'}`}>{b.status}</span></td>
                                        </tr>
                                    ))}
                                    {checkins.length === 0 && bookings.length === 0 && (
                                        <tr><td colSpan="4" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>활동 기록이 없습니다.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}



                {activeTab === "notes" && (
                    <div className="animate-fade-in">
                        <h3 style={{ marginBottom: "20px" }}>상담 및 코칭 노트</h3>
                        <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="회원의 컨디션, 부상 내역, 특이사항 등을 기록하세요..."
                                style={{
                                    flex: 1, minHeight: "80px", background: "var(--bg-tertiary)",
                                    border: "1px solid var(--border-subtle)", borderRadius: "12px",
                                    padding: "16px", color: "white", outline: "none"
                                }}
                            />
                            <button
                                onClick={handleAddNote}
                                disabled={savingNote || !newNote.trim()}
                                className="btn-primary"
                                style={{ height: "fit-content", padding: "12px 24px" }}
                            >
                                {savingNote ? "저장 중..." : "노트 등록"}
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {notes.map(note => (
                                <div key={note.id} style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                                        <span style={{ fontSize: "0.85rem", color: "var(--brand-primary)", fontWeight: "600" }}>Coach</span>
                                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{new Date(note.created_at).toLocaleString()}</span>
                                    </div>
                                    <p style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem", lineHeight: "1.6" }}>{note.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="animate-fade-in">
                        <h3 style={{ marginBottom: "20px" }}>계정 설정 및 보안</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={{ padding: "16px", background: "rgba(255,22,22,0.05)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontWeight: "600" }}>계정 비활성화</div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>이 회원의 로그인을 차단합니다.</div>
                                </div>
                                <button className="btn-secondary" style={{ color: "#ef4444", borderColor: "#ef4444" }}>비활성화 실행</button>
                            </div>
                            <div style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontWeight: "600" }}>비밀번호 초기화 메일</div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>회원 이메일로 비밀번호 재설정 링크를 보냅니다.</div>
                                </div>
                                <button className="btn-secondary">이메일 발송</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
