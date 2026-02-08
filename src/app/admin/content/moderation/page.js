"use client";
export default function ContentModerationPage() {
    const reports = [
        { id: 1, type: "Post", content: "비매너 게시글...", author: "불량유저", reason: "Spam", status: "Open" },
        { id: 2, type: "Comment", content: "부적절한 댓글...", author: "어그로꾼", reason: "Abuse", status: "Resolved" }
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>콘텐츠 모더레이션</h1>
                <p style={{ color: "var(--text-secondary)" }}>신고된 게시글 및 부적절한 콘텐츠를 검토하고 조치합니다.</p>
            </header>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>유형</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>내용 요약</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>사유</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>상태</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map(r => (
                            <tr key={r.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                <td style={{ padding: "16px 24px" }}>{r.type}</td>
                                <td style={{ padding: "16px 24px", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.content}</td>
                                <td style={{ padding: "16px 24px", color: "var(--status-error)" }}>{r.reason}</td>
                                <td style={{ padding: "16px 24px" }}>
                                    <span className={`badge ${r.status === 'Open' ? 'badge-error' : 'badge-neutral'}`}>{r.status}</span>
                                </td>
                                <td style={{ padding: "16px 24px" }}>
                                    <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>처리</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
