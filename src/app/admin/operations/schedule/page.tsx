'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconCalendar } from '@/components/icons/AdminIcons';

interface Session {
    id: string;
    title: string;
    coach_name: string;
    coach_id: string;
    coach_ids?: string[];
    start_time: string;
    end_time: string;
    capacity: number;
    current_bookings: number;
    intensity_level: string;
    status: string;
    wod_description?: string;
    wod_template_id?: string;
    wod_time_cap?: number;
    wod_title?: string;
    wod_format?: string;
    wod_description_override?: string;
}

interface SessionForm {
    title: string;
    coach_id: string;
    coach_ids: string[];
    session_date: string;
    start_time: string;
    end_time: string;
    capacity: number;
    intensity_level: string;
    wod_description: string;
    wod_template_id: string;
    wod_time_cap: number;
    wod_title: string;
    wod_format: string;
    wod_description_override: string;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 06:00 ~ 20:00
const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

const INTENSITY_CONFIG: Record<string, { color: string; label: string }> = {
    beginner: { color: '#22C55E', label: 'Beginner' },
    intermediate: { color: '#F59E0B', label: 'Intermediate' },
    advanced: { color: '#EF4444', label: 'Advanced' },
};

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
    const [coachesList, setCoachesList] = useState<{ id: string; name: string }[]>([]);
    const [wodTemplatesList, setWodTemplatesList] = useState<{ id: string; title: string; format_type: string; time_cap_minutes: number; description: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
    const [showModal, setShowModal] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [coachConflict, setCoachConflict] = useState<string | null>(null);

    // T3-3: Drag & Drop state
    const [dragSessionId, setDragSessionId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<{ dayIdx: number; hour: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

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
        coach_ids: [],
        session_date: currentDate.toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '10:00',
        capacity: 15,
        intensity_level: 'intermediate',
        wod_description: '',
        wod_template_id: '',
        wod_time_cap: 0,
        wod_title: '',
        wod_format: '',
        wod_description_override: '',
    };
    const [form, setForm] = useState<SessionForm>(emptyForm);

    const loadSessions = useCallback(async () => {
        setLoading(true);

        const rangeStart = new Date(weekStart);
        const rangeEnd = new Date(weekStart);
        rangeEnd.setDate(rangeEnd.getDate() + 7);

        try {
            // 1. Fetch sessions
            const { data: sessionData, error: sessionError } = await query('sessions')
                .select('*')
                .gte('start_time', rangeStart.toISOString())
                .lte('start_time', rangeEnd.toISOString())
                .order('start_time', { ascending: true });

            if (sessionError) {
                console.error('Failed to load sessions:', sessionError);
                setSessions([]);
                setLoading(false);
                return;
            }

            if (!sessionData || sessionData.length === 0) {
                setSessions([]);
                setLoading(false);
                return;
            }

            const sessionIds = sessionData.map((s: any) => s.id);

            // 2. Fetch bookings, session_coaches, coaches, session_wods, and wod_templates in parallel
            const [bookingsRes, sessionCoachesRes, coachesRes, sessionWodsRes, wodTemplatesRes] = await Promise.all([
                query('bookings').select('session_id').in('session_id', sessionIds).eq('status', 'confirmed'),
                query('session_coaches').select('session_id, coach_id').in('session_id', sessionIds),
                query('coaches').select('id, name'),
                query('session_wods').select('session_id, template_id, title_override, format_override, time_cap_override, description_override').in('session_id', sessionIds),
                query('wod_templates').select('id, title, format_type, time_cap_minutes, description')
            ]);

            // Count bookings
            const bookingCounts: Record<string, number> = {};
            if (bookingsRes.data) {
                bookingsRes.data.forEach((b: any) => {
                    bookingCounts[b.session_id] = (bookingCounts[b.session_id] || 0) + 1;
                });
            }

            // Map coach IDs to coach names and populate coachesList
            const coachMap: Record<string, { id: string; name: string }> = {};
            if (coachesRes.data) {
                setCoachesList(coachesRes.data);
                coachesRes.data.forEach((c: any) => {
                    coachMap[c.id] = { id: c.id, name: c.name };
                });
            }

            // Populate WOD templates
            if (wodTemplatesRes.data) {
                setWodTemplatesList(wodTemplatesRes.data);
            }

            // Map session IDs to WOD info
            const sessionWodMap: Record<string, any> = {};
            if (sessionWodsRes.data) {
                sessionWodsRes.data.forEach((sw: any) => {
                    sessionWodMap[sw.session_id] = sw;
                });
            }

            // Map session IDs to array of coach IDs and names (Multiple Coaches)
            const sessionCoachMap: Record<string, { id: string; name: string }[]> = {};
            if (sessionCoachesRes.data) {
                sessionCoachesRes.data.forEach((sc: any) => {
                    if (coachMap[sc.coach_id]) {
                        if (!sessionCoachMap[sc.session_id]) {
                            sessionCoachMap[sc.session_id] = [];
                        }
                        sessionCoachMap[sc.session_id].push(coachMap[sc.coach_id]);
                    }
                });
            }

            // DB 'Low'/'Medium'/'High' -> UI 'beginner'/'intermediate'/'advanced'
            const intensityMapFromDB: Record<string, string> = {
                'Low': 'beginner',
                'Medium': 'intermediate',
                'High': 'advanced'
            };

            setSessions(sessionData.map((s: any) => {
                const sessionCoaches = sessionCoachMap[s.id] || [];
                const sessionWod = sessionWodMap[s.id];
                return {
                    id: s.id,
                    title: s.title || '',
                    coach_name: sessionCoaches.map(c => c.name).join(', ') || '미배정',
                    coach_id: sessionCoaches[0]?.id || '',
                    coach_ids: sessionCoaches.map(c => c.id),
                    start_time: s.start_time,
                    end_time: s.end_time,
                    capacity: s.capacity || 15,
                    current_bookings: bookingCounts[s.id] || 0,
                    intensity_level: intensityMapFromDB[s.intensity] || 'intermediate',
                    status: s.status || 'scheduled',
                    wod_description: s.wod_description || '',
                    wod_template_id: sessionWod?.template_id || '',
                    wod_time_cap: sessionWod?.time_cap_override || 0,
                    wod_title: sessionWod?.title_override || '',
                    wod_format: sessionWod?.format_override || '',
                    wod_description_override: sessionWod?.description_override || '',
                };
            }));
        } catch (err) {
            console.error('Failed to load sessions:', err);
            setSessions([]);
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
    function checkCoachConflict(coachIds: string[], date: string, startTime: string, endTime: string, excludeId?: string): string | null {
        if (!coachIds || coachIds.length === 0) return null;
        for (const coachId of coachIds) {
            const conflicting = sessions.find((s) => {
                if (excludeId && s.id === excludeId) return false;
                const assignedCoachIds = s.coach_ids || (s.coach_id ? [s.coach_id] : []);
                if (!assignedCoachIds.includes(coachId)) return false;
                const sd = new Date(s.start_time);
                const sessionDate = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`;
                if (sessionDate !== date) return false;
                const sStart = `${String(sd.getHours()).padStart(2, '0')}:${String(sd.getMinutes()).padStart(2, '0')}`;
                const sEnd = new Date(s.end_time);
                const sEndStr = `${String(sEnd.getHours()).padStart(2, '0')}:${String(sEnd.getMinutes()).padStart(2, '0')}`;
                return startTime < sEndStr && endTime > sStart;
            });
            if (conflicting) {
                const coach = coachesList.find(c => c.id === coachId);
                const coachName = coach ? coach.name : '해당 코치';
                return `${coachName} 코치는 이미 ${new Date(conflicting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}에 "${conflicting.title}" 수업이 배정되어 있습니다.`;
            }
        }
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
            coach_ids: []
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
            coach_ids: session.coach_ids || (session.coach_id ? [session.coach_id] : []),
            session_date: `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`,
            start_time: `${String(sd.getHours()).padStart(2, '0')}:${String(sd.getMinutes()).padStart(2, '0')}`,
            end_time: `${String(ed.getHours()).padStart(2, '0')}:${String(ed.getMinutes()).padStart(2, '0')}`,
            capacity: session.capacity,
            intensity_level: session.intensity_level,
            wod_description: session.wod_description || '',
            wod_template_id: session.wod_template_id || '',
            wod_time_cap: session.wod_time_cap || 0,
            wod_title: session.wod_title || '',
            wod_format: session.wod_format || '',
            wod_description_override: session.wod_description_override || '',
        });
        setCoachConflict(null);
        setShowModal(true);
    }

    async function saveSession() {
        // Check coach conflict
        if (form.coach_ids && form.coach_ids.length > 0) {
            const conflict = checkCoachConflict(form.coach_ids, form.session_date, form.start_time, form.end_time, editingSession?.id);
            if (conflict) {
                setCoachConflict(conflict);
                return;
            }
        }
        const startDt = new Date(`${form.session_date}T${form.start_time}:00`);
        const endDt = new Date(`${form.session_date}T${form.end_time}:00`);

        // UI 'beginner'/'intermediate'/'advanced' -> DB 'Low'/'Medium'/'High'
        const intensityMapToDB: Record<string, string> = {
            'beginner': 'Low',
            'intermediate': 'Medium',
            'advanced': 'High'
        };

        // Determine the description to store in sessions.wod_description for backward compatibility
        let finalWodDescription = form.wod_description_override || '';
        if (form.wod_template_id && form.wod_template_id !== 'custom') {
            const selectedTpl = wodTemplatesList.find(t => t.id === form.wod_template_id);
            if (selectedTpl) {
                finalWodDescription = form.wod_description_override || selectedTpl.description;
            }
        }

        const payload = {
            title: form.title,
            session_date: form.session_date,
            start_time: startDt.toISOString(),
            end_time: endDt.toISOString(),
            capacity: form.capacity,
            intensity: intensityMapToDB[form.intensity_level] || 'Medium',
            wod_description: finalWodDescription || null,
            status: 'scheduled',
        };

        try {
            let sessionId = editingSession?.id;

            if (editingSession) {
                // 1. Update session
                await query('sessions').update(payload).eq('id', editingSession.id);

                // 2. Re-assign coach mappings (Multiple Coaches)
                await query('session_coaches').delete().eq('session_id', editingSession.id);
                if (form.coach_ids && form.coach_ids.length > 0) {
                    const inserts = form.coach_ids.map((cId, idx) => ({
                        session_id: editingSession.id,
                        coach_id: cId,
                        assignment_role: idx === 0 ? 'lead' : 'assistant',
                        display_order: idx + 1
                    }));
                    await query('session_coaches').insert(inserts);
                }
            } else {
                // 1. Create new session
                const { data, error } = await query('sessions').insert(payload).select('id').single();

                if (error) {
                    console.error('Failed to create session:', error);
                    return;
                }

                sessionId = data?.id;

                // 2. Create coach mappings (Multiple Coaches)
                if (sessionId && form.coach_ids && form.coach_ids.length > 0) {
                    const inserts = form.coach_ids.map((cId, idx) => ({
                        session_id: sessionId,
                        coach_id: cId,
                        assignment_role: idx === 0 ? 'lead' : 'assistant',
                        display_order: idx + 1
                    }));
                    await query('session_coaches').insert(inserts);
                }
            }

            // 3. Upsert session_wods mapping
            if (sessionId) {
                if (form.wod_template_id) {
                    const sessionWodPayload = {
                        session_id: sessionId,
                        template_id: form.wod_template_id === 'custom' ? null : form.wod_template_id,
                        title_override: form.wod_title || null,
                        format_override: form.wod_format || null,
                        time_cap_override: form.wod_time_cap > 0 ? form.wod_time_cap : null,
                        description_override: form.wod_description_override || null,
                        publish_state: 'published'
                    };
                    await query('session_wods').upsert(sessionWodPayload, { onConflict: 'session_id' });
                } else {
                    // Clean up if no WOD is configured
                    await query('session_wods').delete().eq('session_id', sessionId);
                }
            }
        } catch (err) {
            console.error('Failed to save session:', err);
        }

        setShowModal(false);
        loadSessions();
    }

    async function deleteSession(id: string) {
        if (!confirm('이 수업을 삭제하시겠습니까?')) return;
        await query('sessions').delete().eq('id', id);
        loadSessions();
    }

    // Helper: is today
    function isToday(d: Date) {
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    }

    // T3-3: Drag & Drop handlers
    function handleDragStart(e: React.DragEvent, sessionId: string) {
        e.dataTransfer.setData('text/plain', sessionId);
        e.dataTransfer.effectAllowed = 'move';
        setDragSessionId(sessionId);
        setIsDragging(true);
        // Add custom drag image with slight transparency
        const el = e.currentTarget as HTMLElement;
        const ghost = el.cloneNode(true) as HTMLElement;
        ghost.style.opacity = '0.8';
        ghost.style.transform = 'scale(0.95)';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 60, 20);
        setTimeout(() => document.body.removeChild(ghost), 0);
    }

    function handleDragOver(e: React.DragEvent, dayIdx: number, hour: number) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget({ dayIdx, hour });
    }

    function handleDragLeave() {
        setDropTarget(null);
    }

    function handleDragEnd() {
        setDragSessionId(null);
        setDropTarget(null);
        setIsDragging(false);
    }

    async function handleDrop(e: React.DragEvent, day: Date, hour: number) {
        e.preventDefault();
        const sessionId = e.dataTransfer.getData('text/plain');
        if (!sessionId) return;

        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        // Calculate duration
        const oldStart = new Date(session.start_time);
        const oldEnd = new Date(session.end_time);
        const durationMs = oldEnd.getTime() - oldStart.getTime();

        // Build new start/end
        const newStart = new Date(day);
        newStart.setHours(hour, oldStart.getMinutes(), 0, 0);
        const newEnd = new Date(newStart.getTime() + durationMs);

        // Skip if same position
        if (oldStart.getTime() === newStart.getTime()) {
            handleDragEnd();
            return;
        }

        // Check coach conflict at new position
        const newDate = `${newStart.getFullYear()}-${String(newStart.getMonth() + 1).padStart(2, '0')}-${String(newStart.getDate()).padStart(2, '0')}`;
        const newStartTime = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
        const newEndTime = `${String(newEnd.getHours()).padStart(2, '0')}:${String(newEnd.getMinutes()).padStart(2, '0')}`;
        const coachIds = session.coach_ids || (session.coach_id ? [session.coach_id] : []);
        const conflict = checkCoachConflict(coachIds, newDate, newStartTime, newEndTime, session.id);
        if (conflict) {
            handleDragEnd();
            return;
        }

        // Optimistic update
        setSessions(prev => prev.map(s =>
            s.id === sessionId
                ? { ...s, start_time: newStart.toISOString(), end_time: newEnd.toISOString() }
                : s
        ));

        // DB update
        await query('sessions').update({
            session_date: newDate,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
        }).eq('id', sessionId);

        handleDragEnd();
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
                        <div className="flex gap-2">
                            {(['week', 'day'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`admin-filter-btn ${viewMode === mode ? 'active' : ''}`}
                                >
                                    {mode === 'week' ? '주간' : '일간'}
                                </button>
                            ))}
                        </div>
                        {/* Navigation */}
                        <button onClick={navigatePrev} className="admin-filter-btn">◀</button>
                        <button onClick={goToday} className="admin-filter-btn">오늘</button>
                        <button onClick={navigateNext} className="admin-filter-btn">▶</button>
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
                                        const isDropHere = dropTarget?.dayIdx === di && dropTarget?.hour === hour;
                                        const isDragSource = session && dragSessionId === session.id;
                                        return (
                                            <div
                                                key={di}
                                                className={`min-h-[56px] border-b border-r border-white/[0.03] relative cursor-pointer transition-all hover:bg-white/[0.02] ${td ? 'bg-[var(--primary)]/[0.02]' : ''} ${isDropHere ? '!bg-[var(--primary)]/10 ring-1 ring-inset ring-[var(--primary)]/40' : ''}`}
                                                onClick={() => !session && !isDragging && openCreateModal(day, hour)}
                                                onDragOver={(e) => handleDragOver(e, di, hour)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, day, hour)}
                                            >
                                                {session && (
                                                    <div
                                                        className={`absolute inset-1 rounded-lg p-2 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] group/cell overflow-hidden ${isDragSource ? 'opacity-30 scale-95' : ''}`}
                                                        style={{
                                                            background: `${INTENSITY_CONFIG[session.intensity_level]?.color || '#3B82F6'}15`,
                                                            borderLeft: `3px solid ${INTENSITY_CONFIG[session.intensity_level]?.color || '#3B82F6'}`,
                                                        }}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, session.id)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={(e) => { if (!isDragging) { e.stopPropagation(); openEditModal(session); } }}
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
                                                {isDropHere && !session && (
                                                    <div className="absolute inset-1 rounded-lg border-2 border-dashed border-[var(--primary)]/40 flex items-center justify-center">
                                                        <span className="text-[8px] font-black text-[var(--primary)]/60 uppercase tracking-widest">Drop Here</span>
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
                            className="bcl-input"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-5">
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
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">담당 코치 선택 (다중 선택 가능)</label>
                            <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                                {coachesList.map((coach) => {
                                    const isSelected = form.coach_ids.includes(coach.id);
                                    return (
                                        <button
                                            key={coach.id}
                                            type="button"
                                            onClick={() => {
                                                const updatedIds = isSelected
                                                    ? form.coach_ids.filter(id => id !== coach.id)
                                                    : [...form.coach_ids, coach.id];
                                                
                                                setForm({ 
                                                    ...form, 
                                                    coach_ids: updatedIds,
                                                    coach_id: updatedIds[0] || '' // Fallback for backward compatibility
                                                });

                                                setCoachConflict(checkCoachConflict(updatedIds, form.session_date, form.start_time, form.end_time, editingSession?.id));
                                            }}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                                isSelected 
                                                    ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)] shadow-[0_0_15px_rgba(255,107,0,0.15)]' 
                                                    : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/20'
                                            }`}
                                        >
                                            <span>{coach.name}</span>
                                            {isSelected && <span className="text-[10px]">✓</span>}
                                        </button>
                                    );
                                })}
                                {coachesList.length === 0 && (
                                    <p className="text-[10px] text-white/30 py-2">등록된 코치가 없습니다.</p>
                                )}
                            </div>
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
                                    setCoachConflict(checkCoachConflict(form.coach_ids, form.session_date, e.target.value, form.end_time, editingSession?.id));
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
                                    setCoachConflict(checkCoachConflict(form.coach_ids, form.session_date, form.start_time, e.target.value, editingSession?.id));
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
                                className="bcl-input"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">강도</label>
                            <select
                                value={form.intensity_level}
                                onChange={(e) => setForm({ ...form, intensity_level: e.target.value })}
                                className="bcl-input"
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                    </div>

                    {/* WOD Section */}
                    <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.04] space-y-4">
                        <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-2">
                            <span className="text-xs font-black uppercase tracking-widest text-[var(--primary)]">WOD (오늘의 운동) 설정</span>
                            <span className="text-[9px] font-bold text-white/35 uppercase">Workout of the Day</span>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">WOD 템플릿 선택</label>
                            <select
                                value={form.wod_template_id}
                                onChange={(e) => {
                                    const tplId = e.target.value;
                                    if (tplId === 'custom') {
                                        setForm({
                                            ...form,
                                            wod_template_id: 'custom',
                                            wod_title: 'Custom WOD',
                                            wod_format: 'for_time',
                                            wod_time_cap: 15,
                                            wod_description_override: ''
                                        });
                                    } else if (tplId === '') {
                                        setForm({
                                            ...form,
                                            wod_template_id: '',
                                            wod_title: '',
                                            wod_format: '',
                                            wod_time_cap: 0,
                                            wod_description_override: ''
                                        });
                                    } else {
                                        const selected = wodTemplatesList.find(t => t.id === tplId);
                                        if (selected) {
                                            setForm({
                                                ...form,
                                                wod_template_id: tplId,
                                                wod_title: selected.title,
                                                wod_format: selected.format_type || 'for_time',
                                                wod_time_cap: selected.time_cap_minutes || 0,
                                                wod_description_override: selected.description || ''
                                            });
                                        }
                                    }
                                }}
                                className="bcl-input w-full"
                            >
                                <option value="">[ 선택 안 함 ]</option>
                                <option value="custom">✍️ [ 직접 입력 / Custom WOD ]</option>
                                <optgroup label="🏆 벤치마크 WOD 템플릿">
                                    {wodTemplatesList.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.title} ({t.format_type === 'for_time' ? 'For Time' : t.format_type === 'amrap' ? 'AMRAP' : t.format_type || 'Custom'})
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        {form.wod_template_id && (
                            <div className="space-y-4 pt-2 animate-fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">WOD 제목</label>
                                        <input
                                            value={form.wod_title}
                                            onChange={(e) => setForm({ ...form, wod_title: e.target.value })}
                                            placeholder="예: Fran, Helen 등"
                                            className="bcl-input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">측정 방식 (Format)</label>
                                        <select
                                            value={form.wod_format}
                                            onChange={(e) => setForm({ ...form, wod_format: e.target.value })}
                                            className="bcl-input"
                                        >
                                            <option value="for_time">For Time (시간 측정)</option>
                                            <option value="amrap">AMRAP (최대 라운드)</option>
                                            <option value="emom">EMOM (매 분마다)</option>
                                            <option value="tabata">Tabata (타바타)</option>
                                            <option value="interval">Interval (인터벌)</option>
                                            <option value="strength">Strength (최대 근력)</option>
                                            <option value="custom">Custom (기타)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">타임 캡 (Time Cap - 분)</label>
                                        <input
                                            type="number"
                                            value={form.wod_time_cap}
                                            onChange={(e) => setForm({ ...form, wod_time_cap: parseInt(e.target.value) || 0 })}
                                            min={0}
                                            max={120}
                                            placeholder="0 = 제한 없음"
                                            className="bcl-input"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <span className="text-[10px] text-white/30 font-bold mb-3 uppercase tracking-tighter">
                                            {form.wod_time_cap > 0 ? `⏱️ ${form.wod_time_cap}분 시간 제한 설정됨` : '⏱️ 시간 제한 없음'}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">WOD 동작 구성 및 설명</label>
                                    <textarea
                                        value={form.wod_description_override}
                                        onChange={(e) => setForm({ ...form, wod_description_override: e.target.value })}
                                        rows={4}
                                        placeholder="동작의 구성과 중량을 기재해 주세요.&#10;예:&#10;Thruster (95/65 lbs)&#10;Pull-ups&#10;21-15-9 Reps for Time"
                                        className="bcl-input resize-none"
                                        style={{ scrollbarWidth: 'thin' }}
                                    />
                                </div>
                            </div>
                        )}
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
