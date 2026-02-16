'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';


interface Facility {
    id: string;
    name: string;
    address: string;
    phone: string;
    operating_hours: string;
    description: string;
}

export default function FacilitiesPage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

    useEffect(() => {
        loadFacilities();
    }, []);

    async function loadFacilities() {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('facilities')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (!error && data) {
            setFacilities(data);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--bcl-orange)' }}></div>
            </div>
        );
    }

    if (selectedFacility) {
        return (
            <div className="min-h-screen pb-20" style={{ background: 'var(--background)' }}>
                {/* Header */}
                <div className="p-6 pb-4 flex items-center gap-3">
                    <button
                        onClick={() => setSelectedFacility(null)}
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{selectedFacility.name}</h1>
                        <p style={{ color: 'var(--foreground-secondary)' }}>Facility Details</p>
                    </div>
                </div>

                {/* Content */}
                <div className="px-4 space-y-4">
                    {/* Map Placeholder */}
                    <div className="glass-card rounded-xl overflow-hidden">
                        <div
                            className="w-full h-48 flex items-center justify-center"
                            style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                        >
                            <div className="text-center">
                                <svg
                                    className="w-12 h-12 mx-auto mb-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    style={{ color: 'var(--bcl-orange)' }}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                                <p style={{ color: 'var(--foreground-secondary)' }}>Map integration coming soon</p>
                            </div>
                        </div>
                    </div>

                    {/* Info Cards */}
                    <div className="glass-card p-6 rounded-xl space-y-4">
                        <div>
                            <p className="text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>
                                Address
                            </p>
                            <p className="text-white">{selectedFacility.address}</p>
                        </div>
                        <div>
                            <p className="text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>
                                Phone
                            </p>
                            <a href={`tel:${selectedFacility.phone}`} className="text-white">
                                {selectedFacility.phone}
                            </a>
                        </div>
                        <div>
                            <p className="text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>
                                Operating Hours
                            </p>
                            <p className="text-white">{selectedFacility.operating_hours}</p>
                        </div>
                        {selectedFacility.description && (
                            <div>
                                <p className="text-sm mb-1" style={{ color: 'var(--foreground-secondary)' }}>
                                    About
                                </p>
                                <p className="text-white">{selectedFacility.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(selectedFacility.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="glass-card p-4 rounded-xl flex flex-col items-center gap-2 text-center"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--bcl-orange)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            <span className="text-sm text-white">Directions</span>
                        </a>
                        <a
                            href={`tel:${selectedFacility.phone}`}
                            className="glass-card p-4 rounded-xl flex flex-col items-center gap-2 text-center"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--bcl-orange)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-sm text-white">Call</span>
                        </a>
                    </div>
                </div>


            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20" style={{ background: 'var(--background)' }}>
            {/* Header */}
            <div className="p-6 pb-4">
                <h1 className="text-2xl font-bold text-white">Facilities</h1>
                <p style={{ color: 'var(--foreground-secondary)' }}>Our locations</p>
            </div>

            {/* Facilities List */}
            <div className="px-4 space-y-3">
                {facilities.length === 0 ? (
                    <div className="glass-card p-8 rounded-xl text-center">
                        <p style={{ color: 'var(--foreground-secondary)' }}>No facilities available</p>
                    </div>
                ) : (
                    facilities.map((facility) => (
                        <button
                            key={facility.id}
                            onClick={() => setSelectedFacility(facility)}
                            className="glass-card p-4 rounded-xl w-full text-left transition-transform active:scale-95"
                        >
                            <div className="flex items-start gap-4">
                                <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'var(--bcl-orange)' }}
                                >
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-semibold mb-1">{facility.name}</h3>
                                    <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                        {facility.address}
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                                        {facility.operating_hours}
                                    </p>
                                </div>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--foreground-secondary)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    ))
                )}
            </div>


        </div>
    );
}
