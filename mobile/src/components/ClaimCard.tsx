import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { ClaimListItem } from '@/types/claims';
import Swipeable from 'react-native-gesture-handler/Swipeable';

interface ClaimCardProps {
  claim: ClaimListItem;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onQuickView?: () => void;
}

export function ClaimCard({ claim, onPress, onEdit, onDelete, onQuickView }: ClaimCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [swipeableRef, setSwipeableRef] = useState<Swipeable | null>(null);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return '#6B7280';
      case 'submitted':
        return '#3B82F6';
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      case 'under_review':
      case 'pending':
        return '#F59E0B';
      case 'appealed':
        return '#F97316';
      case 'withdrawn':
        return '#6B7280';
      case 'closed':
        return '#4B5563';
      default:
        return '#6B7280';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return '#DC2626';
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Claim',
      'Are you sure you want to delete this claim? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            swipeableRef?.close();
            onDelete?.();
          },
        },
      ]
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (!claim.isDraft && !onQuickView) return null;

    const translateX = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 160],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.swipeActions, { transform: [{ translateX }] }]}>
        {claim.isDraft && onEdit && (
          <TouchableOpacity style={[styles.swipeAction, styles.editAction]} onPress={onEdit}>
            <Ionicons name="create" size={20} color="#FFFFFF" />
            <Text style={styles.swipeActionText}>Edit</Text>
          </TouchableOpacity>
        )}
        {onQuickView && (
          <TouchableOpacity style={[styles.swipeAction, styles.viewAction]} onPress={onQuickView}>
            <Ionicons name="eye" size={20} color="#FFFFFF" />
            <Text style={styles.swipeActionText}>View</Text>
          </TouchableOpacity>
        )}
        {claim.isDraft && onDelete && (
          <TouchableOpacity
            style={[styles.swipeAction, styles.deleteAction]}
            onPress={handleDelete}
          >
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.swipeActionText}>Delete</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  const styles = createStyles(isDark);

  const cardContent = (
    <TouchableOpacity
      style={[styles.container, claim.isPending && styles.pendingContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {claim.title}
            </Text>
            {claim.unreadCount && claim.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{claim.unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.claimNumber}>{claim.claimNumber}</Text>
        </View>
        {claim.priority && (
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: `${getPriorityColor(claim.priority)}20` },
            ]}
          >
            <Ionicons name="flag" size={12} color={getPriorityColor(claim.priority)} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text style={styles.infoText}>
            {formatDistanceToNow(new Date(claim.updatedAt), { addSuffix: true })}
          </Text>
        </View>
        {claim.documentCount > 0 && (
          <View style={styles.infoItem}>
            <Ionicons
              name="document-attach-outline"
              size={14}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
            <Text style={styles.infoText}>{claim.documentCount}</Text>
          </View>
        )}
        {claim.commentCount > 0 && (
          <View style={styles.infoItem}>
            <Ionicons name="chatbubble-outline" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text style={styles.infoText}>{claim.commentCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View
            style={[styles.statusBadge, { backgroundColor: `${getStatusColor(claim.status)}20` }]}
          >
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(claim.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(claim.status) }]}>
              {claim.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          {claim.isDraft && (
            <View style={styles.draftBadge}>
              <Text style={styles.draftText}>DRAFT</Text>
            </View>
          )}
          {claim.isPending && (
            <View style={styles.pendingBadge}>
              <Ionicons name="cloud-upload-outline" size={12} color="#F59E0B" />
              <Text style={styles.pendingText}>Syncing</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
      </View>
    </TouchableOpacity>
  );

  if ((claim.isDraft || onQuickView) && (onEdit || onDelete)) {
    return (
      <Swipeable
        ref={setSwipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        {cardContent}
      </Swipeable>
    );
  }

  return cardContent;
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: isDark ? '#1F2937' : '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    pendingContainer: {
      borderWidth: 1,
      borderColor: '#F59E0B',
      borderStyle: 'dashed',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    headerLeft: {
      flex: 1,
      marginRight: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
      flex: 1,
    },
    claimNumber: {
      fontSize: 12,
      color: isDark ? '#6B7280' : '#9CA3AF',
      fontWeight: '500',
      marginTop: 2,
    },
    unreadBadge: {
      backgroundColor: '#EF4444',
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    unreadText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    priorityBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 12,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    infoText: {
      fontSize: 13,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#374151' : '#F3F4F6',
    },
    footerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    draftBadge: {
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    draftText: {
      fontSize: 10,
      fontWeight: '700',
      color: isDark ? '#9CA3AF' : '#6B7280',
      letterSpacing: 0.5,
    },
    pendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#78350F' : '#FEF3C7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    pendingText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#F59E0B',
    },
    swipeActions: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    swipeAction: {
      width: 80,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
    },
    editAction: {
      backgroundColor: '#3B82F6',
    },
    viewAction: {
      backgroundColor: '#8B5CF6',
    },
    deleteAction: {
      backgroundColor: '#EF4444',
    },
    swipeActionText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

