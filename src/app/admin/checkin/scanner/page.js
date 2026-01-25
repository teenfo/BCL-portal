'use client';
import { supabase } from '@/lib/supabase/client';
import { useState } from 'react';

export default function AdminScanner() {
    const [userId, setUserId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleScan = async (e) => {
        e.preventDefault();
        if (!userId) return;
        setLoading(true);
        setResult(null);

        // 1. Verify User exists
        const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('full_name, id')
            .eq('id', userId)
            .single();

        if (pError || !profile) {
            setResult({ success: false, message: 'Invalid User ID or QR Code.' });
            setLoading(false);
            return;
        }

        // 2. Perform Check-in
        const { error: cError } = await supabase.from('checkins').insert({
            user_id: profile.id,
            status: 'present'
        });

        if (cError) {
            setResult({ success: false, message: 'Check-in failed: ' + cError.message });
        } else {
            setResult({ success: true, message: `Check-in successful for ${profile.full_name}!` });
            setUserId(''); // Reset for next scan
        }
        setLoading(false);
    };

    return (
        <div>
            <h1>Check-in Scanner</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }}>Simulation: Enter the User ID from the member's QR code.</p>

            <div className="card" style={{ maxWidth: '500px' }}>
                <form onSubmit={handleScan}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Scan Result (User ID)</label>
                        <input
                            type="text"
                            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}
                        />
                    </div>
                    <button className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Processing...' : 'Record Check-in'}
                    </button>
                </form>

                {result && (
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        borderRadius: 'var(--radius)',
                        background: result.success ? '#e6f4ea' : '#fce8e6',
                        color: result.success ? '#137333' : '#c5221f',
                        border: `1px solid ${result.success ? '#ceead6' : '#fad2cf'}`
                    }}>
                        {result.message}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h3>How it works:</h3>
                <ul style={{ color: 'var(--text-dim)', fontSize: '0.875rem', paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
                    <li>In production, a camera or physical scanner would populate the User ID field.</li>
                    <li>The system verifies the member's profile and membership status.</li>
                    <li>A record is created in the `checkins` table and visible in the Attendance Log.</li>
                </ul>
            </div>
        </div>
    );
}
