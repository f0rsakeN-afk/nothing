/**
 * Service Worker for Push Notifications
 * Handles incoming push notifications and shows native notifications
 * even when the app is in the background or browser is closed
 */

const CACHE_NAME = 'eryx-push-v1';
const OFFLINE_URL = '/offline';

// Install event - cache basic assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim(); // Take control immediately
});

// Push event - receives push from server
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received:', event);

  let notificationData = {
    title: 'Eryx',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'eryx-notification',
    data: {},
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        data: payload.data || {},
      };
    }
  } catch (err) {
    console.error('[ServiceWorker] Failed to parse push data:', err);
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      requireInteraction: false, // Don't keep notification around too long
      actions: getNotificationActions(notificationData.data.type),
    })
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data || {};
  const chatId = data.chatId;

  // Determine URL to open
  let targetUrl = '/home';
  if (chatId) {
    targetUrl = `/chat/${chatId}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (chatId) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Get notification actions based on type
function getNotificationActions(type) {
  const baseActions = [
    { action: 'open', title: 'Open' },
    { action: 'dismiss', title: 'Dismiss' },
  ];

  if (type === 'new_message') {
    baseActions.splice(1, 0, { action: 'reply', title: 'Reply' });
  }

  return baseActions;
}

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
