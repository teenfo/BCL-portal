"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";

interface Notice {
    id: string;
    title: string;
    content: string;
    type: string;
    created_at: string;
}

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        const fetchNotices = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("notices")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) console.error(error.message);
            else setNotices(data || []);
            setLoading(false);
        };
        fetchNotices();
    }, [supabase]);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold">Notices</h1>
                <p className="text-muted text-sm">Stay updated with our latest news</p>
            </header>

            {loading ? (
                <div className="space-y-4 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-surface2 rounded-2xl"></div>
                    ))}
                </div>
            ) : (
                <ul className="space-y-4">
                    {notices.map((n) => (
                        <li key={n.id} className="bg-surface p-5 rounded-2xl border border-border shadow-sm hover:shadow-card transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-full uppercase italic tracking-wider">{n.type}</span>
                                <span className="text-[10px] text-muted font-medium italic">{new Date(n.created_at).toLocaleDateString()}</span>
                            </div>
                            <h3 className="font-bold text-base leading-tight">{n.title}</h3>
                            <p className="text-xs text-muted mt-2 line-clamp-2 leading-relaxed opacity-80">{n.content}</p>
                            <button className="mt-4 text-primary text-[10px] font-bold uppercase tracking-widest hover:underline">Read Full Notice →</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
