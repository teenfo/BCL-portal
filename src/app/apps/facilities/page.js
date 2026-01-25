'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function FacilitiesView() {
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFacilities();
    }, []);

    const fetchFacilities = async () => {
        const { data, error } = await supabase.from('facilities').select('*');
        if (!error) setFacilities(data);
        setLoading(false);
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1rem' }}>Our Facilities</h2>
            {loading ? <p>Loading facilities...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {facilities.map(f => (
                        <div key={f.id} className="card">
                            <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{f.name}</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>📍 {f.address}</p>
                            <p style={{ fontSize: '0.875rem' }}>🕒 {f.operating_hours}</p>
                            <button className="btn-primary" style={{ marginTop: '1rem', width: '100%', fontSize: '0.875rem', padding: '0.5rem' }}>
                                View Classes
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
