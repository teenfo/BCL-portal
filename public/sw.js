/* BCL Portal 서비스워커 — 웹푸시 수신/클릭 처리 (docs/08 §2.4)
   push: 서버(send-push-notification EF)가 보낸 { title, body, data:{ id, action_url } } 표시.
   notificationclick: action_url 로 포커스/오픈. 앱 셸 캐싱은 범위 밖(알림 전용). */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// PWA 설치 가능 조건 충족용 fetch 핸들러(패스스루 — 오프라인 캐싱은 범위 밖).
//   respondWith 미호출 = 브라우저 기본 네트워크 처리. 존재 자체가 installability 요건.
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'BCL', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'BCL';
  const data = payload.data || {};
  const options = {
    body: payload.body || '',
    tag: data.id ? `bcl-${data.id}` : undefined,
    data: { actionUrl: data.action_url || data.actionUrl || '/apps/notifications' },
    badge: '/icons/badge-72.png',
    icon: '/icons/icon-192.png',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.actionUrl) || '/apps/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // 이미 열린 앱 창이 있으면 포커스 후 이동
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
