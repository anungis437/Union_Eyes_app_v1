/**
 * Claim Timeline Component
 * Visual timeline showing claim activity history
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { ClaimActivity, ActivityType } from '@/types/claims';

interface ClaimTimelineProps {
  activities: ClaimActivity[];
  showRelativeTime?: boolean;
}

export function ClaimTimeline({ activities, showRelativeTime = true }: ClaimTimelineProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);

  const getActivityIcon = (type: ActivityType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'created':
        return 'add-circle';
      case 'updated':
        return 'create';
      case 'submitted':
        return 'paper-plane';
      case 'status_change':
        return 'swap-horizontal';
      case 'comment':
        return 'chatbubble';
      case 'document_upload':
        return 'document-attach';
      case 'assignee_change':
        return 'person';
      case 'appeal':
        return 'alert-circle';
      case 'withdrawn':
        return 'close-circle';
      default:
        return 'ellipse';
    }
  };

  const getActivityColor = (type: ActivityType): string => {
    switch (type) {
      case 'created':
        return '#10B981';
      case 'submitted':
        return '#3B82F6';
      case 'status_change':
        return '#F59E0B';
      case 'comment':
        return '#8B5CF6';
      case 'document_upload':
        return '#06B6D4';
      case 'appeal':
        return '#EF4444';
      case 'withdrawn':
        return '#6B7280';
      default:
        return isDark ? '#9CA3AF' : '#6B7280';
    }
  };

  const formatTimestamp = (date: Date): string => {
    if (showRelativeTime) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, 'MMM d, yyyy h:mm a');
  };

  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="time-outline" size={48} color={isDark ? '#4B5563' : '#D1D5DB'} />
        <Text style={styles.emptyText}>No activity yet</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {activities.map((activity, index) => {
        const isLast = index === activities.length - 1;
        const color = getActivityColor(activity.type);

        return (
          <View key={activity.id} style={styles.timelineItem}>
            {/* Timeline line */}
            <View style={styles.timelineLineContainer}>
              <View style={[styles.timelineDot, { backgroundColor: color }]}>
                <Ionicons name={getActivityIcon(activity.type)} size={16} color="#FFFFFF" />
              </View>
              {!isLast && <View style={styles.timelineLine} />}
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>{activity.title}</Text>
                <Text style={styles.time}>{formatTimestamp(new Date(activity.timestamp))}</Text>
              </View>

              {activity.description && (
                <Text style={styles.description}>{activity.description}</Text>
              )}

              {activity.user && (
                <View style={styles.userInfo}>
                  <Ionicons name="person-circle" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <Text style={styles.userName}>{activity.user.name}</Text>
                </View>
              )}

              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <View style={styles.metadata}>
                  {Object.entries(activity.metadata).map(([key, value]) => (
                    <View key={key} style={styles.metadataItem}>
                      <Text style={styles.metadataKey}>{key}:</Text>
                      <Text style={styles.metadataValue}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 48,
    },
    emptyText: {
      marginTop: 16,
      fontSize: 16,
      color: isDark ? '#9CA3AF' : '#6B7280',
      textAlign: 'center',
    },
    timelineItem: {
      flexDirection: 'row',
      paddingBottom: 24,
    },
    timelineLineContainer: {
      width: 40,
      alignItems: 'center',
    },
    timelineDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    timelineLine: {
      flex: 1,
      width: 2,
      backgroundColor: isDark ? '#374151' : '#E5E7EB',
    },
    contentContainer: {
      flex: 1,
      padding: 12,
      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
      borderRadius: 12,
      marginLeft: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
      marginRight: 12,
    },
    time: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
      flexShrink: 0,
    },
    description: {
      fontSize: 14,
      color: isDark ? '#D1D5DB' : '#4B5563',
      lineHeight: 20,
      marginBottom: 8,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#374151' : '#F3F4F6',
    },
    userName: {
      fontSize: 13,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginLeft: 6,
    },
    metadata: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#374151' : '#F3F4F6',
    },
    metadataItem: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    metadataKey: {
      fontSize: 12,
      fontWeight: '500',
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginRight: 8,
    },
    metadataValue: {
      fontSize: 12,
      color: isDark ? '#D1D5DB' : '#4B5563',
      flex: 1,
    },
  });
