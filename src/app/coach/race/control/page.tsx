'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

import { query } from '@/lib/supabase/query';

// ─── Types ───────────────────────────────────────
interface PM5Device {
    id: string;
    serial_number: string;
    device_type: string;
    status: string;
    ble_name: string | null;
    mac_address: string | null;
    current_mode: string | null;
    facility_id: string | null;
}

interface BLEDeviceInfo {
    serial: string;
    address: string;
    adapter?: string | null;
    connected: boolean;
    distance_m: number;
    power_w: number;
    spm: number;
}

interface LaneAssignment {
    lane: number;
    device_serial: string;
    device_id: string;
    member_id: string | null;
    member_name: string | null;
    team_id: string | null;
}

interface MemberOption {
    id: string;
    name: string;
}

interface RaceTeam {
    id: string;
    event_id: string;
    team_name: string;
    team_color: string;
}

interface RaceEvent {
    id: string;
    name: string;
    event_date: string;
    event_type: string;
    distance_meters: number;
    race_format: string;
    lobby_status: string;
    target_distance_m: number | null;
    status: string;
}

type RaceStatus = 'setup' | 'lobby' | 'countdown' | 'racing' | 'finished';

const RACE_SERVER_URL = process.env.NEXT_PUBLIC_RACE_SERVER_URL || 'http://localhost:8001';

