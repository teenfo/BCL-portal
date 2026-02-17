'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconCalendar } from '@/components/icons/AdminIcons';

interface Session {
    id: string;
    title: string;
    coach_name: string;
    coach_id: string;
    start_time: string;
    end_time: string;
    capacity: number;
    current_bookings: number;
    intensity_level: string;
    status: string;
    wod_description?: string;
}

interface SessionForm {
    title: string;
    coach_id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    capacity: number;
    intensity_level: string;
    wod_description: string;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 06:00 ~ 20:00
const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

const INTENSITY_CONFIG: Record<string, { color: string; label: string }> = {
    beginner: { color: '#22C55E', label: 'Beginner' },
    intermediate: { color: '#F59E0B', label: 'Intermediate' },
    advanced: { color: '#EF4444', label: 'Advanced' },
};

function generateMockSessions(weekStart: Date): Session[] {
    const names = [
        'CrossFit WOD', 'Olympic Lifting', 'Gymnastics', 'Endurance',
        'HIIT Blast', 'Mobility Flow', 'Open Gym', 'Rowing Clinic',
        'Strongman', 'Barbell Club', 'Core & Conditioning', 'Stretch & Recover'
    ];
    const coaches = [
        { id: 'c1', name: 'Coach Kim' },
        { id: 'c2', name: 'Coach Park' },
        { id: 'c3', name: 'Coach Lee' },
        { id: 'c4', name: 'Coach Choi' },
    ];
    const intensities = ['beginner', 'intermediate', 'advanced'];
    const sessions: Session[] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayOffset);
        const dayOfWeek = date.getDay();

        // 일요일에는 적은 수업, 토요일/평일에는 다양한 시간대
        const slotCount = dayOfWeek === 0 ? 2 : dayOfWeek === 6 ? 4 : 5;
        const startHours = dayOfWeek === 0 ? [9, 11] : dayOfWeek === 6
            ? [8, 10, 14, 16]
            : [6, 7, 9, 17, 19];

        for (let s = 0; s < slotCount; s++) {
            const hour = startHours[s];
            const coach = coaches[Math.floor(Math.random() * coaches.length)];
            const cap = [12, 15, 20, 25][Math.floor(Math.random() * 4)];
            const booked = Math.floor(Math.random() * (cap + 1));

            sessions.push({
                id: `mock-${dayOffset}-${s}`,
                title: names[Math.floor(Math.random() * names.length)],
                coach_name: coach.name,
                coach_id: coach.id,
                start_time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0).toISOString(),
                end_time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour + 1, 0).toISOString(),
                capacity: cap,
                current_bookings: booked,
                intensity_level: intensities[Math.floor(Math.random() * 3)],
                status: 'scheduled',
            });
        }
    }
    return sessions;
}

