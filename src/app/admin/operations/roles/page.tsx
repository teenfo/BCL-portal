'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query, rpc } from '@/lib/supabase/query';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import AdminModal from '@/components/layout/AdminModal';
import { IconShield, IconMembers } from '@/components/icons/AdminIcons';
import { useToast } from '@/components/ui/Toast';

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

interface AdminUser {
    id: string;
    user_id: string;
    role_id: string;
    profiles?: { full_name: string | null; email: string | null; avatar_url: string | null };
}

interface AvailableUser {
    id: string;
    full_name: string | null;
    email: string | null;
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
    const { success, error: toastError } = useToast();

    // 역할 정보 편집
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [editForm, setEditForm] = useState({ display_name: '', description: '' });

    // T2-7: User assignment states
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignedUsers, setAssignedUsers] = useState<AdminUser[]>([]);
    const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
    const [assignSearch, setAssignSearch] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);

    const loadRoles = useCallback(async () => {
        setLoading(true);
        try {
            const { data: rolesData, error } = await query('admin_roles')
                
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error loading roles:', error);
            } else if (rolesData) {
                // Count users per role
                const { data: userRoles } = await query('admin_user_roles').select('role_id');
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
        const { error } = await query('admin_roles').insert({
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
            success('새 역할이 생성되었습니다.');
            loadRoles();
        } else {
            toastError(`역할 생성 실패: ${error.message}`);
        }
    }

    // super_admin(와일드카드 '*' 권한)만 편집 잠금 — 최고 관리자 권한을 실수로
    // 축소해 시스템이 잠기는 사고 방지. 나머지 시스템 역할(manager/staff/coach)은
    // 권한/정보 편집 허용, 삭제만 금지(is_system_role).
    function isWildcardRole(role: Role): boolean {
        const w = (role.permissions as Record<string, unknown> | null)?.['*'];
        return Boolean(w && typeof w === 'object');
    }

    async function saveRoleEdit() {
        if (!editingRole || !editForm.display_name.trim()) return;
        setSaving(true);
        const { error } = await query('admin_roles').update({
            display_name: editForm.display_name.trim(),
            description: editForm.description.trim() || null,
        }).eq('id', editingRole.id);
        setSaving(false);
        if (!error) {
            setShowEditModal(false);
            setEditingRole(null);
            success('역할 정보가 수정되었습니다.');
            loadRoles();
            if (selectedRole?.id === editingRole.id) {
                setSelectedRole({ ...selectedRole, display_name: editForm.display_name.trim(), description: editForm.description.trim() || null });
            }
        } else {
            toastError(`수정 실패: ${error.message}`);
        }
    }

    async function deleteRole(roleId: string) {
        const role = roles.find(r => r.id === roleId);
        if (!role || role.is_system_role) return;
        if (!confirm(`"${role.display_name}" 역할을 삭제하시겠습니까?`)) return;
        const { error: err1 } = await query('admin_user_roles').delete().eq('role_id', roleId);
        const { error: err2 } = await query('admin_roles').delete().eq('id', roleId);

        if (err1 || err2) {
            toastError('역할 삭제 중 오류가 발생했습니다.');
        } else {
            success('역할이 삭제되었습니다.');
            if (selectedRole?.id === roleId) setSelectedRole(null);
            loadRoles();
        }
    }

    // DB permissions에는 두 형태가 공존한다:
    //  1) UI 저장 형태(배열): { members: ['view','edit'] }
    //  2) RBAC 시드 형태(불리언 맵): { '*': {read,write,delete}, members: {read:true, write:true} }
    // 기존 hasPermission이 (2)에서 객체에 .includes를 호출해 TypeError로
    // Manager/Staff/Coach 역할 클릭 시 화면 에러가 나던 원인. 양형 모두 지원한다.
    const LEGACY_ACTION_MAP: Record<string, string> = { view: 'read', edit: 'write', delete: 'delete' };
    const LEGACY_ACTION_REVERSE: Record<string, string> = { read: 'view', write: 'edit', delete: 'delete' };

    function normalizeGroupPerms(groupPerms: unknown): string[] {
        if (Array.isArray(groupPerms)) return groupPerms as string[];
        if (groupPerms && typeof groupPerms === 'object') {
            return Object.entries(groupPerms as Record<string, boolean>)
                .filter(([, v]) => v)
                .map(([k]) => LEGACY_ACTION_REVERSE[k] || k);
        }
        return [];
    }

    async function togglePermission(roleId: string, groupKey: string, perm: string) {
        const role = roles.find(r => r.id === roleId);
        // super_admin(와일드카드)만 편집 잠금 — 일반 시스템 역할은 권한 조정 허용
        if (!role || isWildcardRole(role)) return;

        const updated: Record<string, string[]> = {};
        Object.entries(role.permissions || {}).forEach(([g, v]) => {
            updated[g] = normalizeGroupPerms(v);
        });
        const groupPerms = updated[groupKey] || [];
        if (groupPerms.includes(perm)) {
            updated[groupKey] = groupPerms.filter(p => p !== perm);
        } else {
            updated[groupKey] = [...groupPerms, perm];
        }
        const { error } = await query('admin_roles').update({ permissions: updated }).eq('id', roleId);
        if (!error) {
            success('권한 설정이 변경되었습니다.');
            setRoles(roles.map(r => r.id === roleId ? { ...r, permissions: updated } : r));
            if (selectedRole?.id === roleId) setSelectedRole({ ...selectedRole, permissions: updated });
        } else {
            toastError(`저장 실패: ${error.message}`);
        }
    }

    function hasPermission(role: Role, groupKey: string, perm: string): boolean {
        const perms = role.permissions as Record<string, unknown> | null;
        if (!perms) return false;
        // 와일드카드(super_admin 시드): 전체 권한 보유로 표시
        const wildcard = perms['*'];
        if (wildcard && typeof wildcard === 'object') return true;
        const groupPerms = perms[groupKey];
        if (Array.isArray(groupPerms)) return (groupPerms as string[]).includes(perm);
        if (groupPerms && typeof groupPerms === 'object') {
            const map = groupPerms as Record<string, boolean>;
            return Boolean(map[perm] || map[LEGACY_ACTION_MAP[perm] || '']);
        }
        return false;
    }

    // T2-7: Open user assignment modal
    async function openAssignModal(role: Role) {
        setSelectedRole(role);
        setShowAssignModal(true);
        setLoadingUsers(true);
        setAssignSearch('');

        // Load users assigned to this role
        // ⚠️ admin_user_roles.user_id는 auth.users FK만 있어 profiles(...) 임베드가
        // PostgREST 관계 미인식으로 실패한다(배정 목록이 항상 비어 보이던 원인).
        // → 2단계 조회 후 클라이언트에서 병합.
        const { data: assigned, error: assignedErr } = await query('admin_user_roles')
            .select('id, user_id, role_id')
            .eq('role_id', role.id);
        if (assignedErr) {
            toastError(`배정 목록 조회 실패: ${assignedErr.message}`);
        }
        const assignedRows = (assigned || []) as Array<{ id: string; user_id: string; role_id: string }>;
        let profileMap: Record<string, AdminUser['profiles']> = {};
        if (assignedRows.length > 0) {
            const { data: assignedProfiles } = await query('profiles')
                .select('id, full_name, email, avatar_url')
                .in('id', assignedRows.map(a => a.user_id));
            profileMap = Object.fromEntries(
                (assignedProfiles || []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url }])
            );
        }
        setAssignedUsers(assignedRows.map(a => ({ ...a, profiles: profileMap[a.user_id] })));

        // Load available profiles (email 컬럼 포함)
        const { data: profiles, error: profilesErr } = await query('profiles')
            .select('id, full_name, email')
            .order('full_name');
        if (profilesErr) {
            console.error('[Roles] profiles load error:', profilesErr);
        }
        setAvailableUsers((profiles || []) as AvailableUser[]);

        setLoadingUsers(false);
    }

    async function assignUser(userId: string) {
        if (!selectedRole) return;
        const { error } = await query('admin_user_roles').insert({
            user_id: userId,
            role_id: selectedRole.id,
        });
        if (!error) {
            success('사용자가 역할에 배정되었습니다.');
            openAssignModal(selectedRole);
            loadRoles();
        } else {
            toastError(`배정 실패: ${error.message}`);
        }
    }

    async function unassignUser(userId: string) {
        if (!selectedRole) return;
        const { error } = await query('admin_user_roles').delete()
            .eq('user_id', userId)
            .eq('role_id', selectedRole.id);

        if (!error) {
            success('역할 배정이 해제되었습니다.');
            openAssignModal(selectedRole);
            loadRoles();
        } else {
            toastError(`해제 실패: ${error.message}`);
        }
    }

    const filteredAvailable = availableUsers.filter(u => {
        const assigned = assignedUsers.some(a => a.user_id === u.id);
        if (assigned) return false;
        if (!assignSearch) return true;
        const term = assignSearch.toLowerCase();
        return (u.full_name?.toLowerCase().includes(term)) || (u.email?.toLowerCase().includes(term));
    });

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
                    <div className="flex gap-8 flex-wrap">
                        {/* Left: Role List */}
                        <div className="flex-1 min-w-0" style={{ flexBasis: '280px' }}>
                            <div className="space-y-3">
                                {roles.map((role) => {
                                    const levelColor = levelColors[role.name] || '#6B7280';
                                    return (
                                        <div key={role.id} className={`glass-card rounded-2xl transition-all hover:scale-[1.01] group ${selectedRole?.id === role.id ? 'border-[var(--primary)]/30' : ''}`}
                                            style={selectedRole?.id === role.id
                                                ? { borderColor: 'rgba(255,107,0,0.3)' }
                                                : {}
                                            }
                                        >
                                            <button
                                                onClick={() => setSelectedRole(role)}
                                                className="w-full text-left p-5"
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
                                                <p className="text-[10px] mb-3 text-white/60">{role.description || '-'}</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                                                        {role.name}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-[var(--primary)]">{role.userCount || 0}명</span>
                                                </div>
                                            </button>
                                            {/* Action buttons — hover 시에만 노출되던 것을 항상 표시 (삭제/배정 발견성) */}
                                            <div className="flex gap-2 px-5 pb-4">
                                                <button onClick={() => openAssignModal(role)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">
                                                    <IconMembers size={12} /> 사용자 배정
                                                </button>
                                                <button onClick={() => {
                                                    setEditingRole(role);
                                                    setEditForm({ display_name: role.display_name, description: role.description || '' });
                                                    setShowEditModal(true);
                                                }}
                                                    className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-white/[0.03] border border-white/10 text-white/60 hover:bg-white/[0.06] transition-all">
                                                    편집
                                                </button>
                                                {!role.is_system_role && (
                                                    <button onClick={() => deleteRole(role.id)}
                                                        className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                                                        삭제
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Permission Matrix */}
                        <div className="min-w-0" style={{ flex: '2 1 400px' }}>
                            {selectedRole ? (
                                <div className="glass-card p-8 rounded-2xl">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-xl font-black text-white uppercase">{selectedRole.display_name}</h3>
                                            <p className="text-[10px] mt-1 text-white/40">{selectedRole.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openAssignModal(selectedRole)}
                                                className="px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">
                                                사용자 관리 ({selectedRole.userCount || 0})
                                            </button>
                                            {isWildcardRole(selectedRole) ? (
                                                <span className="px-3 py-1 rounded-lg text-[8px] font-black uppercase bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">전체 권한 · 편집 잠금</span>
                                            ) : selectedRole.is_system_role && (
                                                <span className="px-3 py-1 rounded-lg text-[8px] font-black uppercase bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">System Role</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {Object.entries(PERMISSION_GROUPS).map(([key, group]) => (
                                            <div key={key}>
                                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 text-white/30">{group.label}</h4>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {group.items.map((perm) => {
                                                        const has = hasPermission(selectedRole, key, perm);
                                                        return (
                                                            <button
                                                                key={perm}
                                                                onClick={() => togglePermission(selectedRole.id, key, perm)}
                                                                disabled={isWildcardRole(selectedRole)}
                                                                className={`p-3 rounded-xl flex items-center gap-3 transition-all disabled:cursor-not-allowed border ${has ? 'bg-green-500/10 border-green-500/20' : 'bg-white/[0.01] border-white/[0.03]'}`}
                                                            >
                                                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${has ? 'bg-green-500/10 text-green-400' : 'bg-white/[0.05] text-white/20'}`}>
                                                                    {has ? '✓' : '✕'}
                                                                </span>
                                                                <span className={`text-[9px] font-bold uppercase tracking-wider ${has ? 'text-white' : 'text-white/30'}`}>
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
                                <div className="glass-card p-20 rounded-2xl flex flex-col items-center justify-center text-center opacity-40">
                                    <span className="text-4xl mb-4"><IconShield size={40} /></span>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Select a role to view permissions</p>
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

            {/* 역할 정보 편집 Modal */}
            <AdminModal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setEditingRole(null); }}
                title={`역할 편집 — ${editingRole?.display_name || ''}`}
                size="sm"
                footer={
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => { setShowEditModal(false); setEditingRole(null); }} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/50 bg-white/[0.03] border border-white/5">취소</button>
                        <button onClick={saveRoleEdit} disabled={saving || !editForm.display_name.trim()} className="admin-action-btn disabled:opacity-50">
                            {saving ? '저장 중...' : '저장'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">역할 코드명</label>
                        <input value={editingRole?.name || ''} disabled className="w-full admin-search-input opacity-50" />
                        <p className="text-[9px] text-white/30 mt-1">코드명은 권한 판별에 사용되어 변경할 수 없습니다.</p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">표시 이름 *</label>
                        <input value={editForm.display_name} onChange={e => setEditForm({ ...editForm, display_name: e.target.value })} className="w-full admin-search-input" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">설명</label>
                        <input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full admin-search-input" />
                    </div>
                </div>
            </AdminModal>

            {/* T2-7: User Assignment Modal */}
            <AdminModal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                title={`사용자 배정 — ${selectedRole?.display_name || ''}`}
                size="md"
            >
                {loadingUsers ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Assigned Users */}
                        <div>
                            <h4 className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-3">
                                배정된 사용자 ({assignedUsers.length})
                            </h4>
                            {assignedUsers.length === 0 ? (
                                <p className="text-[10px] text-white/30 py-4 text-center">배정된 사용자가 없습니다</p>
                            ) : (
                                <div className="space-y-2">
                                    {assignedUsers.map((u) => (
                                        <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[10px] font-black text-[var(--primary)]">
                                                    {((u.profiles as any)?.full_name || '?')[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">{(u.profiles as any)?.full_name || 'Unknown'}</p>
                                                    <p className="text-[9px] text-white/30">{(u.profiles as any)?.email || '-'}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => unassignUser(u.user_id)}
                                                className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                                                해제
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add User Section */}
                        <div className="pt-4 border-t border-white/[0.05]">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-3">사용자 추가</h4>
                            <input
                                value={assignSearch}
                                onChange={(e) => setAssignSearch(e.target.value)}
                                placeholder="이름 또는 이메일로 검색..."
                                className="w-full admin-search-input mb-4"
                            />
                            <div className="max-h-[200px] overflow-y-auto space-y-2 custom-scrollbar">
                                {filteredAvailable.length === 0 ? (
                                    <p className="text-[10px] text-white/30 py-4 text-center">검색 결과가 없습니다</p>
                                ) : (
                                    filteredAvailable.slice(0, 20).map((u) => (
                                        <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/10 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/[0.03] flex items-center justify-center text-[10px] font-black text-white/30">
                                                    {(u.full_name || '?')[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">{u.full_name || 'Unknown'}</p>
                                                    <p className="text-[9px] text-white/30">{u.email || '-'}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => assignUser(u.id)}
                                                className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all">
                                                배정
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </AdminModal>
        </div>
    );
}
