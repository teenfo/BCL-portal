'use client';

import { useState } from 'react';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconFlag, IconRadio, IconTrophy, IconRowing } from '@/components/icons/AdminIcons';

interface RaceEvent {
    id: string;
    name: string;
    date: string;
    sport: string;
    distance: string;
    status: 'upcoming' | 'live' | 'completed';
    participants: number;
}

interface PM5Device {
    id: string;
    serial: string;
    branch: string;
    type: string;
    status: 'online' | 'offline';
    firmware: string;
    lastSync: string;
}

export default function RacePage() {
    const [activeTab, setActiveTab] = useState<'events' | 'devices' | 'records'>('events');
    const [showEventModal, setShowEventModal] = useState(false);
    const [eventForm, setEventForm] = useState({ name: '', date: '', sport: 'Rowing', distance: '' });

    // Mock data for initial UI - will be connected to DB later
    const [events] = useState<RaceEvent[]>([
        { id: '1', name: '2026 Winter Rowing Challenge', date: '2026-03-01', sport: 'Rowing', distance: '2000m', status: 'upcoming', participants: 24 },
        { id: '2', name: 'February SkiErg Sprint', date: '2026-02-15', sport: 'SkiErg', distance: '1000m', status: 'completed', participants: 18 },
        { id: '3', name: 'Bike Marathon Series', date: '2026-02-20', sport: 'Bike', distance: '10000m', status: 'completed', participants: 12 },
    ]);

    const [devices] = useState<PM5Device[]>([
        { id: '1', serial: 'PM5-ROW-001', branch: 'Main Center', type: 'Rowing', status: 'online', firmware: 'v7.20', lastSync: '2026-02-17 13:00' },
        { id: '2', serial: 'PM5-ROW-002', branch: 'Main Center', type: 'Rowing', status: 'online', firmware: 'v7.20', lastSync: '2026-02-17 12:45' },
        { id: '3', serial: 'PM5-SKI-001', branch: 'Gangnam Branch', type: 'SkiErg', status: 'offline', firmware: 'v7.18', lastSync: '2026-02-16 18:00' },
        { id: '4', serial: 'PM5-BIK-001', branch: 'Main Center', type: 'BikeErg', status: 'online', firmware: 'v7.20', lastSync: '2026-02-17 13:10' },
    ]);

    const records = [
        { rank: 1, name: 'Kim Min-Seok', time: '6:22.4', distance: '2000m', sport: 'Rowing', date: '2026-01-15' },
        { rank: 2, name: 'Lee Jung-Hoon', time: '6:35.1', distance: '2000m', sport: 'Rowing', date: '2026-02-01' },
        { rank: 3, name: 'Park Ji-Young', time: '6:41.8', distance: '2000m', sport: 'Rowing', date: '2026-01-20' },
        { rank: 4, name: 'Choi Sung-Min', time: '6:48.2', distance: '2000m', sport: 'Rowing', date: '2026-02-10' },
        { rank: 5, name: 'Yoon Ha-Na', time: '7:02.5', distance: '2000m', sport: 'Rowing', date: '2026-01-28' },
    ];

    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
        upcoming: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: '예정' },
        live: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: 'LIVE' },
        completed: { color: '#22C55E', bg: 'rgba(34,197,94,0.15)', label: '완료' },
    };

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Operations"
                title="Race"
                subtitle="Management"
                actions={<button onClick={() => setShowEventModal(true)} className="admin-action-btn">+ 이벤트 생성</button>}
            />

            <div className="p-10 max-w-[1400px] mx-auto">
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
                            {tab === 'events' ? <span className="inline-flex items-center gap-1"><IconFlag size={14} /> 이벤트</span> : tab === 'devices' ? <span className="inline-flex items-center gap-1"><IconRadio size={14} /> 기기 관리</span> : <span className="inline-flex items-center gap-1"><IconTrophy size={14} /> 기록 통계</span>}
                        </button>
                    ))}
                </div>

                {/* Events Tab */}
                {activeTab === 'events' && (
                    <div className="space-y-4">
                        {events.map((event) => {
                            const sc = statusConfig[event.status];
                            return (
                                <div key={event.id} className="grid grid-cols-12 gap-6 items-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                    <div className="col-span-1">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-white/[0.03] border border-white/5">
                                            {event.sport === 'Rowing' ? <IconRowing size={20} /> : event.sport === 'SkiErg' ? 'SKI' : 'BIKE'}
                                        </div>
                                    </div>
                                    <div className="col-span-4">
                                        <h4 className="text-sm font-black text-white group-hover:text-[var(--primary)] transition-colors uppercase">{event.name}</h4>
                                        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mt-1">{event.date} · {event.sport}</p>
                                    </div>
                                    <div className="col-span-2 text-center">
                                        <p className="text-lg font-black text-white">{event.distance}</p>
                                        <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest">Distance</p>
                                    </div>
                                    <div className="col-span-2 text-center">
                                        <p className="text-lg font-black text-white">{event.participants}</p>
                                        <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest">Participants</p>
                                    </div>
                                    <div className="col-span-1">
                                        <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <button className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-[9px] font-black text-white hover:border-[var(--primary)]/50 transition-all uppercase tracking-widest">
                                            상세 보기
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Devices Tab */}
                {activeTab === 'devices' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {devices.map((device) => (
                            <div key={device.id} className="glass-card p-6 rounded-2xl group">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xl">{device.type === 'Rowing' ? <IconRowing size={20} /> : device.type === 'SkiErg' ? 'SKI' : 'BIKE'}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${device.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>{device.status}</span>
                                    </div>
                                </div>
                                <h4 className="text-sm font-black text-white mb-1">{device.serial}</h4>
                                <p className="text-[9px] text-[var(--text-muted)] mb-3">{device.branch}</p>
                                <div className="space-y-2 pt-3 border-t border-white/[0.03]">
                                    <div className="flex justify-between text-[9px]">
                                        <span className="text-[var(--text-muted)]">Firmware</span>
                                        <span className="text-white font-bold">{device.firmware}</span>
                                    </div>
                                    <div className="flex justify-between text-[9px]">
                                        <span className="text-[var(--text-muted)]">Last Sync</span>
                                        <span className="text-white font-bold">{device.lastSync}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Records Tab */}
                {activeTab === 'records' && (
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/[0.03]">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight inline-flex items-center gap-2"><IconTrophy size={18} /> Leaderboard — 2000m Rowing</h3>
                        </div>
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Rank</th>
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Name</th>
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Time</th>
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Distance</th>
                                    <th className="text-left p-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr key={record.rank} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td className="p-4">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${record.rank <= 3 ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} style={record.rank <= 3 ? { background: 'rgba(255,107,0,0.1)' } : {}}>
                                                {record.rank <= 3 ? <span className={`font-black text-sm ${record.rank === 1 ? 'text-yellow-400' : record.rank === 2 ? 'text-gray-300' : 'text-amber-600'}`}>#{record.rank}</span> : `#${record.rank}`}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-white">{record.name}</td>
                                        <td className="p-4 text-sm font-black text-[var(--primary)]">{record.time}</td>
                                        <td className="p-4 text-xs text-[var(--text-muted)]">{record.distance}</td>
                                        <td className="p-4 text-xs text-[var(--text-muted)]">{record.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Create Event Modal */}
                <AdminModal show={showEventModal} onClose={() => setShowEventModal(false)} title="새 Race 이벤트">
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">이벤트명</label>
                            <input value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} placeholder="2026 Spring Rowing Challenge" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">날짜</label>
                                <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">종목</label>
                                <select value={eventForm.sport} onChange={(e) => setEventForm({ ...eventForm, sport: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <option value="Rowing">Rowing</option>
                                    <option value="SkiErg">SkiErg</option>
                                    <option value="Bike">Bike</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">거리 (m)</label>
                            <input value={eventForm.distance} onChange={(e) => setEventForm({ ...eventForm, distance: e.target.value })} placeholder="2000" className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setShowEventModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>취소</button>
                        <button onClick={() => setShowEventModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all" style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>생성</button>
                    </div>
                </AdminModal>
            </div>
        </div>
    );
}
