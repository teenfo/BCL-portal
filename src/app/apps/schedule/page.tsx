'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';


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

export default function SchedulePage() {
    const { user } = useAuth();
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
                    current_capacity: c.current_capacity,
                    coach_name: c.coach.full_name,
                    facility_name: c.facility.name,
                }))
            );
        }

        setLoading(false);
    }

    async function handleBookClass(classId: string) {
        if (!user) return;

        const supabase = createClient();
        const { error } = await supabase.from('bookings').insert({
            user_id: user.id,
            class_id: classId,
            status: 'confirmed',
        });

        if (!error) {
            alert('Class booked successfully!');
            loadClasses();
        } else {
            alert('Failed to book class: ' + error.message);
        }
    }

    function changeDate(days: number) {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    }

    return (
        <div className="min-h-screen pb-20" style={{ background: 'var(--background)' }}>
            {/* Header */}
            <div className="p-6 pb-4">
                <h1 className="text-2xl font-bold text-white">Schedule</h1>
                <p style={{ color: 'var(--foreground-secondary)' }}>Book your classes</p>
            </div>

            {/* Date Selector */}
            <div className="px-4 mb-4">
                <div className="glass-card flex items-center justify-between p-4 rounded-xl">
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
                        <p className="text-lg font-semibold text-white">
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
            <div className="px-4 space-y-3">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 mx-auto" style={{ borderColor: 'var(--bcl-orange)' }}></div>
                    </div>
                ) : classes.length === 0 ? (
                    <div className="glass-card p-8 rounded-xl text-center">
                        <p style={{ color: 'var(--foreground-secondary)' }}>No classes scheduled for this date</p>
                    </div>
                ) : (
                    classes.map((classItem) => (
                        <div key={classItem.id} className="glass-card p-4 rounded-xl">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{classItem.name}</h3>
                                    <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                        {classItem.coach_name}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--bcl-orange)' }}>
                                        {new Date(classItem.start_time).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                                        {classItem.facility_name}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>
                                        {classItem.current_capacity}/{classItem.max_capacity}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handleBookClass(classItem.id)}
                                    disabled={classItem.current_capacity >= classItem.max_capacity}
                                    className="px-4 py-2 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50"
                                    style={{
                                        background: 'var(--bcl-orange)',
                                        color: '#FFFFFF',
                                    }}
                                >
                                    {classItem.current_capacity >= classItem.max_capacity ? 'Full' : 'Book'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>


        </div>
    );
}
