import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

// Firebase configuration
// Note: Replace these with your actual Firebase config values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging: Messaging | null = null;

try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.error('Firebase messaging initialization error:', error);
}

/**
 * Request notification permission and get FCM token
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    console.log('🔔 Starting notification permission request...');
    
    if (!messaging) {
      console.error('❌ Firebase messaging not initialized');
      throw new Error('Firebase messaging not initialized. Check your Firebase configuration.');
    }

    console.log('✅ Firebase messaging is initialized');

    // Request permission
    console.log('📋 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('📋 Permission result:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      
      // Register service worker with detailed error handling
      console.log('🔧 Attempting to register service worker at: /firebase-messaging-sw.js');
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      console.log('✅ Service worker registered successfully:', registration);
      
      // Wait for service worker to be ready
      console.log('⏳ Waiting for service worker to be ready...');
      await navigator.serviceWorker.ready;
      console.log('✅ Service worker is ready');
      
      // Send Firebase config to service worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'FIREBASE_CONFIG',
          config: firebaseConfig
        });
        console.log('✅ Firebase config sent to service worker');
      } else {
        console.warn('⚠️ Service worker not active yet');
      }
      
      // Check VAPID key
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey || vapidKey === 'YOUR_VAPID_KEY') {
        console.error('❌ VAPID key not configured!');
        throw new Error('VAPID key is missing. Please add VITE_FIREBASE_VAPID_KEY to your environment variables.');
      }
      console.log('✅ VAPID key is configured');
      
      // Get FCM token
      console.log('🔑 Requesting FCM token...');
      const token = await getToken(messaging, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration
      });
      
      if (!token) {
        console.error('❌ Failed to get FCM token');
        throw new Error('Failed to generate FCM token. Check your Firebase configuration and VAPID key.');
      }
      
      console.log('✅ FCM Token obtained:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.log('❌ Notification permission denied by user');
      throw new Error('Notification permission was denied. Please allow notifications in your browser settings.');
    }
  } catch (error: any) {
    console.error('❌ Error getting notification permission:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    throw error; // Re-throw to let the caller handle it
  }
};

/**
 * Listen for foreground messages
 */
export const onForegroundMessage = (callback: (payload: unknown) => void) => {
  if (!messaging) return () => {};
  
  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
};

export { messaging };