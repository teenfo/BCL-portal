"use client";
import { useState, useEffect } from "react";

export default function MaintenanceHistoryPage() {
    const history = [
        { id: 1, title: "시스템 전체 정기 점검", date: "2026-02-01", status: "Completed", notes: "데이터베이스 인덱스 최적화 및 보안 패치 적용" },
        { id: 2, title: "서버 확장 작업", date: "2026-01-15", status: "Completed", notes: "클라우드 인스턴스 사양 업그레이드" },
        { id: 3, title: "긴급 패치 - 결제 모듈", date: "2026-01-05", status: "Completed", notes: "API 응답 속도 개선" }
    ];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>게시/점검 이력</h1>
                    <p style={{ color: "var(--text-secondary)" }}>공지사항 게시 및 시스템 점검 이력을 관리합니다.</p>
                </div>
                <button className="btn-primary">점검 모드 예약</button>
            </header>

            <div style={{ display: "grid", gap: "20px" }}>
                {history.map(item => (
                    <div key={item.id} className="premium-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                <span className="badge badge-success">완료</span>
                                <h3 style={{ fontSize: "1.1rem" }}>{item.title}</h3>
                            </div>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "8px" }}>실행일: {item.date}</p>
                            <p style={{ fontSize: "0.9rem" }}>{item.notes}</p>
                        </div>
                        <button className="btn-secondary" style={{ fontSize: "0.8rem" }}>보고서 상세</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
