"use client";
export default function ImportExportPage() {
    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>데이터 내보내기 및 가져오기</h1>
                <p style={{ color: "var(--text-secondary)" }}>회원, 매출, 세션 데이터를 대량으로 처리하거나 백업을 생성합니다.</p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>데이터 내보내기 (Export)</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <button className="btn-secondary" style={{ textAlign: "left", padding: "16px" }}>
                            <div style={{ fontWeight: "600" }}>회원 명부 (CSV/Excel)</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>전체 회원 정보 및 상태 포함</div>
                        </button>
                        <button className="btn-secondary" style={{ textAlign: "left", padding: "16px" }}>
                            <div style={{ fontWeight: "600" }}>결제/매출 리포트 (.xlsx)</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>기간별 세분화된 매출 데이터</div>
                        </button>
                        <button className="btn-secondary" style={{ textAlign: "left", padding: "16px" }}>
                            <div style={{ fontWeight: "600" }}>출석 로그 데이터</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>분석용 원천 로그 데이터</div>
                        </button>
                    </div>
                </div>

                <div className="premium-card">
                    <h3 style={{ marginBottom: "20px" }}>데이터 가져오기 (Import)</h3>
                    <div style={{ padding: "40px 20px", border: "2px dashed var(--border-subtle)", borderRadius: "12px", textAlign: "center", background: "rgba(255,255,255,0.02)" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📄</div>
                        <p style={{ marginBottom: "16px", color: "var(--text-secondary)" }}>파일을 드래그하거나 클릭하여 업로드하세요</p>
                        <button className="btn-primary">파일 선택</button>
                    </div>
                    <div style={{ marginTop: "20px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        지원 형식: .csv, .xlsx | 최대 파일 크기: 10MB
                    </div>
                </div>
            </div>
        </div>
    );
}
