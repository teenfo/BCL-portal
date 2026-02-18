'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Facility {
    id: string;
    name: string;
    address: string;
    phone?: string;
    operating_hours: any;
    amenities?: string[];
    description?: string;
}

const AMENITY_MAP: Record<string, { icon: string; label: string }> = {
    shower: { icon: '🚿', label: 'Showers' },
    locker: { icon: '🔒', label: 'Lockers' },
    parking: { icon: '🅿️', label: 'Free Parking' },
    towel: { icon: '🧺', label: 'Towels' },
    wifi: { icon: '📶', label: 'Free WiFi' },
    sauna: { icon: '♨️', label: 'Sauna' },
    store: { icon: '🛒', label: 'Pro Shop' },
    water: { icon: '💧', label: 'Water Station' },
};

const DEFAULT_AMENITIES = ['shower', 'locker', 'parking', 'towel', 'wifi', 'water'];

export default function UserFacilitiesPage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        loadFacilities();
    }, []);

    async function loadFacilities() {
        const supabase = createClient();
        const { data } = await supabase
            .from('facilities')
            .select('*')
            .order('name');
        if (data) setFacilities(data as any);
        setLoading(false);
    }

    function getOperatingHoursDisplay(hours: any) {
        if (!hours) return null;
        return [
            { day: 'Weekdays (Mon-Fri)', time: hours },
            { day: 'Saturday', time: hours },
            { day: 'Sun / Holidays', time: 'Closed' },
        ];
    }

    if (loading) {
        return (
            <div className="app-page">
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Facilities</h1>
                {[1, 2].map(i => (
                    <div key={i} className="app-skeleton" style={{ height: 160, marginBottom: '1rem', borderRadius: 20 }} />
                ))}
            </div>
        );
    }

    return (
        <div className="app-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Facilities</h1>
                    <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.8125rem', marginTop: 2 }}>
                        {facilities.length} location{facilities.length !== 1 ? 's' : ''} available
                    </p>
                </div>
            </div>

            {facilities.length === 0 ? (
                <div className="app-empty-state">
                    <div className="emoji">📍</div>
                    <div className="message">No facilities found</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {facilities.map((facility, idx) => {
                        const isExpanded = expandedId === facility.id;
                        const amenities = facility.amenities || DEFAULT_AMENITIES;
                        const gymIcons = ['🏋️', '💪', '🥊', '🧘'];

                        return (
                            <div key={facility.id} className="app-glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Header */}
                                <div
                                    style={{
                                        padding: '1.25rem',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => setExpandedId(isExpanded ? null : facility.id)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 14,
                                            background: 'var(--app-accent-light)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.5rem', flexShrink: 0,
                                        }}>
                                            {gymIcons[idx % gymIcons.length]}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>
                                                {facility.name}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--app-text-secondary)', fontSize: '0.8125rem', marginTop: 4 }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                                {facility.address || 'Address unavailable'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--app-text-secondary)', fontSize: '0.8125rem', marginTop: 2 }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <polyline points="12 6 12 12 16 14" />
                                                </svg>
                                                {facility.operating_hours || 'Hours TBD'}
                                            </div>
                                        </div>
                                        <span style={{
                                            color: 'var(--app-text-muted)', fontSize: '0.75rem',
                                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                                            transition: 'transform 0.3s ease',
                                        }}>▼</span>
                                    </div>
                                </div>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div style={{ padding: '0 1.25rem 1.25rem', animation: 'appFadeIn 0.3s ease' }}>
                                        <div className="app-divider" />

                                        {facility.description && (
                                            <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.8125rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                                                {facility.description}
                                            </p>
                                        )}

                                        {/* Operating Hours */}
                                        <div className="app-section-label" style={{ marginBottom: '0.5rem' }}>HOURS</div>
                                        <div style={{ marginBottom: '1rem' }}>
                                            {getOperatingHoursDisplay(facility.operating_hours)?.map((item, i) => (
                                                <div key={i} style={{
                                                    display: 'flex', justifyContent: 'space-between',
                                                    padding: '0.5rem 0',
                                                    borderBottom: i < 2 ? '1px solid var(--app-border)' : 'none',
                                                }}>
                                                    <span style={{ color: 'var(--app-text-secondary)', fontSize: '0.8125rem' }}>
                                                        {item.day}
                                                    </span>
                                                    <span style={{
                                                        color: item.time === 'Closed' ? 'var(--app-danger)' : 'var(--app-text-primary)',
                                                        fontSize: '0.8125rem', fontWeight: 500,
                                                    }}>
                                                        {item.time}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Amenities */}
                                        <div className="app-section-label" style={{ marginBottom: '0.5rem' }}>AMENITIES</div>
                                        <div className="amenity-grid" style={{ marginBottom: '1rem' }}>
                                            {amenities.slice(0, 8).map(key => {
                                                const amenity = AMENITY_MAP[key] || { icon: '✨', label: key };
                                                return (
                                                    <div key={key} className="amenity-item">
                                                        <span className="amenity-icon">{amenity.icon}</span>
                                                        <span className="amenity-label">{amenity.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <a
                                                href={`tel:${facility.phone || ''}`}
                                                className="app-btn-outline"
                                                style={{ textDecoration: 'none', textAlign: 'center' }}
                                            >
                                                📞 Call
                                            </a>
                                            <a
                                                href={`https://map.naver.com/v5/search/${encodeURIComponent(facility.address || facility.name)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="app-btn-primary"
                                                style={{ textDecoration: 'none', textAlign: 'center' }}
                                            >
                                                🗺️ Directions
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
