'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';

interface NotificationSettings {
    push_enabled: boolean;
    class_reminder: boolean;
    reminder_time: string;
    marketing_enabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
    push_enabled: true,
    class_reminder: true,
    reminder_time: '30',
    marketing_enabled: false,
};

export default function SettingsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load settings from DB
    useEffect(() => {
        if (!user) return;
        async function loadSettings() {
            const supabase: any = createClient();
            const { data } = await supabase
                .from('profiles')
                .select('notification_settings')
                .eq('id', user!.id)
                .single();

            if (data?.notification_settings) {
                setSettings({ ...DEFAULT_SETTINGS, ...data.notification_settings });
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
        const { error } = await supabase
            .from('profiles')
            .update({ notification_settings: settings })
            .eq('id', user.id);

        if (error) {
            toast.error('설정 저장에 실패했습니다.');
            console.error('Settings save error:', error);
        } else {
            toast.success('설정이 저장되었습니다! ✅');
        }
        setSaving(false);
    }

    if (loading) {
        return (
            <div className="app-page">
                <div className="app-skeleton" style={{ width: '30%', height: 20, marginBottom: 16 }} />
                <div className="app-skeleton" style={{ height: 200, borderRadius: 16, marginBottom: 12 }} />
                <div className="app-skeleton" style={{ height: 80, borderRadius: 16 }} />
            </div>
        );
    }

    return (
        <div className="app-page">
            <Link href="/apps/profile" style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← 돌아가기</Link>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', margin: '1rem 0 1.5rem' }}>알림 설정</h1>

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
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: 8,
                                background: 'var(--app-bg)', border: '1px solid var(--app-border)',
                                color: 'var(--app-text-primary)', fontSize: '0.875rem', outline: 'none',
                            }}
                        >
                            <option value="15">15분 전</option>
                            <option value="30">30분 전</option>
                            <option value="60">1시간 전</option>
                            <option value="120">2시간 전</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="app-glass-card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h4 style={{ color: 'var(--app-text-primary)', fontWeight: 600 }}>마케팅 알림</h4>
                        <p style={{ color: 'var(--app-text-secondary)', fontSize: '0.75rem', marginTop: '0.125rem' }}>이벤트 및 프로모션 소식</p>
                    </div>
                    <Toggle value={settings.marketing_enabled} onChange={v => setSettings(s => ({ ...s, marketing_enabled: v }))} />
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
