'use client';

import { useState } from 'react';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import { IconShield } from '@/components/icons/AdminIcons';

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
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Operations"
                title="Roles"
                subtitle="Permissions"
                actions={<button className="admin-action-btn">+ 역할 추가</button>}
            />

            <div className="p-10 max-w-[1400px] mx-auto">
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    {/* Left: Role List */}
                    <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                        <div className="space-y-3">
                            {roles.map((role) => {
                                const levelColor = levelColors[role.level] || '#6B7280';
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
                                            <h4 className="text-sm font-black text-white uppercase">{role.name}</h4>
                                            <span className="w-3 h-3 rounded-full" style={{ background: levelColor }}></span>
                                        </div>
                                        <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{role.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                                Level {role.level}
                                            </span>
                                            <span className="text-[9px] font-bold" style={{ color: 'var(--primary)' }}>{role.userCount}명</span>
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
                                        <h3 className="text-xl font-black text-white uppercase">{selectedRole.name}</h3>
                                        <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{selectedRole.description}</p>
                                    </div>
                                    <span className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"
                                        style={{
                                            background: `rgba(${levelColors[selectedRole.level] === '#EF4444' ? '239,68,68' : levelColors[selectedRole.level] === '#F59E0B' ? '245,158,11' : levelColors[selectedRole.level] === '#3B82F6' ? '59,130,246' : '34,197,94'},0.15)`,
                                            color: levelColors[selectedRole.level] || '#6B7280'
                                        }}>
                                        Level {selectedRole.level}
                                    </span>
                                </div>

                                <div className="space-y-6">
                                    {Object.entries(PERMISSION_GROUPS).map(([key, group]) => (
                                        <div key={key}>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{group.label}</h4>
                                            <div className="grid grid-cols-3 gap-3">
                                                {group.items.map((perm) => {
                                                    const hasPermission = selectedRole.permissions.includes(perm);
                                                    return (
                                                        <div key={perm} className="p-3 rounded-xl flex items-center gap-3 transition-all"
                                                            style={hasPermission
                                                                ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }
                                                                : { background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }
                                                            }>
                                                            <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                                                                style={hasPermission
                                                                    ? { background: 'rgba(34,197,94,0.2)', color: '#4ADE80' }
                                                                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }
                                                                }>
                                                                {hasPermission ? '✓' : '✕'}
                                                            </span>
                                                            <span className="text-[9px] font-bold uppercase tracking-wider"
                                                                style={{ color: hasPermission ? '#fff' : 'rgba(255,255,255,0.3)' }}>
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
                            <div className="p-20 rounded-2xl flex flex-col items-center justify-center text-center opacity-40"
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <span className="text-4xl mb-4"><IconShield size={40} /></span>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Select a role to view permissions</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
