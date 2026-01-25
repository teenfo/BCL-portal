'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function FacilitySettings() {
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
        <div className="card">
            <h2>Facility Settings</h2>
            <p>Configure your branch information here. This data is shared with the User App.</p>

            {loading ? <p>Loading...</p> : (
                <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Address</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        {facilities.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '0.5rem' }}>{f.name}</td>
                                <td style={{ padding: '0.5rem' }}>{f.address}</td>
                                <td style={{ padding: '0.5rem' }}>{f.operating_hours}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => alert('Feature coming soon: Add Facility')}>
                Add Facility
            </button>
        </div>
    );
}
