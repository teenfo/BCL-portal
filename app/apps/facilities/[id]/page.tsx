"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Clock, Phone, Globe, ChevronRight, Star } from "lucide-react";

export default function FacilityDetailPage() {
    const params = useParams();
    const router = useRouter();

    const facility = {
        id: params.id,
        name: "Central Branch",
        address: "123 Fitness Ave, Seoul, Korea",
        hours: "06:00 AM - 11:00 PM",
        phone: "02-1234-5678",
        rating: 4.8,
        amenities: ["Free Parking", "Sauna", "Cafe", "WiFi", "Lockers"],
        description: "Our flagship facility featuring world-class equipment and the most extensive schedule of classes in the city."
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-500">
            <header className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-3 bg-surface border border-border rounded-2xl text-muted hover:text-fg transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-black tracking-tight">Branch Info</h1>
            </header>

            {/* Hero Map Placeholder */}
            <div className="aspect-[16/10] bg-surface2 rounded-[3rem] border border-border overflow-hidden relative shadow-inner">
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
                    <MapPin size={48} className="text-primary mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">Live Map Interface</span>
                </div>
            </div>

            <div className="px-1 space-y-2">
                <div className="flex justify-between items-start">
                    <h2 className="text-3xl font-black tracking-tighter">{facility.name}</h2>
                    <div className="flex items-center gap-1 bg-warning/10 text-warning px-2.5 py-1 rounded-full border border-warning/10">
                        <Star size={14} className="fill-warning" />
                        <span className="text-[10px] font-black">{facility.rating}</span>
                    </div>
                </div>
                <p className="text-sm text-muted font-medium flex items-center gap-2">
                    <MapPin size={14} className="text-primary" />
                    {facility.address}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-5 rounded-3xl border border-border shadow-soft">
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Operating Hours</p>
                    <p className="text-xs font-black">{facility.hours}</p>
                </div>
                <div className="bg-surface p-5 rounded-3xl border border-border shadow-soft flex flex-col justify-between">
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Contact</p>
                    <p className="text-xs font-black">{facility.phone}</p>
                </div>
            </div>

            <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted mb-4 px-1">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                    {facility.amenities.map(item => (
                        <span key={item} className="bg-surface border border-border px-4 py-2 rounded-2xl text-[10px] font-bold tracking-tight shadow-sm">
                            {item}
                        </span>
                    ))}
                </div>
            </section>

            <section className="bg-primary/5 rounded-[2.5rem] p-8 border border-primary/10">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">About this location</h3>
                <p className="text-sm text-fg font-medium leading-relaxed italic opacity-80">
                    "{facility.description}"
                </p>
                <button className="mt-8 w-full bg-primary text-on-primary py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95 transition-all">
                    View Class Schedule
                    <ChevronRight size={18} />
                </button>
            </section>

            <div className="h-10 md:hidden"></div>
        </div>
    );
}
