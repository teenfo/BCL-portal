"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function BannerManagement() {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        setLoading(true);
        const { data } = await supabase.from("banners").select("*").order("order_index", { ascending: true });
        if (data) setBanners(data);
        else {
            setBanners([
                { id: 1, title: "신규 멤버십 런칭", image_url: "https://via.placeholder.com/1200x400", active: true, order_index: 0 },
                { id: 2, title: "바디 챌린지 시즌 5 모집", image_url: "https://via.placeholder.com/1200x400", active: true, order_index: 1 },
                { id: 3, title: "센터 정기 소독 안내", image_url: "https://via.placeholder.com/1200x400", active: false, order_index: 2 }
            ]);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>배너 및 비주얼 관리</h1>
                    <p style={{ color: "var(--text-secondary)" }}>사용자 앱 홈 화면의 메인 배너와 공지 비주얼을 관리합니다.</p>
                </div>
                <button className="btn-primary">+ 새 배너 등록</button>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
                {banners.map((banner) => (
                    <div key={banner.id} className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                        <div style={{ height: "160px", background: "#333", position: "relative" }}>
                            <img src={banner.image_url} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: banner.active ? 1 : 0.4 }} />
                            {!banner.active && (
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
                                    <span style={{ fontSize: "0.85rem", background: "white", color: "black", padding: "4px 8px", borderRadius: "4px" }}>비활성</span>
                                </div>
                            )}
                        </div>
                        <div style={{ padding: "20px" }}>
                            <h3 style={{ fontSize: "1.1rem", marginBottom: "8px" }}>{banner.title}</h3>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>순서: {banner.order_index + 1}</span>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>수정</button>
                                    <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem", color: banner.active ? 'var(--status-error)' : 'var(--status-success)' }}>
                                        {banner.active ? '비활성화' : '활성화'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
