'use client';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function AdminSupport() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false });
        if (!error) setTickets(data);
        setLoading(false);
    };

    return (
        <div>
            <h1>Support Tickets</h1>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-dim)' }}>Manage customer inquiries and support requests.</p>

            <div className="card">
                {loading ? <p>Loading tickets...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-dim)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Subject</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Member</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Status</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Date</th>
                                <th style={{ textAlign: 'right', padding: '1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                                        No support tickets found.
                                    </td>
                                </tr>
                            ) : (
                                tickets.map(ticket => (
                                    <tr key={ticket.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}><strong>{ticket.subject}</strong></td>
                                        <td style={{ padding: '1rem' }}>{ticket.profiles?.full_name}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--accent)', color: 'var(--primary)' }}>
                                                {ticket.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{new Date(ticket.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Reply</button>
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
