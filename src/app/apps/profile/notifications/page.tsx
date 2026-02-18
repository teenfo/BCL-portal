'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import Link from 'next/link';

interface NotifPrefs {
    class_reminder: boolean;
    waitlist_vacancy: boolean;
    membership_expiry: boolean;
    promotion: boolean;
    checkin: boolean;
    system_notification: boolean;
    push_enabled: boolean;
    kakao_enabled: boolean;
    sms_enabled: boolean;
    email_enabled: boolean;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
}

const DEFAULT_PREFS: NotifPrefs = {
    class_reminder: true,
    waitlist_vacancy: true,
    membership_expiry: true,
    promotion: true,
    checkin: true,
    system_notification: true,
    push_enabled: true,
    kakao_enabled: false,
    sms_enabled: false,
    email_enabled: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
};

const CATEGORY_ITEMS = [
    { key: 'class_reminder' as const, icon: '📅', label: 'Class Reminders', desc: 'Get reminded before your classes start' },
    { key: 'waitlist_vacancy' as const, icon: '🎉', label: 'Vacancy Alerts', desc: 'Notified when a spot opens up' },
    { key: 'membership_expiry' as const, icon: '⚠️', label: 'Membership Expiry', desc: 'Membership renewal reminders' },
    { key: 'promotion' as const, icon: '🎁', label: 'Promotions', desc: 'Deals and special offers' },
    { key: 'checkin' as const, icon: '✅', label: 'Check-in Updates', desc: 'Check-in confirmations' },
    { key: 'system_notification' as const, icon: '🔧', label: 'System', desc: 'System updates and maintenance' },
];

