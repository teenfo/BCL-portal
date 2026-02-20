'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';

interface RaceEvent {
    id: string;
    name: string;
    event_date: string;
    event_type: string;
    distance_meters: number;
    status: string;
    created_at: string;
}

interface RaceRecord {
    id: string;
    event_id: string;
    member_id: string;
    result_time: number | null;
    result_distance: number | null;
    is_pr: boolean;
    members?: { name: string };
}

export default function CoachRacePage() {
    const [events, setEvents] = useState<RaceEvent[]>([]);
    const [records, setRecords] = useState<RaceRecord[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<RaceEvent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRaceData();
    }, []);

    async function loadRaceData() {

        try {
            const { data: eventData } = await query('race_events')
                
                .select('*')
                .order('event_date', { ascending: false })
                .limit(20);

            if (eventData) setEvents(eventData);
        } catch (error) {
            console.error('Race events load error:', error);
        }
        setLoading(false);
    }

    async function loadRecords(eventId: string) {

        try {
            const { data } = await query('race_records')
                
                .select('*, members!race_records_member_id_fkey(name)')
                .eq('event_id', eventId)
                .order('result_time', { ascending: true });

            if (data) setRecords(data);
        } catch (error) {
            console.error('Race records load error:', error);
        }
    }

    function handleSelectEvent(event: RaceEvent) {
        setSelectedEvent(event);
        loadRecords(event.id);
    }

    function formatTime(seconds: number | null) {
        if (!seconds) return '-';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
    }

    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
        upcoming: { label: '예정', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
        active: { label: '진행중', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
        completed: { label: '완료', color: 'var(--app-text-muted)', bg: 'var(--app-bg)' },
    };

    if (loading) {
        return (
            <div className="app-page">
                <div className="app-skeleton" style={{ width: '50%', height: 28, marginBottom: 24 }} />
                {[1, 2, 3].map(i => (
                    <div key={i} className="app-skeleton" style={{ height: 90, borderRadius: 16, marginBottom: 12 }} />
                ))}
            </div>
        );
    }

    return (
        <div className="app-page">
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', letterSpacing: '-0.01em' }}>
                    Race 관리
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginTop: 4 }}>
                    레이스 이벤트 및 기록 관리
                </p>
            </div>

            {/* Event List */}
            {!selectedEvent ? (
                <>
                    {events.length === 0 ? (
                        <div className="app-glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.25 }}>🏁</div>
                            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>
                                등록된 레이스 이벤트가 없습니다
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {events.map(event => {
                                const sc = statusConfig[event.status] || statusConfig.upcoming;
                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => handleSelectEvent(event)}
                                        className="app-glass-card"
                                        style={{ padding: '1.25rem', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                                                {event.name}
                                            </h4>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: 'var(--app-radius-sm)',
                                                background: sc.bg,
                                                color: sc.color,
                                                fontSize: '0.6875rem',
                                                fontWeight: 700,
                                            }}>
                                                {sc.label}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--app-text-secondary)' }}>
                                            <span>{new Date(event.event_date).toLocaleDateString('ko-KR')}</span>
                                            <span>{event.event_type}</span>
                                            <span>{event.distance_meters}m</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                /* Event Detail + Records */
                <div>
                    <button
                        onClick={() => { setSelectedEvent(null); setRecords([]); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--app-accent)', fontWeight: 600, fontSize: '0.875rem',
                            marginBottom: '1rem', padding: 0,
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5" /><polyline points="12,19 5,12 12,5" />
                        </svg>
                        목록으로
                    </button>

                    <div className="app-glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '0.5rem' }}>
                            {selectedEvent.name}
                        </h3>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--app-text-secondary)' }}>
                            <span>{new Date(selectedEvent.event_date).toLocaleDateString('ko-KR')}</span>
                            <span>{selectedEvent.event_type}</span>
                            <span>{selectedEvent.distance_meters}m</span>
                        </div>
                    </div>

                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '0.75rem' }}>
                        기록 ({records.length}명)
                    </h4>

                    {records.length === 0 ? (
                        <div className="app-glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem' }}>아직 기록이 없습니다</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {records.map((record, index) => (
                                <div key={record.id} className="app-glass-card" style={{ padding: '0.875rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: index < 3 ? 'var(--app-accent-bg)' : 'var(--app-bg)',
                                            color: index < 3 ? 'var(--app-accent)' : 'var(--app-text-muted)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 800, fontSize: '0.75rem',
                                            flexShrink: 0,
                                        }}>
                                            #{index + 1}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>
                                                {record.members?.name || 'Unknown'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--app-text-primary)' }}>
                                                {formatTime(record.result_time)}
                                            </div>
                                            {record.is_pr && (
                                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#F59E0B' }}>🏆 PR</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
