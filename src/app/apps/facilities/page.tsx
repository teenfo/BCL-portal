'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import { useToast } from '@/components/ui/Toast';
import { AppSkeleton, AppEmptyState } from '@/components/apps';

interface Facility {
    id: string;
    name: string;
    address: string;
    phone?: string;
    operating_hours: any;
    amenities?: string[];
    description?: string;
    latitude?: number;
    longitude?: number;
    photos?: string[];
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

function isCurrentlyOpen(hours: any): { isOpen: boolean; label: string } {
    if (!hours) return { isOpen: false, label: 'Hours TBD' };

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat

    // Simple heuristic based on common gym hours
    if (dayOfWeek === 0) return { isOpen: false, label: 'Closed Today' };

    // If hours is a string like "06:00 - 22:00"
    if (typeof hours === 'string') {
        const match = hours.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
        if (match) {
            const openHour = parseInt(match[1]) * 60 + parseInt(match[2]);
            const closeHour = parseInt(match[3]) * 60 + parseInt(match[4]);
            const currentMin = now.getHours() * 60 + now.getMinutes();

            if (currentMin >= openHour && currentMin < closeHour) {
                const minsToClose = closeHour - currentMin;
                const hoursToClose = Math.floor(minsToClose / 60);
                return {
                    isOpen: true,
                    label: hoursToClose > 0 ? `Open · Closes in ${hoursToClose}h` : `Open · Closing soon`,
                };
            }
            return {
                isOpen: false,
                label: currentMin < openHour ? `Opens at ${match[1]}:${match[2]}` : 'Closed',
            };
        }
    }

    return { isOpen: true, label: 'Open Now' };
}

export default function UserFacilitiesPage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
    const toast = useToast();

    useEffect(() => {
        loadFacilities();
    }, []);

    async function loadFacilities() {
        const { data } = await query('facilities')
            
            .select('*')
            .order('name');
        if (data) setFacilities(data as any);
        setLoading(false);
    }

    async function copyAddress(address: string, facilityId: string) {
        try {
            await navigator.clipboard.writeText(address);
            setCopiedId(facilityId);
            toast.success('주소가 복사되었습니다! 📋');
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast.warning('클립보드 접근이 제한되었습니다.');
        }
    }

    function getOperatingHoursDisplay(hours: any) {
        if (!hours) return null;
        if (typeof hours === 'string') {
            return [
                { day: 'Weekdays (Mon-Fri)', time: hours },
                { day: 'Saturday', time: hours },
                { day: 'Sun / Holidays', time: 'Closed' },
            ];
        }
        return [
            { day: 'Weekdays (Mon-Fri)', time: hours?.weekday || hours },
            { day: 'Saturday', time: hours?.saturday || hours },
            { day: 'Sun / Holidays', time: hours?.sunday || 'Closed' },
        ];
    }

    if (loading) {
        return (
            <div className="app-page">
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Facilities</h1>
                <AppSkeleton variant="card" count={2} />
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
                <AppEmptyState
                    icon="📍"
                    title="시설 정보가 없습니다"
                    description="등록된 시설이 아직 없습니다."
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {facilities.map((facility, idx) => {
                        const isExpanded = expandedId === facility.id;
                        const amenities = facility.amenities || DEFAULT_AMENITIES;
                        const gymIcons = ['🏋️', '💪', '🥊', '🧘'];
                        const openStatus = isCurrentlyOpen(facility.operating_hours);

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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>
                                                    {facility.name}
                                                </h3>
                                                {/* Open/Closed Badge */}
                                                <span style={{
                                                    fontSize: '0.625rem', fontWeight: 700,
                                                    padding: '0.125rem 0.375rem',
                                                    borderRadius: 9999,
                                                    background: openStatus.isOpen ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                                    color: openStatus.isOpen ? '#22C55E' : '#EF4444',
                                                }}>
                                                    {openStatus.isOpen ? 'OPEN' : 'CLOSED'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.6875rem', color: openStatus.isOpen ? '#22C55E' : 'var(--app-text-muted)', marginTop: 2 }}>
                                                {openStatus.label}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--app-text-secondary)', fontSize: '0.8125rem', marginTop: 4 }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                                {facility.address || 'Address unavailable'}
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

                                        {/* Photo Gallery */}
                                        {facility.photos && facility.photos.length > 0 && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div className="app-section-label" style={{ marginBottom: '0.5rem' }}>PHOTOS</div>
                                                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                                                    {facility.photos.map((photo, i) => (
                                                        <div
                                                            key={i}
                                                            onClick={() => setPhotoModalUrl(photo)}
                                                            style={{
                                                                width: 100, height: 75, borderRadius: 'var(--app-radius-md)',
                                                                background: `url(${photo}) center/cover`,
                                                                flexShrink: 0, cursor: 'pointer',
                                                                border: '1px solid var(--app-border)',
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
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
                                            {amenities.slice(0, 8).map((key: string) => {
                                                const amenity = AMENITY_MAP[key] || { icon: '✨', label: key };
                                                return (
                                                    <div key={key} className="amenity-item">
                                                        <span className="amenity-icon">{amenity.icon}</span>
                                                        <span className="amenity-label">{amenity.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Action Buttons - 3 columns */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                            {facility.phone && (
                                                <a
                                                    href={`tel:${facility.phone}`}
                                                    className="app-btn-outline"
                                                    style={{ textDecoration: 'none', textAlign: 'center', fontSize: '0.8125rem', padding: '0.625rem' }}
                                                >
                                                    📞 Call
                                                </a>
                                            )}
                                            <a
                                                href={`https://map.kakao.com/link/search/${encodeURIComponent(facility.address || facility.name)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="app-btn-primary"
                                                style={{ textDecoration: 'none', textAlign: 'center', fontSize: '0.8125rem', padding: '0.625rem' }}
                                            >
                                                🗺️ Directions
                                            </a>
                                            <button
                                                onClick={() => copyAddress(facility.address, facility.id)}
                                                className="app-btn-outline"
                                                style={{ fontSize: '0.8125rem', padding: '0.625rem' }}
                                            >
                                                {copiedId === facility.id ? '✅ Copied!' : '📋 Copy'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Photo Modal */}
            {photoModalUrl && (
                <>
                    <div
                        onClick={() => setPhotoModalUrl(null)}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.8)', zIndex: 999,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: 'appFadeIn 0.2s ease',
                        }}
                    >
                        <img
                            src={photoModalUrl}
                            alt="Facility photo"
                            style={{
                                maxWidth: '90%', maxHeight: '80vh',
                                borderRadius: 'var(--app-radius-lg)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
