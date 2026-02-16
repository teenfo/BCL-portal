"use client";

import React, { useState } from 'react';

type RecordType = 'For Time' | 'AMRAP' | 'Weight';

interface Entry {
    rank: number;
    name: string;
    record: string;
    subtext: string;
    category: 'RX' | 'Scaled';
}

export default function LeaderboardPage() {
    const [activeType, setActiveType] = useState<RecordType>('For Time');

    // Mock Data
    const entries: Entry[] = [
        { rank: 1, name: "Kim Choho", record: "08:42", subtext: "RX", category: 'RX' },
        { rank: 2, name: "Lee Minji", record: "09:15", subtext: "RX", category: 'RX' },
        { rank: 3, name: "Park Jiho", record: "10:02", subtext: "RX", category: 'RX' },
        { rank: 4, name: "Choi Sunghoon", record: "11:20", subtext: "Scaled", category: 'Scaled' },
        { rank: 5, name: "Jung Dana", record: "11:45", subtext: "RX", category: 'RX' },
        { rank: 6, name: "Kang Dongwon", record: "12:10", subtext: "Scaled", category: 'Scaled' },
    ];

    return (
        <main className="min-h-screen bg-black text-white p-12 flex flex-col items-center justify-start relative overflow-hidden">
            {/* Dynamic Background Highlights */}
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-neutral-900 rounded-full blur-[120px] opacity-20" />
            <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-orange-950 rounded-full blur-[120px] opacity-10" />

            {/* Header Area */}
            <header className="w-full max-w-6xl flex justify-between items-end mb-16 z-10 border-b border-white/10 pb-8">
                <div>
                    <h2 className="text-orange-500 font-bold tracking-[0.2em] uppercase text-xl mb-2">Live Leaderboard</h2>
                    <h1 className="text-7xl font-black tracking-tighter uppercase italic">The Champions</h1>
                </div>
                <div className="flex gap-4">
                    {(['For Time', 'AMRAP', 'Weight'] as RecordType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setActiveType(type)}
                            className={`px-8 py-3 rounded-xl text-lg font-black transition-all ${activeType === type
                                    ? 'bg-orange-600 text-white shadow-lg scale-105'
                                    : 'text-neutral-500 hover:text-white glass-panel'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </header>

            {/* Ranking Table */}
            <div className="w-full max-w-6xl z-10 space-y-4">
                {/* Table Header */}
                <div className="grid grid-cols-12 px-12 py-4 text-sm font-bold text-neutral-500 uppercase tracking-widest">
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-6">Athlete</div>
                    <div className="col-span-3 text-right">Result</div>
                    <div className="col-span-2 text-right">Category</div>
                </div>

                {/* Athletes List */}
                {entries.map((entry) => (
                    <div
                        key={entry.rank}
                        className={`grid grid-cols-12 items-center px-12 py-8 rounded-3xl glass-card border-none transition-all group ${entry.rank <= 3 ? 'bg-white/5 ring-1 ring-white/10' : ''
                            }`}
                    >
                        {/* Rank Number */}
                        <div className="col-span-1">
                            <span className={`text-5xl font-black italic ${entry.rank === 1 ? 'text-orange-500' :
                                    entry.rank === 2 ? 'text-neutral-300' :
                                        entry.rank === 3 ? 'text-amber-700' : 'text-neutral-700'
                                }`}>
                                {entry.rank}
                            </span>
                        </div>

                        {/* Athlete Name */}
                        <div className="col-span-6 flex items-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center overflow-hidden">
                                <span className="text-xl font-bold text-neutral-600">{entry.name[0]}</span>
                            </div>
                            <div className="text-4xl font-bold tracking-tight group-hover:text-orange-400 transition-colors uppercase">
                                {entry.name}
                            </div>
                        </div>

                        {/* Result */}
                        <div className="col-span-3 text-right">
                            <div className="text-5xl font-black tracking-tighter text-white/90">
                                {entry.record}
                            </div>
                        </div>

                        {/* Category */}
                        <div className="col-span-2 text-right">
                            <span className={`px-4 py-2 rounded-lg text-sm font-black tracking-widest border ${entry.category === 'RX' ? 'border-orange-500/50 text-orange-500' : 'border-neutral-700 text-neutral-500'
                                }`}>
                                {entry.category}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Visual */}
            <div className="mt-20 opacity-30 pointer-events-none select-none">
                <span className="text-sm font-bold tracking-[0.5em] uppercase text-neutral-500">Live Update Active • Sync via BCL Cloud</span>
            </div>
        </main>
    );
}
