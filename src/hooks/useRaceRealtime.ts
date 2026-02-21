'use client';

/**
 * useRaceRealtime — Supabase Broadcast + Polling Hybrid Hook
 * ============================================================
 * Provides real-time race data from the Race Server via:
 * 1. Supabase Realtime Broadcast (primary — sub-second latency)
 * 2. Polling fallback (if Broadcast is unavailable)
 * 3. race_live_state DB snapshots (reconnection recovery)
 *
 * Usage:
 *   const { laneData, raceStatus, elapsedTime, teams } = useRaceRealtime(eventId);
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query } from '@/lib/supabase/query';

// ─── Types ───────────────────────────────────────

export type RaceStatus = 'setup' | 'lobby' | 'countdown' | 'racing' | 'finished';

export interface LaneData {
    device_serial: string;
    lane: number;
    member_id: string | null;
    member_name: string | null;
    team_id: string | null;
    distance_m: number;
    power_w: number;
    stroke_rate_spm: number;
    hr_bpm: number | null;
    calories_burned: number;
    max_watts: number;
    connection_status: 'connected' | 'racing' | 'idle' | 'disconnected' | 'offline';
    rank: number;
    last_updated_at: number; // Unix timestamp ms
}

export interface TeamData {
    team_id: string;
    team_name: string;
    team_color: string;
    total_distance_m: number;
    member_count: number;
    rank: number;
}

export interface UseRaceRealtimeReturn {
    laneData: LaneData[];
    raceStatus: RaceStatus;
    elapsedTime: number;
    teams: TeamData[];
    isConnected: boolean;
    error: string | null;
    reconnect: () => void;
}

// ─── Constants ───────────────────────────────────

const RACE_SERVER_URL = process.env.NEXT_PUBLIC_RACE_SERVER_URL || 'http://localhost:8001';
const POLL_INTERVAL_MS = 300;
const RECONNECT_SNAPSHOT_DELAY = 1000;

// ─── State Machine ───────────────────────────────

const VALID_TRANSITIONS: Record<RaceStatus, RaceStatus[]> = {
    setup: ['lobby'],
    lobby: ['countdown', 'setup'],
    countdown: ['racing', 'lobby'],
    racing: ['finished'],
    finished: ['setup'],
};

function isValidTransition(from: RaceStatus, to: RaceStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Hook ────────────────────────────────────────

export function useRaceRealtime(eventId: string | null): UseRaceRealtimeReturn {
    const [laneData, setLaneData] = useState<LaneData[]>([]);
    const [raceStatus, setRaceStatus] = useState<RaceStatus>('setup');
    const [elapsedTime, setElapsedTime] = useState(0);
    const [teams, setTeams] = useState<TeamData[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const channelRef = useRef<any>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const raceStartRef = useRef<number>(0);
    const statusRef = useRef<RaceStatus>('setup');

    // Keep statusRef in sync
    useEffect(() => {
        statusRef.current = raceStatus;
    }, [raceStatus]);

    // ─── Process incoming erg data ───────────────
    const processErgUpdate = useCallback((payload: any) => {
        if (!payload) return;

        setLaneData(prev => {
            const serial = payload.device_serial;
            const existing = prev.find(l => l.device_serial === serial);

            const updated: LaneData = {
                device_serial: serial,
                lane: payload.lane ?? existing?.lane ?? 0,
                member_id: payload.member_id ?? existing?.member_id ?? null,
                member_name: payload.member_name ?? existing?.member_name ?? null,
                team_id: payload.team_id ?? existing?.team_id ?? null,
                distance_m: payload.d ?? payload.distance_m ?? 0,
                power_w: payload.p ?? payload.power_w ?? 0,
                stroke_rate_spm: payload.spm ?? payload.stroke_rate_spm ?? 0,
                hr_bpm: payload.hr ?? payload.hr_bpm ?? null,
                calories_burned: payload.cal ?? payload.calories_burned ?? 0,
                max_watts: payload.max_w ?? payload.max_watts ?? 0,
                connection_status: payload.connection_status ?? 'connected',
                rank: 0, // will be computed below
                last_updated_at: Date.now(),
            };

            let newData: LaneData[];
            if (existing) {
                newData = prev.map(l => l.device_serial === serial ? updated : l);
            } else {
                newData = [...prev, updated];
            }

            // Compute ranks by distance (descending)
            newData.sort((a, b) => b.distance_m - a.distance_m);
            newData.forEach((l, idx) => { l.rank = idx + 1; });

            return newData;
        });
    }, []);

    // ─── Process batch data from polling ─────────
    const processBatchData = useCallback((dataMap: Record<string, any>) => {
        const entries = Object.entries(dataMap);
        if (entries.length === 0) return;

        setLaneData(_prev => {
            const newData: LaneData[] = entries.map(([serial, payload]: [string, any]) => ({
                device_serial: serial,
                lane: payload.lane ?? 0,
                member_id: payload.member_id ?? null,
                member_name: payload.member_name ?? null,
                team_id: payload.team_id ?? null,
                distance_m: payload.d ?? 0,
                power_w: payload.p ?? 0,
                stroke_rate_spm: payload.spm ?? 0,
                hr_bpm: payload.hr ?? null,
                calories_burned: payload.cal ?? 0,
                max_watts: payload.max_w ?? 0,
                connection_status: payload.connection_status ?? 'connected',
                rank: 0,
                last_updated_at: Date.now(),
            }));

            // Sort by distance descending and assign ranks
            newData.sort((a, b) => b.distance_m - a.distance_m);
            newData.forEach((l, idx) => { l.rank = idx + 1; });

            return newData;
        });
    }, []);

    // ─── Compute team aggregates ─────────────────
    useEffect(() => {
        const teamMap = new Map<string, { total: number; count: number }>();

        laneData.forEach(lane => {
            if (!lane.team_id) return;
            const existing = teamMap.get(lane.team_id) || { total: 0, count: 0 };
            existing.total += lane.distance_m;
            existing.count += 1;
            teamMap.set(lane.team_id, existing);
        });

        if (teamMap.size === 0) {
            setTeams([]);
            return;
        }

        const teamEntries: TeamData[] = Array.from(teamMap.entries()).map(([teamId, agg]) => ({
            team_id: teamId,
            team_name: teamId, // Will be enriched from DB if needed
            team_color: '#FF6A00',
            total_distance_m: Math.round(agg.total * 100) / 100,
            member_count: agg.count,
            rank: 0,
        }));

        // Rank teams by total distance
        teamEntries.sort((a, b) => b.total_distance_m - a.total_distance_m);
        teamEntries.forEach((t, idx) => { t.rank = idx + 1; });

        setTeams(teamEntries);
    }, [laneData]);

    // ─── Race timer ──────────────────────────────
    useEffect(() => {
        if (raceStatus === 'racing') {
            if (!raceStartRef.current) raceStartRef.current = Date.now();
            timerRef.current = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - raceStartRef.current) / 1000));
            }, 100);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            if (raceStatus === 'setup') {
                raceStartRef.current = 0;
                setElapsedTime(0);
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [raceStatus]);

    // ─── Snapshot recovery from DB ───────────────
    const recoverFromSnapshot = useCallback(async (eid: string) => {
        try {
            const { data } = await query('race_live_state')
                .select('*')
                .eq('event_id', eid);

            if (data && data.length > 0) {
                const recoveredLanes: LaneData[] = data.map((row: any) => ({
                    device_serial: row.device_serial || '',
                    lane: row.lane_number ?? 0,
                    member_id: row.member_id,
                    member_name: null,
                    team_id: row.team_id,
                    distance_m: parseFloat(row.distance_m) || 0,
                    power_w: parseFloat(row.power_w) || 0,
                    stroke_rate_spm: parseFloat(row.stroke_rate_spm) || 0,
                    hr_bpm: row.hr_bpm ? parseInt(row.hr_bpm) : null,
                    calories_burned: parseInt(row.calories_burned) || 0,
                    max_watts: parseFloat(row.max_watts) || 0,
                    connection_status: row.connection_status || 'disconnected',
                    rank: 0,
                    last_updated_at: new Date(row.last_updated_at).getTime(),
                }));

                recoveredLanes.sort((a, b) => b.distance_m - a.distance_m);
                recoveredLanes.forEach((l, idx) => { l.rank = idx + 1; });

                setLaneData(recoveredLanes);
                console.log(`[useRaceRealtime] Recovered ${recoveredLanes.length} lanes from snapshot`);
            }
        } catch (e) {
            console.error('[useRaceRealtime] Snapshot recovery failed:', e);
        }
    }, []);

    // ─── Setup Realtime + Polling ────────────────
    useEffect(() => {
        if (!eventId) {
            setLaneData([]);
            setRaceStatus('setup');
            return;
        }

        let mounted = true;
        const supabase = createClient();

        // 1. Try Supabase Broadcast subscription
        const channel = supabase.channel(`race:${eventId}`, {
            config: { broadcast: { self: false } },
        });

        channel
            .on('broadcast', { event: 'erg_update' }, (payload) => {
                if (!mounted) return;
                setIsConnected(true);
                processErgUpdate(payload.payload);
            })
            .on('broadcast', { event: 'race_start' }, (_payload) => {
                if (!mounted) return;
                setRaceStatus('racing');
            })
            .on('broadcast', { event: 'race_finish' }, (_payload) => {
                if (!mounted) return;
                setRaceStatus('finished');
            })
            .subscribe((status) => {
                if (!mounted) return;
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                    setError(null);
                    console.log(`[useRaceRealtime] Subscribed to race:${eventId}`);
                } else if (status === 'CHANNEL_ERROR') {
                    setIsConnected(false);
                    setError('Realtime 연결 실패');
                }
            });

        channelRef.current = channel;

        // 2. Polling fallback (always active for status tracking)
        pollRef.current = setInterval(async () => {
            if (!mounted) return;
            try {
                const res = await fetch(`${RACE_SERVER_URL}/api/race/live`);
                const data = await res.json();

                if (data.status && data.status !== statusRef.current) {
                    const newStatus = data.status as RaceStatus;
                    setRaceStatus(newStatus);
                }

                if (data.data && Object.keys(data.data).length > 0) {
                    processBatchData(data.data);
                }
            } catch {
                // Silent — broadcast is primary
            }
        }, POLL_INTERVAL_MS);

        // 3. Initial snapshot recovery (for reconnection)
        setTimeout(() => {
            if (mounted) recoverFromSnapshot(eventId);
        }, RECONNECT_SNAPSHOT_DELAY);

        return () => {
            mounted = false;
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [eventId, processErgUpdate, processBatchData, recoverFromSnapshot]);

    // ─── Reconnect handler ───────────────────────
    const reconnect = useCallback(() => {
        if (!eventId) return;
        setError(null);
        setIsConnected(false);

        // Force re-mount by clearing and re-establishing
        if (channelRef.current) {
            const supabase = createClient();
            supabase.removeChannel(channelRef.current);
        }

        // Recover from DB snapshot
        recoverFromSnapshot(eventId);
    }, [eventId, recoverFromSnapshot]);

    return {
        laneData,
        raceStatus,
        elapsedTime,
        teams,
        isConnected,
        error,
        reconnect,
    };
}
