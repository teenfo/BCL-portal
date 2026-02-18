'use client';

import AdminSidebar from '@/components/layout/AdminSidebar';
import { AdminSidebarProvider } from '@/contexts/AdminSidebarContext';
import { AuthGuard } from '@/components/AuthGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard requireAuth={true} requiredRole="admin" redirectTo="/auth/login">
            <AdminSidebarProvider>
                <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
                    <AdminSidebar />
                    <main
                        className="flex-1 transition-all duration-500"
                        style={{ marginLeft: 'var(--sidebar-width, 256px)' }}
                    >
                        {children}
                    </main>
                </div>
            </AdminSidebarProvider>
        </AuthGuard>
    );
}
