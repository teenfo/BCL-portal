'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { AppSkeleton } from '@/components/apps';

interface AppSettings {
    push_enabled: boolean;
    class_reminder: boolean;
    reminder_time: string;
    marketing_enabled: boolean;
    language: string;
    theme: string;
}

const DEFAULT_SETTINGS: AppSettings = {
    push_enabled: true,
    class_reminder: true,
    reminder_time: '30',
    marketing_enabled: false,
    language: 'ko',
    theme: 'dark',
};

export default function SettingsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load settings from members.preferences (primary) + profiles.notification_settings (fallback)
    useEffect(() => {
        if (!user) return;
        async function loadSettings() {
            const supabase: any = createClient();

            // Try members.preferences first
            const { data: memberData } = await supabase
                .from('members')
                .select('preferences')
                .eq('user_id', user!.id)
                .single();

            if (memberData?.preferences) {
                setSettings({ ...DEFAULT_SETTINGS, ...memberData.preferences });
                setLoading(false);
                return;
            }

            // Fallback: profiles.notification_settings
            const { data: profileData } = await supabase
                .from('profiles')
                .select('notification_settings')
                .eq('id', user!.id)
                .single();

            if (profileData?.notification_settings) {
                setSettings({ ...DEFAULT_SETTINGS, ...profileData.notification_settings });
            }
            setLoading(false);
        }
        loadSettings();
    }, [user]);

    function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
        return (
            <button onClick={() => onChange(!value)} style={{
                width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: value ? 'var(--app-accent)' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'background 0.3s',
            }}>
                <div style={{
                    width: 22, height: 22, borderRadius: 11, background: '#fff',
                    position: 'absolute', top: 3,
                    left: value ? 23 : 3, transition: 'left 0.3s',
                }} />
            </button>
        );
    }

    async function handleSave() {
        if (!user) return;
        setSaving(true);

        const supabase: any = createClient();

        // Save to members.preferences (server sync)
        const { error: memberError } = await supabase
            .from('members')
            .update({ preferences: settings })
            .eq('user_id', user.id);

        // Also save notification-specific settings to profiles (backward compat)
        const notifSettings = {
            push_enabled: settings.push_enabled,
            class_reminder: settings.class_reminder,
            reminder_time: settings.reminder_time,
            marketing_enabled: settings.marketing_enabled,
        };
        await supabase
            .from('profiles')
            .update({ notification_settings: notifSettings })
            .eq('id', user.id);

        if (memberError) {
            toast.error('설정 저장에 실패했습니다.');
            console.error('Settings save error:', memberError);
        } else {
            toast.success('설정이 저장되었습니다! ✅');
        }
        setSaving(false);
    }

    if (loading) {
        return (
            <div className="app-page">
                <AppSkeleton variant="card" count={2} />
            </div>
        );
    }

    const selectStyle = {
        width: '100%', padding: '0.75rem', borderRadius: 8,
        background: 'var(--app-bg)', border: '1px solid var(--app-border)',
        color: 'var(--app-text-primary)', fontSize: '0.875rem', outline: 'none',
    };

    return (
        <div className="app-page">
            <Link href="/apps/profile" style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← 돌아가기</Link>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', margin: '1rem 0 1.5rem' }}>설정</h1>

            {/* Notification Settings */}
            <div className="app-section-label">알림 설정</div>
            <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                        <h4 style={{ color: 'var(--app-text-primary)', fontWeight: 600 }}>푸시 알림</h4>
                        <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.75rem', marginTop: '0.125rem' }}>앱 알림 수신 설정</p>
                    </div>
                    <Toggle value={settings.push_enabled} onChange={v => setSettings(s => ({ ...s, push_enabled: v }))} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                        <h4 style={{ color: 'var(--app-text-primary)', fontWeight: 600 }}>수업 리마인더</h4>
                        <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.75rem', marginTop: '0.125rem' }}>예약된 수업 시작 전 알림</p>
                    </div>
                    <Toggle value={settings.class_reminder} onChange={v => setSettings(s => ({ ...s, class_reminder: v }))} />
                </div>
                {settings.class_reminder && (
                    <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginBottom: '0.375rem' }}>리마인더 시간</label>
                        <select
                            value={settings.reminder_time}
                            onChange={e => setSettings(s => ({ ...s, reminder_time: e.target.value }))}
                            style={selectStyle}
                        >
                            <option value="15">15분 전</option>
                            <option value="30">30분 전</option>
                            <option value="60">1시간 전</option>
                            <option value="120">2시간 전</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="app-glass-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h4 style={{ color: 'var(--app-text-primary)', fontWeight: 600 }}>마케팅 알림</h4>
                        <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.75rem', marginTop: '0.125rem' }}>이벤트 및 프로모션 소식</p>
                    </div>
                    <Toggle value={settings.marketing_enabled} onChange={v => setSettings(s => ({ ...s, marketing_enabled: v }))} />
                </div>
            </div>

            {/* App Settings */}
            <div className="app-section-label">앱 설정</div>
            <div className="app-glass-card" style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginBottom: '0.375rem', fontWeight: 600 }}>언어</label>
                    <select
                        value={settings.language}
                        onChange={e => setSettings(s => ({ ...s, language: e.target.value }))}
                        style={selectStyle}
                    >
                        <option value="ko">한국어</option>
                        <option value="en">English</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginBottom: '0.375rem', fontWeight: 600 }}>테마</label>
                    <select
                        value={settings.theme}
                        onChange={e => setSettings(s => ({ ...s, theme: e.target.value }))}
                        style={selectStyle}
                    >
                        <option value="dark">Dark Mode</option>
                        <option value="light">Light Mode</option>
                        <option value="system">시스템 설정</option>
                    </select>
                </div>
            </div>

            <button
                className="app-btn-primary"
                style={{ width: '100%', padding: '0.875rem', opacity: saving ? 0.6 : 1 }}
                onClick={handleSave}
                disabled={saving}
            >
                {saving ? '저장 중...' : '설정 저장'}
            </button>
        </div>
    );
}
