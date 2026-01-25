"use client";

import { MapPin, Phone, Clock, Navigation, ChevronRight } from "lucide-react";

export default function UserFacilitiesPage() {
    const facilities = [
        {
            id: 1,
            name: "Central Branch",
            distance: "0.8km",
            status: "Open Now",
            statusColor: "text-success",
            image: "bg-slate-200", // placeholder class
            address: "123 Fitness Ave, Seoul"
        },
        {
            id: 2,
            name: "Gangnam Studio",
            distance: "3.2km",
            status: "Busy",
            statusColor: "text-warning",
            image: "bg-slate-300",
            address: "Teheran-ro 42, Seoul"
        },
        {
            id: 3,
            name: "West Side Lab",
            distance: "5.4km",
            status: "Closed",
            statusColor: "text-danger",
            image: "bg-slate-400",
            address: "Mapo-gu 101, Seoul"
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-24">
            <header>
                <h1 className="text-2xl font-black tracking-tight">Our Locations</h1>
                <p className="text-muted text-sm font-medium mt-1">Find a gym near you.</p>
            </header>

            <div className="space-y-6">
                {facilities.map((facility) => (
                    <div key={facility.id} className="bg-surface rounded-[2rem] border border-border overflow-hidden shadow-soft group cursor-pointer active:scale-[0.99] transition-all">
                        <div className={`h-32 ${facility.image} relative`}>
                            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${facility.status === 'Open Now' ? 'bg-success' : facility.status === 'Busy' ? 'bg-warning' : 'bg-danger'}`}></span>
                                <span className="text-[10px] font-bold uppercase tracking-wide">{facility.status}</span>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-extrabold text-lg tracking-tight">{facility.name}</h3>
                                    <div className="flex items-center gap-1 text-muted mt-1">
                                        <MapPin size={12} />
                                        <span className="text-xs font-medium">{facility.address}</span>
                                    </div>
                                </div>
                                <div className="bg-surface2 px-2 py-1 rounded-lg">
                                    <span className="text-[10px] font-black text-muted uppercase">{facility.distance}</span>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-2">
                                <button className="flex-1 bg-surface2 text-fg py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-surface2/80">
                                    <Phone size={14} />
                                    Call
                                </button>
                                <button className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90">
                                    <Navigation size={14} />
                                    Directions
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
