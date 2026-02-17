'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminSidebarContextType {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined);

export function AdminSidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);

    // Sync width to CSS variable for easy access in Layout
    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', collapsed ? '68px' : '256px');
    }, [collapsed]);

    return (
        <AdminSidebarContext.Provider value={{ collapsed, setCollapsed }}>
            {children}
        </AdminSidebarContext.Provider>
    );
}

export function useAdminSidebar() {
    const context = useContext(AdminSidebarContext);
    if (!context) {
        throw new Error('useAdminSidebar must be used within an AdminSidebarProvider');
    }
    return context;
}
