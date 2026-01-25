'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function NoticesView() {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .order('date', { ascending: false });
        if (!error) setNotices(data);
        setLoading(false);
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1rem' }}>Notices & Announcements</h2>
            {loading ? <p>Loading notices...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {notices.map(n => (
                        <div key={n.id} className="card" style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>{n.category}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{n.date}</span>
                            </div>
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{n.title}</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {n.content}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
