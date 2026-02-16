import UserBottomNav from '@/components/layout/UserBottomNav';
import { ReactNode } from 'react';

export default function AppsLayout({ children }: { children: ReactNode }) {
    return (
        <div>
            {children}
            <UserBottomNav />
        </div>
    );
}
