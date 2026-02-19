'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import Image from 'next/image';
import { IconBuilding, IconPhone, IconCalendar, IconMapPin, IconEdit, IconTrash } from '@/components/icons/AdminIcons';
import { useToast } from '@/components/ui/Toast';

interface Facility {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    operating_hours: any;
    map_image_url: string | null;
    gallery_images: any;
    created_at: string;
}

export default function BranchSetupPage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
    const [form, setForm] = useState({ name: '', address: '', phone: '', map_image_url: '' });

    // T3-8: Image management state
    const [showImageModal, setShowImageModal] = useState(false);
    const [imageTarget, setImageTarget] = useState<Facility | null>(null);
    const [mapUrl, setMapUrl] = useState('');
    const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
    const [newGalleryUrl, setNewGalleryUrl] = useState('');

    // T1-4: Operating hours state
    const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
    const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const defaultHours: Record<string, { open: string; close: string; closed: boolean }> = {};
    DAY_KEYS.forEach((d, i) => { defaultHours[d] = { open: i < 5 ? '06:00' : '09:00', close: i < 5 ? '22:00' : '18:00', closed: false }; });
    const [showHoursModal, setShowHoursModal] = useState(false);
    const [hoursTarget, setHoursTarget] = useState<Facility | null>(null);
    const [hoursForm, setHoursForm] = useState<Record<string, { open: string; close: string; closed: boolean }>>(defaultHours);
    const { success, error: toastError, info } = useToast();

    useEffect(() => { loadFacilities(); }, []);

    async function loadFacilities() {
        const supabase = createClient();
        setLoading(true);
        const { data } = await supabase.from('facilities').select('*').order('name');
        if (data) {
            setFacilities(data as any);
        }
        setLoading(false);
    }

    function openModal(facility?: Facility) {
        if (facility) {
            setEditingFacility(facility);
            setForm({ name: facility.name, address: facility.address || '', phone: facility.phone || '', map_image_url: facility.map_image_url || '' });
        } else {
            setEditingFacility(null);
            setForm({ name: '', address: '', phone: '', map_image_url: '' });
        }
        setShowModal(true);
    }

    async function saveFacility() {
        const supabase = createClient();
        const data = { name: form.name, address: form.address || null, phone: form.phone || null, map_image_url: form.map_image_url || null };
        if (editingFacility) {
            const { error } = await supabase.from('facilities').update(data).eq('id', editingFacility.id);
            if (error) toastError(`지점 정보 수정 실패: ${error.message}`);
            else success('지점 정보가 수정되었습니다.');
        } else {
            const { error } = await supabase.from('facilities').insert(data);
            if (error) toastError(`지점 등록 실패: ${error.message}`);
            else success('새 지점이 등록되었습니다.');
        }
        setShowModal(false);
        loadFacilities();
    }

    async function deleteFacility(id: string) {
        if (!confirm('이 지점을 삭제하시겠습니까? 관련 데이터가 모두 영향을 받을 수 있습니다.')) return;
        const supabase = createClient();
        const { error } = await supabase.from('facilities').delete().eq('id', id);
        if (error) {
            toastError(`지점 삭제 실패: ${error.message}`);
        } else {
            success('지점이 삭제되었습니다.');
            loadFacilities();
        }
    }

    // T1-4: Open operating hours modal
    function openHoursModal(facility: Facility) {
        setHoursTarget(facility);
        if (facility.operating_hours && typeof facility.operating_hours === 'object') {
            const h = facility.operating_hours as Record<string, any>;
            const merged = { ...defaultHours };
            DAY_KEYS.forEach(d => { if (h[d]) merged[d] = { open: h[d].open || '06:00', close: h[d].close || '22:00', closed: !!h[d].closed }; });
            setHoursForm(merged);
        } else {
            setHoursForm({ ...defaultHours });
        }
        setShowHoursModal(true);
    }

    // T1-4: Save operating hours
    async function saveOperatingHours() {
        if (!hoursTarget) return;
        const supabase = createClient();
        const { error } = await (supabase as any).from('facilities').update({ operating_hours: hoursForm }).eq('id', hoursTarget.id);
        if (error) {
            toastError(`운영시간 저장 실패: ${error.message}`);
        } else {
            success('운영시간이 저장되었습니다.');
            setShowHoursModal(false);
            setHoursTarget(null);
            loadFacilities();
        }
    }

    // T3-8: Image management functions
    function openImageModal(facility: Facility) {
        setImageTarget(facility);
        setMapUrl(facility.map_image_url || '');
        setGalleryUrls(facility.gallery_images || []);
        setNewGalleryUrl('');
        setShowImageModal(true);
    }

    function addGalleryImage() {
        if (!newGalleryUrl.trim()) return;
        setGalleryUrls([...galleryUrls, newGalleryUrl.trim()]);
        setNewGalleryUrl('');
    }

    function removeGalleryImage(idx: number) {
        setGalleryUrls(galleryUrls.filter((_, i) => i !== idx));
    }

    async function saveImages() {
        if (!imageTarget) return;
        const supabase = createClient();
        const { error } = await (supabase as any).from('facilities').update({
            map_image_url: mapUrl || null,
            gallery_images: galleryUrls.length > 0 ? galleryUrls : null,
        }).eq('id', imageTarget.id);

        if (error) {
            toastError(`이미지 저장 실패: ${error.message}`);
        } else {
            success('지점 이미지가 업데이트되었습니다.');
            setShowImageModal(false);
            setImageTarget(null);
            loadFacilities();
        }
    }

    // T1-4: Format operating hours summary
    function getHoursSummary(f: Facility): string {
        if (!f.operating_hours || typeof f.operating_hours !== 'object') return '운영시간 미설정';
        const h = f.operating_hours as Record<string, any>;
        const weekday = h['mon'];
        if (!weekday) return '운영시간 미설정';
        if (weekday.closed) return '휴무';
        return `평일 ${weekday.open || '06:00'}~${weekday.close || '22:00'}`;
    }

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Infrastructure"
                title="Branch"
                subtitle="Setup"
                actions={<button onClick={() => openModal()} className="admin-action-btn">+ 지점 추가</button>}
            />

            <div className="p-10 max-w-[1400px] mx-auto">

                {loading ? (
                    <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
                ) : facilities.length === 0 ? (
                    <div className="glass-card p-20 flex flex-col items-center justify-center opacity-40"><span className="text-4xl mb-4"><IconBuilding size={40} /></span><p className="text-[10px] font-black uppercase tracking-[0.4em]">No branches configured</p></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {facilities.map((f) => (
                            <div key={f.id} className="glass-card p-6 rounded-2xl group hover:border-white/10 transition-all relative">
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(f)} className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase bg-white/[0.05] border border-white/5 text-white">수정</button>
                                    <button onClick={() => deleteFacility(f.id)} className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase bg-red-500/10 border border-red-500/20 text-red-400">삭제</button>
                                </div>
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 bg-white/[0.03] border border-white/5"><IconBuilding size={28} /></div>
                                <h3 className="text-lg font-black text-white mb-2 group-hover:text-[var(--primary)] transition-colors">{f.name}</h3>
                                <div className="space-y-2 text-[10px]">
                                    <div className="flex items-center gap-2"><span className="text-[var(--text-muted)]"><IconMapPin size={14} /></span><span className="text-white/60">{f.address || '주소 미설정'}</span></div>
                                    <div className="flex items-center gap-2"><span className="text-[var(--text-muted)]"><IconPhone size={14} /></span><span className="text-white/60">{f.phone || '번호 미설정'}</span></div>
                                    <div className="flex items-center gap-2"><span className="text-[var(--text-muted)]"><IconCalendar size={14} /></span><span className="text-white/60">{getHoursSummary(f)}</span></div>
                                </div>
                                {f.map_image_url && (
                                    <div className="mt-4 rounded-xl overflow-hidden border border-white/5 relative" style={{ height: '80px' }}>
                                        <Image src={f.map_image_url} alt="지도" fill className="object-cover opacity-60 hover:opacity-100 transition-opacity" sizes="(max-width: 768px) 100vw, 33vw" />
                                    </div>
                                )}

                                {f.gallery_images && f.gallery_images.length > 0 && (
                                    <p className="text-[8px] text-[var(--primary)] mt-2">📸 갤러리 이미지 {f.gallery_images.length}개</p>
                                )}

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => openHoursModal(f)}
                                        className="flex-1 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-white/[0.03] border border-white/5 text-white/50 hover:border-[var(--primary)]/30 hover:text-[var(--primary)] transition-all"
                                    >
                                        ⏰ 운영시간
                                    </button>
                                    <button
                                        onClick={() => openImageModal(f)}
                                        className="flex-1 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-white/[0.03] border border-white/5 text-white/50 hover:border-blue-400/30 hover:text-blue-400 transition-all"
                                    >
                                        🖼 이미지 관리
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <AdminModal show={showModal} onClose={() => setShowModal(false)} title={editingFacility ? '지점 수정' : '새 지점 등록'}>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">지점명 *</label>
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">주소</label>
                            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">전화번호</label>
                            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={saveFacility} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>저장</button>
                    </div>
                </AdminModal>

                <AdminModal show={showHoursModal && !!hoursTarget} onClose={() => { setShowHoursModal(false); setHoursTarget(null); }} title="운영 시간 설정" subtitle={hoursTarget?.name || ''}>
                    <div className="space-y-3">
                        {DAY_KEYS.map((d, i) => (
                            <div key={d} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${hoursForm[d]?.closed ? 'bg-red-500/5 border border-red-500/10' : 'bg-white/[0.02] border border-white/[0.03]'}`}>
                                <span className={`w-8 text-center text-xs font-black ${hoursForm[d]?.closed ? 'text-red-400' : 'text-white'}`}>{DAYS[i]}</span>
                                <button
                                    onClick={() => setHoursForm({ ...hoursForm, [d]: { ...hoursForm[d], closed: !hoursForm[d].closed } })}
                                    className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase ${hoursForm[d]?.closed ? 'bg-red-500/20 text-red-400' : 'bg-green-500/10 text-green-400'}`}
                                >
                                    {hoursForm[d]?.closed ? '휴무' : '영업'}
                                </button>
                                {!hoursForm[d]?.closed && (
                                    <>
                                        <input
                                            type="time"
                                            value={hoursForm[d]?.open || '06:00'}
                                            onChange={(e) => setHoursForm({ ...hoursForm, [d]: { ...hoursForm[d], open: e.target.value } })}
                                            className="px-3 py-1.5 rounded-lg text-xs text-white outline-none"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                        />
                                        <span className="text-white/30 text-xs">~</span>
                                        <input
                                            type="time"
                                            value={hoursForm[d]?.close || '22:00'}
                                            onChange={(e) => setHoursForm({ ...hoursForm, [d]: { ...hoursForm[d], close: e.target.value } })}
                                            className="px-3 py-1.5 rounded-lg text-xs text-white outline-none"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                        />
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => { setShowHoursModal(false); setHoursTarget(null); }} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={saveOperatingHours} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>저장</button>
                    </div>
                </AdminModal>

                <AdminModal show={showImageModal && !!imageTarget} onClose={() => { setShowImageModal(false); setImageTarget(null); }} title="이미지 관리" subtitle={imageTarget?.name || ''} size="lg">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">지도 이미지 URL</label>
                            <input
                                value={mapUrl}
                                onChange={(e) => setMapUrl(e.target.value)}
                                placeholder="https://example.com/map-image.jpg"
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none font-mono transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">갤러리 이미지 ({galleryUrls.length}개)</label>
                            <div className="flex gap-2">
                                <input
                                    value={newGalleryUrl}
                                    onChange={(e) => setNewGalleryUrl(e.target.value)}
                                    placeholder="이미지 URL 입력"
                                    className="flex-1 px-4 py-3 rounded-xl text-sm text-white outline-none font-mono transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                />
                                <button
                                    onClick={addGalleryImage}
                                    className="px-4 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                                    style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}
                                >
                                    추가
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => { setShowImageModal(false); setImageTarget(null); }} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={saveImages} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>저장</button>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
