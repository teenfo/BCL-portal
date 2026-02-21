'use client';

/**
 * useRaceAnimator — rAF-based LERP animation controller
 * ======================================================
 * Provides smooth interpolation of race data for 2.5D rendering.
 * Uses requestAnimationFrame + DOM manipulation (not React state)
 * for 60fps performance with up to 20 lanes.
 */

import { useRef, useCallback, useEffect } from 'react';
import type { LaneData } from './useRaceRealtime';

// ─── Types ───────────────────────────────────────

export interface AnimatedLane {
    serial: string;
    lane: number;
    memberName: string;
    teamId: string | null;

    // Interpolated values (smooth 60fps)
    currentX: number;       // Normalized position 0..1 on track
    targetX: number;        // Target position to LERP towards
    currentPower: number;
    targetPower: number;
    currentSPM: number;
    targetSPM: number;

    // Direct values (no interpolation needed)
    distance: number;
    hr: number | null;
    calories: number;
    maxWatts: number;
    rank: number;
    connectionStatus: string;
}

export interface UseRaceAnimatorReturn {
    animatedLanes: React.MutableRefObject<Map<string, AnimatedLane>>;
    rafIdRef: React.MutableRefObject<number | null>;
    start: (targetDistance: number) => void;
    stop: () => void;
    updateTargets: (laneData: LaneData[]) => void;
}

// ─── Constants ───────────────────────────────────

const LERP_FACTOR = 0.08;           // Smoothing factor (0.0-1.0, lower = smoother)
const POWER_LERP_FACTOR = 0.15;     // Power responds faster
const SPM_LERP_FACTOR = 0.1;

// ─── LERP Function ──────────────────────────────

function lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
}

// ─── Hook ────────────────────────────────────────

export function useRaceAnimator(): UseRaceAnimatorReturn {
    const animatedLanes = useRef<Map<string, AnimatedLane>>(new Map());
    const rafIdRef = useRef<number | null>(null);
    const targetDistanceRef = useRef<number>(2000); // Default 2000m race
    const isRunningRef = useRef(false);
    const onFrameCallbacksRef = useRef<Set<(lanes: Map<string, AnimatedLane>) => void>>(new Set());

    // ─── Update targets from real-time data ──────
    const updateTargets = useCallback((laneData: LaneData[]) => {
        const targetDist = targetDistanceRef.current;

        for (const data of laneData) {
            const existing = animatedLanes.current.get(data.device_serial);
            const targetX = targetDist > 0 ? Math.min(1, data.distance_m / targetDist) : 0;

            if (existing) {
                // Update targets (LERP will handle smooth transition)
                existing.targetX = targetX;
                existing.targetPower = data.power_w;
                existing.targetSPM = data.stroke_rate_spm;
                existing.distance = data.distance_m;
                existing.hr = data.hr_bpm;
                existing.calories = data.calories_burned;
                existing.maxWatts = data.max_watts;
                existing.rank = data.rank;
                existing.connectionStatus = data.connection_status;
            } else {
                // New lane — initialize at target immediately
                animatedLanes.current.set(data.device_serial, {
                    serial: data.device_serial,
                    lane: data.lane,
                    memberName: data.member_name || `Lane ${data.lane}`,
                    teamId: data.team_id,
                    currentX: targetX,
                    targetX: targetX,
                    currentPower: data.power_w,
                    targetPower: data.power_w,
                    currentSPM: data.stroke_rate_spm,
                    targetSPM: data.stroke_rate_spm,
                    distance: data.distance_m,
                    hr: data.hr_bpm,
                    calories: data.calories_burned,
                    maxWatts: data.max_watts,
                    rank: data.rank,
                    connectionStatus: data.connection_status,
                });
            }
        }
    }, []);

    // ─── Animation Frame ─────────────────────────
    const animate = useCallback(() => {
        if (!isRunningRef.current) return;

        // LERP all animated values
        for (const lane of animatedLanes.current.values()) {
            // Skip LERP for disconnected lanes
            if (lane.connectionStatus === 'offline' || lane.connectionStatus === 'disconnected') {
                continue;
            }

            lane.currentX = lerp(lane.currentX, lane.targetX, LERP_FACTOR);
            lane.currentPower = lerp(lane.currentPower, lane.targetPower, POWER_LERP_FACTOR);
            lane.currentSPM = lerp(lane.currentSPM, lane.targetSPM, SPM_LERP_FACTOR);
        }

        // Notify frame callbacks (for DOM updates)
        for (const cb of onFrameCallbacksRef.current) {
            cb(animatedLanes.current);
        }

        rafIdRef.current = requestAnimationFrame(animate);
    }, []);

    // ─── Start/Stop ──────────────────────────────
    const start = useCallback((targetDistance: number) => {
        targetDistanceRef.current = targetDistance;
        if (isRunningRef.current) return;
        isRunningRef.current = true;
        rafIdRef.current = requestAnimationFrame(animate);
    }, [animate]);

    const stop = useCallback(() => {
        isRunningRef.current = false;
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
    }, []);

    // ─── Cleanup ─────────────────────────────────
    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);

    return {
        animatedLanes,
        rafIdRef,
        start,
        stop,
        updateTargets,
    };
}
