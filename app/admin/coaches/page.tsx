"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";
import { UserCheck, Award, Mail, Phone, Plus, MoreVertical, Shield } from "lucide-react";

interface Coach {
    id: string;
    name: string;
    specialty: string;
    email: string;
    phone: string;
    bio: string;
    is_certified: boolean;
}

export default function CoachesPage() {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        const fetchCoaches = async () => {
            setLoading(true);
            const { data, error } = await supabase.from("coaches").select("*");
            if (error) {
                setCoaches([
                    { id: '1', name: 'Mark Wilson', specialty: 'HIIT / Strength', email: 'mark@bcl.com', phone: '010-1234-5678', bio: 'Expert HIIT coach.', is_certified: true },
                    { id: '2', name: 'Sarah Chen', specialty: 'Yoga / Pilates', email: 'sarah@bcl.com', phone: '010-8765-4321', bio: 'Mindfulness expert.', is_certified: true },
                ]);
            } else {
                setCoaches(data || []);
            }
            setLoading(false);
        };
        fetchCoaches();
    }, [supabase]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Coaching Staff</h1>
                    <p className="text-muted text-sm font-medium mt-1">Manage instructor profiles and certifications.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2"
                >
                    <Plus size={18} />
                    Hire Coach
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-48 bg-surface2 rounded-3xl animate-pulse"></div>)
                ) : (
                    coaches.map(coach => (
                        <div key={coach.id} className="bg-surface rounded-3xl border border-border shadow-soft overflow-hidden group">
                            <div className="h-24 bg-primary/5 flex items-end px-6">
                                <div className="w-16 h-16 rounded-2xl bg-surface border-4 border-surface shadow-card -mb-8 flex items-center justify-center text-xl font-black text-primary">
                                    {coach.name.charAt(0)}
                                </div>
                            </div>
                            <div className="p-6 pt-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-exrabold text-lg tracking-tight flex items-center gap-2">
                                            {coach.name}
                                            {coach.is_certified && <Shield size={14} className="text-success fill-success/10" />}
                                        </h3>
                                        <p className="text-[10px] font-black uppercase text-primary tracking-widest">{coach.specialty}</p>
                                    </div>
                                    <button className="p-2 text-muted hover:bg-surface2 rounded-xl transition-colors">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>

                                <div className="mt-6 space-y-2">
                                    <div className="flex items-center gap-3 text-xs text-muted">
                                        <Mail size={14} />
                                        <span className="font-medium">{coach.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted">
                                        <Phone size={14} />
                                        <span className="font-medium">{coach.phone}</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted">
                                    <span>Rank: Senior</span>
                                    <span className="text-primary cursor-pointer hover:underline">View Schedule →</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
