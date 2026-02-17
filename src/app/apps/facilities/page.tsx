'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Facility {
    id: string;
    name: string;
    address: string;
    operating_hours: string;
}

export default function UserFacilitiesPage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

    useEffect(() => { loadFacilities(); }, []);

    async function loadFacilities() {
        const supabase = createClient();
        const { data } = await supabase.from('facilities').select('*').order('name');
        if (data) setFacilities(data);
        setLoading(false);
    }

    const facilityIcons = ['🏋️', '💪', '🥊'];

    return (
        <div className="p-4 pb-24 max-w-lg mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-4">지점 안내</h1>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
                </div>
            ) : facilities.length === 0 ? (
                <div className="glass-card p-8 rounded-xl text-center">
                    <p className="text-3xl mb-2">📍</p>
                    <p style={{ color: 'var(--text-secondary)' }}>등록된 지점이 없습니다</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {facilities.map((facility, idx) => (
                        <div key={facility.id} className="glass-card p-5 rounded-xl transition-all active:scale-[0.98]" onClick={() => setSelectedFacility(selectedFacility?.id === facility.id ? null : facility)}>
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(var(--primary), 0.1)', border: '1px solid var(--border)' }}>
                                    {facilityIcons[idx % facilityIcons.length]}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-semibold text-lg">{facility.name}</h3>
                                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>📍 {facility.address || '주소 정보 없음'}</p>
                                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>🕐 {facility.operating_hours || '운영 시간 미정'}</p>
                                </div>
                            </div>

                            {selectedFacility?.id === facility.id && (
                                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <a href={`tel:`} className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                                            📞 전화하기
                                        </a>
                                        <a href={`https://map.naver.com/v5/search/${encodeURIComponent(facility.address || facility.name)}`} target="_blank" rel="noopener" className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                                            🗺️ 지도보기
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
