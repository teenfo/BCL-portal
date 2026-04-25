'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { query } from '@/lib/supabase/query';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios_pwa';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
}

interface UsePushSubscriptionReturn {
    isSubscribed: boolean;
    isSupported: boolean;
    isPWA: boolean;
    isIOS: boolean;
    subscribe: () => Promise<boolean>;
    unsubscribe: () => Promise<void>;
    checkSubscription: () => Promise<void>;
}

export function usePushSubscription(): UsePushSubscriptionReturn {
    const [isSubscribed, setIsSubscribed] = useState(false);

    const isSupported = typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

    const isPWA = typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true);

    const isIOS = typeof window !== 'undefined' &&
        /iPad|iPhone|iPod/.test(navigator.userAgent);

    const checkSubscription = useCallback(async () => {
        if (!isSupported) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch {
            setIsSubscribed(false);
        }
    }, [isSupported]);

    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported || !VAPID_PUBLIC_KEY) return false;

        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return false;

            // Register service worker if not already
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
            });

            const subJson = subscription.toJSON();

            // Save to Supabase
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            // Get member_id
            const { data: member } = await query('members')
                .select('id')
                .eq('user_id', user.id)
                .single();

            await query('push_subscriptions').upsert({
                user_id: user.id,
                subscription: subJson,
                device_info: {
                    device_type: getDeviceType(),
                    user_agent: navigator.userAgent,
                    last_used_at: new Date().toISOString(),
                },
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            });

            setIsSubscribed(true);
            return true;
        } catch (err) {
            console.error('Push subscription failed:', err);
            return false;
        }
    }, [isSupported]);

    const unsubscribe = useCallback(async () => {
        if (!isSupported) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();

                // Remove from DB
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await query('push_subscriptions')
                        .delete()
                        .eq('user_id', user.id);
                }
            }
            setIsSubscribed(false);
        } catch (err) {
            console.error('Push unsubscribe failed:', err);
        }
    }, [isSupported]);

    return {
        isSubscribed,
        isSupported,
        isPWA,
        isIOS,
        subscribe,
        unsubscribe,
        checkSubscription,
    };
}
