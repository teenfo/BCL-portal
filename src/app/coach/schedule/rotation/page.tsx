'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import { useToast } from '@/components/ui/Toast';

interface Member {
    id: string;
    name: string;
    avatar_url: string | null;
}

interface Booking {
    member_id: string;
    attendance_outcome: string;
    members: Member | null;
}

interface Movement {
    name?: string;
    custom_label?: string | null;
    target_value?: number | null;
    target_unit?: string | null;
}

interface Team {
    id: string;
    name: string;
    members: Member[];
    current_station_idx: number; // 0 ~ 5
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

function CoachRotationConsoleContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get('session_id');
    const { success, error: toastError } = useToast();
    const supabase = useRef(createClient()).current;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [facilityId, setFacilityId] = useState<string | null>(null);
    const [sessionTitle, setSessionTitle] = useState('세션 정보 로드 중...');
    
    // WOD Movements
    const [movements, setMovements] = useState<Movement[]>([]);
    
    // Attendee Pool (아직 팀에 배정되지 않은 대기자)
    const [attendees, setAttendees] = useState<Member[]>([]);
    
    // Teams (A ~ F, 6개 팀 기본)
    const [teams, setTeams] = useState<Team[]>([]);

    // Timer / Control States
    const [currentRound, setCurrentRound] = useState(1);
    const [totalRounds, setTotalRounds] = useState(6);
    const [secondsPerRound, setSecondsPerRound] = useState(300); // 디폴트 5분
    const [isRunning, setIsRunning] = useState(false);
    const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null);
    const [pausedRemainingSeconds, setPausedRemainingSeconds] = useState<number | null>(300);
    const [displaySeconds, setDisplaySeconds] = useState(300);

    // 드래그 앤 드롭용 상태
    const [draggedMember, setDraggedMember] = useState<{ member: Member; fromTeamId: string | null } | null>(null);

    // Realtime Channel
    const channelRef = useRef<any>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const prevSecondsRef = useRef(300);

    // 데이터 로드
    const loadSessionData = useCallback(async () => {
        if (!sessionId) return;
        setLoading(true);
        try {
            // 1. 세션 기본 정보 가져오기
            const { data: session } = await query('sessions')
                .select('title, facility_id')
                .eq('id', sessionId)
                .single();
            
            if (session) {
                setSessionTitle(session.title);
                setFacilityId(session.facility_id);
            }

            // 2. WOD 운동 정보 가져오기
            const { data: sessionWod } = await query('session_wods')
                .select('format_override, time_cap_override, movements_snapshot')
                .eq('session_id', sessionId)
                .single();

            let roundDuration = 300; // 기본 5분
            let stationCount = 6;
            let loadedMovements: Movement[] = [];

            if (sessionWod) {
                loadedMovements = (sessionWod.movements_snapshot as Movement[]) || [];
                setMovements(loadedMovements);
                stationCount = Math.max(loadedMovements.length, 1);
                setTotalRounds(stationCount);
                
                if (sessionWod.format_override === 'station_circuit') {
                    // 전체 타임캡 분 (기본 30분, time_cap_override 또는 30분)
                    const totalCapMinutes = sessionWod.time_cap_override || 30;
                    // 동작당 배정 시간(초) = (전체 타임캡 * 60) / 운동 개수
                    roundDuration = Math.floor((totalCapMinutes * 60) / stationCount);
                    setSecondsPerRound(roundDuration);
                    setPausedRemainingSeconds(roundDuration);
                    setDisplaySeconds(roundDuration);
                }
            }

            // 3. 참석 확정/체크인 회원 가져오기
            const { data: bookingsData } = await query('bookings')
                .select('member_id, attendance_outcome, members(id, name, avatar_url)')
                .eq('session_id', sessionId)
                .neq('status', 'cancelled');
            
            const bookedMembers = (bookingsData as unknown as Booking[])
                ?.map(b => b.members)
                .filter((m): m is Member => m !== null) || [];

            // 4. 기존 로테이션 상태가 DB에 있는지 확인
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
                
                // 배정된 팀 정보 복원
                const restoredTeams = state.team_assignments || [];
                setTeams(restoredTeams);

                // 배정되지 않은 회원 필터링
                const assignedIds = new Set(restoredTeams.flatMap(t => t.members.map(m => m.id)));
                const unassigned = bookedMembers.filter(m => !assignedIds.has(m.id));
                setAttendees(unassigned);

                // 로컬 displaySeconds 동기화
                if (state.is_running && state.timer_started_at) {
                    const elapsed = Math.floor((Date.now() - new Date(state.timer_started_at).getTime()) / 1000);
                    const remaining = Math.max((state.paused_remaining_seconds ?? state.seconds_per_round) - elapsed, 0);
                    setDisplaySeconds(remaining);
                } else {
                    setDisplaySeconds(state.paused_remaining_seconds ?? state.seconds_per_round);
                }
            } else {
                // 초기 팀 A ~ F (6개 팀) 생성
                const initialTeams: Team[] = Array.from({ length: stationCount }, (_, i) => ({
                    id: `team-${i}`,
                    name: `Team ${String.fromCharCode(65 + i)}`, // A, B, C, D...
                    members: [],
                    current_station_idx: i,
                }));
                setTeams(initialTeams);
                setAttendees(bookedMembers);
                setPausedRemainingSeconds(roundDuration);
                setDisplaySeconds(roundDuration);
            }
        } catch (e: any) {
            toastError('데이터 로드 실패: ' + (e.message || e));
        }
        setLoading(false);
    }, [sessionId, toastError]);

    useEffect(() => {
        if (sessionId) {
            void loadSessionData();
        }
    }, [sessionId, loadSessionData]);

    // Supabase Realtime Broadcast 채널 연결 및 리액티브 트리거 설정
    useEffect(() => {
        if (!sessionId) return;

        // 초저지연 브로드캐스트 채널 생성
        const channel = supabase.channel(`session-rotation:${sessionId}`, {
            config: {
                broadcast: { self: true },
            },
        });

        channel
            .on('broadcast', { event: 'control' }, (payload: any) => {
                const { action, state } = payload.payload;
                if (action === 'update_timer' || action === 'update_state') {
                    setIsRunning(state.is_running);
                    setTimerStartedAt(state.timer_started_at);
                    setPausedRemainingSeconds(state.paused_remaining_seconds);
                    setCurrentRound(state.current_round);
                    if (state.team_assignments) {
                        setTeams(state.team_assignments);
                    }
                    
                    if (state.is_running && state.timer_started_at) {
                        const elapsed = Math.floor((Date.now() - new Date(state.timer_started_at).getTime()) / 1000);
                        const remaining = Math.max((state.paused_remaining_seconds ?? state.seconds_per_round) - elapsed, 0);
                        setDisplaySeconds(remaining);
                    } else {
                        setDisplaySeconds(state.paused_remaining_seconds ?? state.seconds_per_round);
                    }
                }
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [sessionId, supabase]);

    // DB에 로테이션 상태 저장 및 HUD 브로드캐스트
    const saveStateToDb = async (
        running: boolean,
        startedAt: string | null,
        remainingSec: number | null,
        round: number,
        updatedTeams: Team[]
    ) => {
        if (!sessionId || !facilityId) return;

        const payload = {
            session_id: sessionId,
            facility_id: facilityId,
            current_round: round,
            total_rounds: totalRounds,
            seconds_per_round: secondsPerRound,
            is_running: running,
            timer_started_at: startedAt,
            paused_remaining_seconds: remainingSec,
            team_assignments: updatedTeams,
            updated_at: new Date().toISOString(),
        };

        setSaving(true);
        try {
            // upsert 실행 (session_id가 primary key)
            const { error } = await query('session_rotation_states').upsert(payload);
            if (error) throw error;

            // 실시간 브로드캐스트 전송 (0.05초 만에 TV HUD 수신 동기화)
            if (channelRef.current) {
                await channelRef.current.send({
                    type: 'broadcast',
                    event: 'control',
                    payload: {
                        action: 'update_state',
                        state: payload,
                    },
                });
            }
        } catch (e: any) {
            toastError('상태 업데이트 실패: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    // 자동 조 편성 (4명씩 균등 분할 배정)
    const handleAutoAssign = () => {
        if (attendees.length === 0 && teams.every(t => t.members.length === 0)) {
            toastError('조 편성할 회원이 없습니다.');
            return;
        }

        // 전체 회원 모으기
        const allMembers = [...attendees, ...teams.flatMap(t => t.members)];
        
        // 무작위 셔플
        const shuffled = [...allMembers].sort(() => Math.random() - 0.5);

        // 팀별 균등 배정 (예: 6개 팀이 있으면 라운드 로빈 순서로 하나씩 배정)
        const updatedTeams = teams.map(t => ({ ...t, members: [] as Member[] }));
        shuffled.forEach((m, idx) => {
            const teamIdx = idx % updatedTeams.length;
            updatedTeams[teamIdx].members.push(m);
        });

        setTeams(updatedTeams);
        setAttendees([]);
        
        // DB 저장
        void saveStateToDb(isRunning, timerStartedAt, pausedRemainingSeconds, currentRound, updatedTeams);
        success('4인 1조 로테이션 팀이 자동 편성되었습니다.');
    };

    // 조 편성 초기화
    const handleResetAssignments = () => {
        const allMembers = [...attendees, ...teams.flatMap(t => t.members)];
        const updatedTeams = teams.map(t => ({ ...t, members: [] as Member[] }));
        
        setTeams(updatedTeams);
        setAttendees(allMembers);

        void saveStateToDb(isRunning, timerStartedAt, pausedRemainingSeconds, currentRound, updatedTeams);
        success('조 편성이 초기화되었습니다.');
    };

    // 드래그 시작
    const handleDragStart = (member: Member, fromTeamId: string | null) => {
        setDraggedMember({ member, fromTeamId });
    };

    // 드롭 대상 위에 오버
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // 특정 영역에 드롭
    const handleDrop = (toTeamId: string | null) => {
        if (!draggedMember) return;
        const { member, fromTeamId } = draggedMember;

        // 동일한 곳에 드롭하면 무시
        if (fromTeamId === toTeamId) {
            setDraggedMember(null);
            return;
        }

        let updatedAttendees = [...attendees];
        let updatedTeams = teams.map(t => ({ ...t, members: [...t.members] }));

        // 1. 기존 위치에서 제거
        if (fromTeamId === null) {
            updatedAttendees = updatedAttendees.filter(m => m.id !== member.id);
        } else {
            updatedTeams = updatedTeams.map(t => {
                if (t.id === fromTeamId) {
                    return { ...t, members: t.members.filter(m => m.id !== member.id) };
                }
                return t;
            });
        }

        // 2. 새 위치에 추가
        if (toTeamId === null) {
            updatedAttendees.push(member);
        } else {
            updatedTeams = updatedTeams.map(t => {
                if (t.id === toTeamId) {
                    return { ...t, members: [...t.members, member] };
                }
                return t;
            });
        }

        setAttendees(updatedAttendees);
        setTeams(updatedTeams);
        setDraggedMember(null);

        // DB 및 실시간 동기화
        void saveStateToDb(isRunning, timerStartedAt, pausedRemainingSeconds, currentRound, updatedTeams);
    };

    // 클릭으로 대기풀 <-> 팀 간 수동 배정 (모바일 접근성 지원)
    const handleMemberClick = (member: Member, fromTeamId: string | null, toTeamId: string | null) => {
        let updatedAttendees = [...attendees];
        let updatedTeams = teams.map(t => ({ ...t, members: [...t.members] }));

        // 제거
        if (fromTeamId === null) {
            updatedAttendees = updatedAttendees.filter(m => m.id !== member.id);
        } else {
            updatedTeams = updatedTeams.map(t => {
                if (t.id === fromTeamId) {
                    return { ...t, members: t.members.filter(m => m.id !== member.id) };
                }
                return t;
            });
        }

        // 추가
        if (toTeamId === null) {
            updatedAttendees.push(member);
        } else {
            updatedTeams = updatedTeams.map(t => {
                if (t.id === toTeamId) {
                    return { ...t, members: [...t.members, member] };
                }
                return t;
            });
        }

        setAttendees(updatedAttendees);
        setTeams(updatedTeams);
        void saveStateToDb(isRunning, timerStartedAt, pausedRemainingSeconds, currentRound, updatedTeams);
    };

    // 자동 로테이션 (타이머 0초 완료 시 격발되는 비즈니스 엔진)
    const handleAutoRotate = useCallback((updatedTeams: Team[], round: number) => {
        const nextRound = round === totalRounds ? 1 : round + 1;
        
        // 각 팀의 배정 스테이션 인덱스를 1개씩 밀어서 할당
        const rotatedTeams = updatedTeams.map(t => ({
            ...t,
            current_station_idx: (t.current_station_idx + 1) % totalRounds,
        }));

        setCurrentRound(nextRound);
        setPausedRemainingSeconds(secondsPerRound);
        setDisplaySeconds(secondsPerRound);
        setIsRunning(false);
        setTimerStartedAt(null);

        // DB upsert & Broadcast 전송 (실시간 TV 전광판 HUD에 "ROTATE!" 경보와 스왑 모션 트리거)
        void saveStateToDb(false, null, secondsPerRound, nextRound, rotatedTeams);
    }, [totalRounds, secondsPerRound]);

    // 실시간 카운트다운 타이머 루프 (0.01초 단위의 정확한 리액티브 계산)
    useEffect(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        if (isRunning) {
            timerIntervalRef.current = setInterval(() => {
                if (timerStartedAt) {
                    const elapsed = Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000);
                    const baseSec = pausedRemainingSeconds ?? secondsPerRound;
                    const remaining = Math.max(baseSec - elapsed, 0);
                    
                    setDisplaySeconds(remaining);

                    // 0초 달성 시 자동 로테이션 격발
                    if (remaining === 0 && prevSecondsRef.current > 0) {
                        setIsRunning(false);
                        setTimerStartedAt(null);
                        handleAutoRotate(teams, currentRound);
                    }

                    prevSecondsRef.current = remaining;
                }
            }, 100);
        }

        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [isRunning, timerStartedAt, pausedRemainingSeconds, secondsPerRound, teams, currentRound, handleAutoRotate]);

    // 타이머 제어 함수군
    const handleStartTimer = () => {
        if (isRunning) return;
        const now = new Date().toISOString();
        const baseSec = pausedRemainingSeconds ?? secondsPerRound;
        setIsRunning(true);
        setTimerStartedAt(now);
        setDisplaySeconds(baseSec);
        void saveStateToDb(true, now, baseSec, currentRound, teams);
        success('타이머가 시작되었습니다.');
    };

    const handlePauseTimer = () => {
        if (!isRunning) return;
        
        // 경과 시간 계산
        let remaining = pausedRemainingSeconds ?? secondsPerRound;
        if (timerStartedAt) {
            const elapsed = Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000);
            remaining = Math.max(remaining - elapsed, 0);
        }

        setIsRunning(false);
        setTimerStartedAt(null);
        setPausedRemainingSeconds(remaining);
        setDisplaySeconds(remaining);
        void saveStateToDb(false, null, remaining, currentRound, teams);
        success('타이머가 일시정지되었습니다.');
    };

    const handleResetTimer = () => {
        setIsRunning(false);
        setTimerStartedAt(null);
        setPausedRemainingSeconds(secondsPerRound);
        setDisplaySeconds(secondsPerRound);
        void saveStateToDb(false, null, secondsPerRound, currentRound, teams);
        success('타이머가 초기화되었습니다.');
    };

    const formatDisplayTime = (totalSecs: number) => {
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 강제 로테이션 (팀들이 우측/하단 다음 운동으로 순환)
    const handleForceRotate = () => {
        const nextRound = currentRound === totalRounds ? 1 : currentRound + 1;
        
        // 각 팀의 배정 스테이션 인덱스를 1개씩 밀어서 할당
        const updatedTeams = teams.map(t => ({
            ...t,
            current_station_idx: (t.current_station_idx + 1) % totalRounds,
        }));

        setCurrentRound(nextRound);
        setPausedRemainingSeconds(secondsPerRound);
        setDisplaySeconds(secondsPerRound);
        setIsRunning(false);
        setTimerStartedAt(null);

        void saveStateToDb(false, null, secondsPerRound, nextRound, updatedTeams);
        success(`로테이션 실행! 라운드 ${nextRound}/${totalRounds}`);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#07070a] text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
                    <p className="text-white/60 text-sm font-bold">WOD 로테이션 콘솔 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (!sessionId) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#07070a] text-white p-6">
                <div className="text-center max-w-sm rounded-2xl bg-white/5 border border-white/10 p-6 glass-card">
                    <span className="material-symbols-outlined text-red-400 text-5xl mb-4">warning</span>
                    <h2 className="text-xl font-bold mb-2">세션 ID 누락</h2>
                    <p className="text-white/60 text-xs leading-relaxed mb-6">로테이션 리모컨을 작동하기 위해선 올바른 session_id 파라미터가 있어야 합니다.</p>
                    <button onClick={() => router.back()} className="admin-action-btn w-full">이전 화면으로</button>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#07070a] text-white flex flex-col font-sans overflow-x-hidden">
            {/* 상단 프리미엄 바 */}
            <header className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-1 rounded-lg hover:bg-white/5 text-white/70">
                        <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-sm font-black tracking-tight text-white">{sessionTitle}</h1>
                        <p className="text-[10px] text-[var(--primary)] uppercase tracking-wider font-extrabold mt-0.5">Circuit Station rotation remocon</p>
                    </div>
                </div>
                
                {/* 실시간 연동 HUD 뱃지 */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-[#FF6B00]/10 border border-[#FF6B00]/25 text-[#FF6B00]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-ping" />
                    <span>TV HUD CONNECTED</span>
                </div>
            </header>

            {/* 레이아웃 바디 */}
            <div className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 max-w-7xl mx-auto w-full">
                
                {/* 1. 스테이션 그리드 (팀 배정 매트릭스) */}
                <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-sm font-bold text-white/50 tracking-wider uppercase">Circuit Station Grid ({totalRounds})</h2>
                        <div className="flex gap-2">
                            <button onClick={handleAutoAssign} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FF6B00] text-black hover:bg-[#FF6B00]/90 transition-all shadow-lg shadow-[#FF6B00]/15">
                                🎲 자동 조 편성
                            </button>
                            <button onClick={handleResetAssignments} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/80">
                                리셋
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: totalRounds }).map((_, stationIdx) => {
                            const movement = movements[stationIdx];
                            // 해당 스테이션에 배치된 팀 찾기
                            const currentTeam = teams.find(t => t.current_station_idx === stationIdx);

                            return (
                                <div
                                    key={stationIdx}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(currentTeam?.id || null)}
                                    className="rounded-2xl p-4 transition-all relative overflow-hidden"
                                    style={{
                                        background: currentTeam ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                                        border: currentTeam ? '1px solid rgba(255, 107, 0, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                                    }}
                                >
                                    {/* 스테이션 헤더 */}
                                    <div className="flex items-start justify-between gap-3 mb-3 pb-2.5 border-b border-white/[0.04] relative z-10">
                                        <div>
                                            <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-wider">Station {stationIdx + 1}</span>
                                            <h3 className="text-base font-extrabold text-white mt-0.5 line-clamp-1">
                                                {movement?.name || movement?.custom_label || '운동 미정'}
                                            </h3>
                                        </div>
                                        {currentTeam && (
                                            <span className="text-[10px] font-black bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/30 px-2 py-0.5 rounded uppercase tracking-wider">
                                                {currentTeam.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* 배정된 조원 카드 덱 */}
                                    <div className="flex flex-col gap-2 relative z-10 min-h-[90px]">
                                        {currentTeam && currentTeam.members.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {currentTeam.members.map(member => (
                                                    <div
                                                        key={member.id}
                                                        draggable
                                                        onDragStart={() => handleDragStart(member, currentTeam.id)}
                                                        onClick={() => handleMemberClick(member, currentTeam.id, null)}
                                                        className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-grab active:cursor-grabbing hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
                                                    >
                                                        <div className="w-5 h-5 rounded-full bg-[#FF6B00]/20 flex items-center justify-center text-[10px] font-bold text-[#FF6B00] overflow-hidden">
                                                            {member.avatar_url ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                member.name.slice(0, 1)
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-bold text-white/80">{member.name}</span>
                                                        <span className="material-symbols-outlined text-[10px] text-white/30 ml-auto select-none">close</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full min-h-[90px] text-white/20 select-none">
                                                <span className="material-symbols-outlined text-xl">group_add</span>
                                                <span className="text-[10px] mt-1 font-medium">드래그해서 조원을 배치하세요</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 뒷배경 서킷 스테이션 인덱스 워터마크 */}
                                    <div className="absolute right-2 bottom-[-15px] text-[70px] font-black text-white/[0.01] pointer-events-none select-none z-0">
                                        {stationIdx + 1}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. 대기 회원 풀 & 리모컨 제어 보드 */}
                <div className="flex flex-col gap-6">
                    
                    {/* 타이머 리모컨 보드 */}
                    <div className="rounded-2xl p-5 bg-white/[0.02] border border-white/[0.08] glass-card flex flex-col gap-4">
                        <h3 className="text-xs font-black uppercase text-white/40 tracking-wider">HUD remote controller</h3>
                        
                        {/* 라운드 및 남은 시간 정보 */}
                        <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                            <div>
                                <span className="text-[10px] text-white/40 uppercase font-bold block">Round Rotation</span>
                                <div className="text-lg font-black text-white mt-1">
                                    ROUND {currentRound} <span className="text-white/30 font-medium">/ {totalRounds}</span>
                                </div>
                            </div>
                            
                            {/* 초대형 실시간 시간 표출 */}
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-white/40 uppercase font-bold block">Time Remaining</span>
                                <div className={`text-2xl font-mono font-black mt-0.5 tracking-tight ${displaySeconds <= 10 && displaySeconds > 0 ? 'text-red-500 animate-pulse' : 'text-[#FF6B00]'}`}>
                                    {formatDisplayTime(displaySeconds)}
                                </div>
                            </div>
                        </div>

                        {/* 강제 로테이션 전용 라인 배치 (공간 분리) */}
                        <div className="flex justify-end border-b border-white/[0.04] pb-2">
                            <button
                                onClick={handleForceRotate}
                                disabled={saving}
                                className="w-full py-2.5 rounded-xl text-xs font-black bg-white/5 border border-white/10 hover:bg-white/10 text-[var(--primary)] flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[15px]">rotate_right</span>
                                강제 로테이션 (ROTATE!)
                            </button>
                        </div>

                        {/* 리모컨 핵심 조작계 버튼 */}
                        <div className="grid grid-cols-3 gap-3">
                            {isRunning ? (
                                <button
                                    onClick={handlePauseTimer}
                                    disabled={saving}
                                    className="col-span-2 py-3.5 rounded-xl font-black text-sm bg-yellow-500 text-black hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <span className="material-symbols-outlined font-bold">pause</span>
                                    일시정지 (PAUSE)
                                </button>
                            ) : (
                                <button
                                    onClick={handleStartTimer}
                                    disabled={saving}
                                    className="col-span-2 py-3.5 rounded-xl font-black text-sm bg-[#FF6B00] text-black hover:bg-[#FF6B00]/90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-[#FF6B00]/15"
                                >
                                    <span className="material-symbols-outlined font-bold">play_arrow</span>
                                    타이머 가동 (START)
                                </button>
                            )}
                            <button
                                onClick={handleResetTimer}
                                disabled={saving}
                                className="py-3.5 rounded-xl font-black text-sm bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <span className="material-symbols-outlined font-bold">refresh</span>
                                초기화
                            </button>
                        </div>
                    </div>

                    {/* 대기 회원 풀 (출석 회원 대기소) */}
                    <div className="rounded-2xl p-5 bg-white/[0.02] border border-white/[0.08] glass-card flex-1 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase text-white/40 tracking-wider">Unassigned Members ({attendees.length})</h3>
                            <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 font-bold">TAP TO TEAM A</span>
                        </div>

                        <div
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(null)}
                            className="flex-1 min-h-[220px] rounded-xl bg-black/20 border border-dashed border-white/5 p-3 overflow-y-auto max-h-[400px]"
                        >
                            {attendees.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {attendees.map(member => (
                                        <div
                                            key={member.id}
                                            draggable
                                            onDragStart={() => handleDragStart(member, null)}
                                            onClick={() => handleMemberClick(member, null, 'team-0')} // 클릭 시 기본 Team A(team-0)으로 바로 배정
                                            className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] cursor-grab active:cursor-grabbing hover:bg-white/[0.05] hover:border-white/[0.1] transition-all"
                                        >
                                            <div className="w-5 h-5 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[10px] font-bold text-[#FF6B00] overflow-hidden">
                                                {member.avatar_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    member.name.slice(0, 1)
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-white/80">{member.name}</span>
                                            <span className="material-symbols-outlined text-[11px] text-[#FF6B00]/60 ml-auto select-none">add</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-white/20 select-none py-10">
                                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                                    <span className="text-xs mt-1 font-bold text-white/40">모든 회원이 배정되었습니다.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}

export default function CoachRotationConsolePage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-[#07070a] text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
                    <p className="text-white/60 text-sm font-bold">WOD 로테이션 콘솔 불러오는 중...</p>
                </div>
            </div>
        }>
            <CoachRotationConsoleContent />
        </Suspense>
    );
}
