import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: 'claim' | 'document' | 'system';
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Claim Update',
    body: 'Your claim #1234 has been approved',
    time: '2 hours ago',
    read: false,
    type: 'claim',
  },
  {
    id: '2',
    title: 'Document Uploaded',
    body: 'Medical receipt has been successfully uploaded',
    time: '5 hours ago',
    read: false,
    type: 'document',
  },
  {
    id: '3',
    title: 'System Notification',
    body: 'App updated to version 1.0.1',
    time: '1 day ago',
    read: true,
    type: 'system',
  },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [pushEnabled, setPushEnabled] = useState(true);

  const togglePushNotifications = async (value: boolean) => {
    setPushEnabled(value);
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        setPushEnabled(false);
      }
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((notif) => ({ ...notif, read: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'claim':
        return 'document-text';
      case 'document':
        return 'folder';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'claim':
        return '#1e40af';
      case 'document':
        return '#10b981';
      default:
        return '#6B7280';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllButton}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <Ionicons name="notifications-outline" size={24} color="#1F2937" />
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Switch
            value={pushEnabled}
            onValueChange={togglePushNotifications}
            trackColor={{ false: '#E5E7EB', true: '#93c5fd' }}
            thumbColor={pushEnabled ? '#1e40af' : '#9CA3AF'}
          />
        </View>
      </View>

      <ScrollView style={styles.list}>
        {notifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[styles.notificationCard, !notification.read && styles.unread]}
            onPress={() => markAsRead(notification.id)}
          >
            <View
              style={[
                styles.notificationIcon,
                { backgroundColor: `${getNotificationColor(notification.type)}20` },
              ]}
            >
              <Ionicons
                name={getNotificationIcon(notification.type) as any}
                size={24}
                color={getNotificationColor(notification.type)}
              />
            </View>
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                {!notification.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.notificationBody}>{notification.body}</Text>
              <Text style={styles.notificationTime}>{notification.time}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unread: {
    backgroundColor: '#EFF6FF',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e40af',
  },
  notificationBody: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

