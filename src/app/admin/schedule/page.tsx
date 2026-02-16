'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminSidebar from '@/components/layout/AdminSidebar';

interface Class {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    current_capacity: number;
    coach_name: string;
    facility_name: string;
}

export default function AdminSchedulePage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadClasses();
    }, [selectedDate]);

    async function loadClasses() {
        const supabase = createClient();
        setLoading(true);

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('classes')
            .select(`
                *,
                coach:users!coach_id(full_name),
                facility:facilities(name)
            `)
            .gte('start_time', startOfDay.toISOString())
            .lte('start_time', endOfDay.toISOString())
            .order('start_time', { ascending: true });

        if (!error && data) {
            setClasses(
                data.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    start_time: c.start_time,
                    end_time: c.end_time,
                    max_capacity: c.max_capacity,
                    current_capacity: c.current_capacity || 0,
                    coach_name: c.coach?.full_name || 'TBD',
                    facility_name: c.facility?.name || 'TBD',
                }))
            );
        }

        setLoading(false);
    }

    function changeDate(days: number) {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    }

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
            <AdminSidebar />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Schedule</h1>
                        <p style={{ color: 'var(--foreground-secondary)' }}>Manage class schedule</p>
                    </div>
                    <button
                        className="px-4 py-2 rounded-lg font-semibold transition-colors"
                        style={{
                            background: 'var(--bcl-orange)',
                            color: '#FFFFFF',
                        }}
                    >
                        + Add Class
                    </button>
                </div>

                {/* Date Selector */}
                <div className="glass-card p-6 rounded-xl mb-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => changeDate(-1)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                        >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">
                                {selectedDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                })}
                            </p>
                            <p style={{ color: 'var(--foreground-secondary)' }}>
                                {selectedDate.toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </p>
                        </div>

                        <button
                            onClick={() => changeDate(1)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                        >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Classes List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto" style={{ borderColor: 'var(--bcl-orange)' }}></div>
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="glass-card p-12 rounded-xl text-center">
                            <p style={{ color: 'var(--foreground-secondary)' }}>No classes scheduled for this date</p>
                            <button
                                className="mt-4 px-4 py-2 rounded-lg font-semibold"
                                style={{
                                    background: 'var(--bcl-orange)',
                                    color: '#FFFFFF',
                                }}
                            >
                                Add First Class
                            </button>
                        </div>
                    ) : (
                        classes.map((classItem) => (
                            <div key={classItem.id} className="glass-card p-6 rounded-xl">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-white">{classItem.name}</h3>
                                            <span
                                                className="px-3 py-1 rounded-full text-xs font-semibold"
                                                style={{
                                                    background:
                                                        classItem.current_capacity >= classItem.max_capacity
                                                            ? 'rgba(239, 68, 68, 0.2)'
                                                            : 'rgba(34, 197, 94, 0.2)',
                                                    color:
                                                        classItem.current_capacity >= classItem.max_capacity
                                                            ? '#EF4444'
                                                            : '#22C55E',
                                                }}
                                            >
                                                {classItem.current_capacity >= classItem.max_capacity ? 'Full' : 'Available'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-4 gap-6 text-sm">
                                            <div>
                                                <p style={{ color: 'var(--foreground-secondary)' }}>Time</p>
                                                <p className="text-white font-semibold">
                                                    {new Date(classItem.start_time).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}{' '}
                                                    -{' '}
                                                    {new Date(classItem.end_time).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ color: 'var(--foreground-secondary)' }}>Coach</p>
                                                <p className="text-white font-semibold">{classItem.coach_name}</p>
                                            </div>
                                            <div>
                                                <p style={{ color: 'var(--foreground-secondary)' }}>Facility</p>
                                                <p className="text-white font-semibold">{classItem.facility_name}</p>
                                            </div>
                                            <div>
                                                <p style={{ color: 'var(--foreground-secondary)' }}>Capacity</p>
                                                <p className="text-white font-semibold">
                                                    {classItem.current_capacity} / {classItem.max_capacity}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            className="p-2 rounded-lg transition-colors"
                                            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                                        >
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            className="p-2 rounded-lg transition-colors"
                                            style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                                        >
                                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
