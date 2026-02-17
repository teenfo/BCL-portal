'use client';

import { useState } from 'react';

interface Role {
    id: string;
    name: string;
    description: string;
    level: number;
    permissions: string[];
    userCount: number;
}

const PERMISSION_GROUPS = {
    members: { label: '회원 관리', items: ['members.view', 'members.edit', 'members.delete'] },
    finance: { label: '재무', items: ['finance.view', 'finance.refund', 'finance.export'] },
    operations: { label: '운영', items: ['schedule.manage', 'coaches.manage', 'bookings.manage'] },
    crm: { label: 'CRM', items: ['notices.manage', 'notifications.send', 'support.manage'] },
    system: { label: '시스템', items: ['settings.manage', 'roles.manage', 'audit.view'] },
};

export default function RolesPage() {
    const [roles] = useState<Role[]>([
        { id: '1', name: 'Super Admin', description: '전체 시스템 관리 권한', level: 100, permissions: Object.values(PERMISSION_GROUPS).flatMap(g => g.items), userCount: 2 },
        { id: '2', name: 'Branch Manager', description: '지점 관리자 - 해당 지점 전체 관리', level: 80, permissions: ['members.view', 'members.edit', 'finance.view', 'schedule.manage', 'coaches.manage', 'bookings.manage', 'notices.manage', 'support.manage'], userCount: 3 },
        { id: '3', name: 'Coach', description: '코치 - 수업/예약 관리', level: 40, permissions: ['members.view', 'schedule.manage', 'bookings.manage'], userCount: 8 },
        { id: '4', name: 'Front Desk', description: '프론트 데스크 - 체크인/예약 확인', level: 20, permissions: ['members.view', 'bookings.manage', 'support.manage'], userCount: 4 },
    ]);

    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const levelColors: Record<number, string> = { 100: '#EF4444', 80: '#F59E0B', 40: '#3B82F6', 20: '#22C55E' };

    return (
        <div className="p-8 lg:p-12">
            <header className="flex items-end justify-between mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
                        <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.5em]">Operations</span>
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase">Roles <span className="opacity-20 font-light ml-2">&amp; Permissions</span></h1>
                </div>
                <button className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest" style={{ background: 'var(--primary)', color: '#fff', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>+ 역할 추가</button>
            </header>

            <div className="grid grid-cols-12 gap-8">
                {/* Left: Role List */}
                <div className="col-span-4 space-y-3">
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => setSelectedRole(role)}
                            className={`w-full text-left p-5 rounded-2xl transition-all ${selectedRole?.id === role.id ? 'bg-white/[0.05] border border-[var(--primary)]/30' : 'bg-white/[0.02] border border-white/[0.03] hover:border-white/10'}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-black text-white uppercase">{role.name}</h4>
                                <span className="w-3 h-3 rounded-full" style={{ background: levelColors[role.level] || '#6B7280' }}></span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] mb-3">{role.description}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest">Level {role.level}</span>
                                <span className="text-[9px] text-[var(--primary)] font-bold">{role.userCount}명</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Right: Permission Matrix */}
                <div className="col-span-8">
                    {selectedRole ? (
                        <div className="glass-card p-8 rounded-2xl">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase">{selectedRole.name}</h3>
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1">{selectedRole.description}</p>
                                </div>
                                <span className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest" style={{ background: `${levelColors[selectedRole.level] || '#6B7280'}15`, color: levelColors[selectedRole.level] || '#6B7280' }}>
                                    Level {selectedRole.level}
                                </span>
                            </div>

                            <div className="space-y-6">
                                {Object.entries(PERMISSION_GROUPS).map(([key, group]) => (
                                    <div key={key}>
                                        <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">{group.label}</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            {group.items.map((perm) => {
                                                const hasPermission = selectedRole.permissions.includes(perm);
                                                return (
                                                    <div key={perm} className={`p-3 rounded-xl flex items-center gap-3 transition-all ${hasPermission ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/[0.01] border border-white/[0.03]'}`}>
                                                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${hasPermission ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/20'}`}>
                                                            {hasPermission ? '✓' : '✕'}
                                                        </span>
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${hasPermission ? 'text-white' : 'text-white/30'}`}>
                                                            {perm.split('.')[1]}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card p-20 rounded-2xl flex flex-col items-center justify-center text-center opacity-40">
                            <span className="text-4xl mb-4">🛡️</span>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Select a role to view permissions</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
