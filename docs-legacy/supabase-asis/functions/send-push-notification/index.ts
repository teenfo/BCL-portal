import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push";

/**
 * BCL Portal - Web Push Notification Sender
 * 
 * Env Vars:
 * - VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - VAPID_SUBJECT (mailto:admin@example.com)
 */

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@bcl-portal.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

interface PushPayload {
    subscription: {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    };
    notification: {
        title: string;
        body: string;
        icon?: string;
        data?: any;
        tag?: string;
    };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        });
    }

    try {
        const { subscription, notification } = await req.json() as PushPayload;

        if (!subscription || !subscription.endpoint) {
            throw new Error('Push subscription is missing');
        }

        if (!VAPID_PRIVATE_KEY) {
            console.warn('[PUSH-SIMULATOR] VAPID keys not configured. Simulating send to:', subscription.endpoint);
            return new Response(JSON.stringify({ success: true, simulated: true }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const payload = JSON.stringify({
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/images/logo/bcl-logo.svg',
            data: notification.data || {},
            tag: notification.tag || 'bcl-notification',
        });

        const response = await webpush.sendNotification(subscription, payload);

        return new Response(JSON.stringify({ success: true, status: response.statusCode }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Push error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
