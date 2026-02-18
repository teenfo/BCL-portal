'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import { IconTrendingUp, IconClock, IconSmartphone } from '@/components/icons/AdminIcons';

interface DailyCheckin {
    date: string;
    count: number;
}

interface HourlyDistribution {
    hour: number;
    count: number;
}

interface MethodBreakdown {
    method: string;
    count: number;
}

// T3-2: Heatmap data
interface HeatmapCell {
    day: number; // 0=Mon, 6=Sun
    hour: number;
    count: number;
}

export default function AttendancePage() {
    const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
    const [dailyData, setDailyData] = useState<DailyCheckin[]>([]);
    const [hourlyData, setHourlyData] = useState<HourlyDistribution[]>([]);
    const [methodData, setMethodData] = useState<MethodBreakdown[]>([]);
    const [totalCheckins, setTotalCheckins] = useState(0);
    const [avgDaily, setAvgDaily] = useState(0);
    const [peakDay, setPeakDay] = useState({ date: '', count: 0 });
    const [loading, setLoading] = useState(true);
    // T3-2: Heatmap state
    const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);

    const loadData = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);

        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startStr = startDate.toISOString();

        const { data: checkins }: any = await supabase
            .from('checkins')
            .select('checkin_time, checkin_method')
            .gte('checkin_time', startStr)
            .order('checkin_time', { ascending: true });

        if (checkins && checkins.length > 0) {
            // Daily aggregation
            const dailyMap: Record<string, number> = {};
            const hourlyMap: Record<number, number> = {};
            const methodMap: Record<string, number> = {};

            for (let i = 0; i < 24; i++) hourlyMap[i] = 0;

            // T3-2: Heatmap aggregation (day × hour)
            const heatmap: Record<string, number> = {};
            for (let d = 0; d < 7; d++) {
                for (let h = 0; h < 24; h++) {
                    heatmap[`${d}-${h}`] = 0;
                }
            }

            checkins.forEach((c: any) => {
                const dt = new Date(c.checkin_time);
                const dateKey = dt.toISOString().split('T')[0];
                dailyMap[dateKey] = (dailyMap[dateKey] || 0) + 1;
                hourlyMap[dt.getHours()] = (hourlyMap[dt.getHours()] || 0) + 1;
                methodMap[c.checkin_method] = (methodMap[c.checkin_method] || 0) + 1;

                // T3-2: Map JS getDay() (0=Sun) to (0=Mon)
                const jsDay = dt.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                const dayIdx = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon, ..., 6=Sun
                heatmap[`${dayIdx}-${dt.getHours()}`]++;
            });

            const daily = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));
            const hourly = Object.entries(hourlyMap).map(([hour, count]) => ({ hour: Number(hour), count }));
            const methods = Object.entries(methodMap).map(([method, count]) => ({ method, count }));

            setDailyData(daily);
            setHourlyData(hourly);
            setMethodData(methods);
            setTotalCheckins(checkins.length);
            setAvgDaily(Math.round(checkins.length / days));

            const peak = daily.reduce((max, d) => d.count > max.count ? d : max, { date: '', count: 0 });
            setPeakDay(peak);

            // T3-2: Set heatmap data
            const cells: HeatmapCell[] = [];
            for (let d = 0; d < 7; d++) {
                for (let h = 0; h < 24; h++) {
                    cells.push({ day: d, hour: h, count: heatmap[`${d}-${h}`] });
                }
            }
            setHeatmapData(cells);
        } else {
            // No data available - show empty state
            setDailyData([]);
            setHourlyData(Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 })));
            setMethodData([]);
            setTotalCheckins(0);
            setAvgDaily(0);
            setPeakDay({ date: '', count: 0 });
            // T3-2: Empty heatmap
            const cells: HeatmapCell[] = [];
            for (let d = 0; d < 7; d++) {
                for (let h = 0; h < 24; h++) {
                    cells.push({ day: d, hour: h, count: 0 });
                }
            }
            setHeatmapData(cells);
        }

        setLoading(false);
    }, [period]);

    useEffect(() => { loadData(); }, [loadData]);

    // T2-1: CSV Download helper
    function downloadCSV() {
        if (dailyData.length === 0) return;
        const rows = [['Date', 'Check-ins']];
        dailyData.forEach(d => rows.push([d.date, String(d.count)]));
        const csvContent = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${period}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Chart helpers
    const maxDailyCount = Math.max(...dailyData.map(d => d.count), 1);
    const maxHourlyCount = Math.max(...hourlyData.map(h => h.count), 1);
    const totalMethodCount = methodData.reduce((s, m) => s + m.count, 0) || 1;

    // T3-2: Heatmap helpers
    const maxHeatmapCount = Math.max(...heatmapData.map(c => c.count), 1);
    const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

    function getHeatmapColor(count: number): string {
        if (count === 0) return 'rgba(255,255,255,0.02)';
        const intensity = count / maxHeatmapCount;
        if (intensity < 0.25) return 'rgba(255,107,0,0.1)';
        if (intensity < 0.5) return 'rgba(255,107,0,0.25)';
        if (intensity < 0.75) return 'rgba(255,107,0,0.5)';
        return 'rgba(255,107,0,0.8)';
    }

    const methodConfig: Record<string, { label: string; color: string }> = {
        qr: { label: 'QR Code', color: '#22C55E' },
        kiosk: { label: 'Kiosk', color: '#8B5CF6' },
        manual: { label: 'Manual', color: '#3B82F6' },
        face: { label: 'Face ID', color: '#F59E0B' },
    };

    // Generate SVG chart path from daily data
    function generateChartPath() {
        if (dailyData.length < 2) return '';
        const w = 800, h = 200;
        const stepX = w / (dailyData.length - 1);
        const points = dailyData.map((d, i) => ({ x: i * stepX, y: h - (d.count / maxDailyCount) * h * 0.85 - 10 }));
        let path = `M${points[0].x},${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const cp1x = points[i - 1].x + stepX * 0.4;
            const cp1y = points[i - 1].y;
            const cp2x = points[i].x - stepX * 0.4;
            const cp2y = points[i].y;
            path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${points[i].x},${points[i].y}`;
        }
        return path;
    }

    function generateAreaPath() {
        const linePath = generateChartPath();
        if (!linePath) return '';
        const lastPoint = dailyData.length - 1;
        const w = 800;
        const stepX = w / lastPoint;
        return `${linePath} L${lastPoint * stepX},200 L0,200 Z`;
    }

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Insights"
                title="Attendance"
                subtitle="Dynamics"
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {/* Period Filter */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex gap-2">
                        {(['7d', '30d', '90d'] as const).map((p) => (
                            <button key={p} onClick={() => setPeriod(p)} className={`admin-filter-btn ${period === p ? 'active' : ''}`}>
                                {p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <button onClick={downloadCSV} disabled={dailyData.length === 0} className="admin-action-btn disabled:opacity-40">⬇ CSV 다운로드</button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-64"><div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div></div>
                ) : (
                    <div className="space-y-10">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-12 gap-6">
                            <div className="col-span-4 kpi-card">
                                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Check-ins</h4>
                                <p className="text-4xl font-black text-white mt-4">{totalCheckins.toLocaleString()}</p>
                                <p className="text-[9px] text-[var(--primary)] font-bold mt-1 uppercase tracking-widest">지난 {period === '7d' ? '7' : period === '30d' ? '30' : '90'}일</p>
                            </div>
                            <div className="col-span-4 kpi-card">
                                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Avg Daily</h4>
                                <p className="text-4xl font-black text-white mt-4">{avgDaily}</p>
                                <p className="text-[9px] text-green-400 font-bold mt-1 uppercase tracking-widest">일 평균 체크인</p>
                            </div>
                            <div className="col-span-4 kpi-card">
                                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Peak Day</h4>
                                <p className="text-4xl font-black text-white mt-4">{peakDay.count}</p>
                                <p className="text-[9px] text-yellow-400 font-bold mt-1 uppercase tracking-widest">{peakDay.date}</p>
                            </div>
                        </div>

                        {/* Daily Trend Chart */}
                        <div className="glass-card p-8">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 inline-flex items-center gap-2"><IconTrendingUp size={20} /> Daily Attendance Trend</h3>
                            <div className="relative h-[220px] w-full">
                                <svg viewBox="0 0 800 200" className="w-full h-full" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    {[0, 50, 100, 150].map(y => (<line key={y} x1="0" y1={y} x2="800" y2={y} stroke="rgba(255,255,255,0.03)" />))}
                                    <path d={generateAreaPath()} fill="url(#attGrad)" />
                                    <path d={generateChartPath()} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="flex justify-between mt-4 text-[9px] text-[var(--text-muted)] uppercase tracking-widest">
                                <span>{dailyData[0]?.date}</span>
                                <span>{dailyData[Math.floor(dailyData.length / 2)]?.date}</span>
                                <span>{dailyData[dailyData.length - 1]?.date}</span>
                            </div>
                        </div>

                        {/* T3-2: Attendance Heatmap (Day × Hour) */}
                        <div className="glass-card p-8">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3 inline-flex items-center gap-2">
                                <IconClock size={20} /> Attendance Heatmap
                            </h3>
                            <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mb-6">요일 × 시간대 체크인 밀도</p>

                            <div className="overflow-x-auto">
                                <div style={{ minWidth: '700px' }}>
                                    {/* Hour labels (top) */}
                                    <div className="flex items-center mb-1">
                                        <div className="w-10 flex-shrink-0" />
                                        {Array.from({ length: 24 }, (_, h) => (
                                            <div key={h} className="flex-1 text-center">
                                                <span className="text-[7px] font-bold text-[var(--text-muted)]">{h}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Heatmap rows */}
                                    {DAY_LABELS.map((dayLabel, dayIdx) => (
                                        <div key={dayIdx} className="flex items-center gap-0 mb-[2px]">
                                            <div className="w-10 flex-shrink-0 text-right pr-2">
                                                <span className="text-[9px] font-black text-white/60">{dayLabel}</span>
                                            </div>
                                            {Array.from({ length: 24 }, (_, h) => {
                                                const cell = heatmapData.find(c => c.day === dayIdx && c.hour === h);
                                                const count = cell?.count || 0;
                                                return (
                                                    <div
                                                        key={h}
                                                        className="flex-1 aspect-square rounded-sm mx-[1px] transition-all hover:scale-125 hover:z-10 cursor-pointer relative group"
                                                        style={{
                                                            background: getHeatmapColor(count),
                                                            border: '1px solid rgba(255,255,255,0.02)',
                                                            minHeight: '18px',
                                                        }}
                                                        title={`${dayLabel}요일 ${h}시: ${count}건`}
                                                    >
                                                        {/* Tooltip on hover */}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-[8px] font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"
                                                            style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,107,0,0.3)' }}>
                                                            {dayLabel} {h}시 — {count}건
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}

                                    {/* Legend */}
                                    <div className="flex items-center justify-end gap-3 mt-4">
                                        <span className="text-[8px] text-[var(--text-muted)]">적음</span>
                                        {[0.02, 0.1, 0.25, 0.5, 0.8].map((opacity, i) => (
                                            <div
                                                key={i}
                                                className="w-4 h-4 rounded-sm"
                                                style={{ background: i === 0 ? 'rgba(255,255,255,0.02)' : `rgba(255,107,0,${opacity})` }}
                                            />
                                        ))}
                                        <span className="text-[8px] text-[var(--text-muted)]">많음</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-8">
                            {/* Hourly Distribution */}
                            <div className="col-span-8 glass-card p-8">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 inline-flex items-center gap-2"><IconClock size={20} /> Hourly Distribution</h3>
                                <div className="flex items-end gap-1 h-[160px]">
                                    {hourlyData.map((h) => {
                                        const pct = (h.count / maxHourlyCount) * 100;
                                        const isPeak = h.count > maxHourlyCount * 0.7;
                                        return (
                                            <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group" title={`${h.hour}시: ${h.count}명`}>
                                                <span className="text-[8px] font-bold text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">{h.count}</span>
                                                <div
                                                    className="w-full rounded-t-md transition-all duration-300 group-hover:opacity-80"
                                                    style={{
                                                        height: `${Math.max(pct, 2)}%`,
                                                        background: isPeak ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                                        boxShadow: isPeak ? '0 0 10px rgba(255,107,0,0.3)' : 'none',
                                                    }}
                                                />
                                                <span className="text-[7px] font-bold text-[var(--text-muted)]">{h.hour}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[9px] text-[var(--text-muted)] mt-4 text-center uppercase tracking-widest">Hour of Day (0-23)</p>
                            </div>

                            {/* Method Breakdown */}
                            <div className="col-span-4 glass-card p-8">
                                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-8 inline-flex items-center gap-2"><IconSmartphone size={18} /> Check-in Methods</h3>
                                <div className="space-y-5">
                                    {methodData.map((m) => {
                                        const mc = methodConfig[m.method] || { label: m.method, color: '#6B7280' };
                                        const pct = ((m.count / totalMethodCount) * 100).toFixed(1);
                                        return (
                                            <div key={m.method}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-white">{mc.label}</span>
                                                    <span className="text-[9px] font-black" style={{ color: mc.color }}>{pct}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: mc.color }} />
                                                </div>
                                                <p className="text-[8px] text-[var(--text-muted)] mt-1">{m.count.toLocaleString()}건</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
