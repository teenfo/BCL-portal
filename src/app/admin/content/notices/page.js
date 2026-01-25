'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function NoticeManagement() {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setNotices(data);
        setLoading(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1>Notice Management</h1>
                <button className="btn-primary" onClick={() => alert('Add Notice UI coming soon')}>
                    + New Notice
                </button>
            </div>

            <div className="card">
                {loading ? <p>Loading...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-dim)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Title</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Author</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Date</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Views</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notices.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                                        No notices found.
                                    </td>
                                </tr>
                            ) : (
                                notices.map(notice => (
                                    <tr key={notice.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>{notice.title}</td>
                                        <td style={{ padding: '1rem' }}>{notice.author}</td>
                                        <td style={{ padding: '1rem' }}>{new Date(notice.date).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem' }}>{notice.views}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--primary)', marginRight: '0.5rem' }}>Edit</button>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--danger)' }}>Delete</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
