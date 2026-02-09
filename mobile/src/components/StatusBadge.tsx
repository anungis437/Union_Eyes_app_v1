import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium' | 'large';
}

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/[_\s]/g, '');

    switch (normalizedStatus) {
      case 'approved':
        return {
          color: '#10B981',
          backgroundColor: '#D1FAE5',
          darkBackgroundColor: '#064E3B',
          icon: 'checkmark-circle',
          label: 'Approved',
        };
      case 'rejected':
        return {
          color: '#EF4444',
          backgroundColor: '#FEE2E2',
          darkBackgroundColor: '#7F1D1D',
          icon: 'close-circle',
          label: 'Rejected',
        };
      case 'inprogress':
      case 'processing':
        return {
          color: '#F59E0B',
          backgroundColor: '#FEF3C7',
          darkBackgroundColor: '#78350F',
          icon: 'sync',
          label: 'In Progress',
        };
      case 'pending':
        return {
          color: '#6B7280',
          backgroundColor: '#F3F4F6',
          darkBackgroundColor: '#374151',
          icon: 'time',
          label: 'Pending',
        };
      case 'cancelled':
        return {
          color: '#9CA3AF',
          backgroundColor: '#F3F4F6',
          darkBackgroundColor: '#4B5563',
          icon: 'ban',
          label: 'Cancelled',
        };
      case 'completed':
        return {
          color: '#3B82F6',
          backgroundColor: '#DBEAFE',
          darkBackgroundColor: '#1E3A8A',
          icon: 'checkmark-done',
          label: 'Completed',
        };
      default:
        return {
          color: '#6B7280',
          backgroundColor: '#F3F4F6',
          darkBackgroundColor: '#374151',
          icon: 'information-circle',
          label: status.charAt(0).toUpperCase() + status.slice(1),
        };
    }
  };

  const config = getStatusConfig(status);
  const { styles, iconSize } = createStyles(
    isDark,
    config.color,
    isDark ? config.darkBackgroundColor : config.backgroundColor,
    size
  );

  return (
    <View style={styles.container}>
      <Ionicons name={config.icon as any} size={iconSize} color={config.color} />
      <Text style={styles.text}>{config.label}</Text>
    </View>
  );
}

const createStyles = (
  isDark: boolean,
  color: string,
  backgroundColor: string,
  size: 'small' | 'medium' | 'large'
) => {
  const sizeConfig = {
    small: { padding: 4, fontSize: 10, iconSize: 12, paddingHorizontal: 8 },
    medium: { padding: 6, fontSize: 12, iconSize: 14, paddingHorizontal: 10 },
    large: { padding: 8, fontSize: 14, iconSize: 16, paddingHorizontal: 12 },
  };

  const config = sizeConfig[size];

  return {
    styles: StyleSheet.create({
      container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: config.padding,
        paddingHorizontal: config.paddingHorizontal,
        backgroundColor: backgroundColor,
        borderRadius: 12,
        gap: 4,
      },
      text: {
        fontSize: config.fontSize,
        fontWeight: '700',
        color: color,
        letterSpacing: 0.3,
      },
    }),
    iconSize: config.iconSize,
  };
};
