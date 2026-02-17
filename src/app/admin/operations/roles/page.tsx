'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconShield } from '@/components/icons/AdminIcons';

interface Role {
    id: string;
    name: string;
    display_name: string;
    description: string | null;
    permissions: Record<string, string[]>;
    is_system_role: boolean;
    created_at: string;
    userCount?: number;
}

const PERMISSION_GROUPS = {
    members: { label: '회원 관리', items: ['view', 'edit', 'delete'] },
    finance: { label: '재무', items: ['view', 'refund', 'export'] },
    operations: { label: '운영', items: ['view', 'edit', 'delete'] },
    crm: { label: 'CRM', items: ['view', 'edit', 'send'] },
    system: { label: '시스템', items: ['settings', 'roles', 'audit'] },
};

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [addForm, setAddForm] = useState({
        name: '',
        display_name: '',
        description: '',
    });

    const loadRoles = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        try {
            const { data: rolesData, error } = await supabase
                .from('admin_roles')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error loading roles:', error);
            } else if (rolesData) {
                // Count users per role
                const { data: userRoles } = await supabase.from('admin_user_roles').select('role_id');
                const roleCounts: Record<string, number> = {};
                (userRoles || []).forEach((ur: any) => {
                    roleCounts[ur.role_id] = (roleCounts[ur.role_id] || 0) + 1;
                });

                setRoles(rolesData.map((r: any) => ({
                    ...r,
                    permissions: r.permissions || {},
                    userCount: roleCounts[r.id] || 0,
                })));
            }
        } catch (e) {
            console.error('Error:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadRoles(); }, [loadRoles]);

    async function addRole() {
        if (!addForm.name.trim() || !addForm.display_name.trim()) return;
        setSaving(true);
        const supabase = createClient();
        const { error } = await supabase.from('admin_roles').insert({
            name: addForm.name.toLowerCase().replace(/\s+/g, '_'),
            display_name: addForm.display_name,
            description: addForm.description || null,
            permissions: {},
            is_system_role: false,
        });
        setSaving(false);
        if (!error) {
            setShowAddModal(false);
            setAddForm({ name: '', display_name: '', description: '' });
            loadRoles();
        }
    }

    async function togglePermission(roleId: string, groupKey: string, perm: string) {
        const role = roles.find(r => r.id === roleId);
        if (!role || role.is_system_role) return;

        const updated = { ...role.permissions };
        const groupPerms = updated[groupKey] || [];
        if (groupPerms.includes(perm)) {
            updated[groupKey] = groupPerms.filter(p => p !== perm);
        } else {
            updated[groupKey] = [...groupPerms, perm];
        }

        const supabase = createClient();
        const { error } = await supabase.from('admin_roles').update({ permissions: updated }).eq('id', roleId);
        if (!error) {
            setRoles(roles.map(r => r.id === roleId ? { ...r, permissions: updated } : r));
            if (selectedRole?.id === roleId) setSelectedRole({ ...selectedRole, permissions: updated });
        }
    }

    function hasPermission(role: Role, groupKey: string, perm: string): boolean {
        const groupPerms = role.permissions?.[groupKey];
        if (!groupPerms) return false;
        return groupPerms.includes(perm);
    }

    const levelColors: Record<string, string> = {
        super_admin: '#EF4444',
        manager: '#F59E0B',
        branch_manager: '#F59E0B',
        coach: '#3B82F6',
        staff: '#22C55E',
        viewer: '#6B7280'
    };

    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Operations"
                title="Roles"
                subtitle="Permissions"
                actions={<button onClick={() => setShowAddModal(true)} className="admin-action-btn">+ 역할 추가</button>}
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                {loading ? (
                    <div className="flex gap-8">
                        <div className="flex-1 space-y-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="glass-card p-5 rounded-2xl animate-pulse">
                                    <div className="h-4 bg-white/5 rounded w-1/2 mb-2" />
                                    <div className="h-3 bg-white/5 rounded w-3/4" />
                                </div>
                            ))}
                        </div>
                        <div className="flex-[2] glass-card p-8 rounded-2xl animate-pulse">
                            <div className="h-6 bg-white/5 rounded w-1/3 mb-4" />
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/[0.02] rounded" />)}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        {/* Left: Role List */}
                        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                            <div className="space-y-3">
                                {roles.map((role) => {
                                    const levelColor = levelColors[role.name] || '#6B7280';
                                    return (
                                        <button
                                            key={role.id}
                                            onClick={() => setSelectedRole(role)}
                                            className="w-full text-left p-5 rounded-2xl transition-all hover:scale-[1.01]"
                                            style={selectedRole?.id === role.id
                                                ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,107,0,0.3)' }
                                                : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }
                                            }
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-black text-white uppercase">{role.display_name}</h4>
                                                <div className="flex items-center gap-2">
                                                    {role.is_system_role && (
                                                        <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-white/[0.05] border border-white/10 text-white/30">SYS</span>
                                                    )}
                                                    <span className="w-3 h-3 rounded-full" style={{ background: levelColor }}></span>
                                                </div>
                                            </div>
                                            <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{role.description || '-'}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                                    {role.name}
                                                </span>
                                                <span className="text-[9px] font-bold" style={{ color: 'var(--primary)' }}>{role.userCount || 0}명</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Permission Matrix */}
                        <div style={{ flex: '2 1 400px', minWidth: 0 }}>
                            {selectedRole ? (
                                <div className="p-8 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-xl font-black text-white uppercase">{selectedRole.display_name}</h3>
                                            <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{selectedRole.description}</p>
                                        </div>
                                        {selectedRole.is_system_role && (
                                            <span className="px-3 py-1 rounded-lg text-[8px] font-black uppercase bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">System Role</span>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        {Object.entries(PERMISSION_GROUPS).map(([key, group]) => (
                                            <div key={key}>
                                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{group.label}</h4>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {group.items.map((perm) => {
                                                        const has = hasPermission(selectedRole, key, perm);
                                                        return (
                                                            <button
                                                                key={perm}
                                                                onClick={() => togglePermission(selectedRole.id, key, perm)}
                                                                disabled={selectedRole.is_system_role}
                                                                className="p-3 rounded-xl flex items-center gap-3 transition-all disabled:cursor-not-allowed"
                                                                style={has
                                                                    ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }
                                                                    : { background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }
                                                                }
                                                            >
                                                                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                                                                    style={has
                                                                        ? { background: 'rgba(34,197,94,0.2)', color: '#4ADE80' }
                                                                        : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }
                                                                    }>
                                                                    {has ? '✓' : '✕'}
                                                                </span>
                                                                <span className="text-[9px] font-bold uppercase tracking-wider"
                                                                    style={{ color: has ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                                                                    {perm}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-20 rounded-2xl flex flex-col items-center justify-center text-center opacity-40"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                    <span className="text-4xl mb-4"><IconShield size={40} /></span>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Select a role to view permissions</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Role Modal */}
            <AdminModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="새 역할 추가"
                size="sm"
                footer={
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/50 bg-white/[0.03] border border-white/5">취소</button>
                        <button onClick={addRole} disabled={saving || !addForm.display_name.trim()} className="admin-action-btn disabled:opacity-50">
                            {saving ? '생성 중...' : '역할 생성'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">역할 코드명 *</label>
                        <input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="예: branch_viewer" className="w-full admin-search-input" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">표시 이름 *</label>
                        <input value={addForm.display_name} onChange={e => setAddForm({ ...addForm, display_name: e.target.value })} placeholder="예: 지점 뷰어" className="w-full admin-search-input" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">설명</label>
                        <input value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} placeholder="역할에 대한 설명" className="w-full admin-search-input" />
                    </div>
                </div>
            </AdminModal>
        </div>
    );
}
