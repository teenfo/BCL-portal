'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

export default function ProfileEditPage() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const toast = useToast();

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
            toast.error('저장에 실패했습니다. 다시 시도해주세요.');
        } else {
            toast.success('프로필이 수정되었습니다.');
        }
        setSaving(false);
    }

    if (loading) return <div className="app-page"><div className="app-skeleton" style={{ height: 300 }} /></div>;

    return (
        <div className="app-page">
            <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginBottom: '0.375rem', fontWeight: 600 }}>이름</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                    style={{
                        width: '100%', padding: '0.75rem', borderRadius: 8,
                        background: 'var(--app-bg)',
                        border: '1px solid var(--app-border)',
                        color: 'var(--app-text-primary)',
                        fontSize: '0.9375rem', outline: 'none',
                    }} />
            </div>

            <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginBottom: '0.375rem', fontWeight: 600 }}>이메일</label>
                <input type="email" value={email} disabled
                    style={{
                        width: '100%', padding: '0.75rem', borderRadius: 8,
                        background: 'var(--app-bg)',
                        border: '1px solid var(--app-border)',
                        color: 'var(--app-text-muted)',
                        fontSize: '0.9375rem', outline: 'none',
                        opacity: 0.6,
                    }} />
                <p style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)', marginTop: '0.375rem' }}>이메일은 변경할 수 없습니다</p>
            </div>

            <div className="app-glass-card" style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--app-text-secondary)', marginBottom: '0.375rem', fontWeight: 600 }}>연락처</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000"
                    style={{
                        width: '100%', padding: '0.75rem', borderRadius: 8,
                        background: 'var(--app-bg)',
                        border: '1px solid var(--app-border)',
                        color: 'var(--app-text-primary)',
                        fontSize: '0.9375rem', outline: 'none',
                    }} />
            </div>

            <button className="app-btn-primary" style={{ width: '100%', padding: '0.875rem' }} disabled={saving} onClick={handleSave}>
                {saving ? '저장 중...' : '변경사항 저장'}
            </button>
        </div>
    );
}
