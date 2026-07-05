'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';

interface Member {
    id: string;
    name: string;
    avatar_url: string | null;
}

interface Team {
    id: string;
    name: string;
    members: Member[];
    current_station_idx: number;
}

interface Movement {
    name?: string;
    custom_label?: string | null;
    target_value?: number | null;
    target_unit?: string | null;
    load_male_rx?: string | null;
    load_female_rx?: string | null;
}

interface RotationState {
    session_id: string;
    facility_id: string;
    current_round: number;
    total_rounds: number;
    seconds_per_round: number;
    is_running: boolean;
    timer_started_at: string | null;
    paused_remaining_seconds: number | null;
    team_assignments: Team[];
}

function ClassRotationHudContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get('session_id');

    // UI States
    const [loading, setLoading] = useState(true);
    const [sessionTitle, setSessionTitle] = useState('BCL STATION CIRCUIT');
    const [movements, setMovements] = useState<Movement[]>([]);
    
    // Core Engine States
    const [teams, setTeams] = useState<Team[]>([]);
    const [currentRound, setCurrentRound] = useState(1);
    const [totalRounds, setTotalRounds] = useState(6);
    const [secondsPerRound, setSecondsPerRound] = useState(300);
    const [isRunning, setIsRunning] = useState(false);
    const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null);
    const [pausedRemainingSeconds, setPausedRemainingSeconds] = useState<number | null>(300);

    // Audio & Interaction
    const [audioReady, setAudioReady] = useState(false);
    const [showRotateOverlay, setShowRotateOverlay] = useState(false);
    
    // Local Live Timer (0.01초 단위의 초정밀 계산용)
    const [displaySeconds, setDisplaySeconds] = useState(300);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const prevSecondsRef = useRef(300);

    // 비프음 생성 오디오 유틸
    const playBeep = useCallback((freq: number, type: OscillatorType, duration: number) => {
        if (!audioReady) return;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch {
            // 오디오 브라우저 차단 무시
        }
    }, [audioReady]);

    // WOD 및 데이터 가져오기
    const loadInitData = useCallback(async () => {
        if (!sessionId) return;
        setLoading(true);
        try {
            const { data: session } = await query('sessions')
                .select('title')
                .eq('id', sessionId)
                .single();
            if (session) setSessionTitle(session.title);

            const { data: sessionWod } = await query('session_wods')
                .select('movements_snapshot')
                .eq('session_id', sessionId)
                .single();

            let stationCount = 6;
            if (sessionWod) {
                const snapshot = (sessionWod.movements_snapshot as Movement[]) || [];
                setMovements(snapshot);
                stationCount = Math.max(snapshot.length, 1);
                setTotalRounds(stationCount);
            }

            const { data: rotationState } = await query('session_rotation_states')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (rotationState) {
                const state = rotationState as unknown as RotationState;
                setCurrentRound(state.current_round);
                setTotalRounds(state.total_rounds);
                setSecondsPerRound(state.seconds_per_round);
                setIsRunning(state.is_running);
                setTimerStartedAt(state.timer_started_at);
                setPausedRemainingSeconds(state.paused_remaining_seconds);
                setTeams(state.team_assignments || []);
                
                // 초기 타이머 설정
                if (state.is_running && state.timer_started_at) {
                    const elapsed = Math.floor((Date.now() - new Date(state.timer_started_at).getTime()) / 1000);
                    const remaining = Math.max((state.paused_remaining_seconds ?? state.seconds_per_round) - elapsed, 0);
                    setDisplaySeconds(remaining);
                } else {
                    setDisplaySeconds(state.paused_remaining_seconds ?? state.seconds_per_round);
                }
            } else {
                setDisplaySeconds(300);
            }
        } catch (err) {
            // 초기 데이터 무시
        }
        setLoading(false);
    }, [sessionId]);

    useEffect(() => {
        void loadInitData();
    }, [loadInitData]);

    // 초저지연 연동 및 실시간 채널 연결
    useEffect(() => {
        if (!sessionId) return;

        // DB 실시간 Replication 수신 채널 구축 (createClient는 싱글턴 반환)
        const supabase = createClient();
        const channel = supabase.channel(`hud-sync:${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'session_rotation_states',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload) => {
                    const state = payload.new as RotationState;
                    
                    // 로테이션 변경 감지 (라운드가 증가했거나 팀 인덱스가 달라진 경우 슬라이드 펄스 연출)
                    if (state.current_round !== currentRound) {
                        setShowRotateOverlay(true);
                        // 웅장한 로테이션 비프 버저
                        playBeep(440, 'sawtooth', 0.8);
                        setTimeout(() => playBeep(523.25, 'sawtooth', 0.8), 200);
                        setTimeout(() => setShowRotateOverlay(false), 2500);
                    }

                    setCurrentRound(state.current_round);
                    setTotalRounds(state.total_rounds);
                    setSecondsPerRound(state.seconds_per_round);
                    setIsRunning(state.is_running);
                    setTimerStartedAt(state.timer_started_at);
                    setPausedRemainingSeconds(state.paused_remaining_seconds);
                    setTeams(state.team_assignments || []);

                    if (state.is_running && state.timer_started_at) {
                        const elapsed = Math.floor((Date.now() - new Date(state.timer_started_at).getTime()) / 1000);
                        const remaining = Math.max((state.paused_remaining_seconds ?? state.seconds_per_round) - elapsed, 0);
                        setDisplaySeconds(remaining);
                    } else {
                        setDisplaySeconds(state.paused_remaining_seconds ?? state.seconds_per_round);
                    }
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [sessionId, currentRound, playBeep]);

    // 0.01초 단위의 초정밀 실시간 카운트다운 타이머 루프
    useEffect(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        if (isRunning) {
            timerIntervalRef.current = setInterval(() => {
                if (timerStartedAt) {
                    const elapsed = Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000);
                    const baseSec = pausedRemainingSeconds ?? secondsPerRound;
                    const remaining = Math.max(baseSec - elapsed, 0);
                    
                    setDisplaySeconds(remaining);

                    // 마지막 3초 카운트다운 비프음 펄스 (매 초가 바뀔 때 소리 재생)
                    if (remaining <= 3 && remaining > 0 && remaining !== prevSecondsRef.current) {
                        playBeep(880, 'sine', 0.15);
                    }
                    // 0초 달성 시 버저 및 ROTATE! 플래시 켜기
                    if (remaining === 0 && prevSecondsRef.current > 0) {
                        setShowRotateOverlay(true);
                        playBeep(440, 'sawtooth', 1.2);
                        setTimeout(() => setShowRotateOverlay(false), 3000);
                        setIsRunning(false);
                    }

                    prevSecondsRef.current = remaining;
                }
            }, 100);
        }

        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [isRunning, timerStartedAt, pausedRemainingSeconds, secondsPerRound, playBeep]);

    // 시간 포맷 (분:초)
    const formatDisplayTime = (totalSecs: number) => {
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 오디오 활성화
    const enableAudio = () => {
        setAudioReady(true);
        // 비프음으로 승인 알림
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(659.25, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch {
            // 브라우저 경고 무시
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#030305] text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-[#FF6B00] mx-auto mb-4"></div>
                    <p className="text-white/40 text-xs tracking-widest font-black uppercase">Loading rotation HUD Matrix...</p>
                </div>
            </div>
        );
    }

    if (!sessionId) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#030305] text-white p-8">
                <div className="text-center max-w-md rounded-3xl bg-white/[0.02] border border-white/10 p-8 glass-card">
                    <span className="material-symbols-outlined text-red-500 text-6xl mb-4 animate-bounce">warning</span>
                    <h2 className="text-2xl font-black mb-2 tracking-tight">DISPLAY CONTEXT LOST</h2>
                    <p className="text-white/40 text-xs leading-relaxed mb-6">TV 전광판 보드를 띄우기 위해선 올바른 session_id 주소가 명시되어야 합니다.</p>
                    <button onClick={() => router.back()} className="admin-action-btn w-full">이전으로 돌아가기</button>
                </div>
            </div>
        );
    }

    const timerDanger = displaySeconds <= 10 && displaySeconds > 0;

    return (
        <main className="min-h-screen bg-[#030305] text-white flex flex-col font-sans overflow-hidden select-none relative">
            
            {/* 오디오 승인 플로팅 배너 */}
            {!audioReady && (
                <div 
                    onClick={enableAudio}
                    className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center cursor-pointer transition-all duration-300 animate-fadeIn"
                >
                    <div className="text-center p-8 rounded-3xl bg-white/[0.03] border border-white/10 max-w-sm glass-card hover:border-[#FF6B00]/40 transition-all duration-300">
                        <span className="material-symbols-outlined text-5xl text-[#FF6B00] mb-3 animate-ping">volume_up</span>
                        <h4 className="text-lg font-black tracking-tight text-white mb-2">AUDIO AUTOPLAY ALLOW</h4>
                        <p className="text-white/50 text-xs leading-relaxed mb-4">화면을 가볍게 터치/클릭하시면 TV 스피커를 통한 웅장한 로테이션 카운트다운 사운드가 활성화됩니다.</p>
                        <span className="text-[10px] uppercase tracking-widest font-black bg-[#FF6B00] text-black px-4 py-2 rounded-full inline-block shadow-lg shadow-[#FF6B00]/15">
                            CLICK TO ENTER HUD
                        </span>
                    </div>
                </div>
            )}

            {/* 1. TOP HEADER (WOD 정보 & 타이머 HUD) */}
            <header className="px-10 py-5 border-b border-white/[0.05] bg-white/[0.01] flex items-center justify-between z-10 relative flex-shrink-0">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black bg-[#FF6B00] text-black px-2 py-0.5 rounded uppercase tracking-wider">STATION CIRCUIT</span>
                        <span className="text-xs font-black text-white/30 tracking-widest uppercase">STATION CIRCUITS ROTATION MATRIX</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-white mt-1 uppercase italic leading-none">{sessionTitle}</h1>
                </div>

                {/* 중앙: 대형 로테이션 카운터 */}
                <div className="text-center">
                    <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">CURRENT STATION ROUND</span>
                    <div className="text-3xl font-black text-[#FF6B00] tracking-tight mt-0.5">
                        ROUND {currentRound} <span className="text-white/20 font-medium text-xl">/ {totalRounds}</span>
                    </div>
                </div>

                {/* 우측: 초대형 자이언트 카운트다운 타이머 */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold block">{isRunning ? 'STATION TIME RUNNING' : 'STATION TIME PAUSED'}</span>
                        <span className="text-[9px] text-[#FF6B00]/70 font-extrabold uppercase tracking-wider mt-0.5">5 MINS ROTATION CYCLE</span>
                    </div>
                    <div 
                        className={`px-6 py-2.5 rounded-2xl flex items-center justify-center min-w-[200px] border transition-all duration-300 ${
                            timerDanger 
                                ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse scale-105 shadow-[0_0_30px_rgba(239,68,68,0.15)]' 
                                : isRunning 
                                    ? 'bg-[#FF6B00]/5 border-[#FF6B00]/30 text-[#FF6B00]' 
                                    : 'bg-white/5 border-white/10 text-white/70'
                        }`}
                    >
                        <span className="text-5xl font-black font-mono tracking-tight leading-none tabular-nums">
                            {formatDisplayTime(displaySeconds)}
                        </span>
                    </div>
                </div>
            </header>

            {/* 2. BODY GRID (6분할 WOD 스테이션 매트릭스) */}
            <div className="flex-1 p-10 grid grid-cols-3 gap-6 z-10 relative overflow-hidden min-h-0 select-none">
                {Array.from({ length: totalRounds }).map((_, stationIdx) => {
                    const movement = movements[stationIdx];
                    // 해당 스테이션에 배정된 팀
                    const currentTeam = teams.find(t => t.current_station_idx === stationIdx);

                    return (
                        <div
                            key={stationIdx}
                            className="rounded-3xl border flex flex-col justify-between p-6 transition-all duration-500 relative overflow-hidden min-h-0"
                            style={{
                                background: currentTeam ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.005)',
                                borderColor: currentTeam ? 'rgba(255, 107, 0, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                                boxShadow: currentTeam ? '0 0 25px rgba(255, 107, 0, 0.03)' : 'none',
                            }}
                        >
                            {/* 스테이션 인덱스 워터마크 */}
                            <div className="absolute right-4 bottom-[-15px] text-[100px] font-black text-white/[0.008] pointer-events-none select-none z-0">
                                {stationIdx + 1}
                            </div>

                            {/* 탑: 운동 설명 */}
                            <div className="relative z-10">
                                <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-4">
                                    <span className="text-xs font-black text-[#FF6B00] uppercase tracking-wider">STATION {stationIdx + 1}</span>
                                    {currentTeam && (
                                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] tracking-widest uppercase">
                                            {currentTeam.name}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight line-clamp-1">
                                    {movement?.name || movement?.custom_label || '운동 미배정'}
                                </h3>
                                
                                {/* 운동 세부 목표치 (값/Rx) */}
                                {(movement?.target_value || movement?.load_male_rx || movement?.load_female_rx) ? (
                                    <div className="flex items-center gap-4 mt-3 text-xs text-white/50 font-bold uppercase tracking-wider">
                                        {movement.target_value && (
                                            <span className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-lg">
                                                🎯 {movement.target_value} {movement.target_unit ?? 'reps'}
                                            </span>
                                        )}
                                        {(movement.load_male_rx || movement.load_female_rx) && (
                                            <span className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-lg">
                                                🏋️ {movement.load_male_rx ? `♂ ${movement.load_male_rx}` : ''} {movement.load_female_rx ? `· ♀ ${movement.load_female_rx}` : ''}
                                            </span>
                                        )}
                                    </div>
                                ) : null}
                            </div>

                            {/* 바텀: 해당 스테이션 배정 팀원 리스트 (슬라이딩 CSS 스왑 트랜지션 연출) */}
                            <div className="relative z-10 mt-6 min-h-[50px]">
                                {currentTeam && currentTeam.members.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2 transition-all duration-500 animate-slideSwap">
                                        {currentTeam.members.map((member) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] shadow-md transition-all duration-300"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-[#FF6B00]/20 flex items-center justify-center text-xs font-black text-[#FF6B00] overflow-hidden flex-shrink-0">
                                                    {member.avatar_url ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        member.name.slice(0, 1)
                                                    )}
                                                </div>
                                                <span className="text-xs font-extrabold text-white/80 line-clamp-1">{member.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center text-xs font-bold text-white/10 uppercase tracking-widest py-4 border border-dashed border-white/5 rounded-2xl">
                                        Empty Station
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 3. ROTATE! 전면 시각 펄스 플래시 오버레이 */}
            {showRotateOverlay && (
                <div className="fixed inset-0 z-[99] bg-red-600 flex flex-col items-center justify-center animate-rotateOverlayFlash">
                    <h1 className="text-9xl font-black text-black tracking-widest uppercase italic animate-rotateOverlayText scale-110">
                        ROTATE!
                    </h1>
                    <p className="text-2xl font-black text-black/60 tracking-wider uppercase mt-4">
                        다음 스테이션으로 신속하게 이동하세요!
                    </p>
                </div>
            )}

            {/* 4. BOTTOM FOOTER (엠비언트 하단 바) */}
            <footer className="px-10 py-4 border-t border-white/[0.05] bg-white/[0.005] flex justify-between items-center z-10 relative flex-shrink-0">
                <span className="text-[10px] font-black tracking-[0.3em] text-white/10 uppercase">
                    BCL FITNESS • STATION ROTATION HUD BROADCAST
                </span>
                <span className="text-[9px] text-[#FF6B00]/40 font-extrabold uppercase tracking-widest">
                    SYSTEM OK • REALTIME BROADCAST ENGINE ACTIVE
                </span>
            </footer>

            {/* 엠비언트 주황색 안개 글로우 */}
            <div className="fixed inset-0 bg-radial-glow opacity-30 pointer-events-none z-0" />

            {/* CSS 모션 그래픽 스타일 추가 */}
            <style>{`
                .bg-radial-glow {
                    background: radial-gradient(ellipse 70% 60% at 50% -20%, rgba(255,107,0,0.06) 0%, transparent 70%);
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes rotateOverlayFlash {
                    0%, 100% { background-color: rgb(239, 68, 68); }
                    50% { background-color: rgb(220, 38, 38); }
                }

                @keyframes rotateOverlayText {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.15); opacity: 0.8; }
                }

                /* 슬라이딩 스왑 부드러운 트랜지션 애니메이션 */
                .animate-slideSwap {
                    animation: slideSwap 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }

                @keyframes slideSwap {
                    0% {
                        opacity: 0;
                        transform: translateX(-40px) scale(0.95);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }

                .animate-fadeIn {
                    animation: fadeIn 0.4s ease-out forwards;
                }

                .animate-rotateOverlayFlash {
                    animation: rotateOverlayFlash 0.5s infinite;
                }

                .animate-rotateOverlayText {
                    animation: rotateOverlayText 1s infinite ease-in-out;
                }
            `}</style>
        </main>
    );
}

export default function ClassRotationHudPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-[#030305] text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-[#FF6B00] mx-auto mb-4"></div>
                    <p className="text-white/40 text-xs tracking-widest font-black uppercase">Loading rotation HUD Matrix...</p>
                </div>
            </div>
        }>
            <ClassRotationHudContent />
        </Suspense>
    );
}
