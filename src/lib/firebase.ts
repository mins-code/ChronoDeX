import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

// Validate that all required Firebase environment variables are set
const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if any required variables are missing
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value || value === '')
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing Firebase environment variables:', missingVars);
  console.error('Please set the following in your Vercel environment variables:');
  missingVars.forEach(varName => {
    console.error(`  - VITE_FIREBASE_${varName.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
  });
}

// Firebase configuration - using environment variables directly
const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: requiredEnvVars.authDomain,
  projectId: requiredEnvVars.projectId,
  storageBucket: requiredEnvVars.storageBucket,
  messagingSenderId: requiredEnvVars.messagingSenderId,
  appId: requiredEnvVars.appId
};

// Log config status (without exposing sensitive values)
console.log('🔧 Firebase config status:', {
  apiKey: firebaseConfig.apiKey ? '✓ Set' : '✗ Missing',
  authDomain: firebaseConfig.authDomain ? '✓ Set' : '✗ Missing',
  projectId: firebaseConfig.projectId ? '✓ Set' : '✗ Missing',
  storageBucket: firebaseConfig.storageBucket ? '✓ Set' : '✗ Missing',
  messagingSenderId: firebaseConfig.messagingSenderId ? '✓ Set' : '✗ Missing',
  appId: firebaseConfig.appId ? '✓ Set' : '✗ Missing'
});

// Debug: Log first few characters of API key to verify it's being read
if (firebaseConfig.apiKey) {
  console.log('🔑 API Key (first 10 chars):', firebaseConfig.apiKey.substring(0, 10) + '...');
  console.log('🔑 API Key length:', firebaseConfig.apiKey.length);
} else {
  console.error('❌ CRITICAL: API Key is undefined or empty!');
  console.error('❌ This means VITE_FIREBASE_API_KEY was not set during the Vercel build process');
}

// Log project ID to verify correct Firebase project
if (firebaseConfig.projectId) {
  console.log('📦 Firebase Project ID:', firebaseConfig.projectId);
} else {
  console.error('❌ CRITICAL: Project ID is undefined!');
}

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
    
    // Validate Firebase config before proceeding
    if (missingVars.length > 0) {
      throw new Error(`Firebase not configured. Missing: ${missingVars.join(', ')}. Please add these environment variables in Vercel.`);
    }
    
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
      if (!vapidKey || vapidKey === '') {
        console.error('❌ VAPID key not configured!');
        throw new Error('VAPID key is missing. Please add VITE_FIREBASE_VAPID_KEY to your Vercel environment variables.');
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