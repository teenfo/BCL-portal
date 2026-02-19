'use client';

import React, { useMemo } from 'react';

interface MonthCalendarProps {
    year: number;
    month: number; // 1-12
    checkedDates: string[]; // 'YYYY-MM-DD' format
    onMonthChange?: (year: number, month: number) => void;
    className?: string;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function MonthCalendar({
    year,
    month,
    checkedDates,
    onMonthChange,
    className = '',
}: MonthCalendarProps) {
    const today = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const checkedSet = useMemo(() => new Set(checkedDates), [checkedDates]);

    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();

        const days: (number | null)[] = [];
        // Fill blanks before start
        for (let i = 0; i < firstDay; i++) days.push(null);
        // Fill actual days
        for (let d = 1; d <= daysInMonth; d++) days.push(d);

        return days;
    }, [year, month]);

    const handlePrev = () => {
        if (!onMonthChange) return;
        if (month === 1) onMonthChange(year - 1, 12);
        else onMonthChange(year, month - 1);
    };

    const handleNext = () => {
        if (!onMonthChange) return;
        if (month === 12) onMonthChange(year + 1, 1);
        else onMonthChange(year, month + 1);
    };

    const formatDate = (day: number) =>
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return (
        <div className={className}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                }}
            >
                <button
                    onClick={handlePrev}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.375rem',
                        cursor: onMonthChange ? 'pointer' : 'default',
                        color: 'var(--app-text-secondary, #6B7280)',
                        fontSize: '1rem',
                    }}
                    disabled={!onMonthChange}
                >
                    ‹
                </button>
                <div
                    style={{
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        color: 'var(--app-text-primary, #1A1A1A)',
                    }}
                >
                    {year}년 {month}월
                </div>
                <button
                    onClick={handleNext}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.375rem',
                        cursor: onMonthChange ? 'pointer' : 'default',
                        color: 'var(--app-text-secondary, #6B7280)',
                        fontSize: '1rem',
                    }}
                    disabled={!onMonthChange}
                >
                    ›
                </button>
            </div>

            {/* Day Labels */}
            <div className="attendance-calendar" style={{ marginBottom: '0.25rem' }}>
                {DAY_LABELS.map((label) => (
                    <div
                        key={label}
                        style={{
                            textAlign: 'center',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            color: 'var(--app-text-muted, #9CA3AF)',
                            padding: '0.25rem 0',
                            textTransform: 'uppercase',
                        }}
                    >
                        {label}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="attendance-calendar">
                {calendarDays.map((day, idx) => {
                    if (day === null) {
                        return <div key={`blank-${idx}`} />;
                    }
                    const dateStr = formatDate(day);
                    const isChecked = checkedSet.has(dateStr);
                    const isToday = dateStr === today;

                    return (
                        <div
                            key={day}
                            className={`attendance-day${isChecked ? ' checked' : ''}${isToday ? ' today' : ''}`}
                        >
                            {day}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
