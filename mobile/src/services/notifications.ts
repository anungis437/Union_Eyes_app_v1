import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { secureStorage } from './storage';
import { apiService } from './api';
import { APP_VERSION } from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  async initialize() {
    if (!Device.isDevice) {
      return;
    }

    await this.registerForPushNotificationsAsync();
  }

  async registerForPushNotificationsAsync() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return;
    }

    // Get the native device push token (FCM/APNs)
    const token = (
      await Notifications.getDevicePushTokenAsync()
    ).data;

    // Store the token
    await secureStorage.setItem('push_token', token);

    // Register token with backend
    try {
      const { user } = useAuthStore.getState();
      const organizationId = user?.organizationId;

      if (organizationId) {
        await apiService.post('/api/notifications/device', {
          organizationId,
          deviceToken: token,
          platform: Platform.OS,
          deviceName: Device.deviceName || undefined,
          deviceModel: Device.modelName || undefined,
          osVersion: Device.osVersion || undefined,
          appVersion: APP_VERSION,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
    } catch (error) {
      // Silent fail to avoid blocking app startup
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1e40af',
      });
    }

    return token;
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    triggerSeconds?: number
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: triggerSeconds ? { seconds: triggerSeconds } : null,
    });
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ) {
    // Listener for when a notification is received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listener for when a user taps on a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }
}

export const notificationService = new NotificationService();
export default notificationService;

