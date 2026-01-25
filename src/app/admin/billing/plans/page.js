'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function MembershipPlans() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        const { data, error } = await supabase.from('membership_plans').select('*');
        if (!error) setPlans(data);
        setLoading(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1>Membership Plans</h1>
                <button className="btn-primary" onClick={() => alert('Plan creation UI coming soon')}>
                    + Create New Plan
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {loading ? <p>Loading plans...</p> : (
                    plans.length === 0 ? (
                        <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--text-dim)' }}>No membership plans defined yet.</p>
                        </div>
                    ) : (
                        plans.map(plan => (
                            <div key={plan.id} className="card">
                                <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>{plan.name}</h3>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                                    ₩{Number(plan.price).toLocaleString()} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-dim)' }}>/{plan.duration_days} days</span>
                                </p>
                                <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>{plan.description}</p>
                                <div style={{ padding: '0.75rem', background: 'var(--accent)', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                    <strong>{plan.credits}</strong> Credits included
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Edit</button>
                                    <button style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--danger)', color: 'var(--danger)' }}>Disable</button>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
}
