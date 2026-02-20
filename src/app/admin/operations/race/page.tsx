'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconFlag, IconRadio, IconTrophy, IconRowing } from '@/components/icons/AdminIcons';
import { useToast } from '@/components/ui/Toast';

interface RaceEvent {
    id: string;
    name: string;
    event_date: string;
    event_type: string;
    distance_meters: number | null;
    duration_minutes: number | null;
    description: string | null;
    status: string;
    created_at: string;
    participantCount?: number;
}

interface PM5Device {
    id: string;
    serial_number: string;
    device_type: string;
    status: string;
    firmware_version: string | null;
    last_sync_at: string | null;
    facilities?: { name: string } | null;
}

interface RaceRecord {
    id: string;
    result_time: string | null;
    result_distance: number | null;
    calories_burned: number | null;
    avg_watts: number | null;
    is_pr: boolean;
    created_at: string;
    members?: { name: string } | null;
    race_events?: { name: string; event_type: string } | null;
}

export default function RacePage() {
    const [activeTab, setActiveTab] = useState<'events' | 'devices' | 'records'>('events');
    const [events, setEvents] = useState<RaceEvent[]>([]);
    const [devices, setDevices] = useState<PM5Device[]>([]);
    const [records, setRecords] = useState<RaceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEventModal, setShowEventModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [eventForm, setEventForm] = useState({ name: '', date: '', sport: 'rowing', distance: '', duration: '', description: '' });

    // T3-4: Device CRUD state
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState<PM5Device | null>(null);
    const [deviceForm, setDeviceForm] = useState({ serial_number: '', device_type: 'rower', status: 'online', facility_id: '', firmware_version: '' });
    const [facilities, setFacilities] = useState<any[]>([]);
    const { success, error: toastError, info } = useToast();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load events
            const { data: eventsData } = await query('race_events')

                .select('*')
                .order('event_date', { ascending: false });

            if (eventsData) {
                // Count participants per event
                const { data: recordCounts } = await query('race_records')

                    .select('event_id');
                const counts: Record<string, number> = {};
                (recordCounts || []).forEach((r: any) => {
                    counts[r.event_id] = (counts[r.event_id] || 0) + 1;
                });
                setEvents(eventsData.map((e: any) => ({ ...e, participantCount: counts[e.id] || 0 })));
            }

            loadDevices();

            // Load records with member names
            const { data: recordsData, error: recErr } = await query('race_records')

                .select('*, members(name), race_events(name, event_type)')
                .order('result_time', { ascending: true })
                .limit(20);

            if (recErr) {
                const { data: fallbackRecords } = await query('race_records').select('*').order('created_at', { ascending: false }).limit(20);
                if (fallbackRecords) setRecords(fallbackRecords as any);
            } else if (recordsData) {
                setRecords(recordsData as any);
            }

            // Load facilities for device mapping
            const { data: facData } = await query('facilities').select('id, name').order('name');
            if (facData) setFacilities(facData);
        } catch (e) {
            console.error('Error loading race data:', e);
        }
        setLoading(false);
    }, []);

    const loadDevices = async () => {
        const { data: devicesData, error: devErr } = await query('pm5_devices')

            .select('*, facilities(name)')
            .order('serial_number');

        if (devErr) {
            const { data: fallbackDevices } = await query('pm5_devices').select('*').order('serial_number');
            if (fallbackDevices) setDevices(fallbackDevices as any);
        } else if (devicesData) {
            setDevices(devicesData as any);
        }
    };

    useEffect(() => { loadData(); }, [loadData]);

    async function createEvent() {
        if (!eventForm.name.trim() || !eventForm.date) return;
        setSaving(true);
        const { error } = await query('race_events').insert({
            name: eventForm.name,
            event_date: eventForm.date,
            event_type: eventForm.sport,
            distance_meters: eventForm.distance ? parseInt(eventForm.distance) : null,
            duration_minutes: eventForm.duration ? parseInt(eventForm.duration) : null,
            description: eventForm.description || null,
            status: 'scheduled',
        });
        setSaving(false);
        if (!error) {
            setShowEventModal(false);
            setEventForm({ name: '', date: '', sport: 'rowing', distance: '', duration: '', description: '' });
            success('새 레이스 이벤트가 등록되었습니다.');
            loadData();
        } else {
            toastError(`등록 실패: ${error.message}`);
        }
    }

    // T3-4: Device CRUD functions
    function openDeviceModal(device?: PM5Device) {
        if (device) {
            setEditingDevice(device);
            setDeviceForm({
                serial_number: device.serial_number,
                device_type: device.device_type,
                status: device.status,
                facility_id: (device as any).facility_id || '',
                firmware_version: device.firmware_version || '',
            });
        } else {
            setEditingDevice(null);
            setDeviceForm({ serial_number: '', device_type: 'rower', status: 'online', facility_id: '', firmware_version: '' });
        }
        setShowDeviceModal(true);
    }

    async function saveDevice() {
        if (!deviceForm.serial_number.trim()) return;
        setSaving(true);
        const payload = {
            serial_number: deviceForm.serial_number,
            device_type: deviceForm.device_type,
            status: deviceForm.status,
            facility_id: deviceForm.facility_id || null,
            firmware_version: deviceForm.firmware_version || null,
            updated_at: new Date().toISOString(),
        };

        if (editingDevice) {
            const { error } = await query('pm5_devices').update(payload).eq('id', editingDevice.id);
            if (error) toastError(`수정 실패: ${error.message}`);
            else success('기기 정보가 수정되었습니다.');
        } else {
            const { error } = await query('pm5_devices').insert(payload);
            if (error) toastError(`등록 실패: ${error.message}`);
            else success('새 기기가 등록되었습니다.');
        }
        setSaving(false);
        setShowDeviceModal(false);
        loadData();
    }

    async function deleteDevice(id: string) {
        if (!confirm('이 기기를 삭제하시겠습니까? 관련 데이터가 소실될 수 있습니다.')) return;
        const { error } = await query('pm5_devices').delete().eq('id', id);
        if (error) {
            toastError(`삭제 실패: ${error.message}`);
        } else {
            success('기기가 삭제되었습니다.');
            loadData();
        }
    }

    // T3-4: Rapid status toggle for monitoring simulation
    async function toggleDeviceStatus(device: PM5Device) {
        const nextStatus = device.status === 'online' ? 'offline' : device.status === 'offline' ? 'maintenance' : 'online';
        const { error } = await query('pm5_devices').update({ status: nextStatus, last_sync_at: new Date().toISOString() }).eq('id', device.id);
        if (error) {
            toastError(`상태 변경 실패: ${error.message}`);
        } else {
            success(`기기 상태가 ${nextStatus}로 변경되었습니다.`);
            loadData();
        }
    }

    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
        scheduled: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: '예정' },
        in_progress: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: 'LIVE' },
        completed: { color: '#22C55E', bg: 'rgba(34,197,94,0.15)', label: '완료' },
        cancelled: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', label: '취소' },
    };

    const deviceTypeLabel: Record<string, string> = { rower: 'Rower', bike: 'BikeErg', skierg: 'SkiErg' };
    const eventTypeLabel: Record<string, string> = { rowing: 'Rowing', bike: 'BikeErg', skierg: 'SkiErg', run: 'Run', other: 'Other' };

    function formatDistance(meters: number | null): string {
        if (!meters) return '-';
        return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`;
    }

    function formatTime(interval: string | null): string {
        if (!interval) return '-';
        // interval format like "00:21:30" or "00:30:00"
        const parts = interval.split(':');
        if (parts.length === 3) {
            const h = parseInt(parts[0] || '0');
            const m = parseInt(parts[1] || '0');
            const s = parseInt(parts[2] || '0');
            if (h > 0) return `${h}h ${m}m ${s}s`;
            return `${m}:${s.toString().padStart(2, '0')}`;
        }
        return interval;
    }

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Operations"
                title="Race"
                subtitle="Management"
                actions={
                    <div className="flex gap-2">
                        {activeTab === 'devices' && <button onClick={() => openDeviceModal()} className="admin-filter-btn" style={{ background: 'rgba(255,107,0,0.1)', color: 'var(--primary)', border: '1px solid rgba(255,107,0,0.2)' }}>+ 기기 등록</button>}
                        <button onClick={() => setShowEventModal(true)} className="admin-action-btn">+ 이벤트 생성</button>
                    </div>
                }
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {/* Stats */}
                <div className="grid grid-cols-12 gap-6 mb-10">
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Events</h4>
                        <p className="text-4xl font-black text-white mt-4">{events.length}</p>
                    </div>
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Devices</h4>
                        <div className="mt-4 flex items-end gap-2">
                            <p className="text-4xl font-black text-green-400">{devices.filter(d => d.status === 'online').length}</p>
                            <p className="text-xs text-[var(--text-muted)] mb-1">/ {devices.length} online</p>
                        </div>
                    </div>
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Records</h4>
                        <p className="text-4xl font-black text-[var(--primary)] mt-4">{records.length}</p>
                    </div>
                    <div className="col-span-3 kpi-card">
                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">PRs</h4>
                        <p className="text-4xl font-black text-yellow-400 mt-4">{records.filter(r => r.is_pr).length}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-10">
                    {(['events', 'devices', 'records'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            style={activeTab === tab
                                ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 0 15px rgba(255,107,0,0.3)' }
                                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }
                            }
                        >
                            {tab === 'events' ? <span className="inline-flex items-center gap-1"><IconFlag size={14} /> 이벤트</span> : tab === 'devices' ? <span className="inline-flex items-center gap-1"><IconRadio size={14} /> 기기 관리</span> : <span className="inline-flex items-center gap-1"><IconTrophy size={14} /> 기록</span>}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="glass-card p-6 rounded-2xl animate-pulse">
                                <div className="h-5 bg-white/5 rounded w-1/3 mb-3" />
                                <div className="h-3 bg-white/5 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Events Tab */}
                        {activeTab === 'events' && (
                            events.length === 0 ? (
                                <div className="glass-card p-16 rounded-2xl text-center">
                                    <p className="text-4xl mb-4">🏁</p>
                                    <p className="text-white/40 text-sm">등록된 이벤트가 없습니다</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {events.map((event) => {
                                        const sc = statusConfig[event.status] || statusConfig.scheduled;
                                        return (
                                            <div key={event.id} className="grid grid-cols-12 gap-6 items-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                                <div className="col-span-1">
                                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-white/[0.03] border border-white/5">
                                                        <IconRowing size={20} />
                                                    </div>
                                                </div>
                                                <div className="col-span-4">
                                                    <h4 className="text-sm font-black text-white group-hover:text-[var(--primary)] transition-colors uppercase">{event.name}</h4>
                                                    <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mt-1">{event.event_date} · {eventTypeLabel[event.event_type] || event.event_type}</p>
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <p className="text-lg font-black text-white">{event.distance_meters ? formatDistance(event.distance_meters) : event.duration_minutes ? `${event.duration_minutes}분` : '-'}</p>
                                                    <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest">{event.distance_meters ? 'Distance' : 'Duration'}</p>
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <p className="text-lg font-black text-white">{event.participantCount}</p>
                                                    <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest">Participants</p>
                                                </div>
                                                <div className="col-span-1">
                                                    <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                                                </div>
                                                <div className="col-span-2 text-right">
                                                    {event.description && (
                                                        <p className="text-[8px] text-white/30 truncate" title={event.description}>{event.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {/* Devices Tab */}
                        {activeTab === 'devices' && (
                            devices.length === 0 ? (
                                <div className="glass-card p-16 rounded-2xl text-center">
                                    <p className="text-4xl mb-4">📡</p>
                                    <p className="text-white/40 text-sm">등록된 기기가 없습니다</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {devices.map((device) => {
                                        const statusColor = device.status === 'online' ? 'green' : device.status === 'maintenance' ? 'yellow' : 'red';
                                        const branchName = (device.facilities as any)?.name || '-';
                                        const syncTime = device.last_sync_at ? new Date(device.last_sync_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

                                        return (
                                            <div key={device.id} className="glass-card p-6 rounded-2xl group flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className="text-xl text-white/40"><IconRowing size={20} /></span>
                                                        <div className="flex flex-col items-end cursor-pointer group/status" onClick={() => toggleDeviceStatus(device)} title="클릭하여 상태 변경">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full bg-${statusColor}-500 ${device.status === 'online' ? 'animate-pulse' : ''}`}></span>
                                                                <span className={`text-[8px] font-black uppercase tracking-widest text-${statusColor}-400 group-hover/status:underline`}>{device.status}</span>
                                                            </div>
                                                            {device.status === 'online' && (
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <span className="text-[6px] font-black text-blue-400 uppercase tracking-tighter bg-blue-400/10 px-1 rounded">Simulating</span>
                                                                    <span className="text-[6px] text-white/30 font-mono">8001</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <h4 className="text-sm font-black text-white mb-1">{device.serial_number}</h4>
                                                    <p className="text-[9px] text-[var(--text-muted)] mb-1 uppercase tracking-widest">{branchName}</p>
                                                    <p className="text-[10px] text-[var(--primary)] font-black uppercase tracking-tighter">{deviceTypeLabel[device.device_type] || device.device_type}</p>
                                                    <div className="space-y-2 pt-3 mt-3 border-t border-white/[0.03]">
                                                        <div className="flex justify-between text-[9px]">
                                                            <span className="text-[var(--text-muted)]">Firmware</span>
                                                            <span className="text-white font-bold">v{device.firmware_version || '-'}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[9px]">
                                                            <span className="text-[var(--text-muted)]">Last Sync</span>
                                                            <span className="text-white font-bold">{syncTime}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 mt-5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openDeviceModal(device)} className="flex-1 py-2 rounded-lg text-[8px] font-black uppercase bg-white/[0.05] border border-white/5 text-white/50 hover:text-white hover:border-white/20 transition-all">수정</button>
                                                    <button onClick={() => deleteDevice(device.id)} className="px-3 py-2 rounded-lg text-[8px] font-black uppercase bg-red-500/10 border border-red-500/20 text-red-500/50 hover:text-red-500 hover:bg-red-500/20 transition-all">삭제</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {/* Records Tab */}
                        {activeTab === 'records' && (
                            records.length === 0 ? (
                                <div className="glass-card p-16 rounded-2xl text-center">
                                    <p className="text-4xl mb-4">🏆</p>
                                    <p className="text-white/40 text-sm">기록이 없습니다</p>
                                </div>
                            ) : (
                                <div className="glass-card rounded-2xl overflow-hidden">
                                    <div className="p-6 border-b border-white/[0.03]">
                                        <h3 className="text-lg font-black text-white uppercase tracking-tight inline-flex items-center gap-2"><IconTrophy size={18} /> Leaderboard</h3>
                                    </div>
                                    <table className="w-full">
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">#</th>
                                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Name</th>
                                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Event</th>
                                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Time</th>
                                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Distance</th>
                                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Watts</th>
                                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Cal</th>
                                                <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">PR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {records.map((record, idx) => {
                                                const memberName = (record.members as any)?.name || '-';
                                                const eventName = (record.race_events as any)?.name || '-';
                                                const rank = idx + 1;
                                                return (
                                                    <tr key={record.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                        <td className="p-4">
                                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${rank <= 3 ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} style={rank <= 3 ? { background: 'rgba(255,107,0,0.1)' } : {}}>
                                                                {rank <= 3 ? <span className={`font-black text-sm ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : 'text-amber-600'}`}>#{rank}</span> : `#${rank}`}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-sm font-bold text-white">{memberName}</td>
                                                        <td className="p-4 text-[10px] text-white/60">{eventName}</td>
                                                        <td className="p-4 text-sm font-black text-[var(--primary)]">{formatTime(record.result_time)}</td>
                                                        <td className="p-4 text-xs text-[var(--text-muted)]">{record.result_distance ? `${record.result_distance}m` : '-'}</td>
                                                        <td className="p-4 text-xs text-white/60">{record.avg_watts || '-'}W</td>
                                                        <td className="p-4 text-xs text-white/60">{record.calories_burned || '-'}</td>
                                                        <td className="p-4">
                                                            {record.is_pr && <span className="text-yellow-400 text-sm">⭐</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                    </>
                )}
            </div>

            {/* Create Event Modal */}
            <AdminModal
                isOpen={showEventModal}
                onClose={() => setShowEventModal(false)}
                title="새 Race 이벤트"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowEventModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/50 bg-white/[0.03] border border-white/5">취소</button>
                        <button onClick={createEvent} disabled={saving || !eventForm.name.trim()} className="admin-action-btn disabled:opacity-50">
                            {saving ? '생성 중...' : '이벤트 생성'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">이벤트명 *</label>
                        <input value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} placeholder="2026 Spring Rowing Challenge" className="w-full admin-search-input" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">날짜 *</label>
                            <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="w-full admin-search-input" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">종목</label>
                            <select value={eventForm.sport} onChange={(e) => setEventForm({ ...eventForm, sport: e.target.value })} className="w-full admin-search-input">
                                <option value="rowing">Rowing</option>
                                <option value="skierg">SkiErg</option>
                                <option value="bike">Bike</option>
                                <option value="run">Run</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">거리 (m)</label>
                            <input value={eventForm.distance} onChange={(e) => setEventForm({ ...eventForm, distance: e.target.value })} placeholder="2000" type="number" className="w-full admin-search-input" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">제한 시간 (분)</label>
                            <input value={eventForm.duration} onChange={(e) => setEventForm({ ...eventForm, duration: e.target.value })} placeholder="30" type="number" className="w-full admin-search-input" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">설명</label>
                        <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="이벤트 설명..." rows={3} className="w-full admin-search-input resize-none" />
                    </div>
                </div>
            </AdminModal>

            {/* PM5 Device Modal */}
            <AdminModal
                show={showDeviceModal}
                onClose={() => setShowDeviceModal(false)}
                title={editingDevice ? 'PM5 기기 수정' : '새 PM5 기기 등록'}
                size="md"
            >
                <div className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">시리얼 번호 *</label>
                        <input value={deviceForm.serial_number} onChange={(e) => setDeviceForm({ ...deviceForm, serial_number: e.target.value })} placeholder="PM5-XXXXXXXX" className="w-full admin-search-input" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">기기 종목</label>
                            <select value={deviceForm.device_type} onChange={(e) => setDeviceForm({ ...deviceForm, device_type: e.target.value })} className="w-full admin-search-input">
                                <option value="rower">Rower</option>
                                <option value="bike">BikeErg</option>
                                <option value="skierg">SkiErg</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">지점 연결</label>
                            <select value={deviceForm.facility_id} onChange={(e) => setDeviceForm({ ...deviceForm, facility_id: e.target.value })} className="w-full admin-search-input">
                                <option value="">미지정</option>
                                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">초기 상태</label>
                            <select value={deviceForm.status} onChange={(e) => setDeviceForm({ ...deviceForm, status: e.target.value })} className="w-full admin-search-input">
                                <option value="online">Online</option>
                                <option value="offline">Offline</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">펌웨어 버전</label>
                            <input value={deviceForm.firmware_version} onChange={(e) => setDeviceForm({ ...deviceForm, firmware_version: e.target.value })} placeholder="v31.02" className="w-full admin-search-input" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => setShowDeviceModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                    <button onClick={saveDevice} disabled={saving || !deviceForm.serial_number.trim()} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-50" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>{saving ? '저장 중...' : '기기 저장'}</button>
                </div>
            </AdminModal>
        </div>
    );
}