// ─── Component ───────────────────────────────────
export default function CoachRaceControlPage() {
    // 세션 운영 보드 "Race 수업 시작" 딥링크 (P25): ?event_id= 로 진입 시 해당 이벤트 자동 선택
    const searchParams = useSearchParams();
    const focusEventId = searchParams?.get('event_id');

    // Setup state
    const [devices, setDevices] = useState<PM5Device[]>([]);
    const [members, setMembers] = useState<MemberOption[]>([]);
    const [events, setEvents] = useState<RaceEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<RaceEvent | null>(null);

    // Race room config
    const [raceFormat, setRaceFormat] = useState<'individual' | 'team'>('individual');
    const [targetDistance, setTargetDistance] = useState(2000);
    const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('all');

    // Lane assignments
    const [lanes, setLanes] = useState<LaneAssignment[]>([]);

    // Team race
    const [teams, setTeams] = useState<RaceTeam[]>([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamColor, setNewTeamColor] = useState('#FF6A00');

    // Race state
    const [raceStatus, setRaceStatus] = useState<RaceStatus>('setup');
    const [bleDevices, setBleDevices] = useState<BLEDeviceInfo[]>([]);
    const [scanning, setScanning] = useState(false);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [liveData, setLiveData] = useState<Record<string, any>>({});
    const [countdownValue, setCountdownValue] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ─── Data Loading ────────────────────────────
    useEffect(() => {
        loadInitialData();
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (timerRef.current) clearInterval(timerRef.current);
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    async function loadInitialData() {
        try {
            const [devicesRes, membersRes, eventsRes] = await Promise.all([
                // pm5_devices.status enum: online | offline | maintenance
                query('pm5_devices').select('*').eq('status', 'online').order('serial_number'),
                query('members').select('id, name').eq('status', 'active').order('name'),
                query('race_events').select('*').order('event_date', { ascending: false }).limit(10),
            ]);

            if (devicesRes.data) setDevices(devicesRes.data);
            if (membersRes.data) setMembers(membersRes.data);
            if (eventsRes.data) setEvents(eventsRes.data as unknown as RaceEvent[]);

            // ?event_id= 딥링크: 목록에 없으면 단건 조회 후 자동 선택
            if (focusEventId) {
                let target = (eventsRes.data as unknown as RaceEvent[] | null)?.find(ev => ev.id === focusEventId) || null;
                if (!target) {
                    const { data: single } = await query('race_events').select('*').eq('id', focusEventId).single();
                    if (single) {
                        target = single as unknown as RaceEvent;
                        setEvents(prev => [target as RaceEvent, ...prev.filter(ev => ev.id !== focusEventId)]);
                    }
                }
                if (target && target.status !== 'completed') {
                    setSelectedEvent(target);
                    if (target.target_distance_m) setTargetDistance(target.target_distance_m);
                    if (target.race_format === 'team') setRaceFormat('team');
                }
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error('Load error:', e);
            setError('데이터 로딩 실패');
        }
        setLoading(false);
    }

    async function loadTeams(eventId: string) {
        try {
            const res = await query('race_teams')
                .select('id, event_id, team_name, team_color')
                .eq('event_id', eventId)
                .order('team_name');
            setTeams((res.data as unknown as RaceTeam[]) || []);
        } catch {
            setTeams([]);
        }
    }

    useEffect(() => {
        if (selectedEvent && raceFormat === 'team') {
            loadTeams(selectedEvent.id);
        } else {
            setTeams([]);
        }
    }, [selectedEvent, raceFormat]);

    async function handleCreateTeam() {
        if (!selectedEvent || !newTeamName.trim()) return;
        try {
            const res = await query('race_teams').insert({
                event_id: selectedEvent.id,
                team_name: newTeamName.trim(),
                team_color: newTeamColor,
            }).select().single();
            if (res.data) {
                setTeams(prev => [...prev, res.data as unknown as RaceTeam]);
                setNewTeamName('');
            }
        } catch (e: any) {
            setError(`팀 생성 실패: ${e.message ?? e}`);
        }
    }

    function updateLaneTeam(laneNum: number, teamId: string) {
        setLanes(prev => prev.map(l =>
            l.lane === laneNum ? { ...l, team_id: teamId || null } : l
        ));
    }

    // ─── Race Server Communication ───────────────
    async function raceAPI(endpoint: string, method = 'GET', body?: any) {
        try {
            const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
            if (body) opts.body = JSON.stringify(body);
            const res = await fetch(`${RACE_SERVER_URL}${endpoint}`, opts);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `HTTP ${res.status}`);
            }
            return await res.json();
        } catch (e: any) {
            if (process.env.NODE_ENV === 'development') console.error(`Race API error (${endpoint}):`, e);
            throw e;
        }
    }

    // ─── BLE Scan ────────────────────────────────
    async function handleBLEScan() {
        setScanning(true);
        setError(null);
        try {
            const result = await raceAPI('/api/ble/scan?timeout=10');
            setBleDevices(result.devices || []);
        } catch (e: any) {
            setError(`스캔 실패: ${e.message}`);
        }
        setScanning(false);
    }

    async function handleBLEConnect(address: string, serial: string, adapter?: string | null) {
        setConnecting(serial);
        try {
            await raceAPI('/api/ble/connect', 'POST', { address, serial, adapter: adapter ?? null });
            setBleDevices(prev => prev.map(d => d.serial === serial ? { ...d, connected: true } : d));
        } catch (e: any) {
            setError(`연결 실패 (${serial}): ${e.message}`);
        }
        setConnecting(null);
    }

    // ─── Lane Assignment ─────────────────────────
    function autoAssignLanes() {
        const connectedDevices = bleDevices.filter(d => d.connected);
        const newLanes: LaneAssignment[] = connectedDevices.map((dev, idx) => {
            const dbDevice = devices.find(d => d.serial_number === dev.serial);
            return {
                lane: idx + 1,
                device_serial: dev.serial,
                device_id: dbDevice?.id || '',
                member_id: members[idx]?.id || null,
                member_name: members[idx]?.name || null,
                team_id: null,
            };
        });
        setLanes(newLanes);
    }

    function updateLaneMember(laneNum: number, memberId: string) {
        const member = members.find(m => m.id === memberId);
        setLanes(prev => prev.map(l =>
            l.lane === laneNum
                ? { ...l, member_id: memberId || null, member_name: member?.name || null }
                : l
        ));
    }

    // ─── Race Lifecycle ──────────────────────────
    async function handleSetupRace() {
        if (!selectedEvent) {
            setError('레이스 이벤트를 선택해주세요');
            return;
        }
        if (lanes.length === 0) {
            setError('레인 배정이 필요합니다');
            return;
        }

        try {
            const laneMap: Record<string, any> = {};
            lanes.forEach(l => {
                laneMap[l.device_serial] = {
                    lane: l.lane,
                    member_id: l.member_id,
                    team_id: l.team_id,
                    device_id: l.device_id,
                };
            });

            await raceAPI('/api/race/setup', 'POST', {
                event_id: selectedEvent.id,
                lane_assignments: laneMap,
                meta: {
                    race_format: raceFormat,
                    target_distance: targetDistance,
                    event_name: selectedEvent.name,
                },
            });

            setRaceStatus('lobby');
            startPolling();
        } catch (e: any) {
            setError(`레이스 설정 실패: ${e.message}`);
        }
    }

    async function handleCountdown() {
        try {
            await raceAPI('/api/race/control', 'POST', { action: 'countdown' });
            setRaceStatus('countdown');

            // 5-second countdown
            let count = 5;
            setCountdownValue(count);
            const interval = setInterval(() => {
                count--;
                if (count <= 0) {
                    clearInterval(interval);
                    setCountdownValue(null);
                    handleStartRace();
                } else {
                    setCountdownValue(count);
                }
            }, 1000);
        } catch (e: any) {
            setError(`카운트다운 실패: ${e.message}`);
        }
    }

    async function handleStartRace() {
        try {
            await raceAPI('/api/race/control', 'POST', { action: 'start' });
            setRaceStatus('racing');
            setElapsedTime(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } catch (e: any) {
            setError(`레이스 시작 실패: ${e.message}`);
        }
    }

    async function handleStopRace() {
        try {
            await raceAPI('/api/race/control', 'POST', { action: 'stop' });
            setRaceStatus('finished');
            if (timerRef.current) clearInterval(timerRef.current);
        } catch (e: any) {
            setError(`레이스 종료 실패: ${e.message}`);
        }
    }

    async function handleResetRace() {
        try {
            await raceAPI('/api/race/control', 'POST', { action: 'reset' });
            setRaceStatus('setup');
            setLiveData({});
            setElapsedTime(0);
            setCountdownValue(null);
            if (timerRef.current) clearInterval(timerRef.current);
            if (pollRef.current) clearInterval(pollRef.current);
        } catch (e: any) {
            setError(`리셋 실패: ${e.message}`);
        }
    }

    // ─── Live Data Polling ───────────────────────
    function startPolling() {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const data = await raceAPI('/api/race/live');
                if (data.data) setLiveData(data.data);
                if (data.status) setRaceStatus(data.status);
            } catch {
                // Silent fail for polling
            }
        }, 500);
    }

    // ─── Helpers ─────────────────────────────────
    function formatTimer(seconds: number) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    const filteredDevices = deviceTypeFilter === 'all'
        ? devices
        : devices.filter(d => d.device_type === deviceTypeFilter);

    // ─── Render ──────────────────────────────────
    if (loading) {
        return (
            <div className="app-page">
                <div className="app-skeleton" style={{ width: '50%', height: 28, marginBottom: 24 }} />
                {[1, 2, 3].map(i => (
                    <div key={i} className="app-skeleton" style={{ height: 100, borderRadius: 16, marginBottom: 12 }} />
                ))}
            </div>
        );
    }

    return (
        <div className="app-page" style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', letterSpacing: '-0.01em' }}>
                        🏁 Race Control
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginTop: 4 }}>
                        레이스 룸 설정 및 실시간 제어
                    </p>
                </div>
                <StatusBadge status={raceStatus} />
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 12, padding: '10px 14px', marginBottom: '1rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <span style={{ fontSize: '0.8125rem', color: '#EF4444' }}>{error}</span>
                    <button onClick={() => setError(null)} style={{
                        background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '1rem'
                    }}>✕</button>
                </div>
            )}

            {/* Countdown Overlay */}
            {countdownValue !== null && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        fontSize: '8rem', fontWeight: 900, color: '#FF6A00',
                        textShadow: '0 0 40px rgba(255,106,0,0.5)',
                        animation: 'pulse 1s infinite',
                    }}>
                        {countdownValue}
                    </div>
                    <p style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.7)', marginTop: 16 }}>
                        GET READY
                    </p>
                </div>
            )}

            {/* ═══ SETUP Phase ═══ */}
            {raceStatus === 'setup' && (
                <>
                    {/* Event Selection */}
                    <SectionCard title="1. 레이스 이벤트 선택" icon="📋">
                        <select
                            value={selectedEvent?.id || ''}
                            onChange={e => {
                                const ev = events.find(ev => ev.id === e.target.value);
                                setSelectedEvent(ev || null);
                                if (ev?.target_distance_m) setTargetDistance(ev.target_distance_m);
                            }}
                            style={inputStyle}
                        >
                            <option value="">이벤트 선택...</option>
                            {events.filter(e => e.status !== 'completed').map(ev => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.name} ({ev.event_type}) — {new Date(ev.event_date).toLocaleDateString('ko-KR')}
                                </option>
                            ))}
                        </select>

                        {/* Race Format & Distance */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>포맷</label>
                                <div style={{ display: 'flex', gap: '0.375rem' }}>
                                    {(['individual', 'team'] as const).map(fmt => (
                                        <button key={fmt} onClick={() => setRaceFormat(fmt)} style={{
                                            ...pillStyle,
                                            background: raceFormat === fmt ? 'var(--app-accent)' : 'var(--app-surface)',
                                            color: raceFormat === fmt ? '#fff' : 'var(--app-text-secondary)',
                                        }}>
                                            {fmt === 'individual' ? '👤 개인전' : '👥 팀전'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>목표 거리 (m)</label>
                                <input
                                    type="number" value={targetDistance}
                                    onChange={e => setTargetDistance(parseInt(e.target.value) || 0)}
                                    style={inputStyle} min={100} step={100}
                                />
                            </div>
                        </div>
                    </SectionCard>

                    {/* BLE Device Scan */}
                    <SectionCard title="2. 장비 연결 (BLE)" icon="📡">
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <select value={deviceTypeFilter} onChange={e => setDeviceTypeFilter(e.target.value)}
                                style={{ ...inputStyle, flex: 1 }}>
                                <option value="all">전체 장비</option>
                                <option value="rower">🚣 Rower</option>
                                <option value="skierg">⛷️ SkiErg</option>
                                <option value="bike">🚴 BikeErg</option>
                            </select>
                            <button onClick={handleBLEScan} disabled={scanning} style={{
                                ...btnPrimary, opacity: scanning ? 0.7 : 1, minWidth: 100,
                            }}>
                                {scanning ? '스캔 중...' : '🔍 스캔'}
                            </button>
                        </div>

                        {/* Registered devices from DB */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--app-text-muted)', marginBottom: '0.5rem' }}>
                            등록된 장비 ({filteredDevices.length}대)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            {filteredDevices.map(dev => {
                                const bleInfo = bleDevices.find(b => b.serial === dev.serial_number);
                                const isConnected = bleInfo?.connected || false;
                                return (
                                    <div key={dev.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '0.5rem 0.75rem', borderRadius: 10,
                                        background: isConnected ? 'rgba(34,197,94,0.08)' : 'var(--app-surface)',
                                        border: `1px solid ${isConnected ? 'rgba(34,197,94,0.3)' : 'var(--app-border)'}`,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{
                                                width: 8, height: 8, borderRadius: '50%',
                                                background: isConnected ? '#22C55E' : '#6B7280',
                                            }} />
                                            <div>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>
                                                    {dev.serial_number}
                                                </div>
                                                <div style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)' }}>
                                                    {dev.device_type} · {dev.ble_name || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                        {bleInfo && !isConnected ? (
                                            <button
                                                onClick={() => handleBLEConnect(bleInfo.address, bleInfo.serial, bleInfo.adapter)}
                                                disabled={connecting === dev.serial_number}
                                                style={{ ...btnSmall, background: 'var(--app-accent)' }}
                                            >
                                                {connecting === dev.serial_number ? '연결 중...' : '연결'}
                                            </button>
                                        ) : isConnected ? (
                                            <span style={{ fontSize: '0.6875rem', color: '#22C55E', fontWeight: 700 }}>✓ 연결됨</span>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>

                    {/* Team Management (team race only) */}
                    {raceFormat === 'team' && selectedEvent && (
                        <SectionCard title="3. 팀 구성" icon="👥">
                            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={newTeamName}
                                    placeholder="팀 이름"
                                    onChange={e => setNewTeamName(e.target.value)}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <input
                                    type="color"
                                    value={newTeamColor}
                                    onChange={e => setNewTeamColor(e.target.value)}
                                    style={{ width: 48, padding: 2, border: '1px solid var(--app-border)', borderRadius: 8, background: 'var(--app-surface)' }}
                                />
                                <button onClick={handleCreateTeam} disabled={!newTeamName.trim()} style={{
                                    ...btnPrimary, opacity: !newTeamName.trim() ? 0.5 : 1,
                                }}>
                                    + 추가
                                </button>
                            </div>
                            {teams.length === 0 ? (
                                <p style={{ fontSize: '0.75rem', color: 'var(--app-text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>
                                    팀을 먼저 생성한 뒤 레인 배정 단계에서 팀을 선택하세요
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                                    {teams.map(t => (
                                        <span key={t.id} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '0.25rem 0.625rem', borderRadius: 14,
                                            background: `${t.team_color}22`, border: `1px solid ${t.team_color}66`,
                                            color: t.team_color, fontSize: '0.6875rem', fontWeight: 700,
                                        }}>
                                            <span style={{
                                                width: 8, height: 8, borderRadius: '50%', background: t.team_color,
                                            }} />
                                            {t.team_name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </SectionCard>
                    )}

                    {/* Lane Assignment */}
                    <SectionCard title={raceFormat === 'team' ? '4. 레인 배정' : '3. 레인 배정'} icon="🏷️">
                        <button onClick={autoAssignLanes} style={{ ...btnSecondary, marginBottom: '0.75rem', width: '100%' }}>
                            ⚡ 자동 배정 (연결된 기기 기준)
                        </button>
                        {lanes.length === 0 ? (
                            <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                                장비를 연결하고 자동 배정을 실행하세요
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                {lanes.map(lane => {
                                    const team = teams.find(t => t.id === lane.team_id);
                                    return (
                                        <div key={lane.lane} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            padding: '0.5rem 0.75rem', borderRadius: 10,
                                            background: 'var(--app-surface)',
                                            border: `1px solid ${team ? `${team.team_color}66` : 'var(--app-border)'}`,
                                            borderLeft: team ? `4px solid ${team.team_color}` : '1px solid var(--app-border)',
                                        }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: '50%',
                                                background: 'var(--app-accent-bg)', color: 'var(--app-accent)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 800, fontSize: '0.75rem', flexShrink: 0,
                                            }}>
                                                {lane.lane}
                                            </div>
                                            <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--app-text-secondary)' }}>
                                                {lane.device_serial}
                                            </div>
                                            <select
                                                value={lane.member_id || ''}
                                                onChange={e => updateLaneMember(lane.lane, e.target.value)}
                                                style={{ ...inputStyle, width: 'auto', flex: 1, fontSize: '0.75rem', padding: '0.375rem' }}
                                            >
                                                <option value="">미배정</option>
                                                {members.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                            {raceFormat === 'team' && (
                                                <select
                                                    value={lane.team_id || ''}
                                                    onChange={e => updateLaneTeam(lane.lane, e.target.value)}
                                                    style={{ ...inputStyle, width: 'auto', flex: '0 0 96px', fontSize: '0.75rem', padding: '0.375rem' }}
                                                >
                                                    <option value="">팀 없음</option>
                                                    {teams.map(t => (
                                                        <option key={t.id} value={t.id}>{t.team_name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </SectionCard>

                    {/* Start Button */}
                    <button
                        onClick={handleSetupRace}
                        disabled={!selectedEvent || lanes.length === 0}
                        style={{
                            ...btnPrimary, width: '100%', padding: '1rem',
                            fontSize: '1rem', fontWeight: 800, marginTop: '0.5rem',
                            opacity: (!selectedEvent || lanes.length === 0) ? 0.5 : 1,
                        }}
                    >
                        🏁 레이스 룸 열기
                    </button>
                </>
            )}

            {/* ═══ LOBBY / COUNTDOWN / RACING / FINISHED Phase ═══ */}
            {raceStatus !== 'setup' && (
                <>
                    {/* Timer & Controls */}
                    <div className="app-glass-card" style={{
                        padding: '1.25rem', textAlign: 'center', marginBottom: '1rem',
                        background: raceStatus === 'racing'
                            ? 'linear-gradient(135deg, rgba(255,106,0,0.15) 0%, rgba(255,106,0,0.05) 100%)'
                            : undefined,
                    }}>
                        {raceStatus === 'racing' && (
                            <div style={{
                                fontSize: '2.5rem', fontWeight: 900, color: 'var(--app-accent)',
                                fontFamily: 'monospace', letterSpacing: '0.05em', marginBottom: '0.75rem',
                            }}>
                                {formatTimer(elapsedTime)}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            {raceStatus === 'lobby' && (
                                <button onClick={handleCountdown} style={{
                                    ...btnPrimary, padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 800,
                                }}>
                                    ⏱ 카운트다운 시작
                                </button>
                            )}
                            {raceStatus === 'racing' && (
                                <button onClick={handleStopRace} style={{
                                    ...btnDanger, padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 800,
                                }}>
                                    ⏹ 레이스 종료
                                </button>
                            )}
                            {raceStatus === 'finished' && (
                                <button onClick={handleResetRace} style={{
                                    ...btnSecondary, padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 800,
                                }}>
                                    🔄 새 레이스
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Live Grid */}
                    <SectionCard title="실시간 모니터링" icon="📊">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {lanes.map(lane => {
                                const data = liveData[lane.device_serial] || {};
                                const distance = data.d || 0;
                                const power = data.p || 0;
                                const spm = data.spm || 0;
                                const hr = data.hr || '-';
                                const progress = targetDistance > 0 ? Math.min(100, (distance / targetDistance) * 100) : 0;

                                return (
                                    <div key={lane.lane} style={{
                                        padding: '0.75rem', borderRadius: 12,
                                        background: 'var(--app-surface)', border: '1px solid var(--app-border)',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{
                                                    width: 24, height: 24, borderRadius: '50%',
                                                    background: 'var(--app-accent-bg)', color: 'var(--app-accent)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 800, fontSize: '0.6875rem',
                                                }}>
                                                    {lane.lane}
                                                </div>
                                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>
                                                    {lane.member_name || lane.device_serial}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--app-accent)', fontFamily: 'monospace' }}>
                                                {distance.toFixed(1)}m
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div style={{
                                            height: 4, borderRadius: 2, background: 'var(--app-border)',
                                            marginBottom: '0.375rem', overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                height: '100%', borderRadius: 2,
                                                background: 'var(--app-accent)',
                                                width: `${progress}%`,
                                                transition: 'width 0.3s ease',
                                            }} />
                                        </div>

                                        {/* Metrics */}
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.6875rem', color: 'var(--app-text-muted)' }}>
                                            <span>⚡ {power}W</span>
                                            <span>🔄 {spm} SPM</span>
                                            <span>❤️ {hr}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>
                </>
            )}
        </div>
    );
}

// ─── Sub-components ──────────────────────────────

function StatusBadge({ status }: { status: RaceStatus }) {
    const config: Record<RaceStatus, { label: string; color: string; bg: string }> = {
        setup: { label: '설정', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
        lobby: { label: '대기', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
        countdown: { label: '카운트다운', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
        racing: { label: '레이싱', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
        finished: { label: '완료', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    };
    const c = config[status];
    return (
        <span style={{
            padding: '0.25rem 0.625rem', borderRadius: 20, fontSize: '0.6875rem',
            fontWeight: 700, background: c.bg, color: c.color,
        }}>
            {c.label}
        </span>
    );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    return (
        <div className="app-glass-card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
            <h4 style={{
                fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)',
                marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}>
                {icon} {title}
            </h4>
            {children}
        </div>
    );
}

// ─── Styles ──────────────────────────────────────

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem', borderRadius: 8,
    background: 'var(--app-surface)', border: '1px solid var(--app-border)',
    color: 'var(--app-text-primary)', fontSize: '0.8125rem', outline: 'none',
};

const labelStyle: React.CSSProperties = {
    fontSize: '0.6875rem', fontWeight: 600, color: 'var(--app-text-muted)',
    marginBottom: '0.25rem', display: 'block',
};

const pillStyle: React.CSSProperties = {
    flex: 1, padding: '0.5rem', borderRadius: 8, border: 'none',
    fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center',
};

const btnPrimary: React.CSSProperties = {
    padding: '0.625rem 1rem', borderRadius: 10, border: 'none',
    background: 'var(--app-accent)', color: '#fff',
    fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
    padding: '0.625rem 1rem', borderRadius: 10,
    border: '1px solid var(--app-border)', background: 'var(--app-surface)',
    color: 'var(--app-text-primary)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
    padding: '0.625rem 1rem', borderRadius: 10, border: 'none',
    background: '#EF4444', color: '#fff',
    fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
};

const btnSmall: React.CSSProperties = {
    padding: '0.25rem 0.5rem', borderRadius: 6, border: 'none',
    color: '#fff', fontWeight: 600, fontSize: '0.6875rem', cursor: 'pointer',
};
