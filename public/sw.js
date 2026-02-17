/// <reference lib="webworker" />
// BCL Portal Service Worker - Push Notifications

const SW_VERSION = '1.0.0';

self.addEventListener('install', (event) => {
    console.log('[SW] Install v' + SW_VERSION);
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activate v' + SW_VERSION);
    event.waitUntil(self.clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = {
            title: 'BCL Portal',
            body: event.data.text(),
            icon: '/images/logo/bcl-logo.svg',
        };
    }

    const options = {
        body: data.body || data.content || '',
        icon: data.icon || '/images/logo/bcl-logo.svg',
        badge: '/images/logo/bcl-logo.svg',
        tag: data.tag || 'bcl-notification',
        data: {
            url: data.url || data.action_url || '/apps/notifications',
            notificationId: data.notificationId || data.id,
        },
        vibrate: [100, 50, 100],
        actions: data.actions || [],
        requireInteraction: data.requireInteraction || false,
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'BCL Portal', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/apps/notifications';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If the app is already open, focus it and navigate
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    client.navigate(url);
                    return;
                }
            }
            // Otherwise open a new window
            return self.clients.openWindow(url);
        })
    );
});
