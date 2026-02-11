import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Card from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncStore } from '@/store/syncStore';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

interface DashboardStats {
  activeClaims: number;
  unreadNotifications: number;
  upcomingDeadlines: number;
}

interface RecentActivity {
  id: string;
  type: 'claim' | 'document' | 'notification' | 'message';
  title: string;
  description: string;
  timestamp: Date;
  status?: string;
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const { isSyncing, lastSyncTime } = useSyncStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return {
        activeClaims: 3,
        unreadNotifications: 12,
        upcomingDeadlines: 2,
      };
    },
  });

  const { data: recentActivity, refetch: refetchActivity } = useQuery<RecentActivity[]>({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return [
        {
          id: '1',
          type: 'claim',
          title: 'Overtime Claim #1234',
          description: 'Status updated to "Under Review"',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          status: 'pending',
        },
        {
          id: '2',
          type: 'notification',
          title: 'New Contract Agreement',
          description: 'View the latest contract updates',
          timestamp: new Date(Date.now() - 1000 * 60 * 120),
        },
        {
          id: '3',
          type: 'document',
          title: 'Benefits Guide 2024',
          description: 'Document uploaded successfully',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
        },
      ];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchActivity()]);
    setRefreshing(false);
  }, [refetchStats, refetchActivity]);

  const quickActions = [
    {
      id: 'submit-claim',
      icon: 'add-circle',
      title: 'Submit Claim',
      color: '#3B82F6',
      route: '/claims/new',
    },
    {
      id: 'browse-docs',
      icon: 'folder-open',
      title: 'Documents',
      color: '#8B5CF6',
      route: '/(tabs)/documents',
    },
    {
      id: 'scan-doc',
      icon: 'scan',
      title: 'Scan',
      color: '#10B981',
      route: '/documents/scan',
    },
    {
      id: 'contact',
      icon: 'chatbubble-ellipses',
      title: 'Contact',
      color: '#F59E0B',
      route: '/contact',
    },
  ];

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'claim':
        return 'document-text';
      case 'document':
        return 'document';
      case 'notification':
        return 'notifications';
      case 'message':
        return 'mail';
      default:
        return 'information-circle';
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return format(date, 'MMM d');
  };

  const styles = createStyles(isDark);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getTimeGreeting()}</Text>
          <Text style={styles.username}>John Doe</Text>
        </View>
        <View style={styles.headerRight}>
          {isSyncing && (
            <View style={styles.syncBadge}>
              <Ionicons name="sync" size={14} color="#fff" />
              <Text style={styles.syncText}>Syncing...</Text>
            </View>
          )}
          {lastSyncTime && !isSyncing && (
            <Text style={styles.lastSync}>Last sync: {format(lastSyncTime, 'HH:mm')}</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#fff' : '#000'}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(tabs)/claims')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIcon, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="document-text" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats?.activeClaims || 0}</Text>
            <Text style={styles.statLabel}>Active Claims</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(tabs)/notifications')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="notifications" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats?.unreadNotifications || 0}</Text>
            <Text style={styles.statLabel}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/deadlines')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIcon, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="time" size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats?.upcomingDeadlines || 0}</Text>
            <Text style={styles.statLabel}>Deadlines</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionButton}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon as any} size={28} color="#fff" />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Recent Activity */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentActivity && recentActivity.length > 0 ? (
            <View style={styles.activityList}>
              {recentActivity.map((activity, index) => (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityItem,
                    index !== recentActivity.length - 1 && styles.activityItemBorder,
                  ]}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.activityIconContainer,
                      { backgroundColor: isDark ? '#374151' : '#F3F4F6' },
                    ]}
                  >
                    <Ionicons
                      name={getActivityIcon(activity.type)}
                      size={20}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {activity.title}
                      </Text>
                      {activity.status && <StatusBadge status={activity.status} size="small" />}
                    </View>
                    <Text style={styles.activityDescription} numberOfLines={1}>
                      {activity.description}
                    </Text>
                    <Text style={styles.activityTime}>{getRelativeTime(activity.timestamp)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={isDark ? '#4B5563' : '#D1D5DB'} />
              <Text style={styles.emptyText}>No recent activity</Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#111827' : '#F9FAFB',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: isDark ? '#1F2937' : '#fff',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#E5E7EB',
    },
    greeting: {
      fontSize: 14,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginBottom: 2,
    },
    username: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    headerRight: {
      alignItems: 'flex-end',
    },
    syncBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#3B82F6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    syncText: {
      fontSize: 11,
      color: '#fff',
      fontWeight: '600',
    },
    lastSync: {
      fontSize: 11,
      color: isDark ? '#6B7280' : '#9CA3AF',
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 32,
    },
    statsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: isDark ? '#1F2937' : '#fff',
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    statIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#F9FAFB' : '#111827',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
      textAlign: 'center',
    },
    card: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#F9FAFB' : '#111827',
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    seeAll: {
      fontSize: 14,
      color: '#3B82F6',
      fontWeight: '600',
    },
    quickActions: {
      flexDirection: 'row',
      gap: 16,
    },
    actionButton: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
    },
    actionIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
      textAlign: 'center',
    },
    activityList: {
      gap: 0,
    },
    activityItem: {
      flexDirection: 'row',
      paddingVertical: 12,
      gap: 12,
    },
    activityItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#E5E7EB',
    },
    activityIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityContent: {
      flex: 1,
      gap: 4,
    },
    activityHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    activityTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    activityDescription: {
      fontSize: 13,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    activityTime: {
      fontSize: 12,
      color: isDark ? '#6B7280' : '#9CA3AF',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      color: isDark ? '#6B7280' : '#9CA3AF',
    },
  });

