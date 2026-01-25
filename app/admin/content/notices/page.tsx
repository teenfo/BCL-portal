"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";

interface Notice {
    id: string;
    title: string;
    content: string;
    type: string;
    created_at: string;
}

export default function AdminNoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentNotice, setCurrentNotice] = useState<Partial<Notice>>({ type: 'System' });

    const supabase = createClient();

    const fetchNotices = useCallback(async () => {
        const { data, error } = await supabase
            .from("notices")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) console.error(error.message);
        else setNotices(data || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        // Initial load - wrapped in timeout to avoid sync set-state warning
        const timer = setTimeout(() => {
            fetchNotices();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchNotices]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from("notices").upsert(currentNotice);
        if (error) alert(error.message);
        else { setIsEditing(false); fetchNotices(); }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Content Management</h1>
                <button onClick={() => { setCurrentNotice({ type: 'System' }); setIsEditing(true); }} className="bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold shadow-card">Post Notice</button>
            </div>

            {isEditing && (
                <div className="bg-surface p-6 rounded-2xl border border-border shadow-card">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold uppercase text-muted mb-1">Title</label>
                                <input type="text" value={currentNotice.title || ""} onChange={e => setCurrentNotice({ ...currentNotice, title: e.target.value })} className="w-full bg-surface2 p-3 rounded-xl border border-border outline-none" required />
                            </div>
                            <div className="w-32">
                                <label className="block text-xs font-bold uppercase text-muted mb-1">Type</label>
                                <select value={currentNotice.type || "System"} onChange={e => setCurrentNotice({ ...currentNotice, type: e.target.value })} className="w-full bg-surface2 p-3 rounded-xl border border-border outline-none">
                                    <option>System</option>
                                    <option>Event</option>
                                    <option>Billing</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted mb-1">Content</label>
                            <textarea value={currentNotice.content || ""} onChange={e => setCurrentNotice({ ...currentNotice, content: e.target.value })} className="w-full bg-surface2 p-3 rounded-xl border border-border outline-none" rows={5} required />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" disabled={loading} className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-bold">Publish</button>
                            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-surface2 text-fg py-3 rounded-xl font-bold">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-surface2/50 text-muted border-b border-border font-bold text-[10px] uppercase">
                        <tr>
                            <th className="p-4">Notice Title</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Date</th>
                            <th className="p-4 whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {notices.map(n => (
                            <tr key={n.id}>
                                <td className="p-4 font-bold">{n.title}</td>
                                <td className="p-4"><span className="px-2 py-0.5 rounded-full bg-primary-soft text-primary text-[10px] font-bold uppercase">{n.type}</span></td>
                                <td className="p-4 text-muted">{new Date(n.created_at).toLocaleDateString()}</td>
                                <td className="p-4"><button onClick={() => { setCurrentNotice(n); setIsEditing(true); }} className="text-primary font-bold">Edit</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
