'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    credits: number;
}

export default function UserProfilePage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadProfile(); }, []);

    async function loadProfile() {
        const supabase = createClient();
        const { data: plansData } = await supabase.from('membership_plans').select('*').order('price', { ascending: true });
        if (plansData) setPlans(plansData);
        setLoading(false);
    }

    const menuItems = [
        { icon: '👤', label: '프로필 수정', desc: '이름, 연락처 변경' },
        { icon: '🔐', label: '비밀번호 변경', desc: '보안 설정' },
        { icon: '💳', label: '결제 내역', desc: '이용권 구매 기록' },
        { icon: '📊', label: '운동 기록', desc: '출석, 운동 통계' },
        { icon: '⚙️', label: '앱 설정', desc: '알림, 테마' },
    ];

    return (
        <div className="p-4 pb-24 max-w-lg mx-auto animate-fade-in">
            {/* Profile Header */}
            <div className="glass-card p-6 rounded-xl text-center mb-6">
                <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-white mb-3" style={{ background: 'linear-gradient(135deg, var(--primary), #FF8A3D)' }}>
                    ?
                </div>
                <h2 className="text-white text-xl font-bold">게스트</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>로그인 후 이용해주세요</p>

                <div className="mt-4 p-3 rounded-lg flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-left">
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>현재 이용권</p>
                        <p className="text-white font-semibold">없음</p>
                    </div>
                    <a href="/apps/plans" className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--primary)', color: '#fff' }}>
                        이용권 구매
                    </a>
                </div>
            </div>

            {/* Menu Items */}
            <div className="glass-card rounded-xl overflow-hidden mb-6">
                {menuItems.map((item, index) => (
                    <button
                        key={item.label}
                        className="w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-white/5"
                        style={index < menuItems.length - 1 ? { borderBottom: '1px solid var(--border)' } : {}}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <div className="flex-1">
                            <p className="text-white font-medium">{item.label}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                    </button>
                ))}
            </div>

            {/* Sign Out */}
            <button className="w-full glass-card p-4 rounded-xl text-center transition-colors hover:bg-white/5" style={{ color: 'var(--error)' }}>
                로그아웃
            </button>
        </div>
    );
}
