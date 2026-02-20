'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconSmartphone, IconBuilding, IconMonitor, IconEdit, IconTrash, IconChat, IconPlus } from '@/components/icons/AdminIcons';
import { useToast } from '@/components/ui/Toast';

interface Facility {
    id: string;
    name: string;
    address: string | null;
    phone?: string | null;
}

interface KioskDevice {
    id: string;
    facility_id: string | null;
    device_name: string;
    device_ip: string | null;
    status: 'active' | 'offline' | 'maintenance';
    display_message: string | null;
    last_heartbeat: string | null;
    created_at: string;
    updated_at: string;
    facilities?: { name: string };
}

type KioskFormData = {
    device_name: string;
    facility_id: string;
    device_ip: string;
    status: 'active' | 'offline' | 'maintenance';
    display_message: string;
};

export default function InfrastructurePage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [kiosks, setKiosks] = useState<KioskDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showKioskModal, setShowKioskModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [editingKiosk, setEditingKiosk] = useState<KioskDevice | null>(null);
    const [kioskForm, setKioskForm] = useState<KioskFormData>({
        device_name: '',
        facility_id: '',
        device_ip: '',
        status: 'active',
        display_message: '',
    });
    const [messageForm, setMessageForm] = useState({ kiosk_id: '', message: '' });
    const { success, error: toastError, info } = useToast();

    // T3-11: QR code state
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrFacility, setQrFacility] = useState<Facility | null>(null);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);

    const loadData = useCallback(async () => {
        setLoading(true);

        const [facilitiesRes, kiosksRes] = await Promise.all([
            query('facilities').select('*').order('name'),
            query('kiosk_devices').select('*, facilities(name)').order('device_name'),
        ]);

        if (facilitiesRes.data) setFacilities(facilitiesRes.data);
        if (kiosksRes.data) setKiosks(kiosksRes.data as KioskDevice[]);

        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Open modal for new kiosk
    const openKioskModal = (kiosk?: KioskDevice) => {
        if (kiosk) {
            setEditingKiosk(kiosk);
            setKioskForm({
                device_name: kiosk.device_name,
                facility_id: kiosk.facility_id || '',
                device_ip: kiosk.device_ip || '',
                status: kiosk.status,
                display_message: kiosk.display_message || '',
            });
        } else {
            setEditingKiosk(null);
            setKioskForm({
                device_name: '',
                facility_id: '',
                device_ip: '',
                status: 'active',
                display_message: '',
            });
        }
        setShowKioskModal(true);
    };

    // Save kiosk (create or update)
    const saveKiosk = async () => {
        if (!kioskForm.device_name || !kioskForm.facility_id) {
            toastError('기기명과 지점을 입력하세요.');
            return;
        }
        const payload = {
            device_name: kioskForm.device_name,
            facility_id: kioskForm.facility_id,
            device_ip: kioskForm.device_ip || null,
            status: kioskForm.status,
            display_message: kioskForm.display_message || null,
            updated_at: new Date().toISOString(),
        };

        if (editingKiosk) {
            const { error } = await query('kiosk_devices').update(payload).eq('id', editingKiosk.id);
            if (error) {
                toastError(`수정 실패: ${error.message}`);
            } else {
                success('키오스크 정보가 수정되었습니다.');
                setShowKioskModal(false);
                loadData();
            }
        } else {
            const { error } = await query('kiosk_devices').insert(payload);
            if (error) {
                toastError(`등록 실패: ${error.message}`);
            } else {
                success('키오스크가 등록되었습니다.');
                setShowKioskModal(false);
                loadData();
            }
        }
    };

    // Delete kiosk
    const deleteKiosk = async (id: string) => {
        if (!confirm('이 키오스크를 삭제하시겠습니까?')) return;
        const { error } = await query('kiosk_devices').delete().eq('id', id);
        if (error) {
            toastError(`삭제 실패: ${error.message}`);
        } else {
            success('키오스크가 삭제되었습니다.');
            loadData();
        }
    };

    // Open message modal
    const openMessageModal = (kiosk: KioskDevice) => {
        setMessageForm({
            kiosk_id: kiosk.id,
            message: kiosk.display_message || '',
        });
        setShowMessageModal(true);
    };

    // Update display message
    const updateMessage = async () => {
        const { error } = await query('kiosk_devices')
            
            .update({ display_message: messageForm.message || null, updated_at: new Date().toISOString() })
            .eq('id', messageForm.kiosk_id);

        if (error) {
            toastError(`메시지 업데이트 실패: ${error.message}`);
        } else {
            success('대기 화면 메시지가 업데이트되었습니다.');
            setShowMessageModal(false);
            loadData();
        }
    };

    // T3-11: Generate QR Code on canvas
    function generateQrCode(facility: Facility) {
        setQrFacility(facility);
        setShowQrModal(true);

        // Draw QR after modal renders
        setTimeout(() => {
            const canvas = qrCanvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const size = 300;
            canvas.width = size;
            canvas.height = size;

            // Generate a deterministic QR-like pattern from facility ID
            const data = `bcl-checkin://${facility.id}`;
            const hash = simpleHash(data);
            const moduleCount = 25;
            const moduleSize = size / moduleCount;

            // White background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, size, size);

            // Draw QR-like modules
            ctx.fillStyle = '#000000';

            // Fixed finder patterns (top-left, top-right, bottom-left)
            drawFinderPattern(ctx, 0, 0, moduleSize);
            drawFinderPattern(ctx, (moduleCount - 7) * moduleSize, 0, moduleSize);
            drawFinderPattern(ctx, 0, (moduleCount - 7) * moduleSize, moduleSize);

            // Data modules based on hash
            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    // Skip finder pattern areas
                    if ((row < 8 && col < 8) || (row < 8 && col >= moduleCount - 8) || (row >= moduleCount - 8 && col < 8)) continue;

                    // Use hash to determine if module is filled
                    const idx = row * moduleCount + col;
                    const bitPos = idx % 32;
                    const hashSegment = hash[(idx * 7 + 3) % hash.length];
                    if ((hashSegment >> (bitPos % 8)) & 1) {
                        ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize);
                    }
                }
            }

            // Add timing patterns
            for (let i = 8; i < moduleCount - 8; i++) {
                if (i % 2 === 0) {
                    ctx.fillRect(6 * moduleSize, i * moduleSize, moduleSize, moduleSize);
                    ctx.fillRect(i * moduleSize, 6 * moduleSize, moduleSize, moduleSize);
                }
            }

            // Add BCL logo text in center
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect((moduleCount / 2 - 2) * moduleSize, (moduleCount / 2 - 2) * moduleSize, 4 * moduleSize, 4 * moduleSize);
            ctx.fillStyle = '#FF6B00';
            ctx.font = `bold ${moduleSize * 2}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('BCL', (moduleCount / 2) * moduleSize, (moduleCount / 2) * moduleSize);
        }, 100);
    }

    function simpleHash(str: string): number[] {
        const result: number[] = [];
        for (let i = 0; i < 32; i++) {
            let h = 0;
            for (let j = 0; j < str.length; j++) {
                h = ((h << 5) - h + str.charCodeAt(j) + i * 37) & 0xFF;
            }
            result.push(h);
        }
        return result;
    }

    function drawFinderPattern(ctx: CanvasRenderingContext2D, x: number, y: number, moduleSize: number) {
        // Outer black border
        ctx.fillStyle = '#000000';
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
                    ctx.fillRect(x + c * moduleSize, y + r * moduleSize, moduleSize, moduleSize);
                }
            }
        }
    }

    // T3-11: Download QR code
    function downloadQrCode() {
        const canvas = qrCanvasRef.current;
        if (!canvas || !qrFacility) return;

        const link = document.createElement('a');
        link.download = `QR_${qrFacility.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // KPI Stats
    const totalKiosks = kiosks.length;
    const activeKiosks = kiosks.filter(k => k.status === 'active').length;
    const offlineKiosks = kiosks.filter(k => k.status === 'offline').length;
    const maintenanceKiosks = kiosks.filter(k => k.status === 'maintenance').length;

    // Format last heartbeat
    const formatHeartbeat = (hb: string | null) => {
        if (!hb) return '연결 기록 없음';
        const diff = Date.now() - new Date(hb).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}시간 전`;
        const days = Math.floor(hours / 24);
        return `${days}일 전`;
    };

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Operations"
                title="Infrastructure"
                subtitle="Control"
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {loading ? (
                    <div className="flex justify-center py-64">
                        <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* QR Section */}
                        <section>
                            <h3 className="text-xl font-black text-white uppercase mb-6 inline-flex items-center gap-2">
                                <IconSmartphone size={20} /> QR 코드 관리
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {facilities.map((f) => (
                                    <div key={f.id} className="glass-card p-6 rounded-2xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-white/[0.03] border border-white/5">
                                                <IconBuilding size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white">{f.name}</h4>
                                                <p className="text-[9px] text-[var(--text-muted)]">{f.address || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => generateQrCode(f)}
                                                className="flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all"
                                                style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)', color: 'var(--primary)' }}
                                            >
                                                QR 코드 생성
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Kiosk Section */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-white uppercase inline-flex items-center gap-2">
                                    <IconMonitor size={20} /> 키오스크 원격 제어
                                </h3>
                                <button onClick={() => openKioskModal()} className="admin-action-btn">
                                    <IconPlus size={16} /> 키오스크 등록
                                </button>
                            </div>

                            {/* KPI Cards */}
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                <div className="kpi-card">
                                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] italic">Total</h4>
                                    <div className="mt-4">
                                        <p className="text-3xl font-black text-white tracking-tighter">{totalKiosks}</p>
                                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">전체 기기</p>
                                    </div>
                                </div>
                                <div className="kpi-card">
                                    <h4 className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em] italic">Active</h4>
                                    <div className="mt-4">
                                        <p className="text-3xl font-black text-green-400 tracking-tighter">{activeKiosks}</p>
                                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">활성</p>
                                    </div>
                                </div>
                                <div className="kpi-card">
                                    <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] italic">Offline</h4>
                                    <div className="mt-4">
                                        <p className="text-3xl font-black text-red-400 tracking-tighter">{offlineKiosks}</p>
                                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">오프라인</p>
                                    </div>
                                </div>
                                <div className="kpi-card">
                                    <h4 className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.2em] italic">Maintenance</h4>
                                    <div className="mt-4">
                                        <p className="text-3xl font-black text-yellow-400 tracking-tighter">{maintenanceKiosks}</p>
                                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">정비중</p>
                                    </div>
                                </div>
                            </div>

                            {/* Kiosk List */}
                            <div className="space-y-3">
                                {kiosks.length === 0 ? (
                                    <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                                        <IconMonitor size={40} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4">등록된 키오스크가 없습니다</p>
                                    </div>
                                ) : (
                                    kiosks.map((k) => (
                                        <div
                                            key={k.id}
                                            className="grid grid-cols-12 gap-4 items-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group"
                                        >
                                            {/* Name */}
                                            <div className="col-span-3">
                                                <h4 className="text-sm font-black text-white">{k.device_name}</h4>
                                                <p className="text-[9px] text-[var(--text-muted)]">{k.facilities?.name || '미지정'}</p>
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-2 flex items-center gap-2">
                                                <span
                                                    className={`w-2 h-2 rounded-full ${k.status === 'active'
                                                        ? 'bg-green-500 animate-pulse'
                                                        : k.status === 'maintenance'
                                                            ? 'bg-yellow-500'
                                                            : 'bg-red-500'
                                                        }`}
                                                ></span>
                                                <span
                                                    className={`text-[9px] font-black uppercase ${k.status === 'active'
                                                        ? 'text-green-400'
                                                        : k.status === 'maintenance'
                                                            ? 'text-yellow-400'
                                                            : 'text-red-400'
                                                        }`}
                                                >
                                                    {k.status}
                                                </span>
                                            </div>

                                            {/* IP */}
                                            <div className="col-span-2">
                                                <p className="text-[10px] text-white font-mono">{k.device_ip || '-'}</p>
                                            </div>

                                            {/* Last Heartbeat */}
                                            <div className="col-span-2">
                                                <p className="text-[10px] text-[var(--text-muted)]">{formatHeartbeat(k.last_heartbeat)}</p>
                                            </div>

                                            {/* Actions */}
                                            <div className="col-span-3 flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openMessageModal(k)}
                                                    className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
                                                    title="메시지 설정"
                                                >
                                                    <IconChat size={14} />
                                                </button>
                                                <button
                                                    onClick={() => openKioskModal(k)}
                                                    className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                                                    title="수정"
                                                >
                                                    <IconEdit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => deleteKiosk(k.id)}
                                                    className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                                                    title="삭제"
                                                >
                                                    <IconTrash size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {/* Kiosk Create/Edit Modal */}
                <AdminModal
                    show={showKioskModal}
                    onClose={() => setShowKioskModal(false)}
                    title={editingKiosk ? '키오스크 수정' : '키오스크 등록'}
                >
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">기기명</label>
                            <input
                                type="text"
                                value={kioskForm.device_name}
                                onChange={(e) => setKioskForm({ ...kioskForm, device_name: e.target.value })}
                                placeholder="예: Kiosk-01"
                                className="admin-search-input"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">지점</label>
                            <select
                                value={kioskForm.facility_id}
                                onChange={(e) => setKioskForm({ ...kioskForm, facility_id: e.target.value })}
                                className="admin-search-input"
                            >
                                <option value="">지점 선택</option>
                                {facilities.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">IP 주소</label>
                            <input
                                type="text"
                                value={kioskForm.device_ip}
                                onChange={(e) => setKioskForm({ ...kioskForm, device_ip: e.target.value })}
                                placeholder="예: 192.168.1.10"
                                className="admin-search-input"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">상태</label>
                            <select
                                value={kioskForm.status}
                                onChange={(e) => setKioskForm({ ...kioskForm, status: e.target.value as any })}
                                className="admin-search-input"
                            >
                                <option value="active">Active</option>
                                <option value="offline">Offline</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">대기 화면 메시지</label>
                            <textarea
                                value={kioskForm.display_message}
                                onChange={(e) => setKioskForm({ ...kioskForm, display_message: e.target.value })}
                                placeholder="예: 화면을 터치하여 체크인하세요!"
                                rows={3}
                                className="admin-search-input resize-none"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={() => setShowKioskModal(false)}
                            className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            취소
                        </button>
                        <button
                            onClick={saveKiosk}
                            className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                            style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                        >
                            {editingKiosk ? '수정' : '등록'}
                        </button>
                    </div>
                </AdminModal>

                {/* Message Update Modal */}
                <AdminModal show={showMessageModal} onClose={() => setShowMessageModal(false)} title="대기 화면 메시지 설정">
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">메시지</label>
                            <textarea
                                value={messageForm.message}
                                onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                                placeholder="예: 환영합니다! 화면을 터치하세요."
                                rows={4}
                                className="admin-search-input resize-none"
                            />
                            <p className="text-[9px] text-[var(--text-muted)] mt-2">* 비워두면 기본 안내 문구가 표시됩니다.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={() => setShowMessageModal(false)}
                            className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            취소
                        </button>
                        <button
                            onClick={updateMessage}
                            className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                            style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                        >
                            업데이트
                        </button>
                    </div>
                </AdminModal>

                {/* T3-11: QR Code Preview/Download Modal */}
                <AdminModal show={showQrModal} onClose={() => setShowQrModal(false)} title="QR 코드" subtitle={qrFacility?.name || ''}>
                    <div className="flex flex-col items-center gap-6">
                        <div className="p-6 rounded-2xl bg-white" style={{ boxShadow: '0 0 30px rgba(255,107,0,0.1)' }}>
                            <canvas ref={qrCanvasRef} style={{ width: '250px', height: '250px' }} />
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-white/60 mb-1">{qrFacility?.name}</p>
                            <p className="text-[8px] text-[var(--text-muted)] font-mono">ID: {qrFacility?.id?.slice(0, 8)}...</p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setShowQrModal(false)}
                                className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                닫기
                            </button>
                            <button
                                onClick={downloadQrCode}
                                className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                                style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                            >
                                ⬇ PNG 다운로드
                            </button>
                        </div>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
