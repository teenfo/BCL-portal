"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/assets/theme/hooks/supabase";

interface Facility {
    id: string;
    name: string;
    address: string;
    operating_hours: string;
    created_at: string;
}

export default function FacilitySettingsPage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentFacility, setCurrentFacility] = useState<Partial<Facility>>({});

    const supabase = createClient();

    const fetchFacilities = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("facilities")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching facilities:", error.message);
        } else {
            setFacilities(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchFacilities();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from("facilities")
            .upsert({
                ...currentFacility,
                updated_at: new Date().toISOString(),
            });

        if (error) {
            alert("Error saving: " + error.message);
        } else {
            setIsEditing(false);
            setCurrentFacility({});
            fetchFacilities();
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Facility Management</h1>
                <button
                    onClick={() => {
                        setCurrentFacility({});
                        setIsEditing(true);
                    }}
                    className="bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold shadow-card"
                >
                    Add New Branch
                </button>
            </div>

            {isEditing ? (
                <div className="bg-surface p-6 rounded-2xl border border-border shadow-card animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="font-bold mb-4">{currentFacility.id ? "Edit Branch" : "New Branch"}</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-muted mb-1">Branch Name</label>
                                <input
                                    type="text"
                                    value={currentFacility.name || ""}
                                    onChange={(e) => setCurrentFacility({ ...currentFacility, name: e.target.value })}
                                    className="w-full bg-surface2 p-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-muted mb-1">Operating Hours</label>
                                <input
                                    type="text"
                                    value={currentFacility.operating_hours || ""}
                                    onChange={(e) => setCurrentFacility({ ...currentFacility, operating_hours: e.target.value })}
                                    className="w-full bg-surface2 p-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="e.g., 06:00 - 23:00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted mb-1">Address</label>
                            <textarea
                                value={currentFacility.address || ""}
                                onChange={(e) => setCurrentFacility({ ...currentFacility, address: e.target.value })}
                                className="w-full bg-surface2 p-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/20"
                                rows={3}
                                required
                            ></textarea>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button type="submit" disabled={loading} className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-bold">Save Changes</button>
                            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-surface2 text-fg py-3 rounded-xl font-bold">Cancel</button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {loading ? (
                        <div className="col-span-full py-12 text-center text-muted animate-pulse">Loading branches...</div>
                    ) : facilities.length === 0 ? (
                        <div className="col-span-full py-12 bg-surface rounded-2xl border border-dashed border-border text-center text-muted">
                            No branches registered yet.
                        </div>
                    ) : (
                        facilities.map((f) => (
                            <div key={f.id} className="bg-surface p-6 rounded-2xl border border-border shadow-card flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">{f.name}</h3>
                                        <p className="text-xs text-muted mt-1">{f.address}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCurrentFacility(f);
                                            setIsEditing(true);
                                        }}
                                        className="text-primary text-xs font-bold p-2 hover:bg-primary/5 rounded-lg"
                                    >
                                        Edit
                                    </button>
                                </div>
                                <div className="mt-auto pt-4 border-t border-border flex justify-between items-center text-sm">
                                    <span className="text-muted">Status</span>
                                    <span className="text-success font-medium">Active</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
