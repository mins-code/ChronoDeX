import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase';
import { toast } from 'sonner';

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const registerToken = useMutation(api.fcmHelpers.registerDeviceToken);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const enableNotifications = async () => {
    try {
      console.log('🚀 Starting notification enablement process...');
      const token = await requestNotificationPermission();
      
      if (token) {
        console.log('✅ Token received, registering with backend...');
        console.log('📝 Token (first 20 chars):', token.substring(0, 20) + '...');
        
        // Register token with backend
        try {
          const result = await registerToken({
            token,
            platform: 'web'
          });
          console.log('✅ Token registered successfully with backend. Token ID:', result);
        } catch (registerError: any) {
          console.error('❌ Failed to register token with backend:', registerError);
          throw new Error(`Token registration failed: ${registerError.message}`);
        }
        
        console.log('✅ Token registration complete');
        setPermission('granted');
        toast.success('Push notifications enabled!', {
          description: 'You will now receive browser notifications for task reminders.',
          duration: 5000,
        });
        return true;
      } else {
        console.error('❌ No token received from Firebase');
        toast.error('Failed to enable notifications', {
          description: 'Could not obtain notification token. Check console for details.',
          duration: 8000,
        });
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error enabling notifications:', error);
      console.error('❌ Error stack:', error.stack);
      
      // Provide specific error messages based on the error
      let errorMessage = 'Failed to enable notifications';
      let errorDescription = 'Check the browser console for details.';
      
      if (error.message?.includes('VAPID')) {
        errorMessage = 'Firebase VAPID key not configured';
        errorDescription = 'Please add VITE_FIREBASE_VAPID_KEY to your environment variables in the Integrations tab.';
      } else if (error.message?.includes('messaging not initialized')) {
        errorMessage = 'Firebase not configured';
        errorDescription = 'Please configure Firebase credentials in the Integrations tab.';
      } else if (error.message?.includes('permission was denied')) {
        errorMessage = 'Notification permission denied';
        errorDescription = 'Please allow notifications in your browser settings and try again.';
      } else if (error.code === 'messaging/token-subscribe-failed') {
        errorMessage = 'Failed to subscribe to notifications';
        errorDescription = 'Check your Firebase project settings and VAPID key configuration.';
      }
      
      toast.error(errorMessage, {
        description: errorDescription,
        duration: 10000,
      });
      return false;
    }
  };

  useEffect(() => {
    // Listen for foreground messages
    const unsubscribe = onForegroundMessage((payload) => {
      const notification = (payload as any)?.notification;
      const title = notification?.title || 'ChronoDeX Reminder';
      const body = notification?.body || 'You have a task reminder';
      
      toast(title, {
        description: body,
        duration: 5000,
      });
    });

    return unsubscribe;
  }, []);

  return {
    isSupported,
    permission,
    enableNotifications
  };
}
