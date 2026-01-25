'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function CoachManagement() {
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoaches();
    }, []);

    const fetchCoaches = async () => {
        // Joining with profiles to get name and avatar
        const { data, error } = await supabase
            .from('coaches')
            .select(`
        id,
        bio,
        specialties,
        profiles (
          full_name,
          avatar_url
        )
      `);
        if (!error) setCoaches(data);
        setLoading(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1>Coach Management</h1>
                <button className="btn-primary" onClick={() => alert('Add Coach UI coming soon')}>
                    + Add Coach
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {loading ? <p>Loading...</p> : (
                    coaches.length === 0 ? (
                        <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--text-dim)' }}>No coaches registered yet.</p>
                        </div>
                    ) : (
                        coaches.map(coach => (
                            <div key={coach.id} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                    {coach.profiles?.avatar_url ? <img src={coach.profiles.avatar_url} alt="" style={{ width: '100%', borderRadius: '50%' }} /> : '👤'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ marginBottom: '0.25rem' }}>{coach.profiles?.full_name || 'Unknown Name'}</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>{coach.specialties?.join(', ') || 'General'}</p>
                                    <p style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}>
                                        {coach.bio}
                                    </p>
                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                        <button style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'var(--accent)', color: 'var(--primary)', borderRadius: '4px' }}>Edit</button>
                                        <button style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'var(--accent)', color: 'var(--danger)', borderRadius: '4px' }}>Remove</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
}
