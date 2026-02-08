"use client";
import { useState } from "react";

export default function MemberSettingsPage() {
    const [settings, setSettings] = useState({
        darkMode: true,
        pushNotifications: true,
        emailNotifications: false,
        marketingAgreement: true
    });

    return (
        <div className="animate-fade-in" style={{ paddingBottom: "20px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "4px" }}>환경설정</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>앱 사용 환경 및 알림 수신을 설정합니다.</p>
            </header>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="premium-card">
                    <h3 style={{ fontSize: "1rem", marginBottom: "20px", color: "var(--brand-primary)" }}>디스플레이</h3>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontWeight: "600" }}>다크 모드</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>이미 다크 모드로 설정되어 있습니다.</div>
                        </div>
                        <input type="checkbox" checked={settings.darkMode} readOnly />
                    </div>
                </div>

                <div className="premium-card">
                    <h3 style={{ fontSize: "1rem", marginBottom: "20px", color: "var(--brand-primary)" }}>알림 설정</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: "600" }}>푸시 알림</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>수업 예약 및 체크인 알림</div>
                            </div>
                            <input type="checkbox" checked={settings.pushNotifications} onChange={e => setSettings({ ...settings, pushNotifications: e.target.checked })} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: "600" }}>이메일 알림</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>주간 리포트 및 중요 공지</div>
                            </div>
                            <input type="checkbox" checked={settings.emailNotifications} onChange={e => setSettings({ ...settings, emailNotifications: e.target.checked })} />
                        </div>
                    </div>
                </div>

                <div className="premium-card">
                    <h3 style={{ fontSize: "1rem", marginBottom: "20px", color: "var(--brand-primary)" }}>약관 및 정책</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                            <span>서비스 이용약관</span>
                            <span>〉</span>
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                            <span>개인정보 처리방침</span>
                            <span>〉</span>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: "24px", textAlign: "center" }}>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>앱 버전 v1.0.4 (Stable)</p>
                </div>
            </div>
        </div>
    );
}
