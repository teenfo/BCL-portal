'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function UserProfile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (!error) setProfile({ ...data, email: user.email });
        }
        setLoading(false);
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem' }}>My Profile</h2>
            {loading ? <p>Loading...</p> : (
                profile ? (
                    <div className="card">
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                                {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', borderRadius: '50%' }} alt="" /> : '👤'}
                            </div>
                            <h3>{profile.full_name || 'Anonymous Member'}</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>{profile.email}</p>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span style={{ color: 'var(--text-dim)' }}>Role</span>
                                <span style={{ fontWeight: '500' }}>{profile.role}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span style={{ color: 'var(--text-dim)' }}>Membership</span>
                                <span style={{ fontWeight: '500', color: 'var(--primary)' }}>Active</span>
                            </div>
                        </div>

                        <button
                            className="btn-primary"
                            style={{ width: '100%', marginTop: '1.5rem', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            onClick={() => window.location.href = '/auth/logout'}
                        >
                            Log Out
                        </button>
                    </div>
                ) : (
                    <div className="card" style={{ textAlign: 'center' }}>
                        <p>Please log in to view your profile.</p>
                        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => window.location.href = '/apps/auth/login'}>
                            Go to Login
                        </button>
                    </div>
                )
            )}
        </div>
    );
}