function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatWeekLabel(weekStart: Date): string {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${fmt(weekStart)} — ${fmt(end)}`;
}

export default function SchedulePage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
    const [showModal, setShowModal] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [coachConflict, setCoachConflict] = useState<string | null>(null);

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [weekStart]);

    const emptyForm: SessionForm = {
        title: '',
        coach_id: '',
        session_date: currentDate.toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '10:00',
        capacity: 15,
        intensity_level: 'intermediate',
        wod_description: '',
    };
    const [form, setForm] = useState<SessionForm>(emptyForm);

    const loadSessions = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        const rangeStart = new Date(weekStart);
        const rangeEnd = new Date(weekStart);
        rangeEnd.setDate(rangeEnd.getDate() + 7);

        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .gte('start_time', rangeStart.toISOString())
            .lte('start_time', rangeEnd.toISOString())
            .order('start_time', { ascending: true });

        if (error || !data || data.length === 0) {
            setSessions(generateMockSessions(weekStart));
        } else {
            setSessions(data.map((s: Record<string, unknown>) => ({
                id: s.id as string,
                title: (s.title as string) || '',
                coach_name: 'Coach',
                coach_id: (s.coach_id as string) || '',
                start_time: s.start_time as string,
                end_time: s.end_time as string,
                capacity: (s.capacity as number) || 15,
                current_bookings: 0,
                intensity_level: (s.intensity_level as string) || 'intermediate',
                status: (s.status as string) || 'scheduled',
                wod_description: (s.wod_description as string) || '',
            })));
        }
        setLoading(false);
    }, [weekStart]);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    // Navigate weeks/days
    function navigatePrev() {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1));
        setCurrentDate(d);
    }
    function navigateNext() {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1));
        setCurrentDate(d);
    }
    function goToday() {
        setCurrentDate(new Date());
    }

    // Sessions for a specific day
    function getSessionsForDay(day: Date): Session[] {
        return sessions.filter((s) => {
            const sd = new Date(s.start_time);
            return (
                sd.getFullYear() === day.getFullYear() &&
                sd.getMonth() === day.getMonth() &&
                sd.getDate() === day.getDate()
            );
        });
    }

    // Get session for a specific day + hour cell
    function getSessionForCell(day: Date, hour: number): Session | undefined {
        return sessions.find((s) => {
            const sd = new Date(s.start_time);
            return (
                sd.getFullYear() === day.getFullYear() &&
                sd.getMonth() === day.getMonth() &&
                sd.getDate() === day.getDate() &&
                sd.getHours() === hour
            );
        });
    }

    // Check coach conflict
    function checkCoachConflict(coachId: string, date: string, startTime: string, endTime: string, excludeId?: string): string | null {
        if (!coachId) return null;
        const conflicting = sessions.find((s) => {
            if (excludeId && s.id === excludeId) return false;
            if (s.coach_id !== coachId) return false;
            const sd = new Date(s.start_time);
            const sessionDate = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`;
            if (sessionDate !== date) return false;
            const sStart = `${String(sd.getHours()).padStart(2, '0')}:${String(sd.getMinutes()).padStart(2, '0')}`;
            const sEnd = new Date(s.end_time);
            const sEndStr = `${String(sEnd.getHours()).padStart(2, '0')}:${String(sEnd.getMinutes()).padStart(2, '0')}`;
            return startTime < sEndStr && endTime > sStart;
        });
        if (conflicting) return `해당 코치는 이미 ${new Date(conflicting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}에 "${conflicting.title}" 수업이 배정되어 있습니다.`;
        return null;
    }

    function openCreateModal(day?: Date, hour?: number) {
        setEditingSession(null);
        const d = day || currentDate;
        setForm({
            ...emptyForm,
            session_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            start_time: hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : '09:00',
            end_time: hour !== undefined ? `${String(hour + 1).padStart(2, '0')}:00` : '10:00',
        });
        setCoachConflict(null);
        setShowModal(true);
    }

    function openEditModal(session: Session) {
        setEditingSession(session);
        const sd = new Date(session.start_time);
        const ed = new Date(session.end_time);
        setForm({
            title: session.title,
            coach_id: session.coach_id,
            session_date: `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`,
            start_time: `${String(sd.getHours()).padStart(2, '0')}:${String(sd.getMinutes()).padStart(2, '0')}`,
            end_time: `${String(ed.getHours()).padStart(2, '0')}:${String(ed.getMinutes()).padStart(2, '0')}`,
            capacity: session.capacity,
            intensity_level: session.intensity_level,
            wod_description: session.wod_description || '',
        });
        setCoachConflict(null);
        setShowModal(true);
    }

    async function saveSession() {
        // Check coach conflict
        const conflict = checkCoachConflict(form.coach_id, form.session_date, form.start_time, form.end_time, editingSession?.id);
        if (conflict) {
            setCoachConflict(conflict);
            return;
        }

        const supabase = createClient();
        const startDt = new Date(`${form.session_date}T${form.start_time}:00`);
        const endDt = new Date(`${form.session_date}T${form.end_time}:00`);

        const payload = {
            title: form.title,
            session_date: form.session_date,
            start_time: startDt.toISOString(),
            end_time: endDt.toISOString(),
            capacity: form.capacity,
            intensity_level: form.intensity_level,
            wod_description: form.wod_description || null,
            status: 'scheduled',
        };

        if (editingSession) {
            await supabase.from('sessions').update(payload).eq('id', editingSession.id);
        } else {
            await supabase.from('sessions').insert(payload);
        }

        setShowModal(false);
        loadSessions();
    }

    async function deleteSession(id: string) {
        if (!confirm('이 수업을 삭제하시겠습니까?')) return;
        const supabase = createClient();
        await supabase.from('sessions').delete().eq('id', id);
        loadSessions();
    }

    // Helper: is today
    function isToday(d: Date) {
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    }

    // --- KPI summary ---
    const totalSessions = sessions.length;
    const totalBookings = sessions.reduce((a, s) => a + s.current_bookings, 0);
    const totalCapacity = sessions.reduce((a, s) => a + s.capacity, 0);
    const avgFillRate = totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;

    return (
        <div className="transition-all duration-700">
            <AdminPageHeader
                category="Operations"
                title="Class Schedule"
                subtitle="Management"
                actions={<button onClick={() => openCreateModal()} className="admin-action-btn">+ 수업 등록</button>}
            />

            <div className="p-8 lg:p-10">

                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Sessions', value: totalSessions, sub: 'THIS WEEK' },
                        { label: 'Total Bookings', value: totalBookings, sub: 'RESERVED' },
                        { label: 'Fill Rate', value: `${avgFillRate}%`, sub: 'AVG CAPACITY' },
                        { label: 'Total Capacity', value: totalCapacity, sub: 'AVAILABLE SLOTS' },
                    ].map((kpi) => (
                        <div key={kpi.label} className="glass-card p-5 flex flex-col items-center">
                            <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-2">{kpi.label}</p>
                            <p className="text-2xl font-black text-white">{kpi.value}</p>
                            <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mt-1">{kpi.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Toolbar: View Toggle + Navigation */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {(['week', 'day'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className="px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                    style={viewMode === mode
                                        ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 0 12px rgba(255,107,0,0.3)' }
                                        : { color: 'rgba(255,255,255,0.4)' }
                                    }
                                >
                                    {mode === 'week' ? '주간' : '일간'}
                                </button>
                            ))}
                        </div>
                        {/* Navigation */}
                        <button onClick={navigatePrev} className="px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm">◀</button>
                        <button onClick={goToday} className="px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all">오늘</button>
                        <button onClick={navigateNext} className="px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm">▶</button>
                    </div>
                    <div className="text-sm font-black text-white uppercase tracking-tight">
                        {viewMode === 'week'
                            ? formatWeekLabel(weekStart)
                            : `${currentDate.getFullYear()}.${String(currentDate.getMonth() + 1).padStart(2, '0')}.${String(currentDate.getDate()).padStart(2, '0')} (${DAYS_KR[currentDate.getDay()]})`
                        }
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-64">
                        <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                    </div>
                ) : viewMode === 'week' ? (
                    /* ===== WEEKLY CALENDAR VIEW ===== */
                    <div className="glass-card overflow-hidden">
                        {/* Header Row */}
                        <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
                            <div className="p-3 border-b border-r border-white/[0.04]" />
                            {weekDays.map((day, i) => {
                                const td = isToday(day);
                                return (
                                    <div
                                        key={i}
                                        className={`p-3 text-center border-b border-r border-white/[0.04] ${td ? 'bg-[var(--primary)]/5' : ''}`}
                                    >
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{DAYS_KR[day.getDay()]}</p>
                                        <p className={`text-lg font-black ${td ? 'text-[var(--primary)]' : 'text-white/80'}`}>{day.getDate()}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Time Grid */}
                        <div className="max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                            {HOURS.map((hour) => (
                                <div key={hour} className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
                                    {/* Time label */}
                                    <div className="p-2 text-right pr-3 border-r border-white/[0.04] flex items-start justify-end">
                                        <span className="text-[9px] font-bold text-white/20">{String(hour).padStart(2, '0')}:00</span>
                                    </div>
                                    {/* Day cells */}
                                    {weekDays.map((day, di) => {
                                        const session = getSessionForCell(day, hour);
                                        const td = isToday(day);
                                        return (
                                            <div
                                                key={di}
                                                className={`min-h-[56px] border-b border-r border-white/[0.03] relative cursor-pointer transition-all hover:bg-white/[0.02] ${td ? 'bg-[var(--primary)]/[0.02]' : ''}`}
                                                onClick={() => !session && openCreateModal(day, hour)}
                                            >
                                                {session && (
                                                    <div
                                                        className="absolute inset-1 rounded-lg p-2 cursor-pointer transition-all hover:scale-[1.02] group/cell overflow-hidden"
                                                        style={{
                                                            background: `${INTENSITY_CONFIG[session.intensity_level]?.color || '#3B82F6'}15`,
                                                            borderLeft: `3px solid ${INTENSITY_CONFIG[session.intensity_level]?.color || '#3B82F6'}`,
                                                        }}
                                                        onClick={(e) => { e.stopPropagation(); openEditModal(session); }}
                                                    >
                                                        <p className="text-[9px] font-black text-white truncate leading-tight">{session.title}</p>
                                                        <p className="text-[8px] text-white/40 truncate mt-0.5">{session.coach_name}</p>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full" style={{ width: `${(session.current_bookings / session.capacity) * 100}%`, background: INTENSITY_CONFIG[session.intensity_level]?.color || '#3B82F6' }} />
                                                            </div>
                                                            <span className="text-[7px] font-bold text-white/30">{session.current_bookings}/{session.capacity}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* ===== DAILY LIST VIEW ===== */
                    <div className="space-y-3">
                        {(() => {
                            const daySessions = getSessionsForDay(currentDate).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                            if (daySessions.length === 0) {
                                return (
                                    <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-40">
                                        <span className="text-4xl mb-4"><IconCalendar size={40} /></span>
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">No sessions scheduled for this date</p>
                                        <button onClick={() => openCreateModal(currentDate)} className="mt-6 admin-action-btn opacity-100">+ 수업 등록</button>
                                    </div>
                                );
                            }
                            return daySessions.map((session) => {
                                const ic = INTENSITY_CONFIG[session.intensity_level] || INTENSITY_CONFIG.intermediate;
                                const fill = session.capacity > 0 ? (session.current_bookings / session.capacity) * 100 : 0;
                                return (
                                    <div key={session.id} className="grid grid-cols-12 gap-6 items-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-white/10 transition-all group">
                                        {/* Time */}
                                        <div className="col-span-2">
                                            <p className="text-lg font-black text-white">
                                                {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </p>
                                            <p className="text-[9px] text-white/30 mt-0.5">
                                                ~ {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </p>
                                        </div>
                                        {/* Info */}
                                        <div className="col-span-3">
                                            <h4 className="text-sm font-bold text-white group-hover:text-[var(--primary)] transition-colors uppercase tracking-tight">{session.title}</h4>
                                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">{session.coach_name}</p>
                                        </div>
                                        {/* Intensity */}
                                        <div className="col-span-1">
                                            <span className="px-2 py-1 rounded text-[8px] font-black uppercase" style={{ background: `${ic.color}15`, color: ic.color }}>
                                                {ic.label}
                                            </span>
                                        </div>
                                        {/* Capacity */}
                                        <div className="col-span-3">
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                                                <div className="h-full bg-[var(--primary)] rounded-full transition-all" style={{ width: `${fill}%` }} />
                                            </div>
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                                                {session.current_bookings} / {session.capacity} RESERVED
                                            </p>
                                        </div>
                                        {/* Actions */}
                                        <div className="col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEditModal(session)} className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-[9px] font-black text-white hover:border-[var(--primary)]/50 transition-all uppercase tracking-widest">
                                                편집
                                            </button>
                                            <button onClick={() => deleteSession(session.id)} className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[9px] font-black text-red-400 hover:bg-red-500/20 transition-all uppercase tracking-widest">
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )}
            </div>

            {/* ===== Create/Edit Modal ===== */}
            <AdminModal show={showModal} onClose={() => setShowModal(false)} title={editingSession ? '수업 편집' : '새 수업 등록'} subtitle="Session details">
                <div className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">수업 이름</label>
                        <input
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="예: CrossFit WOD"
                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">날짜</label>
                            <input
                                type="date"
                                value={form.session_date}
                                onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                                className="admin-search-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">코치 ID</label>
                            <input
                                value={form.coach_id}
                                onChange={(e) => {
                                    const newId = e.target.value;
                                    setForm({ ...form, coach_id: newId });
                                    setCoachConflict(checkCoachConflict(newId, form.session_date, form.start_time, form.end_time, editingSession?.id));
                                }}
                                placeholder="예: c1"
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                    </div>

                    {/* Coach Conflict Warning */}
                    {coachConflict && (
                        <div className="p-3 rounded-xl text-[10px] font-bold text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            ⚠️ {coachConflict}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">시작 시간</label>
                            <input
                                type="time"
                                value={form.start_time}
                                onChange={(e) => {
                                    setForm({ ...form, start_time: e.target.value });
                                    setCoachConflict(checkCoachConflict(form.coach_id, form.session_date, e.target.value, form.end_time, editingSession?.id));
                                }}
                                className="admin-search-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">종료 시간</label>
                            <input
                                type="time"
                                value={form.end_time}
                                onChange={(e) => {
                                    setForm({ ...form, end_time: e.target.value });
                                    setCoachConflict(checkCoachConflict(form.coach_id, form.session_date, form.start_time, e.target.value, editingSession?.id));
                                }}
                                className="admin-search-input w-full"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">정원</label>
                            <input
                                type="number"
                                value={form.capacity}
                                onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 15 })}
                                min={1}
                                max={100}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">강도</label>
                            <select
                                value={form.intensity_level}
                                onChange={(e) => setForm({ ...form, intensity_level: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">WOD 설명 (선택)</label>
                        <textarea
                            value={form.wod_description}
                            onChange={(e) => setForm({ ...form, wod_description: e.target.value })}
                            rows={3}
                            placeholder="오늘의 운동 설명"
                            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all resize-none"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        취소
                    </button>
                    <button
                        onClick={saveSession}
                        disabled={!form.title || !!coachConflict}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-30"
                        style={{ background: 'var(--primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
                    >
                        {editingSession ? '수정 저장' : '등록'}
                    </button>
                </div>
            </AdminModal>
        </div>
    );
}
