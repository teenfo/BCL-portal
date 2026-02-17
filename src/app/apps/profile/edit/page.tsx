'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ProfileEditPage() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }
            setEmail(user.email || '');

            const { data } = await supabase
                .from('members')
                .select('name, phone')
                .eq('user_id', user.id)
                .single();
            if (data) { setName(data.name || ''); setPhone(data.phone || ''); }
            setLoading(false);
        })();
    }, []);

    async function handleSave() {
        if (saving) return;
        setSaving(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        const { error } = await supabase
            .from('members')
            .update({ name: name.trim(), phone: phone.trim() })
            .eq('user_id', user.id);

        if (error) {
            alert('저장에 실패했습니다. 다시 시도해주세요.');
        } else {
            alert('✅ 프로필이 수정되었습니다.');
        }
        setSaving(false);
    }

    if (loading) return <div className="app-page"><div className="app-skeleton" style={{ height: 300 }} /></div>;

    return (
        <div className="app-page">
            <Link href="/apps/profile" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← 돌아가기</Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '1rem 0 1.5rem' }}>프로필 수정</h1>

            <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>이름</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9375rem', outline: 'none' }} />
            </div>

            <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>이메일</label>
                <input type="email" value={email} disabled
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: '0.9375rem', outline: 'none' }} />
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>이메일은 변경할 수 없습니다</p>
            </div>

            <div className="app-glass-card" style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>연락처</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9375rem', outline: 'none' }} />
            </div>

            <button className="app-btn-primary" style={{ width: '100%', padding: '0.875rem' }} disabled={saving} onClick={handleSave}>
                {saving ? '저장 중...' : '변경사항 저장'}
            </button>
        </div>
    );
}
