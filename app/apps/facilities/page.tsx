"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";

interface Facility {
    id: string;
    name: string;
    address: string;
    operating_hours: string;
}

export default function FacilitiesPage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        const fetchFacilities = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("facilities")
                .select("id, name, address, operating_hours")
                .order("name", { ascending: true });

            if (error) {
                console.error("Error fetching facilities:", error.message);
            } else {
                setFacilities(data || []);
            }
            setLoading(false);
        };

        fetchFacilities();
    }, [supabase]);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold">Facilities</h1>
                <p className="text-muted text-sm">Explore our branches and amenities</p>
            </header>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="h-48 bg-surface2 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            ) : facilities.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-border p-8 text-center">
                    <p className="text-muted text-sm">No facilities found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {facilities.map((f) => (
                        <div key={f.id} className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card animate-in fade-in zoom-in-95 duration-300">
                            <div className="h-32 bg-primary/5 flex items-center justify-center text-3xl">🏢</div>
                            <div className="p-5">
                                <h3 className="font-bold text-lg">{f.name}</h3>
                                <p className="text-xs text-muted mb-4 leading-relaxed">{f.address}</p>

                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-xs">🕒</div>
                                    <div>
                                        <p className="text-[10px] text-muted uppercase font-bold">Operating Hours</p>
                                        <p className="text-xs font-medium">{f.operating_hours || "Contact for info"}</p>
                                    </div>
                                </div>

                                <button className="w-full bg-primary text-on-primary py-3 rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-opacity">
                                    View Programs
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
