'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function CheckinPage() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user));
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <h2 style={{ marginBottom: '2rem' }}>Check-in</h2>

            <div className="card" style={{ width: '280px', height: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                {user ? (
                    <>
                        <div style={{ width: '200px', height: '200px', background: '#eee', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                            {/* This would be a real QR code component in production */}
                            <div style={{ border: '10px solid #333', padding: '10px' }}>
                                <div style={{ width: '120px', height: '120px', background: '#333' }}></div>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Scan at Front Desk</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{user.id.substring(0, 8)}...</p>
                    </>
                ) : (
                    <p>Please login to generate QR</p>
                )}
            </div>

            <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-dim)', maxWidth: '280px' }}>
                Show this QR code to the scanner at the facility entrance to record your attendance.
            </p>
        </div>
    );
}
