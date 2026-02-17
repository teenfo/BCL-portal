'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface AppNotification {
    id: string;
    user_id: string;
    title: string;
    content: string;
    category: string;
    type: string;
    channel: string;
    is_read: boolean;
    action_url?: string;
    action_label?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
    expires_at?: string;
}

interface UseNotificationsReturn {
    notifications: AppNotification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

    const loadNotifications = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (data) {
            const now = new Date();
            const filtered = data.filter((n: AppNotification) =>
                !n.expires_at || new Date(n.expires_at) > now
            );
            setNotifications(filtered);
        }
        setLoading(false);
    }, []);

    // Realtime subscription for new notifications
    useEffect(() => {
        const supabase = createClient();
        let userId: string | null = null;

        async function setupRealtime() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            userId = user.id;

            const channel = supabase
                .channel('user-notifications')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                }, (payload) => {
                    const newNotif = payload.new as AppNotification;
                    setNotifications(prev => [newNotif, ...prev]);

                    // Dispatch custom event for toast
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('bcl-notification', {
                            detail: newNotif
                        }));
                    }
                })
                .subscribe();

            channelRef.current = channel;
        }

        loadNotifications();
        setupRealtime();

        return () => {
            if (channelRef.current) {
                const supabase = createClient();
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [loadNotifications]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const markAsRead = useCallback(async (id: string) => {
        const supabase = createClient();
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
    }, []);

    const markAllAsRead = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }, []);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: loadNotifications,
    };
}
