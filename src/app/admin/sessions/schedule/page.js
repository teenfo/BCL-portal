'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function SessionSchedule() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        const { data, error } = await supabase
            .from('sessions')
            .select('*, facilities(name)')
            .order('start_time', { ascending: true });
        if (!error) setSessions(data);
        setLoading(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1>Session Schedule</h1>
                <button className="btn-primary" onClick={() => alert('Add Session UI coming soon')}>
                    + New Session
                </button>
            </div>

            <div className="card">
                {loading ? <p>Loading...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-dim)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Session</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Branch</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Time</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Capacity</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                                        No sessions scheduled.
                                    </td>
                                </tr>
                            ) : (
                                sessions.map(s => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}><strong>{s.title}</strong></td>
                                        <td style={{ padding: '1rem' }}>{s.facilities?.name}</td>
                                        <td style={{ padding: '1rem' }}>
                                            {new Date(s.start_time).toLocaleString()} - {new Date(s.end_time).toLocaleTimeString()}
                                        </td>
                                        <td style={{ padding: '1rem' }}>{s.current_occupancy} / {s.max_capacity}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--primary)' }}>Edit</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
