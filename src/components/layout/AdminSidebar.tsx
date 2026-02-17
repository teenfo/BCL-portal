'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import Logo from '@/components/ui/Logo';

interface MenuItem {
    name: string;
    href: string;
    icon: string;
}

interface MenuGroup {
    name: string;
    icon: string;
    items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
    {
        name: 'Insights',
        icon: '💎',
        items: [
            { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
            { name: 'Attendance', href: '/admin/insights/attendance', icon: '👥' },
            { name: 'Revenue', href: '/admin/insights/finance', icon: '💰' },
            { name: 'Coaches', href: '/admin/insights/coaches', icon: '📈' },
        ],
    },
    {
        name: 'User & Finance',
        icon: '🏦',
        items: [
            { name: 'Members', href: '/admin/members', icon: '👤' },
            { name: 'Memberships', href: '/admin/memberships', icon: '💳' },
            { name: 'Check-in Logs', href: '/admin/checkins', icon: '🕒' },
            { name: 'Plans', href: '/admin/plans', icon: '🏷️' },
            { name: 'Transactions', href: '/admin/transactions', icon: '📑' },
        ],
    },
    {
        name: 'Operations',
        icon: '⚙️',
        items: [
            { name: 'Schedule', href: '/admin/operations/schedule', icon: '📅' },
            { name: 'Coaches', href: '/admin/operations/coaches', icon: '👨‍🏫' },
            { name: 'Reservations', href: '/admin/operations/reservations', icon: '📝' },
            { name: 'Race', href: '/admin/operations/race', icon: '🏁' },
            { name: 'Infrastructure', href: '/admin/operations/infrastructure', icon: '🛠️' },
            { name: 'Roles', href: '/admin/operations/roles', icon: '🛡️' },
        ],
    },
    {
        name: 'CRM',
        icon: '🎯',
        items: [
            { name: 'Content', href: '/admin/crm/content', icon: '📢' },
            { name: 'Notifications', href: '/admin/crm/notifications', icon: '🔔' },
            { name: 'Support', href: '/admin/crm/support', icon: '🎧' },
            { name: 'Feedback', href: '/admin/crm/feedback', icon: '💬' },
        ],
    },
    {
        name: 'Infrastructure',
        icon: '🏢',
        items: [
            { name: 'Branch Setup', href: '/admin/setup/branch', icon: '🏢' },
            { name: 'System Link', href: '/admin/setup/system', icon: '🔗' },
            { name: 'Audit Logs', href: '/admin/setup/audit', icon: '📜' },
        ],
    },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const { collapsed, setCollapsed } = useAdminSidebar();

    // Initial state setup to avoid hydration issues and cascading renders
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [isMounted, setIsMounted] = useState(false);

    // Initial mount: open only the group with active item
    useEffect(() => {
        setIsMounted(true);
        const initialStates: Record<string, boolean> = {};
        menuGroups.forEach((group) => {
            initialStates[group.name] = group.items.some(item => pathname?.startsWith(item.href));
        });
        // If no group is active, open the first one
        if (!Object.values(initialStates).some(v => v)) {
            initialStates[menuGroups[0].name] = true;
        }
        setOpenGroups(initialStates);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // On navigation: open only the active group, close others
    useEffect(() => {
        if (!isMounted) return;
        setOpenGroups(() => {
            const next: Record<string, boolean> = {};
            menuGroups.forEach((group) => {
                next[group.name] = group.items.some(item => pathname?.startsWith(item.href));
            });
            // If no group is active, keep current state
            if (!Object.values(next).some(v => v)) return next;
            return next;
        });
    }, [pathname, isMounted]);

    const toggleGroup = (name: string) => {
        if (collapsed) {
            setCollapsed(false);
            // Open only clicked group
            const next: Record<string, boolean> = {};
            menuGroups.forEach((group) => {
                next[group.name] = group.name === name;
            });
            setOpenGroups(next);
            return;
        }
        // Open clicked group, close all others
        setOpenGroups(prev => {
            const next: Record<string, boolean> = {};
            menuGroups.forEach((group) => {
                next[group.name] = group.name === name ? !prev[name] : false;
            });
            return next;
        });
    };

    if (!isMounted) return null;

    return (
        <aside
            className={`fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                border-r 
                ${collapsed ? 'w-20' : 'w-64'}`}
            style={{
                background: 'linear-gradient(180deg, rgba(13, 13, 13, 0.98) 0%, rgba(13, 13, 13, 0.95) 100%)',
                backdropFilter: 'blur(16px)',
                borderColor: 'var(--border)',
            }}
        >
            {/* Logo Area */}
            <div
                className={`h-28 flex items-center border-b shrink-0 transition-all duration-300 mb-4 ${collapsed ? 'justify-center px-0' : 'justify-end px-4'}`}
                style={{ borderColor: 'var(--border)' }}
            >
                <Logo collapsed={collapsed} size={collapsed ? 52 : 54} />
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-6 space-y-4">
                {menuGroups.map((group) => {
                    const isOpen = openGroups[group.name];
                    const hasActiveChild = group.items.some(item => pathname?.startsWith(item.href));

                    return (
                        <div key={group.name} className="flex flex-col">
                            {/* Group Header (Accordion Toggle) */}
                            <button
                                onClick={() => toggleGroup(group.name)}
                                className={`sidebar-category-btn w-full flex items-center justify-between px-4 py-3 rounded-xl mb-2
                                    ${collapsed ? 'justify-center' : ''}
                                    ${hasActiveChild && !isOpen ? 'sidebar-category-active' : ''}`}
                            >
                                {!collapsed ? (
                                    <div className="flex items-center gap-2.5 flex-1">
                                        <span className={`text-base transition-all duration-300 ${hasActiveChild ? 'grayscale-0' : 'grayscale opacity-70'}`}>
                                            {group.icon}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{group.name}</span>
                                        <motion.span
                                            animate={{ rotate: isOpen ? 0 : -90 }}
                                            className="text-[10px] ml-auto opacity-50"
                                        >
                                            ▼
                                        </motion.span>
                                    </div>
                                ) : (
                                    <span
                                        className={`text-lg transition-all duration-300 ${hasActiveChild ? 'grayscale-0 scale-110' : 'grayscale opacity-70'}`}
                                        title={group.name}
                                    >
                                        {group.icon}
                                    </span>
                                )}
                            </button>

                            {/* Group Items */}
                            <AnimatePresence initial={false}>
                                {(isOpen || collapsed) && (
                                    <motion.nav
                                        initial={collapsed ? { opacity: 1 } : { height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="mt-1 space-y-1 overflow-hidden"
                                    >
                                        {group.items.map((item) => {
                                            const isActive = pathname?.startsWith(item.href);
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all duration-300 relative group
                                                        ${collapsed ? 'justify-center mx-1' : ''}
                                                        ${isActive ? 'bg-white/[0.04] border border-white/[0.05]' : 'hover:bg-white/[0.02] border border-transparent'}`}
                                                    style={{
                                                        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                                    }}
                                                >
                                                    <span
                                                        className="text-base w-6 h-6 flex items-center justify-center transition-all duration-300 group-hover:scale-110 relative z-10"
                                                        style={{
                                                            color: isActive ? 'var(--primary)' : 'inherit',
                                                            filter: isActive ? 'drop-shadow(0 0 8px rgba(255, 107, 0, 0.3))' : 'none',
                                                        }}
                                                    >
                                                        {item.icon}
                                                    </span>
                                                    {!collapsed && (
                                                        <span
                                                            className="text-[13px] font-medium tracking-tight relative z-10"
                                                        >
                                                            {item.name}
                                                        </span>
                                                    )}

                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="activeIndicator"
                                                            className="absolute left-0 w-0.5 h-4 bg-[var(--primary)] rounded-r-full"
                                                            style={{
                                                                boxShadow: '0 0 10px var(--primary)',
                                                            }}
                                                        />
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </motion.nav>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Footer / User Profile */}
            <div
                className="p-4 mt-auto border-t shrink-0"
                style={{
                    borderColor: 'var(--border)',
                    background: 'rgba(255, 255, 255, 0.01)',
                }}
            >
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-2'}`}>
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.2) 0%, rgba(255, 107, 0, 0.05) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--primary)',
                        }}
                    >
                        AD
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col truncate">
                            <span className="text-[12px] font-bold text-white">Administrator</span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Branch 01-Premium</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-24 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-xl group"
                style={{
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                    border: '2px solid var(--background)',
                    color: 'white',
                    zIndex: 60
                }}
            >
                <span className="text-[10px] font-bold group-hover:scale-110 transition-transform">
                    {collapsed ? '→' : '←'}
                </span>
            </button>
        </aside>
    );
}
