'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function AttendanceLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        const { data, error } = await supabase
            .from('checkins')
            .select('*, profiles(full_name), facilities(name)')
            .order('checkin_time', { ascending: false });
        if (!error) setLogs(data);
        setLoading(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1>Attendance & Check-in Logs</h1>
            </div>

            <div className="card">
                {loading ? <p>Loading...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-dim)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Member</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Facility</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Check-in Type</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Time</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                                        No check-in logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>{log.profiles?.full_name}</td>
                                        <td style={{ padding: '1rem' }}>{log.facilities?.name}</td>
                                        <td style={{ padding: '1rem' }}>{log.session_id ? 'Session' : 'General'}</td>
                                        <td style={{ padding: '1rem' }}>{new Date(log.checkin_time).toLocaleString()}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'var(--accent)', color: 'var(--primary)', fontSize: '0.75rem' }}>
                                                {log.status}
                                            </span>
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
