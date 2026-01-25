'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function UserSchedule() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        const { data, error } = await supabase
            .from('sessions')
            .select('*, facilities(name)')
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });
        if (!error) setSessions(data);
        setLoading(false);
    };

    const handleBook = async (sessionId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return alert('Please login to book a session');

        const { error } = await supabase.from('bookings').insert({
            session_id: sessionId,
            user_id: user.id,
            status: 'confirmed'
        });

        if (error) alert(error.message);
        else alert('Booking successful!');
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1rem' }}>Upcoming Sessions</h2>
            {loading ? <p>Loading schedule...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sessions.length === 0 ? <p>No upcoming sessions.</p> : sessions.map(s => (
                        <div key={s.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.125rem' }}>{s.title}</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>{s.facilities?.name}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                        {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                        {new Date(s.start_time).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.875rem' }}>👥 {s.current_occupancy} / {s.max_capacity}</span>
                                <button
                                    className="btn-primary"
                                    style={{ fontSize: '0.875rem', padding: '0.4rem 1rem' }}
                                    onClick={() => handleBook(s.id)}
                                    disabled={s.current_occupancy >= s.max_capacity}
                                >
                                    {s.current_occupancy >= s.max_capacity ? 'Full' : 'Book Now'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
