'use client';
import { supabase } from '@/lib/supabase/client';
import { useState } from 'react';

export default function UserLogin() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/apps/auth/callback`,
            },
        });
        if (error) setMessage(error.message);
        else setMessage('Check your email for the login link!');
        setLoading(false);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '400px', margin: 'auto' }}>
            <h1>User Login</h1>
            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                />
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.5rem' }}>
                    {loading ? 'Sending...' : 'Send Magic Link'}
                </button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
}
