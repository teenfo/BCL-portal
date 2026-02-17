'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
    const [pushEnabled, setPushEnabled] = useState(true);
    const [classReminder, setClassReminder] = useState(true);
    const [reminderTime, setReminderTime] = useState('30');
    const [marketingEnabled, setMarketingEnabled] = useState(false);
    const [saved, setSaved] = useState(false);

    function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
        return (
            <button onClick={() => onChange(!value)} style={{
                width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: value ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
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

    function handleSave() {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    return (
        <div className="app-page">
            <Link href="/apps/profile" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← 돌아가기</Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '1rem 0 1.5rem' }}>알림 설정</h1>

            <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                        <h4 style={{ color: '#fff', fontWeight: 600 }}>푸시 알림</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.125rem' }}>앱 알림 수신 설정</p>
                    </div>
                    <Toggle value={pushEnabled} onChange={setPushEnabled} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                        <h4 style={{ color: '#fff', fontWeight: 600 }}>수업 리마인더</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.125rem' }}>예약된 수업 시작 전 알림</p>
                    </div>
                    <Toggle value={classReminder} onChange={setClassReminder} />
                </div>
                {classReminder && (
                    <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>리마인더 시간</label>
                        <select value={reminderTime} onChange={e => setReminderTime(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.875rem', outline: 'none' }}>
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
                        <h4 style={{ color: '#fff', fontWeight: 600 }}>마케팅 알림</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.125rem' }}>이벤트 및 프로모션 소식</p>
                    </div>
                    <Toggle value={marketingEnabled} onChange={setMarketingEnabled} />
                </div>
            </div>

            <button className="app-btn-primary" style={{ width: '100%', padding: '0.875rem' }} onClick={handleSave}>
                {saved ? '✅ 저장 완료!' : '설정 저장'}
            </button>
        </div>
    );
}
