// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config will be set by the main app
let firebaseApp = null;
let messaging = null;

// Listen for config message from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    console.log('Service worker received Firebase config');
    
    // Validate the config
    const config = event.data.config;
    if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) {
      console.error('❌ Invalid Firebase config received in service worker:', {
        hasApiKey: !!config.apiKey,
        hasProjectId: !!config.projectId,
        hasMessagingSenderId: !!config.messagingSenderId,
        hasAppId: !!config.appId
      });
      return;
    }
    
    if (!firebaseApp) {
      try {
        firebaseApp = firebase.initializeApp(config);
        messaging = firebase.messaging();
        console.log('✅ Firebase initialized in service worker');
        
        // Handle background messages
        messaging.onBackgroundMessage((payload) => {
          console.log('Received background message:', payload);
          
          const notificationTitle = payload.notification?.title || 'ChronoDeX Reminder';
          const notificationOptions = {
            body: payload.notification?.body || 'You have a task reminder',
            icon: '/logo.png',
            badge: '/logo.png',
            tag: payload.data?.notificationId || 'default',
            data: payload.data,
            requireInteraction: true,
            vibrate: [200, 100, 200]
          };

          return self.registration.showNotification(notificationTitle, notificationOptions);
        });
      } catch (error) {
        console.error('❌ Error initializing Firebase in service worker:', error);
      }
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});