export default function NotificationSettingsPage() {
    const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { isSubscribed, isSupported, isPWA, isIOS, subscribe, unsubscribe, checkSubscription } = usePushSubscription();
    const [showPWABanner, setShowPWABanner] = useState(false);

    const loadPrefs = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (data) {
            const cats = (data.categories as any) || {};
            setPrefs({
                class_reminder: cats.class_reminder ?? true,
                waitlist_vacancy: cats.waitlist_vacancy ?? true,
                membership_expiry: cats.membership_expiry ?? true,
                promotion: cats.promotion ?? true,
                checkin: cats.checkin ?? true,
                system_notification: cats.system_notification ?? true,
                push_enabled: data.push_enabled ?? true,
                kakao_enabled: data.kakao_enabled ?? false,
                sms_enabled: data.sms_enabled ?? false,
                email_enabled: data.email_enabled ?? false,
                quiet_hours_start: (data as any).quiet_hours_start || null,
                quiet_hours_end: (data as any).quiet_hours_end || null,
            });
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadPrefs();
        checkSubscription();
    }, [loadPrefs, checkSubscription]);

    useEffect(() => {
        if (isIOS && !isPWA) {
            setShowPWABanner(true);
        }
    }, [isIOS, isPWA]);

    async function savePrefs(update: Partial<NotifPrefs>) {
        const newPrefs = { ...prefs, ...update };
        setPrefs(newPrefs);
        setSaving(true);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        const { data: member } = await supabase
            .from('members')
            .select('id')
            .eq('user_id', user.id)
            .single();

        await (supabase as any).from('notification_preferences').upsert({
            user_id: user.id,
            push_enabled: newPrefs.push_enabled,
            kakao_enabled: newPrefs.kakao_enabled,
            sms_enabled: newPrefs.sms_enabled,
            email_enabled: newPrefs.email_enabled,
            categories: {
                class_reminder: newPrefs.class_reminder,
                waitlist_vacancy: newPrefs.waitlist_vacancy,
                membership_expiry: newPrefs.membership_expiry,
                promotion: newPrefs.promotion,
                checkin: newPrefs.checkin,
                system_notification: newPrefs.system_notification,
            },
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        setSaving(false);
    }

    async function handlePushToggle() {
        if (isSubscribed) {
            await unsubscribe();
            savePrefs({ push_enabled: false });
        } else {
            const success = await subscribe();
            if (success) {
                savePrefs({ push_enabled: true });
            }
        }
    }

    if (loading) {
        return (
            <div className="app-page">
                <div className="app-skeleton" style={{ width: '50%', height: 28, marginBottom: 24 }} />
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="app-skeleton" style={{ height: 64, marginBottom: 8, borderRadius: 16 }} />
                ))}
            </div>
        );
    }

    return (
        <div className="app-page">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
                <Link href="/apps/profile" style={{
                    color: 'var(--app-text-secondary)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </Link>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                    Notification Settings
                </h1>
                {saving && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--app-accent)', marginLeft: 'auto' }}>
                        Saving...
                    </span>
                )}
            </div>

            {/* iOS PWA Banner */}
            {showPWABanner && (
                <div style={{
                    padding: '16px',
                    borderRadius: 16,
                    background: 'rgba(210, 105, 30, 0.06)',
                    border: '1px solid rgba(210, 105, 30, 0.15)',
                    marginBottom: '1.5rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: '1.25rem' }}>📱</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                            Install App for Push Notifications
                        </span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                        On iPhone, tap the <strong>Share</strong> button (↗) → <strong>&quot;Add to Home Screen&quot;</strong> to receive push notifications even when the app is closed.
                    </p>
                    <button
                        onClick={() => setShowPWABanner(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--app-accent)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Got it
                    </button>
                </div>
            )}

            {/* Push Notification Toggle */}
            <div className="app-section-label">PUSH NOTIFICATIONS</div>
            <div className="app-glass-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--app-text-primary)' }}>
                            Push Notifications
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--app-text-secondary)', marginTop: 2 }}>
                            {isSupported
                                ? isSubscribed
                                    ? 'Enabled — you\'ll receive push alerts'
                                    : 'Enable to get notified even when app is closed'
                                : 'Not supported in this browser'}
                        </div>
                    </div>
                    <button
                        className={`app-toggle ${isSubscribed ? 'active' : ''}`}
                        onClick={handlePushToggle}
                        disabled={!isSupported || (isIOS && !isPWA)}
                    />
                </div>
                {isIOS && !isPWA && (
                    <div style={{ fontSize: '0.6875rem', color: 'var(--app-warning)', marginTop: 8 }}>
                        ⚠ Push requires the app to be installed on your home screen
                    </div>
                )}
            </div>

            {/* Channel Settings */}
            <div className="app-section-label">NOTIFICATION CHANNELS</div>
            <div className="app-menu-list" style={{ marginBottom: '1.5rem' }}>
                <div className="app-menu-item" style={{ cursor: 'default' }}>
                    <div className="menu-icon">📱</div>
                    <div className="menu-content">
                        <div className="menu-label">In-App Notifications</div>
                        <div className="menu-desc">Always on — shown inside the app</div>
                    </div>
                    <button className="app-toggle active" disabled />
                </div>
                <div className="app-menu-item" onClick={() => savePrefs({ kakao_enabled: !prefs.kakao_enabled })} style={{ cursor: 'pointer' }}>
                    <div className="menu-icon">💬</div>
                    <div className="menu-content">
                        <div className="menu-label">KakaoTalk</div>
                        <div className="menu-desc">Important alerts via KakaoTalk</div>
                    </div>
                    <button className={`app-toggle ${prefs.kakao_enabled ? 'active' : ''}`} />
                </div>
                <div className="app-menu-item" onClick={() => savePrefs({ sms_enabled: !prefs.sms_enabled })} style={{ cursor: 'pointer' }}>
                    <div className="menu-icon">✉️</div>
                    <div className="menu-content">
                        <div className="menu-label">SMS</div>
                        <div className="menu-desc">Text message alerts</div>
                    </div>
                    <button className={`app-toggle ${prefs.sms_enabled ? 'active' : ''}`} />
                </div>
                <div className="app-menu-item" onClick={() => savePrefs({ email_enabled: !prefs.email_enabled })} style={{ cursor: 'pointer' }}>
                    <div className="menu-icon">📧</div>
                    <div className="menu-content">
                        <div className="menu-label">Email</div>
                        <div className="menu-desc">Email notifications</div>
                    </div>
                    <button className={`app-toggle ${prefs.email_enabled ? 'active' : ''}`} />
                </div>
            </div>

            {/* Category Settings */}
            <div className="app-section-label">NOTIFICATION CATEGORIES</div>
            <div className="app-menu-list" style={{ marginBottom: '1.5rem' }}>
                {CATEGORY_ITEMS.map(item => (
                    <div
                        key={item.key}
                        className="app-menu-item"
                        onClick={() => savePrefs({ [item.key]: !prefs[item.key] })}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="menu-icon">{item.icon}</div>
                        <div className="menu-content">
                            <div className="menu-label">{item.label}</div>
                            <div className="menu-desc">{item.desc}</div>
                        </div>
                        <button className={`app-toggle ${prefs[item.key] ? 'active' : ''}`} />
                    </div>
                ))}
            </div>
        </div>
    );
}
