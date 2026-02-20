'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { AppSkeleton } from '@/components/apps';

export default function ProfileEditPage() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [birthday, setBirthday] = useState('');
    const [emergencyContact, setEmergencyContact] = useState('');
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

            const { data } = await query('members')
                
                .select('name, phone, birthday, emergency_contact')
                .eq('user_id', user.id)
                .single();
            if (data) {
                setName((data as any).name || '');
                setPhone((data as any).phone || '');
                setBirthday((data as any).birthday || '');
                setEmergencyContact((data as any).emergency_contact || '');
            }
            setLoading(false);
        })();
    }, []);

    async function handleSave() {
        if (saving) return;
        setSaving(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        const { error } = await query('members')
            
            .update({
                name: name.trim(),
                phone: phone.trim(),
                birthday: birthday || null,
                emergency_contact: emergencyContact.trim() || null,
            })
            .eq('user_id', user.id);

        if (error) {
            toast.error('저장에 실패했습니다. 다시 시도해주세요.');
        } else {
            toast.success('프로필이 수정되었습니다. ✅');
        }
        setSaving(false);
    }

    if (loading) return (
        <div className="app-page">
            <AppSkeleton variant="card" count={2} />
        </div>
    );

    const inputStyle = {
        width: '100%', padding: '0.75rem', borderRadius: 8,
        background: 'var(--app-bg)',
        border: '1px solid var(--app-border)',
        color: 'var(--app-text-primary)',
        fontSize: '0.9375rem', outline: 'none',
    };

    const labelStyle = {
        display: 'block' as const, fontSize: '0.8125rem',
        color: 'var(--app-text-secondary)', marginBottom: '0.375rem', fontWeight: 600,
    };

    return (
        <div className="app-page">
            <Link href="/apps/profile" style={{ color: 'var(--app-text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← 돌아가기</Link>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--app-text-primary)', margin: '1rem 0 1.5rem' }}>프로필 수정</h1>

            <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>이름</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                    style={inputStyle} />
            </div>

            <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>이메일</label>
                <input type="email" value={email} disabled
                    style={{ ...inputStyle, color: 'var(--app-text-muted)', opacity: 0.6 }} />
                <p style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)', marginTop: '0.375rem' }}>이메일은 변경할 수 없습니다</p>
            </div>

            <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>연락처</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000"
                    style={inputStyle} />
            </div>

            <div className="app-glass-card" style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>생년월일</label>
                <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                    style={inputStyle} />
            </div>

            <div className="app-glass-card" style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>비상 연락처</label>
                <input type="tel" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)}
                    placeholder="010-0000-0000 (보호자/가족)"
                    style={inputStyle} />
                <p style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)', marginTop: '0.375rem' }}>
                    긴급 상황 시 연락할 수 있는 번호를 입력해주세요
                </p>
            </div>

            <button className="app-btn-primary" style={{ width: '100%', padding: '0.875rem' }} disabled={saving} onClick={handleSave}>
                {saving ? '저장 중...' : '변경사항 저장'}
            </button>
        </div>
    );
}
