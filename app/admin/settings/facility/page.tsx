"use client";

import { Building2, MapPin, Clock, Phone, Globe, Save, Upload, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function AdminFacilitySettingsPage() {
    const [facility, setFacility] = useState({
        name: "Central Branch",
        address: "123 Fitness Ave, Seoul, Korea",
        hours: "06:00 AM - 11:00 PM",
        phone: "02-1234-5678",
        email: "central@bcl.com",
        manager: "Mark Wilson"
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Facility Settings</h1>
                    <p className="text-muted text-sm font-medium mt-1">Update branch Information, operating hours, and contact details.</p>
                </div>
                <button className="bg-primary text-on-primary px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95 transition-all">
                    <Save size={18} />
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-soft space-y-6">
                        <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                            <Building2 size={18} className="text-primary" />
                            General Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-widest pl-1">Branch Name</label>
                                <input type="text" value={facility.name} className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-widest pl-1">Branch Manager</label>
                                <input type="text" value={facility.manager} className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-widest pl-1">Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
                                    <input type="text" value={facility.address} className="w-full bg-surface2 border border-border pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-soft space-y-6">
                        <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                            <Clock size={18} className="text-primary" />
                            Business Hours
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-widest pl-1">Operating Hours</label>
                                <input type="text" value={facility.hours} className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-widest pl-1">Peak Status Tracking</label>
                                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-xl border border-success/10">
                                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                                    <span className="text-[10px] font-black text-success uppercase">Active</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-soft text-center space-y-6">
                        <div className="w-20 h-20 bg-surface2 rounded-[2rem] border border-dashed border-border flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-surface2/50 transition-colors">
                            <Upload size={24} className="text-muted" />
                        </div>
                        <p className="text-[10px] font-black uppercase text-muted tracking-widest">Branch Photo</p>
                        <button className="text-[10px] font-black text-primary uppercase border border-primary/20 px-4 py-2 rounded-xl hover:bg-primary/5">Replace Image</button>
                    </section>

                    <section className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-soft space-y-4">
                        <h3 className="text-sm font-bold mb-4">Zones & Studios</h3>
                        {['Studio A', 'Matrix Room', 'Locker Room'].map(z => (
                            <div key={z} className="flex justify-between items-center p-3 bg-surface2/50 rounded-xl group">
                                <span className="text-xs font-bold">{z}</span>
                                <button className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                            </div>
                        ))}
                        <button className="w-full py-3 rounded-xl border border-dashed border-border text-[10px] font-black uppercase text-muted hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2 mt-4">
                            <Plus size={14} />
                            Add Zone
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}
