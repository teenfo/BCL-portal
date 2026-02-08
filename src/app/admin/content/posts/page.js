"use client";
export default function PostsManagementPage() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>커뮤니티 게시글 관리</h1>
                <p style={{ color: "var(--text-secondary)" }}>회원들이 작성한 커뮤니티 게시글과 댓글을 모니터링하고 관리합니다.</p>
            </header>

            <div className="premium-card" style={{ textAlign: "center", padding: "80px 40px" }}>
                <div style={{ fontSize: "3rem", marginBottom: "20px" }}>💬</div>
                <h2 style={{ marginBottom: "12px" }}>게시글 관리 서비스 준비 중</h2>
                <p style={{ color: "var(--text-secondary)" }}>커뮤니티 활성화 정책에 맞춰 곧 오픈될 예정입니다.</p>
                <button className="btn-primary" style={{ marginTop: "24px" }}>자동 모니터링 설정</button>
            </div>
        </div>
    );
}
