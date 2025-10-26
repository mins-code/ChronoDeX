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
      const token = await requestNotificationPermission();
      
      if (token) {
        // Register token with backend
        await registerToken({
          token,
          platform: 'web'
        });
        
        setPermission('granted');
        toast.success('Push notifications enabled!');
        return true;
      } else {
        toast.error('Failed to enable notifications');
        return false;
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
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
