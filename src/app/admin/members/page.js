'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function MemberManagement() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'user');
        if (!error) setMembers(data);
        setLoading(false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1>Member Management</h1>
                <button className="btn-primary" onClick={() => alert('Add Member UI coming soon')}>
                    + New Member
                </button>
            </div>

            <div className="card">
                {loading ? <p>Loading...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-dim)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Name</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Email</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Role</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                                        No members found.
                                    </td>
                                </tr>
                            ) : (
                                members.map(member => (
                                    <tr key={member.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>{member.full_name}</td>
                                        <td style={{ padding: '1rem' }}>{member.email || 'N/A'}</td>
                                        <td style={{ padding: '1rem' }}>{member.role}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--primary)', marginRight: '0.5rem' }}>View</button>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--danger)' }}>Edit</button>
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
