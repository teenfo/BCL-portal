'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function UserMembership() {
    const [membership, setMembership] = useState(null);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: memData } = await supabase
                .from('memberships')
                .select('*, membership_plans(name)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            setMembership(memData);
        }

        const { data: planData } = await supabase.from('membership_plans').select('*');
        setPlans(planData);
        setLoading(false);
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem' }}>Membership</h2>

            {loading ? <p>Loading...</p> : (
                <>
                    {membership ? (
                        <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>Current Plan</span>
                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--accent)', color: 'var(--primary)', fontWeight: 'bold' }}>{membership.status.toUpperCase()}</span>
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{membership.membership_plans?.name}</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span>Remaining Credits</span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{membership.remaining_credits}</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>Expires on: {membership.end_date}</p>
                        </div>
                    ) : (
                        <div className="card" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <p>You don't have an active membership.</p>
                        </div>
                    )}

                    <h3 style={{ marginBottom: '1rem' }}>Available Plans</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {plans.map(plan => (
                            <div key={plan.id} className="card" style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ fontSize: '1rem' }}>{plan.name}</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{plan.credits} Credits • {plan.duration_days} Days</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontWeight: 'bold' }}>₩{Number(plan.price).toLocaleString()}</p>
                                        <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', marginTop: '0.5rem' }}>Buy Now</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
